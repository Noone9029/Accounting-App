"use client";

import { ArrowLeft, Download, Undo2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerButton,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  customerRefundSourceHref,
  customerRefundSourceTypeLabel,
  customerRefundStatusLabel,
} from "@/lib/customer-refunds";
import { formatMoneyAmount } from "@/lib/money";
import { customerRefundPdfPath, downloadPdf } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerRefund, CustomerRefundPdfData } from "@/lib/types";

function refundStatusTone(status: CustomerRefund["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
    default:
      return "neutral";
  }
}

export default function CustomerRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [refund, setRefund] = useState<CustomerRefund | null>(null);
  const [pdfData, setPdfData] = useState<CustomerRefundPdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title={refund ? refund.refundNumber : "Customer refund"}
        badge={refund ? <LedgerStatusBadge tone={refundStatusTone(refund.status)}>{customerRefundStatusLabel(refund.status)}</LedgerStatusBadge> : null}
        description={
          <>
            Manual customer refund posting, source reference, and PDF download.
            {refund ? <span className="mt-1 block text-xs">No payment gateway, bank reconciliation, or ZATCA submission is performed.</span> : null}
          </>
        }
        actions={
          <LedgerActionBar>
            <LedgerButton href="/sales/customer-refunds" icon={ArrowLeft}>
              Back
            </LedgerButton>
            {refund?.customerId ? <LedgerButton href={`/contacts/${refund.customerId}`}>Customer ledger</LedgerButton> : null}
            {refund ? (
              <LedgerButton type="button" onClick={() => void downloadRefundPdf()} disabled={actionLoading} icon={Download}>
                Download PDF
              </LedgerButton>
            ) : null}
            {refund?.status === "POSTED" && canVoidRefund ? (
              <LedgerButton type="button" onClick={() => void voidRefund()} disabled={actionLoading} variant="danger" icon={Undo2} className="self-start">
                Void
              </LedgerButton>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load refunds.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading customer refund...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        </div>

      {refund ? (
        <div className="space-y-5">
          <AttachmentPanel linkedEntityType="CUSTOMER_REFUND" linkedEntityId={refund.id} />

          <LedgerPanel>
            <LedgerMetricGrid>
              <Summary label="Customer" value={refund.customer?.displayName ?? refund.customer?.name ?? "-"} />
              <Summary label="Status" value={customerRefundStatusLabel(refund.status)} />
              <Summary label="Refund date" value={new Date(refund.refundDate).toLocaleDateString()} />
              <Summary label="Source type" value={customerRefundSourceTypeLabel(refund.sourceType)} />
              <Summary label="Amount refunded" value={formatMoneyAmount(refund.amountRefunded, refund.currency)} money />
              <Summary label="Paid-from account" value={refund.account ? `${refund.account.code} ${refund.account.name}` : "-"} />
              <Summary label="Journal entry" value={refund.journalEntry ? `${refund.journalEntry.entryNumber} (${refund.journalEntry.id})` : "-"} />
              <Summary label="Void reversal journal" value={refund.voidReversalJournalEntry ? `${refund.voidReversalJournalEntry.entryNumber} (${refund.voidReversalJournalEntry.id})` : "-"} />
              <Summary label="Posted" value={refund.postedAt ? new Date(refund.postedAt).toLocaleString() : "-"} />
              <Summary label="Voided" value={refund.voidedAt ? new Date(refund.voidedAt).toLocaleString() : "-"} />
              <Summary label="Description" value={refund.description ?? "-"} />
            </LedgerMetricGrid>
          </LedgerPanel>

          <LedgerSection
            title="Refund source"
            description="The refund reduces unapplied customer credit on this source."
            action={sourceHref ? <LedgerButton href={sourceHref}>View source</LedgerButton> : null}
          >
            <LedgerMetricGrid>
              <Summary label="Source number" value={refund.sourcePayment?.paymentNumber ?? refund.sourceCreditNote?.creditNoteNumber ?? "-"} />
              <Summary label="Source status" value={refund.sourcePayment?.status ?? refund.sourceCreditNote?.status ?? "-"} />
              <Summary label="Original amount" value={formatMoneyAmount(refund.sourcePayment?.amountReceived ?? refund.sourceCreditNote?.total ?? "0.0000", refund.currency)} money />
              <Summary label="Remaining unapplied" value={formatMoneyAmount(refund.sourcePayment?.unappliedAmount ?? refund.sourceCreditNote?.unappliedAmount ?? "0.0000", refund.currency)} money />
            </LedgerMetricGrid>
          </LedgerSection>

          {pdfData ? (
            <LedgerSection title="PDF data preview" description="Refund PDF values are loaded from the existing refund PDF data endpoint.">
              <LedgerMetricGrid>
                <Summary label="PDF refund number" value={pdfData.refund.refundNumber} />
                <Summary label="PDF source" value={pdfData.source.number} />
                <Summary label="PDF amount" value={formatMoneyAmount(pdfData.refund.amountRefunded, pdfData.refund.currency)} money />
                <Summary label="Generated" value={new Date(pdfData.generatedAt).toLocaleString()} />
              </LedgerMetricGrid>
            </LedgerSection>
          ) : null}
        </div>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function Summary({ label, value, money = false }: { label: string; value: string; money?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{money ? <LedgerMoney>{value}</LedgerMoney> : value}</div>
    </div>
  );
}
