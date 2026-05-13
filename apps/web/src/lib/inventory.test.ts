import {
  formatInventoryQuantity,
  inventoryBalanceDisplay,
  inventoryAdjustmentStatusBadgeClass,
  inventoryAdjustmentStatusLabel,
  inventoryAdjustmentTypeLabel,
  canApproveInventoryAdjustment,
  canEditInventoryAdjustment,
  canVoidInventoryAdjustment,
  stockMovementDirection,
  stockMovementTypeLabel,
  validateWarehouseTransferInput,
  warehouseStatusBadgeClass,
  warehouseStatusLabel,
  warehouseTransferStatusBadgeClass,
  warehouseTransferStatusLabel,
  canVoidWarehouseTransfer,
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
    expect(stockMovementDirection("TRANSFER_IN")).toBe("IN");
    expect(stockMovementDirection("TRANSFER_OUT")).toBe("OUT");
    expect(stockMovementTypeLabel("ADJUSTMENT_OUT")).toBe("Adjustment Out");
  });

  it("formats adjustment and transfer statuses", () => {
    expect(inventoryAdjustmentStatusLabel("DRAFT")).toBe("Draft");
    expect(inventoryAdjustmentStatusBadgeClass("APPROVED")).toContain("emerald");
    expect(inventoryAdjustmentTypeLabel("DECREASE")).toBe("Decrease");
    expect(canEditInventoryAdjustment("DRAFT")).toBe(true);
    expect(canApproveInventoryAdjustment("VOIDED")).toBe(false);
    expect(canVoidInventoryAdjustment("APPROVED")).toBe(true);
    expect(warehouseTransferStatusLabel("POSTED")).toBe("Posted");
    expect(warehouseTransferStatusBadgeClass("VOIDED")).toContain("slate");
    expect(canVoidWarehouseTransfer("POSTED")).toBe(true);
  });

  it("validates warehouse transfer input", () => {
    expect(validateWarehouseTransferInput({ itemId: "item-1", fromWarehouseId: "a", toWarehouseId: "a", quantity: "1" })).toBe(
      "Source and destination warehouses must be different.",
    );
    expect(validateWarehouseTransferInput({ itemId: "item-1", fromWarehouseId: "a", toWarehouseId: "b", quantity: "0" })).toBe(
      "Transfer quantity must be greater than zero.",
    );
    expect(validateWarehouseTransferInput({ itemId: "item-1", fromWarehouseId: "a", toWarehouseId: "b", quantity: "1" })).toBeNull();
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
