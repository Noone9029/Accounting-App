import { calculateTotals, formatUnits, parseDecimalToUnits } from "./money";

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
});
