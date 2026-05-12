"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerPayment } from "@/lib/types";

export default function CustomerPaymentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreatePayment = can(PERMISSIONS.customerPayments.create);
  const canVoidPayment = can(PERMISSIONS.customerPayments.void);

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
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Customer payments</h1>
          <p className="mt-1 text-sm text-steel">Posted customer receipts and invoice allocations.</p>
        </div>
        {canCreatePayment ? (
          <Link href="/sales/customer-payments/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Record payment
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load customer payments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading customer payments...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && payments.length === 0 ? <StatusMessage type="empty">No customer payments found.</StatusMessage> : null}
      </div>

      {payments.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-left text-sm">
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
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 font-mono text-xs">{payment.paymentNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{payment.customer?.displayName ?? payment.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(payment.paymentDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{payment.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(payment.amountReceived, payment.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(payment.unappliedAmount, payment.currency)}</td>
                  <td className="px-4 py-3 text-steel">{payment.account ? `${payment.account.code} ${payment.account.name}` : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/customer-payments/${payment.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {payment.status === "POSTED" && canVoidPayment ? (
                        <button type="button" onClick={() => void voidPayment(payment)} disabled={actionId === payment.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Void
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
