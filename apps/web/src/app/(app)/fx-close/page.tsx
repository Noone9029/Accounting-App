"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { PageHeader } from "@/components/ui-ledger";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { todayDateInput } from "@/lib/reports";
import type { FxCloseReadiness } from "@/lib/types";

export default function FxClosePage() {
  const { tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const [asOf, setAsOf] = useState(todayDateInput());
  const [readiness, setReadiness] = useState<FxCloseReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(date = asOf) {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    try {
      setReadiness(await apiRequest<FxCloseReadiness>(`/fx/close-readiness?asOf=${encodeURIComponent(date)}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tc("Unable to load FX close readiness."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organizationId]);

  return (
    <section>
      <PageHeader
        eyebrow={tc("Month-end review")}
        title={tc("FX close readiness")}
        description={tc("Review foreign-currency exceptions before closing or locking a fiscal period. This workspace is view-only; corrections happen in their source workflows.")}
      />
      <div className="space-y-5">
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); void load(); }} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("As of")}</span>
              <input aria-label="As of" type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <button type="submit" disabled={loading} className="rounded bg-palm px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
              {loading ? tc("Checking...") : tc("Run readiness check")}
            </button>
          </div>
        </form>
        {loading ? <StatusMessage type="loading">{tc("Checking FX close controls...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {readiness ? <ReadinessQueue readiness={readiness} /> : null}
        <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-steel">
          {tc("Base-only organizations are not subject to FX close gates. No provider, compliance, banking, payment, or money-movement action runs from this page.")}
        </p>
      </div>
    </section>
  );
}

function ReadinessQueue({ readiness }: { readiness: FxCloseReadiness }) {
  const { tc } = useAppLocale();
  const label = readiness.status === "NOT_APPLICABLE" ? "Not applicable" : readiness.status === "READY" ? "Ready" : "Blocked";
  const tone = readiness.status === "READY" ? "bg-emerald-50 text-emerald-700" : readiness.status === "BLOCKED" ? "bg-rose-50 text-rosewood" : "bg-slate-100 text-steel";
  return (
    <div data-testid="fx-close-queue" className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div><h2 className="font-semibold text-ink">{tc("Close status")}</h2><p className="mt-1 text-xs text-steel">{readiness.asOf}</p></div>
        <span className={`rounded px-2 py-1 text-xs font-semibold ${tone}`}>{tc(label)}</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4">
        <Count label={tc("Foreign documents")} value={readiness.counts.foreignDocuments} />
        <Count label={tc("Open balances")} value={readiness.counts.openForeignDocuments} />
        <Count label={tc("Currencies")} value={readiness.counts.foreignCurrencies} />
        <Count label={tc("Blockers")} value={readiness.blockers.length} />
      </div>
      {readiness.blockers.length ? (
        <div className="divide-y divide-slate-100">
          {readiness.blockers.map((blocker) => (
            <div key={blocker.code} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold text-rosewood">{blocker.code}</span><span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-steel">{blocker.count}</span></div>
                <p className="mt-1 break-words text-sm text-steel">{tc(blocker.message)}</p>
              </div>
              <Link href={blocker.actionHref} className="rounded border border-slate-300 px-3 py-2 text-center text-sm font-medium text-steel hover:bg-slate-50">{tc("Review")}</Link>
            </div>
          ))}
        </div>
      ) : <div className="p-5 text-sm text-steel">{tc(readiness.status === "NOT_APPLICABLE" ? "No foreign-currency activity requires an FX close review." : "All FX close controls passed for this date.")}</div>}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return <div className="bg-white p-4"><div className="text-xs uppercase tracking-wide text-steel">{label}</div><div className="mt-1 font-mono text-lg font-semibold text-ink">{value}</div></div>;
}
