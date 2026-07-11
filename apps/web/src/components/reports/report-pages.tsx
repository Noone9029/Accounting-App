"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerButton, PageHeader, Toolbar } from "@/components/ui-ledger";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney, type AppLocale } from "@/lib/app-i18n";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  agingBucketLabel,
  balanceSheetStatusClass,
  buildReportExportPath,
  buildReportQuery,
  buildVatReturnReviewExportPath,
  monthStartDateInput,
  reportIndexGroups,
  REPORT_BUCKETS,
  VAT_REPORT_LABELS,
  reportExportFilename,
  todayDateInput,
} from "@/lib/reports";
import type {
  AgingReport,
  AgingReportRow,
  BalanceSheetReport,
  BalanceSheetSection,
  CashFlowReport,
  GeneralLedgerReport,
  ProfitAndLossReport,
  RevenueTrendReport,
  TopCustomersReport,
  TopProductsServicesReport,
  TrialBalanceReport,
  VatReturnReport,
  VatSummaryReport,
} from "@/lib/types";

type AgingReportKind = "receivables" | "payables";

export function ReportsIndexPage() {
  const { tc } = useAppLocale();
  const groups = reportIndexGroups();
  return (
    <section>
      <PageHeader
        eyebrow={tc("Accountant review")}
        title={tc("Reports")}
        description={tc("Start with Profit & Loss after your first finalized invoice or payment. Most reports are derived from posted journals and current open AR/AP balances, while VAT Return stays a draft accountant-review view with internal export only.")}
        actions={<LedgerButton href="/setup">{tc("Guided setup")}</LedgerButton>}
      />
      <Toolbar
        title={tc("First report path")}
        description={tc("Use Profit & Loss for the first business result, then Trial Balance to confirm debits and credits stay balanced.")}
        actions={
          <>
            <LedgerButton href="/reports/profit-and-loss" variant="primary">{tc("Open Profit & Loss")}</LedgerButton>
            <LedgerButton href="/dashboard">{tc("Back to dashboard")}</LedgerButton>
          </>
        }
      >
        <p className="mt-1">
          {tc("Reports are accountant-review surfaces. Tax reports keep internal-review wording until an official filing or tax-authority submission workflow is implemented and proven.")}
        </p>
      </Toolbar>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="mb-3 text-base font-semibold text-ink">{tc(group.label)}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.links.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel hover:border-palm">
                  <div className="text-base font-semibold text-ink">{tc(link.label)}</div>
                  <div className="mt-2 text-sm leading-6 text-steel">{tc(link.description)}</div>
                  <div className="mt-4 text-sm font-medium text-palm">{tc("Open report")}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function GeneralLedgerReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<GeneralLedgerReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const [transactionCurrency, setTransactionCurrency] = useState("");
  const { loading, error, load } = useReportLoader<GeneralLedgerReport>((query) => `/reports/general-ledger${query}`, setReport);
  const reportParams = () => ({
    from,
    to,
    transactionCurrency: transactionCurrency.trim().toUpperCase() || undefined,
  });

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("General Ledger")} description={tc("Opening balances, period activity, and natural running balances by account.")}>
      <DateRangeForm
        from={from}
        to={to}
        setFrom={setFrom}
        setTo={setTo}
        loading={loading}
        onSubmit={() => load(buildReportQuery(reportParams()))}
        additionalControls={
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Transaction currency")}</span>
            <input
              aria-label={tc("Transaction currency")}
              inputMode="text"
              maxLength={3}
              placeholder="USD"
              value={transactionCurrency}
              onChange={(event) => setTransactionCurrency(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-palm sm:w-28"
            />
          </label>
        }
      />
      <ReportExportButtons endpoint="/reports/general-ledger" slug="general-ledger" params={reportParams()} />
      <ReportState loading={loading} error={error} empty={!report || report.accounts.length === 0} emptyText="No posted journal activity found for this period." />
      {report ? (
        <div className="space-y-5">
          <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-steel">
            {tc("Official totals and running balances remain in")} {report.accountingContext.baseCurrency}.
            {report.fxFilters.transactionCurrency ? ` ${tc("Supporting transaction evidence is filtered to")} ${report.fxFilters.transactionCurrency}.` : ""}
          </p>
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
                    <span>{tc("Opening Dr")} {formatAppMoney(account.openingDebit, report.accountingContext.baseCurrency, locale)}</span>
                    <span>{tc("Opening Cr")} {formatAppMoney(account.openingCredit, report.accountingContext.baseCurrency, locale)}</span>
                    <span>{tc("Closing Dr")} {formatAppMoney(account.closingDebit, report.accountingContext.baseCurrency, locale)}</span>
                    <span>{tc("Closing Cr")} {formatAppMoney(account.closingCredit, report.accountingContext.baseCurrency, locale)}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Date")}</th>
                      <th className="px-4 py-3">{tc("Entry")}</th>
                      <th className="px-4 py-3">{tc("Description")}</th>
                      <th className="px-4 py-3">{tc("Reference")}</th>
                      <th className="px-4 py-3">{tc("Debit")}</th>
                      <th className="px-4 py-3">{tc("Credit")}</th>
                      <th className="px-4 py-3">{tc("Running balance")}</th>
                      <th className="px-4 py-3">{tc("Transaction evidence")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {account.lines.map((line) => (
                      <tr key={`${account.accountId}-${line.journalEntryId}-${line.entryNumber}-${line.description}`}>
                        <td className="px-4 py-3 text-steel">{formatAppDate(line.date, locale, "-")}</td>
                        <td dir="ltr" style={{ unicodeBidi: "isolate" }} className="px-4 py-3 font-mono text-xs">{line.entryNumber}</td>
                        <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                        <td dir="ltr" style={{ unicodeBidi: "isolate" }} className="px-4 py-3 text-steel">{line.reference ?? "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.debit, report.accountingContext.baseCurrency, locale)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.credit, report.accountingContext.baseCurrency, locale)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.runningBalance, report.accountingContext.baseCurrency, locale)}</td>
                        <td className="px-4 py-3 text-xs text-steel">
                          {line.currency && (line.transactionDebit || line.transactionCredit) ? (
                            <div className="space-y-1">
                              <div className="font-mono text-ink">
                                {formatAppMoney(line.transactionDebit ?? line.transactionCredit ?? "0", line.currency, locale)}
                              </div>
                              <div>{line.exchangeRate ? `${tc("Rate")} ${line.exchangeRate}` : tc("No captured rate")}</div>
                              <div>
                                {line.rateSnapshot
                                  ? `${line.rateSnapshot.source} · ${line.rateSnapshot.rateDate}`
                                  : tc("No rate snapshot")}
                              </div>
                            </div>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
                    {account.lines.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-5 text-center text-steel">
                          {tc("No period lines.")}
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
  const { tc } = useAppLocale();
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<TrialBalanceReport>((query) => `/reports/trial-balance${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("Trial Balance")} description={tc("Debit and credit balances from posted journal activity.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <ReportExportButtons endpoint="/reports/trial-balance" slug="trial-balance" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report || report.accounts.length === 0} emptyText="No trial balance rows found." />
      {report ? (
        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${report.totals.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rosewood"}`}>
              {report.totals.balanced ? tc("Balanced") : tc("Out of balance")}
            </span>
          </div>
          <AccountBalanceTable accounts={report.accounts} totals={report.totals} currency={report.accountingContext.baseCurrency} />
        </div>
      ) : null}
    </ReportSection>
  );
}

export function ProfitAndLossReportPage() {
  const { tc } = useAppLocale();
  const [report, setReport] = useState<ProfitAndLossReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<ProfitAndLossReport>((query) => `/reports/profit-and-loss${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("Profit & Loss")} description={tc("Revenue, cost of sales, expenses, gross profit, and net profit from posted journals.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <ReportExportButtons endpoint="/reports/profit-and-loss" slug="profit-and-loss" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report} emptyText="No profit and loss data found." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            currency={report.accountingContext.baseCurrency}
            items={[
              ["Revenue", report.revenue],
              ["Cost of sales", report.costOfSales],
              ["Gross profit", report.grossProfit],
              ["Expenses", report.expenses],
              ["Net profit", report.netProfit],
            ]}
          />
          {report.sections.map((section) => (
            <AmountSection key={section.type} title={section.type} total={section.total} accounts={section.accounts} currency={report.accountingContext.baseCurrency} />
          ))}
        </div>
      ) : null}
    </ReportSection>
  );
}

export function BalanceSheetReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [asOf, setAsOf] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<BalanceSheetReport>((query) => `/reports/balance-sheet${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ asOf }));
  }, []);

  return (
    <ReportSection title={tc("Balance Sheet")} description={tc("Assets, liabilities, equity, and retained earnings as of a selected date.")}>
      <AsOfForm asOf={asOf} setAsOf={setAsOf} loading={loading} onSubmit={() => load(buildReportQuery({ asOf }))} />
      <ReportExportButtons endpoint="/reports/balance-sheet" slug="balance-sheet" params={{ asOf }} />
      <ReportState loading={loading} error={error} empty={!report} emptyText="No balance sheet data found." />
      {report ? (
        <div className="space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${balanceSheetStatusClass(report)}`}>
                {report.balanced ? tc("Balanced") : `${tc("Out of balance by")} ${formatAppMoney(report.difference, report.accountingContext.baseCurrency, locale)}`}
              </span>
              <div className="text-sm text-steel">
                {tc("Total assets")} {formatAppMoney(report.totalAssets, report.accountingContext.baseCurrency, locale)} / {tc("Total liabilities and equity")} {formatAppMoney(report.totalLiabilitiesAndEquity, report.accountingContext.baseCurrency, locale)}
              </div>
            </div>
          </div>
          <BalanceSheetSectionView title="Assets" section={report.assets} currency={report.accountingContext.baseCurrency} />
          <BalanceSheetSectionView title="Liabilities" section={report.liabilities} currency={report.accountingContext.baseCurrency} />
          <BalanceSheetSectionView title="Equity" section={report.equity} currency={report.accountingContext.baseCurrency} />
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel text-sm">
            <div className="flex justify-between gap-4 font-semibold text-ink">
              <span>{tc("Retained earnings")}</span>
              <span className="font-mono text-xs">{formatAppMoney(report.retainedEarnings, report.accountingContext.baseCurrency, locale)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </ReportSection>
  );
}

export function CashFlowReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<CashFlowReport>((query) => `/reports/cash-flow${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("Cash Flow")} description={tc("Cash movement by month from posted cash and bank journal lines. Read-only management report; no banking provider action is triggered.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <AdvancedReportCsvExportCard endpoint="/reports/cash-flow" slug="cash-flow" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report || report.rows.length === 0} emptyText="No cash or bank journal lines found for this period." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            currency={report.accountingContext.baseCurrency}
            items={[
              ["Opening cash", report.totals.openingCash],
              ["Inflows", report.totals.inflows],
              ["Outflows", report.totals.outflows],
              ["Net cash flow", report.totals.netCashFlow],
              ["Closing cash", report.totals.closingCash],
            ]}
          />
          <AdvancedReportBasis basis={report.basis} details={`${tc("Granularity")}: ${report.granularity} / ${tc("Cash and bank accounts")}: ${report.totals.accountCount} / ${tc("Journal lines")}: ${report.totals.lineCount}`} />
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Period")}</th>
                  <th className="px-4 py-3">{tc("Inflows")}</th>
                  <th className="px-4 py-3">{tc("Outflows")}</th>
                  <th className="px-4 py-3">{tc("Net cash flow")}</th>
                  <th className="px-4 py-3">{tc("Lines")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((row) => (
                  <tr key={row.period}>
                    <td className="px-4 py-3 font-medium text-ink">{row.period}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.inflows, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.outflows, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.netCashFlow, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.lineCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReportNotes notes={report.notes} />
        </div>
      ) : null}
    </ReportSection>
  );
}

export function RevenueTrendReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<RevenueTrendReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<RevenueTrendReport>((query) => `/reports/revenue-trend${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("Revenue Trend")} description={tc("Monthly revenue trend from posted revenue journal lines. Read-only management report; no filing or provider workflow is created.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <AdvancedReportCsvExportCard endpoint="/reports/revenue-trend" slug="revenue-trend" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report || report.rows.length === 0} emptyText="No posted revenue journal lines found for this period." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid items={[["Revenue", report.totals.revenue]]} currency={report.accountingContext.baseCurrency} />
          <AdvancedReportBasis basis={report.basis} details={`${tc("Granularity")}: ${report.granularity} / ${tc("Journal lines")}: ${report.totals.lineCount}`} />
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[620px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Period")}</th>
                  <th className="px-4 py-3">{tc("Revenue")}</th>
                  <th className="px-4 py-3">{tc("Lines")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((row) => (
                  <tr key={row.period}>
                    <td className="px-4 py-3 font-medium text-ink">{row.period}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.revenue, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.lineCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReportNotes notes={report.notes} />
        </div>
      ) : null}
    </ReportSection>
  );
}

export function TopCustomersReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<TopCustomersReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<TopCustomersReport>((query) => `/reports/top-customers${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("Top Customers")} description={tc("Customers ranked by finalized sales invoice gross totals in the selected period.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <AdvancedReportCsvExportCard endpoint="/reports/top-customers" slug="top-customers" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report || report.rows.length === 0} emptyText="No finalized sales invoices found for this period." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            currency={report.accountingContext.baseCurrency}
            items={[
              ["Taxable amount", report.totals.taxableAmount],
              ["Tax amount", report.totals.taxAmount],
              ["Gross amount", report.totals.grossAmount],
            ]}
          />
          <AdvancedReportBasis basis={report.basis} details={`${tc("Customers")}: ${report.totals.customerCount} / ${tc("Invoices")}: ${report.totals.invoiceCount} / ${tc("Limit")}: ${report.limit}`} />
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Customer")}</th>
                  <th className="px-4 py-3">{tc("Invoices")}</th>
                  <th className="px-4 py-3">{tc("Taxable amount")}</th>
                  <th className="px-4 py-3">{tc("Tax amount")}</th>
                  <th className="px-4 py-3">{tc("Gross amount")}</th>
                  <th className="px-4 py-3">{tc("Latest invoice")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((row) => (
                  <tr key={row.customer.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      <Link href={partyDetailHref("customer", row.customer.id)} className="hover:text-palm">
                        {row.customer.displayName ?? row.customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.invoiceCount}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.taxableAmount, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.taxAmount, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.grossAmount, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 text-steel">{formatAppDate(row.latestInvoiceDate, locale, "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReportNotes notes={report.notes} />
        </div>
      ) : null}
    </ReportSection>
  );
}

export function TopProductsServicesReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<TopProductsServicesReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<TopProductsServicesReport>((query) => `/reports/top-products-services${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("Top Products & Services")} description={tc("Catalog items and uncataloged sales lines ranked by finalized sales invoice gross totals.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <AdvancedReportCsvExportCard endpoint="/reports/top-products-services" slug="top-products-services" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report || report.rows.length === 0} emptyText="No finalized sales invoice lines found for this period." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            currency={report.accountingContext.baseCurrency}
            items={[
              ["Quantity", report.totals.quantity],
              ["Taxable amount", report.totals.taxableAmount],
              ["Tax amount", report.totals.taxAmount],
              ["Gross amount", report.totals.grossAmount],
            ]}
          />
          <AdvancedReportBasis basis={report.basis} details={`${tc("Lines")}: ${report.totals.lineCount} / ${tc("Catalog items")}: ${report.totals.catalogItemCount} / ${tc("Uncataloged groups")}: ${report.totals.uncatalogedLineGroupCount} / ${tc("Limit")}: ${report.limit}`} />
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[980px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Product / service")}</th>
                  <th className="px-4 py-3">{tc("Kind")}</th>
                  <th className="px-4 py-3">{tc("Lines")}</th>
                  <th className="px-4 py-3">{tc("Quantity")}</th>
                  <th className="px-4 py-3">{tc("Taxable amount")}</th>
                  <th className="px-4 py-3">{tc("Tax amount")}</th>
                  <th className="px-4 py-3">{tc("Gross amount")}</th>
                  <th className="px-4 py-3">{tc("Latest invoice")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((row) => (
                  <tr key={`${row.kind}-${row.item?.id ?? row.label}`}>
                    <td className="px-4 py-3 font-medium text-ink">
                      <span>{row.label}</span>
                      {row.item?.sku ? <div className="mt-1 font-mono text-xs text-steel">{row.item.sku}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-steel">{tc(reportSectionTitle(row.kind))}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.lineCount}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.taxableAmount, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.taxAmount, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.grossAmount, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 text-steel">{formatAppDate(row.latestInvoiceDate, locale, "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ReportNotes notes={report.notes} />
        </div>
      ) : null}
    </ReportSection>
  );
}

export function VatSummaryReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<VatSummaryReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<VatSummaryReport>((query) => `/reports/vat-summary${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  return (
    <ReportSection title={tc("VAT Summary")} description={tc("Account-basis VAT review from posted VAT accounts. It is not an official filing workflow.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <VatReportReviewContext
        title={tc("Account-basis review")}
        body={tc("VAT Summary reflects posted movement in VAT Payable 220 and VAT Receivable 230. Compare it with VAT Return before treating either surface as filing-ready.")}
        href="/reports/vat-return"
        linkLabel={tc("Open draft VAT Return")}
      />
      <ReportExportButtons endpoint="/reports/vat-summary" slug="vat-summary" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report} emptyText="No VAT summary data found." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            currency={report.accountingContext.baseCurrency}
            items={[
              [VAT_REPORT_LABELS.outputVat, report.salesVat],
              [VAT_REPORT_LABELS.inputVat, report.purchaseVat],
              ["Net payable", report.netVatPayable],
            ]}
          />
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{report.notes[0]}</div>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Category")}</th>
                  <th className="px-4 py-3">{tc("Account")}</th>
                  <th className="px-4 py-3">{tc("Amount")}</th>
                  <th className="px-4 py-3">{tc("Tax amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.sections.map((section) => (
                  <tr key={section.category}>
                    <td className="px-4 py-3 font-medium text-ink">{tc(reportSectionTitle(section.category))}</td>
                    <td dir="ltr" style={{ unicodeBidi: "isolate" }} className="px-4 py-3 text-steel">{section.accountCode}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(section.amount, report.accountingContext.baseCurrency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(section.taxAmount, report.accountingContext.baseCurrency, locale)}</td>
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

export function VatReturnReportPage() {
  const { locale, tc } = useAppLocale();
  const [report, setReport] = useState<VatReturnReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<VatReturnReport>((query) => `/reports/vat-return${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  const hasDocuments = report ? report.sales.documentCount > 0 || report.purchases.documentCount > 0 : false;

  return (
    <ReportSection title={tc("VAT Return")} description={tc("Draft VAT return review from finalized sales invoices and finalized purchase bills. Internal review only; no official filing workflow is implemented.")}>
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <VatReportReviewContext
        title={tc("Source-document review")}
        body={tc("VAT Return is built from finalized sales invoices and finalized purchase bills in the selected period. Use it for internal accountant or tax-advisor review, then compare it with VAT Summary.")}
        href="/reports/vat-summary"
        linkLabel={tc("Open VAT Summary")}
      />
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        {tc("This draft view is for accountant or tax-advisor review during controlled beta. It does not submit to a tax authority, does not create a filing record, is not a government-format export, and does not prove ZATCA or GCC filing compliance.")}
      </div>
      <VatReturnReviewExportCard params={{ from, to }} />
      <ReportState
        loading={loading}
        error={error}
        empty={!report || !hasDocuments}
        emptyText="No finalized VAT source documents found for this period."
        emptyHelp="VAT Return uses finalized sales invoices and finalized purchase bills only. Draft and voided documents are excluded from this internal review surface."
        emptyActions={<VatReturnReviewActions />}
      />
      {report && hasDocuments ? (
        <div className="space-y-5">
          <SummaryGrid
            currency={report.accountingContext.baseCurrency}
            items={[
              [VAT_REPORT_LABELS.outputVat, report.outputVat],
              [VAT_REPORT_LABELS.inputVat, report.inputVat],
              [Number.parseFloat(report.netVatRefundable) > 0 ? "Net refundable" : "Net payable", Number.parseFloat(report.netVatRefundable) > 0 ? report.netVatRefundable : report.netVatPayable],
            ]}
          />
          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-steel shadow-panel">
            <p>
              <span className="font-semibold text-ink">{tc("Basis")}:</span> {report.basis === "FINALIZED_SOURCE_DOCUMENTS" ? tc("Finalized sales invoices and finalized purchase bills in the selected date range.") : report.basis}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-ink">{tc("Export status")}:</span> {tc("Internal draft review CSV only. Official filing format, submission workflow, authority exchange, and compliance approval are not implemented here.")}
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Source")}</th>
                  <th className="px-4 py-3">{tc("Documents")}</th>
                  <th className="px-4 py-3">{tc("Taxable amount")}</th>
                  <th className="px-4 py-3">{tc("Amount")}</th>
                  <th className="px-4 py-3">{tc("Tax amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-ink">{tc("Finalized sales invoices")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{report.sales.documentCount}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(report.sales.taxableAmount, report.accountingContext.baseCurrency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(report.sales.grossAmount, report.accountingContext.baseCurrency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(report.sales.taxAmount, report.accountingContext.baseCurrency, locale)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-ink">{tc("Finalized purchase bills")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{report.purchases.documentCount}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(report.purchases.taxableAmount, report.accountingContext.baseCurrency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(report.purchases.grossAmount, report.accountingContext.baseCurrency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(report.purchases.taxAmount, report.accountingContext.baseCurrency, locale)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-steel shadow-panel">
            {report.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      ) : null}
    </ReportSection>
  );
}

export function AgedReceivablesReportPage() {
  const { tc } = useAppLocale();
  return (
    <AgingReportPage
      title={tc("Aged Receivables")}
      endpoint="/reports/aged-receivables"
      description={tc("Open finalized customer invoices by overdue bucket after posted payments, credit notes, and refunds.")}
      kind="receivables"
    />
  );
}

export function AgedPayablesReportPage() {
  const { tc } = useAppLocale();
  return <AgingReportPage title={tc("Aged Payables")} endpoint="/reports/aged-payables" description={tc("Open finalized supplier bills by overdue bucket after supplier payments and debit notes.")} kind="payables" />;
}

function AgingReportPage({ title, endpoint, description, kind }: { title: string; endpoint: string; description: string; kind: AgingReportKind }) {
  const { tc } = useAppLocale();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<AgingReport | null>(null);
  const [asOf, setAsOf] = useState(todayDateInput());
  const [transactionCurrency, setTransactionCurrency] = useState("");
  const { loading, error, load } = useReportLoader<AgingReport>((query) => `${endpoint}${query}`, setReport);
  const slug = endpoint.split("/").at(-1) ?? "aging-report";
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const reportReturnToHref = buildAgingReportHref(endpoint, asOf, returnTo);
  const reportParams = () => ({ asOf, transactionCurrency: transactionCurrency.trim().toUpperCase() || undefined });

  useEffect(() => {
    void load(buildReportQuery({ asOf }));
  }, []);

  return (
    <ReportSection title={title} description={description}>
      {returnTo ? (
        <div className="mb-4">
          <Link href={returnTo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back to workspace")}
          </Link>
        </div>
      ) : null}
      <AgingReportGuide kind={kind} returnToHref={reportReturnToHref} />
      <AsOfForm
        asOf={asOf}
        setAsOf={setAsOf}
        loading={loading}
        onSubmit={() => load(buildReportQuery(reportParams()))}
        helpText={tc("Changing the date recalculates which open invoices or bills fall into each aging bucket.")}
        additionalControls={
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Transaction currency")}</span>
            <input
              aria-label={tc("Transaction currency")}
              maxLength={3}
              placeholder="USD"
              value={transactionCurrency}
              onChange={(event) => setTransactionCurrency(event.target.value.toUpperCase())}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-palm sm:w-28"
            />
          </label>
        }
      />
      <ReportExportButtons endpoint={endpoint} slug={slug} params={reportParams()} />
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
          <SummaryGrid items={[...REPORT_BUCKETS.map((bucket) => [agingBucketLabel(bucket), report.bucketTotals[bucket]] as [string, string]), ["Grand total", report.grandTotal]]} currency={report.accountingContext.baseCurrency} />
          {Object.keys(report.transactionTotalsByCurrency ?? {}).length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-steel">
              <span className="font-semibold text-ink">{tc("Open transaction totals")}:</span>
              {Object.entries(report.transactionTotalsByCurrency).map(([currency, amount]) => (
                <span key={currency} className="rounded border border-slate-200 bg-white px-2 py-1 font-mono">
                  {formatAppMoney(amount, currency, "en")} {tc("open")}
                </span>
              ))}
            </div>
          ) : null}
          <AgingTable rows={report.rows} kind={kind} returnToHref={reportReturnToHref} currency={report.accountingContext.baseCurrency} />
        </div>
      ) : null}
    </ReportSection>
  );
}

function AdvancedReportCsvExportCard({ endpoint, slug, params }: { endpoint: string; slug: string; params: Record<string, string | null | undefined> }) {
  const { tc } = useAppLocale();
  const { canAny } = usePermissions();
  const canExportReports = canAny(PERMISSIONS.reports.export, PERMISSIONS.generatedDocuments.download);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  if (!canExportReports) {
    return <StatusMessage type="info">{tc("Advanced report CSV export requires report export or generated document download permission.")}</StatusMessage>;
  }

  async function download() {
    setDownloading(true);
    setError("");
    try {
      await downloadAuthenticatedFile(buildReportExportPath(endpoint, params, "csv"), reportExportFilename(slug, "csv"));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download advanced report CSV."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void download()} disabled={downloading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
          {downloading ? tc("Downloading CSV...") : tc("Download CSV")}
        </button>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-steel">{tc("PDF export not implemented")}</span>
      </div>
      <p className="text-xs leading-5 text-steel">
        {tc("CSV export uses the current advanced report filters. PDF export, scheduled delivery, provider calls, and compliance submission are not implemented for this report.")}
      </p>
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
    </div>
  );
}

function AdvancedReportBasis({ basis, details }: { basis: string; details: string }) {
  const { tc } = useAppLocale();
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-steel shadow-panel">
      <p>
        <span className="font-semibold text-ink">{tc("Basis")}:</span> {basis}
      </p>
      <p className="mt-1">{details}</p>
    </div>
  );
}

function ReportNotes({ notes }: { notes: string[] }) {
  const { tc } = useAppLocale();
  if (notes.length === 0) {
    return null;
  }
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-steel shadow-panel">
      {notes.map((note) => (
        <p key={note}>{tc(note)}</p>
      ))}
    </div>
  );
}

function useReportLoader<T>(path: (query: string) => string, setReport: (value: T) => void) {
  const { tc } = useAppLocale();
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
      setError(loadError instanceof Error ? loadError.message : tc("Unable to load report."));
    } finally {
      setLoading(false);
    }
  }

  return { organizationId, loading, error, load };
}

function ReportExportButtons({ endpoint, slug, params }: { endpoint: string; slug: string; params: Record<string, string | null | undefined> }) {
  const { tc } = useAppLocale();
  const { canAny } = usePermissions();
  const canExportReports = canAny(PERMISSIONS.reports.export, PERMISSIONS.generatedDocuments.download);
  const [downloading, setDownloading] = useState<"" | "csv" | "pdf">("");
  const [error, setError] = useState("");

  if (!canExportReports) {
    return <StatusMessage type="info">{tc("Report export requires report export or generated document download permission.")}</StatusMessage>;
  }

  async function download(format: "csv" | "pdf") {
    setDownloading(format);
    setError("");
    try {
      await downloadAuthenticatedFile(buildReportExportPath(endpoint, params, format), reportExportFilename(slug, format));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download report."));
    } finally {
      setDownloading("");
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void download("csv")} disabled={Boolean(downloading)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
          {downloading === "csv" ? tc("Downloading CSV...") : tc("Download CSV")}
        </button>
        <button type="button" onClick={() => void download("pdf")} disabled={Boolean(downloading)} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
          {downloading === "pdf" ? tc("Downloading PDF...") : tc("Download PDF")}
        </button>
      </div>
      <p className="text-xs leading-5 text-steel">{tc("Exports use the current report filters and are generated from posted accounting data. No request or response body is shown on this page.")}</p>
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
    </div>
  );
}

function VatReturnReviewExportCard({ params }: { params: Record<string, string | null | undefined> }) {
  const { tc } = useAppLocale();
  const { canAny } = usePermissions();
  const canExportReports = canAny(PERMISSIONS.reports.export, PERMISSIONS.generatedDocuments.download);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  if (!canExportReports) {
    return <StatusMessage type="info">{tc("Draft VAT review export requires report export or generated document download permission.")}</StatusMessage>;
  }

  async function download() {
    setDownloading(true);
    setError("");
    try {
      await downloadAuthenticatedFile(buildVatReturnReviewExportPath(params), reportExportFilename("vat-return-draft-review", "csv"));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download draft VAT review export."));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void download()} disabled={downloading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
          {downloading ? tc("Downloading draft review CSV...") : tc("Download draft review CSV")}
        </button>
      </div>
      <p className="text-xs leading-5 text-steel">
        {tc("Internal review export only. This CSV reflects the current VAT Return filters, does not create a filing record, and is not an official tax authority submission format.")}
      </p>
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
    </div>
  );
}

function VatReportReviewContext({ title, body, href, linkLabel }: { title: string; body: string; href: string; linkLabel: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-steel shadow-panel">
      <div className="font-semibold text-ink">{title}</div>
      <p className="mt-2">{body}</p>
      <Link href={href} className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {linkLabel}
      </Link>
    </div>
  );
}

function VatReturnReviewActions() {
  const { tc } = useAppLocale();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link href="/sales/invoices/new?returnTo=%2Freports%2Fvat-return" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
        {tc("Create invoice")}
      </Link>
      <Link href="/purchases/bills/new?returnTo=%2Freports%2Fvat-return" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
        {tc("Create bill")}
      </Link>
      <Link href="/reports/vat-summary" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
        {tc("Open VAT Summary")}
      </Link>
    </div>
  );
}

function ReportSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { tc } = useAppLocale();
  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-steel">{description}</p>
        </div>
        <Link href="/reports" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Reports")}
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
  additionalControls,
}: {
  from: string;
  to: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  loading: boolean;
  onSubmit: () => Promise<void>;
  additionalControls?: ReactNode;
}) {
  const { tc } = useAppLocale();
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
          <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("From")}</span>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("To")}</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
        </label>
        {additionalControls}
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:self-end">
          {loading ? tc("Loading...") : tc("Run report")}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-steel">{tc("Use the date range to focus on posted activity for the period you want to review.")}</p>
    </form>
  );
}

function AsOfForm({ asOf, setAsOf, loading, onSubmit, helpText, additionalControls }: { asOf: string; setAsOf: (value: string) => void; loading: boolean; onSubmit: () => Promise<void>; helpText?: string; additionalControls?: ReactNode }) {
  const { tc } = useAppLocale();
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
          <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("As of")}</span>
          <input type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm sm:w-auto" />
        </label>
        {additionalControls}
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:self-end">
          {loading ? tc("Loading...") : tc("Run report")}
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-steel">{helpText ?? tc("Use the date to review balances as they stood at that point.")}</p>
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
  const { tc } = useAppLocale();
  return (
    <div className="space-y-3">
      {loading ? <StatusMessage type="loading">{tc("Loading report...")}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {!loading && !error && empty ? (
        emptyHelp || emptyActions ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
            <h2 className="font-semibold text-ink">{tc(emptyText)}</h2>
            {emptyHelp ? <p className="mt-2 max-w-3xl leading-6 text-steel">{tc(emptyHelp)}</p> : null}
            {emptyActions ? <div className="mt-4">{emptyActions}</div> : null}
          </div>
        ) : (
          <StatusMessage type="empty">{tc(emptyText)}</StatusMessage>
        )
      ) : null}
    </div>
  );
}

function SummaryGrid({ items, currency }: { items: Array<[string, string]>; currency: string }) {
  const { locale, tc } = useAppLocale();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <div className="text-xs uppercase tracking-wide text-steel">{tc(label)}</div>
          <div className="mt-2 font-mono text-sm font-semibold text-ink">{formatAppMoney(value, currency, locale)}</div>
        </div>
      ))}
    </div>
  );
}

function AccountBalanceTable({ accounts, totals, currency }: { accounts: TrialBalanceReport["accounts"]; totals: TrialBalanceReport["totals"]; currency: string }) {
  const { tc } = useAppLocale();
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[1120px] text-start text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">{tc("Account")}</th>
            <th className="px-4 py-3">{tc("Type")}</th>
            <th className="px-4 py-3">{tc("Opening Dr")}</th>
            <th className="px-4 py-3">{tc("Opening Cr")}</th>
            <th className="px-4 py-3">{tc("Period Dr")}</th>
            <th className="px-4 py-3">{tc("Period Cr")}</th>
            <th className="px-4 py-3">{tc("Closing Dr")}</th>
            <th className="px-4 py-3">{tc("Closing Cr")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.map((account) => (
            <tr key={account.accountId}>
              <td className="px-4 py-3 font-medium text-ink">
                {account.code} {account.name}
              </td>
              <td className="px-4 py-3 text-steel">{tc(reportSectionTitle(account.type))}</td>
              <MoneyCells values={[account.openingDebit, account.openingCredit, account.periodDebit, account.periodCredit, account.closingDebit, account.closingCredit]} currency={currency} />
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-ink">
            <td className="px-4 py-3">{tc("Totals")}</td>
            <td className="px-4 py-3" />
            <MoneyCells values={[totals.openingDebit, totals.openingCredit, totals.periodDebit, totals.periodCredit, totals.closingDebit, totals.closingCredit]} currency={currency} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MoneyCells({ values, currency }: { values: string[]; currency: string }) {
  const { locale } = useAppLocale();
  return (
    <>
      {values.map((value, index) => (
        <td key={`${value}-${index}`} className="px-4 py-3 font-mono text-xs">
          {formatAppMoney(value, currency, locale)}
        </td>
      ))}
    </>
  );
}

function AmountSection({ title, total, accounts, currency }: { title: string; total: string; accounts: Array<{ accountId: string; code: string; name: string; amount: string }>; currency: string }) {
  const { locale, tc } = useAppLocale();
  const translatedTitle = tc(reportSectionTitle(title));
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[720px] text-start text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">{translatedTitle}</th>
            <th className="px-4 py-3">{tc("Amount")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accounts.map((account) => (
            <tr key={account.accountId}>
              <td className="px-4 py-3 font-medium text-ink">
                <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{account.code}</span> {account.name}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(account.amount, currency, locale)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-ink">
            <td className="px-4 py-3">{totalLabel(translatedTitle, locale)}</td>
            <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(total, currency, locale)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BalanceSheetSectionView({ title, section, currency }: { title: string; section: BalanceSheetSection; currency: string }) {
  return <AmountSection title={title} total={section.total} accounts={section.accounts} currency={currency} />;
}

function reportSectionTitle(value: string): string {
  const known: Record<string, string> = {
    ASSET: "Asset",
    LIABILITY: "Liability",
    EQUITY: "Equity",
    REVENUE: "Revenue",
    COST_OF_SALES: "Cost of sales",
    EXPENSE: "Expense",
    EXPENSES: "Expenses",
    STANDARD: "Standard",
    ZERO_RATED: "Zero rated",
    EXEMPT: "Exempt",
    OUT_OF_SCOPE: "Out of scope",
  };
  if (known[value]) {
    return known[value];
  }
  const normalized = value.replaceAll("_", " ").trim().toLowerCase();
  return normalized
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replaceAll("Vat", "VAT")
    .replaceAll("Ar", "AR")
    .replaceAll("Ap", "AP");
}

function totalLabel(label: string, locale: AppLocale): string {
  return locale === "ar" ? `إجمالي ${label}` : `Total ${label.toLowerCase()}`;
}

export function AgingReportGuide({ kind, returnToHref }: { kind: AgingReportKind; returnToHref?: string }) {
  const { tc } = useAppLocale();
  const isReceivables = kind === "receivables";
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
      <h2 className="text-base font-semibold text-ink">{tc("How to read this report")}</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <div className="font-semibold text-ink">{tc("What it shows")}</div>
          <p className="mt-1">
            {isReceivables
              ? tc("AR Aging is based on outstanding sales invoices only: customer invoices that still have a balance due after posted payments, credit notes, and refunds. Quotes, recurring templates, delivery notes, and collection cases are excluded.")
              : tc("Supplier bills that still have a balance due after supplier payments, debit notes, and refunds.")}
          </p>
        </div>
        <div>
          <div className="font-semibold text-ink">{tc("Aging buckets")}</div>
          <p className="mt-1">{tc("Current, 1-30, 31-60, 61-90, and 90+ show how long each open balance has been outstanding as of the selected date.")}</p>
        </div>
        <div>
          <div className="font-semibold text-ink">{tc("After recording payment")}</div>
          <p className="mt-1">
            {isReceivables
              ? tc("The invoice balance drops here, while the customer ledger keeps the row-by-row payment allocation trail.")
              : tc("The bill balance drops here, while the supplier ledger keeps the row-by-row payment allocation trail.")}
          </p>
        </div>
      </div>
      <ReportActionLinks kind={kind} returnToHref={returnToHref} />
    </div>
  );
}

function ReportActionLinks({ kind, returnToHref }: { kind: AgingReportKind; returnToHref?: string }) {
  const { tc } = useAppLocale();
  const isReceivables = kind === "receivables";
  const returnTo = returnToHref || (isReceivables ? "/reports/aged-receivables" : "/reports/aged-payables");
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link
        href={isReceivables ? "/customers" : "/suppliers"}
        className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100"
      >
        {isReceivables ? tc("View customers") : tc("View suppliers")}
      </Link>
      <Link
        href={`${isReceivables ? "/sales/invoices/new" : "/purchases/bills/new"}?returnTo=${encodeURIComponent(returnTo)}`}
        className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark"
      >
        {isReceivables ? tc("Create invoice") : tc("Create bill")}
      </Link>
      <Link
        href={`${isReceivables ? "/sales/customer-payments/new" : "/purchases/supplier-payments/new"}?returnTo=${encodeURIComponent(returnTo)}`}
        className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100"
      >
        {isReceivables ? tc("Record payment") : tc("Record supplier payment")}
      </Link>
      <Link href="/dashboard" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
        {tc("Dashboard")}
      </Link>
    </div>
  );
}

export function AgingTable({ rows, kind, returnToHref, currency }: { rows: AgingReportRow[]; kind: AgingReportKind; returnToHref?: string; currency: string }) {
  const { locale, tc } = useAppLocale();
  if (rows.length === 0) {
    return null;
  }
  const isReceivables = kind === "receivables";

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
      <table className="w-full min-w-[1420px] text-start text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">{tc("Contact")}</th>
            <th className="px-4 py-3">{tc("Number")}</th>
            <th className="px-4 py-3">{tc("Issue date")}</th>
            <th className="px-4 py-3">{tc("Due date")}</th>
            <th className="px-4 py-3">{tc("Total")}</th>
            <th className="px-4 py-3">{tc("Balance due")}</th>
            <th className="px-4 py-3">{tc("Foreign-currency evidence")}</th>
            <th className="px-4 py-3">{tc("Days overdue")}</th>
            <th className="px-4 py-3">{tc("Bucket")}</th>
            <th className="px-4 py-3">{tc("Action")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-ink">
                <Link href={partyDetailHref(isReceivables ? "customer" : "supplier", row.contact.id)} className="hover:text-palm">
                  {row.contact.displayName ?? row.contact.name}
                </Link>
              </td>
              <td dir="ltr" style={{ unicodeBidi: "isolate" }} className="px-4 py-3 font-mono text-xs">
                <Link href={appendReturnTo(isReceivables ? `/sales/invoices/${row.id}` : `/purchases/bills/${row.id}`, returnToHref)} className="hover:text-palm">
                  {row.number}
                </Link>
              </td>
              <td className="px-4 py-3 text-steel">{formatAppDate(row.issueDate, locale, "-")}</td>
              <td className="px-4 py-3 text-steel">{formatAppDate(row.dueDate, locale, "-")}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.total, currency, locale)}</td>
              <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(row.balanceDue, currency, locale)}</td>
              <td className="px-4 py-3 text-xs text-steel">
                {row.currency && row.openTransactionAmount ? (
                  <div className="space-y-1">
                    <div className="font-mono text-ink">{formatAppMoney(row.openTransactionAmount, row.currency, "en")} {tc("open")}</div>
                    <div>{formatAppMoney(row.carryingBaseAmount ?? row.balanceDue, currency, locale)} {tc("carrying")}</div>
                    <div>{formatAppMoney(row.sourceBaseOpenAmount ?? row.balanceDue, currency, locale)} {tc("source")}</div>
                    <div>
                      {tc("Rate")} {row.carryingRate ?? "-"}
                      {row.revaluation ? ` · ${row.revaluation.rateSource} ${row.revaluation.rateDate}` : ""}
                    </div>
                  </div>
                ) : "-"}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{row.daysOverdue}</td>
              <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${agingBucketClass(row.bucket)}`}>{tc(agingBucketLabel(row.bucket))}</span>
              </td>
              <td className="px-4 py-3">
                <Link href={appendReturnTo(isReceivables ? `/sales/invoices/${row.id}` : `/purchases/bills/${row.id}`, returnToHref)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  {isReceivables ? tc("Open invoice") : tc("Open bill")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildAgingReportHref(endpoint: string, asOf: string, returnTo?: string): string {
  const params = new URLSearchParams();
  if (asOf) {
    params.set("asOf", asOf);
  }
  if (returnTo) {
    params.set("returnTo", returnTo);
  }
  const query = params.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

function appendReturnTo(href: string, returnToHref?: string): string {
  if (!returnToHref) {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnToHref)}`;
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
