"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  customerPaymentAllocationState,
  customerPaymentAllocationStateBadgeClass,
  customerPaymentAllocationStateLabel,
  customerPaymentStatusBadgeClass,
  customerPaymentStatusLabel,
} from "@/lib/customer-payments";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerPayment } from "@/lib/types";

export default function CustomerPaymentsPage() {
  const { locale, tc } = useAppLocale();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingVoidPayment, setPendingVoidPayment] = useState<CustomerPayment | null>(null);
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load customer payments."));
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
  }, [organizationId, reloadToken, tc]);

  async function voidPayment(payment: CustomerPayment): Promise<boolean> {
    setActionId(payment.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/void`, { method: "POST" });
      setSuccess(tc("Voided payment {number}.", { number: voided.paymentNumber }));
      setReloadToken((current) => current + 1);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to void payment."));
      return false;
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Customer payments")}</h1>
          <p className="mt-1 text-sm text-steel">
            {customerId
              ? tc("Recorded customer payments for this workspace. Receipt PDFs remain explicit output actions.")
              : tc("Recorded customer payments and invoice allocations. Receipt PDFs remain explicit output actions.")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {returnTo ? (
            <Link href={returnTo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Back to workspace")}
            </Link>
          ) : null}
          {canCreatePayment ? (
            <Link href={recordPaymentHref} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              {tc("Record payment")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load customer payments.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading customer payments...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && visiblePayments.length === 0 ? (
          <StatusMessage type="empty">
            {customerId
              ? tc("No customer payments are recorded for this workspace yet. Finalize an invoice first, then record payment to reduce the receivable balance.")
              : tc("No customer payments found. Finalize an invoice first, then record payment to close the receivables loop.")}
          </StatusMessage>
        ) : null}
      </div>

      {visiblePayments.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Customer")}</th>
                <th className="px-4 py-3">{tc("Date")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Amount")}</th>
                <th className="px-4 py-3">{tc("Unapplied")}</th>
                <th className="px-4 py-3">{tc("Paid through")}</th>
                <th className="px-4 py-3">{tc("Journal")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visiblePayments.map((payment) => {
                const allocationState = customerPaymentAllocationState(payment);
                return (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{payment.paymentNumber}</bdi></td>
                    <td className="px-4 py-3 font-medium text-ink">{payment.customer?.displayName ?? payment.customer?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-steel">{formatAppDate(payment.paymentDate, locale, "-")}</td>
                    <td className="px-4 py-3">
                      <PaymentStatusPill status={payment.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(payment.transactionAmountReceived ?? payment.amountReceived, payment.currency, locale)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-mono text-xs">{formatAppMoney(payment.unappliedAmount, payment.currency, locale)}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerPaymentAllocationStateBadgeClass(allocationState)}`}>
                          {tc(customerPaymentAllocationStateLabel(allocationState))}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-steel">{payment.account ? <><bdi dir="ltr">{payment.account.code}</bdi> {payment.account.name}</> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {payment.journalEntry ? <><bdi dir="ltr">{payment.journalEntry.entryNumber}</bdi> (<bdi dir="ltr">{payment.journalEntry.id}</bdi>)</> : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={detailReturnTo ? `/sales/customer-payments/${payment.id}?returnTo=${encodeURIComponent(detailReturnTo)}` : `/sales/customer-payments/${payment.id}`}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {tc("View")}
                        </Link>
                        {payment.status === "POSTED" && canVoidPayment ? (
                          <button type="button" onClick={() => setPendingVoidPayment(payment)} disabled={actionId === payment.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                            {tc("Void")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <LedgerActionDialog
        open={Boolean(pendingVoidPayment)}
        onOpenChange={(open) => {
          if (!open && !actionId) {
            setPendingVoidPayment(null);
          }
        }}
        tone="danger"
        title={tc("Void customer payment")}
        description={pendingVoidPayment ? tc("Void payment {number}?", { number: pendingVoidPayment.paymentNumber }) : ""}
        confirmLabel={tc("Void")}
        busy={Boolean(actionId)}
        onConfirm={async () => {
          if (pendingVoidPayment && (await voidPayment(pendingVoidPayment))) {
            setPendingVoidPayment(null);
          }
        }}
      />
    </section>
  );
}

function PaymentStatusPill({ status }: { status: CustomerPayment["status"] }) {
  const { tc } = useAppLocale();
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerPaymentStatusBadgeClass(status)}`}>
      {tc(customerPaymentStatusLabel(status))}
    </span>
  );
}
