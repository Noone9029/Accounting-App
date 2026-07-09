"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { BankPaymentRequestReconciliationState, BankPaymentRequestSafeDetail, BankPaymentRequestStatus } from "@/lib/types";

const statuses: Array<"" | BankPaymentRequestStatus> = ["", "DRAFT", "PENDING_APPROVAL", "APPROVED", "RELEASE_BLOCKED", "RELEASED_EXTERNALLY", "RECONCILED", "CANCELLED"];
const reconciliationStates: BankPaymentRequestReconciliationState[] = ["ANY", "UNRECONCILED", "RECONCILED", "FEED", "STATEMENT"];

export default function SupplierPayoutRequestsPage() {
  const organizationId = useActiveOrganizationId();
  const [requests, setRequests] = useState<BankPaymentRequestSafeDetail[]>([]);
  const [status, setStatus] = useState<"" | BankPaymentRequestStatus>("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseBillId, setPurchaseBillId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reconciliationState, setReconciliationState] = useState<BankPaymentRequestReconciliationState>("ANY");
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const queryPath = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (supplierId.trim()) params.set("supplierId", supplierId.trim());
    if (purchaseBillId.trim()) params.set("purchaseBillId", purchaseBillId.trim());
    if (from) params.set("from", `${from}T00:00:00.000Z`);
    if (to) params.set("to", `${to}T23:59:59.000Z`);
    if (reconciliationState !== "ANY") params.set("reconciliationState", reconciliationState);
    return `/bank-integrations/vendor-payment-requests${params.size ? `?${params.toString()}` : ""}`;
  }, [from, purchaseBillId, reconciliationState, status, supplierId, to]);

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankPaymentRequestSafeDetail[]>(queryPath)
      .then((result) => {
        if (!cancelled) setRequests(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load supplier payout requests.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, queryPath, reloadToken]);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Supplier payouts"
        title="Supplier payout requests"
        badge={<LedgerStatusBadge tone="warning">Release blocked</LedgerStatusBadge>}
        description="Review Wio-shaped supplier payment requests, approval state, manual external release records, reconciliation links, and request references without moving money."
        actions={<LedgerButton icon={RefreshCw} onClick={() => setReloadToken((current) => current + 1)} disabled={loading}>Refresh</LedgerButton>}
      />
      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Review only. LedgerByte does not connect to Wio, store bank credentials, send money, or initiate supplier payouts from this page.
        </LedgerSummaryBand>

        <LedgerPanel>
          <LedgerFilterBar>
            <LedgerFieldLabel>
              <LedgerFieldText>Status</LedgerFieldText>
              <LedgerSelect value={status} onChange={(event) => setStatus(event.target.value as "" | BankPaymentRequestStatus)}>
                {statuses.map((value) => (
                  <option key={value || "ALL"} value={value}>{value ? statusLabel(value) : "All statuses"}</option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Reconciliation</LedgerFieldText>
              <LedgerSelect value={reconciliationState} onChange={(event) => setReconciliationState(event.target.value as BankPaymentRequestReconciliationState)}>
                {reconciliationStates.map((value) => (
                  <option key={value} value={value}>{reconciliationLabel(value)}</option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Supplier ID</LedgerFieldText>
              <LedgerInput value={supplierId} onChange={(event) => setSupplierId(event.target.value)} placeholder="UUID" />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Purchase bill ID</LedgerFieldText>
              <LedgerInput value={purchaseBillId} onChange={(event) => setPurchaseBillId(event.target.value)} placeholder="UUID" />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>From</LedgerFieldText>
              <LedgerInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>To</LedgerFieldText>
              <LedgerInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerButton icon={Search} onClick={() => setReloadToken((current) => current + 1)} disabled={loading}>Apply filters</LedgerButton>
          </LedgerFilterBar>
        </LedgerPanel>

        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load supplier payout requests.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading supplier payout requests...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && requests.length === 0 ? (
          <StatusMessage type="empty">
            No supplier payout requests found. Provider release remains blocked until a future real bank integration is explicitly implemented and approved.
          </StatusMessage>
        ) : null}

        {requests.length ? (
          <LedgerDataTable minWidth="1120px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Bill</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Release ref</th>
                <th className="px-4 py-3">Reconciliation</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{request.id}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{request.supplier?.displayName ?? request.supplier?.name ?? "Unlinked supplier"}</td>
                  <td className="px-4 py-3 text-steel">{request.purchaseBill ? <bdi dir="ltr">{request.purchaseBill.billNumber}</bdi> : "No linked bill"}</td>
                  <td className="px-4 py-3"><StatusBadge status={request.status} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoney(request.amount, request.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{request.externalReleaseReferenceMasked ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{request.reconciliation.state === "RECONCILED" ? "Reconciled" : "Unreconciled"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/purchases/supplier-payout-requests/${request.id}`} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
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

function reconciliationLabel(state: BankPaymentRequestReconciliationState) {
  return {
    ANY: "Any reconciliation state",
    UNRECONCILED: "Unreconciled",
    RECONCILED: "Reconciled",
    FEED: "Linked to mock feed",
    STATEMENT: "Linked to statement import",
  }[state];
}

function formatMoney(amount: string, currency: string) {
  return `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
