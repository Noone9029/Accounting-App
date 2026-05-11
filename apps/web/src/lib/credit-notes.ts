import type { CreditNoteStatus } from "./types";

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
