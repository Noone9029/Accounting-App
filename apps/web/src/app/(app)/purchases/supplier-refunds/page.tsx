"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import { supplierRefundSourceTypeLabel, supplierRefundStatusBadgeClass, supplierRefundStatusLabel } from "@/lib/supplier-refunds";
import type { SupplierRefund } from "@/lib/types";

export default function SupplierRefundsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [refunds, setRefunds] = useState<SupplierRefund[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingVoidRefund, setPendingVoidRefund] = useState<SupplierRefund | null>(null);
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load supplier refunds."));
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

  async function voidRefund(refund: SupplierRefund): Promise<boolean> {
    setActionId(refund.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<SupplierRefund>(`/supplier-refunds/${refund.id}/void`, { method: "POST" });
      setSuccess(tc("Voided supplier refund {number}.", { number: voided.refundNumber }));
      setReloadToken((current) => current + 1);
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to void supplier refund."));
      return false;
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Supplier refunds")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Manual refunds received from suppliers against unapplied supplier payments and purchase debit notes.")}</p>
        </div>
        {canCreateRefund ? (
          <Link href="/purchases/supplier-refunds/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Record refund")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load supplier refunds.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading supplier refunds...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && refunds.length === 0 ? <StatusMessage type="empty">{tc("No supplier refunds found.")}</StatusMessage> : null}
      </div>

      {refunds.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Supplier")}</th>
                <th className="px-4 py-3">{tc("Date")}</th>
                <th className="px-4 py-3">{tc("Source")}</th>
                <th className="px-4 py-3">{tc("Amount")}</th>
                <th className="px-4 py-3">{tc("Received into")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{refund.refundNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{refund.supplier?.displayName ?? refund.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(refund.refundDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{tc(supplierRefundSourceTypeLabel(refund.sourceType))}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(refund.amountRefunded, refund.currency, locale)}</td>
                  <td className="px-4 py-3 text-steel">{refund.account ? <bdi dir="ltr">{`${refund.account.code} ${refund.account.name}`}</bdi> : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${supplierRefundStatusBadgeClass(refund.status)}`}>
                      {tc(supplierRefundStatusLabel(refund.status))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/supplier-refunds/${refund.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {refund.status === "POSTED" && canVoidRefund ? (
                        <button type="button" onClick={() => setPendingVoidRefund(refund)} disabled={actionId === refund.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
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

      <LedgerActionDialog
        open={Boolean(pendingVoidRefund)}
        onOpenChange={(open) => {
          if (!open && !actionId) setPendingVoidRefund(null);
        }}
        tone="danger"
        title={tc("Void supplier refund")}
        description={pendingVoidRefund ? tc("Void supplier refund {number}?", { number: pendingVoidRefund.refundNumber }) : ""}
        confirmLabel={tc("Void")}
        busy={Boolean(actionId)}
        onConfirm={async () => {
          if (pendingVoidRefund && (await voidRefund(pendingVoidRefund))) setPendingVoidRefund(null);
        }}
      />
    </section>
  );
}
