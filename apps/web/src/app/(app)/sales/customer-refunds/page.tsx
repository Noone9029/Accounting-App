"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { customerRefundSourceTypeLabel, customerRefundStatusBadgeClass, customerRefundStatusLabel } from "@/lib/customer-refunds";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerRefund } from "@/lib/types";

export default function CustomerRefundsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [refunds, setRefunds] = useState<CustomerRefund[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateRefund = can(PERMISSIONS.customerRefunds.create);
  const canVoidRefund = can(PERMISSIONS.customerRefunds.void);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CustomerRefund[]>("/customer-refunds")
      .then((result) => {
        if (!cancelled) {
          setRefunds(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load customer refunds."));
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

  async function voidRefund(refund: CustomerRefund) {
    if (!window.confirm(tc("Void refund {number}?", { number: refund.refundNumber }))) {
      return;
    }

    setActionId(refund.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CustomerRefund>(`/customer-refunds/${refund.id}/void`, { method: "POST" });
      setSuccess(tc("Voided refund {number}.", { number: voided.refundNumber }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to void refund."));
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Customer refunds")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Manual refunds of unapplied customer payments and credit notes.")}</p>
        </div>
        {canCreateRefund ? (
          <Link href="/sales/customer-refunds/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Record refund")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load customer refunds.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading customer refunds...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && refunds.length === 0 ? <StatusMessage type="empty">{tc("No customer refunds found.")}</StatusMessage> : null}
      </div>

      {refunds.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Customer")}</th>
                <th className="px-4 py-3">{tc("Date")}</th>
                <th className="px-4 py-3">{tc("Source")}</th>
                <th className="px-4 py-3">{tc("Amount")}</th>
                <th className="px-4 py-3">{tc("Paid from")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{refund.refundNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{refund.customer?.displayName ?? refund.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(refund.refundDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{tc(customerRefundSourceTypeLabel(refund.sourceType))}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(refund.amountRefunded, refund.currency, locale)}</td>
                  <td className="px-4 py-3 text-steel">{refund.account ? <bdi dir="ltr">{`${refund.account.code} ${refund.account.name}`}</bdi> : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerRefundStatusBadgeClass(refund.status)}`}>
                      {tc(customerRefundStatusLabel(refund.status))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/customer-refunds/${refund.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {refund.status === "POSTED" && canVoidRefund ? (
                        <button type="button" onClick={() => void voidRefund(refund)} disabled={actionId === refund.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {tc("Void")}
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
