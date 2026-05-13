"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankReconciliationStatusBadgeClass,
  bankReconciliationStatusLabel,
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  closeBlockedMessage,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { bankReconciliationReportCsvPath, bankReconciliationReportPdfPath, downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankReconciliation, BankReconciliationItem } from "@/lib/types";

export default function BankReconciliationDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [reconciliation, setReconciliation] = useState<BankReconciliation | null>(null);
  const [items, setItems] = useState<BankReconciliationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState("");
  const [downloading, setDownloading] = useState<"" | "csv" | "pdf">("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canClose = can(PERMISSIONS.bankReconciliations.close);
  const canVoid = can(PERMISSIONS.bankReconciliations.void);
  const blockedMessage = reconciliation ? closeBlockedMessage(reconciliation) : null;
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
    ])
      .then(([reconciliationResult, itemResult]) => {
        if (!cancelled) {
          setReconciliation(reconciliationResult);
          setItems(itemResult);
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

  async function submitAction(action: "close" | "void") {
    setSubmitting(action);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankReconciliation>(`/bank-reconciliations/${params.id}/${action}`, { method: "POST" });
      setReconciliation(updated);
      setSuccess(action === "close" ? "Reconciliation has been closed and locked." : "Reconciliation has been voided.");
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{reconciliation?.reconciliationNumber ?? "Bank reconciliation"}</h1>
          <p className="mt-1 text-sm text-steel">{reconciliation?.bankAccountProfile?.displayName ?? "Review history and period lock"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reconciliation ? (
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
          {reconciliation && canClose && reconciliation.status === "DRAFT" && !blockedMessage ? (
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
        {reconciliation && blockedMessage && reconciliation.status === "DRAFT" ? <StatusMessage type="info">{blockedMessage}</StatusMessage> : null}
      </div>

      {reconciliation ? (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Statement closing" value={formatMoneyAmount(reconciliation.statementClosingBalance, currency)} />
            <SummaryCard label="Ledger closing" value={formatMoneyAmount(reconciliation.ledgerClosingBalance, currency)} />
            <SummaryCard label="Difference" value={formatMoneyAmount(reconciliation.difference, currency)} />
            <SummaryCard label="Unmatched rows" value={String(reconciliation.unmatchedTransactionCount ?? 0)} />
          </div>

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
              <Detail label="Closed by" value={reconciliation.closedBy?.name ?? "-"} />
              <Detail label="Closed at" value={formatOptionalDate(reconciliation.closedAt, "-")} />
              <Detail label="Voided at" value={formatOptionalDate(reconciliation.voidedAt, "-")} />
            </div>
            {reconciliation.notes ? <p className="mt-4 text-sm text-steel">{reconciliation.notes}</p> : null}
            {reconciliation.status === "CLOSED" ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                This reconciliation is closed. Statement transactions in this period are locked until the reconciliation is voided.
              </div>
            ) : null}
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-steel">PDF reports are archived automatically.</div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
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
