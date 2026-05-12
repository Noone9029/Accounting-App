import {
  canReverseCustomerPaymentUnappliedAllocation,
  customerPaymentActiveUnappliedAppliedAmount,
  customerPaymentUnappliedAllocationsPath,
  customerPaymentUnappliedAllocationStatusBadgeClass,
  customerPaymentUnappliedAllocationStatusLabel,
  salesInvoiceCustomerPaymentUnappliedAllocationsPath,
  validateCustomerPaymentUnappliedAllocation,
} from "./customer-payments";

describe("customer payment helpers", () => {
  it("builds unapplied allocation URLs safely", () => {
    expect(customerPaymentUnappliedAllocationsPath("pay 1")).toBe("/customer-payments/pay%201/unapplied-allocations");
    expect(salesInvoiceCustomerPaymentUnappliedAllocationsPath("inv 1")).toBe(
      "/sales-invoices/inv%201/customer-payment-unapplied-allocations",
    );
  });

  it("labels unapplied payment allocation reversal state", () => {
    expect(customerPaymentUnappliedAllocationStatusLabel({ reversedAt: null })).toBe("Active");
    expect(customerPaymentUnappliedAllocationStatusLabel({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe("Reversed");
    expect(customerPaymentUnappliedAllocationStatusBadgeClass({ reversedAt: null })).toContain("emerald");
    expect(customerPaymentUnappliedAllocationStatusBadgeClass({ reversedAt: "2026-05-12T00:00:00.000Z" })).toContain("slate");
    expect(canReverseCustomerPaymentUnappliedAllocation({ reversedAt: null })).toBe(true);
    expect(canReverseCustomerPaymentUnappliedAllocation({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe(false);
  });

  it("calculates active applied amount from unreversed unapplied allocations", () => {
    expect(
      customerPaymentActiveUnappliedAppliedAmount([
        { amountApplied: "10.0000", reversedAt: null },
        { amountApplied: "5.0000", reversedAt: "2026-05-12T00:00:00.000Z" },
        { amountApplied: "2.5000", reversedAt: null },
      ]),
    ).toBe("12.5000");
  });

  it("validates unapplied payment allocation amounts", () => {
    expect(validateCustomerPaymentUnappliedAllocation("0.0000", "100.0000", "100.0000")).toContain("greater than zero");
    expect(validateCustomerPaymentUnappliedAllocation("120.0000", "100.0000", "200.0000")).toContain("payment unapplied");
    expect(validateCustomerPaymentUnappliedAllocation("120.0000", "200.0000", "100.0000")).toContain("balance due");
    expect(validateCustomerPaymentUnappliedAllocation("50.0000", "100.0000", "80.0000")).toBeNull();
  });
});
