"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  customerRefundSourceHref,
  customerRefundSourceTypeLabel,
  customerRefundStatusBadgeClass,
  customerRefundStatusLabel,
} from "@/lib/customer-refunds";
import { formatMoneyAmount } from "@/lib/money";
import { customerRefundPdfPath, downloadPdf } from "@/lib/pdf-download";
import type { CustomerRefund, CustomerRefundPdfData } from "@/lib/types";

export default function CustomerRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [refund, setRefund] = useState<CustomerRefund | null>(null);
  const [pdfData, setPdfData] = useState<CustomerRefundPdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<CustomerRefund>(`/customer-refunds/${params.id}`),
      apiRequest<CustomerRefundPdfData>(`/customer-refunds/${params.id}/pdf-data`),
    ])
      .then(([refundResult, pdfResult]) => {
        if (!cancelled) {
          setRefund(refundResult);
          setPdfData(pdfResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load customer refund.");
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
  }, [organizationId, params.id]);

  async function voidRefund() {
    if (!refund || !window.confirm(`Void customer refund ${refund.refundNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CustomerRefund>(`/customer-refunds/${refund.id}/void`, { method: "POST" });
      const nextPdfData = await apiRequest<CustomerRefundPdfData>(`/customer-refunds/${refund.id}/pdf-data`);
      setRefund(updated);
      setPdfData(nextPdfData);
      setSuccess(`Voided refund ${updated.refundNumber}.`);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void refund.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadRefundPdf() {
    if (!refund) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(customerRefundPdfPath(refund.id), `customer-refund-${refund.refundNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download customer refund PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  const sourceHref = refund ? customerRefundSourceHref(refund) : "";

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{refund ? refund.refundNumber : "Customer refund"}</h1>
          <p className="mt-1 text-sm text-steel">Manual customer refund posting, source reference, and PDF download.</p>
          {refund ? <p className="mt-1 text-xs text-steel">No payment gateway, bank reconciliation, or ZATCA submission is performed.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/customer-refunds" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {refund?.customerId ? (
            <Link href={`/contacts/${refund.customerId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Customer ledger
            </Link>
          ) : null}
          {refund ? (
            <button type="button" onClick={() => void downloadRefundPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {refund?.status === "POSTED" ? (
            <button type="button" onClick={() => void voidRefund()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load refunds.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading customer refund...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {refund ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Customer" value={refund.customer?.displayName ?? refund.customer?.name ?? "-"} />
              <Summary label="Status" value={customerRefundStatusLabel(refund.status)} />
              <Summary label="Refund date" value={new Date(refund.refundDate).toLocaleDateString()} />
              <Summary label="Source type" value={customerRefundSourceTypeLabel(refund.sourceType)} />
              <Summary label="Amount refunded" value={formatMoneyAmount(refund.amountRefunded, refund.currency)} />
              <Summary label="Paid-from account" value={refund.account ? `${refund.account.code} ${refund.account.name}` : "-"} />
              <Summary label="Journal entry" value={refund.journalEntry ? `${refund.journalEntry.entryNumber} (${refund.journalEntry.id})` : "-"} />
              <Summary label="Void reversal journal" value={refund.voidReversalJournalEntry ? `${refund.voidReversalJournalEntry.entryNumber} (${refund.voidReversalJournalEntry.id})` : "-"} />
              <Summary label="Posted" value={refund.postedAt ? new Date(refund.postedAt).toLocaleString() : "-"} />
              <Summary label="Voided" value={refund.voidedAt ? new Date(refund.voidedAt).toLocaleString() : "-"} />
              <Summary label="Description" value={refund.description ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerRefundStatusBadgeClass(refund.status)}`}>
                {customerRefundStatusLabel(refund.status)}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Refund source</h2>
                <p className="mt-1 text-sm text-steel">The refund reduces unapplied customer credit on this source.</p>
              </div>
              {sourceHref ? (
                <Link href={sourceHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  View source
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Source number" value={refund.sourcePayment?.paymentNumber ?? refund.sourceCreditNote?.creditNoteNumber ?? "-"} />
              <Summary label="Source status" value={refund.sourcePayment?.status ?? refund.sourceCreditNote?.status ?? "-"} />
              <Summary label="Original amount" value={formatMoneyAmount(refund.sourcePayment?.amountReceived ?? refund.sourceCreditNote?.total ?? "0.0000", refund.currency)} />
              <Summary label="Remaining unapplied" value={formatMoneyAmount(refund.sourcePayment?.unappliedAmount ?? refund.sourceCreditNote?.unappliedAmount ?? "0.0000", refund.currency)} />
            </div>
          </div>

          {pdfData ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">PDF data preview</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                <Summary label="PDF refund number" value={pdfData.refund.refundNumber} />
                <Summary label="PDF source" value={pdfData.source.number} />
                <Summary label="PDF amount" value={formatMoneyAmount(pdfData.refund.amountRefunded, pdfData.refund.currency)} />
                <Summary label="Generated" value={new Date(pdfData.generatedAt).toLocaleString()} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
