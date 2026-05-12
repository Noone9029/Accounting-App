import {
  canReverseSupplierPaymentUnappliedAllocation,
  supplierPaymentActiveUnappliedAppliedAmount,
  supplierPaymentUnappliedAllocationStatusLabel,
  validateSupplierPaymentUnappliedAllocation,
} from "./supplier-payments";

describe("supplier payment helpers", () => {
  it("labels active and reversed unapplied allocations", () => {
    expect(supplierPaymentUnappliedAllocationStatusLabel({ reversedAt: null })).toBe("Active");
    expect(supplierPaymentUnappliedAllocationStatusLabel({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe("Reversed");
  });

  it("calculates active unapplied applied amount", () => {
    expect(
      supplierPaymentActiveUnappliedAppliedAmount([
        { amountApplied: "10.0000", reversedAt: null },
        { amountApplied: "5.0000", reversedAt: "2026-05-12T00:00:00.000Z" },
      ]),
    ).toBe("10.0000");
  });

  it("validates supplier unapplied payment applications", () => {
    expect(validateSupplierPaymentUnappliedAllocation("0.0000", "10.0000", "10.0000")).toBe("Amount to apply must be greater than zero.");
    expect(validateSupplierPaymentUnappliedAllocation("11.0000", "10.0000", "20.0000")).toBe(
      "Amount to apply cannot exceed the supplier payment unapplied amount.",
    );
    expect(validateSupplierPaymentUnappliedAllocation("11.0000", "20.0000", "10.0000")).toBe("Amount to apply cannot exceed the bill balance due.");
    expect(validateSupplierPaymentUnappliedAllocation("10.0000", "20.0000", "10.0000")).toBeNull();
  });

  it("allows reversing only active allocations", () => {
    expect(canReverseSupplierPaymentUnappliedAllocation({ reversedAt: null })).toBe(true);
    expect(canReverseSupplierPaymentUnappliedAllocation({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe(false);
  });
});
