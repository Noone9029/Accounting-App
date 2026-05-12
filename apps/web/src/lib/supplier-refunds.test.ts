import {
  supplierRefundableAmountAfterRefund,
  supplierRefundableSourceLabel,
  supplierRefundSourceHref,
  supplierRefundSourceTypeLabel,
  supplierRefundStatusLabel,
  validateSupplierRefundAmount,
} from "./supplier-refunds";

describe("supplier refund helpers", () => {
  it("labels statuses and source types", () => {
    expect(supplierRefundStatusLabel("POSTED")).toBe("Posted");
    expect(supplierRefundStatusLabel("VOIDED")).toBe("Voided");
    expect(supplierRefundSourceTypeLabel("SUPPLIER_PAYMENT")).toBe("Supplier payment");
    expect(supplierRefundSourceTypeLabel("PURCHASE_DEBIT_NOTE")).toBe("Purchase debit note");
  });

  it("labels refundable sources", () => {
    expect(
      supplierRefundableSourceLabel("SUPPLIER_PAYMENT", {
        id: "payment-1",
        paymentNumber: "PAY-000001",
        paymentDate: "2026-05-12",
        currency: "SAR",
        status: "POSTED",
        amountPaid: "100.0000",
        unappliedAmount: "25.0000",
      }),
    ).toBe("PAY-000001 - unapplied 25.0000");
    expect(
      supplierRefundableSourceLabel("PURCHASE_DEBIT_NOTE", {
        id: "debit-note-1",
        debitNoteNumber: "PDN-000001",
        issueDate: "2026-05-12",
        currency: "SAR",
        status: "FINALIZED",
        total: "100.0000",
        unappliedAmount: "25.0000",
      }),
    ).toBe("PDN-000001 - unapplied 25.0000");
  });

  it("validates refund amount against available source credit", () => {
    expect(validateSupplierRefundAmount("0.0000", "10.0000")).toBe("Amount refunded must be greater than zero.");
    expect(validateSupplierRefundAmount("11.0000", "10.0000")).toBe("Amount refunded cannot exceed the selected source unapplied amount.");
    expect(validateSupplierRefundAmount("10.0000", "10.0000")).toBeNull();
    expect(supplierRefundableAmountAfterRefund("10.0000", "4.0000")).toBe("6.0000");
  });

  it("builds source links", () => {
    expect(supplierRefundSourceHref({ sourceType: "SUPPLIER_PAYMENT", sourcePaymentId: "payment-1", sourceDebitNoteId: null })).toBe(
      "/purchases/supplier-payments/payment-1",
    );
    expect(supplierRefundSourceHref({ sourceType: "PURCHASE_DEBIT_NOTE", sourcePaymentId: null, sourceDebitNoteId: "debit-note-1" })).toBe(
      "/purchases/debit-notes/debit-note-1",
    );
  });
});
