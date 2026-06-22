"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PaymentStatusBadge } from "@/components/ui-ledger/payment-method-badge";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { SupplierPayment } from "@/lib/types";

export default function SupplierPaymentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreatePayment = can(PERMISSIONS.supplierPayments.create);
  const canVoidPayment = can(PERMISSIONS.supplierPayments.void);
  const supplierId = searchParams.get("supplierId")?.trim() ?? "";
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const workspaceHref = supplierId ? partyDetailHref("supplier", supplierId) : "";
  const listContextParams = new URLSearchParams();
  if (supplierId) {
    listContextParams.set("supplierId", supplierId);
  }
  if (returnTo) {
    listContextParams.set("returnTo", returnTo);
  }
  const listContextHref = `/purchases/supplier-payments${listContextParams.size > 0 ? `?${listContextParams.toString()}` : ""}`;
  const detailReturnTo = supplierId || returnTo ? listContextHref : "";
  const recordPaymentHref = supplierId
    ? `/purchases/supplier-payments/new?supplierId=${encodeURIComponent(supplierId)}&returnTo=${encodeURIComponent(returnTo || workspaceHref)}`
    : "/purchases/supplier-payments/new";
  const visiblePayments = supplierId ? payments.filter((payment) => payment.supplierId === supplierId) : payments;

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SupplierPayment[]>("/supplier-payments")
      .then((result) => {
        if (!cancelled) {
          setPayments(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier payments.");
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

  async function voidPayment(payment: SupplierPayment) {
    if (!window.confirm(`Void supplier payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionId(payment.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/void`, { method: "POST" });
      setSuccess(`Voided supplier payment ${voided.paymentNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void supplier payment.");
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Supplier payments"
        description={
          supplierId
            ? "Recorded supplier payments for this workspace. Payment PDFs remain explicit output actions."
            : "Recorded supplier payments and purchase bill allocations. Payment PDFs remain explicit output actions."
        }
        actions={
          <LedgerActionBar>
          {returnTo ? (
            <LedgerButton href={returnTo}>
              Back to workspace
            </LedgerButton>
          ) : null}
          {canCreatePayment ? (
            <LedgerButton href={recordPaymentHref} variant="primary">
              Record payment
            </LedgerButton>
          ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load supplier payments.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading supplier payments...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && visiblePayments.length === 0 ? (
          <LedgerEmptyState
            title="No supplier payments found"
            description={
              supplierId
                ? "No supplier payments are recorded for this workspace yet. Finalize a bill first, then record payment to reduce the payable balance."
                : "No supplier payments found. Finalize a bill first, then record payment to reduce the payable balance."
            }
            action={canCreatePayment ? <LedgerButton href={recordPaymentHref} variant="primary">Record payment</LedgerButton> : null}
          />
        ) : null}

      {visiblePayments.length > 0 ? (
        <LedgerDataTable minWidth="1080px">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
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
              {visiblePayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 font-mono text-xs">{payment.paymentNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{payment.supplier?.displayName ?? payment.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(payment.paymentDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(payment.amountPaid, payment.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(payment.unappliedAmount, payment.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-steel">{payment.account ? `${payment.account.code} ${payment.account.name}` : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerActionBar>
                      <LedgerButton
                        href={detailReturnTo ? `/purchases/supplier-payments/${payment.id}?returnTo=${encodeURIComponent(detailReturnTo)}` : `/purchases/supplier-payments/${payment.id}`}
                        size="sm"
                      >
                        View
                      </LedgerButton>
                      {payment.status === "POSTED" && canVoidPayment ? (
                        <LedgerButton variant="danger" size="sm" onClick={() => void voidPayment(payment)} disabled={actionId === payment.id}>
                          Void
                        </LedgerButton>
                      ) : null}
                    </LedgerActionBar>
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
