import {
  formatInventoryQuantity,
  inventoryBalanceDisplay,
  stockMovementDirection,
  stockMovementTypeLabel,
  warehouseStatusBadgeClass,
  warehouseStatusLabel,
} from "./inventory";

describe("inventory helpers", () => {
  it("labels warehouse statuses", () => {
    expect(warehouseStatusLabel("ACTIVE")).toBe("Active");
    expect(warehouseStatusLabel("ARCHIVED")).toBe("Archived");
    expect(warehouseStatusBadgeClass("ACTIVE")).toContain("emerald");
    expect(warehouseStatusBadgeClass("ARCHIVED")).toContain("slate");
  });

  it("identifies stock movement direction", () => {
    expect(stockMovementDirection("OPENING_BALANCE")).toBe("IN");
    expect(stockMovementDirection("ADJUSTMENT_IN")).toBe("IN");
    expect(stockMovementDirection("ADJUSTMENT_OUT")).toBe("OUT");
    expect(stockMovementTypeLabel("ADJUSTMENT_OUT")).toBe("Adjustment Out");
  });

  it("formats quantities with four decimals", () => {
    expect(formatInventoryQuantity("12.5")).toBe("12.5000");
    expect(formatInventoryQuantity(null)).toBe("0.0000");
  });

  it("displays inventory balances and pending valuation", () => {
    expect(inventoryBalanceDisplay({ quantityOnHand: "9.0000", averageUnitCost: null, inventoryValue: null })).toEqual({
      quantity: "9.0000",
      averageUnitCost: "Valuation pending",
      inventoryValue: "Valuation pending",
    });
  });
});
