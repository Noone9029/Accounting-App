import type { DeliveryNoteStatus } from "./types";

export const deliveryNoteStatuses: readonly DeliveryNoteStatus[] = ["DRAFT", "ISSUED", "DELIVERED", "CANCELLED", "VOIDED"];

export function deliveryNoteStatusLabel(status: DeliveryNoteStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "ISSUED":
      return "Issued";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "VOIDED":
      return "Voided";
  }
}

export function deliveryNoteStatusBadgeClass(status: DeliveryNoteStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-800";
    case "ISSUED":
      return "bg-sky-50 text-sky-700";
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
  }
}
