import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const documentationRoot = resolve(__dirname, "../../../../docs");
const contracts = [
  { path: "accounting/RECURRING_TRANSACTIONS_ENGINE.md", phrases: ["Sales invoices generate as `DRAFT`", "One template occurrence can produce at most one successful target", "template version", "cost centers and projects", "no live exchange-rate lookup"] },
  { path: "accounting/RECURRING_SCHEDULE_AND_TIMEZONE_POLICY.md", phrases: ["IANA timezone", "day 31", "leap-year February", "DST", "SKIP_MISSED", "bounded"] },
  { path: "accounting/RECURRING_DOCUMENT_ACCOUNTING_BOUNDARIES.md", phrases: ["purchase bills generate as drafts", "RecurringExpenseProposal", "manual journals generate as drafts", "locked period", "never moves money"] },
  { path: "product/WAFEQ_COMPETITOR_RECURRING_TRANSACTIONS.md", phrases: ["accountant review before posting", "not a current Wafeq feature assessment", "burner/demo user testing", "No provider or compliance claim"] },
  { path: "migration/RECURRING_TEMPLATE_MIGRATION.md", phrases: ["additive", "legacy recurring-invoice", "explicit reviewed commit", "serializable", "never activates imported templates"] },
  { path: "API_CATALOG.md", phrases: ["GET | `/recurring-transactions`", "POST | `/recurring-transactions/:id/run`", "GET | `/recurring-transactions/readiness`", "RECURRING_TRANSACTION_RUNS"] },
  { path: "FRONTEND_ROUTE_CATALOG.md", phrases: ["`/recurring-transactions`", "`/recurring-transactions/[id]/edit`", "draft-only"] },
  { path: "IMPLEMENTATION_STATUS.md", phrases: ["Generalized recurring transactions", "accountant month-end close workspace", "no provider, compliance, or money-movement behavior"] },
] as const;

describe("recurring transaction documentation contract", () => {
  it.each(contracts)("keeps $path complete and explicit", ({ path, phrases }) => {
    const absolutePath = resolve(documentationRoot, path);
    expect(existsSync(absolutePath)).toBe(true);
    if (!existsSync(absolutePath)) return;
    const content = readFileSync(absolutePath, "utf8");
    for (const phrase of phrases) expect(content).toContain(phrase);
  });
});
