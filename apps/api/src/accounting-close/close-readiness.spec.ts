import { canonicalReadinessHash, normalizeFxReadiness, normalizeRecurringReadiness } from "./close-readiness";

describe("accounting close readiness normalization", () => {
  it("keeps a stable hash for input order but changes it when authoritative source freshness changes", () => {
    const first = canonicalReadinessHash([
      { key: "recurring.due", title: "Recurring runs due", severity: "WARNING", status: "OPEN", code: "DUE", safeMessage: "One run is due.", count: 1, detailsHref: "/recurring-transactions" },
      { key: "fx.close", title: "Foreign exchange close readiness", severity: "BLOCKER", status: "BLOCKED", code: "MISSING_CLOSING_RATE", safeMessage: "Capture a rate.", count: 1, detailsHref: "/fx-close" },
    ]);
    const second = canonicalReadinessHash([
      { key: "fx.close", title: "Foreign exchange close readiness", severity: "BLOCKER", status: "BLOCKED", code: "MISSING_CLOSING_RATE", safeMessage: "Capture a rate.", count: 1, detailsHref: "/fx-close", sourceUpdatedAt: "2026-07-13T12:00:00.000Z" },
      { key: "recurring.due", title: "Recurring runs due", severity: "WARNING", status: "OPEN", code: "DUE", safeMessage: "One run is due.", count: 1, detailsHref: "/recurring-transactions", sourceUpdatedAt: "2026-07-13T12:01:00.000Z" },
    ]);

    expect(first).not.toBe(second);
  });

  it("keeps authoritative FX blockers as non-overridable blockers", () => {
    expect(normalizeFxReadiness({
      status: "BLOCKED", asOf: "2026-06-30", actions: [], counts: { foreignDocuments: 1 }, blockers: [
        { code: "MISSING_CLOSING_RATE", count: 1, message: "Capture a closing rate.", actionHref: "/settings/currencies-fx" },
      ],
    })).toEqual([expect.objectContaining({
      key: "fx.MISSING_CLOSING_RATE", severity: "BLOCKER", status: "BLOCKED", canAcknowledge: false,
    })]);
  });

  it("keeps recurring readiness advisory because the existing service does not block fiscal close", () => {
    expect(normalizeRecurringReadiness({
      status: "NEEDS_ATTENTION", templateCount: 2, activeTemplates: 2, dueTemplates: 1, failedRuns: 0, blockedRuns: 0,
      generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0,
      runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T12:00:00.000Z",
    })).toEqual([expect.objectContaining({
      key: "recurring.dueTemplates", severity: "WARNING", status: "OPEN", canAcknowledge: true,
    })]);
  });
});
