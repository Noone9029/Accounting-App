"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatMoneyAmount } from "@/lib/money";
import { buildReportQuery, monthStartDateInput, todayDateInput } from "@/lib/reports";
import type { VatReturnReport } from "@/lib/types";

export default function TaxPage() {
  const organizationId = useActiveOrganizationId();
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const [report, setReport] = useState<VatReturnReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadReport(from, to);
  }, [organizationId]);

  async function loadReport(nextFrom: string, nextTo: string) {
    if (!organizationId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      setReport(await apiRequest<VatReturnReport>(`/reports/vat-return${buildReportQuery({ from: nextFrom, to: nextTo })}`));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tax summary.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadReport(from, to);
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tax</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Operational VAT summary for accountant review. This controlled-beta workspace does not submit returns and is not an official VAT filing workflow.
          </p>
        </div>
        <Link href="/reports/vat-summary" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          VAT Summary
        </Link>
      </div>

      <div className="space-y-5">
        <form onSubmit={onSubmit} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
            </label>
            <button type="submit" disabled={loading || !organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:self-end">
              {loading ? "Calculating..." : "Run tax summary"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-steel">Uses existing operational VAT Summary and draft VAT Return report logic from posted LedgerByte records.</p>
        </form>

        <div className="space-y-3">
          {!organizationId ? <StatusMessage type="info">Log in and select an organization to load tax calculations.</StatusMessage> : null}
          {loading ? <StatusMessage type="loading">Loading tax calculations...</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        </div>

        {report ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TaxMetric label="Sales tax collected" value={report.outputVat} />
              <TaxMetric label="Purchase tax paid" value={report.inputVat} />
              <TaxMetric
                label={Number.parseFloat(report.netVatRefundable) > 0 ? "Net refundable" : "Net payable"}
                value={Number.parseFloat(report.netVatRefundable) > 0 ? report.netVatRefundable : report.netVatPayable}
              />
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Draft VAT view only. Review with an accountant before any filing decision; LedgerByte does not perform tax authority submission here.
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Drill-down</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link href={`/reports/vat-summary${buildReportQuery({ from, to })}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Operational VAT Summary
                </Link>
                <Link href={`/reports/vat-return${buildReportQuery({ from, to })}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  VAT Return
                </Link>
                <Link href="/tax-rates" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Tax rates
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function TaxMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-2 font-mono text-base font-semibold text-ink">{formatMoneyAmount(value)}</div>
    </div>
  );
}
