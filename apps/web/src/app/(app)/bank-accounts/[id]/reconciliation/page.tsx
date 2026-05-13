"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { reconciliationDifferenceStatus } from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import type { BankReconciliationSummary } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export default function BankReconciliationPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [summary, setSummary] = useState<BankReconciliationSummary | null>(null);
  const [from, setFrom] = useState(todayInputValue(-30));
  const [to, setTo] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const path = useMemo(() => {
    const query = new URLSearchParams();
    if (from) {
      query.set("from", from);
    }
    if (to) {
      query.set("to", to);
    }
    const suffix = query.toString();
    return `/bank-accounts/${params.id}/reconciliation-summary${suffix ? `?${suffix}` : ""}`;
  }, [from, params.id, to]);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankReconciliationSummary>(path)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load reconciliation summary.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, path]);

  const status = summary ? reconciliationDifferenceStatus(summary) : "NEEDS_REVIEW";
  const currency = summary?.profile.currency ?? "SAR";

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reconciliation summary</h1>
          <p className="mt-1 text-sm text-steel">{summary ? `${summary.profile.displayName} statement and ledger review` : "Statement and ledger review"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Unmatched rows
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load reconciliation details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading reconciliation summary...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Suggestion</p>
            <span className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-medium ${status === "RECONCILED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {status === "RECONCILED" ? "Reconciled" : "Needs review"}
            </span>
          </div>
        </div>
      </div>

      {summary ? (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Ledger balance" value={formatMoneyAmount(summary.ledgerBalance, currency)} />
            <SummaryCard label="Statement closing" value={summary.statementClosingBalance ? formatMoneyAmount(summary.statementClosingBalance, currency) : "-"} />
            <SummaryCard label="Difference" value={summary.difference ? formatMoneyAmount(summary.difference, currency) : "-"} />
            <SummaryCard label="Unmatched rows" value={String(summary.totals.unmatched.count)} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-ink">Statement row totals</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard label="Credits" value={`${summary.totals.credits.count} / ${formatMoneyAmount(summary.totals.credits.total, currency)}`} />
              <SummaryCard label="Debits" value={`${summary.totals.debits.count} / ${formatMoneyAmount(summary.totals.debits.total, currency)}`} />
              <SummaryCard label="Matched" value={`${summary.totals.matched.count} / ${formatMoneyAmount(summary.totals.matched.total, currency)}`} />
              <SummaryCard label="Categorized" value={`${summary.totals.categorized.count} / ${formatMoneyAmount(summary.totals.categorized.total, currency)}`} />
              <SummaryCard label="Ignored" value={`${summary.totals.ignored.count} / ${formatMoneyAmount(summary.totals.ignored.total, currency)}`} />
              <SummaryCard label="Unmatched" value={`${summary.totals.unmatched.count} / ${formatMoneyAmount(summary.totals.unmatched.total, currency)}`} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Filename</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Statement range</th>
                  <th className="px-4 py-3 text-right">Rows</th>
                  <th className="px-4 py-3 text-right">Closing balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.imports.map((statementImport) => (
                  <tr key={statementImport.id}>
                    <td className="px-4 py-3 text-ink">{statementImport.filename}</td>
                    <td className="px-4 py-3 text-steel">{statementImport.status.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-steel">
                      {formatOptionalDate(statementImport.statementStartDate, "-")} to {formatOptionalDate(statementImport.statementEndDate, "-")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{statementImport.rowCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{statementImport.closingStatementBalance ? formatMoneyAmount(statementImport.closingStatementBalance, currency) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {summary.imports.length === 0 ? <StatusMessage type="empty">No statement imports found for this date range.</StatusMessage> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
