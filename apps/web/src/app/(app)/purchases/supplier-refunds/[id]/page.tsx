"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDate,
  LedgerMetadataRow,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, supplierRefundPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  supplierRefundSourceHref,
  supplierRefundSourceTypeLabel,
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
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title={refund ? refund.refundNumber : "Supplier refund"}
        description="Manual supplier refund posting, source reference, and PDF download."
        badge={refund ? <LedgerStatusBadge tone={supplierRefundStatusTone(refund.status)}>{supplierRefundStatusLabel(refund.status)}</LedgerStatusBadge> : undefined}
        actions={
          <LedgerActionBar>
            <LedgerButton href="/purchases/supplier-refunds">Back</LedgerButton>
            {refund?.supplierId ? <LedgerButton href={`/contacts/${refund.supplierId}`}>Supplier ledger</LedgerButton> : null}
            {refund && canDownloadGeneratedDocuments ? (
              <LedgerButton onClick={() => void downloadRefundPdf()} disabled={actionLoading}>
                Download PDF
              </LedgerButton>
            ) : null}
            {refund?.status === "POSTED" && canVoidRefund ? (
              <LedgerButton variant="danger" onClick={() => void voidRefund()} disabled={actionLoading}>
                Void
              </LedgerButton>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load supplier refunds.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading supplier refund...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {refund ? (
          <>
            <LedgerSummaryBand tone="warning">
              No bank transfer, bank reconciliation, payment gateway, or ZATCA submission is performed.
            </LedgerSummaryBand>

            <AttachmentPanel linkedEntityType="SUPPLIER_REFUND" linkedEntityId={refund.id} />

            <LedgerSection title="Refund details" description="Posted accounting details and generated-document references for this supplier refund.">
              <LedgerMetadataRow
                items={[
                  { label: "Supplier", value: refund.supplier?.displayName ?? refund.supplier?.name ?? "-" },
                  { label: "Status", value: supplierRefundStatusLabel(refund.status) },
                  { label: "Refund date", value: <LedgerDate>{formatOptionalDate(refund.refundDate, "-")}</LedgerDate> },
                  { label: "Source type", value: supplierRefundSourceTypeLabel(refund.sourceType) },
                  { label: "Amount refunded", value: <LedgerMoney>{formatMoneyAmount(refund.amountRefunded, refund.currency)}</LedgerMoney> },
                  { label: "Received into", value: refund.account ? `${refund.account.code} ${refund.account.name}` : "-" },
                  { label: "Journal entry", value: refund.journalEntry ? `${refund.journalEntry.entryNumber} (${refund.journalEntry.id})` : "-" },
                  { label: "Void reversal", value: refund.voidReversalJournalEntry ? `${refund.voidReversalJournalEntry.entryNumber} (${refund.voidReversalJournalEntry.id})` : "-" },
                  { label: "Posted", value: refund.postedAt ? new Date(refund.postedAt).toLocaleString() : "-" },
                  { label: "Voided", value: refund.voidedAt ? new Date(refund.voidedAt).toLocaleString() : "-" },
                  { label: "Description", value: refund.description ?? "-" },
                ]}
              />
            </LedgerSection>

            <LedgerPanel className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">Refund source</h2>
                  <p className="mt-1 text-sm leading-6 text-steel">The refund reduces unapplied supplier credit on this source.</p>
                </div>
                {sourceHref ? <LedgerButton href={sourceHref}>View source</LedgerButton> : null}
              </div>
              <div className="mt-4">
                <LedgerMetadataRow
                  items={[
                    { label: "Source number", value: refund.sourcePayment?.paymentNumber ?? refund.sourceDebitNote?.debitNoteNumber ?? "-" },
                    { label: "Source status", value: refund.sourcePayment?.status ?? refund.sourceDebitNote?.status ?? "-" },
                    { label: "Original amount", value: <LedgerMoney>{formatMoneyAmount(refund.sourcePayment?.amountPaid ?? refund.sourceDebitNote?.total ?? "0.0000", refund.currency)}</LedgerMoney> },
                    { label: "Remaining unapplied", value: <LedgerMoney>{formatMoneyAmount(refund.sourcePayment?.unappliedAmount ?? refund.sourceDebitNote?.unappliedAmount ?? "0.0000", refund.currency)}</LedgerMoney> },
                  ]}
                />
              </div>
            </LedgerPanel>

            {pdfData ? (
              <LedgerSection title="PDF data preview" description="Structured supplier refund document preview. Downloading the PDF stores a generated archive record.">
                <LedgerMetadataRow
                  items={[
                    { label: "PDF refund number", value: pdfData.refund.refundNumber },
                    { label: "PDF source", value: pdfData.source.number },
                    { label: "PDF amount", value: <LedgerMoney>{formatMoneyAmount(pdfData.refund.amountRefunded, pdfData.refund.currency)}</LedgerMoney> },
                    { label: "Generated", value: new Date(pdfData.generatedAt).toLocaleString() },
                  ]}
                />
              </LedgerSection>
            ) : null}
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function supplierRefundStatusTone(status: SupplierRefund["status"]): LedgerStatusTone {
  switch (status) {
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
    case "DRAFT":
      return "draft";
    default:
      return "neutral";
  }
}
