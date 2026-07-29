import { randomUUID } from "node:crypto";
import {
  AccountType,
  ContactType,
  CurrencyRateSource,
  PrismaClient,
  SalesInvoiceStatus,
  ZatcaEnvironment,
  ZatcaRegistrationStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ZatcaService } from "./zatca.service";

type IntegrationSettings = { enabled: false } | { enabled: true; databaseUrl: string };

const settings = resolveIntegrationSettings(process.env);
const describeDatabase = settings.enabled ? describe : describe.skip;

describe("ZATCA generation chain database gate", () => {
  it("requires an explicitly named disposable local PostgreSQL database", () => {
    expect(resolveIntegrationSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
    expect(() => resolveIntegrationSettings({ LEDGERBYTE_ZATCA_GENERATION_DB_INTEGRATION: "1" } as NodeJS.ProcessEnv)).toThrow("LEDGERBYTE_TEST_DATABASE_URL");
    expect(() => resolveIntegrationSettings({ LEDGERBYTE_ZATCA_GENERATION_DB_INTEGRATION: "1", LEDGERBYTE_TEST_DATABASE_URL: "postgresql://fixture:fixture@db.example.com/ledgerbyte_p0_generation" } as NodeJS.ProcessEnv)).toThrow("local-only");
  });
});

describeDatabase("ZATCA invoice generation chain: disposable PostgreSQL proof", () => {
  let firstClient: PrismaClient;
  let secondClient: PrismaClient;
  let firstService: ZatcaService;
  let secondService: ZatcaService;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;

  beforeEach(async () => {
    firstClient = new PrismaClient({ datasources: { db: { url: settings.enabled ? settings.databaseUrl : undefined } }, transactionOptions: { maxWait: 10_000, timeout: 25_000 } });
    secondClient = new PrismaClient({ datasources: { db: { url: settings.enabled ? settings.databaseUrl : undefined } }, transactionOptions: { maxWait: 10_000, timeout: 25_000 } });
    await Promise.all([firstClient.$connect(), secondClient.$connect()]);
    firstService = makeService(firstClient);
    secondService = makeService(secondClient);
    fixture = await seedFixture(firstClient);
  });

  afterEach(async () => {
    if (fixture) await firstClient.organization.delete({ where: { id: fixture.organizationId } });
    await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
  });

  it("returns one generated metadata record and one chain advance for concurrent requests for the same invoice", async () => {
    const [first, second] = await Promise.all([
      firstService.generateInvoiceCompliance(fixture.organizationId, fixture.actorUserId, fixture.invoiceIds[0]),
      secondService.generateInvoiceCompliance(fixture.organizationId, fixture.actorUserId, fixture.invoiceIds[0]),
    ]);

    expect(first.id).toBe(second.id);
    expect(await firstClient.zatcaInvoiceMetadata.count({ where: { invoiceId: fixture.invoiceIds[0] } })).toBe(1);
    expect(await firstClient.zatcaSubmissionLog.count({ where: { organizationId: fixture.organizationId } })).toBe(1);
    expect(await firstClient.zatcaEgsUnit.findUniqueOrThrow({ where: { id: fixture.egsUnitId }, select: { lastIcv: true, lastInvoiceHash: true } })).toEqual({ lastIcv: 1, lastInvoiceHash: `hash-${fixture.invoiceIds[0]}` });
  });

  it("assigns distinct ordered ICVs and persists the predecessor hash under concurrent invoices", async () => {
    await Promise.all([
      firstService.generateInvoiceCompliance(fixture.organizationId, fixture.actorUserId, fixture.invoiceIds[0]),
      secondService.generateInvoiceCompliance(fixture.organizationId, fixture.actorUserId, fixture.invoiceIds[1]),
    ]);

    const metadata = await firstClient.zatcaInvoiceMetadata.findMany({ where: { organizationId: fixture.organizationId }, orderBy: { icv: "asc" }, select: { invoiceId: true, icv: true, previousInvoiceHash: true, invoiceHash: true } });
    expect(metadata.map((item) => item.icv)).toEqual([1, 2]);
    const [first, second] = metadata;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second!.previousInvoiceHash).toBe(first!.invoiceHash);
    expect(await firstClient.zatcaEgsUnit.findUniqueOrThrow({ where: { id: fixture.egsUnitId }, select: { lastIcv: true, lastInvoiceHash: true } })).toEqual({ lastIcv: 2, lastInvoiceHash: second!.invoiceHash });
  });

  it("replays durable generated state when the QR payload is intentionally not persisted", async () => {
    const generated = await firstService.generateInvoiceCompliance(fixture.organizationId, fixture.actorUserId, fixture.invoiceIds[0]);
    await firstClient.zatcaInvoiceMetadata.update({ where: { id: generated.id }, data: { qrCodeBase64: null } });

    const replay = await secondService.generateInvoiceCompliance(fixture.organizationId, fixture.actorUserId, fixture.invoiceIds[0]);
    expect(replay.id).toBe(generated.id);
    expect(await firstClient.zatcaInvoiceMetadata.count({ where: { invoiceId: fixture.invoiceIds[0] } })).toBe(1);
    expect(await firstClient.zatcaEgsUnit.findUniqueOrThrow({ where: { id: fixture.egsUnitId }, select: { lastIcv: true } })).toEqual({ lastIcv: 1 });
  });
});

function makeService(prisma: PrismaClient): ZatcaService {
  const service = new ZatcaService(prisma as unknown as PrismaService, { log: jest.fn() } as never);
  jest.spyOn(service as unknown as { resolveInvoiceHashForMode: (input: { invoiceId: string }) => Promise<string> }, "resolveInvoiceHashForMode").mockImplementation(async ({ invoiceId }) => `hash-${invoiceId}`);
  return service;
}

async function seedFixture(prisma: PrismaClient) {
  const suffix = randomUUID();
  const organizationId = randomUUID();
  const actorUserId = randomUUID();
  const customerId = randomUUID();
  const accountId = randomUUID();
  const profileId = randomUUID();
  const egsUnitId = randomUUID();
  const invoiceIds = [randomUUID(), randomUUID()] as const;

  await prisma.organization.create({ data: { id: organizationId, name: `P0 ZATCA ${suffix}`, legalName: `P0 ZATCA ${suffix}`, taxNumber: "300000000000003", countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" } });
  await prisma.account.create({ data: { id: accountId, organizationId, code: `4${suffix.slice(0, 6)}`, name: "P0 revenue", type: AccountType.REVENUE } });
  await prisma.contact.create({ data: { id: customerId, organizationId, type: ContactType.CUSTOMER, name: "P0 customer", displayName: "P0 customer", taxNumber: "310000000000009", countryCode: "SA" } });
  await prisma.zatcaOrganizationProfile.create({ data: { id: profileId, organizationId, environment: ZatcaEnvironment.SANDBOX, sellerName: "P0 ZATCA seller", vatNumber: "300000000000003", countryCode: "SA" } });
  await prisma.zatcaEgsUnit.create({ data: { id: egsUnitId, organizationId, profileId, name: "P0 EGS", environment: ZatcaEnvironment.SANDBOX, status: ZatcaRegistrationStatus.ACTIVE, deviceSerialNumber: `P0-${suffix}`, isActive: true } });

  for (const [index, invoiceId] of invoiceIds.entries()) {
    const taxable = "100.0000";
    const tax = "15.0000";
    const total = "115.0000";
    await prisma.salesInvoice.create({
      data: {
        id: invoiceId,
        organizationId,
        invoiceNumber: `P0-${suffix}-${index + 1}`,
        customerId,
        issueDate: new Date("2026-07-29T00:00:00.000Z"),
        dueDate: new Date("2026-08-29T00:00:00.000Z"),
        currency: "SAR",
        baseCurrency: "SAR",
        exchangeRate: "1.00000000",
        rateDate: new Date("2026-07-29T00:00:00.000Z"),
        rateSource: CurrencyRateSource.SYSTEM_RATE_1,
        status: SalesInvoiceStatus.FINALIZED,
        subtotal: taxable,
        taxableTotal: taxable,
        taxTotal: tax,
        total,
        balanceDue: total,
        transactionSubtotal: taxable,
        transactionTaxableTotal: taxable,
        transactionTaxTotal: tax,
        transactionTotal: total,
        finalizedAt: new Date("2026-07-29T00:00:00.000Z"),
        lines: { create: [{ organizationId, description: "P0 chain proof line", accountId, quantity: "1.0000", unitPrice: taxable, lineGrossAmount: taxable, taxableAmount: taxable, taxAmount: tax, lineSubtotal: taxable, lineTotal: total }] },
      },
    });
  }

  return { organizationId, actorUserId, egsUnitId, invoiceIds };
}

function resolveIntegrationSettings(env: NodeJS.ProcessEnv): IntegrationSettings {
  if (env.LEDGERBYTE_ZATCA_GENERATION_DB_INTEGRATION !== "1") return { enabled: false };
  const databaseUrl = env.LEDGERBYTE_TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ZATCA_GENERATION_DB_INTEGRATION=1");
  const url = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw new Error("ZATCA generation integration is local-only");
  if (!url.pathname.replace(/^\//, "").startsWith("ledgerbyte_p0_")) throw new Error("ZATCA generation integration requires a disposable ledgerbyte_p0_ database");
  return { enabled: true, databaseUrl };
}
