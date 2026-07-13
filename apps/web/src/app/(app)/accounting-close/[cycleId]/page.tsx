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
type Snapshot = { id: string; status: string; capturedAt: string; blockerCount: number; warningCount: number; informationCount: number; checkCount: number; canonicalHash: string; sourceVersion: number };
type SnapshotPage = { items: Snapshot[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } };
type SnapshotDetail = Snapshot & { items: Array<{ checkKey: string; severity: string; status: string; code: string; safeMessage: string; count: number | null; currencyCode: string | null; sourceUpdatedAt: string | null; metadataSafe: { title?: string } | null }> };
type SnapshotComparison = { changeCount: number; changes: Array<{ checkKey: string; changeType: string; before: { safeMessage: string } | null; after: { safeMessage: string } | null }> };

export default function AccountingCloseCyclePage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotPage["meta"] | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [snapshotDetail, setSnapshotDetail] = useState<SnapshotDetail | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotPageLoading, setSnapshotPageLoading] = useState(false);
  const [baselineSnapshotId, setBaselineSnapshotId] = useState("");
  const [comparisonSnapshotId, setComparisonSnapshotId] = useState("");
  const [snapshotComparison, setSnapshotComparison] = useState<SnapshotComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceReportType, setEvidenceReportType] = useState("TRIAL_BALANCE");
  const [evidenceTaskId, setEvidenceTaskId] = useState("");
  const requestId = useRef(0);
  const snapshotRequestId = useRef(0);
  const comparisonRequestId = useRef(0);
  const canManage = canAny(PERMISSIONS.accountingClose.manage);

  useEffect(() => {
    requestId.current += 1;
    snapshotRequestId.current += 1;
    comparisonRequestId.current += 1;
    setCycle(null); setTasks([]); setSnapshots([]); setSnapshotMeta(null); setSelectedSnapshot(null); setSnapshotDetail(null); setSnapshotLoading(false); setSnapshotPageLoading(false); setBaselineSnapshotId(""); setComparisonSnapshotId(""); setSnapshotComparison(null); setComparisonLoading(false); setError(""); setRunning(null); setEvidenceLabel(""); setEvidenceTaskId("");
    if (organizationId && cycleId) void load(); else setLoading(false);
  }, [organizationId, cycleId]);

  async function load() {
    const current = ++requestId.current;
    snapshotRequestId.current += 1;
    comparisonRequestId.current += 1;
    setLoading(true); setError(""); setCycle(null); setTasks([]); setSnapshots([]); setSnapshotMeta(null); setSelectedSnapshot(null); setSnapshotDetail(null); setSnapshotLoading(false); setSnapshotPageLoading(false); setComparisonLoading(false); setSnapshotComparison(null);
    try {
      const [nextCycle, nextTasks, nextSnapshots] = await Promise.all([
        apiRequest<Cycle>(`/accounting-close/cycles/${encodeURIComponent(cycleId)}`),
        apiRequest<TaskPage>(`/accounting-close/cycles/${encodeURIComponent(cycleId)}/tasks?page=1&pageSize=100`),
        apiRequest<SnapshotPage>(`/accounting-close/cycles/${encodeURIComponent(cycleId)}/snapshots?page=1&pageSize=100`),
      ]);
      if (current !== requestId.current) return;
      setCycle(nextCycle); setTasks(nextTasks.items); setSnapshots(nextSnapshots.items); setSnapshotMeta(nextSnapshots.meta);
    } catch (cause) { if (current === requestId.current) setError(cause instanceof Error ? cause.message : "Unable to load the close cycle."); }
    finally { if (current === requestId.current) setLoading(false); }
  }

  async function loadSnapshotPage(page: number) {
    const context = ++snapshotRequestId.current;
    comparisonRequestId.current += 1;
    setSnapshotPageLoading(true); setSelectedSnapshot(null); setSnapshotDetail(null); setSnapshotLoading(false); setBaselineSnapshotId(""); setComparisonSnapshotId(""); setSnapshotComparison(null); setComparisonLoading(false); setError("");
    try {
      const nextSnapshots = await apiRequest<SnapshotPage>(`/accounting-close/cycles/${encodeURIComponent(cycleId)}/snapshots?page=${page}&pageSize=100`);
      if (context === snapshotRequestId.current) { setSnapshots(nextSnapshots.items); setSnapshotMeta(nextSnapshots.meta); }
    } catch (cause) { if (context === snapshotRequestId.current) setError(cause instanceof Error ? cause.message : "Unable to load immutable snapshot history."); }
    finally { if (context === snapshotRequestId.current) setSnapshotPageLoading(false); }
  }

  async function showSnapshot(snapshot: Snapshot) {
    const context = ++snapshotRequestId.current;
    setSelectedSnapshot(snapshot); setSnapshotDetail(null); setSnapshotLoading(true); setError("");
    try {
      const detail = await apiRequest<SnapshotDetail>(`/accounting-close/cycles/${encodeURIComponent(cycleId)}/snapshots/${encodeURIComponent(snapshot.id)}`);
      if (context === snapshotRequestId.current) setSnapshotDetail(detail);
    } catch (cause) { if (context === snapshotRequestId.current) setError(cause instanceof Error ? cause.message : "Unable to load immutable snapshot evidence."); }
    finally { if (context === snapshotRequestId.current) setSnapshotLoading(false); }
  }

  async function compareSnapshots() {
    if (!baselineSnapshotId || !comparisonSnapshotId || baselineSnapshotId === comparisonSnapshotId) return;
    const context = ++comparisonRequestId.current;
    const baselineId = baselineSnapshotId;
    const comparisonId = comparisonSnapshotId;
    const cycleContext = cycleId;
    const organizationContext = organizationId;
    setComparisonLoading(true); setSnapshotComparison(null); setError("");
    try { const result = await apiRequest<SnapshotComparison>(`/accounting-close/cycles/${encodeURIComponent(cycleContext)}/snapshots/${encodeURIComponent(comparisonId)}/compare?baselineSnapshotId=${encodeURIComponent(baselineId)}`); if (context === comparisonRequestId.current && cycleContext === cycleId && organizationContext === organizationId && baselineId === baselineSnapshotId && comparisonId === comparisonSnapshotId) setSnapshotComparison(result); }
    catch (cause) { if (context === comparisonRequestId.current) setError(cause instanceof Error ? cause.message : "Unable to compare immutable snapshots."); }
    finally { if (context === comparisonRequestId.current) setComparisonLoading(false); }
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
        <LedgerPanel>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-base font-semibold text-ink">Immutable snapshot history</h2><p className="mt-1 text-sm text-steel">Captured readiness is retained as close workflow evidence. Select a snapshot to inspect its safe, frozen checks.</p></div>
            <span className="text-sm text-steel">Showing {snapshots.length} of {snapshotMeta?.totalItems ?? 0} snapshots</span>
          </div>
          {snapshots.length ? <div className="mt-4"><LedgerDataTable minWidth="760px"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Captured</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Readiness</th><th className="px-4 py-3">Canonical hash</th><th className="px-4 py-3 text-right">Evidence</th></tr></thead><tbody className="divide-y divide-slate-100">{snapshots.map((snapshot) => <tr key={snapshot.id}><td className="px-4 py-3 text-steel">{new Date(snapshot.capturedAt).toLocaleString()}</td><td className="px-4 py-3"><LedgerStatusBadge tone={snapshot.status === "REVIEWED" ? "success" : snapshot.status === "LOCKED" ? "danger" : "info"}>{snapshot.status.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-steel">{snapshot.blockerCount} blockers · {snapshot.warningCount} warnings · {snapshot.checkCount} checks</td><td className="max-w-48 truncate px-4 py-3 font-mono text-xs text-steel" title={snapshot.canonicalHash}>{snapshot.canonicalHash}</td><td className="px-4 py-3 text-right"><LedgerButton size="sm" variant="quiet" onClick={() => void showSnapshot(snapshot)} disabled={snapshotPageLoading || (snapshotLoading && selectedSnapshot?.id === snapshot.id)} aria-label={`View snapshot evidence: ${snapshot.status} captured ${snapshot.capturedAt} ${snapshot.canonicalHash.slice(0, 8)}`}>{snapshotLoading && selectedSnapshot?.id === snapshot.id ? "Loading..." : "View evidence"}</LedgerButton></td></tr>)}</tbody></LedgerDataTable></div> : <LedgerEmptyState title="No readiness snapshots captured yet." description="Refresh readiness or prepare the cycle to capture immutable workflow evidence." />}
          {snapshotMeta && snapshotMeta.totalPages > 1 ? <div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-steel">Page {snapshotMeta.page} of {snapshotMeta.totalPages}</span><div className="flex gap-2"><LedgerButton size="sm" variant="quiet" onClick={() => void loadSnapshotPage(snapshotMeta.page - 1)} disabled={snapshotMeta.page <= 1 || snapshotPageLoading} aria-label="Previous snapshot page">Previous</LedgerButton><LedgerButton size="sm" variant="quiet" onClick={() => void loadSnapshotPage(snapshotMeta.page + 1)} disabled={snapshotMeta.page >= snapshotMeta.totalPages || snapshotPageLoading} aria-label="Next snapshot page">Next</LedgerButton></div></div> : null}
          {selectedSnapshot ? <div className="mt-4 rounded-md border border-line bg-mist p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold text-ink">Snapshot evidence</h3><p className="mt-1 text-sm text-steel">{selectedSnapshot.status.replaceAll("_", " ")} · version {selectedSnapshot.sourceVersion} · {new Date(selectedSnapshot.capturedAt).toLocaleString()}</p></div><code className="break-all text-xs text-steel">{selectedSnapshot.canonicalHash}</code></div>{snapshotLoading ? <p className="mt-4 text-sm text-steel">Loading frozen check evidence…</p> : null}{snapshotDetail ? <div className="mt-4"><LedgerDataTable minWidth="700px"><thead className="bg-white text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Check</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Count</th></tr></thead><tbody className="divide-y divide-slate-200">{snapshotDetail.items.map((item) => <tr key={item.checkKey}><td className="px-4 py-3"><p className="font-medium text-ink">{item.metadataSafe?.title ?? item.code}</p><p className="mt-1 font-mono text-xs text-steel">{item.checkKey}</p></td><td className="px-4 py-3"><LedgerStatusBadge tone={item.severity === "BLOCKER" ? "danger" : item.severity === "WARNING" ? "warning" : "info"}>{item.status.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-steel">{item.safeMessage}</td><td className="px-4 py-3 text-steel">{item.count ?? "—"}{item.currencyCode ? ` ${item.currencyCode}` : ""}</td></tr>)}</tbody></LedgerDataTable></div> : null}</div> : null}
          {snapshots.length > 1 ? <div className="mt-4 border-t border-line pt-4"><h3 className="font-semibold text-ink">Compare frozen snapshots</h3><p className="mt-1 text-sm text-steel">Compare two captured states to see only check-level changes.</p><div className="mt-3 grid gap-3 md:grid-cols-3"><LedgerFieldLabel><LedgerFieldText>Baseline snapshot</LedgerFieldText><LedgerSelect aria-label="Baseline snapshot" value={baselineSnapshotId} onChange={(event) => { comparisonRequestId.current += 1; setComparisonLoading(false); setBaselineSnapshotId(event.target.value); setSnapshotComparison(null); }}><option value="">Select baseline</option>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.status} · {snapshot.capturedAt}</option>)}</LedgerSelect></LedgerFieldLabel><LedgerFieldLabel><LedgerFieldText>Comparison snapshot</LedgerFieldText><LedgerSelect aria-label="Comparison snapshot" value={comparisonSnapshotId} onChange={(event) => { comparisonRequestId.current += 1; setComparisonLoading(false); setComparisonSnapshotId(event.target.value); setSnapshotComparison(null); }}><option value="">Select comparison</option>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.status} · {snapshot.capturedAt}</option>)}</LedgerSelect></LedgerFieldLabel><div className="flex items-end"><LedgerButton onClick={() => void compareSnapshots()} disabled={comparisonLoading || !baselineSnapshotId || !comparisonSnapshotId || baselineSnapshotId === comparisonSnapshotId}>{comparisonLoading ? "Comparing..." : "Compare snapshots"}</LedgerButton></div></div>{snapshotComparison ? <div className="mt-4"><p className="text-sm text-steel">{snapshotComparison.changeCount} changed checks</p><LedgerDataTable minWidth="700px"><thead className="bg-white text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Check</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Before</th><th className="px-4 py-3">After</th></tr></thead><tbody className="divide-y divide-slate-200">{snapshotComparison.changes.map((change) => <tr key={change.checkKey}><td className="px-4 py-3 font-mono text-xs text-ink">{change.checkKey}</td><td className="px-4 py-3"><LedgerStatusBadge tone={change.changeType === "ADDED" ? "danger" : change.changeType === "REMOVED" ? "neutral" : "warning"}>{change.changeType}</LedgerStatusBadge></td><td className="px-4 py-3 text-steel">{change.before?.safeMessage ?? "—"}</td><td className="px-4 py-3 text-steel">{change.after?.safeMessage ?? "—"}</td></tr>)}</tbody></LedgerDataTable></div> : null}</div> : null}
        </LedgerPanel>
        <LedgerPanel><h2 className="text-base font-semibold text-ink">Manual close checklist</h2><p className="mt-1 text-sm text-steel">System checks cannot be manually completed or reopened. Manual task changes are versioned and audited by the existing close workflow.</p>{tasks.length ? <div className="mt-4"><LedgerDataTable minWidth="820px"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{tasks.map((task) => <tr key={task.id}><td className="px-4 py-3 font-medium text-ink">{task.title}</td><td className="px-4 py-3 text-steel">{task.source.replaceAll("_", " ")}</td><td className="px-4 py-3 text-steel">{task.isRequired ? "Required" : "Optional"}</td><td className="px-4 py-3"><LedgerStatusBadge tone={task.status === "COMPLETED" ? "success" : "neutral"}>{task.status.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-right">{canManage && tasksMutable && task.source !== "SYSTEM" && ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status) ? <LedgerButton size="sm" onClick={() => void mutateTask(task, "complete")} disabled={running !== null} aria-label={`Complete task: ${task.title}`}>Complete</LedgerButton> : null}{canManage && tasksMutable && task.source !== "SYSTEM" && task.status === "COMPLETED" ? <LedgerButton size="sm" onClick={() => void mutateTask(task, "reopen")} disabled={running !== null} aria-label={`Reopen task: ${task.title}`}>Reopen</LedgerButton> : null}</td></tr>)}</tbody></LedgerDataTable></div> : <LedgerEmptyState title="No close tasks were returned." description="Refresh the cycle or contact an accountant administrator if the template should contain manual tasks." />}</LedgerPanel>
        {canManage && tasksMutable ? <LedgerPanel><h2 className="text-base font-semibold text-ink">Link supporting evidence</h2><p className="mt-1 text-sm text-steel">This creates a safe reference to an existing report type. It does not upload documents or expose report contents.</p><form onSubmit={attachEvidence} className="mt-4 grid gap-3 md:grid-cols-2"><LedgerFieldLabel><LedgerFieldText>Safe label</LedgerFieldText><LedgerInput value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} maxLength={160} required placeholder="June trial balance reviewed" /></LedgerFieldLabel><LedgerFieldLabel><LedgerFieldText>Report type</LedgerFieldText><LedgerSelect value={evidenceReportType} onChange={(event) => setEvidenceReportType(event.target.value)}><option value="TRIAL_BALANCE">Trial balance</option><option value="PROFIT_AND_LOSS">Profit and loss</option><option value="BALANCE_SHEET">Balance sheet</option><option value="CASH_FLOW">Cash flow</option><option value="AR_AGING">AR aging</option><option value="AP_AGING">AP aging</option><option value="VAT_SUMMARY">VAT summary</option></LedgerSelect></LedgerFieldLabel><LedgerFieldLabel><LedgerFieldText>Related manual task (optional)</LedgerFieldText><LedgerSelect value={evidenceTaskId} onChange={(event) => setEvidenceTaskId(event.target.value)}><option value="">Cycle-level evidence</option>{tasks.filter((task) => task.source !== "SYSTEM").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</LedgerSelect></LedgerFieldLabel><div className="flex items-end"><LedgerButton type="submit" disabled={running !== null}>{running === "evidence" ? "Linking..." : "Link evidence"}</LedgerButton></div></form></LedgerPanel> : null}
        <LedgerAlert tone="info">Closing and locking never auto-post drafts or correct accounting records. Each action revalidates readiness against the current fiscal-period authority.</LedgerAlert>
      </> : null}
    </LedgerPageBody>
  </LedgerPage>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md bg-mist px-3 py-2"><dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 font-medium text-ink">{value}</dd></div>; }
