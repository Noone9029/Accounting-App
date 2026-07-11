import { exactFxMoney, formatFxMoney, sumFxMoney } from "./fx-revaluation-display";

describe("FX revaluation evidence display", () => {
  it("formats Decimal(20,4) evidence without JavaScript Number precision loss", () => {
    expect(exactFxMoney("9999999999999999.9999")).toBe("9999999999999999.9999");
    expect(formatFxMoney("SAR", "0007.75")).toBe("SAR 7.7500");
  });

  it("sums large positive and negative evidence exactly", () => {
    expect(sumFxMoney(["9999999999999999.9999", "0.0001", "-1.2500"])).toBe("9999999999999998.7500");
  });
});
