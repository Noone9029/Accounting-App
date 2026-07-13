"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerAlert, LedgerButton, LedgerDataTable, LedgerEmptyState, LedgerErrorState, LedgerFieldLabel, LedgerFieldText, LedgerInput, LedgerLoadingState, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerSelect, LedgerStatusBadge } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";

type Cycle = { id: string; fiscalPeriodId: string; status: string; version: number; readinessHash: string | null; fiscalPeriod: { name: string; status: string }; taskCount: number; evidenceCount: number; snapshotCount: number; lastRefreshedAt?: string | null };
type Task = { id: string; title: string; source: string; severity: string; status: string; isRequired: boolean; assignedToUserId: string | null };
type TaskPage = { items: Task[]; meta: { totalItems: number } };

export default function AccountingCloseCyclePage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceReportType, setEvidenceReportType] = useState("TRIAL_BALANCE");
  const [evidenceTaskId, setEvidenceTaskId] = useState("");
  const requestId = useRef(0);
  const canManage = canAny(PERMISSIONS.accountingClose.manage);

  useEffect(() => {
    requestId.current += 1;
    setCycle(null); setTasks([]); setError(""); setRunning(null); setEvidenceLabel(""); setEvidenceTaskId("");
    if (organizationId && cycleId) void load(); else setLoading(false);
  }, [organizationId, cycleId]);

  async function load() {
    const current = ++requestId.current;
    setLoading(true); setError(""); setCycle(null); setTasks([]);
    try {
      const [nextCycle, nextTasks] = await Promise.all([
        apiRequest<Cycle>(`/accounting-close/cycles/${encodeURIComponent(cycleId)}`),
        apiRequest<TaskPage>(`/accounting-close/cycles/${encodeURIComponent(cycleId)}/tasks?page=1&pageSize=100`),
      ]);
      if (current !== requestId.current) return;
      setCycle(nextCycle); setTasks(nextTasks.items);
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : "Unable to load the close cycle."); }
    finally { if (current === requestId.current) setLoading(false); }
  }

  async function transition(action: "refresh" | "prepare" | "review" | "close" | "lock") {
    if (!cycle) return;
    if ((action === "close" || action === "lock") && !window.confirm(`${action === "lock" ? "Locking" : "Closing"} ${cycle.fiscalPeriod.name} changes the fiscal period through the authoritative accounting workflow. Continue?`)) return;
    const expectedVersion = cycle.version;
    const context = requestId.current;
    setRunning(action); setError("");
    try {
      await apiRequest(`/accounting-close/cycles/${cycle.id}/${action}`, { method: "POST", body: { expectedVersion } });
      if (context === requestId.current) { setRunning(null); await load(); }
    } catch (cause) { if (context === requestId.current) setError(cause instanceof Error ? cause.message : `Unable to ${action} this close cycle.`); }
    finally { if (context === requestId.current) setRunning(null); }
  }

  async function mutateTask(task: Task, action: "complete" | "reopen") {
    if (!cycle) return;
    const reopenReason = action === "reopen" ? window.prompt(`Why is ${task.title} being reopened?`)?.trim() : undefined;
    if (action === "reopen" && !reopenReason) return;
    const context = requestId.current;
    setRunning(`${action}:${task.id}`); setError("");
    try {
      await apiRequest(`/accounting-close/cycles/${cycle.id}/tasks/${task.id}/${action}`, { method: "POST", body: action === "complete" ? { expectedVersion: cycle.version } : { expectedVersion: cycle.version, reopenReason } });
      if (context === requestId.current) { setRunning(null); await load(); }
    } catch (cause) { if (context === requestId.current) setError(cause instanceof Error ? cause.message : `Unable to ${action} this task.`); }
    finally { if (context === requestId.current) setRunning(null); }
  }

  async function attachEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cycle || !evidenceLabel.trim()) return;
    const context = requestId.current;
    setRunning("evidence"); setError("");
    try {
      await apiRequest(`/accounting-close/cycles/${cycle.id}/evidence`, { method: "POST", body: { expectedVersion: cycle.version, evidenceType: "REPORT", reportType: evidenceReportType, safeLabel: evidenceLabel.trim(), ...(evidenceTaskId ? { closeTaskId: evidenceTaskId } : {}) } });
      if (context === requestId.current) { setEvidenceLabel(""); setRunning(null); await load(); }
    } catch (cause) { if (context === requestId.current) setError(cause instanceof Error ? cause.message : "Unable to attach safe evidence."); }
    finally { if (context === requestId.current) setRunning(null); }
  }

  const statusTone = cycle?.status === "LOCKED" ? "danger" : cycle?.status === "REVIEWED" ? "success" : cycle?.status === "READY_FOR_REVIEW" ? "warning" : "info";
  const tasksMutable = cycle?.fiscalPeriod.status === "OPEN" && ["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status);
  return <LedgerPage>
    <LedgerPageHeader eyebrow="Accounting controls" title={cycle ? `${cycle.fiscalPeriod.name} close cycle` : "Close cycle"} description="Checklist, readiness snapshots, and fiscal-period actions remain guarded by the authoritative close workflow." badge={cycle ? <LedgerStatusBadge tone={statusTone}>{cycle.status.replaceAll("_", " ")}</LedgerStatusBadge> : undefined} actions={<LedgerButton href="/accounting-close" variant="quiet">All close cycles</LedgerButton>} />
    <LedgerPageBody>
      {loading ? <LedgerLoadingState title="Loading close cycle" /> : null}
      {error ? <LedgerErrorState title="Unable to load close cycle" description={error} action={<LedgerButton onClick={() => void load()}>Try again</LedgerButton>} /> : null}
      {cycle ? <>
        <LedgerPanel>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><h2 className="text-base font-semibold text-ink">Readiness control</h2><p className="mt-1 break-all text-sm text-steel">Current hash: {cycle.readinessHash ?? "Not captured yet"}</p></div><div className="flex flex-wrap gap-2">{canManage ? <LedgerButton onClick={() => void transition("refresh")} disabled={running !== null}>{running === "refresh" ? "Refreshing..." : "Refresh readiness"}</LedgerButton> : null}{cycle.status === "IN_PROGRESS" && canAny(PERMISSIONS.accountingClose.prepare) ? <LedgerButton variant="primary" onClick={() => void transition("prepare")} disabled={running !== null}>Prepare for review</LedgerButton> : null}{cycle.status === "READY_FOR_REVIEW" && canAny(PERMISSIONS.accountingClose.review) ? <LedgerButton variant="primary" onClick={() => void transition("review")} disabled={running !== null}>Record review</LedgerButton> : null}{cycle.status === "REVIEWED" && canAny(PERMISSIONS.accountingClose.close) ? <LedgerButton variant="danger" onClick={() => void transition("close")} disabled={running !== null}>Close period</LedgerButton> : null}{cycle.status === "CLOSED" && canAny(PERMISSIONS.accountingClose.lock) ? <LedgerButton variant="danger" onClick={() => void transition("lock")} disabled={running !== null}>Lock period</LedgerButton> : null}</div></div>
        </LedgerPanel>
        <LedgerPanel><dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Metric label="Tasks" value={cycle.taskCount} /><Metric label="Evidence links" value={cycle.evidenceCount} /><Metric label="Snapshots" value={cycle.snapshotCount} /><Metric label="Fiscal period" value={cycle.fiscalPeriod.status} /></dl></LedgerPanel>
        <LedgerPanel><h2 className="text-base font-semibold text-ink">Manual close checklist</h2><p className="mt-1 text-sm text-steel">System checks cannot be manually completed or reopened. Manual task changes are versioned and audited by the existing close workflow.</p>{tasks.length ? <div className="mt-4"><LedgerDataTable minWidth="820px"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{tasks.map((task) => <tr key={task.id}><td className="px-4 py-3 font-medium text-ink">{task.title}</td><td className="px-4 py-3 text-steel">{task.source.replaceAll("_", " ")}</td><td className="px-4 py-3 text-steel">{task.isRequired ? "Required" : "Optional"}</td><td className="px-4 py-3"><LedgerStatusBadge tone={task.status === "COMPLETED" ? "success" : "neutral"}>{task.status.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-right">{canManage && tasksMutable && task.source !== "SYSTEM" && ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status) ? <LedgerButton size="sm" onClick={() => void mutateTask(task, "complete")} disabled={running !== null} aria-label={`Complete task: ${task.title}`}>Complete</LedgerButton> : null}{canManage && tasksMutable && task.source !== "SYSTEM" && task.status === "COMPLETED" ? <LedgerButton size="sm" onClick={() => void mutateTask(task, "reopen")} disabled={running !== null} aria-label={`Reopen task: ${task.title}`}>Reopen</LedgerButton> : null}</td></tr>)}</tbody></LedgerDataTable></div> : <LedgerEmptyState title="No close tasks were returned." description="Refresh the cycle or contact an accountant administrator if the template should contain manual tasks." />}</LedgerPanel>
        {canManage && tasksMutable ? <LedgerPanel><h2 className="text-base font-semibold text-ink">Link supporting evidence</h2><p className="mt-1 text-sm text-steel">This creates a safe reference to an existing report type. It does not upload documents or expose report contents.</p><form onSubmit={attachEvidence} className="mt-4 grid gap-3 md:grid-cols-2"><LedgerFieldLabel><LedgerFieldText>Safe label</LedgerFieldText><LedgerInput value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} maxLength={160} required placeholder="June trial balance reviewed" /></LedgerFieldLabel><LedgerFieldLabel><LedgerFieldText>Report type</LedgerFieldText><LedgerSelect value={evidenceReportType} onChange={(event) => setEvidenceReportType(event.target.value)}><option value="TRIAL_BALANCE">Trial balance</option><option value="PROFIT_AND_LOSS">Profit and loss</option><option value="BALANCE_SHEET">Balance sheet</option><option value="CASH_FLOW">Cash flow</option><option value="AR_AGING">AR aging</option><option value="AP_AGING">AP aging</option><option value="VAT_SUMMARY">VAT summary</option></LedgerSelect></LedgerFieldLabel><LedgerFieldLabel><LedgerFieldText>Related manual task (optional)</LedgerFieldText><LedgerSelect value={evidenceTaskId} onChange={(event) => setEvidenceTaskId(event.target.value)}><option value="">Cycle-level evidence</option>{tasks.filter((task) => task.source !== "SYSTEM").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</LedgerSelect></LedgerFieldLabel><div className="flex items-end"><LedgerButton type="submit" disabled={running !== null}>{running === "evidence" ? "Linking..." : "Link evidence"}</LedgerButton></div></form></LedgerPanel> : null}
        <LedgerAlert tone="info">Closing and locking never auto-post drafts or correct accounting records. Each action revalidates readiness against the current fiscal-period authority.</LedgerAlert>
      </> : null}
    </LedgerPageBody>
  </LedgerPage>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md bg-mist px-3 py-2"><dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 font-medium text-ink">{value}</dd></div>; }
