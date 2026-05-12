import { formatUnits, parseDecimalToUnits } from "./money";
import type { PurchaseDebitNoteAllocation, PurchaseDebitNoteStatus } from "./types";

export function purchaseDebitNoteStatusLabel(status: PurchaseDebitNoteStatus | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "FINALIZED":
      return "Finalized";
    case "VOIDED":
      return "Voided";
    default:
      return "Not created";
  }
}

export function purchaseDebitNoteStatusBadgeClass(status: PurchaseDebitNoteStatus | undefined | null): string {
  switch (status) {
    case "FINALIZED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function purchaseDebitNotePdfDataPath(debitNoteId: string): string {
  return `/purchase-debit-notes/${encodeURIComponent(debitNoteId)}/pdf-data`;
}

export function purchaseBillDebitNotesPath(billId: string): string {
  return `/purchase-bills/${encodeURIComponent(billId)}/debit-notes`;
}

export function purchaseBillDebitNoteAllocationsPath(billId: string): string {
  return `/purchase-bills/${encodeURIComponent(billId)}/debit-note-allocations`;
}

export function purchaseDebitNoteAllocationsPath(debitNoteId: string): string {
  return `/purchase-debit-notes/${encodeURIComponent(debitNoteId)}/allocations`;
}

export function purchaseDebitNoteAppliedAmount(total: string, unappliedAmount: string): string {
  return formatUnits(Math.max(0, parseDecimalToUnits(total) - parseDecimalToUnits(unappliedAmount)));
}

export function validatePurchaseDebitNoteAllocation(amountApplied: string, debitNoteUnappliedAmount: string, billBalanceDue: string): string | null {
  const amountUnits = parseDecimalToUnits(amountApplied);
  if (amountUnits <= 0) {
    return "Amount to apply must be greater than zero.";
  }
  if (amountUnits > parseDecimalToUnits(debitNoteUnappliedAmount)) {
    return "Amount to apply cannot exceed the debit note unapplied amount.";
  }
  if (amountUnits > parseDecimalToUnits(billBalanceDue)) {
    return "Amount to apply cannot exceed the bill balance due.";
  }
  return null;
}

export function purchaseDebitNoteAllocationStatusLabel(allocation: Pick<PurchaseDebitNoteAllocation, "reversedAt">): "Active" | "Reversed" {
  return allocation.reversedAt ? "Reversed" : "Active";
}

export function purchaseDebitNoteAllocationStatusBadgeClass(allocation: Pick<PurchaseDebitNoteAllocation, "reversedAt">): string {
  return allocation.reversedAt ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700";
}

export function canReversePurchaseDebitNoteAllocation(allocation: Pick<PurchaseDebitNoteAllocation, "reversedAt">): boolean {
  return !allocation.reversedAt;
}

export function purchaseDebitNoteActiveAppliedAmount(
  allocations: Array<Pick<PurchaseDebitNoteAllocation, "amountApplied" | "reversedAt">> | undefined,
): string {
  const units = (allocations ?? [])
    .filter((allocation) => !allocation.reversedAt)
    .reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  return formatUnits(units);
}
