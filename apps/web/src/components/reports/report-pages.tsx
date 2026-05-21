"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
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
  { href: "/reports/general-ledger", label: "General Ledger", description: "Trace posted journal lines by account." },
  { href: "/reports/trial-balance", label: "Trial Balance", description: "Confirm debits and credits stay balanced." },
  { href: "/reports/profit-and-loss", label: "Profit & Loss", description: "Review revenue, costs, expenses, and net profit." },
  { href: "/reports/balance-sheet", label: "Balance Sheet", description: "Check assets, liabilities, equity, and retained earnings." },
  { href: "/reports/vat-summary", label: "VAT Summary", description: "Review posted VAT account movement before filing work." },
  { href: "/reports/aged-receivables", label: "Aged Receivables", description: "See customer invoice balances after payments and credits." },
  { href: "/reports/aged-payables", label: "Aged Payables", description: "See supplier bill balances by overdue bucket." },
];

type AgingReportKind = "receivables" | "payables";

export function ReportsIndexPage() {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Start with Profit & Loss after your first finalized invoice or payment. Reports are derived from posted journals and current open AR/AP balances.
          </p>
        </div>
        <Link href="/setup" className="self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Guided setup
        </Link>
      </div>
      <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900 shadow-panel">
        <div className="font-semibold text-ink">First report path</div>
        <p className="mt-1">
          Use Profit & Loss for the first business result, then Trial Balance to confirm debits and credits stay balanced.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/reports/profit-and-loss" className="rounded-md bg-palm px-3 py-2 text-center font-medium text-white hover:bg-palm-dark">
            Open Profit & Loss
          </Link>
          <Link href="/dashboard" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center font-medium text-emerald-900 hover:bg-emerald-100">
            Back to dashboard
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportLinks.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel hover:border-palm">
            <div className="text-base font-semibold text-ink">{link.label}</div>
            <div className="mt-2 text-sm leading-6 text-steel">{link.description}</div>
            <div className="mt-4 text-sm font-medium text-palm">Open report</div>
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
  return (
    <AgingReportPage
      title="Aged Receivables"
      endpoint="/reports/aged-receivables"
      description="Open finalized customer invoices by overdue bucket after posted payments, credit notes, and refunds."
      kind="receivables"
    />
  );
}

export function AgedPayablesReportPage() {
  return <AgingReportPage title="Aged Payables" endpoint="/reports/aged-payables" description="Open finalized supplier bills by overdue bucket after supplier payments and debit notes." kind="payables" />;
}

function AgingReportPage({ title, endpoint, description, kind }: { title: string; endpoint: string; description: string; kind: AgingReportKind }) {
  const [report, setReport] = useState<AgingReport | null>(null);
  const [asOf, setAsOf] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<AgingReport>((query) => `${endpoint}${query}`, setReport);
  const slug = endpoint.split("/").at(-1) ?? "aging-report";

  useEffect(() => {
    void load(buildReportQuery({ asOf }));
  }, []);

  return (
    <ReportSection title={title} description={description}>
      <AgingReportGuide kind={kind} />
      <AsOfForm asOf={asOf} setAsOf={setAsOf} loading={loading} onSubmit={() => load(buildReportQuery({ asOf }))} helpText="Changing the date recalculates which open invoices or bills fall into each aging bucket." />
      <ReportExportButtons endpoint={endpoint} slug={slug} params={{ asOf }} />
      <ReportState
        loading={loading}
        error={error}
        empty={!report || report.rows.length === 0}
        emptyText={kind === "receivables" ? "No open customer balances found for this date." : "No open supplier balances found for this date."}
        emptyHelp={
          kind === "receivables"
            ? "Finalize a customer invoice, then record payments or credit notes. Paid invoices disappear from this report and remain visible in the customer ledger."
            : "Finalize a supplier bill, then record supplier payments or debit notes. Fully settled bills disappear from this report and remain visible in the supplier ledger."
        }
        emptyActions={<ReportActionLinks kind={kind} />}
      />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid items={[...REPORT_BUCKETS.map((bucket) => [agingBucketLabel(bucket), report.bucketTotals[bucket]] as [string, string]), ["Grand total", report.grandTotal]]} />
          <AgingTable rows={report.rows} kind={kind} />
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
      <p className="text-xs leading-5 text-steel">Exports use the current report filters and are generated from posted accounting data. No request or response body is shown on this page.</p>
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
    </div>
  );
}

function ReportSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-steel">{description}</p>
        </div>
        <Link href="/reports" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">From</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">To</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:self-end">
          {loading ? "Loading..." : "Run report"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-steel">Use the date range to focus on posted activity for the period you want to review.</p>
    </form>
  );
}

function AsOfForm({ asOf, setAsOf, loading, onSubmit, helpText }: { asOf: string; setAsOf: (value: string) => void; loading: boolean; onSubmit: () => Promise<void>; helpText?: string }) {
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onSubmit();
      }}
      className="rounded-md border border-slate-200 bg-white p-5 shadow-panel"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">As of</span>
          <input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:self-end">
          {loading ? "Loading..." : "Run report"}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-steel">{helpText ?? "Use the date to review balances as they stood at that point."}</p>
    </form>
  );
}

function ReportState({
  loading,
  error,
  empty,
  emptyText,
  emptyHelp,
  emptyActions,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  emptyText: string;
  emptyHelp?: string;
  emptyActions?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {loading ? <StatusMessage type="loading">Loading report...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {!loading && !error && empty ? (
        emptyHelp || emptyActions ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
            <h2 className="font-semibold text-ink">{emptyText}</h2>
            {emptyHelp ? <p className="mt-2 max-w-3xl leading-6 text-steel">{emptyHelp}</p> : null}
            {emptyActions ? <div className="mt-4">{emptyActions}</div> : null}
          </div>
        ) : (
          <StatusMessage type="empty">{emptyText}</StatusMessage>
        )
      ) : null}
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

export function AgingReportGuide({ kind }: { kind: AgingReportKind }) {
  const isReceivables = kind === "receivables";
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
      <h2 className="text-base font-semibold text-ink">How to read this report</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <div className="font-semibold text-ink">What it shows</div>
          <p className="mt-1">
            {isReceivables
              ? "Customer invoices that still have a balance due after posted payments, credit notes, and refunds."
              : "Supplier bills that still have a balance due after supplier payments, debit notes, and refunds."}
          </p>
        </div>
        <div>
          <div className="font-semibold text-ink">Aging buckets</div>
          <p className="mt-1">Current, 1-30, 31-60, 61-90, and 90+ show how long each open balance has been outstanding as of the selected date.</p>
        </div>
        <div>
          <div className="font-semibold text-ink">After recording payment</div>
          <p className="mt-1">
            {isReceivables
              ? "The invoice balance drops here, while the customer ledger keeps the row-by-row payment allocation trail."
              : "The bill balance drops here, while the supplier ledger keeps the row-by-row payment allocation trail."}
          </p>
        </div>
      </div>
      <ReportActionLinks kind={kind} />
    </div>
  );
}

function ReportActionLinks({ kind }: { kind: AgingReportKind }) {
  const isReceivables = kind === "receivables";
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link href="/contacts" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
        View contacts
      </Link>
      <Link href={isReceivables ? "/sales/invoices/new" : "/purchases/bills/new"} className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
        {isReceivables ? "Create invoice" : "Create bill"}
      </Link>
      <Link href={isReceivables ? "/sales/customer-payments/new" : "/purchases/supplier-payments/new"} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
        {isReceivables ? "Record payment" : "Record supplier payment"}
      </Link>
      <Link href="/dashboard" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
        Dashboard
      </Link>
    </div>
  );
}

export function AgingTable({ rows, kind }: { rows: AgingReportRow[]; kind: AgingReportKind }) {
  if (rows.length === 0) {
    return null;
  }
  const isReceivables = kind === "receivables";

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[1120px] text-left text-sm">
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
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-ink">
                <Link href={`/contacts/${row.contact.id}`} className="hover:text-palm">
                  {row.contact.displayName ?? row.contact.name}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                <Link href={isReceivables ? `/sales/invoices/${row.id}` : `/purchases/bills/${row.id}`} className="hover:text-palm">
                  {row.number}
                </Link>
              </td>
              <td className="px-4 py-3 text-steel">{formatOptionalDate(row.issueDate, "-")}</td>
              <td className="px-4 py-3 text-steel">{formatOptionalDate(row.dueDate, "-")}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.total)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(row.balanceDue)}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.daysOverdue}</td>
              <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${agingBucketClass(row.bucket)}`}>{agingBucketLabel(row.bucket)}</span>
              </td>
              <td className="px-4 py-3">
                <Link href={isReceivables ? `/sales/invoices/${row.id}` : `/purchases/bills/${row.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  {isReceivables ? "Open invoice" : "Open bill"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function agingBucketClass(bucket: AgingReportRow["bucket"]): string {
  switch (bucket) {
    case "CURRENT":
      return "bg-emerald-50 text-emerald-700";
    case "1_30":
      return "bg-amber-50 text-amber-800";
    case "31_60":
      return "bg-orange-50 text-orange-800";
    case "61_90":
    case "90_PLUS":
      return "bg-rose-50 text-rosewood";
  }
}
