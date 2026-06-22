"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatCard,
  LedgerSummaryBand,
  LedgerToolbar,
  LedgerWorkflowCard,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  agingBucketLabel,
  balanceSheetStatusClass,
  balanceSheetStatusLabel,
  buildReportExportPath,
  buildReportQuery,
  buildVatReturnReviewExportPath,
  monthStartDateInput,
  REPORT_BUCKETS,
  VAT_REPORT_LABELS,
  reportIndexGroups,
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
  VatReturnReport,
  VatSummaryReport,
} from "@/lib/types";

type AgingReportKind = "receivables" | "payables";

export function ReportsIndexPage() {
  const groups = reportIndexGroups();

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Accountant review"
        title="Reports"
        description="Start with Profit & Loss after your first finalized invoice or payment. Most reports are derived from posted journals and current open AR/AP balances, while VAT Return stays a draft accountant-review view with internal export only."
        actions={<LedgerButton href="/setup">Guided setup</LedgerButton>}
      />
      <div className="mb-5">
        <LedgerToolbar
          title="First report path"
          description="Use Profit & Loss for the first business result, then Trial Balance to confirm debits and credits stay balanced."
          actions={
            <>
              <LedgerButton href="/reports/profit-and-loss" variant="primary">Open Profit & Loss</LedgerButton>
              <LedgerButton href="/dashboard">Back to dashboard</LedgerButton>
            </>
          }
        >
          <p className="text-sm leading-6 text-steel">
            Reports are accountant-review surfaces. Tax reports keep internal-review wording until an official filing or tax-authority submission workflow is implemented and proven.
          </p>
        </LedgerToolbar>
      </div>
      <LedgerPageBody>
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="mb-3 text-base font-semibold text-ink">{group.label}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.links.map((link) => (
                <LedgerWorkflowCard key={link.href} title={link.label} href={link.href} description={link.description} />
              ))}
            </div>
          </section>
        ))}
      </LedgerPageBody>
    </LedgerPage>
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
            <LedgerPanel key={account.accountId}>
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
              <LedgerDataTable minWidth="980px" className="mt-4">
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
              </LedgerDataTable>
            </LedgerPanel>
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
          <LedgerPanel>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${report.totals.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rosewood"}`}>
              {report.totals.balanced ? "Balanced" : "Out of balance"}
            </span>
          </LedgerPanel>
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
          <LedgerPanel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${balanceSheetStatusClass(report)}`}>{balanceSheetStatusLabel(report)}</span>
              <div className="text-sm text-steel">
                Total assets {formatMoneyAmount(report.totalAssets)} / Total liabilities and equity {formatMoneyAmount(report.totalLiabilitiesAndEquity)}
              </div>
            </div>
          </LedgerPanel>
          <BalanceSheetSectionView title="Assets" section={report.assets} />
          <BalanceSheetSectionView title="Liabilities" section={report.liabilities} />
          <BalanceSheetSectionView title="Equity" section={report.equity} />
          <LedgerPanel>
            <div className="flex justify-between gap-4 font-semibold text-ink">
              <span>Retained earnings</span>
              <LedgerMoney>{formatMoneyAmount(report.retainedEarnings)}</LedgerMoney>
            </div>
          </LedgerPanel>
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
    <ReportSection title="VAT Summary" description="Account-basis VAT review from posted VAT accounts. It is not an official filing workflow.">
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <VatReportReviewContext
        title="Account-basis review"
        body="VAT Summary reflects posted movement in VAT Payable 220 and VAT Receivable 230. Compare it with VAT Return before treating either surface as filing-ready."
        href="/reports/vat-return"
        linkLabel="Open draft VAT Return"
      />
      <ReportExportButtons endpoint="/reports/vat-summary" slug="vat-summary" params={{ from, to }} />
      <ReportState loading={loading} error={error} empty={!report} emptyText="No VAT summary data found." />
      {report ? (
        <div className="space-y-5">
          <SummaryGrid
            items={[
              [VAT_REPORT_LABELS.outputVat, report.salesVat],
              [VAT_REPORT_LABELS.inputVat, report.purchaseVat],
              ["Net payable", report.netVatPayable],
            ]}
          />
          <LedgerAlert tone="warning">{report.notes[0]}</LedgerAlert>
          <LedgerDataTable minWidth="720px">
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
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(section.amount)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(section.taxAmount)}</LedgerMoney></td>
                  </tr>
                ))}
              </tbody>
          </LedgerDataTable>
        </div>
      ) : null}
    </ReportSection>
  );
}

export function VatReturnReportPage() {
  const [report, setReport] = useState<VatReturnReport | null>(null);
  const [from, setFrom] = useState(monthStartDateInput());
  const [to, setTo] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<VatReturnReport>((query) => `/reports/vat-return${query}`, setReport);

  useEffect(() => {
    void load(buildReportQuery({ from, to }));
  }, []);

  const hasDocuments = report ? report.sales.documentCount > 0 || report.purchases.documentCount > 0 : false;

  return (
    <ReportSection title="VAT Return" description="Draft VAT return review from finalized sales invoices and finalized purchase bills. Internal review only; no official filing workflow is implemented.">
      <DateRangeForm from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onSubmit={() => load(buildReportQuery({ from, to }))} />
      <VatReportReviewContext
        title="Source-document review"
        body="VAT Return is built from finalized sales invoices and finalized purchase bills in the selected period. Use it for internal accountant or tax-advisor review, then compare it with VAT Summary."
        href="/reports/vat-summary"
        linkLabel="Open VAT Summary"
      />
      <LedgerAlert tone="warning">
        This draft view is for accountant or tax-advisor review during controlled beta. It does not submit to a tax authority, does not create a filing record, is not a government-format export, and does not prove ZATCA or GCC filing compliance.
      </LedgerAlert>
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
            items={[
              [VAT_REPORT_LABELS.outputVat, report.outputVat],
              [VAT_REPORT_LABELS.inputVat, report.inputVat],
              [Number.parseFloat(report.netVatRefundable) > 0 ? "Net refundable" : "Net payable", Number.parseFloat(report.netVatRefundable) > 0 ? report.netVatRefundable : report.netVatPayable],
            ]}
          />
          <LedgerPanel>
            <p>
              <span className="font-semibold text-ink">Basis:</span> {report.basis === "FINALIZED_SOURCE_DOCUMENTS" ? "Finalized sales invoices and finalized purchase bills in the selected date range." : report.basis}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-ink">Export status:</span> Internal draft review CSV only. Official filing format, submission workflow, authority exchange, and compliance approval are not implemented here.
            </p>
          </LedgerPanel>
          <LedgerDataTable minWidth="720px">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3">Taxable amount</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Tax amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-ink">Finalized sales invoices</td>
                  <td className="px-4 py-3 font-mono text-xs">{report.sales.documentCount}</td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(report.sales.taxableAmount)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(report.sales.grossAmount)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(report.sales.taxAmount)}</LedgerMoney></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-ink">Finalized purchase bills</td>
                  <td className="px-4 py-3 font-mono text-xs">{report.purchases.documentCount}</td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(report.purchases.taxableAmount)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(report.purchases.grossAmount)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(report.purchases.taxAmount)}</LedgerMoney></td>
                </tr>
              </tbody>
          </LedgerDataTable>
          <LedgerPanel>
            {report.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </LedgerPanel>
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
  const searchParams = useSearchParams();
  const [report, setReport] = useState<AgingReport | null>(null);
  const [asOf, setAsOf] = useState(todayDateInput());
  const { loading, error, load } = useReportLoader<AgingReport>((query) => `${endpoint}${query}`, setReport);
  const slug = endpoint.split("/").at(-1) ?? "aging-report";
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const reportReturnToHref = buildAgingReportHref(endpoint, asOf, returnTo);

  useEffect(() => {
    void load(buildReportQuery({ asOf }));
  }, []);

  return (
    <ReportSection title={title} description={description}>
      {returnTo ? (
        <div className="mb-4">
          <LedgerButton href={returnTo}>Back to workspace</LedgerButton>
        </div>
      ) : null}
      <AgingReportGuide kind={kind} returnToHref={reportReturnToHref} />
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
          <AgingTable rows={report.rows} kind={kind} returnToHref={reportReturnToHref} />
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
  const { canAny } = usePermissions();
  const canExportReports = canAny(PERMISSIONS.reports.export);
  const [downloading, setDownloading] = useState<"" | "csv" | "pdf">("");
  const [error, setError] = useState("");

  if (!canExportReports) {
    return <LedgerAlert tone="info">Report export requires report export permission.</LedgerAlert>;
  }

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
    <LedgerPanel>
      <div className="flex flex-wrap items-center gap-2">
        <LedgerButton type="button" onClick={() => void download("csv")} disabled={Boolean(downloading)}>
          {downloading === "csv" ? "Downloading CSV..." : "Download CSV"}
        </LedgerButton>
        <LedgerButton type="button" onClick={() => void download("pdf")} disabled={Boolean(downloading)}>
          {downloading === "pdf" ? "Downloading PDF..." : "Download PDF"}
        </LedgerButton>
      </div>
      <p className="text-xs leading-5 text-steel">Exports use the current report filters and are generated from posted accounting data. No request or response body is shown on this page.</p>
      {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
    </LedgerPanel>
  );
}

function VatReturnReviewExportCard({ params }: { params: Record<string, string | null | undefined> }) {
  const { canAny } = usePermissions();
  const canExportReports = canAny(PERMISSIONS.reports.export);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  if (!canExportReports) {
    return <LedgerAlert tone="info">Draft VAT review export requires report export permission.</LedgerAlert>;
  }

  async function download() {
    setDownloading(true);
    setError("");
    try {
      await downloadAuthenticatedFile(buildVatReturnReviewExportPath(params), reportExportFilename("vat-return-draft-review", "csv"));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download draft VAT review export.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <LedgerPanel>
      <div className="flex flex-wrap items-center gap-2">
        <LedgerButton type="button" onClick={() => void download()} disabled={downloading}>
          {downloading ? "Downloading draft review CSV..." : "Download draft review CSV"}
        </LedgerButton>
      </div>
      <p className="text-xs leading-5 text-steel">
        Internal review export only. This CSV reflects the current VAT Return filters, does not create a filing record, and is not an official tax authority submission format.
      </p>
      {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
    </LedgerPanel>
  );
}

function VatReportReviewContext({ title, body, href, linkLabel }: { title: string; body: string; href: string; linkLabel: string }) {
  return (
    <LedgerPanel>
      <div className="font-semibold text-ink">{title}</div>
      <p className="mt-2">{body}</p>
      <div className="mt-3">
        <LedgerButton href={href}>{linkLabel}</LedgerButton>
      </div>
    </LedgerPanel>
  );
}

function VatReturnReviewActions() {
  const { can } = usePermissions();
  const canCreateInvoice = can(PERMISSIONS.salesInvoices.create);
  const canCreateBill = can(PERMISSIONS.purchaseBills.create);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {canCreateInvoice ? (
        <LedgerButton href="/sales/invoices/new?returnTo=%2Freports%2Fvat-return" variant="primary">
          Create invoice
        </LedgerButton>
      ) : null}
      {canCreateBill ? (
        <LedgerButton href="/purchases/bills/new?returnTo=%2Freports%2Fvat-return">
          Create bill
        </LedgerButton>
      ) : null}
      <LedgerButton href="/reports/vat-summary">
        Open VAT Summary
      </LedgerButton>
    </div>
  );
}

function ReportSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Reports" title={title} description={description} actions={<LedgerButton href="/reports">Reports</LedgerButton>} />
      <LedgerPageBody>{children}</LedgerPageBody>
    </LedgerPage>
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
    >
      <LedgerToolbar description="Use the date range to focus on posted activity for the period you want to review.">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Field label="From">
            <LedgerInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To">
            <LedgerInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <LedgerButton type="submit" variant="primary" disabled={loading}>
            {loading ? "Loading..." : "Run report"}
          </LedgerButton>
        </div>
      </LedgerToolbar>
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
    >
      <LedgerToolbar description={helpText ?? "Use the date to review balances as they stood at that point."}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Field label="As of">
            <LedgerInput type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
          </Field>
          <LedgerButton type="submit" variant="primary" disabled={loading}>
            {loading ? "Loading..." : "Run report"}
          </LedgerButton>
        </div>
      </LedgerToolbar>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      {children}
    </LedgerFieldLabel>
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
    <>
      {loading ? <LedgerLoadingState title="Loading report" /> : null}
      {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      {!loading && !error && empty ? (
        <LedgerEmptyState title={emptyText} description={emptyHelp} action={emptyActions} />
      ) : null}
    </>
  );
}

function SummaryGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {items.map(([label, value]) => (
        <LedgerStatCard key={label} label={label} value={<LedgerMoney>{formatMoneyAmount(value)}</LedgerMoney>} />
      ))}
    </div>
  );
}

function AccountBalanceTable({ accounts, totals }: { accounts: TrialBalanceReport["accounts"]; totals: TrialBalanceReport["totals"] }) {
  return (
    <LedgerDataTable minWidth="1120px">
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
    </LedgerDataTable>
  );
}

function MoneyCells({ values }: { values: string[] }) {
  return (
    <>
      {values.map((value, index) => (
        <td key={`${value}-${index}`} className="px-4 py-3 font-mono text-xs">
          <LedgerMoney>{formatMoneyAmount(value)}</LedgerMoney>
        </td>
      ))}
    </>
  );
}

function AmountSection({ title, total, accounts }: { title: string; total: string; accounts: Array<{ accountId: string; code: string; name: string; amount: string }> }) {
  return (
    <LedgerDataTable minWidth="720px">
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
              <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(account.amount)}</LedgerMoney></td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold text-ink">
            <td className="px-4 py-3">Total {title.toLowerCase()}</td>
            <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(total)}</LedgerMoney></td>
          </tr>
        </tbody>
    </LedgerDataTable>
  );
}

function BalanceSheetSectionView({ title, section }: { title: string; section: BalanceSheetSection }) {
  return <AmountSection title={title} total={section.total} accounts={section.accounts} />;
}

export function AgingReportGuide({ kind, returnToHref }: { kind: AgingReportKind; returnToHref?: string }) {
  const isReceivables = kind === "receivables";
  return (
    <LedgerSummaryBand tone="success">
      <h2 className="text-base font-semibold text-ink">How to read this report</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <div className="font-semibold text-ink">What it shows</div>
          <p className="mt-1">
            {isReceivables
              ? "AR Aging is based on outstanding sales invoices only: customer invoices that still have a balance due after posted payments, credit notes, and refunds. Quotes, recurring templates, delivery notes, and collection cases are excluded."
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
      <ReportActionLinks kind={kind} returnToHref={returnToHref} />
    </LedgerSummaryBand>
  );
}

function ReportActionLinks({ kind, returnToHref }: { kind: AgingReportKind; returnToHref?: string }) {
  const { can } = usePermissions();
  const isReceivables = kind === "receivables";
  const returnTo = returnToHref || (isReceivables ? "/reports/aged-receivables" : "/reports/aged-payables");
  const canCreateDocument = isReceivables ? can(PERMISSIONS.salesInvoices.create) : can(PERMISSIONS.purchaseBills.create);
  const canRecordPayment = isReceivables ? can(PERMISSIONS.customerPayments.create) : can(PERMISSIONS.supplierPayments.create);
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <LedgerButton href={isReceivables ? "/customers" : "/suppliers"}>
        {isReceivables ? "View customers" : "View suppliers"}
      </LedgerButton>
      {canCreateDocument ? (
        <LedgerButton href={`${isReceivables ? "/sales/invoices/new" : "/purchases/bills/new"}?returnTo=${encodeURIComponent(returnTo)}`} variant="primary">
          {isReceivables ? "Create invoice" : "Create bill"}
        </LedgerButton>
      ) : null}
      {canRecordPayment ? (
        <LedgerButton href={`${isReceivables ? "/sales/customer-payments/new" : "/purchases/supplier-payments/new"}?returnTo=${encodeURIComponent(returnTo)}`}>
          {isReceivables ? "Record payment" : "Record supplier payment"}
        </LedgerButton>
      ) : null}
      <LedgerButton href="/dashboard">Dashboard</LedgerButton>
    </div>
  );
}

export function AgingTable({ rows, kind, returnToHref }: { rows: AgingReportRow[]; kind: AgingReportKind; returnToHref?: string }) {
  if (rows.length === 0) {
    return null;
  }
  const isReceivables = kind === "receivables";

  return (
    <LedgerDataTable minWidth="1120px">
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
                <Link href={partyDetailHref(isReceivables ? "customer" : "supplier", row.contact.id)} className="hover:text-palm">
                  {row.contact.displayName ?? row.contact.name}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                <Link href={appendReturnTo(isReceivables ? `/sales/invoices/${row.id}` : `/purchases/bills/${row.id}`, returnToHref)} className="hover:text-palm">
                  {row.number}
                </Link>
              </td>
              <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(row.issueDate, "-")}</LedgerDate></td>
              <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(row.dueDate, "-")}</LedgerDate></td>
              <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(row.total)}</LedgerMoney></td>
              <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(row.balanceDue)}</LedgerMoney></td>
              <td className="px-4 py-3 font-mono text-xs">{row.daysOverdue}</td>
              <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-1 text-xs font-medium ${agingBucketClass(row.bucket)}`}>{agingBucketLabel(row.bucket)}</span>
              </td>
              <td className="px-4 py-3">
                <Link href={appendReturnTo(isReceivables ? `/sales/invoices/${row.id}` : `/purchases/bills/${row.id}`, returnToHref)} className="font-medium text-palm hover:underline">
                  {isReceivables ? "Open invoice" : "Open bill"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
    </LedgerDataTable>
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
