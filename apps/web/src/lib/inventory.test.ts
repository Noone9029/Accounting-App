import {
  formatInventoryQuantity,
  inventoryBalanceDisplay,
  inventoryAdjustmentStatusBadgeClass,
  inventoryAdjustmentStatusLabel,
  inventoryAdjustmentTypeLabel,
  canApproveInventoryAdjustment,
  canEditInventoryAdjustment,
  canVoidInventoryAdjustment,
  canShowPostCogsAction,
  canShowReverseCogsAction,
  accountingPreviewCanPost,
  accountingPreviewLineDisplay,
  cogsPostingFinancialReportWarning,
  cogsPostingStatus,
  canShowPostReceiptAssetAction,
  canShowReverseReceiptAssetAction,
  inventoryAccountingWarnings,
  inventoryClearingAmountDisplay,
  inventoryClearingReportUrl,
  inventoryClearingStatusBadgeClass,
  inventoryClearingStatusLabel,
  inventoryClearingVarianceReasonLabel,
  inventorySettingsLabel,
  inventorySettingsWarnings,
  inventoryValuationWarningText,
  missingInventoryAccountMappingWarnings,
  canVoidPostedStockDocument,
  hasRemainingInventoryQuantity,
  inventoryProgressStatusBadgeClass,
  inventoryProgressStatusLabel,
  lowStockStatusLabel,
  movementSummaryNetChange,
  purchaseReceiptGlPostingWarning,
  purchaseReceiptPostingBlockingReasonDisplay,
  purchaseReceiptPostingReadinessBadgeClass,
  purchaseReceiptPostingReadinessLabel,
  purchaseReceiptPostingModeLabel,
  purchaseReceiptPostingWarningDisplay,
  purchaseReceiptSourceTypeLabel,
  receiptMatchingStatusBadgeClass,
  receiptMatchingStatusLabel,
  receiptAssetPostingFinancialReportWarning,
  receiptAssetPostingStatus,
  linkedPurchaseBillModeWarning,
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

  it("formats inventory accounting warnings and preview lines", () => {
    expect(inventoryAccountingWarnings()).toEqual(
      expect.arrayContaining([
        "Enabling this only allows manual COGS and compatible receipt asset posting. It does not auto-post inventory journals.",
        "Purchase receipt GL posting requires an explicit manual post action after review.",
        "COGS posting requires an explicit manual post action after review.",
        "Accountant review required before enabling financial inventory postings.",
      ]),
    );
    expect(
      accountingPreviewLineDisplay({
        lineNumber: 1,
        side: "DEBIT",
        accountId: "cogs-1",
        accountCode: "611",
        accountName: "Cost of Goods Sold",
        amount: "10.5",
        description: "COGS preview",
      }),
    ).toBe("Dr 611 Cost of Goods Sold 10.5000");
    expect(accountingPreviewCanPost({ canPost: false, previewOnly: true })).toBe(false);
    expect(accountingPreviewCanPost({ canPost: true, previewOnly: true })).toBe(true);
    expect(
      missingInventoryAccountMappingWarnings({
        inventoryAssetAccountId: null,
        cogsAccountId: null,
        inventoryClearingAccountId: null,
        inventoryAdjustmentGainAccountId: "gain-1",
        inventoryAdjustmentLossAccountId: null,
      }),
    ).toEqual(
      expect.arrayContaining([
        "Inventory asset account mapping is missing.",
        "COGS account mapping is missing.",
        "Inventory clearing account mapping is missing.",
        "Inventory adjustment loss account mapping is not set.",
      ]),
    );
    expect(purchaseReceiptPostingModeLabel("PREVIEW_ONLY")).toBe("Preview only");
    expect(purchaseReceiptPostingModeLabel("DISABLED")).toBe("Disabled");
    expect(purchaseReceiptGlPostingWarning()).toBe("Purchase receipt GL posting requires an explicit manual post action after review.");
    expect(purchaseReceiptPostingReadinessLabel({ ready: true })).toBe("Ready for future implementation");
    expect(purchaseReceiptPostingReadinessLabel({ ready: false })).toBe("Not ready");
    expect(purchaseReceiptPostingReadinessBadgeClass({ ready: true })).toContain("emerald");
    expect(purchaseReceiptPostingReadinessBadgeClass({ ready: false })).toContain("amber");
    expect(purchaseReceiptPostingBlockingReasonDisplay(["Inventory clearing account mapping is required."])).toBe(
      "Inventory clearing account mapping is required.",
    );
    expect(purchaseReceiptPostingBlockingReasonDisplay([])).toBe("No readiness blockers.");
    expect(purchaseReceiptPostingWarningDisplay(["Purchase receipt GL posting requires an explicit manual post action after review."])).toBe(
      "Purchase receipt GL posting requires an explicit manual post action after review.",
    );
    expect(purchaseReceiptPostingWarningDisplay([])).toBe("No warnings.");
    expect(receiptMatchingStatusLabel("PARTIALLY_RECEIVED")).toBe("Partially received");
    expect(receiptMatchingStatusLabel("OVER_RECEIVED_WARNING")).toBe("Over received");
    expect(receiptMatchingStatusBadgeClass("FULLY_RECEIVED")).toContain("emerald");
    expect(receiptMatchingStatusBadgeClass("OVER_RECEIVED_WARNING")).toContain("rose");
  });

  it("handles manual COGS posting status and action visibility", () => {
    expect(cogsPostingStatus({ alreadyPosted: false, alreadyReversed: false })).toBe("Not posted");
    expect(cogsPostingStatus({ alreadyPosted: true, alreadyReversed: false })).toBe("Posted");
    expect(cogsPostingStatus({ alreadyPosted: true, alreadyReversed: true })).toBe("Reversed");
    expect(canShowPostCogsAction({ canPost: true, alreadyPosted: false }, true)).toBe(true);
    expect(canShowPostCogsAction({ canPost: true, alreadyPosted: false }, false)).toBe(false);
    expect(canShowPostCogsAction({ canPost: false, alreadyPosted: false }, true)).toBe(false);
    expect(canShowReverseCogsAction({ alreadyPosted: true, alreadyReversed: false }, true)).toBe(true);
    expect(canShowReverseCogsAction({ alreadyPosted: true, alreadyReversed: true }, true)).toBe(false);
    expect(canShowReverseCogsAction({ alreadyPosted: true, alreadyReversed: false }, false)).toBe(false);
    expect(cogsPostingFinancialReportWarning()).toBe("This creates accounting journal entries and affects financial reports.");
  });

  it("handles manual purchase receipt asset posting status and action visibility", () => {
    expect(receiptAssetPostingStatus({ alreadyPosted: false, alreadyReversed: false })).toBe("Not posted");
    expect(receiptAssetPostingStatus({ alreadyPosted: true, alreadyReversed: false })).toBe("Posted");
    expect(receiptAssetPostingStatus({ alreadyPosted: true, alreadyReversed: true })).toBe("Reversed");
    expect(canShowPostReceiptAssetAction({ canPost: true, alreadyPosted: false }, true)).toBe(true);
    expect(canShowPostReceiptAssetAction({ canPost: false, alreadyPosted: false }, true)).toBe(false);
    expect(canShowPostReceiptAssetAction({ canPost: true, alreadyPosted: false }, false)).toBe(false);
    expect(canShowReverseReceiptAssetAction({ alreadyPosted: true, alreadyReversed: false }, true)).toBe(true);
    expect(canShowReverseReceiptAssetAction({ alreadyPosted: true, alreadyReversed: true }, true)).toBe(false);
    expect(canShowReverseReceiptAssetAction({ alreadyPosted: true, alreadyReversed: false }, false)).toBe(false);
    expect(receiptAssetPostingFinancialReportWarning()).toBe(
      "This creates accounting journal entries and affects inventory asset and clearing balances.",
    );
    expect(linkedPurchaseBillModeWarning("INVENTORY_CLEARING")).toBe("Linked bill uses inventory clearing mode.");
    expect(linkedPurchaseBillModeWarning("DIRECT_EXPENSE_OR_ASSET")).toBe(
      "Purchase receipt asset posting requires a finalized INVENTORY_CLEARING purchase bill.",
    );
  });

  it("labels low-stock status and movement summary net change", () => {
    expect(lowStockStatusLabel("BELOW_REORDER_POINT")).toBe("Below reorder point");
    expect(lowStockStatusLabel("AT_REORDER_POINT")).toBe("At reorder point");
    expect(movementSummaryNetChange({ inboundQuantity: "10.0000", outboundQuantity: "3.5000" })).toBe("6.5000");
  });

  it("labels inventory clearing reconciliation and variance helpers", () => {
    expect(inventoryClearingStatusLabel("MATCHED")).toBe("Matched");
    expect(inventoryClearingStatusLabel("BILL_WITHOUT_RECEIPT_POSTING")).toBe("Bill without receipt posting");
    expect(inventoryClearingStatusBadgeClass("MATCHED")).toContain("emerald");
    expect(inventoryClearingStatusBadgeClass("VARIANCE")).toContain("rose");
    expect(inventoryClearingAmountDisplay("2.5")).toBe("2.5000");
    expect(inventoryClearingVarianceReasonLabel("Review unit cost difference between bill and receipt.")).toBe(
      "Review unit cost difference between bill and receipt.",
    );
    expect(inventoryClearingVarianceReasonLabel("")).toBe("No variance reason.");
    expect(inventoryClearingReportUrl({ purchaseBillId: "bill-1", purchaseReceiptId: "receipt-1", status: "VARIANCE" })).toBe(
      "/inventory/reports/clearing-reconciliation?purchaseBillId=bill-1&purchaseReceiptId=receipt-1&status=VARIANCE",
    );
  });
});
