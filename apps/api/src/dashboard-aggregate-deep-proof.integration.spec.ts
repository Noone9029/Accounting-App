import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankReconciliationStatus,
  BankStatementImportStatus,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  CollectionCaseStatus,
  CollectionPriority,
  ContactType,
  CustomerPaymentStatus,
  DeliveryNoteStatus,
  FiscalPeriodStatus,
  ItemStatus,
  ItemType,
  JournalEntryStatus,
  PrismaClient,
  PurchaseBillStatus,
  RecurringInvoiceFrequency,
  RecurringInvoiceTemplateStatus,
  SalesInvoiceStatus,
  SalesQuoteStatus,
  StockMovementType,
  SupplierPaymentStatus,
  WarehouseStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { DashboardService } from "./dashboard/dashboard.service";
import { InventoryClearingReportService } from "./inventory/inventory-clearing-report.service";
import { PrismaService } from "./prisma/prisma.service";
import { ReportsService } from "./reports/reports.service";
import { StorageService } from "./storage/storage.service";

type DashboardAggregateProofDbSettings =
  | { enabled: false; databaseUrl?: undefined }
  | { enabled: true; databaseUrl: string };

interface DashboardAggregateFixtureSet {
  marker: string;
  tenantA: DashboardTenantFixture;
  tenantB: DashboardTenantFixture;
}

interface DashboardTenantFixture {
  organizationId: string;
  customerId: string;
  supplierId: string;
  customerName: string;
  supplierName: string;
  bankDisplayName: string;
  invoiceNumber: string;
  billNumber: string;
  quoteNumber: string;
  recurringNumber: string;
  deliveryNoteNumber: string;
  collectionCaseNumber: string;
  itemName: string;
  accountIds: {
    cash: string;
    accountsReceivable: string;
    accountsPayable: string;
    revenue: string;
    expense: string;
  };
  bankProfileId: string;
}

interface DashboardTenantAmounts {
  invoiceTotal: string;
  invoiceBalance: string;
  customerPayment: string;
  billTotal: string;
  billBalance: string;
  supplierPayment: string;
  quoteTotal: string;
  recurringTotal: string;
  promisedAmount: string;
  stockQuantity: string;
  stockUnitCost: string;
  bankTransactionAmount: string;
}

const DB_INTEGRATION_SETTINGS = resolveDashboardAggregateProofDbSettings(process.env);
const DATABASE_URL = DB_INTEGRATION_SETTINGS.enabled ? DB_INTEGRATION_SETTINGS.databaseUrl : undefined;
const describeDashboardAggregateProofDb = DB_INTEGRATION_SETTINGS.enabled ? describe : describe.skip;
const PROOF_TODAY = startOfUtcDay(new Date());
const PROOF_MONTH = monthKey(PROOF_TODAY);
const PROOF_MONTH_START = startOfUtcMonth(PROOF_TODAY);
const PROOF_MONTH_START_LABEL = dateOnly(PROOF_MONTH_START);
const PROOF_MONTH_END = endOfUtcMonth(PROOF_TODAY);
const PROOF_PREVIOUS_MONTH_START = addUtcMonths(PROOF_MONTH_START, -1);
const PROOF_PREVIOUS_MONTH_END = addUtcDays(PROOF_MONTH_START, -1);
const PROOF_YESTERDAY = addUtcDays(PROOF_TODAY, -1);
const PROOF_IN_THREE_DAYS = addUtcDays(PROOF_TODAY, 3);
const PROOF_IN_FIVE_DAYS = addUtcDays(PROOF_TODAY, 5);
const PROOF_RECONCILIATION_AT = withUtcTime(PROOF_YESTERDAY, 10, 0);

describe("dashboard aggregate deep proof DB URL gate", () => {
  it("skips safely when the opt-in environment variable is not set", () => {
    expect(resolveDashboardAggregateProofDbSettings({} as NodeJS.ProcessEnv)).toEqual({ enabled: false });
  });

  it("requires LEDGERBYTE_TEST_DATABASE_URL when the dashboard aggregate proof is enabled", () => {
    expect(() =>
      resolveDashboardAggregateProofDbSettings({
        LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION: "1",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION=1");
  });

  it("rejects hosted or non-local database URLs", () => {
    expect(() =>
      resolveDashboardAggregateProofDbSettings({
        LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@db.example.com/accounting?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("local-only");
  });

  it("rejects production-looking database names", () => {
    expect(() =>
      resolveDashboardAggregateProofDbSettings({
        LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting_prod?schema=public",
      } as NodeJS.ProcessEnv),
    ).toThrow("disposable local database name");
  });

  it("accepts an explicit disposable local test database URL", () => {
    const localUrl = "postgresql://accounting:accounting@localhost:5432/accounting?schema=public";

    expect(
      resolveDashboardAggregateProofDbSettings({
        LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION: "1",
        LEDGERBYTE_TEST_DATABASE_URL: localUrl,
      } as NodeJS.ProcessEnv),
    ).toEqual({ enabled: true, databaseUrl: localUrl });
  });
});

describeDashboardAggregateProofDb("dashboard aggregate deep proof: Prisma-backed local DB", () => {
  jest.setTimeout(120_000);

  let prisma: PrismaClient;
  let fixture: DashboardAggregateFixtureSet;
  let dashboardService: DashboardService;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
      transactionOptions: { maxWait: 10_000, timeout: 25_000 },
    });
    await prisma.$connect();

    const reportsService = new ReportsService(prisma as unknown as PrismaService);
    const inventoryClearingReportService = new InventoryClearingReportService(prisma as unknown as PrismaService);
    const storageService = {
      readiness: jest.fn(() => ({
        attachmentStorage: { activeProvider: "database" },
        generatedDocumentStorage: { activeProvider: "database" },
      })),
    } as unknown as StorageService;
    dashboardService = new DashboardService(
      prisma as unknown as PrismaService,
      reportsService,
      inventoryClearingReportService,
      storageService,
    );

    fixture = await seedDashboardAggregateFixture(prisma);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupDashboardAggregateFixture(prisma, fixture);
    }
    await prisma.$disconnect();
  });

  it("proves dashboard aggregates are tenant-scoped, read-only, and calculated from synthetic posted data", async () => {
    const beforeCounts = await mutationSentinelCounts(prisma, fixture.tenantA.organizationId);

    const summary = await dashboardService.summary(fixture.tenantA.organizationId);

    expect(summary.currency).toBe("SAR");
    expect(summary.sales).toMatchObject({
      unpaidInvoiceCount: 1,
      unpaidInvoiceBalance: "80.0000",
      overdueInvoiceCount: 1,
      overdueInvoiceBalance: "80.0000",
      salesThisMonth: "200.0000",
      customerPaymentThisMonth: "120.0000",
    });
    expect(summary.salesAttention).toMatchObject({
      readOnly: true,
      noMutation: true,
      overdueInvoices: { count: 1, total: "80.0000" },
      collections: {
        openCount: 1,
        dueTodayCount: 1,
        overdueFollowUpCount: 0,
        promisedToPayTotal: "40.0000",
        disputedCount: 0,
      },
      quotes: {
        awaitingAcceptanceCount: 1,
        expiringSoonCount: 1,
        acceptedNotConvertedCount: 0,
      },
      recurringInvoices: {
        activeCount: 1,
        dueSoonCount: 0,
        overdueForGenerationCount: 1,
      },
      deliveryNotes: {
        draftCount: 0,
        issuedNotDeliveredCount: 1,
        overdueDeliveryCount: 1,
      },
    });
    expect(summary.salesAttention.overdueInvoices.topItems[0]).toEqual(
      expect.objectContaining({
        number: fixture.tenantA.invoiceNumber,
        customerName: fixture.tenantA.customerName,
        amount: "80.0000",
      }),
    );
    expect(summary.salesAttention.collections.topItems[0]).toEqual(
      expect.objectContaining({
        number: fixture.tenantA.collectionCaseNumber,
        customerName: fixture.tenantA.customerName,
        promisedAmount: "40.0000",
      }),
    );
    expect(summary.salesAttention.quotes.topItems[0]).toEqual(
      expect.objectContaining({
        number: fixture.tenantA.quoteNumber,
        amount: "300.0000",
      }),
    );
    expect(summary.salesAttention.recurringInvoices.topItems[0]).toEqual(
      expect.objectContaining({
        number: fixture.tenantA.recurringNumber,
        amount: "70.0000",
      }),
    );
    expect(summary.salesAttention.deliveryNotes.topItems[0]).toEqual(
      expect.objectContaining({
        number: fixture.tenantA.deliveryNoteNumber,
      }),
    );

    expect(summary.purchases).toMatchObject({
      unpaidBillCount: 1,
      unpaidBillBalance: "50.0000",
      overdueBillCount: 1,
      overdueBillBalance: "50.0000",
      purchasesThisMonth: "150.0000",
      supplierPaymentThisMonth: "100.0000",
    });
    expect(summary.banking).toMatchObject({
      bankAccountCount: 1,
      totalBankBalance: "20.0000",
      unreconciledTransactionCount: 1,
      latestReconciliationDate: PROOF_RECONCILIATION_AT.toISOString(),
    });
    expect(summary.inventory).toMatchObject({
      trackedItemCount: 1,
      lowStockCount: 1,
      negativeStockCount: 0,
      inventoryEstimatedValue: "20.0000",
      clearingVarianceCount: 0,
    });
    expect(summary.inventory.lowStockItems).toEqual([
      {
        itemId: expect.any(String),
        name: fixture.tenantA.itemName,
        quantityOnHand: "4.0000",
        reorderPoint: "10.0000",
      },
    ]);
    expect(summary.reports).toEqual({
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "50.0000",
      balanceSheetBalanced: true,
    });
    expect(summary.trends.monthlySales.at(-1)).toEqual({ month: PROOF_MONTH, amount: "200.0000" });
    expect(summary.trends.monthlyPurchases.at(-1)).toEqual({ month: PROOF_MONTH, amount: "150.0000" });
    expect(summary.trends.monthlyNetProfit.at(-1)).toEqual({ month: PROOF_MONTH, amount: "50.0000" });
    expect(summary.trends.cashBalanceTrend.at(-1)).toEqual({ date: PROOF_MONTH_START_LABEL, balance: "20.0000" });
    expect(summary.aging.receivablesBuckets).toEqual(
      expect.arrayContaining([{ bucket: "1-30", amount: "80.0000" }]),
    );
    expect(summary.aging.payablesBuckets).toEqual(
      expect.arrayContaining([{ bucket: "1-30", amount: "50.0000" }]),
    );
    expect(summary.compliance).toMatchObject({
      zatcaProductionReady: false,
      fiscalPeriodsLockedCount: 1,
      auditLogCountThisMonth: 1,
    });
    expect(summary.sectionStatus).toEqual(
      expect.objectContaining({
        sales: { status: "READY" },
        salesAttention: { status: "READY" },
        purchases: { status: "READY" },
        banking: { status: "READY" },
        inventory: { status: "READY" },
        reports: { status: "READY" },
        trends: { status: "READY" },
        aging: { status: "READY" },
        compliance: { status: "READY" },
        storage: { status: "READY" },
      }),
    );
    expect(summary.attentionItems.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "OVERDUE_INVOICES",
        "COLLECTION_FOLLOWUPS",
        "QUOTES_AWAITING_ACTION",
        "RECURRING_TEMPLATES_DUE",
        "DELIVERY_NOTES_AWAITING_ACTION",
        "OVERDUE_BILLS",
        "UNRECONCILED_BANK_TRANSACTIONS",
        "LOW_STOCK",
        "ZATCA_NOT_READY",
        "DATABASE_STORAGE_ACTIVE",
      ]),
    );
    assertTenantAbsent(summary, fixture.tenantB);
    await expect(mutationSentinelCounts(prisma, fixture.tenantA.organizationId)).resolves.toEqual(beforeCounts);
  });

  it("proves the second synthetic tenant has its own dashboard data and does not leak tenant A markers", async () => {
    const summary = await dashboardService.summary(fixture.tenantB.organizationId);

    expect(summary.sales).toMatchObject({
      unpaidInvoiceCount: 1,
      unpaidInvoiceBalance: "999.0000",
      salesThisMonth: "999.0000",
    });
    expect(summary.purchases.unpaidBillBalance).toBe("777.0000");
    expect(summary.banking.totalBankBalance).toBe("222.0000");
    expect(summary.salesAttention.overdueInvoices.topItems[0]).toEqual(
      expect.objectContaining({
        number: fixture.tenantB.invoiceNumber,
        customerName: fixture.tenantB.customerName,
      }),
    );
    assertTenantAbsent(summary, fixture.tenantA);
  });

  it("proves Sales/AR attention details are suppressed when permission context disallows them", async () => {
    const summary = await dashboardService.summary(fixture.tenantA.organizationId, { canViewSalesAttention: false });

    expect(summary.sales.unpaidInvoiceBalance).toBe("80.0000");
    expect(summary.purchases.unpaidBillBalance).toBe("50.0000");
    expect(summary.salesAttention).toEqual(
      expect.objectContaining({
        readOnly: true,
        noMutation: true,
        overdueInvoices: { count: 0, total: "0.0000", topItems: [] },
        collections: expect.objectContaining({ openCount: 0, topItems: [] }),
        quotes: expect.objectContaining({ awaitingAcceptanceCount: 0, topItems: [] }),
        recurringInvoices: expect.objectContaining({ activeCount: 0, topItems: [] }),
        deliveryNotes: expect.objectContaining({ issuedNotDeliveredCount: 0, topItems: [] }),
        customers: { topOutstanding: [] },
      }),
    );
  });
});

function requireLocalPostgresUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error(
      "LEDGERBYTE_TEST_DATABASE_URL is required when LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION=1. Point it at disposable local Postgres.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("LEDGERBYTE_TEST_DATABASE_URL must be a valid Postgres URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Dashboard aggregate proof requires a Postgres URL.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Dashboard aggregate proof is local-only and refuses non-local database hosts.");
  }

  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName || databaseName.toLowerCase().includes("prod")) {
    throw new Error("Dashboard aggregate proof requires a disposable local database name.");
  }

  return rawUrl;
}

function resolveDashboardAggregateProofDbSettings(env: NodeJS.ProcessEnv): DashboardAggregateProofDbSettings {
  if (env.LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION !== "1") {
    return { enabled: false };
  }

  return {
    enabled: true,
    databaseUrl: requireLocalPostgresUrl(env.LEDGERBYTE_TEST_DATABASE_URL),
  };
}

async function seedDashboardAggregateFixture(prisma: PrismaClient): Promise<DashboardAggregateFixtureSet> {
  const marker = `DAP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const tenantA = await seedDashboardTenant(prisma, marker, "A", {
    invoiceTotal: "200.0000",
    invoiceBalance: "80.0000",
    customerPayment: "120.0000",
    billTotal: "150.0000",
    billBalance: "50.0000",
    supplierPayment: "100.0000",
    quoteTotal: "300.0000",
    recurringTotal: "70.0000",
    promisedAmount: "40.0000",
    stockQuantity: "4.0000",
    stockUnitCost: "5.0000",
    bankTransactionAmount: "25.0000",
  });
  const tenantB = await seedDashboardTenant(prisma, marker, "B", {
    invoiceTotal: "999.0000",
    invoiceBalance: "999.0000",
    customerPayment: "333.0000",
    billTotal: "888.0000",
    billBalance: "777.0000",
    supplierPayment: "111.0000",
    quoteTotal: "654.0000",
    recurringTotal: "321.0000",
    promisedAmount: "222.0000",
    stockQuantity: "6.0000",
    stockUnitCost: "7.0000",
    bankTransactionAmount: "444.0000",
  });

  return { marker, tenantA, tenantB };
}

async function seedDashboardTenant(
  prisma: PrismaClient,
  marker: string,
  tenantLabel: "A" | "B",
  amounts: DashboardTenantAmounts,
): Promise<DashboardTenantFixture> {
  const organizationId = randomUUID();
  const customerId = randomUUID();
  const supplierId = randomUUID();
  const bankProfileId = randomUUID();
  const warehouseId = randomUUID();
  const itemId = randomUUID();
  const suffix = `${marker}-${tenantLabel}`;
  const accountIds = {
    cash: randomUUID(),
    accountsReceivable: randomUUID(),
    accountsPayable: randomUUID(),
    revenue: randomUUID(),
    expense: randomUUID(),
  };
  const customerName = `${suffix} Customer Marker`;
  const supplierName = `${suffix} Supplier Marker`;
  const bankDisplayName = `${suffix} Operating Bank Marker`;
  const invoiceNumber = `${suffix}-INV`;
  const billNumber = `${suffix}-BILL`;
  const quoteNumber = `${suffix}-QUOTE`;
  const recurringNumber = `${suffix}-REC`;
  const deliveryNoteNumber = `${suffix}-DN`;
  const collectionCaseNumber = `${suffix}-COL`;
  const itemName = `${suffix} Low Stock Item`;

  await prisma.organization.create({
    data: {
      id: organizationId,
      name: `${suffix} Organization`,
      legalName: `${suffix} Legal Entity`,
      taxNumber: tenantLabel === "A" ? "300000000000003" : "300000000000004",
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
  });
  await prisma.contact.createMany({
    data: [
      { id: customerId, organizationId, type: ContactType.CUSTOMER, name: customerName, displayName: customerName },
      { id: supplierId, organizationId, type: ContactType.SUPPLIER, name: supplierName, displayName: supplierName },
    ],
  });
  await prisma.account.createMany({
    data: [
      { id: accountIds.cash, organizationId, code: "111", name: bankDisplayName, type: AccountType.ASSET },
      { id: accountIds.accountsReceivable, organizationId, code: "120", name: `${suffix} Accounts Receivable`, type: AccountType.ASSET },
      { id: accountIds.accountsPayable, organizationId, code: "210", name: `${suffix} Accounts Payable`, type: AccountType.LIABILITY },
      { id: accountIds.revenue, organizationId, code: "411", name: `${suffix} Revenue`, type: AccountType.REVENUE },
      { id: accountIds.expense, organizationId, code: "511", name: `${suffix} Expense`, type: AccountType.EXPENSE },
    ],
  });
  await prisma.bankAccountProfile.create({
    data: {
      id: bankProfileId,
      organizationId,
      accountId: accountIds.cash,
      type: BankAccountType.BANK,
      status: BankAccountStatus.ACTIVE,
      displayName: bankDisplayName,
      currency: "SAR",
    },
  });
  await prisma.salesInvoice.create({
    data: {
      organizationId,
      invoiceNumber,
      customerId,
      issueDate: PROOF_TODAY,
      dueDate: PROOF_YESTERDAY,
      status: SalesInvoiceStatus.FINALIZED,
      subtotal: amounts.invoiceTotal,
      taxableTotal: amounts.invoiceTotal,
      total: amounts.invoiceTotal,
      balanceDue: amounts.invoiceBalance,
      finalizedAt: withUtcTime(PROOF_TODAY, 9, 0),
    },
  });
  await prisma.customerPayment.create({
    data: {
      organizationId,
      paymentNumber: `${suffix}-CPAY`,
      customerId,
      paymentDate: PROOF_TODAY,
      status: CustomerPaymentStatus.POSTED,
      amountReceived: amounts.customerPayment,
      accountId: accountIds.cash,
      postedAt: withUtcTime(PROOF_TODAY, 9, 0),
    },
  });
  await prisma.purchaseBill.create({
    data: {
      organizationId,
      billNumber,
      supplierId,
      billDate: PROOF_TODAY,
      dueDate: PROOF_YESTERDAY,
      status: PurchaseBillStatus.FINALIZED,
      subtotal: amounts.billTotal,
      taxableTotal: amounts.billTotal,
      total: amounts.billTotal,
      balanceDue: amounts.billBalance,
      finalizedAt: withUtcTime(PROOF_TODAY, 9, 0),
    },
  });
  await prisma.supplierPayment.create({
    data: {
      organizationId,
      paymentNumber: `${suffix}-SPAY`,
      supplierId,
      paymentDate: PROOF_TODAY,
      status: SupplierPaymentStatus.POSTED,
      amountPaid: amounts.supplierPayment,
      accountId: accountIds.cash,
      postedAt: withUtcTime(PROOF_TODAY, 9, 30),
    },
  });
  await createPostedJournal(prisma, organizationId, `${suffix}-JE-SALE`, "Posted synthetic sale", [
    { accountId: accountIds.accountsReceivable, debit: amounts.invoiceTotal, credit: "0.0000" },
    { accountId: accountIds.revenue, debit: "0.0000", credit: amounts.invoiceTotal },
  ]);
  await createPostedJournal(prisma, organizationId, `${suffix}-JE-CUSTOMER-PAYMENT`, "Posted synthetic customer payment", [
    { accountId: accountIds.cash, debit: amounts.customerPayment, credit: "0.0000" },
    { accountId: accountIds.accountsReceivable, debit: "0.0000", credit: amounts.customerPayment },
  ]);
  await createPostedJournal(prisma, organizationId, `${suffix}-JE-BILL`, "Posted synthetic supplier bill", [
    { accountId: accountIds.expense, debit: amounts.billTotal, credit: "0.0000" },
    { accountId: accountIds.accountsPayable, debit: "0.0000", credit: amounts.billTotal },
  ]);
  await createPostedJournal(prisma, organizationId, `${suffix}-JE-SUPPLIER-PAYMENT`, "Posted synthetic supplier payment", [
    { accountId: accountIds.accountsPayable, debit: amounts.supplierPayment, credit: "0.0000" },
    { accountId: accountIds.cash, debit: "0.0000", credit: amounts.supplierPayment },
  ]);
  const bankImport = await prisma.bankStatementImport.create({
    data: {
      organizationId,
      bankAccountProfileId: bankProfileId,
      filename: `${suffix}-statement.csv`,
      sourceType: "CSV",
      status: BankStatementImportStatus.IMPORTED,
      statementStartDate: PROOF_MONTH_START,
      statementEndDate: PROOF_MONTH_END,
      rowCount: 1,
      transactions: {
        create: [
          {
            organizationId,
            bankAccountProfileId: bankProfileId,
            transactionDate: PROOF_YESTERDAY,
            description: `${suffix} Unreconciled transaction marker`,
            reference: `${suffix}-UNMATCHED`,
            type: BankStatementTransactionType.DEBIT,
            amount: amounts.bankTransactionAmount,
            status: BankStatementTransactionStatus.UNMATCHED,
          },
        ],
      },
    },
  });
  await prisma.bankReconciliation.create({
    data: {
      organizationId,
      bankAccountProfileId: bankProfileId,
      reconciliationNumber: `${suffix}-REC-CLOSE`,
      periodStart: PROOF_MONTH_START,
      periodEnd: PROOF_MONTH_END,
      statementClosingBalance: "0.0000",
      ledgerClosingBalance: "0.0000",
      difference: "0.0000",
      status: BankReconciliationStatus.CLOSED,
      closedAt: PROOF_RECONCILIATION_AT,
      notes: `${suffix} closed reconciliation marker ${bankImport.id}`,
    },
  });
  await prisma.salesQuote.create({
    data: {
      organizationId,
      quoteNumber,
      customerId,
      status: SalesQuoteStatus.SENT,
      issueDate: PROOF_TODAY,
      expiryDate: PROOF_IN_THREE_DAYS,
      subtotal: amounts.quoteTotal,
      taxableTotal: amounts.quoteTotal,
      total: amounts.quoteTotal,
    },
  });
  await prisma.recurringInvoiceTemplate.create({
    data: {
      organizationId,
      templateNumber: recurringNumber,
      name: `${suffix} Recurring Template`,
      customerId,
      status: RecurringInvoiceTemplateStatus.ACTIVE,
      startDate: PROOF_MONTH_START,
      nextRunDate: PROOF_YESTERDAY,
      frequency: RecurringInvoiceFrequency.MONTHLY,
      subtotal: amounts.recurringTotal,
      taxableTotal: amounts.recurringTotal,
      total: amounts.recurringTotal,
    },
  });
  await prisma.deliveryNote.create({
    data: {
      organizationId,
      deliveryNoteNumber,
      customerId,
      status: DeliveryNoteStatus.ISSUED,
      issueDate: PROOF_YESTERDAY,
      deliveryDate: PROOF_YESTERDAY,
      issuedAt: withUtcTime(PROOF_YESTERDAY, 10, 0),
    },
  });
  await prisma.collectionCase.create({
    data: {
      organizationId,
      caseNumber: collectionCaseNumber,
      customerId,
      salesInvoiceId: (await prisma.salesInvoice.findUniqueOrThrow({ where: { organizationId_invoiceNumber: { organizationId, invoiceNumber } } })).id,
      status: CollectionCaseStatus.PROMISED_TO_PAY,
      priority: CollectionPriority.HIGH,
      followUpDate: PROOF_TODAY,
      promisedPaymentDate: PROOF_IN_FIVE_DAYS,
      promisedAmount: amounts.promisedAmount,
      summary: `${suffix} collection marker`,
    },
  });
  await prisma.warehouse.create({
    data: {
      id: warehouseId,
      organizationId,
      code: `${tenantLabel}-WH-${marker.slice(-6)}`,
      name: `${suffix} Warehouse`,
      status: WarehouseStatus.ACTIVE,
      isDefault: true,
    },
  });
  await prisma.item.create({
    data: {
      id: itemId,
      organizationId,
      name: itemName,
      sku: `${tenantLabel}-${marker.slice(-8)}`,
      type: ItemType.PRODUCT,
      status: ItemStatus.ACTIVE,
      sellingPrice: "20.0000",
      revenueAccountId: accountIds.revenue,
      expenseAccountId: accountIds.expense,
      inventoryTracking: true,
      reorderPoint: "10.0000",
    },
  });
  await prisma.stockMovement.create({
    data: {
      organizationId,
      itemId,
      warehouseId,
      movementDate: PROOF_TODAY,
      type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
      quantity: amounts.stockQuantity,
      unitCost: amounts.stockUnitCost,
      description: `${suffix} inventory movement marker`,
    },
  });
  await prisma.fiscalPeriod.createMany({
    data: [
      {
        organizationId,
        name: `${suffix} Open Current Month`,
        startsOn: PROOF_MONTH_START,
        endsOn: PROOF_MONTH_END,
        status: FiscalPeriodStatus.OPEN,
      },
      {
        organizationId,
        name: `${suffix} Locked Previous Month`,
        startsOn: PROOF_PREVIOUS_MONTH_START,
        endsOn: PROOF_PREVIOUS_MONTH_END,
        status: FiscalPeriodStatus.LOCKED,
      },
    ],
  });
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: `${suffix}_DASHBOARD_PROOF_ACTION`,
      entityType: "DashboardAggregateProof",
      entityId: organizationId,
      createdAt: withUtcTime(PROOF_TODAY, 12, 0),
    },
  });

  return {
    organizationId,
    customerId,
    supplierId,
    customerName,
    supplierName,
    bankDisplayName,
    invoiceNumber,
    billNumber,
    quoteNumber,
    recurringNumber,
    deliveryNoteNumber,
    collectionCaseNumber,
    itemName,
    accountIds,
    bankProfileId,
  };
}

async function createPostedJournal(
  prisma: PrismaClient,
  organizationId: string,
  entryNumber: string,
  description: string,
  lines: Array<{ accountId: string; debit: string; credit: string }>,
): Promise<void> {
  const totalDebit = lines.reduce((total, line) => total + Number(line.debit), 0).toFixed(4);
  await prisma.journalEntry.create({
    data: {
      organizationId,
      entryNumber,
      status: JournalEntryStatus.POSTED,
      entryDate: PROOF_TODAY,
      description,
      currency: "SAR",
      totalDebit,
      totalCredit: totalDebit,
      postedAt: withUtcTime(PROOF_TODAY, 10, 0),
      lines: {
        create: lines.map((line, index) => ({
          organizationId,
          accountId: line.accountId,
          lineNumber: index + 1,
          description,
          debit: line.debit,
          credit: line.credit,
          currency: "SAR",
        })),
      },
    },
  });
}

async function mutationSentinelCounts(prisma: PrismaClient, organizationId: string) {
  const [journalEntryCount, auditLogCount, bankStatementTransactionCount] = await Promise.all([
    prisma.journalEntry.count({ where: { organizationId } }),
    prisma.auditLog.count({ where: { organizationId } }),
    prisma.bankStatementTransaction.count({ where: { organizationId } }),
  ]);
  return { journalEntryCount, auditLogCount, bankStatementTransactionCount };
}

function assertTenantAbsent(value: unknown, tenant: DashboardTenantFixture): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain(tenant.customerName);
  expect(serialized).not.toContain(tenant.supplierName);
  expect(serialized).not.toContain(tenant.bankDisplayName);
  expect(serialized).not.toContain(tenant.invoiceNumber);
  expect(serialized).not.toContain(tenant.billNumber);
  expect(serialized).not.toContain(tenant.quoteNumber);
  expect(serialized).not.toContain(tenant.recurringNumber);
  expect(serialized).not.toContain(tenant.deliveryNoteNumber);
  expect(serialized).not.toContain(tenant.collectionCaseNumber);
  expect(serialized).not.toContain(tenant.itemName);
}

async function cleanupDashboardAggregateFixture(prisma: PrismaClient, fixture: DashboardAggregateFixtureSet): Promise<void> {
  await prisma.organization.deleteMany({
    where: { id: { in: [fixture.tenantA.organizationId, fixture.tenantB.organizationId] } },
  });
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function startOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function endOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfUtcDay(next);
}

function addUtcMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

function withUtcTime(value: Date, hours: number, minutes: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), hours, minutes, 0, 0));
}

function monthKey(value: Date): string {
  return value.toISOString().slice(0, 7);
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
