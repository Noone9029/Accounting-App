import {
  renderBalanceSheetReportPdf,
  renderBankReconciliationReportPdf,
  renderGeneralLedgerReportPdf,
  renderProfitAndLossReportPdf,
  renderTrialBalanceReportPdf,
  renderVatSummaryReportPdf,
} from "@ledgerbyte/pdf-core";
import PDFDocument from "pdfkit";

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

  it.each([
    [
      "general ledger",
      renderGeneralLedgerReportPdf,
      {
        organization,
        currency: "SAR",
        from: "2026-05-01",
        to: "2026-05-31",
        accounts: [],
        generatedAt: "2026-05-13T10:00:00.000Z",
      },
    ],
    [
      "trial balance",
      renderTrialBalanceReportPdf,
      {
        organization,
        currency: "SAR",
        from: "2026-05-01",
        to: "2026-05-31",
        accounts: [],
        totals: emptyAccountTotals({ balanced: true }),
        generatedAt: "2026-05-13T10:00:00.000Z",
      },
    ],
    [
      "profit and loss",
      renderProfitAndLossReportPdf,
      {
        organization,
        currency: "SAR",
        from: "2026-05-01",
        to: "2026-05-31",
        revenue: "0.0000",
        costOfSales: "0.0000",
        grossProfit: "0.0000",
        expenses: "0.0000",
        netProfit: "0.0000",
        sections: [],
        generatedAt: "2026-05-13T10:00:00.000Z",
      },
    ],
    [
      "balance sheet",
      renderBalanceSheetReportPdf,
      {
        organization,
        currency: "SAR",
        asOf: "2026-05-31",
        assets: { total: "0.0000", accounts: [] },
        liabilities: { total: "0.0000", accounts: [] },
        equity: { total: "0.0000", accounts: [] },
        retainedEarnings: "0.0000",
        totalAssets: "0.0000",
        totalLiabilitiesAndEquity: "0.0000",
        difference: "0.0000",
        balanced: true,
        generatedAt: "2026-05-13T10:00:00.000Z",
      },
    ],
    [
      "VAT summary",
      renderVatSummaryReportPdf,
      {
        organization,
        currency: "SAR",
        from: "2026-05-01",
        to: "2026-05-31",
        salesVat: "0.0000",
        purchaseVat: "0.0000",
        netVatPayable: "0.0000",
        sections: [],
        notes: [],
        generatedAt: "2026-05-13T10:00:00.000Z",
      },
    ],
  ])("prints readable dimension labels in the %s PDF", async (_name, render, baseData) => {
    const textSpy = jest.spyOn(PDFDocument.prototype, "text");

    try {
      await render({
        ...baseData,
        filters: {
          costCenter: { id: "cost-center-1", code: "CC-OPS", name: "Operations", status: "ACTIVE" },
          project: { id: "project-1", code: "PRJ-ALPHA", name: "Alpha", status: "ARCHIVED" },
        },
      } as never);

      const renderedText = textSpy.mock.calls.map(([value]) => String(value)).join("\n");
      expect(renderedText).toContain("Cost Center: CC-OPS - Operations");
      expect(renderedText).toContain("Project: PRJ-ALPHA - Alpha");
    } finally {
      textSpy.mockRestore();
    }
  });

  it("spaces wrapped dimension labels and expands the report metadata block", async () => {
    const textSpy = jest.spyOn(PDFDocument.prototype, "text");
    const roundedRectSpy = jest.spyOn(PDFDocument.prototype, "roundedRect");

    try {
      await renderGeneralLedgerReportPdf({
        organization,
        currency: "SAR",
        from: "2026-01-01",
        to: "2026-12-31",
        filters: {
          costCenter: {
            id: "cost-center-long",
            code: "UTCC-LONG",
            name: "User Testing Cost Center With A Long Wrapped Display Name",
            status: "ARCHIVED",
          },
          project: {
            id: "project-long",
            code: "UTPR-LONG",
            name: "User Testing Project With A Long Wrapped Display Name",
            status: "ARCHIVED",
          },
        },
        accounts: [],
        generatedAt: "2026-07-10T12:00:00.000Z",
      });

      const costCenterCall = textSpy.mock.calls.find(([value]) => String(value).startsWith("Cost Center:"));
      const projectCall = textSpy.mock.calls.find(([value]) => String(value).startsWith("Project:"));
      expect(costCenterCall).toBeDefined();
      expect(projectCall).toBeDefined();
      expect(Number(projectCall?.[2]) - Number(costCenterCall?.[2])).toBeGreaterThanOrEqual(20);

      const leftBlock = roundedRectSpy.mock.calls[0];
      expect(Number(leftBlock?.[3])).toBeGreaterThan(104);
    } finally {
      textSpy.mockRestore();
      roundedRectSpy.mockRestore();
    }
  });

  it("does not create a blank footer-only page for an empty report", async () => {
    const buffer = await renderGeneralLedgerReportPdf({
      organization,
      currency: "SAR",
      from: "2026-01-01",
      to: "2026-12-31",
      accounts: [],
      generatedAt: "2026-07-10T12:00:00.000Z",
    });

    const pageObjects = buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? [];
    expect(pageObjects).toHaveLength(1);
  });
});

function emptyAccountTotals(extra: { balanced: boolean }) {
  return {
    openingDebit: "0.0000",
    openingCredit: "0.0000",
    periodDebit: "0.0000",
    periodCredit: "0.0000",
    closingDebit: "0.0000",
    closingCredit: "0.0000",
    ...extra,
  };
}
