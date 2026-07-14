"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import {
  customerRefundSourceHref,
  customerRefundSourceTypeLabel,
  customerRefundStatusBadgeClass,
  customerRefundStatusLabel,
} from "@/lib/customer-refunds";
import { customerRefundPdfPath, downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerRefund, CustomerRefundPdfData } from "@/lib/types";

export default function CustomerRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [refund, setRefund] = useState<CustomerRefund | null>(null);
  const [pdfData, setPdfData] = useState<CustomerRefundPdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const canVoidRefund = can(PERMISSIONS.customerRefunds.void);

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load customer refund."));
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
  }, [organizationId, params.id, tc]);

  async function voidRefund(): Promise<boolean> {
    if (!refund) {
      return false;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<CustomerRefund>(`/customer-refunds/${refund.id}/void`, { method: "POST" });
      const nextPdfData = await apiRequest<CustomerRefundPdfData>(`/customer-refunds/${refund.id}/pdf-data`);
      setRefund(updated);
      setPdfData(nextPdfData);
      setSuccess(tc("Voided refund {number}.", { number: updated.refundNumber }));
      return true;
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : tc("Unable to void refund."));
      return false;
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
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download customer refund PDF."));
    } finally {
      setActionLoading(false);
    }
  }

  const sourceHref = refund ? customerRefundSourceHref(refund) : "";

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{refund ? <bdi dir="ltr">{refund.refundNumber}</bdi> : tc("Customer refund")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Manual customer refund posting, source reference, and PDF download.")}</p>
          {refund ? <p className="mt-1 text-xs text-steel">{tc("No payment gateway, bank reconciliation, or ZATCA submission is performed.")}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sales/customer-refunds" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {refund?.customerId ? (
            <Link href={`/contacts/${refund.customerId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Customer ledger")}
            </Link>
          ) : null}
          {refund ? (
            <button type="button" onClick={() => void downloadRefundPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download PDF")}
            </button>
          ) : null}
          {refund?.status === "POSTED" && canVoidRefund ? (
            <button type="button" onClick={() => setVoidDialogOpen(true)} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load refunds.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading customer refund...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {refund ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="CUSTOMER_REFUND" linkedEntityId={refund.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Customer")} value={refund.customer?.displayName ?? refund.customer?.name ?? "-"} />
              <Summary label={tc("Status")} value={tc(customerRefundStatusLabel(refund.status))} />
              <Summary label={tc("Refund date")} value={formatAppDate(refund.refundDate, locale, "-")} />
              <Summary label={tc("Source type")} value={tc(customerRefundSourceTypeLabel(refund.sourceType))} />
              <Summary label={tc("Amount refunded")} value={formatAppMoney(refund.amountRefunded, refund.currency, locale)} />
              <Summary label={tc("Paid-from account")} value={refund.account ? <bdi dir="ltr">{`${refund.account.code} ${refund.account.name}`}</bdi> : "-"} />
              <Summary label={tc("Journal entry")} value={refund.journalEntry ? <bdi dir="ltr">{`${refund.journalEntry.entryNumber} (${refund.journalEntry.id})`}</bdi> : "-"} />
              <Summary label={tc("Void reversal journal")} value={refund.voidReversalJournalEntry ? <bdi dir="ltr">{`${refund.voidReversalJournalEntry.entryNumber} (${refund.voidReversalJournalEntry.id})`}</bdi> : "-"} />
              <Summary label={tc("Posted")} value={formatAppDate(refund.postedAt, locale, "-")} />
              <Summary label={tc("Voided")} value={formatAppDate(refund.voidedAt, locale, "-")} />
              <Summary label={tc("Description")} value={refund.description ?? "-"} />
            </div>
            <div className="mt-4">
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerRefundStatusBadgeClass(refund.status)}`}>
                {tc(customerRefundStatusLabel(refund.status))}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Refund source")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("The refund reduces unapplied customer credit on this source.")}</p>
              </div>
              {sourceHref ? (
                <Link href={sourceHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {tc("View source")}
                </Link>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Source number")} value={<bdi dir="ltr">{refund.sourcePayment?.paymentNumber ?? refund.sourceCreditNote?.creditNoteNumber ?? "-"}</bdi>} />
              <Summary label={tc("Source status")} value={tc(refund.sourcePayment?.status ?? refund.sourceCreditNote?.status ?? "-")} />
              <Summary label={tc("Original amount")} value={formatAppMoney(refund.sourcePayment?.amountReceived ?? refund.sourceCreditNote?.total ?? "0.0000", refund.currency, locale)} />
              <Summary label={tc("Remaining unapplied")} value={formatAppMoney(refund.sourcePayment?.unappliedAmount ?? refund.sourceCreditNote?.unappliedAmount ?? "0.0000", refund.currency, locale)} />
            </div>
          </div>

          {pdfData ? (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("PDF data preview")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                <Summary label={tc("PDF refund number")} value={<bdi dir="ltr">{pdfData.refund.refundNumber}</bdi>} />
                <Summary label={tc("PDF source")} value={<bdi dir="ltr">{pdfData.source.number}</bdi>} />
                <Summary label={tc("PDF amount")} value={formatAppMoney(pdfData.refund.amountRefunded, pdfData.refund.currency, locale)} />
                <Summary label={tc("Generated")} value={formatAppDate(pdfData.generatedAt, locale, "-")} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <LedgerActionDialog
        open={voidDialogOpen && Boolean(refund)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) {
            setVoidDialogOpen(false);
          }
        }}
        tone="danger"
        title={tc("Void customer refund")}
        description={refund ? tc("Void customer refund {number}?", { number: refund.refundNumber }) : ""}
        confirmLabel={tc("Void")}
        busy={actionLoading}
        onConfirm={async () => {
          if (await voidRefund()) {
            setVoidDialogOpen(false);
          }
        }}
      />
    </section>
  );
}

function Summary({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
