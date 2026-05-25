import {
  applyCustomerPaymentUnappliedAllocation,
  canReverseCustomerPaymentUnappliedAllocation,
  customerPaymentApplyUnappliedPath,
  customerPaymentActiveUnappliedAppliedAmount,
  customerPaymentReverseUnappliedAllocationPath,
  customerPaymentUnappliedAllocationsPath,
  customerPaymentUnappliedAllocationStatusBadgeClass,
  customerPaymentUnappliedAllocationStatusLabel,
  reverseCustomerPaymentUnappliedAllocation,
  salesInvoiceCustomerPaymentUnappliedAllocationsPath,
  validateCustomerPaymentUnappliedAllocation,
} from "./customer-payments";
import { apiRequest } from "./api";

jest.mock("./api", () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("customer payment helpers", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("builds unapplied allocation URLs safely", () => {
    expect(customerPaymentUnappliedAllocationsPath("pay 1")).toBe("/customer-payments/pay%201/unapplied-allocations");
    expect(customerPaymentApplyUnappliedPath("pay 1")).toBe("/customer-payments/pay%201/apply-unapplied");
    expect(customerPaymentReverseUnappliedAllocationPath("pay 1", "allocation 1")).toBe(
      "/customer-payments/pay%201/unapplied-allocations/allocation%201/reverse",
    );
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

  it("posts unapplied payment applications through the customer payment API route", async () => {
    const response = { id: "payment-1", unappliedAmount: "60.0000" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(
      applyCustomerPaymentUnappliedAllocation("payment 1", {
        invoiceId: "invoice-1",
        amountApplied: "40.0000",
      }),
    ).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment%201/apply-unapplied", {
      method: "POST",
      body: {
        invoiceId: "invoice-1",
        amountApplied: "40.0000",
      },
    });
  });

  it("posts unapplied payment allocation reversals through the customer payment API route", async () => {
    const response = { id: "payment-1", unappliedAmount: "100.0000" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(
      reverseCustomerPaymentUnappliedAllocation("payment 1", "allocation 1", {
        reason: "Wrong invoice",
      }),
    ).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment%201/unapplied-allocations/allocation%201/reverse", {
      method: "POST",
      body: {
        reason: "Wrong invoice",
      },
    });
  });

  it("propagates API errors from unapplied allocation client calls", async () => {
    const error = new Error("Amount applied cannot exceed the payment unapplied amount.");
    apiRequestMock.mockRejectedValueOnce(error);

    await expect(
      applyCustomerPaymentUnappliedAllocation("payment-1", {
        invoiceId: "invoice-1",
        amountApplied: "120.0000",
      }),
    ).rejects.toThrow("Amount applied cannot exceed the payment unapplied amount.");
  });
});
