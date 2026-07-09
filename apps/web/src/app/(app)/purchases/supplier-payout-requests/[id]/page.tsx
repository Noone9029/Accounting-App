"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import {
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
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { BankPaymentRequestSafeDetail, BankPaymentRequestStatus } from "@/lib/types";

export default function SupplierPayoutRequestDetailPage() {
  const organizationId = useActiveOrganizationId();
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const [request, setRequest] = useState<BankPaymentRequestSafeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!organizationId || !id) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankPaymentRequestSafeDetail>(`/bank-integrations/vendor-payment-requests/${encodeURIComponent(id)}`)
      .then((result) => {
        if (!cancelled) setRequest(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load supplier payout request.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, organizationId, reloadToken]);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Supplier payouts"
        title="Payout request detail"
        badge={request ? <StatusBadge status={request.status} /> : <LedgerStatusBadge tone="draft">Review required</LedgerStatusBadge>}
        description="Safe review detail for a supplier payout request. Provider release is blocked; external release records are manual review metadata only."
        actions={
          <>
            <LedgerButton href="/purchases/supplier-payout-requests" icon={ArrowLeft}>Back to requests</LedgerButton>
            <LedgerButton icon={RefreshCw} onClick={() => setReloadToken((current) => current + 1)} disabled={loading}>Refresh</LedgerButton>
          </>
        }
      />
      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          No live Wio connection, bank credentials, provider payloads, or payment initiation is available from this review surface.
        </LedgerSummaryBand>

        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load the payout request.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading supplier payout request...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

        {request ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
            <div className="space-y-4">
              <LedgerPanel>
                <LedgerMetadataRow
                  items={[
                    { label: "Supplier", value: request.supplier?.displayName ?? request.supplier?.name ?? "Unlinked supplier" },
                    { label: "Bill", value: request.purchaseBill?.billNumber ?? "No linked bill" },
                    { label: "Amount", value: <LedgerMoney>{formatMoney(request.amount, request.currency)}</LedgerMoney> },
                    { label: "Request ID", value: <bdi dir="ltr">{request.requestId ?? "-"}</bdi> },
                  ]}
                />
              </LedgerPanel>

              <LedgerSection title="Workflow timestamps" description="Approval, manual release, reconciliation, and cancellation timestamps are shown when present.">
                <LedgerMetadataRow
                  items={[
                    { label: "Created", value: <LedgerDate>{formatDate(request.createdAt)}</LedgerDate> },
                    { label: "Approved", value: <LedgerDate>{formatDate(request.approvedAt)}</LedgerDate> },
                    { label: "External release", value: <LedgerDate>{formatDate(request.manuallyReleasedAt)}</LedgerDate> },
                    { label: "Reconciled", value: <LedgerDate>{formatDate(request.reconciledAt)}</LedgerDate> },
                  ]}
                />
                {request.cancelledAt ? (
                  <div className="mt-3">
                    <LedgerAlert tone="danger" title="Cancelled">
                      Cancelled at <LedgerDate>{formatDate(request.cancelledAt)}</LedgerDate>.
                    </LedgerAlert>
                  </div>
                ) : null}
              </LedgerSection>

              <LedgerSection title="Safe payment references" description="Only masked references and review metadata are shown.">
                <LedgerMetadataRow
                  items={[
                    { label: "External release ref", value: <bdi dir="ltr">{request.externalReleaseReferenceMasked ?? "-"}</bdi> },
                    { label: "Beneficiary", value: request.beneficiaryMapping?.beneficiaryDisplayName ?? "No beneficiary mapping" },
                    { label: "Beneficiary ref", value: <bdi dir="ltr">{request.beneficiaryMapping?.beneficiaryRefMasked ?? "-"}</bdi> },
                    { label: "Connection ref", value: <bdi dir="ltr">{request.bankConnection?.externalConnectionRefMasked ?? "-"}</bdi> },
                  ]}
                />
                <div className="mt-3">
                  <LedgerAlert tone="warning" title="Release blocked">
                    {request.releaseBlockedReason ?? "Bank payment release is blocked until a real provider implementation is explicitly added and approved."}
                  </LedgerAlert>
                </div>
              </LedgerSection>
            </div>

            <div className="space-y-4">
              <LedgerSection title="Reconciliation" description="Linked mock feed or manual statement transaction summary.">
                {request.reconciliation.bankFeedTransaction ? (
                  <LedgerMetadataRow
                    items={[
                      { label: "Source", value: "Mock feed" },
                      { label: "Date", value: <LedgerDate>{formatDate(request.reconciliation.bankFeedTransaction.transactionDate)}</LedgerDate> },
                      { label: "Amount", value: <LedgerMoney>{formatMoney(request.reconciliation.bankFeedTransaction.amount, request.reconciliation.bankFeedTransaction.currency)}</LedgerMoney> },
                      { label: "Masked ref", value: <bdi dir="ltr">{request.reconciliation.bankFeedTransaction.externalTransactionRefMasked ?? "-"}</bdi> },
                    ]}
                  />
                ) : request.reconciliation.bankStatementTransaction ? (
                  <LedgerMetadataRow
                    items={[
                      { label: "Source", value: "Statement import" },
                      { label: "Date", value: <LedgerDate>{formatDate(request.reconciliation.bankStatementTransaction.transactionDate)}</LedgerDate> },
                      { label: "Amount", value: <LedgerMoney>{formatMoney(request.reconciliation.bankStatementTransaction.amount, request.currency)}</LedgerMoney> },
                      { label: "Status", value: request.reconciliation.bankStatementTransaction.status },
                    ]}
                  />
                ) : (
                  <LedgerAlert tone="info">No reconciliation transaction is linked yet.</LedgerAlert>
                )}
              </LedgerSection>

              <LedgerSection title="Audit timeline" description="Status-change audit references only; raw payloads are not displayed.">
                {request.auditTimeline?.length ? (
                  <ol className="space-y-3">
                    {request.auditTimeline.map((event) => (
                      <li key={event.id} className="rounded-md border border-line bg-white px-3 py-2">
                        <div className="text-sm font-semibold text-ink">{event.action.replace(/_/g, " ")}</div>
                        <div className="mt-1 text-xs text-steel">
                          <LedgerDate>{formatDate(event.createdAt)}</LedgerDate> · Actor <bdi dir="ltr">{event.actorUserId ?? "-"}</bdi> · Request <bdi dir="ltr">{event.requestId ?? "-"}</bdi>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <LedgerAlert tone="info">No audit timeline entries are available for this request.</LedgerAlert>
                )}
              </LedgerSection>
            </div>
          </div>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function StatusBadge({ status }: { status: BankPaymentRequestStatus }) {
  const tone = status === "RECONCILED" ? "success" : status === "RELEASE_BLOCKED" || status === "PENDING_APPROVAL" ? "warning" : status === "CANCELLED" ? "danger" : "draft";
  return <LedgerStatusBadge tone={tone}>{statusLabel(status)}</LedgerStatusBadge>;
}

function statusLabel(status: BankPaymentRequestStatus) {
  return {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    RELEASE_BLOCKED: "Release Blocked",
    RELEASED_EXTERNALLY: "Manually Released Externally",
    RECONCILED: "Reconciled",
    CANCELLED: "Cancelled",
  }[status];
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function formatMoney(amount: string, currency: string) {
  return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
