"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { PERMISSIONS } from "@/lib/permissions";
import { PURCHASE_RETURN_NON_EFFECT_TEXT, purchaseReturnSourceLabel, purchaseReturnStatusBadgeClass, purchaseReturnStatusLabel } from "@/lib/purchase-returns";
import type { PurchaseReturn } from "@/lib/types";

export default function PurchaseReturnsPage() {
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = canAny(PERMISSIONS.purchaseBills.create, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<{ data: PurchaseReturn[] }>("/purchase-returns")
      .then((result) => {
        if (!cancelled) setReturns(result.data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load purchase returns.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Purchase returns</h1>
          <p className="mt-1 text-sm text-steel">Operational supplier returns linked to bills, orders, receipts, or matching reviews.</p>
        </div>
        {canCreate ? (
          <Link href="/purchases/returns/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create return
          </Link>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{PURCHASE_RETURN_NON_EFFECT_TEXT}</div>
      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase returns.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase returns...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && returns.length === 0 ? <StatusMessage type="empty">No purchase returns found.</StatusMessage> : null}
      </div>

      {returns.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Return date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((purchaseReturn) => (
                <tr key={purchaseReturn.id}>
                  <td className="px-4 py-3 font-mono text-xs">{purchaseReturn.purchaseReturnNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{purchaseReturn.supplier?.displayName ?? purchaseReturn.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${purchaseReturnStatusBadgeClass(purchaseReturn.status)}`}>
                      {purchaseReturnStatusLabel(purchaseReturn.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(purchaseReturn.returnDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{purchaseReturnSourceLabel(purchaseReturn)}</td>
                  <td className="px-4 py-3 text-steel">{purchaseReturn.reason ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{purchaseReturn.lineCount ?? purchaseReturn.lines?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link href={`/purchases/returns/${purchaseReturn.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      View
                    </Link>
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
