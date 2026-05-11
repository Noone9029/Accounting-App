import {
  customerRefundPdfDataPath,
  customerRefundSourceHref,
  customerRefundSourceTypeLabel,
  customerRefundStatusBadgeClass,
  customerRefundStatusLabel,
  refundableAmountAfterRefund,
  refundableSourceLabel,
  validateCustomerRefundAmount,
} from "./customer-refunds";

describe("customer refund helpers", () => {
  it("formats refund statuses and source labels", () => {
    expect(customerRefundStatusLabel("POSTED")).toBe("Posted");
    expect(customerRefundStatusBadgeClass("VOIDED")).toContain("rose");
    expect(customerRefundSourceTypeLabel("CUSTOMER_PAYMENT")).toBe("Customer payment");
    expect(refundableSourceLabel("CREDIT_NOTE", { id: "cn-1", creditNoteNumber: "CN-000001", issueDate: "", currency: "SAR", status: "FINALIZED", total: "50.0000", unappliedAmount: "25.0000" })).toBe(
      "CN-000001 - unapplied 25.0000",
    );
  });

  it("validates refund amount against available source credit", () => {
    expect(validateCustomerRefundAmount("0.0000", "10.0000")).toBe("Amount refunded must be greater than zero.");
    expect(validateCustomerRefundAmount("11.0000", "10.0000")).toBe("Amount refunded cannot exceed the selected source unapplied amount.");
    expect(validateCustomerRefundAmount("5.0000", "10.0000")).toBeNull();
    expect(refundableAmountAfterRefund("10.0000", "3.5000")).toBe("6.5000");
  });

  it("builds source and PDF data paths", () => {
    expect(customerRefundSourceHref({ sourceType: "CUSTOMER_PAYMENT", sourcePaymentId: "pay-1", sourceCreditNoteId: null })).toBe("/sales/customer-payments/pay-1");
    expect(customerRefundSourceHref({ sourceType: "CREDIT_NOTE", sourcePaymentId: null, sourceCreditNoteId: "cn-1" })).toBe("/sales/credit-notes/cn-1");
    expect(customerRefundPdfDataPath("refund 1")).toBe("/customer-refunds/refund%201/pdf-data");
  });
});
