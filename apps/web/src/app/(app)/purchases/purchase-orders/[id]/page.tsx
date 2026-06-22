"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { PurchaseMatchingPanel } from "@/components/purchases/purchase-matching-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  hasRemainingInventoryQuantity,
  inventoryProgressStatusBadgeClass,
  inventoryProgressStatusLabel,
} from "@/lib/inventory";
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
import { safeReturnToFromSearch } from "@/lib/parties";
import type { PurchaseBill, PurchaseMatchingSummary, PurchaseOrder, PurchaseReceivingStatus } from "@/lib/types";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [receivingStatus, setReceivingStatus] = useState<PurchaseReceivingStatus | null>(null);
  const [matchingSummary, setMatchingSummary] = useState<PurchaseMatchingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateOrder = can(PERMISSIONS.purchaseOrders.update);
  const canApproveOrder = can(PERMISSIONS.purchaseOrders.approve);
  const canVoidOrder = can(PERMISSIONS.purchaseOrders.void);
  const canConvertOrder = can(PERMISSIONS.purchaseOrders.convertToBill);
  const canCreateReceipt = can(PERMISSIONS.purchaseReceiving.create);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const orderDetailHref = `/purchases/purchase-orders/${params.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

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
      apiRequest<PurchaseMatchingSummary>(`/purchase-matching/purchase-orders/${params.id}`).catch(() => null),
    ])
      .then(([result, statusResult, matchingResult]) => {
        if (!cancelled) {
          setOrder(result);
          setReceivingStatus(statusResult);
          setMatchingSummary(matchingResult);
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title={order ? order.purchaseOrderNumber : "Purchase order"}
        description="Supplier order detail, PDF download, receiving progress, and conversion to purchase bill."
        badge={order ? <LedgerStatusBadge tone={purchaseOrderStatusTone(order.status)}>{purchaseOrderStatusLabel(order.status)}</LedgerStatusBadge> : undefined}
        actions={
          <LedgerActionBar className="items-start sm:items-center">
            <LedgerButton href={returnTo || "/purchases/purchase-orders"}>
              Back
            </LedgerButton>
            {order && canEditPurchaseOrder(order.status) && canUpdateOrder ? (
              <LedgerButton href={`/purchases/purchase-orders/${order.id}/edit`}>
                Edit
              </LedgerButton>
            ) : null}
            {order && canDownloadGeneratedDocuments ? (
              <LedgerButton onClick={() => void downloadOrderPdf()} disabled={actionLoading}>
                Download PDF
              </LedgerButton>
            ) : null}
            {order && canApprovePurchaseOrder(order.status) && canApproveOrder ? (
              <LedgerButton onClick={() => void runAction("approve")} disabled={actionLoading} variant="primary">
                Approve
              </LedgerButton>
            ) : null}
            {order && canMarkPurchaseOrderSent(order.status) && canApproveOrder ? (
              <LedgerButton onClick={() => void runAction("mark-sent")} disabled={actionLoading}>
                Mark sent
              </LedgerButton>
            ) : null}
            {order && canConvertPurchaseOrderToBill(order.status) && canConvertOrder ? (
              <LedgerButton onClick={() => void convertToBill()} disabled={actionLoading} variant="primary">
                Convert to bill
              </LedgerButton>
            ) : null}
            {order && receivingStatus && canCreateReceipt && hasReceiptRemaining(receivingStatus) ? (
              <LedgerButton href={`/inventory/purchase-receipts/new?sourceType=purchaseOrder&purchaseOrderId=${order.id}&returnTo=${encodeURIComponent(orderDetailHref)}`} variant="primary">
                Receive stock
              </LedgerButton>
            ) : null}
            {order && canClosePurchaseOrder(order.status) && canUpdateOrder ? (
              <LedgerButton onClick={() => void runAction("close")} disabled={actionLoading}>
                Close
              </LedgerButton>
            ) : null}
            {order && canVoidPurchaseOrder(order.status) && canVoidOrder ? (
              <LedgerButton onClick={() => void runAction("void")} disabled={actionLoading} variant="danger">
                Void
              </LedgerButton>
            ) : null}
            {order && canEditPurchaseOrder(order.status) && canUpdateOrder ? (
              <LedgerButton onClick={() => void deleteOrder()} disabled={actionLoading} variant="danger">
                Delete
              </LedgerButton>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="info">
          Purchase orders are non-posting supplier commitments until an explicit conversion, receipt, or lifecycle action is run.
        </LedgerSummaryBand>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase orders.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading purchase order" description="Fetching supplier order, receiving status, and matching summary." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {order ? (
          <>
            <AttachmentPanel linkedEntityType="PURCHASE_ORDER" linkedEntityId={order.id} />

          <LedgerSection title="Order details" description="Supplier order state, conversion, and date context.">
            <LedgerMetadataRow
              items={[
                { label: "Supplier", value: order.supplier?.displayName ?? order.supplier?.name ?? "-" },
                { label: "Status", value: purchaseOrderStatusLabel(order.status) },
                { label: "Order date", value: <LedgerDate>{formatOptionalDate(order.orderDate, "-")}</LedgerDate> },
                { label: "Expected delivery", value: <LedgerDate>{formatOptionalDate(order.expectedDeliveryDate, "-")}</LedgerDate> },
                { label: "Branch", value: order.branch?.displayName ?? order.branch?.name ?? "-" },
                { label: "Total", value: <LedgerMoney>{formatMoneyAmount(order.total, order.currency)}</LedgerMoney> },
                {
                  label: "Converted bill",
                  value: order.convertedBill ? (
                    <Link href={`/purchases/bills/${order.convertedBill.id}${orderDetailHref ? `?returnTo=${encodeURIComponent(orderDetailHref)}` : ""}`} className="font-medium text-palm hover:underline">
                      {order.convertedBill.billNumber} ({order.convertedBill.status})
                    </Link>
                  ) : "-",
                },
                { label: "Approved", value: <LedgerDate>{formatOptionalDate(order.approvedAt, "-")}</LedgerDate> },
                { label: "Sent", value: <LedgerDate>{formatOptionalDate(order.sentAt, "-")}</LedgerDate> },
              ]}
            />
          </LedgerSection>

          {receivingStatus ? <ReceivingStatusPanel status={receivingStatus} /> : null}
          {matchingSummary ? <PurchaseMatchingPanel summary={matchingSummary} /> : null}

          <LedgerSection title="Order line items" description="Line details used for supplier review and later bill conversion." className="p-0">
            <LedgerDataTable minWidth="920px" className="rounded-t-none border-0 shadow-none">
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
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.unitPrice, order.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.discountAmount, order.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.taxAmount, order.currency)}</LedgerMoney></td>
                    <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(line.lineTotal, order.currency)}</LedgerMoney></td>
                  </tr>
                ))}
              </tbody>
            </LedgerDataTable>
          </LedgerSection>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <LedgerPanel>
              <h2 className="text-base font-semibold text-ink">Totals</h2>
              <div className="mt-4 space-y-2 text-sm">
                <TotalRow label="Subtotal" value={formatMoneyAmount(order.subtotal, order.currency)} />
                <TotalRow label="Discount" value={formatMoneyAmount(order.discountTotal, order.currency)} />
                <TotalRow label="Taxable" value={formatMoneyAmount(order.taxableTotal, order.currency)} />
                <TotalRow label="VAT / Tax" value={formatMoneyAmount(order.taxTotal, order.currency)} />
                <TotalRow label="Total" value={formatMoneyAmount(order.total, order.currency)} strong />
              </div>
            </LedgerPanel>
            <LedgerPanel>
              <h2 className="text-base font-semibold text-ink">Notes and terms</h2>
              <div className="mt-4 space-y-4 text-sm text-steel">
                <p>{order.notes || "No notes."}</p>
                <p>{order.terms || "No terms."}</p>
              </div>
            </LedgerPanel>
          </div>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function ReceivingStatusPanel({ status }: { status: PurchaseReceivingStatus }) {
  return (
    <LedgerPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Receiving status</h2>
          <p className="mt-1 text-sm text-steel">Operational stock receipt progress for inventory-tracked lines.</p>
        </div>
        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${inventoryProgressStatusBadgeClass(status.status)}`}>
          {inventoryProgressStatusLabel(status.status)}
        </span>
      </div>
      <div className="mt-4">
        <LedgerDataTable minWidth="640px">
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
        </LedgerDataTable>
      </div>
    </LedgerPanel>
  );
}

function hasReceiptRemaining(status: PurchaseReceivingStatus): boolean {
  return status.lines.some((line) => line.inventoryTracking && hasRemainingInventoryQuantity(line.remainingQuantity));
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{label}</span>
      <LedgerMoney>{value}</LedgerMoney>
    </div>
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
