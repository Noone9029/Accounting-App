import { AccountType, DocumentType } from "@prisma/client";
import {
  agingBucket,
  buildAgingReport,
  buildBalanceSheetReport,
  buildGeneralLedgerReport,
  buildProfitAndLossReport,
  buildTrialBalanceReport,
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
