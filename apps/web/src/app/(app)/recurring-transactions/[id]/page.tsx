"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Play, TriangleAlert } from "lucide-react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert, LedgerButton, LedgerDataTable, LedgerEmptyState, LedgerLoadingState, LedgerPage, LedgerPageBody,
  LedgerPageHeader, LedgerPanel, LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getRecurringTemplate, listRecurringRuns, runRecurringTemplate, transitionRecurringTemplate,
  type RecurringRun, type RecurringRunStatus, type RecurringTemplate,
} from "@/lib/recurring-transactions";

export default function RecurringTransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canRead = can(PERMISSIONS.recurringTransactions.read);
  const canManage = can(PERMISSIONS.recurringTransactions.manage);
  const canRun = can(PERMISSIONS.recurringTransactions.run);
  const [template, setTemplate] = useState<RecurringTemplate | null>(null);
  const [runs, setRuns] = useState<RecurringRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTemplate(null); setRuns([]); setError(""); setSuccess("");
    if (!organizationId || !id || !canRead) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getRecurringTemplate(id), listRecurringRuns(id)]).then(([templateResult, runPage]) => {
      if (!cancelled) { setTemplate(templateResult); setRuns(runPage.items); }
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load recurring template.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canRead, id, organizationId]);

  async function runNow() {
    if (!template || action) return;
    setAction("run"); setError(""); setSuccess("");
    try {
      const key = `web:${template.id}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
      const result = await runRecurringTemplate(template.id, key);
      setRuns((current) => [result, ...current.filter((run) => run.id !== result.id)]);
      setSuccess(result.status === "GENERATED" ? "Draft generated for review." : `Run finished with status ${result.status}.`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run this template.");
    } finally { setAction(""); }
  }

  async function transition(nextAction: "activate" | "pause" | "resume" | "archive") {
    if (!template || action) return;
    setAction(nextAction); setError(""); setSuccess("");
    try {
      const updated = await transitionRecurringTemplate(template.id, nextAction);
      setTemplate(updated);
      setSuccess(`Template ${nextAction === "activate" ? "activated" : nextAction === "pause" ? "paused" : nextAction === "resume" ? "resumed" : "archived"}.`);
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "Unable to change template status.");
    } finally { setAction(""); }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow={template?.templateCode ?? "Recurring transaction"}
        title={template?.name ?? "Recurring template"}
        description="Review schedule evidence, source dimensions, and every generation attempt before posting the resulting draft."
        badge={template ? <LedgerStatusBadge tone={templateTone(template.status)}>{template.status}</LedgerStatusBadge> : null}
        actions={<><LedgerButton href="/recurring-transactions" icon={ArrowLeft}>Back</LedgerButton>{template && canManage && template.status === "DRAFT" ? <LedgerButton onClick={() => void transition("activate")} disabled={Boolean(action)}>Activate</LedgerButton> : null}{template && canManage && template.status === "ACTIVE" ? <LedgerButton onClick={() => void transition("pause")} disabled={Boolean(action)}>Pause</LedgerButton> : null}{template && canManage && template.status === "PAUSED" ? <LedgerButton onClick={() => void transition("resume")} disabled={Boolean(action)}>Resume</LedgerButton> : null}{template && canRun && template.status === "ACTIVE" ? <LedgerButton icon={Play} variant="primary" onClick={() => void runNow()} disabled={Boolean(action)}>{action === "run" ? "Running…" : "Run now"}</LedgerButton> : null}</>}
      />
      <LedgerPageBody>
        <LedgerAlert tone="warning" title="Draft-only automation">Generated records remain drafts or expense review proposals. Run Now does not post accounting, send payments, or move money.</LedgerAlert>
        {!organizationId ? <LedgerAlert tone="info">Select an organization to review this template.</LedgerAlert> : null}
        {organizationId && !canRead ? <LedgerAlert tone="warning">Recurring transaction read permission is required.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading recurring template" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {template ? <><TemplateSummary template={template} /><LineEvidence template={template} /><RunHistory runs={runs} /></> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function TemplateSummary({ template }: { template: RecurringTemplate }) {
  const details = [
    ["Transaction", typeLabel(template.transactionType)], ["Party", template.party?.displayName || template.party?.name || "Not applicable"],
    ["Schedule", `${template.frequency.toLowerCase()} · every ${template.interval}`], ["Timezone", template.timezone],
    ["Next run", template.nextRunAt.slice(0, 10)], ["Catch-up", template.catchUpPolicy.replaceAll("_", " ").toLowerCase()],
    ["Currency", template.currencyCode], ["FX evidence", template.exchangeRatePolicy.replaceAll("_", " ").toLowerCase()],
  ];
  return <LedgerPanel><div className="mb-4 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-palm" aria-hidden="true" /><h2 className="text-base font-semibold text-ink">Schedule and accounting policy</h2></div><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 text-sm text-ink"><bdi dir={label === "Timezone" || label === "Next run" ? "ltr" : undefined}>{value}</bdi></dd></div>)}</dl></LedgerPanel>;
}

function LineEvidence({ template }: { template: RecurringTemplate }) {
  return <LedgerPanel><h2 className="mb-3 text-base font-semibold text-ink">Source lines and dimensions</h2><LedgerDataTable minWidth="980px"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Account</th><th className="px-3 py-2">Cost center</th><th className="px-3 py-2">Project</th><th className="px-3 py-2 text-end">Quantity</th><th className="px-3 py-2 text-end">Unit price</th></tr></thead><tbody className="divide-y divide-line">{template.lines.map((line) => <tr key={line.id ?? line.sortOrder}><td className="px-3 py-2 font-medium text-ink">{line.description}</td><td className="px-3 py-2"><bdi dir="ltr">{line.account ? `${line.account.code} · ${line.account.name}` : line.accountId}</bdi></td><td className="px-3 py-2">{line.costCenter?.name ?? "—"}</td><td className="px-3 py-2">{line.project?.name ?? "—"}</td><td className="px-3 py-2 text-end font-mono text-xs">{line.quantity}</td><td className="px-3 py-2 text-end font-mono text-xs">{line.unitPrice}</td></tr>)}</tbody></LedgerDataTable></LedgerPanel>;
}

function RunHistory({ runs }: { runs: RecurringRun[] }) {
  return <LedgerPanel><div className="mb-3 flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-amber-700" aria-hidden="true" /><h2 className="text-base font-semibold text-ink">Run history and exceptions</h2></div>{!runs.length ? <LedgerEmptyState title="No runs yet" description="Scheduled and manual attempts will appear here with immutable outcome evidence." /> : <LedgerDataTable minWidth="1050px"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Scheduled</th><th className="px-3 py-2">Trigger</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Attempt</th><th className="px-3 py-2">Exception</th><th className="px-3 py-2">Generated target</th></tr></thead><tbody className="divide-y divide-line">{runs.map((run) => <tr key={run.id}><td className="px-3 py-2"><bdi dir="ltr" className="font-mono text-xs">{run.scheduledLocalDate.slice(0, 10)}</bdi></td><td className="px-3 py-2">{run.trigger}</td><td className="px-3 py-2"><LedgerStatusBadge tone={runTone(run.status)}>{run.status}</LedgerStatusBadge></td><td className="px-3 py-2">{run.attemptCount}</td><td className="px-3 py-2"><div className="font-mono text-xs text-ink">{run.failureCode ?? "—"}</div>{run.failureMessageSafe ? <div className="mt-1 max-w-md text-xs text-steel">{run.failureMessageSafe}</div> : null}</td><td className="px-3 py-2">{generatedTarget(run)}</td></tr>)}</tbody></LedgerDataTable>}</LedgerPanel>;
}

function generatedTarget(run: RecurringRun) {
  if (run.generatedSalesInvoice) return <a className="font-medium text-palm hover:underline" href={`/sales/invoices/${run.generatedSalesInvoice.id}`}><bdi dir="ltr">{run.generatedSalesInvoice.invoiceNumber}</bdi> · {run.generatedSalesInvoice.status}</a>;
  if (run.generatedPurchaseBill) return <a className="font-medium text-palm hover:underline" href={`/purchases/bills/${run.generatedPurchaseBill.id}`}><bdi dir="ltr">{run.generatedPurchaseBill.billNumber}</bdi> · {run.generatedPurchaseBill.status}</a>;
  if (run.generatedJournalEntry) return <a className="font-medium text-palm hover:underline" href={`/journal-entries/${run.generatedJournalEntry.id}`}><bdi dir="ltr">{run.generatedJournalEntry.entryNumber}</bdi> · {run.generatedJournalEntry.status}</a>;
  if (run.generatedExpenseProposal) return <span>Expense proposal · {run.generatedExpenseProposal.status}</span>;
  return "—";
}

function typeLabel(value: RecurringTemplate["transactionType"]) { return ({ SALES_INVOICE: "Sales invoice", PURCHASE_BILL: "Purchase bill", EXPENSE: "Expense proposal", MANUAL_JOURNAL: "Manual journal" } as const)[value]; }
function templateTone(status: RecurringTemplate["status"]): "draft" | "success" | "warning" | "neutral" { if (status === "ACTIVE") return "success"; if (status === "PAUSED") return "warning"; if (status === "DRAFT") return "draft"; return "neutral"; }
function runTone(status: RecurringRunStatus): "success" | "warning" | "danger" | "neutral" { if (status === "GENERATED") return "success"; if (status === "BLOCKED") return "warning"; if (status === "FAILED") return "danger"; return "neutral"; }
