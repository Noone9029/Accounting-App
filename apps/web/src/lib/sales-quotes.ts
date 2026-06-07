import type { SalesQuoteStatus } from "./types";

export function salesQuoteStatusLabel(status: SalesQuoteStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function salesQuoteStatusBadgeClass(status: SalesQuoteStatus): string {
  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "CONVERTED") {
    return "bg-teal-50 text-palm";
  }
  if (status === "REJECTED" || status === "CANCELLED" || status === "EXPIRED") {
    return "bg-rose-50 text-rosewood";
  }
  if (status === "SENT") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}
