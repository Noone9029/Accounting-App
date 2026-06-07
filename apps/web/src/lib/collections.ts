import type { CollectionActivityType, CollectionCaseStatus, CollectionPriority } from "./types";

export const collectionCaseStatuses: readonly CollectionCaseStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "PROMISED_TO_PAY",
  "PAID",
  "ON_HOLD",
  "DISPUTED",
  "CLOSED",
  "CANCELLED",
];

export const collectionPriorities: readonly CollectionPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

export const collectionActivityTypes: readonly CollectionActivityType[] = [
  "NOTE",
  "CALL",
  "EMAIL_PLANNED",
  "REMINDER_PLANNED",
  "PROMISE_TO_PAY",
  "DISPUTE",
  "ESCALATION",
  "PAYMENT_RECEIVED_NOTE",
  "CLOSED_NOTE",
];

export const collectionsSafeWording =
  "Collections records help track follow-up work. They do not post journals, allocate payments, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances.";

export function collectionStatusLabel(status: CollectionCaseStatus): string {
  switch (status) {
    case "IN_PROGRESS":
      return "In progress";
    case "PROMISED_TO_PAY":
      return "Promised to pay";
    case "ON_HOLD":
      return "On hold";
    default:
      return titleCase(status);
  }
}

export function collectionPriorityLabel(priority: CollectionPriority): string {
  return titleCase(priority);
}

export function collectionActivityTypeLabel(activityType: CollectionActivityType): string {
  switch (activityType) {
    case "EMAIL_PLANNED":
      return "Planned email";
    case "REMINDER_PLANNED":
      return "Planned reminder";
    case "PROMISE_TO_PAY":
      return "Promise to pay";
    case "PAYMENT_RECEIVED_NOTE":
      return "Payment received note";
    case "CLOSED_NOTE":
      return "Closed note";
    default:
      return titleCase(activityType);
  }
}

export function collectionStatusBadgeClass(status: CollectionCaseStatus): string {
  switch (status) {
    case "PROMISED_TO_PAY":
      return "bg-sky-50 text-sky-700";
    case "DISPUTED":
      return "bg-rose-50 text-rosewood";
    case "ON_HOLD":
      return "bg-amber-50 text-amber-800";
    case "PAID":
    case "CLOSED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
      return "bg-slate-100 text-slate-600";
    case "IN_PROGRESS":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function collectionPriorityBadgeClass(priority: CollectionPriority): string {
  switch (priority) {
    case "URGENT":
      return "bg-rose-50 text-rosewood";
    case "HIGH":
      return "bg-amber-50 text-amber-800";
    case "LOW":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-emerald-50 text-emerald-700";
  }
}

function titleCase(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
