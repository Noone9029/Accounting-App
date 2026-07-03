import { parseDecimalToUnits } from "./money";

export function formatOptionalDate(value: string | null | undefined, emptyLabel = "No due date"): string {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return emptyLabel;
  }

  if (typeof document !== "undefined" && document.documentElement.lang === "ar") {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(date);
  }
  return date.toLocaleDateString();
}

export type InvoicePaymentState = "Unpaid" | "Partially paid" | "Paid";

export function deriveInvoicePaymentState(total: string, balanceDue: string): InvoicePaymentState {
  const totalValue = parseDecimalToUnits(total);
  const balanceValue = parseDecimalToUnits(balanceDue);

  if (balanceValue <= 0) {
    return "Paid";
  }

  if (balanceValue < totalValue) {
    return "Partially paid";
  }

  return "Unpaid";
}
