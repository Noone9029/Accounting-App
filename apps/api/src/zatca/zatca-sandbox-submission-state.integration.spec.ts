import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  ZatcaEnvironment,
  ZatcaInvoiceType,
  ZatcaSandboxProofRunStatus,
  ZatcaSandboxSubmissionOperation,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  ZatcaSandboxSubmissionStateError,
  ZatcaSandboxSubmissionStateService,
  type ReserveZatcaSandboxSubmissionInput,
} from "./zatca-sandbox-submission-state.service";

type IntegrationSettings = { enabled: false } | { enabled: true; databaseUrl: string };
const settings = resolveIntegrationSettings(process.env);
const describeDatabase = settings.enabled ? describe : describe.skip;

describe("ZATCA sandbox submission state database gate", () => {
  it("requires an explicitly named disposable local PostgreSQL database", () => {
    expect(resolveIntegrationSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
    expect(() => resolveIntegrationSettings({ LEDGERBYTE_ZATCA_SANDBOX_STATE_DB_INTEGRATION: "1" } as NodeJS.ProcessEnv)).toThrow("LEDGERBYTE_TEST_DATABASE_URL");
    expect(() => resolveIntegrationSettings({ LEDGERBYTE_ZATCA_SANDBOX_STATE_DB_INTEGRATION: "1", LEDGERBYTE_TEST_DATABASE_URL: "postgresql://fixture:fixture@db.example.com/ledgerbyte_arc07b_state" } as NodeJS.ProcessEnv)).toThrow("local-only");
  });
});

describeDatabase("ZATCA sandbox submission state: disposable PostgreSQL proof", () => {
  let prisma: PrismaClient;
  let service: ZatcaSandboxSubmissionStateService;
  let fixture: Awaited<ReturnType<typeof seedFixture>>;

  beforeEach(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: settings.enabled ? settings.databaseUrl : undefined } }, transactionOptions: { maxWait: 10_000, timeout: 25_000 } });
    await prisma.$connect();
    service = new ZatcaSandboxSubmissionStateService(prisma as unknown as PrismaService);
    fixture = await seedFixture(prisma);
  });

  afterEach(async () => {
    if (fixture) await prisma.organization.deleteMany({ where: { id: { in: [fixture.organizationId, fixture.otherOrganizationId] } } });
    await prisma.$disconnect();
  });

  it("allocates unique sequential ICV reservations under concurrent workers", async () => {
    const [first, second] = await Promise.all([
      service.reserve(reservationInput(fixture, "first", "payload-one")),
      service.reserve(reservationInput(fixture, "second", "payload-two")),
    ]);

    expect([first.state.icv, second.state.icv].sort()).toEqual([1, 2]);
    expect(await prisma.zatcaSandboxSubmissionState.count({ where: { organizationId: fixture.organizationId } })).toBe(2);
    expect(await prisma.zatcaEgsUnit.findUniqueOrThrow({ where: { id: fixture.egsUnitId }, select: { lastIcv: true, lastInvoiceHash: true } })).toEqual({ lastIcv: 0, lastInvoiceHash: null });
  });

  it("enforces tenant-scoped replay, PIH linkage, acceptance once, and proof-run cleanup", async () => {
    const first = await service.reserve(reservationInput(fixture, "source", "payload-one"));
    await expect(service.reserve(reservationInput(fixture, "source", "payload-one"))).resolves.toMatchObject({ disposition: "REPLAY", state: { id: first.state.id } });
    await expect(service.reserve(reservationInput(fixture, "source", "payload-two"))).rejects.toMatchObject({ code: "ZATCA_SANDBOX_IDEMPOTENCY_CONFLICT" });
    await expect(service.accept({ organizationId: fixture.otherOrganizationId, submissionStateId: first.state.id, requestHash: "request-hash", responseHash: "response-hash", responseCode: "SIMULATED_ACCEPTED", correlationId: randomUUID() })).rejects.toBeInstanceOf(ZatcaSandboxSubmissionStateError);

    await service.accept({ organizationId: fixture.organizationId, submissionStateId: first.state.id, requestHash: "request-hash", responseHash: "response-hash", responseCode: "SIMULATED_ACCEPTED", correlationId: randomUUID() });
    await expect(service.accept({ organizationId: fixture.organizationId, submissionStateId: first.state.id, requestHash: "request-hash-two", responseHash: "response-hash-two", responseCode: "SIMULATED_ACCEPTED", correlationId: randomUUID() })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE" });

    const second = await service.reserve({ ...reservationInput(fixture, "next-source", "payload-next"), previousInvoiceHash: "canonical-source" });
    expect(second.state.icv).toBe(2);
    await expect(service.reserve({ ...reservationInput(fixture, "wrong-pih", "payload-wrong"), previousInvoiceHash: "wrong" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_PIH_MISMATCH" });
    await expect(service.cleanupSyntheticProofRun(fixture.otherOrganizationId, fixture.proofRunId)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_PROOF_RUN_NOT_FOUND" });
    await expect(service.cleanupSyntheticProofRun(fixture.organizationId, fixture.proofRunId)).resolves.toEqual({ proofRunId: fixture.proofRunId, cleanedUp: true });
    expect(await prisma.zatcaSandboxSubmissionState.count({ where: { organizationId: fixture.organizationId } })).toBe(0);
    expect(await prisma.organization.count({ where: { id: fixture.otherOrganizationId } })).toBe(1);
  });
});

async function seedFixture(prisma: PrismaClient) {
  const suffix = randomUUID();
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const profileId = randomUUID();
  const egsUnitId = randomUUID();
  const proofRunId = randomUUID();
  await prisma.organization.createMany({ data: [{ id: organizationId, name: `ARC-07B state ${suffix}` }, { id: otherOrganizationId, name: `ARC-07B other ${suffix}` }] });
  await prisma.zatcaOrganizationProfile.create({ data: { id: profileId, organizationId, environment: ZatcaEnvironment.SANDBOX } });
  await prisma.zatcaEgsUnit.create({ data: { id: egsUnitId, organizationId, profileId, name: "Synthetic ARC-07B EGS", environment: ZatcaEnvironment.SANDBOX, deviceSerialNumber: `ARC-07B-${suffix}` } });
  await prisma.zatcaSandboxProofRun.create({ data: { id: proofRunId, organizationId, egsUnitId, environment: ZatcaEnvironment.SANDBOX, proofRunId: `arc-07b-${suffix}`, status: ZatcaSandboxProofRunStatus.ACTIVE, syntheticDataVerified: true } });
  return { organizationId, otherOrganizationId, egsUnitId, proofRunId };
}

function reservationInput(fixture: Awaited<ReturnType<typeof seedFixture>>, source: string, payload: string): ReserveZatcaSandboxSubmissionInput {
  return {
    organizationId: fixture.organizationId,
    egsUnitId: fixture.egsUnitId,
    proofRunId: fixture.proofRunId,
    sourceIdentityHash: `source-${source}`,
    payloadHash: payload,
    invoiceUuid: randomUUID(),
    invoiceType: ZatcaInvoiceType.STANDARD_TAX_INVOICE,
    previousInvoiceHash: "initial-hash",
    canonicalInvoiceHash: source === "source" ? "canonical-source" : `canonical-${source}`,
    operation: ZatcaSandboxSubmissionOperation.COMPLIANCE_DOCUMENT,
    reservationToken: randomUUID(),
  };
}

function resolveIntegrationSettings(env: NodeJS.ProcessEnv): IntegrationSettings {
  if (env.LEDGERBYTE_ZATCA_SANDBOX_STATE_DB_INTEGRATION !== "1") return { enabled: false };
  const databaseUrl = env.LEDGERBYTE_TEST_DATABASE_URL;
  if (!databaseUrl) throw new Error("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ZATCA_SANDBOX_STATE_DB_INTEGRATION=1");
  const url = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) throw new Error("ZATCA sandbox state integration is local-only");
  if (!url.pathname.replace(/^\//, '').startsWith('ledgerbyte_arc07b_')) throw new Error("ZATCA sandbox state integration requires a disposable ledgerbyte_arc07b_ database");
  return { enabled: true, databaseUrl };
}
