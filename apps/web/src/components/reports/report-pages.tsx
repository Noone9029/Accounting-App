"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import {
  agingBucketLabel,
  balanceSheetStatusClass,
  balanceSheetStatusLabel,
  buildReportExportPath,
  buildReportQuery,
  monthStartDateInput,
  REPORT_BUCKETS,
  reportExportFilename,
  todayDateInput,
} from "@/lib/reports";
import type {
  AgingReport,
  AgingReportRow,
  BalanceSheetReport,
  BalanceSheetSection,
  GeneralLedgerReport,
  ProfitAndLossReport,
  TrialBalanceReport,
  VatSummaryReport,
} from "@/lib/types";

const reportLinks = [
  { href: "/reports/general-ledger", label: "General Ledger" },
  { href: "/reports/trial-balance", label: "Trial Balance" },
  { href: "/reports/profit-and-loss", label: "Profit & Loss" },
  { href: "/reports/balance-sheet", label: "Balance Sheet" },
  { href: "/reports/vat-summary", label: "VAT Summary" },
  { href: "/reports/aged-receivables", label: "Aged Receivables" },
  { href: "/reports/aged-payables", label: "Aged Payables" },
];

export function ReportsIndexPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Reports</h1>
        <p className="mt-1 text-sm text-steel">Accountant-facing reports derived from posted journal entries and current open AR/AP balances.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportLinks.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel hover:border-palm">
            <div className="text-base font-semibold text-ink">{link.label}</div>
            <div className="mt-2 text-sm text-steel">Open report</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function GeneralLedgerReportPage() {
  const [report, setReport] = useState<GeneralLedgerReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<GeneralLedgerReport>((query) => `/reports/general-ledger${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title="General Ledger" description="Opening balances, period activity, and natural running balances by account.">
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <ReportExportButtons endpoint="/reports/general-ledger" slug="general-ledger" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report || report.accounts.length === 0} emptyText="No posted journal activity found for this period." />
      {report ? (
        <div className="space-y-5">
          {report.accounts.map((account) => (
            <div key={account.accountId} className="rounded-md border border-slate-200 bg-white shadow-panel">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      {account.code} {account.name}
                    </h2>
                    <p className="mt-1 text-xs text-steel">{account.type}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-steel md:grid-cols-4">
                    <span>Opening Dr {formatMoneyAmount(account.openingDebit)}</span>
                    <span>Opening Cr {formatMoneyAmount(account.openingCredit)}</span>
                    <span>Closing Dr {formatMoneyAmount(account.closingDebit)}</span>
                    <span>Closing Cr {formatMoneyAmount(account.closingCredit)}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Debit</th>
                      <th className="px-4 py-3">Credit</th>
                      <th className="px-4 py-3">Running balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {account.lines.map((line) => (
                      <tr key={`${account.accountId}-${line.journalEntryId}-${line.entryNumber}-${line.description}`}>
                        <td className="px-4 py-3 text-steel">{formatOptionalDate(line.date, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{line.entryNumber}</td>
                        <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                        <td className="px-4 py-3 text-steel">{line.reference ?? "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.debit)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.credit)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.runningBalance)}</td>
                      </tr>
                    ))}
                    {account.lines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-5 text-center text-steel">
                          No period lines.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </ReportSection>
  );
}

export function TrialBalanceReportPage() {
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<TrialBalanceReport>((query) => `/reports/trial-balance${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title="Trial Balance" description="Debit and credit balances from posted journal activity.">
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <ReportExportButtons endpoint="/reports/trial-balance" slug="trial-balance" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report || report.accounts.length === 0} emptyText="No trial balance rows found." />
      {report ? (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${report.totals.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rosewood"}`}>
              {report.totals.balanced ? "Balanced" : "Out of balance"}
            </span>
          </div>
          <AccountBalanceTable accounts={report.accounts} totals={report.totals} />
        </div>
      ) : null}
    </ReportSection>
  );
}

export function ProfitAndLossReportPage() {
  const [report, setReport] = useState<ProfitAndLossReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<ProfitAndLossReport>((query) => `/reports/profit-and-loss${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title="Profit & Loss" description="Revenue, cost of sales, expenses, gross profit, and net profit from posted journals.">
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <ReportExportButtons endpoint="/reports/profit-and-loss" slug="profit-and-loss" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report} emptyText="No profit and loss data found." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            items={[
              ["Revenue", report.revenue],
              ["Cost of sales", report.costOfSales],
              ["Gross profit", report.grossProfit],
              ["Expenses", report.expenses],
              ["Net profit", report.netProfit],
            ]}
          />
          {report.sections.map((section) => (
            <AmountSection key={section.type} title={section.type.replaceAll("_", " ")} total={section.total} accounts={section.accounts} />
          ))}
        </div>
      ) : null}
    </ReportSection>
  );
}

export function BalanceSheetReportPage() {
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [asOf, setAsOf] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<BalanceSheetReport>((query) => `/reports/balance-sheet${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ asOf }));
  }, []);

  return (
    <ReportSection title="Balance Sheet" description="Assets, liabilities, equity, and retained earnings as of a selected date.">
      <AsOfForm asOf={asOf} setAsOf={setAsOf} loading={loading} onSubmit={() => load(buildReportQuery({ asOf }))} />
      <ReportExportButtons endpoint="/reports/balance-sheet" slug="balance-sheet" params={{ asOf }} />
      <ReportState loading={loading} error={error} empty={!report} emptyText="No balance sheet data found." />
      {report ? (
        <div className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${balanceSheetStatusClass(report)}`}>{balanceSheetStatusLabel(report)}</span>
              <div className="text-sm text-steel">
                Total assets {formatMoneyAmount(report.totalAssets)} / Total liabilities and equity {formatMoneyAmount(report.totalLiabilitiesAndEquity)}
              </div>
            </div>
          </div>
          <BalanceSheetSectionView title="Assets" section={report.assets} />
          <BalanceSheetSectionView title="Liabilities" section={report.liabilities} />
          <BalanceSheetSectionView title="Equity" section={report.equity} />
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel text-sm">
            <div className="flex justify-between gap-4 font-semibold text-ink">
              <span>Retained earnings</span>
              <span className="font-mono text-xs">{formatMoneyAmount(report.retainedEarnings)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </ReportSection>
  );
}

export function VatSummaryReportPage() {
  const [report, setReport] = useState<VatSummaryReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<VatSummaryReport>((query) => `/reports/vat-summary${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title="VAT Summary" description="VAT payable and receivable summary from posted VAT accounts.">
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <ReportExportButtons endpoint="/reports/vat-summary" slug="vat-summary" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report} emptyText="No VAT summary data found." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            items={[
              ["Sales VAT", report.salesVat],
              ["Purchase VAT", report.purchaseVat],
              ["Net VAT payable", report.netVatPayable],
            ]}
          />
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{report.notes[0]}</div>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Tax amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.sections.map((section) => (
                  <tr key={section.category}>
                    <td className="px-4 py-3 font-medium text-ink">{section.category.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-steel">{section.accountCode}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(section.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(section.taxAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </ReportSection>
  );
}

export function AgedReceivablesReportPage() {
  return <AgingReportPage title="Aged Receivables" endpoint="/reports/aged-receivables" description="Open finalized customer invoices by overdue bucket." />;
}

export function AgedPayablesReportPage() {
  return <AgingReportPage title="Aged Payables" endpoint="/reports/aged-payables" description="Open finalized supplier bills by overdue bucket." />;
}

function AgingReportPage({ title, endpoint, description }: { title: string; endpoint: string; description: string }) {
  const [report, setReport] = useState<AgingReport | null>(null);
  const [asOf, setAsOf] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<AgingReport>((query) => `${endpoint}${query}`, setReport);
  const slug = endpoint.split("/").at(-1) ?? "aging-report";

  useEffect(() => {
    void load(buildReportQuery({ asOf }));
  }, []);

  return (
    <ReportSection title={title} description={description}>
      <AsOfForm asOf={asOf} setAsOf={setAsOf} loading={loading} onSubmit={() => load(buildReportQuery({ asOf }))} />
      <ReportExportButtons endpoint={endpoint} slug={slug} params={{ asOf }} />
      <ReportState loading={loading} error={error} empty={!report || report.rows.length === 0} emptyText="No open balances found for aging." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid items={[...REPORT_BUCKETS.map((bucket) => [agingBucketLabel(bucket), report.bucketTotals[bucket]] as [string, string]), ["Grand total", report.grandTotal]]} />
          <AgingTable rows={report.rows} />
        </div>
      ) : null}
    </ReportSection>
  );
}

function useReportLoader<T>(path: (query: string) => string, setReport: (value: T) => void) {
  const organizationId = useActiveOrganizationId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(query: string) {
    if (!organizationId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      setReport(await apiRequest<T>(path(query)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load report.");
    } finally {
      setLoading(false);
    }
  }

  return { organizationId, loading, error, load };
}

function ReportExportButtons({ endpoint, slug, params }: { endpoint: string; slug: string; params: Record<string, string | null | undefined> }) {
  const [downloading, setDownloading] = useState<"" | "csv" | "pdf">("");
  const [error, setError] = useState("");

  async function download(format: "csv" | "pdf") {
    setDownloading(format);
    setError("");
    try {
      await downloadAuthenticatedFile(buildReportExportPath(endpoint, params, format), reportExportFilename(slug, format));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download report.");
    } finally {
      setDownloading("");
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void download("csv")} disabled={Boolean(downloading)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
          {downloading === "csv" ? "Downloading CSV..." : "Download CSV"}
        </button>
        <button type="button" onClick={() => void download("pdf")} disabled={Boolean(downloading)} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
          {downloading === "pdf" ? "Downloading PDF..." : "Download PDF"}
        </button>
      </div>
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
    </div>
  );
}

function ReportSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-steel">{description}</p>
        </div>
        <Link href="/reports" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Reports
        </Link>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function DateRangeForm({
  from,
  to,
  setFrom,
  setTo,
  loading,
  onSubmit,
}: {
  from: string;
  to: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  loading: boolean;
  onSubmit: () => Promise<void>;
}) {
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="rounded-md border border-slate-200 bg-white p-5 shadow-panel"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {loading ? "Loading..." : "Run report"}
        </button>
      </div>
    </form>
  );
}

function AsOfForm({ asOf, setAsOf, loading, onSubmit }: { asOf: string; setAsOf: (value: string) => void; loading: boolean; onSubmit: () => Promise<void> }) {
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="rounded-md border border-slate-200 bg-white p-5 shadow-panel"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">As of</span>
          <input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {loading ? "Loading..." : "Run report"}
        </button>
      </div>
    </form>
  );
}

function ReportState({ loading, error, empty, emptyText }: { loading: boolean; error: string; empty: boolean; emptyText: string }) {
  return (
    <div className="space-y-3">
      {loading ? <StatusMessage type="loading">Loading report...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {!loading && !error && empty ? <StatusMessage type="empty">{emptyText}</StatusMessage> : null}
    </div>
  );
}

function SummaryGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
          <div className="mt-2 font-mono text-sm font-semibold text-ink">{formatMoneyAmount(value)}</div>
        </div>
      ))}
    </div>
  );
}

function AccountBalanceTable({ accounts, totals }: { accounts: TrialBalanceReport["accounts"]; totals: TrialBalanceReport["totals"] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Opening Dr</th>
            <th className="px-4 py-3">Opening Cr</th>
            <th className="px-4 py-3">Period Dr</th>
            <th className="px-4 py-3">Period Cr</th>
            <th className="px-4 py-3">Closing Dr</th>
            <th className="px-4 py-3">Closing Cr</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.map((account) => (
            <tr key={account.accountId}>
              <td className="px-4 py-3 font-medium text-ink">
                {account.code} {account.name}
              </td>
              <td className="px-4 py-3 text-steel">{account.type}</td>
              <MoneyCells values={[account.openingDebit, account.openingCredit, account.periodDebit, account.periodCredit, account.closingDebit, account.closingCredit]} />
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-ink">
            <td className="px-4 py-3">Totals</td>
            <td className="px-4 py-3" />
            <MoneyCells values={[totals.openingDebit, totals.openingCredit, totals.periodDebit, totals.periodCredit, totals.closingDebit, totals.closingCredit]} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MoneyCells({ values }: { values: string[] }) {
  return (
    <>
      {values.map((value, index) => (
        <td key={`${value}-${index}`} className="px-4 py-3 font-mono text-xs">
          {formatMoneyAmount(value)}
        </td>
      ))}
    </>
  );
}

function AmountSection({ title, total, accounts }: { title: string; total: string; accounts: Array<{ accountId: string; code: string; name: string; amount: string }> }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">{title}</th>
            <th className="px-4 py-3">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.map((account) => (
            <tr key={account.accountId}>
              <td className="px-4 py-3 font-medium text-ink">
                {account.code} {account.name}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(account.amount)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-ink">
            <td className="px-4 py-3">Total {title.toLowerCase()}</td>
            <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BalanceSheetSectionView({ title, section }: { title: string; section: BalanceSheetSection }) {
  return <AmountSection title={title} total={section.total} accounts={section.accounts} />;
}

function AgingTable({ rows }: { rows: AgingReportRow[] }) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Number</th>
            <th className="px-4 py-3">Issue date</th>
            <th className="px-4 py-3">Due date</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Balance due</th>
            <th className="px-4 py-3">Days overdue</th>
            <th className="px-4 py-3">Bucket</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-ink">{row.contact.displayName ?? row.contact.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.number}</td>
              <td className="px-4 py-3 text-steel">{formatOptionalDate(row.issueDate, "-")}</td>
              <td className="px-4 py-3 text-steel">{formatOptionalDate(row.dueDate, "-")}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.total)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.balanceDue)}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.daysOverdue}</td>
              <td className="px-4 py-3 text-steel">{agingBucketLabel(row.bucket)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
