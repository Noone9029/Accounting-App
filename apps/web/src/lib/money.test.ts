import { calculateInvoicePreview, calculateTotals, formatUnits, parseDecimalToUnits } from "./money";
import { formatOptionalDate } from "./invoice-display";

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
});
