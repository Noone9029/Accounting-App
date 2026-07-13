"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerAlert, LedgerButton, LedgerDataTable, LedgerEmptyState, LedgerErrorState, LedgerLoadingState, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerStatusBadge } from "@/components/ui/ledger-system";
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
  const requestId = useRef(0);
  const canManage = canAny(PERMISSIONS.accountingClose.manage);

  useEffect(() => {
    requestId.current += 1;
    setCycle(null); setTasks([]); setError("");
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

  const statusTone = cycle?.status === "LOCKED" ? "danger" : cycle?.status === "REVIEWED" ? "success" : cycle?.status === "READY_FOR_REVIEW" ? "warning" : "info";
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
        <LedgerPanel><h2 className="text-base font-semibold text-ink">Manual close checklist</h2><p className="mt-1 text-sm text-steel">System checks cannot be manually completed. Task completion and evidence controls are added in the next detail slice.</p>{tasks.length ? <div className="mt-4"><LedgerDataTable minWidth="720px"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-steel"><tr><th className="px-4 py-3">Task</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{tasks.map((task) => <tr key={task.id}><td className="px-4 py-3 font-medium text-ink">{task.title}</td><td className="px-4 py-3 text-steel">{task.source.replaceAll("_", " ")}</td><td className="px-4 py-3 text-steel">{task.isRequired ? "Required" : "Optional"}</td><td className="px-4 py-3"><LedgerStatusBadge tone={task.status === "COMPLETED" ? "success" : "neutral"}>{task.status.replaceAll("_", " ")}</LedgerStatusBadge></td></tr>)}</tbody></LedgerDataTable></div> : <LedgerEmptyState title="No close tasks were returned." description="Refresh the cycle or contact an accountant administrator if the template should contain manual tasks." />}</LedgerPanel>
        <LedgerAlert tone="info">Closing and locking never auto-post drafts or correct accounting records. Each action revalidates readiness against the current fiscal-period authority.</LedgerAlert>
      </> : null}
    </LedgerPageBody>
  </LedgerPage>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md bg-mist px-3 py-2"><dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 font-medium text-ink">{value}</dd></div>; }
