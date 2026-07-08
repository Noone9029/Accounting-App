import { AccountType, ContactType, JournalEntryStatus, PrismaClient, PurchaseBillStatus, SalesInvoiceStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "./prisma/prisma.service";
import { ReportsService } from "./reports/reports.service";

type VatTaxDbSettings = { enabled: false; databaseUrl?: undefined } | { enabled: true; databaseUrl: string };

interface VatTenantFixture {
  organizationId: string;
  customerId: string;
  supplierId: string;
  customerName: string;
  supplierName: string;
  accounts: {
    cash: string;
    vatPayable: string;
    vatReceivable: string;
    revenue: string;
    expense: string;
  };
  invoiceStartNumber: string;
  invoiceEndNumber: string;
  outsideInvoiceNumber: string;
  draftInvoiceNumber: string;
  billNumber: string;
  outsideBillNumber: string;
  voidBillNumber: string;
  expected: {
    salesTaxable: string;
    outputVat: string;
    salesGross: string;
    purchaseTaxable: string;
    inputVat: string;
    purchaseGross: string;
    netVat: string;
    netVatPayable: string;
    netVatRefundable: string;
  };
}

interface VatTaxFixture {
  marker: string;
  tenantA: VatTenantFixture;
  tenantB: VatTenantFixture;
}

const DB_INTEGRATION_SETTINGS = resolveVatTaxDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeVatTaxDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;
const PROOF_PREFIX = "LB-VAT-TAX-PROOF";
const PROOF_FROM = "2026-04-01";
const PROOF_TO = "2026-04-30";

describe("VAT/tax report value proof DB URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveVatTaxDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the VAT/tax DB proof is enabled", () => {
    expect(() =>
      resolveVatTaxDbSettings({
        LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveVatTaxDbSettings({
        LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveVatTaxDbSettings({
        LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveVatTaxDbSettings({
        LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeVatTaxDb("VAT/tax report value proof against local Prisma DB", () => {
  jest.setTimeout(120_000);

  let prisma: PrismaClient;
  let reportsService: ReportsService;
  let fixture: VatTaxFixture | undefined;
  let previousDatabaseUrl: string | undefined;

  beforeAll(async () => {
    const databaseUrl = DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Expected LEDGERBYTE_TEST_DATABASE_URL after VAT/tax DB proof settings were resolved.");
    }

    previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();
    await cleanupVatFixtureByPrefix(prisma);
    fixture = await seedVatTaxFixture(prisma);
    reportsService = new ReportsService(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await cleanupVatFixture(prisma, fixture);
      await prisma.$disconnect();
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });

  it("proves VAT Summary values from posted VAT payable and receivable activity", async () => {
    const current = currentFixture();
    const summary = await reportsService.vatSummary(current.tenantA.organizationId, { from: PROOF_FROM, to: PROOF_TO });

    expect(summary).toMatchObject({
      from: PROOF_FROM,
      to: PROOF_TO,
      salesVat: current.tenantA.expected.outputVat,
      purchaseVat: current.tenantA.expected.inputVat,
      netVatPayable: current.tenantA.expected.netVatPayable,
    });
    expect(summary.sections).toEqual([
      { category: "SALES_VAT_PAYABLE", accountCode: "220", amount: "0.0000", taxAmount: current.tenantA.expected.outputVat },
      { category: "PURCHASE_VAT_RECEIVABLE", accountCode: "230", amount: "0.0000", taxAmount: current.tenantA.expected.inputVat },
    ]);
    expect(summary.notes.join(" ")).toContain("not an official VAT return filing report");
    expect(summary.notes.join(" ")).toContain("posted journal activity");
    assertNoTenantBLeak(summary, current);

    const tenantBSummary = await reportsService.vatSummary(current.tenantB.organizationId, { from: PROOF_FROM, to: PROOF_TO });
    expect(tenantBSummary.salesVat).toBe(current.tenantB.expected.outputVat);
    expect(tenantBSummary.purchaseVat).toBe(current.tenantB.expected.inputVat);
    expect(JSON.stringify(summary)).not.toContain(tenantBSummary.salesVat);
  });

  it("proves VAT Return JSON values from finalized sales invoices and purchase bills", async () => {
    const current = currentFixture();
    const report = await reportsService.vatReturn(current.tenantA.organizationId, { from: PROOF_FROM, to: PROOF_TO });

    expect(report).toMatchObject({
      from: PROOF_FROM,
      to: PROOF_TO,
      basis: "FINALIZED_SOURCE_DOCUMENTS",
      outputVat: current.tenantA.expected.outputVat,
      inputVat: current.tenantA.expected.inputVat,
      netVat: current.tenantA.expected.netVat,
      netVatPayable: current.tenantA.expected.netVatPayable,
      netVatRefundable: current.tenantA.expected.netVatRefundable,
      sales: {
        documentCount: 2,
        taxableAmount: current.tenantA.expected.salesTaxable,
        taxAmount: current.tenantA.expected.outputVat,
        grossAmount: current.tenantA.expected.salesGross,
      },
      purchases: {
        documentCount: 1,
        taxableAmount: current.tenantA.expected.purchaseTaxable,
        taxAmount: current.tenantA.expected.inputVat,
        grossAmount: current.tenantA.expected.purchaseGross,
      },
    });

    const serialized = JSON.stringify(report);
    expect(serialized).toContain(current.tenantA.invoiceStartNumber);
    expect(serialized).toContain(current.tenantA.invoiceEndNumber);
    expect(serialized).toContain(current.tenantA.billNumber);
    expect(serialized).not.toContain(current.tenantA.outsideInvoiceNumber);
    expect(serialized).not.toContain(current.tenantA.outsideBillNumber);
    expect(serialized).not.toContain(current.tenantA.draftInvoiceNumber);
    expect(serialized).not.toContain(current.tenantA.voidBillNumber);
    assertNoTenantBLeak(report, current);
    assertInternalReviewWording(serialized);
  });

  it("proves VAT Return internal-review CSV matches JSON and source-document totals", async () => {
    const current = currentFixture();
    const report = await reportsService.vatReturn(current.tenantA.organizationId, { from: PROOF_FROM, to: PROOF_TO });
    const csv = await reportsService.vatReturnCsvFile(current.tenantA.organizationId, { from: PROOF_FROM, to: PROOF_TO });

    expect(csv.filename).toMatch(/^vat-return-draft-review-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv.content).toContain("Draft VAT Return Review Export");
    expect(csv.content).toContain("Review Status,Internal review only");
    expect(csv.content).toContain("Official Filing Format,Not implemented");
    expect(csv.content).toContain("Authority Submission,Not implemented");
    expect(csv.content).toContain(`Output VAT (sales),${report.outputVat}`);
    expect(csv.content).toContain(`Input VAT (purchases),${report.inputVat}`);
    expect(csv.content).toContain(`Net VAT,${report.netVat}`);
    expect(csv.content).toContain(
      `Finalized sales invoices,${report.sales.documentCount},${report.sales.taxableAmount},${report.sales.taxAmount},${report.sales.grossAmount}`,
    );
    expect(csv.content).toContain(
      `Finalized purchase bills,${report.purchases.documentCount},${report.purchases.taxableAmount},${report.purchases.taxAmount},${report.purchases.grossAmount}`,
    );
    expect(csv.content).toContain(`${current.tenantA.invoiceStartNumber},2026-04-01,700.0000,105.0000,805.0000`);
    expect(csv.content).toContain(`${current.tenantA.invoiceEndNumber},2026-04-30,300.0000,45.0000,345.0000`);
    expect(csv.content).toContain(`${current.tenantA.billNumber},2026-04-30,400.0000,60.0000,460.0000`);
    expect(csv.content).not.toContain(current.tenantA.outsideInvoiceNumber);
    expect(csv.content).not.toContain(current.tenantA.draftInvoiceNumber);
    expect(csv.content).not.toContain(current.tenantA.voidBillNumber);
    assertNoTenantBLeak(csv.content, current);
    assertInternalReviewWording(csv.content);
  });

  it("proves Tenant B VAT/tax data is isolated from Tenant A JSON and CSV reports", async () => {
    const current = currentFixture();
    const tenantAJson = await reportsService.vatReturn(current.tenantA.organizationId, { from: PROOF_FROM, to: PROOF_TO });
    const tenantACsv = await reportsService.vatReturnCsvFile(current.tenantA.organizationId, { from: PROOF_FROM, to: PROOF_TO });
    const tenantBJson = await reportsService.vatReturn(current.tenantB.organizationId, { from: PROOF_FROM, to: PROOF_TO });

    expect(tenantBJson.outputVat).toBe(current.tenantB.expected.outputVat);
    expect(tenantBJson.inputVat).toBe(current.tenantB.expected.inputVat);
    expect(JSON.stringify(tenantAJson)).not.toContain(current.tenantB.expected.outputVat);
    expect(JSON.stringify(tenantAJson)).not.toContain(current.tenantB.expected.inputVat);
    expect(tenantACsv.content).not.toContain(current.tenantB.expected.outputVat);
    expect(tenantACsv.content).not.toContain(current.tenantB.expected.inputVat);
    assertNoTenantBLeak(tenantAJson, current);
    assertNoTenantBLeak(tenantACsv.content, current);
  });

  function currentFixture(): VatTaxFixture {
    if (!fixture) {
      throw new Error("Expected VAT/tax proof fixture to be seeded.");
    }
    return fixture;
  }
});

function resolveVatTaxDbSettings(env: NodeJS.ProcessEnv): VatTaxDbSettings {
  if (env.LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION !== "1") {
    return { enabled: false };
  }

  const databaseUrl = env.LEDGERBYTE_TEST_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_VAT_TAX_REPORT_VALUE_DB_INTEGRATION=1");
  }

  assertLocalDisposableDatabaseUrl(databaseUrl);
  return { enabled: true, databaseUrl };
}

function assertLocalDisposableDatabaseUrl(databaseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid local-only PostgreSQL URL.");
  }

  const isPostgres = parsed.protocol === "postgresql:" || parsed.protocol === "postgres:";
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (!isPostgres || !localHosts.has(parsed.hostname)) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must point to a local-only PostgreSQL database.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, "")).toLowerCase();
  if (!databaseName || /(prod|production|live|hosted|staging)/.test(databaseName) || !/(accounting|ledgerbyte|test|local)/.test(databaseName)) {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must use a disposable local database name.");
  }
}

async function seedVatTaxFixture(prisma: PrismaClient): Promise<VatTaxFixture> {
  const marker = `${PROOF_PREFIX}-${randomUUID().slice(0, 8)}`;
  const tenantA = vatTenantFixture(marker, "A", {
    salesTaxable: "1000.0000",
    outputVat: "150.0000",
    salesGross: "1150.0000",
    purchaseTaxable: "400.0000",
    inputVat: "60.0000",
    purchaseGross: "460.0000",
    netVat: "90.0000",
    netVatPayable: "90.0000",
    netVatRefundable: "0.0000",
  });
  const tenantB = vatTenantFixture(marker, "B", {
    salesTaxable: "4000.0000",
    outputVat: "777.0000",
    salesGross: "4777.0000",
    purchaseTaxable: "900.0000",
    inputVat: "111.0000",
    purchaseGross: "1011.0000",
    netVat: "666.0000",
    netVatPayable: "666.0000",
    netVatRefundable: "0.0000",
  });

  for (const tenant of [tenantA, tenantB]) {
    await seedVatTenant(prisma, tenant);
  }

  return { marker, tenantA, tenantB };
}

function vatTenantFixture(marker: string, label: "A" | "B", expected: VatTenantFixture["expected"]): VatTenantFixture {
  return {
    organizationId: randomUUID(),
    customerId: randomUUID(),
    supplierId: randomUUID(),
    customerName: `${marker} Customer ${label}`,
    supplierName: `${marker} Supplier ${label}`,
    accounts: {
      cash: randomUUID(),
      vatPayable: randomUUID(),
      vatReceivable: randomUUID(),
      revenue: randomUUID(),
      expense: randomUUID(),
    },
    invoiceStartNumber: `${marker}-INV-START-${label}`,
    invoiceEndNumber: `${marker}-INV-END-${label}`,
    outsideInvoiceNumber: `${marker}-INV-OUTSIDE-${label}`,
    draftInvoiceNumber: `${marker}-INV-DRAFT-${label}`,
    billNumber: `${marker}-BILL-${label}`,
    outsideBillNumber: `${marker}-BILL-OUTSIDE-${label}`,
    voidBillNumber: `${marker}-BILL-VOID-${label}`,
    expected,
  };
}

async function seedVatTenant(prisma: PrismaClient, tenant: VatTenantFixture): Promise<void> {
  await prisma.organization.create({
    data: {
      id: tenant.organizationId,
      name: `${tenant.customerName} Organization`,
      legalName: `${tenant.customerName} Legal Entity`,
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
  });

  await prisma.account.createMany({
    data: [
      { id: tenant.accounts.cash, organizationId: tenant.organizationId, code: "111", name: `${tenant.customerName} Cash`, type: AccountType.ASSET },
      {
        id: tenant.accounts.vatPayable,
        organizationId: tenant.organizationId,
        code: "220",
        name: `${tenant.customerName} VAT Payable`,
        type: AccountType.LIABILITY,
      },
      {
        id: tenant.accounts.vatReceivable,
        organizationId: tenant.organizationId,
        code: "230",
        name: `${tenant.supplierName} VAT Receivable`,
        type: AccountType.ASSET,
      },
      { id: tenant.accounts.revenue, organizationId: tenant.organizationId, code: "411", name: `${tenant.customerName} Revenue`, type: AccountType.REVENUE },
      { id: tenant.accounts.expense, organizationId: tenant.organizationId, code: "511", name: `${tenant.supplierName} Expense`, type: AccountType.EXPENSE },
    ],
  });

  await prisma.contact.createMany({
    data: [
      {
        id: tenant.customerId,
        organizationId: tenant.organizationId,
        type: ContactType.CUSTOMER,
        name: tenant.customerName,
        displayName: tenant.customerName,
        email: `customer-${tenant.invoiceStartNumber.toLowerCase()}@example.test`,
      },
      {
        id: tenant.supplierId,
        organizationId: tenant.organizationId,
        type: ContactType.SUPPLIER,
        name: tenant.supplierName,
        displayName: tenant.supplierName,
        email: `supplier-${tenant.billNumber.toLowerCase()}@example.test`,
      },
    ],
  });

  await createPostedVatJournal(prisma, tenant, `${tenant.invoiceStartNumber}-VAT-JE`, "2026-04-01", tenant.expected.outputVat === "777.0000" ? "777.0000" : "105.0000", "OUTPUT");
  if (tenant.expected.outputVat !== "777.0000") {
    await createPostedVatJournal(prisma, tenant, `${tenant.invoiceEndNumber}-VAT-JE`, "2026-04-30", "45.0000", "OUTPUT");
  }
  await createPostedVatJournal(prisma, tenant, `${tenant.billNumber}-VAT-JE`, "2026-04-30", tenant.expected.inputVat, "INPUT");
  await createPostedVatJournal(prisma, tenant, `${tenant.outsideInvoiceNumber}-VAT-JE`, "2026-05-01", "9999.0000", "OUTPUT");

  if (tenant.expected.outputVat === "777.0000") {
    await createSalesInvoice(prisma, tenant, tenant.invoiceStartNumber, "2026-04-15", "4000.0000", "777.0000", "4777.0000", SalesInvoiceStatus.FINALIZED);
    await createPurchaseBill(prisma, tenant, tenant.billNumber, "2026-04-16", "900.0000", "111.0000", "1011.0000", PurchaseBillStatus.FINALIZED);
    return;
  }

  await createSalesInvoice(prisma, tenant, tenant.invoiceStartNumber, "2026-04-01", "700.0000", "105.0000", "805.0000", SalesInvoiceStatus.FINALIZED);
  await createSalesInvoice(prisma, tenant, tenant.invoiceEndNumber, "2026-04-30", "300.0000", "45.0000", "345.0000", SalesInvoiceStatus.FINALIZED);
  await createSalesInvoice(prisma, tenant, tenant.outsideInvoiceNumber, "2026-05-01", "9999.0000", "999.0000", "10998.0000", SalesInvoiceStatus.FINALIZED);
  await createSalesInvoice(prisma, tenant, tenant.draftInvoiceNumber, "2026-04-15", "500.0000", "75.0000", "575.0000", SalesInvoiceStatus.DRAFT);
  await createPurchaseBill(prisma, tenant, tenant.billNumber, "2026-04-30", "400.0000", "60.0000", "460.0000", PurchaseBillStatus.FINALIZED);
  await createPurchaseBill(prisma, tenant, tenant.outsideBillNumber, "2026-05-01", "900.0000", "135.0000", "1035.0000", PurchaseBillStatus.FINALIZED);
  await createPurchaseBill(prisma, tenant, tenant.voidBillNumber, "2026-04-20", "700.0000", "105.0000", "805.0000", PurchaseBillStatus.VOIDED);
}

async function createPostedVatJournal(
  prisma: PrismaClient,
  tenant: VatTenantFixture,
  entryNumber: string,
  date: string,
  amount: string,
  kind: "OUTPUT" | "INPUT",
): Promise<void> {
  const journalEntryId = randomUUID();
  const entryDate = new Date(`${date}T00:00:00.000Z`);
  const vatAccountId = kind === "OUTPUT" ? tenant.accounts.vatPayable : tenant.accounts.vatReceivable;
  const balancingAccountId = tenant.accounts.cash;
  const vatLine = kind === "OUTPUT"
    ? { accountId: vatAccountId, debit: "0.0000", credit: amount, description: `${entryNumber} output VAT` }
    : { accountId: vatAccountId, debit: amount, credit: "0.0000", description: `${entryNumber} input VAT` };
  const balancingLine = kind === "OUTPUT"
    ? { accountId: balancingAccountId, debit: amount, credit: "0.0000", description: `${entryNumber} cash balance` }
    : { accountId: balancingAccountId, debit: "0.0000", credit: amount, description: `${entryNumber} cash balance` };

  await prisma.journalEntry.create({
    data: {
      id: journalEntryId,
      organizationId: tenant.organizationId,
      entryNumber,
      status: JournalEntryStatus.POSTED,
      entryDate,
      description: `${entryNumber} posted VAT proof entry`,
      reference: entryNumber,
      currency: "SAR",
      totalDebit: amount,
      totalCredit: amount,
      postedAt: entryDate,
      lines: {
        create: [balancingLine, vatLine].map((line, index) => ({
          organizationId: tenant.organizationId,
          accountId: line.accountId,
          lineNumber: index + 1,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: "SAR",
        })),
      },
    },
  });
}

async function createSalesInvoice(
  prisma: PrismaClient,
  tenant: VatTenantFixture,
  invoiceNumber: string,
  date: string,
  taxableTotal: string,
  taxTotal: string,
  total: string,
  status: SalesInvoiceStatus,
): Promise<void> {
  await prisma.salesInvoice.create({
    data: {
      organizationId: tenant.organizationId,
      invoiceNumber,
      customerId: tenant.customerId,
      issueDate: new Date(`${date}T00:00:00.000Z`),
      dueDate: new Date(`${date}T00:00:00.000Z`),
      currency: "SAR",
      status,
      subtotal: taxableTotal,
      taxableTotal,
      taxTotal,
      total,
      balanceDue: total,
      finalizedAt: status === SalesInvoiceStatus.FINALIZED ? new Date(`${date}T00:00:00.000Z`) : null,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            description: `${invoiceNumber} synthetic VAT proof line`,
            accountId: tenant.accounts.revenue,
            quantity: "1.0000",
            unitPrice: taxableTotal,
            lineGrossAmount: taxableTotal,
            taxableAmount: taxableTotal,
            taxAmount: taxTotal,
            lineSubtotal: taxableTotal,
            lineTotal: total,
          },
        ],
      },
    },
  });
}

async function createPurchaseBill(
  prisma: PrismaClient,
  tenant: VatTenantFixture,
  billNumber: string,
  date: string,
  taxableTotal: string,
  taxTotal: string,
  total: string,
  status: PurchaseBillStatus,
): Promise<void> {
  await prisma.purchaseBill.create({
    data: {
      organizationId: tenant.organizationId,
      billNumber,
      supplierId: tenant.supplierId,
      billDate: new Date(`${date}T00:00:00.000Z`),
      dueDate: new Date(`${date}T00:00:00.000Z`),
      currency: "SAR",
      status,
      subtotal: taxableTotal,
      taxableTotal,
      taxTotal,
      total,
      balanceDue: total,
      finalizedAt: status === PurchaseBillStatus.FINALIZED ? new Date(`${date}T00:00:00.000Z`) : null,
      lines: {
        create: [
          {
            organizationId: tenant.organizationId,
            description: `${billNumber} synthetic VAT proof line`,
            accountId: tenant.accounts.expense,
            quantity: "1.0000",
            unitPrice: taxableTotal,
            lineGrossAmount: taxableTotal,
            taxableAmount: taxableTotal,
            taxAmount: taxTotal,
            lineTotal: total,
          },
        ],
      },
    },
  });
}

async function cleanupVatFixture(prisma: PrismaClient, fixture?: VatTaxFixture): Promise<void> {
  if (fixture) {
    await prisma.organization.deleteMany({
      where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
    });
    return;
  }

  await cleanupVatFixtureByPrefix(prisma);
}

async function cleanupVatFixtureByPrefix(prisma: PrismaClient): Promise<void> {
  await prisma.organization.deleteMany({
    where: { name: { startsWith: PROOF_PREFIX } },
  });
}

function assertNoTenantBLeak(subject: unknown, fixture: VatTaxFixture): void {
  const text = typeof subject === "string" ? subject : JSON.stringify(subject);
  expect(text).not.toContain(fixture.tenantB.customerName);
  expect(text).not.toContain(fixture.tenantB.supplierName);
  expect(text).not.toContain(fixture.tenantB.invoiceStartNumber);
  expect(text).not.toContain(fixture.tenantB.billNumber);
  expect(text).not.toContain(fixture.tenantB.expected.salesGross);
  expect(text).not.toContain(fixture.tenantB.expected.purchaseGross);
}

function assertInternalReviewWording(text: string): void {
  expect(text).toContain("Internal");
  expect(text).toMatch(/does not submit a tax return|Authority Submission,Not implemented/);
  expect(text).not.toMatch(/submitted to tax authority/i);
  expect(text).not.toMatch(/approved by ZATCA/i);
  expect(text).not.toMatch(/certified VAT return/i);
}
