"use client";

import { ArrowLeft, Eye, Plus, Undo2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  customerPaymentAllocationState,
  customerPaymentAllocationStateLabel,
  customerPaymentStatusLabel,
  type CustomerPaymentAllocationState,
} from "@/lib/customer-payments";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerPayment } from "@/lib/types";

function paymentStatusTone(status: CustomerPayment["status"]): LedgerStatusTone {
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

function allocationStateTone(state: CustomerPaymentAllocationState): LedgerStatusTone {
  switch (state) {
    case "FULLY_APPLIED":
      return "success";
    case "PARTIALLY_UNAPPLIED":
      return "warning";
    case "NO_ALLOCATIONS":
      return "neutral";
    default:
      return "neutral";
  }
}

export default function CustomerPaymentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreatePayment = can(PERMISSIONS.customerPayments.create);
  const canVoidPayment = can(PERMISSIONS.customerPayments.void);
  const customerId = searchParams.get("customerId")?.trim() ?? "";
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const workspaceHref = customerId ? partyDetailHref("customer", customerId) : "";
  const listContextParams = new URLSearchParams();
  if (customerId) {
    listContextParams.set("customerId", customerId);
  }
  if (returnTo) {
    listContextParams.set("returnTo", returnTo);
  }
  const listContextHref = `/sales/customer-payments${listContextParams.size > 0 ? `?${listContextParams.toString()}` : ""}`;
  const detailReturnTo = customerId || returnTo ? listContextHref : "";
  const recordPaymentHref = customerId
    ? `/sales/customer-payments/new?customerId=${encodeURIComponent(customerId)}&returnTo=${encodeURIComponent(returnTo || workspaceHref)}`
    : "/sales/customer-payments/new";
  const visiblePayments = customerId ? payments.filter((payment) => payment.customerId === customerId) : payments;

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CustomerPayment[]>("/customer-payments")
      .then((result) => {
        if (!cancelled) {
          setPayments(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load customer payments.");
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
  }, [organizationId, reloadToken]);

  async function voidPayment(payment: CustomerPayment) {
    if (!window.confirm(`Void payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionId(payment.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/void`, { method: "POST" });
      setSuccess(`Voided payment ${voided.paymentNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void payment.");
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Customer payments"
        description={
          customerId
            ? "Recorded customer payments for this workspace. Receipt PDFs remain explicit output actions."
            : "Recorded customer payments and invoice allocations. Receipt PDFs remain explicit output actions."
        }
        actions={
          <>
          {returnTo ? (
            <LedgerButton href={returnTo} icon={ArrowLeft}>
              Back to workspace
            </LedgerButton>
          ) : null}
          {canCreatePayment ? (
            <LedgerButton href={recordPaymentHref} variant="primary" icon={Plus}>
              Record payment
            </LedgerButton>
          ) : null}
          </>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load customer payments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading customer payments...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && visiblePayments.length === 0 ? (
          <LedgerEmptyState
            title="No customer payments found"
            description={
              customerId
                ? "No customer payments are recorded for this workspace yet. Finalize an invoice first, then record payment to reduce the receivable balance."
                : "No customer payments found. Finalize an invoice first, then record payment to close the receivables loop."
            }
            action={canCreatePayment ? <LedgerButton href={recordPaymentHref} variant="primary" icon={Plus}>Record payment</LedgerButton> : null}
          />
        ) : null}
        </div>

        {visiblePayments.length > 0 ? (
          <LedgerDataTable minWidth="1120px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Unapplied</th>
                <th className="px-4 py-3">Paid through</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visiblePayments.map((payment) => {
                const allocationState = customerPaymentAllocationState(payment);
                return (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-mono text-xs">{payment.paymentNumber}</td>
                    <td className="px-4 py-3 font-medium text-ink">{payment.customer?.displayName ?? payment.customer?.name ?? "-"}</td>
                    <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(payment.paymentDate, "-")}</LedgerDate></td>
                    <td className="px-4 py-3">
                      <LedgerStatusBadge tone={paymentStatusTone(payment.status)}>{customerPaymentStatusLabel(payment.status)}</LedgerStatusBadge>
                    </td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(payment.amountReceived, payment.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <LedgerMoney>{formatMoneyAmount(payment.unappliedAmount, payment.currency)}</LedgerMoney>
                        <LedgerStatusBadge tone={allocationStateTone(allocationState)}>
                          {customerPaymentAllocationStateLabel(allocationState)}
                        </LedgerStatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-steel">{payment.account ? `${payment.account.code} ${payment.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <LedgerButton
                          href={detailReturnTo ? `/sales/customer-payments/${payment.id}?returnTo=${encodeURIComponent(detailReturnTo)}` : `/sales/customer-payments/${payment.id}`}
                          size="sm"
                          icon={Eye}
                        >
                          View
                        </LedgerButton>
                        {payment.status === "POSTED" && canVoidPayment ? (
                          <LedgerButton type="button" variant="danger" size="sm" onClick={() => void voidPayment(payment)} disabled={actionId === payment.id} icon={Undo2}>
                            Void
                          </LedgerButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
