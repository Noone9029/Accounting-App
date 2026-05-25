import {
  AccountType,
  BankAccountStatus,
  DocumentType,
  JournalEntryStatus,
  PurchaseBillStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import {
  agingBucket,
  buildAgingReport,
  buildBalanceSheetReport,
  buildGeneralLedgerReport,
  buildProfitAndLossReport,
  buildTrialBalanceReport,
  buildVatReturnReport,
  buildVatSummaryReport,
  ReportsService,
} from "./reports.service";

const accounts = [
  { id: "cash", code: "111", name: "Cash", type: AccountType.ASSET },
  { id: "ar", code: "120", name: "Accounts Receivable", type: AccountType.ASSET },
  { id: "inventory-asset", code: "130", name: "Inventory", type: AccountType.ASSET },
  { id: "ap", code: "210", name: "Accounts Payable", type: AccountType.LIABILITY },
  { id: "vat-payable", code: "220", name: "VAT Payable", type: AccountType.LIABILITY },
  { id: "vat-receivable", code: "230", name: "VAT Receivable", type: AccountType.ASSET },
  { id: "inventory-clearing", code: "240", name: "Inventory Clearing", type: AccountType.LIABILITY },
  { id: "equity", code: "310", name: "Owner Equity", type: AccountType.EQUITY },
  { id: "revenue", code: "411", name: "Sales Revenue", type: AccountType.REVENUE },
  { id: "cogs", code: "510", name: "Cost of Sales", type: AccountType.COST_OF_SALES },
  { id: "expense", code: "511", name: "General Expenses", type: AccountType.EXPENSE },
];

describe("reports service builders", () => {
  it("calculates general ledger opening balances and natural running balances", () => {
    const report = buildGeneralLedgerReport(
      accounts,
      [line("cash", "2026-01-01", "100.0000", "0.0000", "Opening cash")],
      [
        line("cash", "2026-01-10", "0.0000", "25.0000", "Cash spent"),
        line("cash", "2026-01-11", "10.0000", "0.0000", "Cash received"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    const cash = report.accounts.find((account) => account.accountId === "cash");
    expect(cash).toMatchObject({
      openingDebit: "100.0000",
      periodDebit: "10.0000",
      periodCredit: "25.0000",
      closingDebit: "85.0000",
    });
    expect(cash?.lines.map((entry) => entry.runningBalance)).toEqual(["75.0000", "85.0000"]);
  });

  it("keeps trial balance closing debits and credits equal", () => {
    const report = buildTrialBalanceReport(
      accounts,
      [],
      [
        line("cash", "2026-01-10", "115.0000", "0.0000"),
        line("revenue", "2026-01-10", "0.0000", "100.0000"),
        line("vat-payable", "2026-01-10", "0.0000", "15.0000"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report.totals.closingDebit).toBe("115.0000");
    expect(report.totals.closingCredit).toBe("115.0000");
    expect(report.totals.balanced).toBe(true);
  });

  it("reflects finalized inventory-clearing purchase bills through posted journal lines", () => {
    const report = buildTrialBalanceReport(
      accounts,
      [],
      [
        line("inventory-clearing", "2026-05-14", "100.0000", "0.0000", "Purchase bill inventory clearing debit"),
        line("vat-receivable", "2026-05-14", "15.0000", "0.0000", "Purchase bill VAT receivable"),
        line("ap", "2026-05-14", "0.0000", "115.0000", "Purchase bill AP"),
      ],
      { from: "2026-05-01", to: "2026-05-31" },
    );

    const clearing = report.accounts.find((account) => account.accountId === "inventory-clearing");
    expect(clearing).toMatchObject({ periodDebit: "100.0000", closingDebit: "100.0000" });
    expect(report.totals.closingDebit).toBe("115.0000");
    expect(report.totals.closingCredit).toBe("115.0000");
    expect(report.totals.balanced).toBe(true);
  });

  it("handles P&L signs for revenue, COGS, and expenses", () => {
    const report = buildProfitAndLossReport(
      accounts,
      [
        line("revenue", "2026-01-10", "0.0000", "200.0000"),
        line("cogs", "2026-01-10", "40.0000", "0.0000"),
        line("expense", "2026-01-10", "25.0000", "0.0000"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report).toMatchObject({
      revenue: "200.0000",
      costOfSales: "40.0000",
      grossProfit: "160.0000",
      expenses: "25.0000",
      netProfit: "135.0000",
    });
  });

  it("reflects manually posted sales stock issue COGS through journal lines only after posting", () => {
    const beforePosting = buildProfitAndLossReport(
      accounts,
      [line("revenue", "2026-05-14", "0.0000", "100.0000", "Sales invoice revenue")],
      { from: "2026-05-01", to: "2026-05-31" },
    );
    const afterPosting = buildProfitAndLossReport(
      accounts,
      [
        line("revenue", "2026-05-14", "0.0000", "100.0000", "Sales invoice revenue"),
        line("cogs", "2026-05-14", "32.5000", "0.0000", "COGS for sales stock issue SSI-000001"),
      ],
      { from: "2026-05-01", to: "2026-05-31" },
    );

    expect(beforePosting.costOfSales).toBe("0.0000");
    expect(afterPosting.costOfSales).toBe("32.5000");
    expect(afterPosting.netProfit).toBe("67.5000");
  });

  it("reflects manually posted purchase receipt inventory asset journals through balance sheet accounts", () => {
    const report = buildBalanceSheetReport(
      accounts,
      [
        line("inventory-asset", "2026-05-14", "100.0000", "0.0000", "Inventory asset posting for purchase receipt PRC-000001"),
        line("inventory-clearing", "2026-05-14", "0.0000", "100.0000", "Inventory clearing for purchase receipt PRC-000001"),
      ],
      { asOf: "2026-05-31" },
    );

    expect(report.assets.accounts.find((account) => account.accountId === "inventory-asset")).toMatchObject({ amount: "100.0000" });
    expect(report.liabilities.accounts.find((account) => account.accountId === "inventory-clearing")).toMatchObject({ amount: "100.0000" });
    expect(report.balanced).toBe(true);
  });

  it("includes retained earnings in a balanced balance sheet", () => {
    const report = buildBalanceSheetReport(
      accounts,
      [
        line("cash", "2026-01-01", "100.0000", "0.0000"),
        line("equity", "2026-01-01", "0.0000", "100.0000"),
        line("cash", "2026-01-10", "115.0000", "0.0000"),
        line("revenue", "2026-01-10", "0.0000", "100.0000"),
        line("vat-payable", "2026-01-10", "0.0000", "15.0000"),
      ],
      { asOf: "2026-01-31" },
    );

    expect(report.retainedEarnings).toBe("100.0000");
    expect(report.totalAssets).toBe("215.0000");
    expect(report.totalLiabilitiesAndEquity).toBe("215.0000");
    expect(report.balanced).toBe(true);
  });

  it("summarizes VAT from VAT accounts", () => {
    const report = buildVatSummaryReport(
      accounts,
      [
        line("vat-payable", "2026-01-10", "0.0000", "15.0000"),
        line("vat-receivable", "2026-01-11", "5.0000", "0.0000"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report.salesVat).toBe("15.0000");
    expect(report.purchaseVat).toBe("5.0000");
    expect(report.netVatPayable).toBe("10.0000");
    expect(report.notes[0]).toContain("not an official VAT return");
  });

  it("builds VAT return totals from finalized invoice and bill source documents", () => {
    const report = buildVatReturnReport(
      [
        vatDocument("invoice-1", "INV-1", "2026-01-10", "100.0000", "15.0000", "115.0000"),
        vatDocument("invoice-2", "INV-2", "2026-01-11", "50.0000", "7.5000", "57.5000"),
      ],
      [vatDocument("bill-1", "BILL-1", "2026-01-12", "40.0000", "6.0000", "46.0000")],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report).toMatchObject({
      outputVat: "22.5000",
      inputVat: "6.0000",
      netVat: "16.5000",
      netVatPayable: "16.5000",
      netVatRefundable: "0.0000",
      sales: { documentCount: 2, taxableAmount: "150.0000", taxAmount: "22.5000", grossAmount: "172.5000" },
      purchases: { documentCount: 1, taxableAmount: "40.0000", taxAmount: "6.0000", grossAmount: "46.0000" },
    });
  });

  it("reports refundable VAT when input VAT exceeds output VAT", () => {
    const report = buildVatReturnReport(
      [vatDocument("invoice-1", "INV-1", "2026-01-10", "100.0000", "15.0000", "115.0000")],
      [vatDocument("bill-1", "BILL-1", "2026-01-12", "200.0000", "30.0000", "230.0000")],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report.netVat).toBe("-15.0000");
    expect(report.netVatPayable).toBe("0.0000");
    expect(report.netVatRefundable).toBe("15.0000");
  });

  it("calculates VAT return from active-organization finalized documents inside the date range", async () => {
    const salesInvoices = [
      salesInvoiceFixture({ id: "invoice-finalized", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "15.0000" }),
      salesInvoiceFixture({ id: "invoice-draft", status: SalesInvoiceStatus.DRAFT, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "99.0000" }),
      salesInvoiceFixture({ id: "invoice-voided", status: SalesInvoiceStatus.VOIDED, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "88.0000" }),
      salesInvoiceFixture({ id: "invoice-other-org", organizationId: "org-2", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "77.0000" }),
      salesInvoiceFixture({ id: "invoice-outside-range", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-02-01T00:00:00.000Z"), taxTotal: "66.0000" }),
    ];
    const purchaseBills = [
      purchaseBillFixture({ id: "bill-finalized", status: PurchaseBillStatus.FINALIZED, billDate: new Date("2026-01-15T00:00:00.000Z"), taxTotal: "5.0000" }),
      purchaseBillFixture({ id: "bill-voided", status: PurchaseBillStatus.VOIDED, billDate: new Date("2026-01-15T00:00:00.000Z"), taxTotal: "44.0000" }),
      purchaseBillFixture({ id: "bill-other-org", organizationId: "org-2", status: PurchaseBillStatus.FINALIZED, billDate: new Date("2026-01-15T00:00:00.000Z"), taxTotal: "33.0000" }),
    ];
    const prisma = {
      salesInvoice: { findMany: jest.fn(async (args: any) => salesInvoices.filter((invoice) => matchesVatWhere(invoice, args.where, "issueDate"))) },
      purchaseBill: { findMany: jest.fn(async (args: any) => purchaseBills.filter((bill) => matchesVatWhere(bill, args.where, "billDate"))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.vatReturn("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(report).toMatchObject({
      outputVat: "15.0000",
      inputVat: "5.0000",
      netVatPayable: "10.0000",
      sales: { documentCount: 1 },
      purchases: { documentCount: 1 },
    });
    expect(report.sales.documents.map((document) => document.id)).toEqual(["invoice-finalized"]);
    expect(report.purchases.documents.map((document) => document.id)).toEqual(["bill-finalized"]);
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: SalesInvoiceStatus.FINALIZED,
          issueDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
        }),
      }),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: PurchaseBillStatus.FINALIZED,
          billDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
        }),
      }),
    );
  });

  it("filters VAT return source documents by active organization and optional branch", async () => {
    const salesInvoices = [
      salesInvoiceFixture({ id: "invoice-branch-1", branchId: "branch-1", taxTotal: "15.0000" }),
      salesInvoiceFixture({ id: "invoice-branch-2", branchId: "branch-2", taxTotal: "99.0000" }),
      salesInvoiceFixture({ id: "invoice-other-org", organizationId: "org-2", branchId: "branch-1", taxTotal: "88.0000" }),
    ];
    const purchaseBills = [
      purchaseBillFixture({ id: "bill-branch-1", branchId: "branch-1", taxTotal: "5.0000" }),
      purchaseBillFixture({ id: "bill-branch-2", branchId: "branch-2", taxTotal: "44.0000" }),
    ];
    const prisma = {
      salesInvoice: { findMany: jest.fn(async (args: any) => salesInvoices.filter((invoice) => matchesVatWhere(invoice, args.where, "issueDate"))) },
      purchaseBill: { findMany: jest.fn(async (args: any) => purchaseBills.filter((bill) => matchesVatWhere(bill, args.where, "billDate"))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.vatReturn("org-1", { branchId: " branch-1 " });

    expect(report.sales.documents.map((document) => document.id)).toEqual(["invoice-branch-1"]);
    expect(report.purchases.documents.map((document) => document.id)).toEqual(["bill-branch-1"]);
    expect(report).toMatchObject({ outputVat: "15.0000", inputVat: "5.0000", netVatPayable: "10.0000" });
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
  });

  it("calculates a financial dashboard summary from open documents and reportable journal activity", async () => {
    const salesInvoices = [
      salesInvoiceFixture({
        id: "invoice-overdue",
        invoiceNumber: "INV-OVERDUE",
        issueDate: new Date("2026-01-10T00:00:00.000Z"),
        dueDate: new Date("2026-01-15T00:00:00.000Z"),
        total: "115.0000",
        balanceDue: "100.0000",
      }),
      salesInvoiceFixture({
        id: "invoice-open",
        invoiceNumber: "INV-OPEN",
        issueDate: new Date("2026-01-20T00:00:00.000Z"),
        dueDate: new Date("2026-02-10T00:00:00.000Z"),
        total: "57.5000",
        balanceDue: "50.0000",
      }),
      salesInvoiceFixture({ id: "invoice-voided", status: SalesInvoiceStatus.VOIDED, balanceDue: "999.0000" }),
    ];
    const purchaseBills = [
      purchaseBillFixture({
        id: "bill-open",
        billNumber: "BILL-OPEN",
        billDate: new Date("2026-01-12T00:00:00.000Z"),
        total: "80.5000",
        balanceDue: "70.0000",
      }),
      purchaseBillFixture({ id: "bill-draft", status: PurchaseBillStatus.DRAFT, balanceDue: "999.0000" }),
    ];
    const journalLines = [
      dashboardLine("cash", "111", AccountType.ASSET, "2026-01-05", JournalEntryStatus.POSTED, "200.0000", "0.0000"),
      dashboardLine("bank", "112", AccountType.ASSET, "2026-01-06", JournalEntryStatus.REVERSED, "0.0000", "40.0000"),
      dashboardLine("bank", "112", AccountType.ASSET, "2026-01-07", JournalEntryStatus.POSTED, "40.0000", "0.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-08", JournalEntryStatus.POSTED, "0.0000", "120.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-09", JournalEntryStatus.REVERSED, "0.0000", "50.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-10", JournalEntryStatus.POSTED, "50.0000", "0.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-11", JournalEntryStatus.VOIDED, "0.0000", "999.0000"),
      dashboardLine("vat-payable", "220", AccountType.LIABILITY, "2026-01-12", JournalEntryStatus.POSTED, "0.0000", "18.0000"),
      dashboardLine("vat-receivable", "230", AccountType.ASSET, "2026-01-13", JournalEntryStatus.POSTED, "3.0000", "0.0000"),
    ];
    const prisma = {
      salesInvoice: { findMany: jest.fn(async (args: any) => salesInvoices.filter((invoice) => matchesDashboardDocumentWhere(invoice, args.where, "issueDate"))) },
      purchaseBill: { findMany: jest.fn(async (args: any) => purchaseBills.filter((bill) => matchesDashboardDocumentWhere(bill, args.where, "billDate"))) },
      bankAccountProfile: {
        findMany: jest.fn().mockResolvedValue([
          { accountId: "cash", displayName: "Cash", account: { id: "cash", code: "111", name: "Cash", type: AccountType.ASSET } },
          { accountId: "bank", displayName: "Bank", account: { id: "bank", code: "112", name: "Bank", type: AccountType.ASSET } },
        ]),
      },
      journalLine: { findMany: jest.fn(async (args: any) => journalLines.filter((line) => matchesDashboardLineWhere(line, args.where))) },
    };
    const service = new ReportsService(prisma as never);

    const summary = await service.dashboardSummary("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(summary).toMatchObject({
      asOf: "2026-01-31",
      period: { from: "2026-01-01", to: "2026-01-31" },
      receivables: {
        total: "150.0000",
        overdue: "100.0000",
        documentCount: 2,
        overdueDocumentCount: 1,
      },
      payables: {
        total: "70.0000",
        documentCount: 1,
      },
      cashAndBank: {
        balance: "200.0000",
        accountCount: 2,
      },
      revenue: {
        currentPeriod: "120.0000",
      },
      vat: {
        outputVat: "18.0000",
        inputVat: "3.0000",
        netVatPayable: "15.0000",
        netVatRefundable: "0.0000",
      },
    });
    expect(summary.receivables.documents.map((document) => document.id)).toEqual(["invoice-overdue", "invoice-open"]);
    expect(summary.payables.documents.map((document) => document.id)).toEqual(["bill-open"]);
    expect(prisma.bankAccountProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", status: BankAccountStatus.ACTIVE }),
      }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: { in: ["cash", "bank"] },
          journalEntry: expect.objectContaining({ status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] } }),
        }),
      }),
    );
  });

  it("passes optional branch filters into dashboard source document and journal reads", async () => {
    const prisma = {
      salesInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([]) },
      bankAccountProfile: { findMany: jest.fn().mockResolvedValue([]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ReportsService(prisma as never);

    await service.dashboardSummary("org-1", { branchId: " branch-1 ", to: "2026-01-31" });

    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          journalEntry: expect.objectContaining({
            OR: expect.arrayContaining([
              { salesInvoice: { is: { organizationId: "org-1", branchId: "branch-1" } } },
              { purchaseBill: { is: { organizationId: "org-1", branchId: "branch-1" } } },
            ]),
          }),
        }),
      }),
    );
  });

  it("buckets aged receivables and payables", () => {
    expect(agingBucket(-1)).toBe("CURRENT");
    expect(agingBucket(30)).toBe("1_30");
    expect(agingBucket(61)).toBe("61_90");
    expect(agingBucket(100)).toBe("90_PLUS");

    const report = buildAgingReport(
      [
        {
          id: "invoice-1",
          number: "INV-1",
          contact: { id: "customer", name: "Customer" },
          issueDate: "2026-01-01T00:00:00.000Z",
          dueDate: "2026-01-31T00:00:00.000Z",
          total: "115.0000",
          balanceDue: "50.0000",
        },
      ],
      { asOf: "2026-03-05", kind: "receivables" },
    );

    expect(report.rows[0]).toMatchObject({ bucket: "31_60", daysOverdue: 33 });
    expect(report.bucketTotals["31_60"]).toBe("50.0000");
    expect(report.grandTotal).toBe("50.0000");
  });

  it("scopes report database reads to the active tenant", async () => {
    const prisma = {
      account: { findMany: jest.fn().mockResolvedValue([]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ReportsService(prisma as never);

    await service.generalLedger("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(prisma.account.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    );
  });

  it("archives generated report PDFs", async () => {
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "LedgerByte Demo",
          legalName: null,
          taxNumber: null,
          countryCode: "SA",
          baseCurrency: "SAR",
        }),
      },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const documentSettings = { statementRenderSettings: jest.fn().mockResolvedValue({}) };
    const generatedDocuments = { archivePdf: jest.fn().mockResolvedValue({ id: "doc-1" }) };
    const service = new ReportsService(prisma as never, documentSettings as never, generatedDocuments as never);

    const result = await service.coreReportPdf("org-1", "user-1", "trial-balance", {});

    expect(result.filename).toMatch(/^trial-balance-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(generatedDocuments.archivePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        documentType: DocumentType.REPORT_TRIAL_BALANCE,
        sourceType: "AccountingReport",
        generatedById: "user-1",
      }),
    );
  });
});

function line(accountId: string, date: string, debit: string, credit: string, description = "Line") {
  return {
    accountId,
    debit,
    credit,
    description,
    lineNumber: 1,
    journalEntry: {
      id: `journal-${accountId}-${date}`,
      entryNumber: `JE-${date}`,
      entryDate: `${date}T00:00:00.000Z`,
      description,
      reference: null,
    },
  };
}

function vatDocument(id: string, number: string, date: string, taxableTotal: string, taxTotal: string, total: string) {
  return {
    id,
    number,
    documentDate: `${date}T00:00:00.000Z`,
    taxableTotal,
    taxTotal,
    total,
  };
}

interface SalesInvoiceFixture {
  id: string;
  organizationId: string;
  branchId: string | null;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  status: SalesInvoiceStatus;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  balanceDue: string;
}

function salesInvoiceFixture(overrides: Partial<SalesInvoiceFixture>): SalesInvoiceFixture {
  return { ...salesInvoiceFixtureBase(), ...overrides };
}

function salesInvoiceFixtureBase(): SalesInvoiceFixture {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    branchId: "branch-1",
    invoiceNumber: "INV-1",
    issueDate: new Date("2026-01-10T00:00:00.000Z"),
    dueDate: null,
    status: SalesInvoiceStatus.FINALIZED,
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
  };
}

interface PurchaseBillFixture {
  id: string;
  organizationId: string;
  branchId: string | null;
  billNumber: string;
  billDate: Date;
  dueDate: Date | null;
  status: PurchaseBillStatus;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  balanceDue: string;
}

function purchaseBillFixture(overrides: Partial<PurchaseBillFixture>): PurchaseBillFixture {
  return { ...purchaseBillFixtureBase(), ...overrides };
}

function purchaseBillFixtureBase(): PurchaseBillFixture {
  return {
    id: "bill-1",
    organizationId: "org-1",
    branchId: "branch-1",
    billNumber: "BILL-1",
    billDate: new Date("2026-01-15T00:00:00.000Z"),
    dueDate: null,
    status: PurchaseBillStatus.FINALIZED,
    taxableTotal: "50.0000",
    taxTotal: "5.0000",
    total: "55.0000",
    balanceDue: "55.0000",
  };
}

interface DashboardLineFixture {
  organizationId: string;
  accountId: string;
  debit: string;
  credit: string;
  account: { id: string; code: string; name: string; type: AccountType };
  journalEntry: { status: JournalEntryStatus; entryDate: Date };
}

function dashboardLine(
  accountId: string,
  code: string,
  type: AccountType,
  date: string,
  status: JournalEntryStatus,
  debit: string,
  credit: string,
): DashboardLineFixture {
  return {
    organizationId: "org-1",
    accountId,
    debit,
    credit,
    account: { id: accountId, code, name: accountId, type },
    journalEntry: { status, entryDate: new Date(`${date}T00:00:00.000Z`) },
  };
}

function matchesDashboardDocumentWhere<T extends { organizationId: string; branchId: string | null; status: string; balanceDue: string }>(
  document: T,
  where: {
    organizationId: string;
    branchId?: string;
    status: string;
    balanceDue?: { gt?: string | number };
    issueDate?: { lte?: Date };
    billDate?: { lte?: Date };
  },
  dateKey: keyof T,
) {
  const documentDate = new Date(String(document[dateKey]));
  const dateRange = "issueDate" in where ? where.issueDate : where.billDate;
  return (
    document.organizationId === where.organizationId &&
    (!where.branchId || document.branchId === where.branchId) &&
    document.status === where.status &&
    (!where.balanceDue?.gt || Number(document.balanceDue) > Number(where.balanceDue.gt)) &&
    (!dateRange?.lte || documentDate <= dateRange.lte)
  );
}

function matchesDashboardLineWhere(
  line: DashboardLineFixture,
  where: {
    organizationId: string;
    accountId?: { in?: string[] };
    account?: { is?: { type?: AccountType; code?: { in?: string[] } } };
    journalEntry?: { status?: { in?: JournalEntryStatus[] }; entryDate?: { gte?: Date; lte?: Date } };
  },
) {
  const entryDate = line.journalEntry.entryDate;
  return (
    line.organizationId === where.organizationId &&
    (!where.accountId?.in || where.accountId.in.includes(line.accountId)) &&
    (!where.account?.is?.type || line.account.type === where.account.is.type) &&
    (!where.account?.is?.code?.in || where.account.is.code.in.includes(line.account.code)) &&
    (!where.journalEntry?.status?.in || where.journalEntry.status.in.includes(line.journalEntry.status)) &&
    (!where.journalEntry?.entryDate?.gte || entryDate >= where.journalEntry.entryDate.gte) &&
    (!where.journalEntry?.entryDate?.lte || entryDate <= where.journalEntry.entryDate.lte)
  );
}

function matchesVatWhere<T extends { organizationId: string; branchId: string | null; status: string }>(
  document: T,
  where: {
    organizationId: string;
    branchId?: string;
    status: string;
    issueDate?: { gte?: Date; lte?: Date };
    billDate?: { gte?: Date; lte?: Date };
  },
  dateKey: keyof T,
) {
  const documentDate = new Date(String(document[dateKey]));
  const dateRange = "issueDate" in where ? where.issueDate : where.billDate;
  return (
    document.organizationId === where.organizationId &&
    (!where.branchId || document.branchId === where.branchId) &&
    document.status === where.status &&
    (!dateRange?.gte || documentDate >= dateRange.gte) &&
    (!dateRange?.lte || documentDate <= dateRange.lte)
  );
}
