import { fiscalPeriodLockWarning, fiscalPeriodStatusClass, fiscalPeriodStatusLabel, validateFiscalPeriodForm } from "./fiscal-periods";

describe("fiscal period helpers", () => {
  it("labels and styles fiscal period statuses", () => {
    expect(fiscalPeriodStatusLabel("OPEN")).toBe("OPEN");
    expect(fiscalPeriodStatusClass("OPEN")).toContain("emerald");
    expect(fiscalPeriodStatusClass("CLOSED")).toContain("amber");
    expect(fiscalPeriodStatusClass("LOCKED")).toContain("rose");
  });

  it("validates fiscal period form dates", () => {
    expect(validateFiscalPeriodForm({ name: "", startsOn: "2026-01-01", endsOn: "2026-12-31" })).toBe("Name is required.");
    expect(validateFiscalPeriodForm({ name: "FY 2026", startsOn: "2026-12-31", endsOn: "2026-01-01" })).toBe(
      "End date must be on or after start date.",
    );
    expect(validateFiscalPeriodForm({ name: "FY 2026", startsOn: "2026-01-01", endsOn: "2026-12-31" })).toBeNull();
  });

  it("shows irreversible lock warning", () => {
    expect(fiscalPeriodLockWarning()).toContain("irreversible");
    expect(fiscalPeriodLockWarning("LOCKED")).toContain("cannot be reopened");
  });
});
