"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankReconciliationStatusBadgeClass,
  bankReconciliationStatusLabel,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  closeBlockedMessage,
  submitBlockedMessage,
} from "@/lib/bank-statements";
import { appIntlLocale, formatAppDate, formatAppMoney, type AppLocale } from "@/lib/app-i18n";
import { bankReconciliationReportCsvPath, bankReconciliationReportPdfPath, downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankReconciliation, BankReconciliationItem, BankReconciliationReportData, BankReconciliationReviewEvent } from "@/lib/types";

export default function BankReconciliationDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale, tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [reconciliation, setReconciliation] = useState<BankReconciliation | null>(null);
  const [items, setItems] = useState<BankReconciliationItem[]>([]);
  const [reviewEvents, setReviewEvents] = useState<BankReconciliationReviewEvent[]>([]);
  const [reportData, setReportData] = useState<BankReconciliationReportData | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState("");
  const [downloading, setDownloading] = useState<"" | "csv" | "pdf">("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canClose = can(PERMISSIONS.bankReconciliations.close);
  const canApprove = can(PERMISSIONS.bankReconciliations.approve);
  const canReopen = can(PERMISSIONS.bankReconciliations.reopen);
  const canVoid = can(PERMISSIONS.bankReconciliations.void);
  const canDownloadReports = can(PERMISSIONS.reports.export) || can(PERMISSIONS.generatedDocuments.download);
  const blockedMessage = reconciliation ? closeBlockedMessage(reconciliation) : null;
  const submitBlock = reconciliation ? submitBlockedMessage(reconciliation) : null;
  const currency = reconciliation?.bankAccountProfile?.currency ?? "SAR";

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<BankReconciliation>(`/bank-reconciliations/${params.id}`),
      apiRequest<BankReconciliationItem[]>(`/bank-reconciliations/${params.id}/items`),
      apiRequest<BankReconciliationReviewEvent[]>(`/bank-reconciliations/${params.id}/review-events`),
      apiRequest<BankReconciliationReportData>(`/bank-reconciliations/${params.id}/report-data`),
    ])
      .then(([reconciliationResult, itemResult, reviewEventResult, reportResult]) => {
        if (!cancelled) {
          setReconciliation(reconciliationResult);
          setItems(itemResult);
          setReviewEvents(reviewEventResult);
          setReportData(reportResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load reconciliation."));
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
  }, [organizationId, params.id, reloadToken, tc]);

  async function submitAction(action: "submit" | "approve" | "reopen" | "close" | "void") {
    setSubmitting(action);
    setError("");
    setSuccess("");
    try {
      const body =
        action === "approve"
          ? { approvalNotes: approvalNotes || undefined }
          : action === "reopen"
            ? { reopenReason: reopenReason || undefined }
            : undefined;
      const updated = await apiRequest<BankReconciliation>(`/bank-reconciliations/${params.id}/${action}`, {
        method: "POST",
        body,
      });
      setReconciliation(updated);
      setSuccess(tc(actionSuccessMessage(action)));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update reconciliation."));
    } finally {
      setSubmitting("");
    }
  }

  async function downloadReport(format: "csv" | "pdf") {
    setDownloading(format);
    setError("");
    setSuccess("");
    try {
      const path = format === "csv" ? bankReconciliationReportCsvPath(params.id) : bankReconciliationReportPdfPath(params.id);
      const number = reconciliation?.reconciliationNumber ?? "reconciliation";
      await downloadAuthenticatedFile(path, `reconciliation-${number}.${format}`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download reconciliation report."));
    } finally {
      setDownloading("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{reconciliation?.reconciliationNumber ? <bdi dir="ltr">{reconciliation.reconciliationNumber}</bdi> : tc("Bank reconciliation")}</h1>
          <p className="mt-1 text-sm text-steel">{reconciliation?.bankAccountProfile?.displayName ?? tc("Review history and period lock")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reconciliation && canDownloadReports ? (
            <>
              <button type="button" disabled={Boolean(downloading)} onClick={() => void downloadReport("csv")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                {downloading === "csv" ? tc("Downloading CSV...") : tc("Download CSV")}
              </button>
              <button type="button" disabled={Boolean(downloading)} onClick={() => void downloadReport("pdf")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                {downloading === "pdf" ? tc("Downloading PDF...") : tc("Download PDF")}
              </button>
            </>
          ) : null}
          {reconciliation?.bankAccountProfileId ? (
            <Link href={`/bank-accounts/${reconciliation.bankAccountProfileId}/reconciliations`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Back")}
            </Link>
          ) : null}
          {reconciliation && canClose && reconciliation.status === "DRAFT" && !submitBlock ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("submit")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "submit" ? tc("Submitting...") : tc("Submit for approval")}
            </button>
          ) : null}
          {reconciliation && canApprove && reconciliation.status === "PENDING_APPROVAL" ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("approve")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "approve" ? tc("Approving...") : tc("Approve")}
            </button>
          ) : null}
          {reconciliation && canReopen && (reconciliation.status === "PENDING_APPROVAL" || reconciliation.status === "APPROVED") ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("reopen")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "reopen" ? tc("Reopening...") : tc("Reopen")}
            </button>
          ) : null}
          {reconciliation && canClose && reconciliation.status === "APPROVED" && !blockedMessage ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("close")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "close" ? tc("Closing...") : tc("Close")}
            </button>
          ) : null}
          {reconciliation && canVoid && reconciliation.status !== "VOIDED" ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("void")} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "void" ? tc("Voiding...") : tc("Void")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load reconciliation details.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading reconciliation...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {reconciliation && submitBlock && reconciliation.status === "DRAFT" ? <StatusMessage type="info">{tc(submitBlock)}</StatusMessage> : null}
        {reconciliation && blockedMessage && reconciliation.status !== "DRAFT" && reconciliation.status !== "VOIDED" ? <StatusMessage type="info">{tc(blockedMessage)}</StatusMessage> : null}
      </div>

      {reconciliation ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="BANK_RECONCILIATION" linkedEntityId={reconciliation.id} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label={tc("Statement closing")} value={formatAppMoney(reconciliation.statementClosingBalance, currency, locale)} />
            <SummaryCard label={tc("Ledger closing")} value={formatAppMoney(reconciliation.ledgerClosingBalance, currency, locale)} />
            <SummaryCard label={tc("Difference")} value={formatAppMoney(reconciliation.difference, currency, locale)} />
            <SummaryCard label={tc("Unmatched rows")} value={formatCount(reconciliation.unmatchedTransactionCount ?? 0, locale)} />
          </div>

          {reportData ? <ReconciliationReportReviewPanels report={reportData} currency={currency} /> : null}

          <BankReconciliationWorkflowGuidance reconciliation={reconciliation} blockedMessage={blockedMessage} submitBlock={submitBlock} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Detail label={tc("Period start")} value={formatAppDate(reconciliation.periodStart, locale, "-")} />
              <Detail label={tc("Period end")} value={formatAppDate(reconciliation.periodEnd, locale, "-")} />
              <Detail label={tc("Statement opening")} value={reconciliation.statementOpeningBalance ? formatAppMoney(reconciliation.statementOpeningBalance, currency, locale) : "-"} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Status")}</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(reconciliation.status)}`}>
                  {tc(bankReconciliationStatusLabel(reconciliation.status))}
                </span>
              </div>
              <Detail label={tc("Created by")} value={reconciliation.createdBy?.name ?? "-"} />
              <Detail label={tc("Submitted by")} value={reconciliation.submittedBy?.name ?? "-"} />
              <Detail label={tc("Submitted at")} value={formatAppDate(reconciliation.submittedAt, locale, "-")} />
              <Detail label={tc("Approved by")} value={reconciliation.approvedBy?.name ?? "-"} />
              <Detail label={tc("Approved at")} value={formatAppDate(reconciliation.approvedAt, locale, "-")} />
              <Detail label={tc("Reopened at")} value={formatAppDate(reconciliation.reopenedAt, locale, "-")} />
              <Detail label={tc("Closed by")} value={reconciliation.closedBy?.name ?? "-"} />
              <Detail label={tc("Closed at")} value={formatAppDate(reconciliation.closedAt, locale, "-")} />
              <Detail label={tc("Voided at")} value={formatAppDate(reconciliation.voidedAt, locale, "-")} />
            </div>
            {reconciliation.notes ? <p className="mt-4 text-sm text-steel">{reconciliation.notes}</p> : null}
            {reconciliation.approvalNotes ? <p className="mt-4 text-sm text-steel">{tc("Approval notes")}: {reconciliation.approvalNotes}</p> : null}
            {reconciliation.reopenReason ? <p className="mt-2 text-sm text-steel">{tc("Reopen reason")}: {reconciliation.reopenReason}</p> : null}
            {reconciliation.status === "CLOSED" ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {tc("This reconciliation is closed. Statement transactions in this period are locked until the reconciliation is voided.")}
              </div>
            ) : null}
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">{tc("PDF reports are archived automatically.")}</div>
          </div>

          {(reconciliation.status === "PENDING_APPROVAL" || reconciliation.status === "APPROVED") && (canApprove || canReopen) ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {canApprove && reconciliation.status === "PENDING_APPROVAL" ? (
                <label className="block rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Approval notes")}</span>
                  <textarea value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              ) : null}
              {canReopen ? (
                <label className="block rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Reopen reason")}</span>
                  <textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-ink">{tc("Review history")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc("Approval, reopen, close, and void events stay visible so the close decision can be audited later.")}</p>
            <div className="mt-4 space-y-3">
              {reviewEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-slate-200 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{reviewEventDisplayLabel(event, tc)}</p>
                      <p className="mt-1 text-xs text-steel">{event.actorUser?.name ?? tc("System")} - {formatAppDate(event.createdAt, locale, "-")}</p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(event.toStatus)}`}>
                      {tc(bankReconciliationStatusLabel(event.toStatus))}
                    </span>
                  </div>
                  {event.notes ? <p className="mt-2 text-sm text-steel">{event.notes}</p> : null}
                </div>
              ))}
              {reviewEvents.length === 0 ? <StatusMessage type="empty">{tc("No review events recorded yet.")}</StatusMessage> : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-ink">{tc("Rows captured at close")}</h2>
              <p className="mt-1 text-sm leading-6 text-steel">
                {tc("These statement rows were snapshotted when the reconciliation closed. Status at close shows whether each row was matched, categorized, ignored, or still open at that point.")}
              </p>
            </div>
            <table className="w-full min-w-[980px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Date")}</th>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Reference")}</th>
                  <th className="px-4 py-3">{tc("Type")}</th>
                  <th className="px-4 py-3">{tc("Status at close")}</th>
                  <th className="px-4 py-3 text-end">{tc("Amount")}</th>
                  <th className="px-4 py-3">{tc("Journal")}</th>
                  <th className="px-4 py-3">{tc("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-steel">{formatAppDate(item.statementTransaction?.transactionDate, locale, "-")}</td>
                    <td className="px-4 py-3 text-ink">{item.statementTransaction?.description ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.statementTransaction?.reference ? <bdi dir="ltr">{item.statementTransaction.reference}</bdi> : "-"}</td>
                    <td className="px-4 py-3 text-steel">{tc(bankStatementTransactionTypeLabel(item.type))}</td>
                    <td className="px-4 py-3 text-steel">{tc(bankStatementTransactionStatusLabel(item.statusAtClose))}</td>
                    <td className="px-4 py-3 text-end font-mono text-xs">{formatAppMoney(item.amount, currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.statementTransaction?.matchedJournalEntry?.entryNumber || item.statementTransaction?.createdJournalEntry?.entryNumber ? (
                        <bdi dir="ltr">{item.statementTransaction?.matchedJournalEntry?.entryNumber ?? item.statementTransaction?.createdJournalEntry?.entryNumber}</bdi>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/bank-statement-transactions/${item.statementTransactionId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("Row")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && items.length === 0 ? <StatusMessage type="empty">{tc("No statement rows are snapshotted yet.")}</StatusMessage> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function BankReconciliationWorkflowGuidance({
  reconciliation,
  blockedMessage,
  submitBlock,
}: {
  reconciliation: BankReconciliation;
  blockedMessage: string | null;
  submitBlock: string | null;
}) {
  const { tc } = useAppLocale();
  const profileId = reconciliation.bankAccountProfileId;
  const lockedCopy =
    reconciliation.status === "CLOSED"
      ? "This reconciliation is closed. Statement rows in the period are locked from match, categorize, ignore, and overlapping import changes."
      : reconciliation.status === "VOIDED"
        ? "This reconciliation is voided. It remains available for audit review, and the period is not locked by this record."
        : "This reconciliation is still reviewable. It locks the statement period only after close succeeds.";
  const actionCopy =
    reconciliation.status === "DRAFT"
      ? submitBlock ?? "This draft can be submitted when the difference is zero and no statement rows are unmatched."
      : reconciliation.status === "APPROVED"
        ? blockedMessage ?? "This approved reconciliation can be closed now."
        : reconciliation.status === "CLOSED"
          ? "Use the captured rows and report exports to review what was locked at close."
          : blockedMessage ?? lockedCopy;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{tc("Reconciliation status")}</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(reconciliation.status)}`}>
              {tc(bankReconciliationStatusLabel(reconciliation.status))}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{tc(lockedCopy)}</p>
          <p className="mt-2 text-sm leading-6 text-steel">{tc(actionCopy)}</p>
          <p className="mt-2 text-xs leading-5 text-steel">
            {tc("Closing a reconciliation does not change ledger math. It records the close decision and protects the statement rows for the period.")}
          </p>
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Next actions")}</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <Link href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Review unmatched rows")}
            </Link>
            <Link href={`/bank-accounts/${profileId}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Reconciliation summary")}
            </Link>
            <Link href={`/bank-accounts/${profileId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Bank account")}
            </Link>
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Dashboard")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReconciliationReportReviewPanels({ report, currency }: { report: BankReconciliationReportData; currency: string }) {
  const { locale, tc } = useAppLocale();
  const treasury = report.linkedTreasurySummary;
  const accounting = report.accountingStatusSummary;
  const timelinePreview = report.auditTimeline.slice(-8).reverse();
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("Accountant review summary")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">
              {tc("Manual banking only. This report uses imported statement rows, explicit review actions, treasury links, and posted journal links already recorded in LedgerByte.")}
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {tc("No live bank feed, bank API, bank credentials, or payment initiation is enabled.")}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <ReportMetric label={tc("Linked chart account")} value={report.bankAccount.account ? <><bdi dir="ltr">{report.bankAccount.account.code}</bdi> {report.bankAccount.account.name}</> : "-"} />
          <ReportMetric label={tc("Period rows")} value={formatCount(report.summary.totalRowsCount, locale)} />
          <ReportMetric label={tc("Rule-applied rows")} value={formatCount(report.summary.ruleAppliedRowsCount, locale)} />
          <ReportMetric label={tc("Captured close rows")} value={formatCount(report.summary.itemCount, locale)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">{tc("Exceptions")}</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <ReportMetric label={tc("Unmatched rows")} value={formatCount(report.summary.unmatchedRowsCount, locale)} />
            <ReportMetric label={tc("Unreconciled rows")} value={formatCount(report.summary.unreconciledRowsCount, locale)} />
            <ReportMetric label={tc("Exception rows")} value={formatCount(report.summary.exceptionRowsCount, locale)} />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">{tc("Linked treasury activity")}</h2>
          <div className="mt-4 space-y-3">
            <TreasuryLine label={tc("Deposits")} summary={treasury.depositBatches} currency={currency} />
            <TreasuryLine label={tc("Card settlements")} summary={treasury.cardSettlements} currency={currency} />
            <TreasuryLine label={tc("Cheques")} summary={treasury.cheques} currency={currency} />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">{tc("Accounting status")}</h2>
          <div className="mt-4 space-y-3 text-sm text-steel">
            <p>
              <span className="font-medium text-ink">{tc("Clearing config")}:</span> {accounting.clearingConfigEnabled ? tc("Enabled") : tc("Missing or disabled")}
            </p>
            <p>
              <span className="font-medium text-ink">{tc("Configured accounts")}:</span> {formatCount(accounting.configuredAccountCount, locale)}
            </p>
            <p>
              <span className="font-medium text-ink">{tc("Journal posted")}:</span> {formatCount(accounting.journalPostedCount, locale)}
            </p>
            <p>
              <span className="font-medium text-ink">{tc("Operational-only")}:</span> {formatCount(accounting.operationalOnlyCount, locale)}
            </p>
          </div>
          {accounting.missingClearingConfig ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {tc("Clearing-account configuration is missing or disabled. Treasury records without posted journals remain operational-only.")}
            </div>
          ) : null}
          {accounting.operationalOnlyCount > 0 ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">
              {tc("Operational-only records are visible for review but are not silently posted, matched, or reconciled.")}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("Audit timeline")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc("Recent import, row review, rule, treasury, journal, and reconciliation review events for this period.")}</p>
          </div>
          <p className="text-xs text-steel">{tc("Export CSV for the full timeline.")}</p>
        </div>
        <div className="mt-4 space-y-3">
          {timelinePreview.map((event) => (
            <div key={event.id} className="rounded-md border border-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{tc(event.label)}</p>
                  <p className="mt-1 text-xs text-steel">
                    <bdi dir="ltr">{event.type}</bdi> - {formatAppDate(event.occurredAt, locale, "-")} - {event.actor?.name ?? event.actor?.email ?? tc("System")}
                  </p>
                </div>
                {event.amount ? <span className="font-mono text-xs text-steel">{formatAppMoney(event.amount, currency, locale)}</span> : null}
              </div>
            </div>
          ))}
          {timelinePreview.length === 0 ? <StatusMessage type="empty">{tc("No report timeline events found for this period.")}</StatusMessage> : null}
        </div>
      </div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function TreasuryLine({
  label,
  summary,
  currency,
}: {
  label: string;
  summary: BankReconciliationReportData["linkedTreasurySummary"]["depositBatches"];
  currency: string;
}) {
  const { locale, tc } = useAppLocale();
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-1 text-xs text-steel">
            {tc("{matchedCount} matched / {journalPostedCount} journal posted / {operationalOnlyCount} operational-only", {
              matchedCount: formatCount(summary.matchedCount, locale),
              journalPostedCount: formatCount(summary.journalPostedCount, locale),
              operationalOnlyCount: formatCount(summary.operationalOnlyCount, locale),
            })}
          </p>
        </div>
        <div className="text-end">
          <p className="font-mono text-xs font-semibold text-ink">{formatCount(summary.count, locale)}</p>
          <p className="mt-1 font-mono text-xs text-steel">{formatAppMoney(summary.totalAmount, currency, locale)}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

function formatCount(value: number, locale: AppLocale): string {
  return new Intl.NumberFormat(appIntlLocale(locale)).format(value);
}

function reviewEventDisplayLabel(event: BankReconciliationReviewEvent, tc: (value: string, params?: Record<string, string | number>) => string): string {
  const statusLabel = event.fromStatus
    ? `${tc(bankReconciliationStatusLabel(event.fromStatus))} ${tc("to")} ${tc(bankReconciliationStatusLabel(event.toStatus))}`
    : tc(bankReconciliationStatusLabel(event.toStatus));
  return `${tc(reconciliationReviewActionLabel(event.action))}: ${statusLabel}`;
}

function reconciliationReviewActionLabel(action: BankReconciliationReviewEvent["action"]): string {
  switch (action) {
    case "SUBMIT":
      return "Submit";
    case "APPROVE":
      return "Approve";
    case "REOPEN":
      return "Reopen";
    case "CLOSE":
      return "Close";
    case "VOID":
      return "Void";
  }
}

function actionSuccessMessage(action: "submit" | "approve" | "reopen" | "close" | "void"): string {
  switch (action) {
    case "submit":
      return "Reconciliation has been submitted for approval.";
    case "approve":
      return "Reconciliation has been approved.";
    case "reopen":
      return "Reconciliation has been reopened as a draft.";
    case "close":
      return "Reconciliation has been closed and locked.";
    case "void":
      return "Reconciliation has been voided.";
  }
}
