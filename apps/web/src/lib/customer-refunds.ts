import { formatUnits, parseDecimalToUnits } from "./money";
import type { CustomerRefund, CustomerRefundSourceType, CustomerRefundStatus, CustomerRefundableSources } from "./types";

export function customerRefundStatusLabel(status: CustomerRefundStatus | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "VOIDED":
      return "Voided";
    default:
      return "Not created";
  }
}

export function customerRefundStatusBadgeClass(status: CustomerRefundStatus | undefined | null): string {
  switch (status) {
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function customerRefundSourceTypeLabel(sourceType: CustomerRefundSourceType | undefined | null): string {
  switch (sourceType) {
    case "CUSTOMER_PAYMENT":
      return "Customer payment";
    case "CREDIT_NOTE":
      return "Credit note";
    default:
      return "Refund source";
  }
}

export function refundableSourceLabel(
  sourceType: CustomerRefundSourceType,
  source: CustomerRefundableSources["payments"][number] | CustomerRefundableSources["creditNotes"][number],
): string {
  if (sourceType === "CUSTOMER_PAYMENT" && "paymentNumber" in source) {
    return `${source.paymentNumber} - unapplied ${source.unappliedAmount}`;
  }
  if (sourceType === "CREDIT_NOTE" && "creditNoteNumber" in source) {
    return `${source.creditNoteNumber} - unapplied ${source.unappliedAmount}`;
  }
  return "Refund source";
}

export function validateCustomerRefundAmount(amountRefunded: string, availableAmount: string): string | null {
  const amountUnits = parseDecimalToUnits(amountRefunded);
  if (amountUnits <= 0) {
    return "Amount refunded must be greater than zero.";
  }
  if (amountUnits > parseDecimalToUnits(availableAmount)) {
    return "Amount refunded cannot exceed the selected source unapplied amount.";
  }
  return null;
}

export function refundableAmountAfterRefund(availableAmount: string, amountRefunded: string): string {
  return formatUnits(Math.max(0, parseDecimalToUnits(availableAmount) - parseDecimalToUnits(amountRefunded)));
}

export function customerRefundSourceHref(refund: Pick<CustomerRefund, "sourceType" | "sourcePaymentId" | "sourceCreditNoteId">): string {
  if (refund.sourceType === "CUSTOMER_PAYMENT" && refund.sourcePaymentId) {
    return `/sales/customer-payments/${refund.sourcePaymentId}`;
  }
  if (refund.sourceType === "CREDIT_NOTE" && refund.sourceCreditNoteId) {
    return `/sales/credit-notes/${refund.sourceCreditNoteId}`;
  }
  return "";
}

export function customerRefundPdfDataPath(refundId: string): string {
  return `/customer-refunds/${encodeURIComponent(refundId)}/pdf-data`;
}
