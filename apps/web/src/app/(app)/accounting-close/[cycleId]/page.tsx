"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerAlert, LedgerButton, LedgerDataTable, LedgerEmptyState, LedgerErrorState, LedgerFieldLabel, LedgerFieldText, LedgerInput, LedgerLoadingState, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerSelect, LedgerStatusBadge } from "@/components/ui/ledger-system";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { accountingCloseEvidenceExportPath, downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";

type Cycle = { id: string; fiscalPeriodId: string; status: string; version: number; readinessHash: string | null; signoffMode?: "SEPARATED" | "SINGLE_USER_DEMO" | null; fiscalPeriod: { name: string; status: string }; taskCount: number; evidenceCount: number; snapshotCount: number; lastRefreshedAt?: string | null };
type Assignee = { id: string; name: string };
type Task = { id: string; title: string; source: string; severity: string; status: string; isRequired: boolean; assignedToUserId: string | null; assignedToUser?: Assignee | null };
type TaskPage = { items: Task[]; meta: { totalItems: number } };
type AssigneePage = { items: Assignee[]; meta: { totalItems: number } };
type Snapshot = { id: string; status: string; capturedAt: string; blockerCount: number; warningCount: number; informationCount: number; checkCount: number; canonicalHash: string; sourceVersion: number };
type SnapshotPage = { items: Snapshot[]; meta: { page: number; pageSize: number; totalItems: number; totalPages: number } };
type SnapshotDetail = Snapshot & { items: Array<{ checkKey: string; severity: string; status: string; code: string; safeMessage: string; count: number | null; currencyCode: string | null; sourceUpdatedAt: string | null; metadataSafe: { title?: string } | null }> };
type SnapshotComparison = { changeCount: number; changes: Array<{ checkKey: string; changeType: string; before: { safeMessage: string } | null; after: { safeMessage: string } | null }> };

const ACCOUNTING_CLOSE_REVIEW_INVALIDATED = "ACCOUNTING_CLOSE_REVIEW_INVALIDATED";
const ACCOUNTING_CLOSE_LOCK_REVALIDATION_FAILED = "ACCOUNTING_CLOSE_LOCK_REVALIDATION_FAILED";

export default function AccountingCloseCyclePage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<Assignee[] | null>(null);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState("");
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
  const [evidenceExporting, setEvidenceExporting] = useState<"" | "json" | "csv" | "pdf">("");
  const [evidenceExportError, setEvidenceExportError] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ kind: "cycle"; action: "return-to-preparer" | "close" | "lock" } | { kind: "task"; task: Task; action: "reopen" } | null>(null);
  const [pendingReason, setPendingReason] = useState("");
  const [error, setError] = useState("");
  const [reviewInvalidatedWarning, setReviewInvalidatedWarning] = useState("");
  const [postCloseDriftWarning, setPostCloseDriftWarning] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceReportType, setEvidenceReportType] = useState("TRIAL_BALANCE");
  const [evidenceTaskId, setEvidenceTaskId] = useState("");
  const requestId = useRef(0);
  const snapshotRequestId = useRef(0);
  const comparisonRequestId = useRef(0);
  const assigneeRequestId = useRef(0);
  const evidenceExportRequestId = useRef(0);
  const terminalMutationIdempotencyKeys = useRef(new Map<string, string>());
  const canManage = canAny(PERMISSIONS.accountingClose.manage);
  const canRead = canAny(PERMISSIONS.accountingClose.read);

  useEffect(() => {
    requestId.current += 1;
    evidenceExportRequestId.current += 1;
    snapshotRequestId.current += 1;
    comparisonRequestId.current += 1;
    terminalMutationIdempotencyKeys.current.clear();
    setCycle(null); setTasks([]); setAssignees(null); setAssigneesLoading(false); setAssigneeQuery(""); setSnapshots([]); setSnapshotMeta(null); setSelectedSnapshot(null); setSnapshotDetail(null); setSnapshotLoading(false); setSnapshotPageLoading(false); setBaselineSnapshotId(""); setComparisonSnapshotId(""); setSnapshotComparison(null); setComparisonLoading(false); setEvidenceExporting(""); setEvidenceExportError(""); setError(""); setReviewInvalidatedWarning(""); setPostCloseDriftWarning(""); setRunning(null); setEvidenceLabel(""); setEvidenceTaskId("");
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

  async function transition(action: "refresh" | "prepare" | "review" | "return-to-preparer" | "close" | "lock", returnReason?: string): Promise<boolean> {
    if (!cycle) return false;
    if (action === "return-to-preparer" && !returnReason) return false;
    const expectedVersion = cycle.version;
    const idempotencyKey = action === "close" || action === "lock"
      ? terminalMutationIdempotencyKey(terminalMutationIdempotencyKeys.current, action, cycle.id, expectedVersion)
      : undefined;
    const context = requestId.current;
    setRunning(action); setError("");
    try {
      await apiRequest(`/accounting-close/cycles/${cycle.id}/${action}`, {
        method: "POST",
        body: action === "return-to-preparer" ? { expectedVersion, returnReason } : { expectedVersion },
        ...(idempotencyKey ? { headers: { "idempotency-key": idempotencyKey } } : {}),
      });
      if (context === requestId.current) { setRunning(null); await load(); }
    } catch (cause) {
      if (context !== requestId.current) return false;
      if (action === "close" && isReviewInvalidationConflict(cause)) {
        setRunning(null);
        setReviewInvalidatedWarning("The review was invalidated because readiness changed. Refresh readiness and record a new review before closing this period.");
        await load();
        return false;
      }
      if (action === "lock" && isLockRevalidationConflict(cause)) {
        setRunning(null);
        setPostCloseDriftWarning("Close readiness changed after the fiscal period was closed. No lock was applied. Use the authorized fiscal-period reopen workflow, then return this close cycle to preparation before a fresh review and lock attempt.");
        await load();
        return false;
      }
      setError(cause instanceof Error ? cause.message : `Unable to ${action} this close cycle.`);
      return false;
    }
    finally { if (context === requestId.current) setRunning(null); }
    return true;
  }

  async function mutateTask(task: Task, action: "complete" | "reopen", reopenReason?: string): Promise<boolean> {
    if (!cycle) return false;
    if (action === "reopen" && !reopenReason) return false;
    const context = requestId.current;
    setRunning(`${action}:${task.id}`); setError("");
    try {
      await apiRequest(`/accounting-close/cycles/${cycle.id}/tasks/${task.id}/${action}`, { method: "POST", body: action === "complete" ? { expectedVersion: cycle.version } : { expectedVersion: cycle.version, reopenReason } });
      if (context === requestId.current) { setRunning(null); await load(); }
      return true;
    } catch (cause) { if (context === requestId.current) setError(cause instanceof Error ? cause.message : `Unable to ${action} this task.`); return false; }
    finally { if (context === requestId.current) setRunning(null); }
  }

  async function loadAssignableMembers(query = assigneeQuery) {
    if (!cycle) return;
    const context = requestId.current;
    const request = ++assigneeRequestId.current;
    setAssigneesLoading(true);
    try {
      const normalizedQuery = query.trim();
      const response = await apiRequest<AssigneePage>(`/accounting-close/cycles/${encodeURIComponent(cycle.id)}/assignees?${normalizedQuery ? `query=${encodeURIComponent(normalizedQuery)}&` : ""}page=1&pageSize=100`);
      if (context === requestId.current && request === assigneeRequestId.current) setAssignees(response.items);
    } catch (cause) {
      if (context === requestId.current && request === assigneeRequestId.current) setError(cause instanceof Error ? cause.message : "Unable to load eligible close assignees.");
    } finally {
      if (context === requestId.current && request === assigneeRequestId.current) setAssigneesLoading(false);
    }
  }

  async function assignTask(task: Task, assignedToUserId: string) {
    if (!cycle || !assignedToUserId || assignedToUserId === task.assignedToUserId) return;
    const context = requestId.current;
    setRunning(`assign:${task.id}`); setError("");
    try {
      await apiRequest(`/accounting-close/cycles/${cycle.id}/tasks/${task.id}/assign`, { method: "POST", body: { expectedVersion: cycle.version, assignedToUserId } });
      if (context === requestId.current) { setRunning(null); await load(); }
    } catch (cause) { if (context === requestId.current) setError(cause instanceof Error ? cause.message : "Unable to assign this close task."); }
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

  async function downloadEvidenceExport(format: "json" | "csv" | "pdf") {
    if (!cycle) return;
    const context = ++evidenceExportRequestId.current;
    const cycleContext = cycleId;
    const organizationContext = organizationId;
    setEvidenceExporting(format); setEvidenceExportError("");
    try {
      await downloadAuthenticatedFile(accountingCloseEvidenceExportPath(cycle.id, format), `accounting-close-${cycle.id}-evidence.${format}`);
    } catch (cause) {
      if (context === evidenceExportRequestId.current && cycleContext === cycleId && organizationContext === organizationId) setEvidenceExportError(cause instanceof Error ? cause.message : "Unable to download close evidence.");
    } finally {
      if (context === evidenceExportRequestId.current && cycleContext === cycleId && organizationContext === organizationId) setEvidenceExporting("");
    }
  }

  const statusTone = cycle?.status === "LOCKED" ? "danger" : cycle?.status === "REVIEWED" ? "success" : cycle?.status === "READY_FOR_REVIEW" ? "warning" : "info";
  const tasksMutable = cycle?.fiscalPeriod.status === "OPEN" && ["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status);
  const canRefreshReadiness = canManage && cycle?.fiscalPeriod.status === "OPEN" && ["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status);
  const canReturnToPreparation = canAny(PERMISSIONS.accountingClose.review) && (cycle?.status === "REVIEWED" || (cycle?.status === "CLOSED" && cycle.fiscalPeriod.status === "OPEN"));
  const canClosePeriod = canAny(PERMISSIONS.accountingClose.close) && cycle?.status === "REVIEWED" && cycle.fiscalPeriod.status === "OPEN";
  const canLockPeriod = canAny(PERMISSIONS.accountingClose.lock) && cycle?.status === "CLOSED" && cycle.fiscalPeriod.status === "CLOSED";
  return <LedgerPage>
    <LedgerPageHeader eyebrow="Accounting controls" title={cycle ? `${cycle.fiscalPeriod.name} close cycle` : "Close cycle"} description="Checklist, readiness snapshots, and fiscal-period actions remain guarded by the authoritative close workflow." badge={cycle ? <LedgerStatusBadge tone={statusTone}>{cycle.status.replaceAll("_", " ")}</LedgerStatusBadge> : undefined} actions={<div className="flex flex-wrap gap-2">{cycle && canRead ? <><LedgerButton size="sm" variant="quiet" onClick={() => void downloadEvidenceExport("json")} disabled={evidenceExporting !== ""}>{evidenceExporting === "json" ? "Downloading JSON..." : "Download evidence JSON"}</LedgerButton><LedgerButton size="sm" variant="quiet" onClick={() => void downloadEvidenceExport("csv")} disabled={evidenceExporting !== ""}>{evidenceExporting === "csv" ? "Downloading CSV..." : "Download evidence CSV"}</LedgerButton><LedgerButton size="sm" variant="quiet" onClick={() => void downloadEvidenceExport("pdf")} disabled={evidenceExporting !== ""}>{evidenceExporting === "pdf" ? "Downloading PDF..." : "Download evidence PDF"}</LedgerButton></> : null}<LedgerButton href="/accounting-close" variant="quiet">All close cycles</LedgerButton></div>} />
    <LedgerPageBody>
       {loading ? <LedgerLoadingState title="Loading close cycle" /> : null}
       {error ? <LedgerErrorState title="Unable to load close cycle" description={error} action={<LedgerButton onClick={() => void load()}>Try again</LedgerButton>} /> : null}
       {reviewInvalidatedWarning ? <LedgerAlert tone="warning">{reviewInvalidatedWarning}</LedgerAlert> : null}
       {postCloseDriftWarning ? <LedgerAlert tone="warning">{postCloseDriftWarning}</LedgerAlert> : null}
       {evidenceExportError ? <LedgerAlert tone="warning">{evidenceExportError}</LedgerAlert> : null}
       {cycle?.status === "CLOSED" && cycle.fiscalPeriod.status === "OPEN" ? <LedgerAlert tone="warning">The fiscal period is open while this close cycle remains closed. Return the close cycle to preparation before starting a fresh readiness and review workflow.</LedgerAlert> : null}
       {cycle ? <>
        <LedgerPanel>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><h2 className="text-base font-semibold text-ink">Readiness control</h2><p className="mt-1 break-all text-sm text-steel">Current hash: {cycle.readinessHash ?? "Not captured yet"}</p></div><div className="flex flex-wrap gap-2">{canRefreshReadiness ? <LedgerButton onClick={() => void transition("refresh")} disabled={running !== null}>{running === "refresh" ? "Refreshing..." : "Refresh readiness"}</LedgerButton> : null}{cycle.status === "IN_PROGRESS" && cycle.fiscalPeriod.status === "OPEN" && canAny(PERMISSIONS.accountingClose.prepare) ? <LedgerButton variant="primary" onClick={() => void transition("prepare")} disabled={running !== null}>Prepare for review</LedgerButton> : null}{cycle.status === "READY_FOR_REVIEW" && cycle.fiscalPeriod.status === "OPEN" && canAny(PERMISSIONS.accountingClose.review) ? <LedgerButton variant="primary" onClick={() => void transition("review")} disabled={running !== null}>Record review</LedgerButton> : null}{canReturnToPreparation ? <LedgerButton variant="quiet" onClick={() => { setPendingAction({ kind: "cycle", action: "return-to-preparer" }); setPendingReason(""); }} disabled={running !== null}>Return to preparer</LedgerButton> : null}{canClosePeriod ? <LedgerButton variant="danger" onClick={() => setPendingAction({ kind: "cycle", action: "close" })} disabled={running !== null}>Close period</LedgerButton> : null}{canLockPeriod ? <LedgerButton variant="danger" onClick={() => setPendingAction({ kind: "cycle", action: "lock" })} disabled={running !== null}>Lock period</LedgerButton> : null}</div></div>
          {cycle.signoffMode === "SINGLE_USER_DEMO" ? <LedgerAlert tone="warning">Single-user demo sign-off was recorded for this cycle. It is explicitly marked as a demonstration exception, not separation-of-duties evidence.</LedgerAlert> : null}
          {cycle.signoffMode === "SEPARATED" ? <LedgerAlert tone="success">Separate preparer and reviewer sign-off was recorded for this cycle.</LedgerAlert> : null}
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
        <LedgerPanel><h2 className="text-base font-semibold text-ink">Manual close checklist</h2><p className="mt-1 text-sm text-steel">System checks cannot be manually completed, reopened, or reassigned. Manual task changes are versioned and audited by the existing close workflow.</p>{canManage && tasksMutable ? <div className="mt-4 max-w-sm"><LedgerInput aria-label="Search eligible assignees" value={assigneeQuery} onChange={(event) => { setAssigneeQuery(event.target.value); void loadAssignableMembers(event.target.value); }} placeholder="Search eligible assignees" /><p className="mt-1 text-xs text-steel">Search by name to narrow the bounded eligible-assignee list.</p></div> : null}{tasks.length ? <div className="mt-4"><LedgerDataTable minWidth="980px"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{tasks.map((task) => <tr key={task.id}><td className="px-4 py-3 font-medium text-ink">{task.title}</td><td className="px-4 py-3 text-steel">{task.source.replaceAll("_", " ")}</td><td className="px-4 py-3 text-steel">{canManage && tasksMutable && task.source !== "SYSTEM" ? <LedgerSelect aria-label={`Assignee: ${task.title}`} value={task.assignedToUserId ?? ""} onFocus={() => void loadAssignableMembers()} onChange={(event) => void assignTask(task, event.target.value)} disabled={running !== null || assigneesLoading}>{!task.assignedToUserId ? <option value="">Select assignee</option> : null}{[...(assignees ?? []), ...(task.assignedToUser && !(assignees ?? []).some((assignee) => assignee.id === task.assignedToUser?.id) ? [task.assignedToUser] : [])].map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</LedgerSelect> : task.assignedToUser?.name ?? "Unassigned"}</td><td className="px-4 py-3 text-steel">{task.isRequired ? "Required" : "Optional"}</td><td className="px-4 py-3"><LedgerStatusBadge tone={task.status === "COMPLETED" ? "success" : "neutral"}>{task.status.replaceAll("_", " ")}</LedgerStatusBadge></td><td className="px-4 py-3 text-right">{canManage && tasksMutable && task.source !== "SYSTEM" && ["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status) ? <LedgerButton size="sm" onClick={() => void mutateTask(task, "complete")} disabled={running !== null} aria-label={`Complete task: ${task.title}`}>Complete</LedgerButton> : null}{canManage && tasksMutable && task.source !== "SYSTEM" && task.status === "COMPLETED" ? <LedgerButton size="sm" onClick={() => { setPendingAction({ kind: "task", task, action: "reopen" }); setPendingReason(""); }} disabled={running !== null} aria-label={`Reopen task: ${task.title}`}>Reopen</LedgerButton> : null}</td></tr>)}</tbody></LedgerDataTable></div> : <LedgerEmptyState title="No close tasks were returned." description="Refresh the cycle or contact an accountant administrator if the template should contain manual tasks." />}</LedgerPanel>
        {canManage && tasksMutable ? <LedgerPanel><h2 className="text-base font-semibold text-ink">Link supporting evidence</h2><p className="mt-1 text-sm text-steel">This creates a safe reference to an existing report type. It does not upload documents or expose report contents.</p><form onSubmit={attachEvidence} className="mt-4 grid gap-3 md:grid-cols-2"><LedgerFieldLabel><LedgerFieldText>Safe label</LedgerFieldText><LedgerInput value={evidenceLabel} onChange={(event) => setEvidenceLabel(event.target.value)} maxLength={160} required placeholder="June trial balance reviewed" /></LedgerFieldLabel><LedgerFieldLabel><LedgerFieldText>Report type</LedgerFieldText><LedgerSelect value={evidenceReportType} onChange={(event) => setEvidenceReportType(event.target.value)}><option value="TRIAL_BALANCE">Trial balance</option><option value="PROFIT_AND_LOSS">Profit and loss</option><option value="BALANCE_SHEET">Balance sheet</option><option value="CASH_FLOW">Cash flow</option><option value="AR_AGING">AR aging</option><option value="AP_AGING">AP aging</option><option value="VAT_SUMMARY">VAT summary</option></LedgerSelect></LedgerFieldLabel><LedgerFieldLabel><LedgerFieldText>Related manual task (optional)</LedgerFieldText><LedgerSelect value={evidenceTaskId} onChange={(event) => setEvidenceTaskId(event.target.value)}><option value="">Cycle-level evidence</option>{tasks.filter((task) => task.source !== "SYSTEM").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</LedgerSelect></LedgerFieldLabel><div className="flex items-end"><LedgerButton type="submit" disabled={running !== null}>{running === "evidence" ? "Linking..." : "Link evidence"}</LedgerButton></div></form></LedgerPanel> : null}
        <LedgerAlert tone="info">Closing and locking never auto-post drafts or correct accounting records. Each action revalidates readiness against the current fiscal-period authority.</LedgerAlert>
      </> : null}
      <LedgerActionDialog
        open={Boolean(pendingAction && cycle)}
        onOpenChange={(open) => {
          if (!open && !running) {
            setPendingAction(null);
            setPendingReason("");
          }
        }}
        tone="danger"
        title={pendingAction?.kind === "task" ? "Reopen close task" : pendingAction?.action === "lock" ? "Lock close cycle" : pendingAction?.action === "close" ? "Close fiscal period" : "Return close cycle to preparation"}
        description={pendingAction?.kind === "task" ? `Why is ${pendingAction.task.title} being reopened?` : pendingAction?.action === "return-to-preparer" ? "Why is this close cycle being returned to preparation?" : cycle ? `${pendingAction?.action === "lock" ? "Locking" : "Closing"} ${cycle.fiscalPeriod.name} changes the fiscal period through the authoritative accounting workflow. Continue?` : ""}
        confirmLabel={pendingAction?.kind === "task" ? "Reopen" : pendingAction?.action === "return-to-preparer" ? "Return" : pendingAction?.action === "lock" ? "Lock" : "Close"}
        busy={Boolean(running)}
        reason={pendingAction?.kind === "task" || pendingAction?.action === "return-to-preparer" ? { id: "accounting-close-reason", label: pendingAction?.kind === "task" ? "Reopen reason" : "Return reason", value: pendingReason, onChange: setPendingReason, required: true, placeholder: "Enter a reason" } : undefined}
        onConfirm={async () => {
          const succeeded = pendingAction?.kind === "task"
            ? await mutateTask(pendingAction.task, "reopen", pendingReason)
            : pendingAction
              ? await transition(pendingAction.action, pendingReason)
              : false;
          if (succeeded) {
            setPendingAction(null);
            setPendingReason("");
          }
        }}
      />
    </LedgerPageBody>
  </LedgerPage>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md bg-mist px-3 py-2"><dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 font-medium text-ink">{value}</dd></div>; }

function terminalMutationIdempotencyKey(keys: Map<string, string>, action: "close" | "lock", cycleId: string, expectedVersion: number): string {
  const identity = `${action}:${cycleId}:${expectedVersion}`;
  const existing = keys.get(identity);
  if (existing) return existing;
  const random = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const next = `acct-close-${action}-${random}`;
  keys.set(identity, next);
  return next;
}

function isReviewInvalidationConflict(cause: unknown) {
  return isAccountingCloseConflict(cause, ACCOUNTING_CLOSE_REVIEW_INVALIDATED);
}

function isLockRevalidationConflict(cause: unknown) {
  return isAccountingCloseConflict(cause, ACCOUNTING_CLOSE_LOCK_REVALIDATION_FAILED);
}

function isAccountingCloseConflict(cause: unknown, code: string) {
  if (!isRecord(cause) || cause.status !== 409 || !isRecord(cause.details)) return false;
  const error = isRecord(cause.details.error) ? cause.details.error : cause.details;
  return error.code === code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
