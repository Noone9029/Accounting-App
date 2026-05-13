import { renderBankReconciliationReportPdf, renderTrialBalanceReportPdf } from "@ledgerbyte/pdf-core";

const organization = {
  name: "LedgerByte Demo",
  legalName: null,
  taxNumber: null,
  countryCode: "SA",
};

describe("report PDF renderers", () => {
  it("renders core accounting report PDFs", async () => {
    const buffer = await renderTrialBalanceReportPdf(
      {
        organization,
        currency: "SAR",
        from: "2026-05-01",
        to: "2026-05-31",
        accounts: [
          {
            accountId: "bank",
            code: "111",
            name: "Operating Bank",
            type: "ASSET",
            openingDebit: "0.0000",
            openingCredit: "0.0000",
            periodDebit: "100.0000",
            periodCredit: "0.0000",
            closingDebit: "100.0000",
            closingCredit: "0.0000",
          },
        ],
        totals: {
          openingDebit: "0.0000",
          openingCredit: "0.0000",
          periodDebit: "100.0000",
          periodCredit: "100.0000",
          closingDebit: "100.0000",
          closingCredit: "100.0000",
          balanced: true,
        },
        generatedAt: "2026-05-13T10:00:00.000Z",
      },
      { title: "Trial Balance" },
    );

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(500);
  });

  it("renders bank reconciliation report PDFs", async () => {
    const buffer = await renderBankReconciliationReportPdf(
      {
        organization,
        currency: "SAR",
        reconciliation: {
          id: "rec-1",
          reconciliationNumber: "REC-000001",
          status: "CLOSED",
          periodStart: "2026-05-01",
          periodEnd: "2026-05-31",
          statementOpeningBalance: "0.0000",
          statementClosingBalance: "100.0000",
          ledgerClosingBalance: "100.0000",
          difference: "0.0000",
          closedAt: "2026-05-13T10:00:00.000Z",
          closedBy: { name: "Owner" },
        },
        bankAccount: { displayName: "Operating Bank", account: { code: "111", name: "Bank" } },
        items: [
          {
            transactionDate: "2026-05-02",
            description: "Deposit",
            reference: "REF-1",
            type: "CREDIT",
            amount: "100.0000",
            statusAtClose: "MATCHED",
          },
        ],
        summary: {
          itemCount: 1,
          debitTotal: "0.0000",
          creditTotal: "100.0000",
          matchedCount: 1,
          categorizedCount: 0,
          ignoredCount: 0,
        },
        generatedAt: "2026-05-13T10:00:00.000Z",
      },
      { title: "Bank Reconciliation Report" },
    );

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(500);
  });
});
