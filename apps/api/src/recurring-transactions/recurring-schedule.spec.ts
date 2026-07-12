import {
  assertValidTimeZone,
  canonicalOccurrence,
  firstOccurrence,
  nextOccurrence,
  resolveDueOccurrences,
  type RecurringSchedule,
} from "./recurring-schedule";

const monthly31: RecurringSchedule = {
  timeZone: "Asia/Dubai",
  frequency: "MONTHLY",
  interval: 1,
  anchorDate: "2026-01-31",
  dayOfMonth: 31,
  dayOfWeek: null,
  monthOfYear: null,
  endDate: null,
};

describe("recurring schedule", () => {
  it.each([
    ["DAILY", "2026-01-01", "2026-01-02"],
    ["WEEKLY", "2026-01-01", "2026-01-08"],
    ["MONTHLY", "2026-01-31", "2026-02-28"],
    ["QUARTERLY", "2026-01-31", "2026-04-30"],
    ["YEARLY", "2024-02-29", "2025-02-28"],
  ] as const)("advances %s occurrences deterministically", (frequency, currentLocalDate, expected) => {
    expect(
      nextOccurrence(
        {
          ...monthly31,
          frequency,
          anchorDate: currentLocalDate,
          dayOfMonth: frequency === "DAILY" || frequency === "WEEKLY" ? null : Number(currentLocalDate.slice(-2)),
        },
        currentLocalDate,
      )?.localDate,
    ).toBe(expected);
  });

  it("preserves the intended month-end day after a shorter month", () => {
    const february = nextOccurrence(monthly31, "2026-01-31");
    const march = nextOccurrence(monthly31, february!.localDate);

    expect(february?.localDate).toBe("2026-02-28");
    expect(march?.localDate).toBe("2026-03-31");
  });

  it("handles leap-year February explicitly", () => {
    expect(nextOccurrence({ ...monthly31, anchorDate: "2024-01-31" }, "2024-01-31")?.localDate).toBe("2024-02-29");
  });

  it("finds the first configured weekly weekday on or after the start date", () => {
    expect(
      firstOccurrence({
        ...monthly31,
        frequency: "WEEKLY",
        anchorDate: "2026-07-12",
        dayOfMonth: null,
        dayOfWeek: 1,
      }).localDate,
    ).toBe("2026-07-13");
  });

  it("preserves the legacy Sunday-zero weekday contract", () => {
    expect(
      firstOccurrence({
        ...monthly31,
        frequency: "WEEKLY",
        anchorDate: "2026-07-13",
        dayOfMonth: null,
        dayOfWeek: 0,
      }).localDate,
    ).toBe("2026-07-19");
  });

  it("finds a clamped first month-end occurrence", () => {
    expect(firstOccurrence({ ...monthly31, anchorDate: "2026-02-01" }).localDate).toBe("2026-02-28");
  });

  it("finds the configured annual month and leap-day occurrence", () => {
    expect(
      firstOccurrence({
        ...monthly31,
        frequency: "YEARLY",
        anchorDate: "2023-03-01",
        dayOfMonth: 29,
        monthOfYear: 2,
      }).localDate,
    ).toBe("2024-02-29");
  });

  it("returns no occurrence beyond the inclusive end date", () => {
    expect(nextOccurrence({ ...monthly31, endDate: "2026-02-28" }, "2026-02-28")).toBeNull();
  });

  it("maps local schedule dates to canonical instants across DST changes", () => {
    expect(canonicalOccurrence("2026-03-08", "America/New_York").scheduledFor.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(canonicalOccurrence("2026-03-09", "America/New_York").scheduledFor.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(canonicalOccurrence("2026-11-01", "America/New_York").scheduledFor.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(canonicalOccurrence("2026-11-02", "America/New_York").scheduledFor.toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("uses the earliest valid local instant when DST skips midnight", () => {
    const occurrence = canonicalOccurrence("2026-09-06", "America/Santiago");
    expect(occurrence.localDate).toBe("2026-09-06");
    expect(occurrence.scheduledFor.toISOString()).toBe("2026-09-06T04:00:00.000Z");
  });

  it("produces different canonical instants for the same business date in different timezones", () => {
    expect(canonicalOccurrence("2026-07-12", "Asia/Dubai").scheduledFor.toISOString()).toBe("2026-07-11T20:00:00.000Z");
    expect(canonicalOccurrence("2026-07-12", "Asia/Riyadh").scheduledFor.toISOString()).toBe("2026-07-11T21:00:00.000Z");
  });

  it("rejects invalid IANA timezones", () => {
    expect(() => assertValidTimeZone("server-local")).toThrow("valid IANA timezone");
  });

  it("skips missed occurrences by default without generating a backlog", () => {
    const result = resolveDueOccurrences({
      schedule: monthly31,
      nextLocalDate: "2026-01-31",
      now: new Date("2026-04-15T00:00:00.000Z"),
      catchUpPolicy: "SKIP_MISSED",
      limit: 12,
    });

    expect(result.occurrences).toEqual([]);
    expect(result.nextLocalDate).toBe("2026-04-30");
    expect(result.skippedLocalDates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("still generates today's due occurrence under skip-missed policy", () => {
    const result = resolveDueOccurrences({
      schedule: monthly31,
      nextLocalDate: "2026-03-31",
      now: new Date("2026-03-31T12:00:00.000Z"),
      catchUpPolicy: "SKIP_MISSED",
      limit: 12,
    });

    expect(result.occurrences.map((occurrence) => occurrence.localDate)).toEqual(["2026-03-31"]);
    expect(result.skippedLocalDates).toEqual([]);
    expect(result.nextLocalDate).toBe("2026-04-30");
  });

  it("generates only the latest missed occurrence when configured", () => {
    const result = resolveDueOccurrences({
      schedule: monthly31,
      nextLocalDate: "2026-01-31",
      now: new Date("2026-04-15T00:00:00.000Z"),
      catchUpPolicy: "GENERATE_LATEST_ONLY",
      limit: 12,
    });

    expect(result.occurrences.map((occurrence) => occurrence.localDate)).toEqual(["2026-03-31"]);
    expect(result.skippedLocalDates).toEqual(["2026-01-31", "2026-02-28"]);
    expect(result.nextLocalDate).toBe("2026-04-30");
  });

  it("bounds generate-all catch-up and reports remaining due work", () => {
    const result = resolveDueOccurrences({
      schedule: { ...monthly31, frequency: "DAILY", anchorDate: "2026-01-01", dayOfMonth: null },
      nextLocalDate: "2026-01-01",
      now: new Date("2026-01-20T00:00:00.000Z"),
      catchUpPolicy: "GENERATE_ALL",
      limit: 3,
    });

    expect(result.occurrences.map((occurrence) => occurrence.localDate)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(result.hasMoreDue).toBe(true);
    expect(result.nextLocalDate).toBe("2026-01-04");
  });

  it.each(["SKIP_MISSED", "GENERATE_LATEST_ONLY"] as const)(
    "bounds %s catch-up evidence and advances the backlog in chunks",
    (catchUpPolicy) => {
      const result = resolveDueOccurrences({
        schedule: { ...monthly31, frequency: "DAILY", anchorDate: "2026-01-01", dayOfMonth: null },
        nextLocalDate: "2026-01-01",
        now: new Date("2026-12-31T12:00:00.000Z"),
        catchUpPolicy,
        limit: 3,
      });

      expect(result.occurrences).toEqual([]);
      expect(result.skippedLocalDates).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
      expect(result.hasMoreDue).toBe(true);
      expect(result.nextLocalDate).toBe("2026-01-04");
    },
  );

  it("rejects unbounded or invalid catch-up limits", () => {
    expect(() =>
      resolveDueOccurrences({
        schedule: monthly31,
        nextLocalDate: "2026-01-31",
        now: new Date("2026-04-15T00:00:00.000Z"),
        catchUpPolicy: "GENERATE_ALL",
        limit: 0,
      }),
    ).toThrow("between 1 and 100");
  });
});
