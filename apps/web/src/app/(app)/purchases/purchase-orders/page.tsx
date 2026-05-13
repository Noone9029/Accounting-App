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
import { purchaseOrderStatusLabel } from "@/lib/purchase-orders";
import type { PurchaseOrder } from "@/lib/types";

export default function PurchaseOrdersPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase orders.");
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
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Purchase orders</h1>
          <p className="mt-1 text-sm text-steel">Non-posting supplier orders and conversion to draft bills.</p>
        </div>
        {canCreateOrder ? (
          <Link href="/purchases/purchase-orders/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create PO
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase orders.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase orders...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && orders.length === 0 ? <StatusMessage type="empty">No purchase orders found.</StatusMessage> : null}
      </div>

      {orders.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Order date</th>
                <th className="px-4 py-3">Expected delivery</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Converted bill</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono text-xs">{order.purchaseOrderNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{order.supplier?.displayName ?? order.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(order.orderDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(order.expectedDeliveryDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{purchaseOrderStatusLabel(order.status)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(order.total, order.currency)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {order.convertedBill ? (
                      <Link href={`/purchases/bills/${order.convertedBill.id}`} className="text-palm hover:underline">
                        {order.convertedBill.billNumber}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/purchases/purchase-orders/${order.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
