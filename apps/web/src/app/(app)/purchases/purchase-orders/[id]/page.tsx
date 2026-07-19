"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { CustomerDocumentEmailDelivery } from "@/components/email/customer-document-email-delivery";
import { PurchaseMatchingPanel } from "@/components/purchases/purchase-matching-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import {
  formatInventoryQuantity,
  hasRemainingInventoryQuantity,
  inventoryProgressStatusBadgeClass,
  inventoryProgressStatusLabel,
} from "@/lib/inventory";
import { downloadPdf, purchaseOrderPdfPath } from "@/lib/pdf-download";
import { safeReturnToFromSearch } from "@/lib/parties";
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
import type { PurchaseBill, PurchaseMatchingSummary, PurchaseOrder, PurchaseReceivingStatus } from "@/lib/types";

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [receivingStatus, setReceivingStatus] = useState<PurchaseReceivingStatus | null>(null);
  const [matchingSummary, setMatchingSummary] = useState<PurchaseMatchingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<"close" | "void" | "delete" | null>(null);
  const canUpdateOrder = can(PERMISSIONS.purchaseOrders.update);
  const canApproveOrder = can(PERMISSIONS.purchaseOrders.approve);
  const canVoidOrder = can(PERMISSIONS.purchaseOrders.void);
  const canConvertOrder = can(PERMISSIONS.purchaseOrders.convertToBill);
  const canCreateReceipt = can(PERMISSIONS.purchaseReceiving.create);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const canSendPurchaseOrder = can(PERMISSIONS.purchaseOrders.send);
  const returnTo = safeReturnToFromSearch(searchParams.toString() ? `?${searchParams.toString()}` : "");
  const orderDetailHref = order ? `/purchases/purchase-orders/${order.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` : "";

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load purchase order."));
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
  }, [organizationId, params.id, tc]);

  async function runAction(action: "approve" | "mark-sent" | "close" | "void"): Promise<boolean> {
    if (!order) {
      return false;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseOrder>(`/purchase-orders/${order.id}/${action}`, { method: "POST" });
      setOrder(updated);
      setSuccess(tc("Purchase order {number} is now {status}.", { number: updated.purchaseOrderNumber, status: tc(purchaseOrderStatusLabel(updated.status)) }));
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to update purchase order."));
      return false;
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
      setError(convertError instanceof Error ? convertError.message : tc("Unable to convert purchase order."));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteOrder(): Promise<boolean> {
    if (!order) {
      return false;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/purchase-orders/${order.id}`, { method: "DELETE" });
      router.push("/purchases/purchase-orders");
      return true;
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tc("Unable to delete purchase order."));
      return false;
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
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download purchase order PDF."));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{order ? <bdi dir="ltr">{order.purchaseOrderNumber}</bdi> : tc("Purchase order")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Supplier order detail, PDF download, and conversion to purchase bill.")}</p>
          <p className="mt-1 text-sm text-steel">{tc("Purchase orders remain non-posting supplier commitments until an explicit conversion, receipt, or lifecycle action is run.")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={returnTo || "/purchases/purchase-orders"} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {order && canEditPurchaseOrder(order.status) && canUpdateOrder ? (
            <Link href={`/purchases/purchase-orders/${order.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
          {order && canDownloadGeneratedDocuments ? (
            <button type="button" onClick={() => void downloadOrderPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download PDF")}
            </button>
          ) : null}
          {order && canApprovePurchaseOrder(order.status) && canApproveOrder ? (
            <button type="button" onClick={() => void runAction("approve")} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {tc("Approve")}
            </button>
          ) : null}
          {order && canMarkPurchaseOrderSent(order.status) && canApproveOrder ? (
            <button type="button" onClick={() => void runAction("mark-sent")} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Mark sent")}
            </button>
          ) : null}
          {order && canConvertPurchaseOrderToBill(order.status) && canConvertOrder ? (
            <button type="button" onClick={() => void convertToBill()} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {tc("Convert to bill")}
            </button>
          ) : null}
          {order && receivingStatus && canCreateReceipt && hasReceiptRemaining(receivingStatus) ? (
            <Link href={`/inventory/purchase-receipts/new?sourceType=purchaseOrder&purchaseOrderId=${order.id}&returnTo=${encodeURIComponent(orderDetailHref)}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
              {tc("Receive stock")}
            </Link>
          ) : null}
          {order && canClosePurchaseOrder(order.status) && canUpdateOrder ? (
            <button type="button" onClick={() => setPendingConfirmation("close")} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Close")}
            </button>
          ) : null}
          {order && canVoidPurchaseOrder(order.status) && canVoidOrder ? (
            <button type="button" onClick={() => setPendingConfirmation("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
          {order && canEditPurchaseOrder(order.status) && canUpdateOrder ? (
            <button type="button" onClick={() => setPendingConfirmation("delete")} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Delete")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load purchase orders.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading purchase order...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {order ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="PURCHASE_ORDER" linkedEntityId={order.id} />

          <CustomerDocumentEmailDelivery
            sourceId={order.id}
            organizationId={organizationId}
            canSend={canSendPurchaseOrder}
            eligible={order.status === "APPROVED" || order.status === "SENT"}
            sourceLabel="purchase order"
            documentFilename={`purchase-order-${order.purchaseOrderNumber}.pdf`}
            recipientEmail={order.supplier?.email ?? ""}
            defaultSubject={`Purchase order ${order.purchaseOrderNumber}`}
            defaultMessage="Please find the approved purchase order attached for your records."
            ineligibleMessage="Only approved or sent purchase orders can be queued for email delivery."
            noPermissionMessage="You do not have permission to send purchase orders by email."
            successMessage="Purchase order queued for email delivery."
            emptyHistoryMessage="No purchase order email deliveries queued yet."
            endpoint={`/purchase-orders/${order.id}/email-deliveries`}
          />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Supplier")} value={order.supplier?.displayName ?? order.supplier?.name ?? "-"} />
              <Summary label={tc("Status")} value={tc(purchaseOrderStatusLabel(order.status))} />
              <Summary label={tc("Order date")} value={formatAppDate(order.orderDate, locale, "-")} />
              <Summary label={tc("Expected delivery")} value={formatAppDate(order.expectedDeliveryDate, locale, "-")} />
              <Summary label={tc("Branch")} value={order.branch?.displayName ?? order.branch?.name ?? "-"} />
              <Summary label={tc("Total")} value={formatAppMoney(order.total, order.currency, locale)} />
              <Summary
                label={tc("Converted bill")}
                value={order.convertedBill ? <><bdi dir="ltr">{order.convertedBill.billNumber}</bdi> ({tc(order.convertedBill.status)})</> : "-"}
                href={order.convertedBill ? `/purchases/bills/${order.convertedBill.id}${orderDetailHref ? `?returnTo=${encodeURIComponent(orderDetailHref)}` : ""}` : undefined}
              />
              <Summary label={tc("Approved")} value={formatAppDate(order.approvedAt, locale, "-")} />
              <Summary label={tc("Sent")} value={formatAppDate(order.sentAt, locale, "-")} />
            </div>
          </div>

          {receivingStatus ? <ReceivingStatusPanel status={receivingStatus} /> : null}
          {matchingSummary ? <PurchaseMatchingPanel summary={matchingSummary} /> : null}

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[920px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Account")}</th>
                  <th className="px-4 py-3">{tc("Qty")}</th>
                  <th className="px-4 py-3">{tc("Unit")}</th>
                  <th className="px-4 py-3">{tc("Discount")}</th>
                  <th className="px-4 py-3">{tc("Tax")}</th>
                  <th className="px-4 py-3">{tc("Total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <><bdi dir="ltr">{line.account.code}</bdi> {line.account.name}</> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, order.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.discountAmount, order.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.taxAmount, order.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.lineTotal, order.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Totals")}</h2>
              <div className="mt-4 space-y-2 text-sm">
                <TotalRow label={tc("Subtotal")} value={formatAppMoney(order.subtotal, order.currency, locale)} />
                <TotalRow label={tc("Discount")} value={formatAppMoney(order.discountTotal, order.currency, locale)} />
                <TotalRow label={tc("Taxable")} value={formatAppMoney(order.taxableTotal, order.currency, locale)} />
                <TotalRow label={tc("VAT / Tax")} value={formatAppMoney(order.taxTotal, order.currency, locale)} />
                <TotalRow label={tc("Total")} value={formatAppMoney(order.total, order.currency, locale)} strong />
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Notes and terms")}</h2>
              <div className="mt-4 space-y-4 text-sm text-steel">
                <p>{order.notes || tc("No notes.")}</p>
                <p>{order.terms || tc("No terms.")}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <LedgerActionDialog
        open={Boolean(pendingConfirmation && order)}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setPendingConfirmation(null);
        }}
        tone="danger"
        title={pendingConfirmation === "delete" ? tc("Delete draft purchase order") : pendingConfirmation === "void" ? tc("Void purchase order") : tc("Close purchase order")}
        description={order ? pendingConfirmation === "delete" ? tc("Delete draft purchase order {number}?", { number: order.purchaseOrderNumber }) : tc("{action} purchase order {number}?", { action: tc(pendingConfirmation === "void" ? "Void" : "Close"), number: order.purchaseOrderNumber }) : ""}
        confirmLabel={pendingConfirmation === "delete" ? tc("Delete") : pendingConfirmation === "void" ? tc("Void") : tc("Close")}
        busy={actionLoading}
        onConfirm={async () => {
          const succeeded = pendingConfirmation === "delete" ? await deleteOrder() : pendingConfirmation ? await runAction(pendingConfirmation) : false;
          if (succeeded) setPendingConfirmation(null);
        }}
      />
    </section>
  );
}

function Summary({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
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
  const { tc } = useAppLocale();

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Receiving status")}</h2>
          <p className="mt-1 text-sm text-steel">{tc("Operational stock receipt progress for inventory-tracked lines.")}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryProgressStatusBadgeClass(status.status)}`}>
          {tc(inventoryProgressStatusLabel(status.status))}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">{tc("Item")}</th>
              <th className="px-3 py-2 text-end">{tc("Ordered")}</th>
              <th className="px-3 py-2 text-end">{tc("Received")}</th>
              <th className="px-3 py-2 text-end">{tc("Remaining")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-3 py-2">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatInventoryQuantity(line.orderedQuantity ?? line.sourceQuantity)}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatInventoryQuantity(line.receivedQuantity)}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatInventoryQuantity(line.remainingQuantity)}</td>
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
