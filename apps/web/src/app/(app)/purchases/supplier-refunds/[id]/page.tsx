"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, supplierRefundPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  supplierRefundSourceHref,
  supplierRefundSourceTypeLabel,
  supplierRefundStatusBadgeClass,
  supplierRefundStatusLabel,
} from "@/lib/supplier-refunds";
import type { SupplierRefund, SupplierRefundPdfData } from "@/lib/types";

export default function SupplierRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [refund, setRefund] = useState<SupplierRefund | null>(null);
  const [pdfData, setPdfData] = useState<SupplierRefundPdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoidRefund = can(PERMISSIONS.supplierRefunds.void);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<SupplierRefund>(`/supplier-refunds/${params.id}`),
      apiRequest<SupplierRefundPdfData>(`/supplier-refunds/${params.id}/pdf-data`),
    ])
      .then(([refundResult, pdfResult]) => {
        if (!cancelled) {
          setRefund(refundResult);
          setPdfData(pdfResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier refund.");
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
    if (!refund || !window.confirm(`Void supplier refund ${refund.refundNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SupplierRefund>(`/supplier-refunds/${refund.id}/void`, { method: "POST" });
      const nextPdfData = await apiRequest<SupplierRefundPdfData>(`/supplier-refunds/${refund.id}/pdf-data`);
      setRefund(updated);
      setPdfData(nextPdfData);
      setSuccess(`Voided supplier refund ${updated.refundNumber}.`);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void supplier refund.");
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
      await downloadPdf(supplierRefundPdfPath(refund.id), `supplier-refund-${refund.refundNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download supplier refund PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  const sourceHref = refund ? supplierRefundSourceHref(refund) : "";

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{refund ? refund.refundNumber : "Supplier refund"}</h1>
          <p className="mt-1 text-sm text-steel">Manual supplier refund posting, source reference, and PDF download.</p>
          {refund ? <p className="mt-1 text-xs text-steel">No bank transfer, bank reconciliation, payment gateway, or ZATCA submission is performed.</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/purchases/supplier-refunds" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {refund?.supplierId ? (
            <Link href={`/contacts/${refund.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Supplier ledger
            </Link>
          ) : null}
          {refund ? (
            <button type="button" onClick={() => void downloadRefundPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {refund?.status === "POSTED" && canVoidRefund ? (
            <button type="button" onClick={() => void voidRefund()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load supplier refunds.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading supplier refund...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {refund ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={refund.supplier?.displayName ?? refund.supplier?.name ?? "-"} />
              <Summary label="Status" value={supplierRefundStatusLabel(refund.status)} />
              <Summary label="Refund date" value={formatOptionalDate(refund.refundDate, "-")} />
              <Summary label="Source type" value={supplierRefundSourceTypeLabel(refund.sourceType)} />
              <Summary label="Amount refunded" value={formatMoneyAmount(refund.amountRefunded, refund.currency)} />
              <Summary label="Received-into account" value={refund.account ? `${refund.account.code} ${refund.account.name}` : "-"} />
              <Summary label="Journal entry" value={refund.journalEntry ? `${refund.journalEntry.entryNumber} (${refund.journalEntry.id})` : "-"} />
              <Summary label="Void reversal journal" value={refund.voidReversalJournalEntry ? `${refund.voidReversalJournalEntry.entryNumber} (${refund.voidReversalJournalEntry.id})` : "-"} />
              <Summary label="Posted" value={refund.postedAt ? new Date(refund.postedAt).toLocaleString() : "-"} />
              <Summary label="Voided" value={refund.voidedAt ? new Date(refund.voidedAt).toLocaleString() : "-"} />
              <Summary label="Description" value={refund.description ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${supplierRefundStatusBadgeClass(refund.status)}`}>
                {supplierRefundStatusLabel(refund.status)}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Refund source</h2>
                <p className="mt-1 text-sm text-steel">The refund reduces unapplied supplier credit on this source.</p>
              </div>
              {sourceHref ? (
                <Link href={sourceHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  View source
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Source number" value={refund.sourcePayment?.paymentNumber ?? refund.sourceDebitNote?.debitNoteNumber ?? "-"} />
              <Summary label="Source status" value={refund.sourcePayment?.status ?? refund.sourceDebitNote?.status ?? "-"} />
              <Summary label="Original amount" value={formatMoneyAmount(refund.sourcePayment?.amountPaid ?? refund.sourceDebitNote?.total ?? "0.0000", refund.currency)} />
              <Summary label="Remaining unapplied" value={formatMoneyAmount(refund.sourcePayment?.unappliedAmount ?? refund.sourceDebitNote?.unappliedAmount ?? "0.0000", refund.currency)} />
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
