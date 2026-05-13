import {
  formatInventoryQuantity,
  inventoryBalanceDisplay,
  inventoryAdjustmentStatusBadgeClass,
  inventoryAdjustmentStatusLabel,
  inventoryAdjustmentTypeLabel,
  canApproveInventoryAdjustment,
  canEditInventoryAdjustment,
  canVoidInventoryAdjustment,
  inventorySettingsLabel,
  inventorySettingsWarnings,
  inventoryValuationWarningText,
  canVoidPostedStockDocument,
  hasRemainingInventoryQuantity,
  inventoryProgressStatusBadgeClass,
  inventoryProgressStatusLabel,
  lowStockStatusLabel,
  movementSummaryNetChange,
  purchaseReceiptSourceTypeLabel,
  stockMovementDirection,
  stockDocumentStatusBadgeClass,
  stockDocumentStatusLabel,
  stockMovementTypeLabel,
  validatePurchaseReceiptInput,
  validateSalesStockIssueInput,
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
    expect(stockMovementDirection("PURCHASE_RECEIPT_PLACEHOLDER")).toBe("IN");
    expect(stockMovementDirection("SALES_ISSUE_PLACEHOLDER")).toBe("OUT");
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
    expect(stockDocumentStatusLabel("POSTED")).toBe("Posted");
    expect(stockDocumentStatusBadgeClass("VOIDED")).toContain("slate");
    expect(canVoidPostedStockDocument("POSTED")).toBe(true);
    expect(inventoryProgressStatusLabel("PARTIAL")).toBe("Partial");
    expect(inventoryProgressStatusBadgeClass("COMPLETE")).toContain("emerald");
    expect(purchaseReceiptSourceTypeLabel("purchaseBill")).toBe("Purchase bill");
  });

  it("validates warehouse transfer input", () => {
    expect(validateWarehouseTransferInput({ itemId: "item-1", fromWarehouseId: "a", toWarehouseId: "a", quantity: "1" })).toBe(
      "Source and destination warehouses must be different.",
    );
    expect(validateWarehouseTransferInput({ itemId: "item-1", fromWarehouseId: "a", toWarehouseId: "b", quantity: "0" })).toBe(
      "Transfer quantity must be greater than zero.",
    );
    expect(validateWarehouseTransferInput({ itemId: "item-1", fromWarehouseId: "a", toWarehouseId: "b", quantity: "1" })).toBeNull();
    expect(validatePurchaseReceiptInput({ warehouseId: "", lineCount: 1 })).toBe("Select a warehouse.");
    expect(validatePurchaseReceiptInput({ warehouseId: "warehouse-1", lineCount: 0 })).toBe("Enter at least one quantity to receive.");
    expect(validateSalesStockIssueInput({ salesInvoiceId: "", warehouseId: "warehouse-1", lineCount: 1 })).toBe("Select a finalized sales invoice.");
    expect(validateSalesStockIssueInput({ salesInvoiceId: "invoice-1", warehouseId: "warehouse-1", lineCount: 1 })).toBeNull();
    expect(hasRemainingInventoryQuantity("0.0000")).toBe(false);
    expect(hasRemainingInventoryQuantity("0.1000")).toBe(true);
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

  it("labels inventory settings and valuation warnings", () => {
    const settings = { valuationMethod: "FIFO_PLACEHOLDER" as const, allowNegativeStock: true, trackInventoryValue: true };
    expect(inventorySettingsLabel(settings)).toBe("FIFO placeholder, negative stock allowed, value tracking on");
    expect(inventorySettingsWarnings(settings)).toEqual(expect.arrayContaining([expect.stringContaining("FIFO"), expect.stringContaining("negative stock")]));
    expect(inventoryValuationWarningText({ warnings: [] })).toBe("Cost data complete");
    expect(inventoryValuationWarningText({ warnings: ["Missing unit cost data."] })).toBe("Missing unit cost data.");
  });

  it("labels low-stock status and movement summary net change", () => {
    expect(lowStockStatusLabel("BELOW_REORDER_POINT")).toBe("Below reorder point");
    expect(lowStockStatusLabel("AT_REORDER_POINT")).toBe("At reorder point");
    expect(movementSummaryNetChange({ inboundQuantity: "10.0000", outboundQuantity: "3.5000" })).toBe("6.5000");
  });
});
