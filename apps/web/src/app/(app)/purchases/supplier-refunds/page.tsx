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
import { supplierRefundSourceTypeLabel, supplierRefundStatusBadgeClass, supplierRefundStatusLabel } from "@/lib/supplier-refunds";
import type { SupplierRefund } from "@/lib/types";

export default function SupplierRefundsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [refunds, setRefunds] = useState<SupplierRefund[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateRefund = can(PERMISSIONS.supplierRefunds.create);
  const canVoidRefund = can(PERMISSIONS.supplierRefunds.void);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SupplierRefund[]>("/supplier-refunds")
      .then((result) => {
        if (!cancelled) {
          setRefunds(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier refunds.");
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

  async function voidRefund(refund: SupplierRefund) {
    if (!window.confirm(`Void supplier refund ${refund.refundNumber}?`)) {
      return;
    }

    setActionId(refund.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<SupplierRefund>(`/supplier-refunds/${refund.id}/void`, { method: "POST" });
      setSuccess(`Voided supplier refund ${voided.refundNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void supplier refund.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Supplier refunds</h1>
          <p className="mt-1 text-sm text-steel">Manual refunds received from suppliers against unapplied supplier payments and purchase debit notes.</p>
        </div>
        {canCreateRefund ? (
          <Link href="/purchases/supplier-refunds/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Record refund
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load supplier refunds.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading supplier refunds...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && refunds.length === 0 ? <StatusMessage type="empty">No supplier refunds found.</StatusMessage> : null}
      </div>

      {refunds.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Received into</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-4 py-3 font-mono text-xs">{refund.refundNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{refund.supplier?.displayName ?? refund.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(refund.refundDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{supplierRefundSourceTypeLabel(refund.sourceType)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(refund.amountRefunded, refund.currency)}</td>
                  <td className="px-4 py-3 text-steel">{refund.account ? `${refund.account.code} ${refund.account.name}` : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${supplierRefundStatusBadgeClass(refund.status)}`}>
                      {supplierRefundStatusLabel(refund.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/supplier-refunds/${refund.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {refund.status === "POSTED" && canVoidRefund ? (
                        <button type="button" onClick={() => void voidRefund(refund)} disabled={actionId === refund.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
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
