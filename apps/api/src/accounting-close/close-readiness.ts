import { createHash } from "node:crypto";

export type AccountingCloseSeverity = "BLOCKER" | "WARNING" | "INFORMATION" | "NOT_APPLICABLE";
export type AccountingCloseCheckStatus = "READY" | "OPEN" | "BLOCKED" | "NOT_APPLICABLE" | "ERROR";

export interface AccountingCloseCheck {
  key: string;
  title: string;
  severity: AccountingCloseSeverity;
  status: AccountingCloseCheckStatus;
  code: string;
  safeMessage: string;
  count: number;
  detailsHref?: string;
  sourceUpdatedAt?: string;
  canAcknowledge: boolean;
}

type FxReadiness = {
  status: "NOT_APPLICABLE" | "READY" | "BLOCKED";
  asOf: string;
  blockers: Array<{ code: string; count: number; message: string; actionHref: string }>;
  actions: Array<{ code: string; label: string; href: string }>;
  counts: Record<string, number>;
};

type RecurringReadiness = {
  status: "NOT_APPLICABLE" | "READY" | "NEEDS_ATTENTION";
  templateCount: number;
  activeTemplates: number;
  dueTemplates: number;
  failedRuns: number;
  blockedRuns: number;
  generatedDraftsAwaitingReview: number;
  schedulesMissingReferences: number;
  foreignTemplatesMissingRateEvidence: number;
  runsScheduledInsideLockedPeriods: number;
  blocksFiscalClose: boolean;
  asOf: string;
};

export function normalizeFxReadiness(readiness: FxReadiness): AccountingCloseCheck[] {
  if (readiness.status === "NOT_APPLICABLE") {
    return [check("fx.notApplicable", "Foreign exchange close readiness", "NOT_APPLICABLE", "NOT_APPLICABLE", "FX_NOT_APPLICABLE", "No foreign-currency close activity requires review for this period.", 0, "/fx-close", false)];
  }
  if (readiness.blockers.length === 0) {
    return [check("fx.ready", "Foreign exchange close readiness", "INFORMATION", "READY", "FX_READY", "Foreign-exchange close readiness is currently clear.", 0, "/fx-close", false)];
  }
  return readiness.blockers.map((blocker) => check(`fx.${blocker.code}`, "Foreign exchange close readiness", "BLOCKER", "BLOCKED", blocker.code, blocker.message, blocker.count, blocker.actionHref, false));
}

export function normalizeRecurringReadiness(readiness: RecurringReadiness): AccountingCloseCheck[] {
  if (readiness.status === "NOT_APPLICABLE") {
    return [check("recurring.notApplicable", "Recurring transaction readiness", "NOT_APPLICABLE", "NOT_APPLICABLE", "RECURRING_NOT_APPLICABLE", "No recurring transaction templates require close review.", 0, "/recurring-transactions", false)];
  }
  const issues: Array<[keyof Pick<RecurringReadiness, "dueTemplates" | "failedRuns" | "blockedRuns" | "generatedDraftsAwaitingReview" | "schedulesMissingReferences" | "foreignTemplatesMissingRateEvidence" | "runsScheduledInsideLockedPeriods">, string, string]> = [
    ["dueTemplates", "RECURRING_DUE", "Recurring templates are due to run or review."],
    ["failedRuns", "RECURRING_FAILED", "Recurring runs failed and require review."],
    ["blockedRuns", "RECURRING_BLOCKED", "Recurring runs are blocked and require review."],
    ["generatedDraftsAwaitingReview", "RECURRING_DRAFTS", "Generated recurring drafts await review."],
    ["schedulesMissingReferences", "RECURRING_REFERENCE", "Recurring templates have missing references."],
    ["foreignTemplatesMissingRateEvidence", "RECURRING_FX_EVIDENCE", "Recurring templates need FX rate evidence."],
    ["runsScheduledInsideLockedPeriods", "RECURRING_LOCKED_PERIOD", "Recurring runs are scheduled in closed or locked periods."],
  ];
  const result = issues.filter(([field]) => readiness[field] > 0).map(([field, code, message]) =>
    check(`recurring.${String(field)}`, "Recurring transaction readiness", readiness.blocksFiscalClose ? "BLOCKER" : "WARNING", readiness.blocksFiscalClose ? "BLOCKED" : "OPEN", code, message, readiness[field], "/recurring-transactions", !readiness.blocksFiscalClose),
  );
  return result.length ? result : [check("recurring.ready", "Recurring transaction readiness", "INFORMATION", "READY", "RECURRING_READY", "Recurring transaction readiness is currently clear.", 0, "/recurring-transactions", false)];
}

export function canonicalReadinessHash(checks: Array<Omit<AccountingCloseCheck, "canAcknowledge"> & Partial<Pick<AccountingCloseCheck, "canAcknowledge">>>): string {
  const canonical = checks.map(({ sourceUpdatedAt: _sourceUpdatedAt, canAcknowledge: _canAcknowledge, ...check }) => check).sort((left, right) => left.key.localeCompare(right.key));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function check(key: string, title: string, severity: AccountingCloseSeverity, status: AccountingCloseCheckStatus, code: string, safeMessage: string, count: number, detailsHref: string, canAcknowledge: boolean): AccountingCloseCheck {
  return { key, title, severity, status, code, safeMessage, count, detailsHref, canAcknowledge };
}
