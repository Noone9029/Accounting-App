"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
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
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Purchase orders"
        description="Non-posting supplier orders and conversion to draft bills."
        actions={
          canCreateOrder ? (
            <LedgerActionBar>
              <LedgerButton href="/purchases/purchase-orders/new" variant="primary">
                Create PO
              </LedgerButton>
            </LedgerActionBar>
          ) : undefined
        }
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="info">
          Purchase orders stay operational until converted. They do not post AP, move inventory, send supplier payments, or file tax authority submissions by themselves.
        </LedgerSummaryBand>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase orders.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading purchase orders...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && orders.length === 0 ? (
          <LedgerEmptyState
            title="No purchase orders found"
            description="Create a non-posting supplier order before conversion to a draft bill."
            action={canCreateOrder ? <LedgerButton href="/purchases/purchase-orders/new" variant="primary">Create PO</LedgerButton> : null}
          />
        ) : null}

        {orders.length > 0 ? (
          <LedgerDataTable minWidth="1060px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(order.orderDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(order.expectedDeliveryDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerStatusBadge tone={purchaseOrderStatusTone(order.status)}>{purchaseOrderStatusLabel(order.status)}</LedgerStatusBadge></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(order.total, order.currency)}</LedgerMoney></td>
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
                    <LedgerButton href={`/purchases/purchase-orders/${order.id}`} size="sm">
                      View
                    </LedgerButton>
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

function purchaseOrderStatusTone(status: PurchaseOrder["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "APPROVED":
    case "SENT":
      return "success";
    case "PARTIALLY_BILLED":
      return "warning";
    case "VOIDED":
      return "danger";
    case "CLOSED":
      return "neutral";
    default:
      return "neutral";
  }
}
