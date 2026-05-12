import type { FiscalPeriodStatus } from "@/lib/types";

export function fiscalPeriodStatusLabel(status: FiscalPeriodStatus): string {
  return status.replaceAll("_", " ");
}

export function fiscalPeriodStatusClass(status: FiscalPeriodStatus): string {
  if (status === "OPEN") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "CLOSED") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-rose-50 text-rose-700";
}

export function fiscalPeriodLockWarning(status?: FiscalPeriodStatus): string {
  if (status === "LOCKED") {
    return "Locked periods cannot be reopened in this MVP.";
  }
  return "Locking is irreversible in this MVP and blocks postings into the period.";
}

export function validateFiscalPeriodForm(input: { name: string; startsOn: string; endsOn: string }): string | null {
  if (!input.name.trim()) {
    return "Name is required.";
  }
  if (!input.startsOn || !input.endsOn) {
    return "Start and end dates are required.";
  }
  if (input.endsOn < input.startsOn) {
    return "End date must be on or after start date.";
  }
  return null;
}
