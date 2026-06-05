import type { RecurringInvoiceFrequency, RecurringInvoiceTemplateStatus } from "./types";

export interface RecurringSchedulePreviewInput {
  startDate: string;
  nextRunDate: string;
  endDate?: string;
  frequency: RecurringInvoiceFrequency;
  interval: number;
  paymentTermsDays: number;
}

export interface RecurringSchedulePreview {
  nextInvoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  nextOccurrences: string[];
  blockers: string[];
}

export function recurringInvoiceStatusLabel(status: RecurringInvoiceTemplateStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function recurringInvoiceStatusBadgeClass(status: RecurringInvoiceTemplateStatus): string {
  if (status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "PAUSED") {
    return "bg-amber-50 text-amber-700";
  }
  if (status === "ENDED") {
    return "bg-slate-100 text-slate-700";
  }
  if (status === "CANCELLED") {
    return "bg-rose-50 text-rosewood";
  }
  return "bg-slate-100 text-slate-700";
}

export function recurringInvoiceFrequencyLabel(frequency: RecurringInvoiceFrequency, interval = 1): string {
  const base =
    frequency === "WEEKLY"
      ? "week"
      : frequency === "MONTHLY"
        ? "month"
        : frequency === "QUARTERLY"
          ? "quarter"
          : "year";
  return interval <= 1 ? `Every ${base}` : `Every ${interval} ${base}s`;
}

export function buildRecurringSchedulePreview(input: RecurringSchedulePreviewInput): RecurringSchedulePreview {
  const blockers: string[] = [];
  const startDate = parseScheduleDate(input.startDate);
  const nextRunDate = parseScheduleDate(input.nextRunDate);
  const endDate = input.endDate ? parseScheduleDate(input.endDate) : null;
  const interval = Number.isInteger(input.interval) ? input.interval : 0;
  const paymentTermsDays = Number.isInteger(input.paymentTermsDays) ? input.paymentTermsDays : -1;

  if (!startDate) {
    blockers.push("Start date is required.");
  }
  if (!nextRunDate) {
    blockers.push("Next run date is required.");
  }
  if (input.endDate && !endDate) {
    blockers.push("End date is invalid.");
  }
  if (interval < 1) {
    blockers.push("Interval must be at least 1.");
  }
  if (paymentTermsDays < 0) {
    blockers.push("Payment terms days must be zero or greater.");
  }
  if (startDate && nextRunDate && nextRunDate < startDate) {
    blockers.push("Next run date cannot be before start date.");
  }
  if (startDate && endDate && endDate < startDate) {
    blockers.push("End date cannot be before start date.");
  }
  if (nextRunDate && endDate && nextRunDate > endDate) {
    blockers.push("Next run date cannot be after end date.");
  }

  if (!startDate || !nextRunDate || interval < 1 || paymentTermsDays < 0) {
    return {
      nextInvoiceDate: "",
      dueDate: "",
      periodStart: "",
      periodEnd: "",
      nextOccurrences: [],
      blockers,
    };
  }

  const nextDate = advanceScheduleDate(nextRunDate, input.frequency, interval);
  const periodEnd = addUtcDays(nextDate, -1);

  return {
    nextInvoiceDate: formatScheduleDate(nextRunDate),
    dueDate: formatScheduleDate(addUtcDays(nextRunDate, paymentTermsDays)),
    periodStart: formatScheduleDate(nextRunDate),
    periodEnd: formatScheduleDate(periodEnd),
    nextOccurrences: buildNextOccurrences(nextRunDate, input.frequency, interval, endDate, 6),
    blockers,
  };
}

function buildNextOccurrences(
  firstRunDate: Date,
  frequency: RecurringInvoiceFrequency,
  interval: number,
  endDate: Date | null,
  limit: number,
): string[] {
  const dates: string[] = [];
  let current = firstRunDate;
  for (let index = 0; index < limit; index += 1) {
    if (endDate && current > endDate) {
      break;
    }
    dates.push(formatScheduleDate(current));
    current = advanceScheduleDate(current, frequency, interval);
  }
  return dates;
}

function advanceScheduleDate(date: Date, frequency: RecurringInvoiceFrequency, interval: number): Date {
  if (frequency === "WEEKLY") {
    return addUtcDays(date, 7 * interval);
  }
  if (frequency === "QUARTERLY") {
    return addUtcMonthsClamped(date, 3 * interval);
  }
  if (frequency === "YEARLY") {
    return addUtcMonthsClamped(date, 12 * interval);
  }
  return addUtcMonthsClamped(date, interval);
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addUtcMonthsClamped(date: Date, months: number): Date {
  const targetMonthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const targetMonthEnd = new Date(Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth() + 1, 0));
  const day = Math.min(date.getUTCDate(), targetMonthEnd.getUTCDate());
  return new Date(Date.UTC(targetMonthStart.getUTCFullYear(), targetMonthStart.getUTCMonth(), day));
}

function parseScheduleDate(value: string): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatScheduleDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
