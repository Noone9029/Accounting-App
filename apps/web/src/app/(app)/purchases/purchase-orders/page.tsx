"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import { purchaseOrderStatusLabel } from "@/lib/purchase-orders";
import type { PurchaseOrder } from "@/lib/types";

export default function PurchaseOrdersPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreateOrder = can(PERMISSIONS.purchaseOrders.create);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseOrder[]>("/purchase-orders")
      .then((result) => {
        if (!cancelled) {
          setOrders(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load purchase orders."));
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
  }, [organizationId, tc]);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Purchase orders")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Non-posting supplier orders and conversion to draft bills.")}</p>
          <p className="mt-1 text-sm text-steel">{tc("Purchase orders do not post AP, move inventory, send supplier payments, or file tax authority submissions.")}</p>
        </div>
        {canCreateOrder ? (
          <Link href="/purchases/purchase-orders/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Create PO")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load purchase orders.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading purchase orders...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && orders.length === 0 ? <StatusMessage type="empty">{tc("No purchase orders found.")}</StatusMessage> : null}
      </div>

      {orders.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Supplier")}</th>
                <th className="px-4 py-3">{tc("Order date")}</th>
                <th className="px-4 py-3">{tc("Expected delivery")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Converted bill")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{order.purchaseOrderNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{order.supplier?.displayName ?? order.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(order.orderDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(order.expectedDeliveryDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{tc(purchaseOrderStatusLabel(order.status))}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(order.total, order.currency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {order.convertedBill ? (
                      <Link href={`/purchases/bills/${order.convertedBill.id}`} className="text-palm hover:underline">
                        <bdi dir="ltr">{order.convertedBill.billNumber}</bdi>
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/purchases/purchase-orders/${order.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      {tc("View")}
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
