import path from "node:path";
import { renderCustomerStatementPdf } from "@ledgerbyte/pdf-core";

describe("FX PDF layout", () => {
  it("starts post-table FX evidence headings and notes at the page margin", async () => {
    const PdfDocument = require(require.resolve("pdfkit", { paths: [path.resolve(__dirname, "../../../packages/pdf-core")] }));
    const originalText = PdfDocument.prototype.text;
    const positions = new Map<string, number>();
    const spy = jest.spyOn(PdfDocument.prototype, "text").mockImplementation(function (this: { x: number }, ...callArgs: unknown[]) {
      const value = String(callArgs[0] ?? "");
      if (value === "Foreign-currency document evidence" || value.startsWith("Statement debits, credits")) {
        positions.set(value, this.x);
      }
      return originalText.apply(this, callArgs);
    });

    try {
      await renderCustomerStatementPdf({
        organization: { name: "LedgerByte" },
        currency: "AED",
        contact: { name: "FX Customer" },
        periodFrom: "2026-07-01",
        periodTo: "2026-07-31",
        openingBalance: "0.0000",
        closingBalance: "367.2500",
        generatedAt: new Date("2026-07-31T12:00:00.000Z"),
        rows: [{
          date: "2026-07-10",
          type: "INVOICE",
          number: "INV-FX-001",
          description: "Foreign invoice",
          debit: "367.2500",
          credit: "0.0000",
          balance: "367.2500",
          status: "FINALIZED",
          fxEvidence: {
            transactionCurrency: "USD",
            baseCurrency: "AED",
            transactionBalanceDue: "100.0000",
            sourceBaseBalanceDue: "367.2500",
            carryingBaseAmount: "375.0000",
            carryingRate: "3.75000000",
            rateSnapshotId: "rate-close-1",
            lastRevaluationLineId: "line-close-1",
          },
        }],
      });
    } finally {
      spy.mockRestore();
    }

    expect(positions.get("Foreign-currency document evidence")).toBe(48);
    expect([...positions.entries()].find(([label]) => label.startsWith("Statement debits, credits"))?.[1]).toBe(48);
  });
});
