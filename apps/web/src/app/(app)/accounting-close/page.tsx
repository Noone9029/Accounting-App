"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerAlert, LedgerButton, LedgerEmptyState, LedgerErrorState, LedgerLoadingState, LedgerMetricGrid, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerSelect, LedgerStatCard, LedgerStatusBadge } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { FiscalPeriod } from "@/lib/types";

type Readiness = { blockerCount: number; warningCount: number; informationCount: number; checks: Array<{ key: string; title: string; severity: string; status: string; safeMessage: string; detailsHref?: string }> };
type Cycle = { id: string; fiscalPeriodId: string; status: string; version: number };

export default function AccountingClosePage() {
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const readinessRequestId = useRef(0);
  const contextVersion = useRef(0);
  const currentPeriodId = useRef("");
  const canManage = canAny(PERMISSIONS.accountingClose.manage);

  useEffect(() => {
    contextVersion.current += 1; readinessRequestId.current += 1; currentPeriodId.current = "";
    setPeriods([]); setPeriodId(""); setReadiness(null); setCycle(null); setError("");
    if (organizationId) void loadPeriods(); else setLoading(false);
  }, [organizationId]);
  useEffect(() => { currentPeriodId.current = periodId; if (periodId) void loadReadiness(periodId); }, [periodId]);

  async function loadPeriods() {
    const requestContextVersion = contextVersion.current;
    setLoading(true); setError("");
    try {
      const next = await apiRequest<FiscalPeriod[]>("/fiscal-periods");
      if (requestContextVersion !== contextVersion.current) return;
      setPeriods(next);
      setPeriodId(next[0]?.id ?? "");
    } catch (cause) { if (requestContextVersion === contextVersion.current) setError(cause instanceof Error ? cause.message : "Unable to load fiscal periods."); }
    finally { if (requestContextVersion === contextVersion.current) setLoading(false); }
  }

  async function loadReadiness(fiscalPeriodId: string) {
    const requestId = ++readinessRequestId.current;
    setReadiness(null); setCycle(null); setError("");
    try {
      const encodedPeriodId = encodeURIComponent(fiscalPeriodId);
      const [nextReadiness, nextCycle] = await Promise.all([
        apiRequest<Readiness>(`/accounting-close/readiness?fiscalPeriodId=${encodedPeriodId}`),
        apiRequest<Cycle | null>(`/accounting-close/cycles?fiscalPeriodId=${encodedPeriodId}`),
      ]);
      if (requestId !== readinessRequestId.current) return;
      setReadiness(nextReadiness); setCycle(nextCycle);
    }
    catch (cause) { if (requestId === readinessRequestId.current) setError(cause instanceof Error ? cause.message : "Unable to load close readiness."); }
  }

  async function startCycle() {
    if (!periodId) return;
    const startPeriodId = periodId;
    const startContextVersion = contextVersion.current;
    setStarting(true); setError("");
    try {
      const nextCycle = await apiRequest<Cycle>("/accounting-close/cycles", { method: "POST", body: { fiscalPeriodId: startPeriodId } });
      if (startContextVersion === contextVersion.current && currentPeriodId.current === startPeriodId) setCycle(nextCycle);
    }
    catch (cause) { if (startContextVersion === contextVersion.current && currentPeriodId.current === startPeriodId) setError(cause instanceof Error ? cause.message : "Unable to start the close cycle."); }
    finally { if (startContextVersion === contextVersion.current) setStarting(false); }
  }

  const selected = periods.find((period) => period.id === periodId);
  const blockers = readiness?.checks.filter((check) => check.severity === "BLOCKER" && check.status !== "READY") ?? [];

  return <LedgerPage>
    <LedgerPageHeader eyebrow="Accounting controls" title="Month-end close" description="A guarded workspace for readiness, close work, review, and authoritative fiscal-period transitions." badge={cycle ? <LedgerStatusBadge tone="info">{cycle.status.replaceAll("_", " ")}</LedgerStatusBadge> : undefined} />
    <LedgerPageBody>
      {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to use the close workspace.</LedgerAlert> : null}
      {loading ? <LedgerLoadingState title="Loading close workspace" /> : null}
      {error ? <LedgerErrorState title="Unable to load close workspace" description={error} action={<LedgerButton onClick={() => periodId ? void loadReadiness(periodId) : void loadPeriods()}>Try again</LedgerButton>} /> : null}
      {!loading && organizationId && periods.length === 0 ? <LedgerEmptyState title="No fiscal period is available." description="Create a fiscal period before starting a month-end close cycle." action={<LedgerButton href="/fiscal-periods">Open fiscal periods</LedgerButton>} /> : null}
      {periods.length ? <>
        <LedgerPanel>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="block min-w-0 md:w-80"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-steel">Fiscal period</span><LedgerSelect aria-label="Fiscal period" value={periodId} onChange={(event) => setPeriodId(event.target.value)}>{periods.map((period) => <option key={period.id} value={period.id}>{period.name} · {period.startsOn} to {period.endsOn}</option>)}</LedgerSelect></label>
            {canManage && !cycle && selected?.status === "OPEN" ? <LedgerButton variant="primary" onClick={startCycle} disabled={starting}>{starting ? "Starting..." : "Start close cycle"}</LedgerButton> : null}
            {cycle ? <LedgerButton href={`/accounting-close/${cycle.id}`}>Open close cycle · {cycle.status.replaceAll("_", " ")}</LedgerButton> : null}
          </div>
        </LedgerPanel>
        {readiness ? <>
          <LedgerMetricGrid>
            <LedgerStatCard label="Close state" value={blockers.length ? "Blocked" : "Ready to prepare"} detail={selected?.name} />
            <LedgerStatCard label="Blockers" value={`${readiness.blockerCount} blocker${readiness.blockerCount === 1 ? "" : "s"}`} detail="Must be resolved before sign-off." />
            <LedgerStatCard label="Warnings" value={readiness.warningCount} detail="Review before preparation." />
            <LedgerStatCard label="Information" value={readiness.informationCount} detail="Context only; no action implied." />
          </LedgerMetricGrid>
          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Readiness exceptions</h2><p className="mt-1 text-sm text-steel">Resolve source-workflow issues, then refresh this close workspace. This page does not run external actions.</p>
            <div className="mt-4 divide-y divide-slate-100">{blockers.length ? blockers.map((check) => <div key={check.key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium text-ink">{check.title}</div><p className="mt-1 text-sm text-steel">{check.safeMessage}</p></div>{check.detailsHref ? <Link href={check.detailsHref} className="ledger-focus shrink-0 text-sm font-semibold text-palm underline">Review blocker</Link> : null}</div>) : <p className="py-3 text-sm text-steel">No blocker currently prevents preparing this close cycle.</p>}</div>
          </LedgerPanel>
        </> : null}
      </> : null}
    </LedgerPageBody>
  </LedgerPage>;
}
