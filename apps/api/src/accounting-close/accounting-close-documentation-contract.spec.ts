import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const documentationRoot = resolve(__dirname, "../../../../docs");

const contracts = [
  {
    path: "accounting/ACCOUNTANT_MONTH_END_CLOSE_WORKSPACE.md",
    phrases: [
      "OPEN → IN_PROGRESS → READY_FOR_REVIEW → REVIEWED → CLOSED → LOCKED",
      "FiscalPeriodService.close",
      "FiscalPeriodService.lock",
      "canonical hash",
      "historical-state-unproven",
    ],
  },
  {
    path: "accounting/CLOSE_READINESS_POLICY.md",
    phrases: [
      "`BLOCKER`", "`WARNING`", "`INFORMATION`", "`NOT_APPLICABLE`",
      "cannot be manually completed", "default to `WARNING`", "Manual draft journals", "Draft sales invoices", "Draft credit notes", "Unapplied customer payments", "Draft purchase bills", "Draft purchase debit notes", "Unapplied supplier payments", "Unreconciled bank statement transactions", "scheduled local date", "fail closed",
    ],
  },
  {
    path: "accounting/CLOSE_CHECKLIST_AND_SIGNOFF.md",
    phrases: [
      "preparer and reviewer must be distinct", "single-user demonstration",
      "assigned, completed, reopened, and evidenced", "stale review",
    ],
  },
  {
    path: "accounting/FISCAL_PERIOD_CLOSE_AND_LOCK.md",
    phrases: [
      "same serializable transaction", "Lock is idempotent", "Close currently requires `REVIEWED`",
      "does not update `FiscalPeriod.status` directly",
      "no automatic accounting corrections",
    ],
  },
  {
    path: "API_CATALOG.md",
    phrases: [
      "does not include tasks, evidence, or current readiness",
      "`/accounting-close/readiness`", "`/accounting-close/cycles/:id/tasks`",
    ],
  },
  {
    path: "product/WAFEQ_COMPETITOR_ACCOUNTANT_CLOSE.md",
    phrases: [
      "not a live or current Wafeq feature assessment", "manual bank import",
      "does not claim direct bank-feed completeness", "No provider or compliance claim",
    ],
  },
] as const;

describe("accounting-close documentation contract", () => {
  it.each(contracts)("keeps $path complete and explicit", ({ path, phrases }) => {
    const absolutePath = resolve(documentationRoot, path);
    expect(existsSync(absolutePath)).toBe(true);
    if (!existsSync(absolutePath)) return;

    const content = readFileSync(absolutePath, "utf8");
    for (const phrase of phrases) expect(content).toContain(phrase);
  });
});
