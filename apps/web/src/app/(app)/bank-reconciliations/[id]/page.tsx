"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  reviewEventLabel,
  submitBlockedMessage,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { bankReconciliationReportCsvPath, bankReconciliationReportPdfPath, downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankReconciliation, BankReconciliationItem, BankReconciliationReviewEvent } from "@/lib/types";

export default function BankReconciliationDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [reconciliation, setReconciliation] = useState<BankReconciliation | null>(null);
  const [items, setItems] = useState<BankReconciliationItem[]>([]);
  const [reviewEvents, setReviewEvents] = useState<BankReconciliationReviewEvent[]>([]);
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
    ])
      .then(([reconciliationResult, itemResult, reviewEventResult]) => {
        if (!cancelled) {
          setReconciliation(reconciliationResult);
          setItems(itemResult);
          setReviewEvents(reviewEventResult);
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
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{reconciliation?.reconciliationNumber ?? "Bank reconciliation"}</h1>
          <p className="mt-1 text-sm text-steel">{reconciliation?.bankAccountProfile?.displayName ?? "Review history and period lock"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reconciliation && canDownloadReports ? (
            <>
              <button type="button" disabled={Boolean(downloading)} onClick={() => void downloadReport("csv")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                {downloading === "csv" ? "Downloading CSV..." : "Download CSV"}
              </button>
              <button type="button" disabled={Boolean(downloading)} onClick={() => void downloadReport("pdf")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                {downloading === "pdf" ? "Downloading PDF..." : "Download PDF"}
              </button>
            </>
          ) : null}
          {reconciliation?.bankAccountProfileId ? (
            <Link href={`/bank-accounts/${reconciliation.bankAccountProfileId}/reconciliations`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Back
            </Link>
          ) : null}
          {reconciliation && canClose && reconciliation.status === "DRAFT" && !submitBlock ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("submit")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "submit" ? "Submitting..." : "Submit for approval"}
            </button>
          ) : null}
          {reconciliation && canApprove && reconciliation.status === "PENDING_APPROVAL" ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("approve")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "approve" ? "Approving..." : "Approve"}
            </button>
          ) : null}
          {reconciliation && canReopen && (reconciliation.status === "PENDING_APPROVAL" || reconciliation.status === "APPROVED") ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("reopen")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "reopen" ? "Reopening..." : "Reopen"}
            </button>
          ) : null}
          {reconciliation && canClose && reconciliation.status === "APPROVED" && !blockedMessage ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("close")} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "close" ? "Closing..." : "Close"}
            </button>
          ) : null}
          {reconciliation && canVoid && reconciliation.status !== "VOIDED" ? (
            <button type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("void")} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {submitting === "void" ? "Voiding..." : "Void"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load reconciliation details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading reconciliation...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {reconciliation && submitBlock && reconciliation.status === "DRAFT" ? <StatusMessage type="info">{submitBlock}</StatusMessage> : null}
        {reconciliation && blockedMessage && reconciliation.status !== "DRAFT" && reconciliation.status !== "VOIDED" ? <StatusMessage type="info">{blockedMessage}</StatusMessage> : null}
      </div>

      {reconciliation ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="BANK_RECONCILIATION" linkedEntityId={reconciliation.id} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Statement closing" value={formatMoneyAmount(reconciliation.statementClosingBalance, currency)} />
            <SummaryCard label="Ledger closing" value={formatMoneyAmount(reconciliation.ledgerClosingBalance, currency)} />
            <SummaryCard label="Difference" value={formatMoneyAmount(reconciliation.difference, currency)} />
            <SummaryCard label="Unmatched rows" value={String(reconciliation.unmatchedTransactionCount ?? 0)} />
          </div>

          <BankReconciliationWorkflowGuidance reconciliation={reconciliation} blockedMessage={blockedMessage} submitBlock={submitBlock} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Detail label="Period start" value={formatOptionalDate(reconciliation.periodStart, "-")} />
              <Detail label="Period end" value={formatOptionalDate(reconciliation.periodEnd, "-")} />
              <Detail label="Statement opening" value={reconciliation.statementOpeningBalance ? formatMoneyAmount(reconciliation.statementOpeningBalance, currency) : "-"} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(reconciliation.status)}`}>
                  {bankReconciliationStatusLabel(reconciliation.status)}
                </span>
              </div>
              <Detail label="Created by" value={reconciliation.createdBy?.name ?? "-"} />
              <Detail label="Submitted by" value={reconciliation.submittedBy?.name ?? "-"} />
              <Detail label="Submitted at" value={formatOptionalDate(reconciliation.submittedAt, "-")} />
              <Detail label="Approved by" value={reconciliation.approvedBy?.name ?? "-"} />
              <Detail label="Approved at" value={formatOptionalDate(reconciliation.approvedAt, "-")} />
              <Detail label="Reopened at" value={formatOptionalDate(reconciliation.reopenedAt, "-")} />
              <Detail label="Closed by" value={reconciliation.closedBy?.name ?? "-"} />
              <Detail label="Closed at" value={formatOptionalDate(reconciliation.closedAt, "-")} />
              <Detail label="Voided at" value={formatOptionalDate(reconciliation.voidedAt, "-")} />
            </div>
            {reconciliation.notes ? <p className="mt-4 text-sm text-steel">{reconciliation.notes}</p> : null}
            {reconciliation.approvalNotes ? <p className="mt-4 text-sm text-steel">Approval notes: {reconciliation.approvalNotes}</p> : null}
            {reconciliation.reopenReason ? <p className="mt-2 text-sm text-steel">Reopen reason: {reconciliation.reopenReason}</p> : null}
            {reconciliation.status === "CLOSED" ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                This reconciliation is closed. Statement transactions in this period are locked until the reconciliation is voided.
              </div>
            ) : null}
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">PDF reports are archived automatically.</div>
          </div>

          {(reconciliation.status === "PENDING_APPROVAL" || reconciliation.status === "APPROVED") && (canApprove || canReopen) ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {canApprove && reconciliation.status === "PENDING_APPROVAL" ? (
                <label className="block rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Approval notes</span>
                  <textarea value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              ) : null}
              {canReopen ? (
                <label className="block rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                  <span className="text-xs font-medium uppercase tracking-wide text-steel">Reopen reason</span>
                  <textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold text-ink">Review history</h2>
            <p className="mt-1 text-sm leading-6 text-steel">Approval, reopen, close, and void events stay visible so the close decision can be audited later.</p>
            <div className="mt-4 space-y-3">
              {reviewEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-slate-200 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{reviewEventLabel(event)}</p>
                      <p className="mt-1 text-xs text-steel">{event.actorUser?.name ?? "System"} - {formatOptionalDate(event.createdAt, "-")}</p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(event.toStatus)}`}>
                      {bankReconciliationStatusLabel(event.toStatus)}
                    </span>
                  </div>
                  {event.notes ? <p className="mt-2 text-sm text-steel">{event.notes}</p> : null}
                </div>
              ))}
              {reviewEvents.length === 0 ? <StatusMessage type="empty">No review events recorded yet.</StatusMessage> : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-ink">Rows captured at close</h2>
              <p className="mt-1 text-sm leading-6 text-steel">
                These statement rows were snapshotted when the reconciliation closed. Status at close shows whether each row was matched, categorized, ignored, or still open at that point.
              </p>
            </div>
            <table className="w-full min-w-[980px] text-left text-sm">
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
                    <td className="px-4 py-3 text-steel">{formatOptionalDate(item.statementTransaction?.transactionDate, "-")}</td>
                    <td className="px-4 py-3 text-ink">{item.statementTransaction?.description ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.statementTransaction?.reference ?? "-"}</td>
                    <td className="px-4 py-3 text-steel">{bankStatementTransactionTypeLabel(item.type)}</td>
                    <td className="px-4 py-3 text-steel">{bankStatementTransactionStatusLabel(item.statusAtClose)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(item.amount, currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.statementTransaction?.matchedJournalEntry?.entryNumber ?? item.statementTransaction?.createdJournalEntry?.entryNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/bank-statement-transactions/${item.statementTransactionId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        Row
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && items.length === 0 ? <StatusMessage type="empty">No statement rows are snapshotted yet.</StatusMessage> : null}
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
            <h2 className="text-base font-semibold text-ink">Reconciliation status</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankReconciliationStatusBadgeClass(reconciliation.status)}`}>
              {bankReconciliationStatusLabel(reconciliation.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{lockedCopy}</p>
          <p className="mt-2 text-sm leading-6 text-steel">{actionCopy}</p>
          <p className="mt-2 text-xs leading-5 text-steel">
            Closing a reconciliation does not change ledger math. It records the close decision and protects the statement rows for the period.
          </p>
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Next actions</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <Link href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Review unmatched rows
            </Link>
            <Link href={`/bank-accounts/${profileId}/reconciliation`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Reconciliation summary
            </Link>
            <Link href={`/bank-accounts/${profileId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Bank account
            </Link>
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
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
