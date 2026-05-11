import type { CreditNoteAllocation, CreditNoteStatus } from "./types";
import { formatUnits, parseDecimalToUnits } from "./money";

export function creditNoteStatusLabel(status: CreditNoteStatus | undefined | null): string {
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

export function creditNoteStatusBadgeClass(status: CreditNoteStatus | undefined | null): string {
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

export function creditNotePdfDataPath(creditNoteId: string): string {
  return `/credit-notes/${encodeURIComponent(creditNoteId)}/pdf-data`;
}

export function salesInvoiceCreditNotesPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/credit-notes`;
}

export function salesInvoiceCreditNoteAllocationsPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/credit-note-allocations`;
}

export function creditNoteAllocationsPath(creditNoteId: string): string {
  return `/credit-notes/${encodeURIComponent(creditNoteId)}/allocations`;
}

export function creditNoteAppliedAmount(total: string, unappliedAmount: string): string {
  return formatUnits(Math.max(0, parseDecimalToUnits(total) - parseDecimalToUnits(unappliedAmount)));
}

export function validateCreditNoteAllocation(amountApplied: string, creditUnappliedAmount: string, invoiceBalanceDue: string): string | null {
  const amountUnits = parseDecimalToUnits(amountApplied);
  if (amountUnits <= 0) {
    return "Amount to apply must be greater than zero.";
  }
  if (amountUnits > parseDecimalToUnits(creditUnappliedAmount)) {
    return "Amount to apply cannot exceed the credit note unapplied amount.";
  }
  if (amountUnits > parseDecimalToUnits(invoiceBalanceDue)) {
    return "Amount to apply cannot exceed the invoice balance due.";
  }
  return null;
}

export function creditNoteAllocationStatusLabel(allocation: Pick<CreditNoteAllocation, "reversedAt">): "Active" | "Reversed" {
  return allocation.reversedAt ? "Reversed" : "Active";
}

export function creditNoteAllocationStatusBadgeClass(allocation: Pick<CreditNoteAllocation, "reversedAt">): string {
  return allocation.reversedAt ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700";
}

export function canReverseCreditNoteAllocation(allocation: Pick<CreditNoteAllocation, "reversedAt">): boolean {
  return !allocation.reversedAt;
}

export function creditNoteActiveAppliedAmount(allocations: Array<Pick<CreditNoteAllocation, "amountApplied" | "reversedAt">> | undefined): string {
  const units = (allocations ?? [])
    .filter((allocation) => !allocation.reversedAt)
    .reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  return formatUnits(units);
}
