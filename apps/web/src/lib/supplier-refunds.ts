import { formatUnits, parseDecimalToUnits } from "./money";
import type { SupplierRefund, SupplierRefundSourceType, SupplierRefundStatus, SupplierRefundableSources } from "./types";

export function supplierRefundStatusLabel(status: SupplierRefundStatus | undefined | null): string {
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

export function supplierRefundStatusBadgeClass(status: SupplierRefundStatus | undefined | null): string {
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

export function supplierRefundSourceTypeLabel(sourceType: SupplierRefundSourceType | undefined | null): string {
  switch (sourceType) {
    case "SUPPLIER_PAYMENT":
      return "Supplier payment";
    case "PURCHASE_DEBIT_NOTE":
      return "Purchase debit note";
    default:
      return "Refund source";
  }
}

export function supplierRefundableSourceLabel(
  sourceType: SupplierRefundSourceType,
  source: SupplierRefundableSources["payments"][number] | SupplierRefundableSources["debitNotes"][number],
): string {
  if (sourceType === "SUPPLIER_PAYMENT" && "paymentNumber" in source) {
    return `${source.paymentNumber} - unapplied ${source.unappliedAmount}`;
  }
  if (sourceType === "PURCHASE_DEBIT_NOTE" && "debitNoteNumber" in source) {
    return `${source.debitNoteNumber} - unapplied ${source.unappliedAmount}`;
  }
  return "Refund source";
}

export function validateSupplierRefundAmount(amountRefunded: string, availableAmount: string): string | null {
  const amountUnits = parseDecimalToUnits(amountRefunded);
  if (amountUnits <= 0) {
    return "Amount refunded must be greater than zero.";
  }
  if (amountUnits > parseDecimalToUnits(availableAmount)) {
    return "Amount refunded cannot exceed the selected source unapplied amount.";
  }
  return null;
}

export function supplierRefundableAmountAfterRefund(availableAmount: string, amountRefunded: string): string {
  return formatUnits(Math.max(0, parseDecimalToUnits(availableAmount) - parseDecimalToUnits(amountRefunded)));
}

export function supplierRefundSourceHref(refund: Pick<SupplierRefund, "sourceType" | "sourcePaymentId" | "sourceDebitNoteId">): string {
  if (refund.sourceType === "SUPPLIER_PAYMENT" && refund.sourcePaymentId) {
    return `/purchases/supplier-payments/${refund.sourcePaymentId}`;
  }
  if (refund.sourceType === "PURCHASE_DEBIT_NOTE" && refund.sourceDebitNoteId) {
    return `/purchases/debit-notes/${refund.sourceDebitNoteId}`;
  }
  return "";
}

export function supplierRefundPdfDataPath(refundId: string): string {
  return `/supplier-refunds/${encodeURIComponent(refundId)}/pdf-data`;
}
