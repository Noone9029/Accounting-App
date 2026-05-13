"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, hasRemainingInventoryQuantity, inventoryProgressStatusBadgeClass, inventoryProgressStatusLabel } from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, purchaseOrderPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  canApprovePurchaseOrder,
  canClosePurchaseOrder,
  canConvertPurchaseOrderToBill,
  canEditPurchaseOrder,
  canMarkPurchaseOrderSent,
  canVoidPurchaseOrder,
  purchaseOrderStatusLabel,
} from "@/lib/purchase-orders";
import type { PurchaseBill, PurchaseOrder, PurchaseReceivingStatus } from "@/lib/types";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [receivingStatus, setReceivingStatus] = useState<PurchaseReceivingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateOrder = can(PERMISSIONS.purchaseOrders.update);
  const canApproveOrder = can(PERMISSIONS.purchaseOrders.approve);
  const canVoidOrder = can(PERMISSIONS.purchaseOrders.void);
  const canConvertOrder = can(PERMISSIONS.purchaseOrders.convertToBill);
  const canCreateReceipt = can(PERMISSIONS.purchaseReceiving.create);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<PurchaseOrder>(`/purchase-orders/${params.id}`),
      apiRequest<PurchaseReceivingStatus>(`/purchase-orders/${params.id}/receiving-status`).catch(() => null),
    ])
      .then(([result, statusResult]) => {
        if (!cancelled) {
          setOrder(result);
          setReceivingStatus(statusResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase order.");
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
  }, [organizationId, params.id]);

  async function runAction(action: "approve" | "mark-sent" | "close" | "void") {
    if (!order) {
      return;
    }

    if ((action === "void" || action === "close") && !window.confirm(`${action === "void" ? "Void" : "Close"} purchase order ${order.purchaseOrderNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseOrder>(`/purchase-orders/${order.id}/${action}`, { method: "POST" });
      setOrder(updated);
      setSuccess(`Purchase order ${updated.purchaseOrderNumber} is now ${purchaseOrderStatusLabel(updated.status)}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update purchase order.");
    } finally {
      setActionLoading(false);
    }
  }

  async function convertToBill() {
    if (!order) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const bill = await apiRequest<PurchaseBill>(`/purchase-orders/${order.id}/convert-to-bill`, { method: "POST" });
      router.push(`/purchases/bills/${bill.id}`);
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Unable to convert purchase order.");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteOrder() {
    if (!order || !window.confirm(`Delete draft purchase order ${order.purchaseOrderNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/purchase-orders/${order.id}`, { method: "DELETE" });
      router.push("/purchases/purchase-orders");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete purchase order.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadOrderPdf() {
    if (!order) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(purchaseOrderPdfPath(order.id), `purchase-order-${order.purchaseOrderNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download purchase order PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{order ? order.purchaseOrderNumber : "Purchase order"}</h1>
          <p className="mt-1 text-sm text-steel">Supplier order detail, PDF download, and conversion to purchase bill.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/purchases/purchase-orders" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {order && canEditPurchaseOrder(order.status) && canUpdateOrder ? (
            <Link href={`/purchases/purchase-orders/${order.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {order ? (
            <button type="button" onClick={() => void downloadOrderPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {order && canApprovePurchaseOrder(order.status) && canApproveOrder ? (
            <button type="button" onClick={() => void runAction("approve")} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Approve
            </button>
          ) : null}
          {order && canMarkPurchaseOrderSent(order.status) && canApproveOrder ? (
            <button type="button" onClick={() => void runAction("mark-sent")} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Mark sent
            </button>
          ) : null}
          {order && canConvertPurchaseOrderToBill(order.status) && canConvertOrder ? (
            <button type="button" onClick={() => void convertToBill()} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Convert to bill
            </button>
          ) : null}
          {order && receivingStatus && canCreateReceipt && hasReceiptRemaining(receivingStatus) ? (
            <Link href={`/inventory/purchase-receipts/new?sourceType=purchaseOrder&purchaseOrderId=${order.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
              Receive stock
            </Link>
          ) : null}
          {order && canClosePurchaseOrder(order.status) && canUpdateOrder ? (
            <button type="button" onClick={() => void runAction("close")} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Close
            </button>
          ) : null}
          {order && canVoidPurchaseOrder(order.status) && canVoidOrder ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {order && canEditPurchaseOrder(order.status) && canUpdateOrder ? (
            <button type="button" onClick={() => void deleteOrder()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase orders.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase order...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {order ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={order.supplier?.displayName ?? order.supplier?.name ?? "-"} />
              <Summary label="Status" value={purchaseOrderStatusLabel(order.status)} />
              <Summary label="Order date" value={formatOptionalDate(order.orderDate, "-")} />
              <Summary label="Expected delivery" value={formatOptionalDate(order.expectedDeliveryDate, "-")} />
              <Summary label="Branch" value={order.branch?.displayName ?? order.branch?.name ?? "-"} />
              <Summary label="Total" value={formatMoneyAmount(order.total, order.currency)} />
              <Summary
                label="Converted bill"
                value={order.convertedBill ? `${order.convertedBill.billNumber} (${order.convertedBill.status})` : "-"}
                href={order.convertedBill ? `/purchases/bills/${order.convertedBill.id}` : undefined}
              />
              <Summary label="Approved" value={formatOptionalDate(order.approvedAt, "-")} />
              <Summary label="Sent" value={formatOptionalDate(order.sentAt, "-")} />
            </div>
          </div>

          {receivingStatus ? <ReceivingStatusPanel status={receivingStatus} /> : null}

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.unitPrice, order.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.discountAmount, order.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxAmount, order.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineTotal, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Totals</h2>
              <div className="mt-4 space-y-2 text-sm">
                <TotalRow label="Subtotal" value={formatMoneyAmount(order.subtotal, order.currency)} />
                <TotalRow label="Discount" value={formatMoneyAmount(order.discountTotal, order.currency)} />
                <TotalRow label="Taxable" value={formatMoneyAmount(order.taxableTotal, order.currency)} />
                <TotalRow label="VAT / Tax" value={formatMoneyAmount(order.taxTotal, order.currency)} />
                <TotalRow label="Total" value={formatMoneyAmount(order.total, order.currency)} strong />
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Notes and terms</h2>
              <div className="mt-4 space-y-4 text-sm text-steel">
                <p>{order.notes || "No notes."}</p>
                <p>{order.terms || "No terms."}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Summary({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      {href ? (
        <Link href={href} className="mt-1 block font-medium text-palm hover:underline">
          {value}
        </Link>
      ) : (
        <div className="mt-1 font-medium text-ink">{value}</div>
      )}
    </div>
  );
}

function ReceivingStatusPanel({ status }: { status: PurchaseReceivingStatus }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Receiving status</h2>
          <p className="mt-1 text-sm text-steel">Operational stock receipt progress for inventory-tracked lines.</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryProgressStatusBadgeClass(status.status)}`}>
          {inventoryProgressStatusLabel(status.status)}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Ordered</th>
              <th className="px-3 py-2 text-right">Received</th>
              <th className="px-3 py-2 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-3 py-2">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.orderedQuantity ?? line.sourceQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.receivedQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.remainingQuantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function hasReceiptRemaining(status: PurchaseReceivingStatus): boolean {
  return status.lines.some((line) => line.inventoryTracking && hasRemainingInventoryQuantity(line.remainingQuantity));
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
