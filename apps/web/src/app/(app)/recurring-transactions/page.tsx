"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, FilePlus2 } from "lucide-react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert, LedgerButton, LedgerDataTable, LedgerEmptyState, LedgerFieldLabel, LedgerFieldText,
  LedgerFilterBar, LedgerLoadingState, LedgerMetricGrid, LedgerPage, LedgerPageBody, LedgerPageHeader,
  LedgerPanel, LedgerSelect, LedgerStatCard, LedgerStatusBadge, LedgerToolbar,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { PERMISSIONS } from "@/lib/permissions";
import { getRecurringReadiness, listRecurringTemplates, type RecurringReadiness, type RecurringTemplate, type RecurringRunStatus } from "@/lib/recurring-transactions";

export default function RecurringTransactionsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canRead = can(PERMISSIONS.recurringTransactions.read);
  const canManage = can(PERMISSIONS.recurringTransactions.manage);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [readiness, setReadiness] = useState<RecurringReadiness | null>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setPage(1); }, [organizationId]);

  useEffect(() => {
    setTemplates([]); setReadiness(null); setError("");
    if (!organizationId || !canRead) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getRecurringReadiness(),
      listRecurringTemplates({ transactionType: type || undefined, status: status || undefined, page, limit: 25 }),
    ]).then(([readinessResult, pageResult]) => {
      if (!cancelled) { setReadiness(readinessResult); setTemplates(pageResult.items); setTotalPages(pageResult.totalPages); }
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load recurring transactions.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canRead, organizationId, page, status, type]);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Accounting automation"
        title="Recurring transactions"
        description="Schedule repeat work across invoices, bills, expense proposals, and manual journals—with review evidence before anything posts."
        badge={<LedgerStatusBadge tone="draft">Draft-only generation</LedgerStatusBadge>}
        actions={canManage ? <LedgerButton href="/recurring-transactions/new" icon={FilePlus2} variant="primary">New template</LedgerButton> : null}
      />
      <LedgerPageBody>
        <LedgerAlert tone="warning" title="Review before posting">
          Generated records stay in draft. Expense schedules create review proposals; no run silently posts a journal or moves money.
        </LedgerAlert>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to review recurring transactions.</LedgerAlert> : null}
        {organizationId && !canRead ? <LedgerAlert tone="warning">Recurring transaction read permission is required.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading recurring workspace" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {organizationId && canRead && readiness ? <ReadinessBand readiness={readiness} /> : null}
        {organizationId && canRead ? (
          <LedgerToolbar title="Templates" description="Filter the work queue, then open a template for schedule, run, and exception evidence.">
            <LedgerFilterBar>
              <LedgerFieldLabel className="min-w-52"><LedgerFieldText>Transaction type</LedgerFieldText>
                <LedgerSelect aria-label="Transaction type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
                  <option value="">All types</option><option value="SALES_INVOICE">Sales invoices</option><option value="PURCHASE_BILL">Purchase bills</option><option value="EXPENSE">Expense proposals</option><option value="MANUAL_JOURNAL">Manual journals</option>
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerFieldLabel className="min-w-44"><LedgerFieldText>Template status</LedgerFieldText>
                <LedgerSelect aria-label="Template status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                  <option value="">All statuses</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option>
                </LedgerSelect>
              </LedgerFieldLabel>
            </LedgerFilterBar>
          </LedgerToolbar>
        ) : null}
        {organizationId && canRead && !loading ? <TemplateTable templates={templates} canManage={canManage} /> : null}
        {organizationId && canRead && totalPages > 1 ? <div className="flex items-center justify-end gap-2"><LedgerButton size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</LedgerButton><span className="text-xs text-steel">Page {page} of {totalPages}</span><LedgerButton size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</LedgerButton></div> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function ReadinessBand({ readiness }: { readiness: RecurringReadiness }) {
  return (
    <LedgerPanel>
      <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" /><h2 className="text-base font-semibold text-ink">Attention queue</h2></div>
      <LedgerMetricGrid>
        <LedgerStatCard label="Due now" value={`${readiness.dueTemplates} due`} detail={`${readiness.activeTemplates} active templates`} icon={CalendarClock} />
        <LedgerStatCard label="Blocked" value={`${readiness.blockedRuns} blocked`} detail={`${readiness.failedRuns} failed runs`} />
        <LedgerStatCard label="Draft review" value={readiness.generatedDraftsAwaitingReview} detail="Generated drafts or proposals awaiting action" />
        <LedgerStatCard label="Reference checks" value={readiness.schedulesMissingReferences + readiness.foreignTemplatesMissingRateEvidence} detail="Missing catalog or FX evidence" />
      </LedgerMetricGrid>
    </LedgerPanel>
  );
}

function TemplateTable({ templates, canManage }: { templates: RecurringTemplate[]; canManage: boolean }) {
  if (!templates.length) return <LedgerEmptyState title="No recurring templates" description="Create a draft template, validate its references, then activate its schedule." action={canManage ? <LedgerButton href="/recurring-transactions/new" variant="primary">New template</LedgerButton> : null} />;
  return (
    <LedgerDataTable minWidth="1040px" className="[&_table]:text-start">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Template</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Party</th><th className="px-3 py-2">Schedule</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last run</th><th className="px-3 py-2 text-end">Action</th></tr></thead>
      <tbody className="divide-y divide-line">{templates.map((template) => {
        const lastRun = template.runs?.[0];
        return <tr key={template.id} className="hover:bg-slate-50"><td className="px-3 py-2"><bdi dir="ltr" className="font-mono text-xs text-steel">{template.templateCode}</bdi><div className="font-semibold text-ink">{template.name}</div><div className="text-xs text-steel">v{template.templateVersion} · {template.currencyCode}</div></td><td className="px-3 py-2">{typeLabel(template.transactionType)}</td><td className="px-3 py-2">{template.party?.displayName || template.party?.name || "—"}</td><td className="px-3 py-2"><div>{template.frequency.toLowerCase()} · every {template.interval}</div><bdi dir="ltr" className="font-mono text-xs text-steel">{template.nextRunAt.slice(0, 10)} · {template.timezone}</bdi></td><td className="px-3 py-2"><LedgerStatusBadge tone={templateTone(template.status)}>{template.status}</LedgerStatusBadge></td><td className="px-3 py-2">{lastRun ? <><LedgerStatusBadge tone={runTone(lastRun.status)}>{lastRun.status}</LedgerStatusBadge><div className="mt-1 text-xs text-steel">{lastRun.failureCode || `${lastRun.attemptCount} attempt(s)`}</div></> : "Never"}</td><td className="px-3 py-2 text-end"><LedgerButton href={`/recurring-transactions/${template.id}`} size="sm">Review</LedgerButton></td></tr>;
      })}</tbody>
    </LedgerDataTable>
  );
}

function typeLabel(value: RecurringTemplate["transactionType"]) { return ({ SALES_INVOICE: "Sales invoice", PURCHASE_BILL: "Purchase bill", EXPENSE: "Expense proposal", MANUAL_JOURNAL: "Manual journal" } as const)[value]; }
function templateTone(status: RecurringTemplate["status"]): "draft" | "success" | "warning" | "neutral" { if (status === "ACTIVE") return "success"; if (status === "PAUSED") return "warning"; if (status === "DRAFT") return "draft"; return "neutral"; }
function runTone(status: RecurringRunStatus): "success" | "warning" | "danger" | "neutral" { if (status === "GENERATED") return "success"; if (status === "BLOCKED") return "warning"; if (status === "FAILED") return "danger"; return "neutral"; }
