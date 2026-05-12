import {
  canReversePurchaseDebitNoteAllocation,
  purchaseBillDebitNoteAllocationsPath,
  purchaseBillDebitNotesPath,
  purchaseDebitNoteActiveAppliedAmount,
  purchaseDebitNoteAllocationStatusBadgeClass,
  purchaseDebitNoteAllocationStatusLabel,
  purchaseDebitNoteAllocationsPath,
  purchaseDebitNoteAppliedAmount,
  purchaseDebitNotePdfDataPath,
  purchaseDebitNoteStatusBadgeClass,
  purchaseDebitNoteStatusLabel,
  validatePurchaseDebitNoteAllocation,
} from "./purchase-debit-notes";

describe("purchase debit note helpers", () => {
  it("formats status labels", () => {
    expect(purchaseDebitNoteStatusLabel("DRAFT")).toBe("Draft");
    expect(purchaseDebitNoteStatusLabel("FINALIZED")).toBe("Finalized");
    expect(purchaseDebitNoteStatusLabel("VOIDED")).toBe("Voided");
    expect(purchaseDebitNoteStatusLabel(undefined)).toBe("Not created");
  });

  it("returns stable badge classes", () => {
    expect(purchaseDebitNoteStatusBadgeClass("FINALIZED")).toContain("emerald");
    expect(purchaseDebitNoteStatusBadgeClass("VOIDED")).toContain("rosewood");
    expect(purchaseDebitNoteStatusBadgeClass("DRAFT")).toContain("amber");
  });

  it("builds purchase debit note URLs safely", () => {
    expect(purchaseDebitNotePdfDataPath("pdn 1")).toBe("/purchase-debit-notes/pdn%201/pdf-data");
    expect(purchaseDebitNoteAllocationsPath("pdn 1")).toBe("/purchase-debit-notes/pdn%201/allocations");
    expect(purchaseBillDebitNotesPath("bill 1")).toBe("/purchase-bills/bill%201/debit-notes");
    expect(purchaseBillDebitNoteAllocationsPath("bill 1")).toBe("/purchase-bills/bill%201/debit-note-allocations");
  });

  it("calculates applied debit note amount", () => {
    expect(purchaseDebitNoteAppliedAmount("100.0000", "40.0000")).toBe("60.0000");
    expect(purchaseDebitNoteAppliedAmount("10.0000", "15.0000")).toBe("0.0000");
  });

  it("validates debit note allocation amounts", () => {
    expect(validatePurchaseDebitNoteAllocation("0.0000", "100.0000", "100.0000")).toContain("greater than zero");
    expect(validatePurchaseDebitNoteAllocation("120.0000", "100.0000", "200.0000")).toContain("unapplied");
    expect(validatePurchaseDebitNoteAllocation("120.0000", "200.0000", "100.0000")).toContain("balance due");
    expect(validatePurchaseDebitNoteAllocation("50.0000", "100.0000", "80.0000")).toBeNull();
  });

  it("labels debit note allocation reversal state", () => {
    expect(purchaseDebitNoteAllocationStatusLabel({ reversedAt: null })).toBe("Active");
    expect(purchaseDebitNoteAllocationStatusLabel({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe("Reversed");
    expect(purchaseDebitNoteAllocationStatusBadgeClass({ reversedAt: null })).toContain("emerald");
    expect(purchaseDebitNoteAllocationStatusBadgeClass({ reversedAt: "2026-05-12T00:00:00.000Z" })).toContain("slate");
    expect(canReversePurchaseDebitNoteAllocation({ reversedAt: null })).toBe(true);
    expect(canReversePurchaseDebitNoteAllocation({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe(false);
  });

  it("calculates active applied amount from unreversed allocations", () => {
    expect(
      purchaseDebitNoteActiveAppliedAmount([
        { amountApplied: "10.0000", reversedAt: null },
        { amountApplied: "5.0000", reversedAt: "2026-05-12T00:00:00.000Z" },
        { amountApplied: "2.5000", reversedAt: null },
      ]),
    ).toBe("12.5000");
  });
});
