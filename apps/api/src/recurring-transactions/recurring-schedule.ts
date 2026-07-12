export type RecurringFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type RecurringCatchUpPolicy = "SKIP_MISSED" | "GENERATE_LATEST_ONLY" | "GENERATE_ALL";

export interface RecurringSchedule {
  timeZone: string;
  frequency: RecurringFrequency;
  interval: number;
  anchorDate: string;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  monthOfYear: number | null;
  endDate: string | null;
}

export interface RecurringOccurrence {
  localDate: string;
  scheduledFor: Date;
}

export interface ResolveDueOccurrencesInput {
  schedule: RecurringSchedule;
  nextLocalDate: string;
  now: Date;
  catchUpPolicy: RecurringCatchUpPolicy;
  limit: number;
}

export interface DueOccurrenceResolution {
  occurrences: RecurringOccurrence[];
  skippedLocalDates: string[];
  nextLocalDate: string | null;
  hasMoreDue: boolean;
}

const MAX_CATCH_UP_LIMIT = 100;
const MAX_OCCURRENCE_SCAN = 10_000;

export function assertValidTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
  } catch {
    throw new Error("Schedule timezone must be a valid IANA timezone.");
  }
}

export function canonicalOccurrence(localDate: string, timeZone: string): RecurringOccurrence {
  const parts = parseLocalDate(localDate);
  assertValidTimeZone(timeZone);

  const requestedWallClock = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
  let candidate = requestedWallClock;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const observed = wallClockParts(new Date(candidate), timeZone);
    const observedAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second, 0);
    const corrected = candidate + (requestedWallClock - observedAsUtc);
    if (corrected === candidate) {
      break;
    }
    candidate = corrected;
  }

  const canonical = new Date(candidate);
  const observed = wallClockParts(canonical, timeZone);
  if (observed.year !== parts.year || observed.month !== parts.month || observed.day !== parts.day || observed.hour !== 0 || observed.minute !== 0) {
    throw new Error(`Local schedule date ${localDate} does not resolve to a deterministic midnight in ${timeZone}.`);
  }

  return { localDate, scheduledFor: canonical };
}

export function nextOccurrence(schedule: RecurringSchedule, currentLocalDate: string): RecurringOccurrence | null {
  validateSchedule(schedule);
  const current = parseLocalDate(currentLocalDate);
  const desiredDay = schedule.dayOfMonth ?? parseLocalDate(schedule.anchorDate).day;
  let next: LocalDateParts;

  if (schedule.frequency === "DAILY") {
    next = addCalendarDays(current, schedule.interval);
  } else if (schedule.frequency === "WEEKLY") {
    next = addCalendarDays(current, schedule.interval * 7);
  } else {
    const monthMultiplier = schedule.frequency === "MONTHLY" ? 1 : schedule.frequency === "QUARTERLY" ? 3 : 12;
    next = addCalendarMonths(current, schedule.interval * monthMultiplier, desiredDay);
  }

  const localDate = formatLocalDate(next);
  if (schedule.endDate && compareLocalDates(localDate, schedule.endDate) > 0) {
    return null;
  }
  return canonicalOccurrence(localDate, schedule.timeZone);
}

export function firstOccurrence(schedule: RecurringSchedule): RecurringOccurrence {
  validateSchedule(schedule);
  const anchor = parseLocalDate(schedule.anchorDate);
  let first = anchor;

  if (schedule.frequency === "WEEKLY" && schedule.dayOfWeek !== null) {
    const anchorIsoDay = isoDayOfWeek(anchor);
    const daysForward = (schedule.dayOfWeek - anchorIsoDay + 7) % 7;
    first = addCalendarDays(anchor, daysForward);
  } else if (schedule.frequency === "MONTHLY" || schedule.frequency === "QUARTERLY") {
    const desiredDay = schedule.dayOfMonth ?? anchor.day;
    first = dateInMonth(anchor.year, anchor.month, desiredDay);
    if (compareLocalDates(formatLocalDate(first), schedule.anchorDate) < 0) {
      const monthMultiplier = schedule.frequency === "MONTHLY" ? 1 : 3;
      first = addCalendarMonths(first, schedule.interval * monthMultiplier, desiredDay);
    }
  } else if (schedule.frequency === "YEARLY") {
    const desiredDay = schedule.dayOfMonth ?? anchor.day;
    const desiredMonth = schedule.monthOfYear ?? anchor.month;
    first = dateInMonth(anchor.year, desiredMonth, desiredDay);
    if (compareLocalDates(formatLocalDate(first), schedule.anchorDate) < 0) {
      first = dateInMonth(anchor.year + schedule.interval, desiredMonth, desiredDay);
    }
  }

  const localDate = formatLocalDate(first);
  if (schedule.endDate && compareLocalDates(localDate, schedule.endDate) > 0) {
    throw new Error("Recurring schedule has no occurrence on or before its end date.");
  }
  return canonicalOccurrence(localDate, schedule.timeZone);
}

export function resolveDueOccurrences(input: ResolveDueOccurrencesInput): DueOccurrenceResolution {
  validateSchedule(input.schedule);
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > MAX_CATCH_UP_LIMIT) {
    throw new Error(`Catch-up limit must be between 1 and ${MAX_CATCH_UP_LIMIT}.`);
  }
  if (Number.isNaN(input.now.getTime())) {
    throw new Error("Current time is invalid.");
  }

  const due: RecurringOccurrence[] = [];
  let cursor: RecurringOccurrence | null = canonicalOccurrence(input.nextLocalDate, input.schedule.timeZone);
  let scanned = 0;

  while (cursor && cursor.scheduledFor.getTime() <= input.now.getTime()) {
    due.push(cursor);
    scanned += 1;
    if (scanned >= MAX_OCCURRENCE_SCAN) {
      throw new Error("Recurring catch-up exceeds the safe occurrence scan limit.");
    }
    const next = nextOccurrence(input.schedule, cursor.localDate);
    if (input.catchUpPolicy === "GENERATE_ALL" && due.length >= input.limit) {
      return {
        occurrences: due,
        skippedLocalDates: [],
        nextLocalDate: next?.localDate ?? null,
        hasMoreDue: Boolean(next && next.scheduledFor.getTime() <= input.now.getTime()),
      };
    }
    cursor = next;
  }

  if (input.catchUpPolicy === "SKIP_MISSED") {
    const today = localDateAtInstant(input.now, input.schedule.timeZone);
    const latest = due[due.length - 1];
    const generateLatest = latest?.localDate === today;
    return {
      occurrences: generateLatest ? [latest] : [],
      skippedLocalDates: (generateLatest ? due.slice(0, -1) : due).map((occurrence) => occurrence.localDate),
      nextLocalDate: cursor?.localDate ?? null,
      hasMoreDue: false,
    };
  }

  if (input.catchUpPolicy === "GENERATE_LATEST_ONLY" && due.length > 0) {
    return {
      occurrences: [due[due.length - 1]!],
      skippedLocalDates: due.slice(0, -1).map((occurrence) => occurrence.localDate),
      nextLocalDate: cursor?.localDate ?? null,
      hasMoreDue: false,
    };
  }

  return {
    occurrences: due,
    skippedLocalDates: [],
    nextLocalDate: cursor?.localDate ?? null,
    hasMoreDue: false,
  };
}

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

interface WallClockParts extends LocalDateParts {
  hour: number;
  minute: number;
  second: number;
}

function validateSchedule(schedule: RecurringSchedule): void {
  assertValidTimeZone(schedule.timeZone);
  parseLocalDate(schedule.anchorDate);
  if (schedule.endDate) {
    parseLocalDate(schedule.endDate);
  }
  if (!Number.isInteger(schedule.interval) || schedule.interval < 1) {
    throw new Error("Recurring schedule interval must be a positive integer.");
  }
  if (!(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const).includes(schedule.frequency)) {
    throw new Error("Recurring schedule frequency is invalid.");
  }
  if (schedule.dayOfMonth !== null && (!Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) {
    throw new Error("Recurring schedule day of month must be between 1 and 31.");
  }
  if (schedule.dayOfWeek !== null && (!Number.isInteger(schedule.dayOfWeek) || schedule.dayOfWeek < 1 || schedule.dayOfWeek > 7)) {
    throw new Error("Recurring schedule day of week must be between 1 and 7.");
  }
  if (schedule.monthOfYear !== null && (!Number.isInteger(schedule.monthOfYear) || schedule.monthOfYear < 1 || schedule.monthOfYear > 12)) {
    throw new Error("Recurring schedule month of year must be between 1 and 12.");
  }
}

function parseLocalDate(value: string): LocalDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error("Recurring schedule dates must use YYYY-MM-DD.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) {
    throw new Error(`Recurring schedule date ${value} is invalid.`);
  }
  return { year, month, day };
}

function formatLocalDate(value: LocalDateParts): string {
  return `${String(value.year).padStart(4, "0")}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function compareLocalDates(left: string, right: string): number {
  parseLocalDate(left);
  parseLocalDate(right);
  return left.localeCompare(right);
}

function addCalendarDays(value: LocalDateParts, days: number): LocalDateParts {
  const result = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() };
}

function addCalendarMonths(value: LocalDateParts, months: number, desiredDay: number): LocalDateParts {
  const monthStart = new Date(Date.UTC(value.year, value.month - 1 + months, 1));
  const year = monthStart.getUTCFullYear();
  const month = monthStart.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(desiredDay, lastDay) };
}

function dateInMonth(year: number, month: number, desiredDay: number): LocalDateParts {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(desiredDay, lastDay) };
}

function isoDayOfWeek(value: LocalDateParts): number {
  const utcDay = new Date(Date.UTC(value.year, value.month - 1, value.day)).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

function localDateAtInstant(value: Date, timeZone: string): string {
  const parts = wallClockParts(value, timeZone);
  return formatLocalDate(parts);
}

function wallClockParts(value: Date, timeZone: string): WallClockParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}
