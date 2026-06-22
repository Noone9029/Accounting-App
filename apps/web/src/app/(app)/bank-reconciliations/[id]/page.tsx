"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankReconciliationStatusLabel,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  closeBlockedMessage,
  reviewEventLabel,
  submitBlockedMessage,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { bankReconciliationReportCsvPath, bankReconciliationReportPdfPath, downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankReconciliation, BankReconciliationItem, BankReconciliationReportData, BankReconciliationReviewEvent } from "@/lib/types";

function reconciliationStatusTone(status: BankReconciliation["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "warning";
    case "PENDING_APPROVAL":
      return "info";
    case "APPROVED":
      return "neutral";
    case "CLOSED":
      return "success";
    case "VOIDED":
      return "danger";
  }
}

function statementStatusTone(status: BankReconciliationItem["statusAtClose"]): LedgerStatusTone {
  switch (status) {
    case "UNMATCHED":
      return "warning";
    case "MATCHED":
    case "CATEGORIZED":
      return "success";
    case "IGNORED":
      return "draft";
    case "VOIDED":
      return "danger";
  }
}

export default function BankReconciliationDetailPage() {
  const params = useParams<{ id: string }>();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load reconciliation.");
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
  }, [organizationId, params.id, reloadToken]);

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
      setSuccess(actionSuccessMessage(action));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update reconciliation.");
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
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download reconciliation report.");
    } finally {
      setDownloading("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title={reconciliation?.reconciliationNumber ?? "Bank reconciliation"}
        description={reconciliation?.bankAccountProfile?.displayName ?? "Review history and period lock"}
        badge={reconciliation ? <LedgerStatusBadge tone={reconciliationStatusTone(reconciliation.status)}>{bankReconciliationStatusLabel(reconciliation.status)}</LedgerStatusBadge> : null}
        actions={
          <>
            {reconciliation && canDownloadReports ? (
              <>
                <LedgerButton type="button" disabled={Boolean(downloading)} onClick={() => void downloadReport("csv")}>
                  {downloading === "csv" ? "Downloading CSV..." : "Download CSV"}
                </LedgerButton>
                <LedgerButton type="button" disabled={Boolean(downloading)} onClick={() => void downloadReport("pdf")}>
                  {downloading === "pdf" ? "Downloading PDF..." : "Download PDF"}
                </LedgerButton>
              </>
            ) : null}
            {reconciliation?.bankAccountProfileId ? <LedgerButton href={`/bank-accounts/${reconciliation.bankAccountProfileId}/reconciliations`}>Back</LedgerButton> : null}
            {reconciliation && canClose && reconciliation.status === "DRAFT" && !submitBlock ? (
              <LedgerButton type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("submit")}>
                {submitting === "submit" ? "Submitting..." : "Submit for approval"}
              </LedgerButton>
            ) : null}
            {reconciliation && canApprove && reconciliation.status === "PENDING_APPROVAL" ? (
              <LedgerButton type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("approve")}>
                {submitting === "approve" ? "Approving..." : "Approve"}
              </LedgerButton>
            ) : null}
            {reconciliation && canReopen && (reconciliation.status === "PENDING_APPROVAL" || reconciliation.status === "APPROVED") ? (
              <LedgerButton type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("reopen")}>
                {submitting === "reopen" ? "Reopening..." : "Reopen"}
              </LedgerButton>
            ) : null}
            {reconciliation && canClose && reconciliation.status === "APPROVED" && !blockedMessage ? (
              <LedgerButton type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("close")} variant="primary">
                {submitting === "close" ? "Closing..." : "Close"}
              </LedgerButton>
            ) : null}
            {reconciliation && canVoid && reconciliation.status !== "VOIDED" ? (
              <LedgerButton type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("void")} variant="danger">
                {submitting === "void" ? "Voiding..." : "Void"}
              </LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Closing a reconciliation records the close decision and locks statement rows in the period. It does not change ledger math or enable automatic reconciliation.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load reconciliation details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading reconciliation" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {reconciliation && submitBlock && reconciliation.status === "DRAFT" ? <LedgerAlert tone="info">{submitBlock}</LedgerAlert> : null}
        {reconciliation && blockedMessage && reconciliation.status !== "DRAFT" && reconciliation.status !== "VOIDED" ? <LedgerAlert tone="info">{blockedMessage}</LedgerAlert> : null}

        {reconciliation ? (
          <>
            <AttachmentPanel linkedEntityType="BANK_RECONCILIATION" linkedEntityId={reconciliation.id} />

            <LedgerMetricGrid>
              <LedgerStatCard label="Statement closing" value={<LedgerMoney>{formatMoneyAmount(reconciliation.statementClosingBalance, currency)}</LedgerMoney>} />
              <LedgerStatCard label="Ledger closing" value={<LedgerMoney>{formatMoneyAmount(reconciliation.ledgerClosingBalance, currency)}</LedgerMoney>} />
              <LedgerStatCard label="Difference" value={<LedgerMoney>{formatMoneyAmount(reconciliation.difference, currency)}</LedgerMoney>} />
              <LedgerStatCard label="Unmatched rows" value={String(reconciliation.unmatchedTransactionCount ?? 0)} />
            </LedgerMetricGrid>

            {reportData ? <ReconciliationReportReviewPanels report={reportData} currency={currency} /> : null}

            <BankReconciliationWorkflowGuidance reconciliation={reconciliation} blockedMessage={blockedMessage} submitBlock={submitBlock} />

            <LedgerSection title="Close detail" description="Period, reviewer, and lock metadata for this reconciliation.">
              <LedgerMetadataRow
                items={[
                  { label: "Period start", value: <LedgerDate>{formatOptionalDate(reconciliation.periodStart, "-")}</LedgerDate> },
                  { label: "Period end", value: <LedgerDate>{formatOptionalDate(reconciliation.periodEnd, "-")}</LedgerDate> },
                  { label: "Statement opening", value: <LedgerMoney>{reconciliation.statementOpeningBalance ? formatMoneyAmount(reconciliation.statementOpeningBalance, currency) : "-"}</LedgerMoney> },
                  { label: "Status", value: <LedgerStatusBadge tone={reconciliationStatusTone(reconciliation.status)}>{bankReconciliationStatusLabel(reconciliation.status)}</LedgerStatusBadge> },
                  { label: "Created by", value: reconciliation.createdBy?.name ?? "-" },
                  { label: "Submitted by", value: reconciliation.submittedBy?.name ?? "-" },
                  { label: "Submitted at", value: <LedgerDate>{formatOptionalDate(reconciliation.submittedAt, "-")}</LedgerDate> },
                  { label: "Approved by", value: reconciliation.approvedBy?.name ?? "-" },
                  { label: "Approved at", value: <LedgerDate>{formatOptionalDate(reconciliation.approvedAt, "-")}</LedgerDate> },
                  { label: "Reopened at", value: <LedgerDate>{formatOptionalDate(reconciliation.reopenedAt, "-")}</LedgerDate> },
                  { label: "Closed by", value: reconciliation.closedBy?.name ?? "-" },
                  { label: "Closed at", value: <LedgerDate>{formatOptionalDate(reconciliation.closedAt, "-")}</LedgerDate> },
                  { label: "Voided at", value: <LedgerDate>{formatOptionalDate(reconciliation.voidedAt, "-")}</LedgerDate> },
                ]}
              />
              {reconciliation.notes ? <p className="mt-4 text-sm leading-6 text-steel">{reconciliation.notes}</p> : null}
              {reconciliation.approvalNotes ? <p className="mt-4 text-sm leading-6 text-steel">Approval notes: {reconciliation.approvalNotes}</p> : null}
              {reconciliation.reopenReason ? <p className="mt-2 text-sm leading-6 text-steel">Reopen reason: {reconciliation.reopenReason}</p> : null}
              {reconciliation.status === "CLOSED" ? (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  This reconciliation is closed. Statement transactions in this period are locked until the reconciliation is voided.
                </div>
              ) : null}
              <div className="mt-4">
                <LedgerAlert tone="info">PDF reports are archived automatically.</LedgerAlert>
              </div>
            </LedgerSection>

            {(reconciliation.status === "PENDING_APPROVAL" || reconciliation.status === "APPROVED") && (canApprove || canReopen) ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {canApprove && reconciliation.status === "PENDING_APPROVAL" ? (
                  <LedgerPanel>
                    <LedgerFieldLabel>
                      <LedgerFieldText>Approval notes</LedgerFieldText>
                      <Textarea value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} rows={3} />
                    </LedgerFieldLabel>
                  </LedgerPanel>
                ) : null}
                {canReopen ? (
                  <LedgerPanel>
                    <LedgerFieldLabel>
                      <LedgerFieldText>Reopen reason</LedgerFieldText>
                      <Textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} rows={3} />
                    </LedgerFieldLabel>
                  </LedgerPanel>
                ) : null}
              </div>
            ) : null}

            <LedgerSection
              title="Review history"
              description="Approval, reopen, close, and void events stay visible so the close decision can be audited later."
            >
              <div className="space-y-3">
                {reviewEvents.map((event) => (
                  <div key={event.id} className="rounded-md border border-slate-200 px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{reviewEventLabel(event)}</p>
                        <p className="mt-1 text-xs text-steel">{event.actorUser?.name ?? "System"} - {formatOptionalDate(event.createdAt, "-")}</p>
                      </div>
                      <LedgerStatusBadge tone={reconciliationStatusTone(event.toStatus)}>{bankReconciliationStatusLabel(event.toStatus)}</LedgerStatusBadge>
                    </div>
                    {event.notes ? <p className="mt-2 text-sm leading-6 text-steel">{event.notes}</p> : null}
                  </div>
                ))}
                {reviewEvents.length === 0 ? <LedgerEmptyState title="No review events recorded yet." /> : null}
              </div>
            </LedgerSection>

            <LedgerSection
              title="Rows captured at close"
              description="These statement rows were snapshotted when the reconciliation closed. Status at close shows whether each row was matched, categorized, ignored, or still open at that point."
            >
              <LedgerDataTable minWidth="980px">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status at close</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Journal</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(item.statementTransaction?.transactionDate, "-")}</LedgerDate></td>
                      <td className="px-4 py-3 text-ink">{item.statementTransaction?.description ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.statementTransaction?.reference ?? "-"}</td>
                      <td className="px-4 py-3 text-steel">{bankStatementTransactionTypeLabel(item.type)}</td>
                      <td className="px-4 py-3"><LedgerStatusBadge tone={statementStatusTone(item.statusAtClose)}>{bankStatementTransactionStatusLabel(item.statusAtClose)}</LedgerStatusBadge></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(item.amount, currency)}</LedgerMoney></td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.statementTransaction?.matchedJournalEntry?.entryNumber ?? item.statementTransaction?.createdJournalEntry?.entryNumber ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <LedgerButton href={`/bank-statement-transactions/${item.statementTransactionId}`} size="sm">Row</LedgerButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </LedgerDataTable>
              {!loading && items.length === 0 ? (
                <div className="mt-4">
                  <LedgerEmptyState title="No statement rows are snapshotted yet." />
                </div>
              ) : null}
            </LedgerSection>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
    <LedgerPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">Reconciliation status</h2>
            <LedgerStatusBadge tone={reconciliationStatusTone(reconciliation.status)}>{bankReconciliationStatusLabel(reconciliation.status)}</LedgerStatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{lockedCopy}</p>
          <p className="mt-2 text-sm leading-6 text-steel">{actionCopy}</p>
          <p className="mt-2 text-xs leading-5 text-steel">
            Closing a reconciliation does not change ledger math. It records the close decision and protects the statement rows for the period.
          </p>
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel">Next actions</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <LedgerButton href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`}>Review unmatched rows</LedgerButton>
            <LedgerButton href={`/bank-accounts/${profileId}/reconciliation`}>Reconciliation summary</LedgerButton>
            <LedgerButton href={`/bank-accounts/${profileId}`}>Bank account</LedgerButton>
            <LedgerButton href="/dashboard">Dashboard</LedgerButton>
          </div>
        </div>
      </div>
    </LedgerPanel>
  );
}

export function ReconciliationReportReviewPanels({ report, currency }: { report: BankReconciliationReportData; currency: string }) {
  const treasury = report.linkedTreasurySummary;
  const accounting = report.accountingStatusSummary;
  const timelinePreview = report.auditTimeline.slice(-8).reverse();
  return (
    <div className="space-y-5">
      <LedgerSection
        title="Accountant review summary"
        description="Manual banking only. This report uses imported statement rows, explicit review actions, treasury links, and posted journal links already recorded in LedgerByte."
        action={<LedgerStatusBadge tone="warning">No live bank feed, bank API, bank credentials, or payment initiation is enabled.</LedgerStatusBadge>}
      >
        <LedgerMetricGrid>
          <LedgerStatCard label="Linked chart account" value={report.bankAccount.account ? `${report.bankAccount.account.code} ${report.bankAccount.account.name}` : "-"} />
          <LedgerStatCard label="Period rows" value={String(report.summary.totalRowsCount)} />
          <LedgerStatCard label="Rule-applied rows" value={String(report.summary.ruleAppliedRowsCount)} />
          <LedgerStatCard label="Captured close rows" value={String(report.summary.itemCount)} />
        </LedgerMetricGrid>
      </LedgerSection>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <LedgerPanel>
          <h2 className="text-base font-semibold text-ink">Exceptions</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <ReportMetric label="Unmatched rows" value={String(report.summary.unmatchedRowsCount)} />
            <ReportMetric label="Unreconciled rows" value={String(report.summary.unreconciledRowsCount)} />
            <ReportMetric label="Exception rows" value={String(report.summary.exceptionRowsCount)} />
          </div>
        </LedgerPanel>

        <LedgerPanel>
          <h2 className="text-base font-semibold text-ink">Linked treasury activity</h2>
          <div className="mt-4 space-y-3">
            <TreasuryLine label="Deposits" summary={treasury.depositBatches} currency={currency} />
            <TreasuryLine label="Card settlements" summary={treasury.cardSettlements} currency={currency} />
            <TreasuryLine label="Cheques" summary={treasury.cheques} currency={currency} />
          </div>
        </LedgerPanel>

        <LedgerPanel>
          <h2 className="text-base font-semibold text-ink">Accounting status</h2>
          <div className="mt-4 space-y-3 text-sm text-steel">
            <p><span className="font-medium text-ink">Clearing config:</span> {accounting.clearingConfigEnabled ? "Enabled" : "Missing or disabled"}</p>
            <p><span className="font-medium text-ink">Configured accounts:</span> {accounting.configuredAccountCount}</p>
            <p><span className="font-medium text-ink">Journal posted:</span> {accounting.journalPostedCount}</p>
            <p><span className="font-medium text-ink">Operational-only:</span> {accounting.operationalOnlyCount}</p>
          </div>
          {accounting.missingClearingConfig ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Clearing-account configuration is missing or disabled. Treasury records without posted journals remain operational-only.
            </div>
          ) : null}
          {accounting.operationalOnlyCount > 0 ? (
            <div className="mt-3 rounded-md border border-line bg-mist px-3 py-2 text-sm text-steel">
              Operational-only records are visible for review but are not silently posted, matched, or reconciled.
            </div>
          ) : null}
        </LedgerPanel>
      </div>

      <LedgerSection
        title="Audit timeline"
        description="Recent import, row review, rule, treasury, journal, and reconciliation review events for this period."
        action={<p className="text-xs text-steel">Export CSV for the full timeline.</p>}
      >
        <div className="space-y-3">
          {timelinePreview.map((event) => (
            <div key={event.id} className="rounded-md border border-slate-200 px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{event.label}</p>
                  <p className="mt-1 text-xs text-steel">
                    {event.type} - {formatOptionalDate(event.occurredAt, "-")} - {event.actor?.name ?? event.actor?.email ?? "System"}
                  </p>
                </div>
                {event.amount ? <LedgerMoney>{formatMoneyAmount(event.amount, currency)}</LedgerMoney> : null}
              </div>
            </div>
          ))}
          {timelinePreview.length === 0 ? <LedgerEmptyState title="No report timeline events found for this period." /> : null}
        </div>
      </LedgerSection>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</p>
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
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-1 text-xs text-steel">
            {summary.matchedCount} matched / {summary.journalPostedCount} journal posted / {summary.operationalOnlyCount} operational-only
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs font-semibold text-ink">{summary.count}</p>
          <p className="mt-1"><LedgerMoney>{formatMoneyAmount(summary.totalAmount, currency)}</LedgerMoney></p>
        </div>
      </div>
    </div>
  );
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
