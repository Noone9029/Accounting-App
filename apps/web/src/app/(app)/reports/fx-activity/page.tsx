"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PageHeader } from "@/components/ui-ledger";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import { buildReportQuery, monthStartDateInput, reportExportFilename, todayDateInput } from "@/lib/reports";
import type { FxActivityReport, FxOpenExposureReport, FxRateSnapshotReport, FxRealizedActivityReport, FxUnrealizedActivityReport } from "@/lib/types";

type FxView = "realized-activity" | "unrealized-activity" | "rate-snapshots" | "open-exposure";
const views: Array<{ id: FxView; label: string }> = [
  { id: "realized-activity", label: "Realized activity" },
  { id: "unrealized-activity", label: "Unrealized activity" },
  { id: "rate-snapshots", label: "Rate snapshots" },
  { id: "open-exposure", label: "Open exposure" },
];

export default function FxActivityPage() {
  const { locale, tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [view, setView] = useState<FxView>("realized-activity");
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const [transactionCurrency, setTransactionCurrency] = useState("");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<FxActivityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const canExport = canAny(PERMISSIONS.reports.export, PERMISSIONS.generatedDocuments.download);

  function params(activeView = view, requestedPage = page, includePage = true) {
    return {
      ...(activeView === "open-exposure" ? {} : { from, to }),
      transactionCurrency: transactionCurrency.trim().toUpperCase() || undefined,
      page: includePage ? String(requestedPage) : undefined,
    };
  }

  async function load(activeView = view, requestedPage = page) {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    try {
      const nextReport = await apiRequest<FxActivityReport>(`/reports/fx/${activeView}${buildReportQuery(params(activeView, requestedPage))}`);
      setReport(nextReport);
      setPage(nextReport.pagination?.page ?? 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tc("Unable to load FX report."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load("realized-activity"); }, [organizationId]);

  function switchView(next: FxView) {
    setView(next);
    setPage(1);
    setReport(null);
    void load(next, 1);
  }

  async function downloadCsv() {
    setDownloading(true);
    setError("");
    try {
      await downloadAuthenticatedFile(
        `/reports/fx/${view}${buildReportQuery({ ...params(view, 1, false), format: "csv" })}`,
        reportExportFilename(`fx-${view}`, "csv"),
      );
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download FX report CSV."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow={tc("Accountant review")}
        title={tc("FX activity and exposure")}
        description={tc("Read-only accountant review of realized and unrealized activity, immutable rate evidence, and open foreign exposure. No rates are fetched and nothing is posted from this workspace.")}
      />
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-panel" role="tablist">
          {views.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={view === item.id} onClick={() => switchView(item.id)} className={`rounded px-3 py-2 text-sm font-medium ${view === item.id ? "bg-palm text-white" : "border border-slate-200 text-steel hover:bg-slate-50"}`}>
              {tc(item.label)}
            </button>
          ))}
        </div>

        <form onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); void load(view, 1); }} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <div className="flex flex-wrap items-end gap-3">
            {view !== "open-exposure" ? <Filter label={tc("From")} type="date" value={from} onChange={(value) => { setFrom(value); setPage(1); }} /> : null}
            {view !== "open-exposure" ? <Filter label={tc("To")} type="date" value={to} onChange={(value) => { setTo(value); setPage(1); }} /> : null}
            <Filter label={tc("Transaction currency")} value={transactionCurrency} onChange={(value) => { setTransactionCurrency(value.toUpperCase()); setPage(1); }} maxLength={3} placeholder="USD" />
            <button type="submit" disabled={loading} className="rounded bg-palm px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">{loading ? tc("Loading...") : tc("Run report")}</button>
            {canExport ? <button type="button" onClick={() => void downloadCsv()} disabled={downloading} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-steel">{downloading ? tc("Downloading CSV...") : tc("Download CSV")}</button> : null}
          </div>
          <p className="mt-3 text-xs text-steel">{tc(view === "open-exposure" ? "Open exposure is current, not date-filtered. Receivables, payables, gross volume, and signed net exposure stay separate." : "Transaction amounts stay within one selected currency. Base-currency gain, loss, and carrying totals use the tenant base currency.")}</p>
        </form>

        {loading ? <StatusMessage type="loading">{tc("Loading FX report...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {report ? <FxReportView view={view} report={report} locale={locale} /> : null}
        {report?.pagination ? (
          <nav aria-label={tc("Report pagination")} className="flex items-center justify-end gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm shadow-panel">
            <span className="text-steel">{tc("Page")} {report.pagination.page}</span>
            <button type="button" aria-label={tc("Previous page")} disabled={loading || report.pagination.page <= 1} onClick={() => void load(view, Math.max(1, report.pagination!.page - 1))} className="rounded border border-slate-300 px-3 py-2 text-steel disabled:opacity-40">{tc("Previous")}</button>
            <button type="button" aria-label={tc("Next page")} disabled={loading || !report.pagination.hasMore} onClick={() => void load(view, report.pagination!.page + 1)} className="rounded border border-slate-300 px-3 py-2 text-steel disabled:opacity-40">{tc("Next")}</button>
          </nav>
        ) : null}
        <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-steel">
          {tc("This is read-only accountant review. PDF, provider calls, scheduled delivery, compliance submission, and money movement are not implemented here.")}
        </p>
      </div>
    </section>
  );
}

function Filter({ label, value, onChange, type = "text", maxLength, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; maxLength?: number; placeholder?: string }) {
  return <label className="block"><span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span><input aria-label={label} type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" /></label>;
}

function FxReportView({ view, report, locale }: { view: FxView; report: FxActivityReport; locale: "en" | "ar" }) {
  const currency = report.accountingContext.baseCurrency;
  if (view === "realized-activity") return <RealizedView report={report as FxRealizedActivityReport} currency={currency} locale={locale} />;
  if (view === "unrealized-activity") return <UnrealizedView report={report as FxUnrealizedActivityReport} currency={currency} locale={locale} />;
  if (view === "rate-snapshots") return <RatesView report={report as FxRateSnapshotReport} />;
  return <ExposureView report={report as FxOpenExposureReport} currency={currency} locale={locale} />;
}

function RealizedView({ report, currency, locale }: { report: FxRealizedActivityReport; currency: string; locale: "en" | "ar" }) {
  const scope = report.totalsScope === "PAGE" ? "Page" : "Filtered export";
  return <div className="space-y-4"><Summary items={[[`${scope} gross gain`, report.totals.grossGain], [`${scope} gross loss`, report.totals.grossLoss], [`${scope} net gain`, report.totals.netGain], [`${scope} net loss`, report.totals.netLoss]]} currency={currency} locale={locale} /><Table headers={["Date", "Event", "Payment", "Document", "Transaction amount", "Net gain", "Net loss", "Review"]} rows={report.rows.map((row) => [row.date, row.eventType === "REVERSAL" ? "Reversal" : "Original", row.paymentNumber ?? "-", row.documentNumber ?? "-", formatAppMoney(row.transactionAmount, row.currency, "en"), formatAppMoney(row.netGain, currency, locale), formatAppMoney(row.netLoss, currency, locale), row.missingJournal ? "Missing journal" : row.reversed ? "Reversal journal posted" : "Posted evidence"])} /></div>;
}

function UnrealizedView({ report, currency, locale }: { report: FxUnrealizedActivityReport; currency: string; locale: "en" | "ar" }) {
  const scope = report.totalsScope === "PAGE" ? "Page" : "Filtered export";
  return <div className="space-y-4"><Summary items={[[`${scope} recognized gain`, report.totals.grossGain], [`${scope} recognized loss`, report.totals.grossLoss], [`${scope} preview gain`, report.totals.previewGain], [`${scope} preview loss`, report.totals.previewLoss]]} currency={currency} locale={locale} /><Table headers={["Date", "Run", "Recognition", "Document", "Open amount", "Carrying", "Recognized net", "Preview effect"]} rows={report.rows.map((row) => [row.revaluationDate, row.revaluationRunId, row.recognition === "UNPOSTED_PREVIEW" ? `Unposted preview (${row.status})` : row.recognition, row.documentNumber ?? "-", formatAppMoney(row.openTransactionAmount, row.currency, "en"), formatAppMoney(row.carryingBaseAmount, currency, locale), formatAppMoney(Number(row.netGain) - Number(row.netLoss), currency, locale), formatAppMoney(Number(row.previewGain) - Number(row.previewLoss), currency, locale)])} /></div>;
}

function RatesView({ report }: { report: FxRateSnapshotReport }) {
  return <Table headers={["Rate date", "Pair", "Rate", "Source", "Reference", "Uses"]} rows={report.rows.map((row) => [row.rateDate, `${row.transactionCurrency}/${row.baseCurrency}`, row.rate, row.source, row.sourceReference ?? "-", String(row.usage.total)])} />;
}

function ExposureView({ report, currency, locale }: { report: FxOpenExposureReport; currency: string; locale: "en" | "ar" }) {
  return <div className="space-y-4">
    <Summary items={[["Gross receivable carrying", report.totals.receivableCarryingBaseAmount], ["Gross payable carrying", report.totals.payableCarryingBaseAmount], ["Gross carrying volume", report.totals.grossCarryingBaseAmount], ["Signed net carrying", report.totals.netCarryingBaseAmount]]} currency={currency} locale={locale} />
    <Table headers={["Currency", "Receivable open", "Payable open", "Gross open", "Signed net open", "Gross carrying", "Signed net carrying"]} rows={report.groups.map((group) => [group.currency, formatAppMoney(group.receivableOpenTransactionAmount, group.currency, "en"), formatAppMoney(group.payableOpenTransactionAmount, group.currency, "en"), formatAppMoney(group.grossOpenTransactionAmount, group.currency, "en"), formatAppMoney(group.netOpenTransactionAmount, group.currency, "en"), formatAppMoney(group.grossCarryingBaseAmount, currency, locale), formatAppMoney(group.netCarryingBaseAmount, currency, locale)])} />
    <Table headers={["Type", "Document", "Currency", "Open transaction", "Source base", "Carrying base", "Rate"]} rows={report.rows.map((row) => [row.sourceType, row.documentNumber, row.currency, formatAppMoney(row.openTransactionAmount, row.currency, "en"), formatAppMoney(row.sourceBaseOpenAmount, currency, locale), formatAppMoney(row.carryingBaseAmount, currency, locale), row.carryingRate])} />
  </div>;
}

function Summary({ items, currency, locale }: { items: Array<[string, string]>; currency: string; locale: "en" | "ar" }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(([label, amount]) => <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel"><div className="text-xs uppercase tracking-wide text-steel">{label}</div><div className="mt-2 font-mono text-sm font-semibold text-ink">{formatAppMoney(amount, currency, locale)}</div></div>)}</div>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel"><table className="w-full min-w-[980px] text-start text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-steel">{cell}</td>)}</tr>)}{rows.length === 0 ? <tr><td colSpan={headers.length} className="px-4 py-6 text-center text-steel">No matching FX evidence.</td></tr> : null}</tbody></table></div>;
}
