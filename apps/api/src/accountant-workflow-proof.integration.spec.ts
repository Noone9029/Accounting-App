import { NotFoundException } from "@nestjs/common";
import {
  AccountType,
  ContactType,
  JournalEntryStatus,
  MembershipStatus,
  NumberSequenceScope,
  PrismaClient,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AccountingService } from "./accounting/accounting.service";
import { AUDIT_EVENTS } from "./audit-log/audit-events";
import { AuditLogService } from "./audit-log/audit-log.service";
import { ContactLedgerService } from "./contacts/contact-ledger.service";
import { CustomerPaymentService } from "./customer-payments/customer-payment.service";
import { NumberSequenceService } from "./number-sequences/number-sequence.service";
import { PrismaService } from "./prisma/prisma.service";
import { PurchaseBillService } from "./purchase-bills/purchase-bill.service";
import { ReportsService } from "./reports/reports.service";
import { SalesInvoiceService } from "./sales-invoices/sales-invoice.service";
import { SupplierPaymentService } from "./supplier-payments/supplier-payment.service";

type AccountantWorkflowDbSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

interface AccountantWorkflowFixtureSet {
  marker: string;
  tenantA: AccountantTenantFixture;
  tenantB: AccountantTenantFixture;
}

interface AccountantTenantFixture {
  organizationId: string;
  userId: string;
  email: string;
  roleId: string;
  memberId: string;
  customerId: string;
  supplierId: string;
  customerName: string;
  supplierName: string;
  accounts: {
    cash: string;
    accountsReceivable: string;
    accountsPayable: string;
    vatPayable: string;
    vatReceivable: string;
    revenue: string;
    expense: string;
  };
}

interface AccountantWorkflowEvidence {
  salesInvoiceId: string;
  salesInvoiceNumber: string;
  salesInvoiceJournalEntryId: string;
  customerPaymentId: string;
  customerPaymentJournalEntryId: string;
  purchaseBillId: string;
  purchaseBillNumber: string;
  purchaseBillJournalEntryId: string;
  supplierPaymentId: string;
  supplierPaymentJournalEntryId: string;
  manualJournalEntryId: string;
  manualJournalEntryNumber: string;
  reversalJournalEntryId: string;
  reversalJournalEntryNumber: string;
}

const DB_INTEGRATION_SETTINGS = resolveAccountantWorkflowDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeAccountantWorkflowDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;
const PROOF_REPORT_END = new Date().toISOString().slice(0, 10);
const PROOF_DATE_RANGE = { from: "2026-02-01", to: PROOF_REPORT_END, asOf: PROOF_REPORT_END, includeZero: false };

describe("accountant workflow proof DB URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveAccountantWorkflowDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the accountant workflow DB proof is enabled", () => {
    expect(() =>
      resolveAccountantWorkflowDbSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveAccountantWorkflowDbSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveAccountantWorkflowDbSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveAccountantWorkflowDbSettings({
        LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeAccountantWorkflowDb("accountant workflow proof: Prisma-backed local DB", () => {
  jest.setTimeout(90_000);

  let prisma: PrismaClient;
  let fixture: AccountantWorkflowFixtureSet;
  let tenantAWorkflow: AccountantWorkflowEvidence;
  let tenantBWorkflow: AccountantWorkflowEvidence;
  let auditLogService: AuditLogService;
  let accountingService: AccountingService;
  let contactLedgerService: ContactLedgerService;
  let reportsService: ReportsService;
  let salesInvoiceService: SalesInvoiceService;
  let purchaseBillService: PurchaseBillService;
  let customerPaymentService: CustomerPaymentService;
  let supplierPaymentService: SupplierPaymentService;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();

    auditLogService = new AuditLogService(prisma as unknown as PrismaService);
    const numberSequenceService = makeNumberSequenceService();
    accountingService = new AccountingService(prisma as unknown as PrismaService, auditLogService, numberSequenceService);
    contactLedgerService = new ContactLedgerService(prisma as unknown as PrismaService);
    reportsService = new ReportsService(prisma as unknown as PrismaService);
    salesInvoiceService = new SalesInvoiceService(
      prisma as unknown as PrismaService,
      auditLogService,
      numberSequenceService,
      accountingService,
    );
    purchaseBillService = new PurchaseBillService(prisma as unknown as PrismaService, auditLogService, numberSequenceService);
    customerPaymentService = new CustomerPaymentService(prisma as unknown as PrismaService, auditLogService, numberSequenceService);
    supplierPaymentService = new SupplierPaymentService(prisma as unknown as PrismaService, auditLogService, numberSequenceService);

    fixture = await seedAccountantWorkflowFixture(prisma);
    tenantAWorkflow = await postFullAccountantWorkflow(fixture.tenantA, "120.0000");
    tenantBWorkflow = await postFullAccountantWorkflow(fixture.tenantB, "987.0000");
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupAccountantWorkflowFixture(prisma, fixture);
    }
    await prisma.$disconnect();
  });

  it("proves invoice -> payment -> customer ledger -> AR aging/report impact without cross-tenant leakage", async () => {
    const invoice = await salesInvoiceService.get(fixture.tenantA.organizationId, tenantAWorkflow.salesInvoiceId);
    expect(invoice.status).toBe(SalesInvoiceStatus.FINALIZED);
    expect(invoice.journalEntryId).toBe(tenantAWorkflow.salesInvoiceJournalEntryId);
    expect(toFixed(invoice.balanceDue)).toBe("45.0000");

    const invoiceJournal = await accountingService.get(fixture.tenantA.organizationId, tenantAWorkflow.salesInvoiceJournalEntryId);
    expect(invoiceJournal.status).toBe(JournalEntryStatus.POSTED);
    expect(journalLineFor(invoiceJournal, fixture.tenantA.accounts.accountsReceivable)?.debit).toBe("120.0000");
    expect(journalLineFor(invoiceJournal, fixture.tenantA.accounts.revenue)?.credit).toBe("120.0000");

    const payment = await customerPaymentService.get(fixture.tenantA.organizationId, tenantAWorkflow.customerPaymentId);
    expect(payment.journalEntryId).toBe(tenantAWorkflow.customerPaymentJournalEntryId);
    expect(payment.allocations).toHaveLength(1);
    expect(toFixed(payment.allocations[0]?.amountApplied)).toBe("75.0000");

    const ledger = await contactLedgerService.ledger(fixture.tenantA.organizationId, fixture.tenantA.customerId);
    expect(ledger.rows.map((row) => row.type)).toEqual(expect.arrayContaining(["INVOICE", "PAYMENT", "PAYMENT_ALLOCATION"]));
    expect(ledger.rows.map((row) => row.number)).toEqual(expect.arrayContaining([tenantAWorkflow.salesInvoiceNumber, payment.paymentNumber]));
    expect(ledger.closingBalance).toBe("45.0000");

    const agedReceivables = await reportsService.agedReceivables(fixture.tenantA.organizationId, PROOF_DATE_RANGE);
    expect(JSON.stringify(agedReceivables)).toContain(tenantAWorkflow.salesInvoiceNumber);
    expect(JSON.stringify(agedReceivables)).toContain("45.0000");
    assertTenantBAbsent(agedReceivables, fixture.tenantB, tenantBWorkflow);

    await expect(salesInvoiceService.get(fixture.tenantA.organizationId, tenantBWorkflow.salesInvoiceId)).rejects.toThrow(NotFoundException);
  });

  it("proves bill -> supplier payment -> supplier ledger -> AP aging/report impact without cross-tenant leakage", async () => {
    const bill = await purchaseBillService.get(fixture.tenantA.organizationId, tenantAWorkflow.purchaseBillId);
    expect(bill.status).toBe(PurchaseBillStatus.FINALIZED);
    expect(bill.journalEntryId).toBe(tenantAWorkflow.purchaseBillJournalEntryId);
    expect(toFixed(bill.balanceDue)).toBe("70.0000");

    const billJournal = await accountingService.get(fixture.tenantA.organizationId, tenantAWorkflow.purchaseBillJournalEntryId);
    expect(billJournal.status).toBe(JournalEntryStatus.POSTED);
    expect(journalLineFor(billJournal, fixture.tenantA.accounts.expense)?.debit).toBe("150.0000");
    expect(journalLineFor(billJournal, fixture.tenantA.accounts.accountsPayable)?.credit).toBe("150.0000");

    const payment = await supplierPaymentService.get(fixture.tenantA.organizationId, tenantAWorkflow.supplierPaymentId);
    expect(payment.journalEntryId).toBe(tenantAWorkflow.supplierPaymentJournalEntryId);
    expect(payment.allocations).toHaveLength(1);
    expect(toFixed(payment.allocations[0]?.amountApplied)).toBe("80.0000");

    const ledger = await contactLedgerService.supplierLedger(fixture.tenantA.organizationId, fixture.tenantA.supplierId);
    expect(ledger.rows.map((row) => row.type)).toEqual(expect.arrayContaining(["PURCHASE_BILL", "SUPPLIER_PAYMENT"]));
    expect(ledger.rows.map((row) => row.number)).toEqual(expect.arrayContaining([tenantAWorkflow.purchaseBillNumber, payment.paymentNumber]));
    expect(ledger.closingBalance).toBe("70.0000");

    const agedPayables = await reportsService.agedPayables(fixture.tenantA.organizationId, PROOF_DATE_RANGE);
    expect(JSON.stringify(agedPayables)).toContain(tenantAWorkflow.purchaseBillNumber);
    expect(JSON.stringify(agedPayables)).toContain("70.0000");
    assertTenantBAbsent(agedPayables, fixture.tenantB, tenantBWorkflow);

    await expect(purchaseBillService.get(fixture.tenantA.organizationId, tenantBWorkflow.purchaseBillId)).rejects.toThrow(NotFoundException);
  });

  it("proves manual journal -> reversal -> general ledger/report impact without cross-tenant leakage", async () => {
    const reversedJournal = await accountingService.get(fixture.tenantA.organizationId, tenantAWorkflow.manualJournalEntryId);
    const reversalJournal = await accountingService.get(fixture.tenantA.organizationId, tenantAWorkflow.reversalJournalEntryId);

    expect(reversedJournal.status).toBe(JournalEntryStatus.REVERSED);
    expect(reversalJournal.status).toBe(JournalEntryStatus.POSTED);
    expect(reversalJournal.reversalOf?.id).toBe(reversedJournal.id);
    expect(journalLineFor(reversalJournal, fixture.tenantA.accounts.cash)?.credit).toBe("25.0000");
    expect(journalLineFor(reversalJournal, fixture.tenantA.accounts.revenue)?.debit).toBe("25.0000");

    const generalLedger = await reportsService.generalLedger(fixture.tenantA.organizationId, PROOF_DATE_RANGE);
    const serialized = JSON.stringify(generalLedger);
    expect(serialized).toContain(tenantAWorkflow.manualJournalEntryNumber);
    expect(serialized).toContain(tenantAWorkflow.reversalJournalEntryNumber);
    assertTenantBAbsent(generalLedger, fixture.tenantB, tenantBWorkflow);

    const trialBalance = await reportsService.trialBalance(fixture.tenantA.organizationId, PROOF_DATE_RANGE);
    expect(trialBalance.totals.balanced).toBe(true);
    expect(JSON.stringify(trialBalance)).not.toContain(fixture.tenantB.customerName);
  });

  it("proves audit logs and audit export remain tenant-scoped for posted financial actions", async () => {
    const logs = await auditLogService.list(fixture.tenantA.organizationId, { limit: 100 });
    const actions = logs.data.map((log) => log.action);

    expect(actions).toEqual(
      expect.arrayContaining([
        AUDIT_EVENTS.SALES_INVOICE_CREATED,
        AUDIT_EVENTS.SALES_INVOICE_FINALIZED,
        AUDIT_EVENTS.CUSTOMER_PAYMENT_CREATED,
        AUDIT_EVENTS.PURCHASE_BILL_CREATED,
        AUDIT_EVENTS.PURCHASE_BILL_FINALIZED,
        AUDIT_EVENTS.SUPPLIER_PAYMENT_CREATED,
        AUDIT_EVENTS.JOURNAL_CREATED,
        AUDIT_EVENTS.JOURNAL_POSTED,
        AUDIT_EVENTS.JOURNAL_REVERSED,
      ]),
    );
    expect(logs.data.every((log) => log.organizationId === fixture.tenantA.organizationId)).toBe(true);
    expect(JSON.stringify(logs)).not.toContain(fixture.tenantB.email);

    const exported = await auditLogService.exportCsv(fixture.tenantA.organizationId, {});
    expect(exported.csv).toContain(AUDIT_EVENTS.SALES_INVOICE_FINALIZED);
    expect(exported.csv).toContain(AUDIT_EVENTS.PURCHASE_BILL_FINALIZED);
    expect(exported.csv).toContain(AUDIT_EVENTS.JOURNAL_REVERSED);
    expect(exported.csv).not.toContain(fixture.tenantB.email);
    expect(exported.csv).not.toContain(fixture.tenantB.customerName);
  });

  async function postFullAccountantWorkflow(tenant: AccountantTenantFixture, salesAmount: string): Promise<AccountantWorkflowEvidence> {
    const invoice = await salesInvoiceService.create(tenant.organizationId, tenant.userId, {
      customerId: tenant.customerId,
      issueDate: "2026-02-01",
      dueDate: "2026-02-28",
      currency: "SAR",
      notes: `${tenant.customerName} local proof invoice`,
      lines: [
        {
          description: `${tenant.customerName} revenue line`,
          accountId: tenant.accounts.revenue,
          quantity: "1.0000",
          unitPrice: salesAmount,
          discountRate: "0.0000",
          sortOrder: 0,
        },
      ],
    });
    const finalizedInvoice = await salesInvoiceService.finalize(tenant.organizationId, tenant.userId, invoice.id);

    const customerPayment = await customerPaymentService.create(tenant.organizationId, tenant.userId, {
      customerId: tenant.customerId,
      paymentDate: "2026-02-10",
      currency: "SAR",
      amountReceived: "75.0000",
      accountId: tenant.accounts.cash,
      description: `${tenant.customerName} local proof payment`,
      allocations: [{ invoiceId: finalizedInvoice.id, amountApplied: "75.0000" }],
    });

    const bill = await purchaseBillService.create(tenant.organizationId, tenant.userId, {
      supplierId: tenant.supplierId,
      billDate: "2026-02-03",
      dueDate: "2026-02-28",
      currency: "SAR",
      notes: `${tenant.supplierName} local proof bill`,
      inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
      lines: [
        {
          description: `${tenant.supplierName} expense line`,
          accountId: tenant.accounts.expense,
          quantity: "1.0000",
          unitPrice: "150.0000",
          discountRate: "0.0000",
          sortOrder: 0,
        },
      ],
    });
    const finalizedBill = await purchaseBillService.finalize(tenant.organizationId, tenant.userId, bill.id);

    const supplierPayment = await supplierPaymentService.create(tenant.organizationId, tenant.userId, {
      supplierId: tenant.supplierId,
      paymentDate: "2026-02-12",
      currency: "SAR",
      amountPaid: "80.0000",
      accountId: tenant.accounts.cash,
      description: `${tenant.supplierName} local proof supplier payment`,
      allocations: [{ billId: finalizedBill.id, amountApplied: "80.0000" }],
    });

    const manualJournal = await accountingService.create(tenant.organizationId, tenant.userId, {
      entryDate: "2026-02-15",
      description: `${tenant.customerName} manual proof journal`,
      reference: `AWP-${tenant.email}`,
      currency: "SAR",
      lines: [
        {
          accountId: tenant.accounts.cash,
          debit: "25.0000",
          credit: "0.0000",
          currency: "SAR",
          description: `${tenant.customerName} manual debit`,
        },
        {
          accountId: tenant.accounts.revenue,
          debit: "0.0000",
          credit: "25.0000",
          currency: "SAR",
          description: `${tenant.customerName} manual credit`,
        },
      ],
    });
    const postedJournal = await accountingService.post(tenant.organizationId, tenant.userId, manualJournal.id);
    const reversalJournal = await accountingService.reverse(tenant.organizationId, tenant.userId, postedJournal.id);

    return {
      salesInvoiceId: finalizedInvoice.id,
      salesInvoiceNumber: finalizedInvoice.invoiceNumber,
      salesInvoiceJournalEntryId: finalizedInvoice.journalEntryId!,
      customerPaymentId: customerPayment.id,
      customerPaymentJournalEntryId: customerPayment.journalEntryId!,
      purchaseBillId: finalizedBill.id,
      purchaseBillNumber: finalizedBill.billNumber,
      purchaseBillJournalEntryId: finalizedBill.journalEntryId!,
      supplierPaymentId: supplierPayment.id,
      supplierPaymentJournalEntryId: supplierPayment.journalEntryId!,
      manualJournalEntryId: postedJournal.id,
      manualJournalEntryNumber: postedJournal.entryNumber,
      reversalJournalEntryId: reversalJournal.id,
      reversalJournalEntryNumber: reversalJournal.entryNumber,
    };
  }
});

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Accountant workflow DB proof requires a Postgres URL.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Accountant workflow DB proof is local-only and refuses non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Accountant workflow DB proof requires a disposable local database name.");
  }

  return rawUrl;
}

function resolveAccountantWorkflowDbSettings(env: NodeJS.ProcessEnv): AccountantWorkflowDbSettings {
  if (env.LEDGERBYTE_ACCOUNTANT_WORKFLOW_DB_INTEGRATION !== "1") {
    return { enabled: false };
  }

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
  };
}

function makeNumberSequenceService(): NumberSequenceService {
  let sequence = 0;
  return {
    next: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => `AWP-${scope}-${++sequence}`),
    preview: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => ({
      scope,
      nextNumber: `AWP-${scope}-${sequence + 1}`,
      exampleNextNumber: `AWP-${scope}-${sequence + 1}`,
    })),
  } as unknown as NumberSequenceService;
}

async function seedAccountantWorkflowFixture(prisma: PrismaClient): Promise<AccountantWorkflowFixtureSet> {
  const marker = `AWP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const uniqueSuffix = marker.replace(/[^A-Za-z0-9]/g, "").slice(-12).toLowerCase();
  const tenantA = fixtureIds(marker, uniqueSuffix, "A");
  const tenantB = fixtureIds(marker, uniqueSuffix, "B");

  await prisma.user.createMany({
    data: [
      {
        id: tenantA.userId,
        email: tenantA.email,
        name: `${marker} User A`,
        passwordHash: "accountant-workflow-local-hash",
      },
      {
        id: tenantB.userId,
        email: tenantB.email,
        name: `${marker} User B`,
        passwordHash: "accountant-workflow-local-hash",
      },
    ],
  });

  await prisma.organization.createMany({
    data: [
      { id: tenantA.organizationId, name: `${marker} Organization A`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
      { id: tenantB.organizationId, name: `${marker} Organization B`, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
    ],
  });

  await prisma.role.createMany({
    data: [
      { id: tenantA.roleId, organizationId: tenantA.organizationId, name: `${marker} Accountant Owner A`, permissions: ["admin.fullAccess"], isSystem: true },
      { id: tenantB.roleId, organizationId: tenantB.organizationId, name: `${marker} Accountant Owner B`, permissions: ["admin.fullAccess"], isSystem: true },
    ],
  });

  await prisma.organizationMember.createMany({
    data: [
      { id: tenantA.memberId, organizationId: tenantA.organizationId, userId: tenantA.userId, roleId: tenantA.roleId, status: MembershipStatus.ACTIVE },
      { id: tenantB.memberId, organizationId: tenantB.organizationId, userId: tenantB.userId, roleId: tenantB.roleId, status: MembershipStatus.ACTIVE },
    ],
  });

  await Promise.all([seedTenantBaseRecords(prisma, tenantA), seedTenantBaseRecords(prisma, tenantB)]);

  return { marker, tenantA, tenantB };
}

function fixtureIds(marker: string, uniqueSuffix: string, tenantLabel: "A" | "B"): AccountantTenantFixture {
  const tenantSuffix = `${uniqueSuffix}-${tenantLabel.toLowerCase()}`;
  return {
    organizationId: randomUUID(),
    userId: randomUUID(),
    email: `accountant-workflow-${tenantSuffix}@example.test`,
    roleId: randomUUID(),
    memberId: randomUUID(),
    customerId: randomUUID(),
    supplierId: randomUUID(),
    customerName: `${marker} Customer ${tenantLabel}`,
    supplierName: `${marker} Supplier ${tenantLabel}`,
    accounts: {
      cash: randomUUID(),
      accountsReceivable: randomUUID(),
      accountsPayable: randomUUID(),
      vatPayable: randomUUID(),
      vatReceivable: randomUUID(),
      revenue: randomUUID(),
      expense: randomUUID(),
    },
  };
}

async function seedTenantBaseRecords(prisma: PrismaClient, tenant: AccountantTenantFixture): Promise<void> {
  await prisma.account.createMany({
    data: [
      {
        id: tenant.accounts.cash,
        organizationId: tenant.organizationId,
        code: "100",
        name: `${tenant.customerName} Cash`,
        type: AccountType.ASSET,
      },
      {
        id: tenant.accounts.accountsReceivable,
        organizationId: tenant.organizationId,
        code: "120",
        name: `${tenant.customerName} Accounts Receivable`,
        type: AccountType.ASSET,
      },
      {
        id: tenant.accounts.accountsPayable,
        organizationId: tenant.organizationId,
        code: "210",
        name: `${tenant.supplierName} Accounts Payable`,
        type: AccountType.LIABILITY,
      },
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
      {
        id: tenant.accounts.revenue,
        organizationId: tenant.organizationId,
        code: "400",
        name: `${tenant.customerName} Revenue`,
        type: AccountType.REVENUE,
      },
      {
        id: tenant.accounts.expense,
        organizationId: tenant.organizationId,
        code: "500",
        name: `${tenant.supplierName} Expense`,
        type: AccountType.EXPENSE,
      },
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
      },
      {
        id: tenant.supplierId,
        organizationId: tenant.organizationId,
        type: ContactType.SUPPLIER,
        name: tenant.supplierName,
        displayName: tenant.supplierName,
      },
    ],
  });
}

async function cleanupAccountantWorkflowFixture(prisma: PrismaClient, fixture: AccountantWorkflowFixtureSet): Promise<void> {
  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.tenantA.userId, fixture.tenantB.userId] } },
  });
}

function journalLineFor(entry: Awaited<ReturnType<AccountingService["get"]>>, accountId: string) {
  const line = entry.lines.find((candidate) => candidate.accountId === accountId);
  if (!line) {
    return undefined;
  }
  return { debit: toFixed(line.debit), credit: toFixed(line.credit) };
}

function assertTenantBAbsent(report: unknown, tenantB: AccountantTenantFixture, tenantBWorkflow: AccountantWorkflowEvidence): void {
  const serialized = JSON.stringify(report);
  expect(serialized).not.toContain(tenantB.email);
  expect(serialized).not.toContain(tenantB.customerName);
  expect(serialized).not.toContain(tenantB.supplierName);
  expect(serialized).not.toContain(tenantBWorkflow.salesInvoiceNumber);
  expect(serialized).not.toContain(tenantBWorkflow.purchaseBillNumber);
}

function toFixed(value: unknown): string {
  if (typeof value === "object" && value !== null && "toFixed" in value && typeof value.toFixed === "function") {
    return value.toFixed(4);
  }
  return Number(value).toFixed(4);
}
