import {
  purchaseBillAccountantReviewWarning,
  purchaseBillAccountingPreviewLineDisplay,
  purchaseBillCanFinalizeFromPreview,
  purchaseBillInventoryClearingModeWarning,
  purchaseBillInventoryPostingModeLabel,
  purchaseBillReadinessWarningDisplay,
} from "./purchase-bills";

describe("purchase bill helpers", () => {
  it("labels inventory posting modes", () => {
    expect(purchaseBillInventoryPostingModeLabel("DIRECT_EXPENSE_OR_ASSET")).toBe("Direct Expense/Asset");
    expect(purchaseBillInventoryPostingModeLabel("INVENTORY_CLEARING")).toBe("Inventory Clearing");
  });

  it("formats accounting preview lines", () => {
    expect(
      purchaseBillAccountingPreviewLineDisplay({
        lineNumber: 1,
        side: "DEBIT",
        accountId: "clearing-1",
        accountCode: "240",
        accountName: "Inventory Clearing",
        amount: "20.0000",
        description: "Tracked inventory",
      }),
    ).toBe("Dr 240 Inventory Clearing 20.0000");
  });

  it("handles preview finalization and warning helpers", () => {
    expect(purchaseBillCanFinalizeFromPreview({ canFinalize: true })).toBe(true);
    expect(purchaseBillCanFinalizeFromPreview({ canFinalize: false })).toBe(false);
    expect(purchaseBillCanFinalizeFromPreview(null)).toBe(false);
    expect(purchaseBillInventoryClearingModeWarning()).toBe("Inventory Clearing mode is preparation for future receipt GL posting.");
    expect(purchaseBillAccountantReviewWarning()).toBe("Use only after accountant review.");
    expect(purchaseBillReadinessWarningDisplay(["Purchase receipt GL posting requires purchase bills to use inventory clearing mode."])).toBe(
      "Purchase receipt GL posting requires purchase bills to use inventory clearing mode.",
    );
    expect(purchaseBillReadinessWarningDisplay([])).toBe("No warnings.");
  });
});
