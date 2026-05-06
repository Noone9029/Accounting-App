import { calculateInvoicePreview, calculatePaymentAllocationPreview, calculateTotals, formatUnits, parseDecimalToUnits } from "./money";
import { deriveInvoicePaymentState, formatOptionalDate } from "./invoice-display";
import { defaultStatementFromDate, defaultStatementToDate, formatLedgerBalance } from "./ledger-display";

describe("money utilities", () => {
  it("parses decimal strings into four-decimal minor units", () => {
    expect(parseDecimalToUnits("12.34567")).toBe(123456);
    expect(parseDecimalToUnits("0.1")).toBe(1000);
    expect(parseDecimalToUnits("")).toBe(0);
  });

  it("formats four-decimal minor units", () => {
    expect(formatUnits(123456)).toBe("12.3456");
    expect(formatUnits(-1000)).toBe("-0.1000");
  });

  it("detects balanced journal totals without floating point math", () => {
    expect(
      calculateTotals([
        { debit: "0.10", credit: "0" },
        { debit: "0.20", credit: "0" },
        { debit: "0", credit: "0.30" },
      ]),
    ).toMatchObject({ debit: "0.3000", credit: "0.3000", balanced: true });
  });

  it("previews invoice totals with discount before tax", () => {
    expect(
      calculateInvoicePreview([{ quantity: "1.0000", unitPrice: "200.0000", discountRate: "10.0000", taxRate: "15.0000" }]),
    ).toMatchObject({
      subtotal: "200.0000",
      discountTotal: "20.0000",
      taxableTotal: "180.0000",
      taxTotal: "27.0000",
      total: "207.0000",
      valid: true,
    });
  });

  it("allows zero-price draft invoice preview lines", () => {
    expect(calculateInvoicePreview([{ quantity: "1.0000", unitPrice: "0.0000" }])).toMatchObject({
      subtotal: "0.0000",
      taxableTotal: "0.0000",
      total: "0.0000",
      valid: true,
    });
  });

  it("formats optional due dates", () => {
    expect(formatOptionalDate(null)).toBe("No due date");
    expect(formatOptionalDate("not-a-date")).toBe("No due date");
  });

  it("previews payment allocations and unapplied amounts", () => {
    expect(
      calculatePaymentAllocationPreview("100.0000", [
        { amountApplied: "60.0000", balanceDue: "80.0000" },
        { amountApplied: "25.0000", balanceDue: "25.0000" },
      ]),
    ).toMatchObject({
      amountReceived: "100.0000",
      totalAllocated: "85.0000",
      unappliedAmount: "15.0000",
      valid: true,
    });
  });

  it("rejects payment allocations above amount received or invoice balance", () => {
    expect(calculatePaymentAllocationPreview("50.0000", [{ amountApplied: "60.0000", balanceDue: "100.0000" }])).toMatchObject({ valid: false });
    expect(calculatePaymentAllocationPreview("50.0000", [{ amountApplied: "40.0000", balanceDue: "30.0000" }])).toMatchObject({ valid: false });
  });

  it("derives invoice payment states from balance due", () => {
    expect(deriveInvoicePaymentState("100.0000", "100.0000")).toBe("Unpaid");
    expect(deriveInvoicePaymentState("100.0000", "40.0000")).toBe("Partially paid");
    expect(deriveInvoicePaymentState("100.0000", "0.0000")).toBe("Paid");
  });

  it("formats ledger balances with debit and credit markers", () => {
    expect(formatLedgerBalance("100.0000")).toBe("SAR 100.00 Dr");
    expect(formatLedgerBalance("-25.0000")).toBe("SAR 25.00 Cr");
    expect(formatLedgerBalance("0.0000")).toBe("SAR 0.00");
  });

  it("builds default statement date inputs", () => {
    const now = new Date("2026-05-06T12:00:00.000Z");
    expect(defaultStatementFromDate(now)).toBe("2026-01-01");
    expect(defaultStatementToDate(now)).toBe("2026-05-06");
  });
});
