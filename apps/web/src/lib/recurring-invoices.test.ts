import { appIntlLocale } from "./app-i18n";
import { buildRecurringSchedulePreview, formatRecurringScheduleDate } from "./recurring-invoices";

describe("recurring invoice calendar dates", () => {
  const DateTimeFormat = Intl.DateTimeFormat;

  it.each(["America/New_York", "Pacific/Kiritimati"])("preserves schedule dates when the browser defaults to %s", (timeZone) => {
    const formatter = jest.spyOn(Intl, "DateTimeFormat").mockImplementation((locale, options) => new DateTimeFormat(locale, { timeZone, ...options }));
    try {
      expect(formatRecurringScheduleDate("2026-06-15", "en")).toBe("Jun 15, 2026");
      expect(formatRecurringScheduleDate("2026-06-15T00:00:00.000Z", "en")).toBe("Jun 15, 2026");
      expect(formatRecurringScheduleDate("2026-01-01T00:00:00.000Z", "en")).toBe("Jan 1, 2026");
      const expectedArabic = new DateTimeFormat(appIntlLocale("ar"), { dateStyle: "medium", timeZone: "UTC" }).format(new Date("2026-06-15T00:00:00.000Z"));
      expect(formatRecurringScheduleDate("2026-06-15", "ar")).toBe(expectedArabic);
    } finally { formatter.mockRestore(); }
  });

  it("keeps calculated period boundaries and due dates on their calendar day", () => {
    const preview = buildRecurringSchedulePreview({ startDate: "2026-06-15", nextRunDate: "2026-06-15", frequency: "MONTHLY", interval: 1, paymentTermsDays: 15 });
    expect([preview.periodStart, preview.periodEnd, preview.dueDate].map((date) => formatRecurringScheduleDate(date, "en")))
      .toEqual(["Jun 15, 2026", "Jul 14, 2026", "Jun 30, 2026"]);
  });

  it("uses the empty label for missing or invalid calendar dates", () => {
    for (const value of [null, undefined, "", "not-a-date", "2026-02-30"]) expect(formatRecurringScheduleDate(value, "en", "No runs yet")).toBe("No runs yet");
  });
});
