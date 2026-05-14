"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  hasRemainingInventoryQuantity,
  inventoryClearingReportUrl,
  inventoryClearingStatusBadgeClass,
  inventoryClearingStatusLabel,
  inventoryProgressStatusBadgeClass,
  inventoryProgressStatusLabel,
  receiptMatchingStatusBadgeClass,
  receiptMatchingStatusLabel,
} from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { downloadPdf, purchaseBillPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { purchaseBillAccountingPreviewLineDisplay, purchaseBillInventoryPostingModeLabel } from "@/lib/purchase-bills";
import type {
  InventoryClearingReconciliationReport,
  PurchaseBill,
  PurchaseBillAccountingPreview,
  PurchaseBillReceiptMatchingStatus,
  PurchaseReceivingStatus,
} from "@/lib/types";

export default function PurchaseBillDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [bill, setBill] = useState<PurchaseBill | null>(null);
  const [receivingStatus, setReceivingStatus] = useState<PurchaseReceivingStatus | null>(null);
  const [matchingStatus, setMatchingStatus] = useState<PurchaseBillReceiptMatchingStatus | null>(null);
  const [accountingPreview, setAccountingPreview] = useState<PurchaseBillAccountingPreview | null>(null);
  const [clearingReport, setClearingReport] = useState<InventoryClearingReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateBill = can(PERMISSIONS.purchaseBills.update);
  const canFinalizeBill = can(PERMISSIONS.purchaseBills.finalize);
  const canVoidBill = can(PERMISSIONS.purchaseBills.void);
  const canCreateDebitNote = can(PERMISSIONS.purchaseDebitNotes.create);
  const canViewPurchaseOrders = can(PERMISSIONS.purchaseOrders.view);
  const canCreateReceipt = can(PERMISSIONS.purchaseReceiving.create);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<PurchaseBill>(`/purchase-bills/${params.id}`),
      apiRequest<PurchaseReceivingStatus>(`/purchase-bills/${params.id}/receiving-status`).catch(() => null),
      apiRequest<PurchaseBillReceiptMatchingStatus>(`/purchase-bills/${params.id}/receipt-matching-status`).catch(() => null),
      apiRequest<PurchaseBillAccountingPreview>(`/purchase-bills/${params.id}/accounting-preview`).catch(() => null),
      apiRequest<InventoryClearingReconciliationReport>(`/inventory/reports/clearing-reconciliation?purchaseBillId=${encodeURIComponent(params.id)}`).catch(() => null),
    ])
      .then(([result, statusResult, matchingResult, accountingPreviewResult, clearingReportResult]) => {
        if (!cancelled) {
          setBill(result);
          setReceivingStatus(statusResult);
          setMatchingStatus(matchingResult);
          setAccountingPreview(accountingPreviewResult);
          setClearingReport(clearingReportResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase bill.");
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

  async function runAction(action: "finalize" | "void") {
    if (!bill) {
      return;
    }

    if (action === "void" && !window.confirm(`Void purchase bill ${bill.billNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<PurchaseBill>(`/purchase-bills/${bill.id}/${action}`, { method: "POST" });
      setBill(updated);
      const preview = await apiRequest<PurchaseBillAccountingPreview>(`/purchase-bills/${bill.id}/accounting-preview`).catch(() => null);
      setAccountingPreview(preview);
      const clearing = await apiRequest<InventoryClearingReconciliationReport>(`/inventory/reports/clearing-reconciliation?purchaseBillId=${encodeURIComponent(bill.id)}`).catch(() => null);
      setClearingReport(clearing);
      setSuccess(action === "finalize" ? `Finalized bill ${updated.billNumber}.` : `Voided bill ${updated.billNumber}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action} purchase bill.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteBill() {
    if (!bill || !window.confirm(`Delete draft purchase bill ${bill.billNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/purchase-bills/${bill.id}`, { method: "DELETE" });
      router.push("/purchases/bills");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete purchase bill.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadBillPdf() {
    if (!bill) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(purchaseBillPdfPath(bill.id), `purchase-bill-${bill.billNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download purchase bill PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{bill ? bill.billNumber : "Purchase bill"}</h1>
          <p className="mt-1 text-sm text-steel">Supplier bill detail, AP posting, allocations, and PDF download.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/purchases/bills" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {bill?.status === "DRAFT" && canUpdateBill ? (
            <Link href={`/purchases/bills/${bill.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Edit
            </Link>
          ) : null}
          {bill?.supplierId ? (
            <Link href={`/contacts/${bill.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Supplier ledger
            </Link>
          ) : null}
          {bill?.supplierId && canCreateDebitNote ? (
            <Link
              href={`/purchases/debit-notes/new?billId=${encodeURIComponent(bill.id)}&supplierId=${encodeURIComponent(bill.supplierId)}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create debit note
            </Link>
          ) : null}
          {bill && receivingStatus && canCreateReceipt && hasReceiptRemaining(receivingStatus) ? (
            <Link href={`/inventory/purchase-receipts/new?sourceType=purchaseBill&purchaseBillId=${bill.id}`} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
              Receive stock
            </Link>
          ) : null}
          {bill ? (
            <button type="button" onClick={() => void downloadBillPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download PDF
            </button>
          ) : null}
          {bill?.status === "DRAFT" && canFinalizeBill ? (
            <button
              type="button"
              onClick={() => void runAction("finalize")}
              disabled={actionLoading || (accountingPreview !== null && !accountingPreview.canFinalize)}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Finalize
            </button>
          ) : null}
          {bill && bill.status !== "VOIDED" && canVoidBill ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
          {bill?.status === "DRAFT" && canUpdateBill ? (
            <button type="button" onClick={() => void deleteBill()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase bills.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase bill...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {bill ? (
        <div className="mt-5 space-y-5">
          <AttachmentPanel linkedEntityType="PURCHASE_BILL" linkedEntityId={bill.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={bill.supplier?.displayName ?? bill.supplier?.name ?? "-"} />
              <Summary label="Status" value={bill.status} />
              <Summary label="Bill date" value={formatOptionalDate(bill.billDate, "-")} />
              <Summary label="Due date" value={formatOptionalDate(bill.dueDate, "-")} />
              <Summary label="Branch" value={bill.branch?.displayName ?? bill.branch?.name ?? "-"} />
              <Summary
                label="Source PO"
                value={bill.purchaseOrder ? bill.purchaseOrder.purchaseOrderNumber : "-"}
                href={bill.purchaseOrder && canViewPurchaseOrders ? `/purchases/purchase-orders/${bill.purchaseOrder.id}` : undefined}
              />
              <Summary label="Total" value={formatMoneyAmount(bill.total, bill.currency)} />
              <Summary label="Balance due" value={formatMoneyAmount(bill.balanceDue, bill.currency)} />
              <Summary label="Inventory posting mode" value={purchaseBillInventoryPostingModeLabel(bill.inventoryPostingMode)} />
              <Summary label="Journal entry" value={bill.journalEntry ? `${bill.journalEntry.entryNumber} (${bill.journalEntry.id})` : "-"} />
              <Summary label="Reversal journal" value={bill.reversalJournalEntry ? `${bill.reversalJournalEntry.entryNumber} (${bill.reversalJournalEntry.id})` : "-"} />
            </div>
          </div>

          {receivingStatus ? <ReceivingStatusPanel status={receivingStatus} /> : null}
          {matchingStatus ? <ReceiptMatchingPanel status={matchingStatus} /> : null}
          {accountingPreview ? <AccountingPreviewPanel preview={accountingPreview} currency={bill.currency} /> : null}
          <ClearingReconciliationPanel bill={bill} report={clearingReport} />

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
                {bill.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? `${line.account.code} ${line.account.name}` : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.unitPrice, bill.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.discountAmount, bill.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.taxAmount, bill.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(line.lineTotal, bill.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Totals</h2>
              <div className="mt-4 space-y-2 text-sm">
                <TotalRow label="Subtotal" value={formatMoneyAmount(bill.subtotal, bill.currency)} />
                <TotalRow label="Discount" value={formatMoneyAmount(bill.discountTotal, bill.currency)} />
                <TotalRow label="Taxable" value={formatMoneyAmount(bill.taxableTotal, bill.currency)} />
                <TotalRow label="VAT / Tax" value={formatMoneyAmount(bill.taxTotal, bill.currency)} />
                <TotalRow label="Total" value={formatMoneyAmount(bill.total, bill.currency)} strong />
                <TotalRow label="Balance due" value={formatMoneyAmount(bill.balanceDue, bill.currency)} strong />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Supplier payment allocations</h2>
              {bill.paymentAllocations?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">Payment</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.paymentAllocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/supplier-payments/${allocation.paymentId}`} className="font-mono text-xs text-palm hover:underline">
                              {allocation.payment?.paymentNumber ?? allocation.paymentId}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-steel">{formatOptionalDate(allocation.payment?.paymentDate, "-")}</td>
                          <td className="px-3 py-2 text-steel">{allocation.payment?.status ?? "-"}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, bill.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">No supplier payments have been applied to this bill.</p>
              )}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Unapplied supplier payment applications</h2>
              {bill.supplierPaymentUnappliedAllocations?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">Payment</th>
                        <th className="px-3 py-2">Applied</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Reversed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.supplierPaymentUnappliedAllocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/supplier-payments/${allocation.paymentId}`} className="font-mono text-xs text-palm hover:underline">
                              {allocation.payment?.paymentNumber ?? allocation.paymentId}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, bill.currency)}</td>
                          <td className="px-3 py-2 text-steel">{allocation.reversedAt ? "Reversed" : "Active"}</td>
                          <td className="px-3 py-2 text-steel">{formatOptionalDate(allocation.reversedAt, "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">No unapplied supplier payment amounts have been applied to this bill.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Linked debit notes</h2>
              {bill.debitNotes?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">Debit note</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Total</th>
                        <th className="px-3 py-2">Unapplied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.debitNotes.map((debitNote) => (
                        <tr key={debitNote.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/debit-notes/${debitNote.id}`} className="font-mono text-xs text-palm hover:underline">
                              {debitNote.debitNoteNumber}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-steel">{debitNote.status}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatMoneyAmount(debitNote.total, bill.currency)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatMoneyAmount(debitNote.unappliedAmount, bill.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">No debit notes are linked to this bill.</p>
              )}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Debit note allocations</h2>
              {bill.debitNoteAllocations?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">Debit note</th>
                        <th className="px-3 py-2">Applied</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Reversed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.debitNoteAllocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/debit-notes/${allocation.debitNoteId}`} className="font-mono text-xs text-palm hover:underline">
                              {allocation.debitNote?.debitNoteNumber ?? allocation.debitNoteId}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, bill.currency)}</td>
                          <td className="px-3 py-2 text-steel">{allocation.reversedAt ? "Reversed" : "Active"}</td>
                          <td className="px-3 py-2 text-steel">{formatOptionalDate(allocation.reversedAt, "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">No debit note amounts have been applied to this bill.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReceiptMatchingPanel({ status }: { status: PurchaseBillReceiptMatchingStatus }) {
  const linkedReceipts = status.lines.flatMap((line) => line.receipts);
  const hasUnpostedClearingReceipts =
    status.bill.status === "FINALIZED" &&
    status.bill.inventoryPostingMode === "INVENTORY_CLEARING" &&
    linkedReceipts.some((receipt) => !receipt.inventoryAssetJournalEntryId);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Receipt matching</h2>
          <p className="mt-1 text-sm text-steel">Operational bill/receipt matching visibility; journal impact appears in clearing reconciliation after explicit posting.</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${receiptMatchingStatusBadgeClass(status.status)}`}>
          {receiptMatchingStatusLabel(status.status)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <Summary label="Receipt count" value={String(status.receiptCount)} />
        <Summary label="Receipt value" value={formatInventoryQuantity(status.receiptValue)} />
        <Summary label="Bill total" value={formatInventoryQuantity(status.billTotal)} />
      </div>
      {status.warnings.length > 0 ? (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <ul className="space-y-1">
            {status.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {hasUnpostedClearingReceipts ? (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Clearing-mode bill has linked receipts without inventory asset posting.
        </div>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">Line</th>
              <th className="px-3 py-2 text-right">Billed</th>
              <th className="px-3 py-2 text-right">Received</th>
              <th className="px-3 py-2 text-right">Remaining</th>
              <th className="px-3 py-2 text-right">Receipt value</th>
              <th className="px-3 py-2">Receipts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-3 py-2">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.description}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.billedQuantity ?? line.sourceQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.receivedQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.remainingQuantity)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.receivedValue)}</td>
                <td className="px-3 py-2 text-steel">
                  {line.receipts.length > 0
                    ? line.receipts.map((receipt) => (
                        <span key={receipt.id} className="mr-3 inline-flex flex-col">
                          <Link href={`/inventory/purchase-receipts/${receipt.id}`} className="text-palm hover:underline">
                            {receipt.receiptNumber}
                          </Link>
                          <span className="text-xs text-steel">{receiptAssetStatusLabel(receipt)}</span>
                        </span>
                      ))
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClearingReconciliationPanel({ bill, report }: { bill: PurchaseBill; report: InventoryClearingReconciliationReport | null }) {
  if (bill.inventoryPostingMode !== "INVENTORY_CLEARING") {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Clearing reconciliation</h2>
        <p className="mt-2 text-sm text-steel">This bill uses direct expense/asset posting and is excluded from inventory clearing reconciliation.</p>
      </div>
    );
  }

  const row = report?.rows[0] ?? null;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Clearing reconciliation</h2>
          <p className="mt-1 text-sm text-steel">Inventory Clearing debit from this bill compared with active receipt asset postings.</p>
        </div>
        {row ? (
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryClearingStatusBadgeClass(row.status)}`}>
            {inventoryClearingStatusLabel(row.status)}
          </span>
        ) : null}
      </div>

      {row ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
            <Summary label="Bill clearing debit" value={formatMoneyAmount(row.billClearingDebit, bill.currency)} />
            <Summary label="Receipt clearing credit" value={formatMoneyAmount(row.receiptClearingCredit, bill.currency)} />
            <Summary label="Net difference" value={formatMoneyAmount(row.netClearingDifference, bill.currency)} />
            <Summary label="Linked receipts" value={String(row.receipts.length)} />
          </div>
          {row.warnings.length > 0 ? (
            <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <ul className="space-y-1">
                {row.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href={inventoryClearingReportUrl({ purchaseBillId: bill.id })} className="font-medium text-palm hover:underline">
              Open clearing report
            </Link>
            <Link href={`/inventory/reports/clearing-variance?purchaseBillId=${encodeURIComponent(bill.id)}`} className="font-medium text-palm hover:underline">
              Open variance report
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-steel">No clearing reconciliation row is available for this bill yet.</p>
      )}
    </div>
  );
}

function receiptAssetStatusLabel(receipt: { inventoryAssetJournalEntryId?: string | null; inventoryAssetReversalJournalEntryId?: string | null }) {
  if (receipt.inventoryAssetReversalJournalEntryId) return "Asset reversed";
  if (receipt.inventoryAssetJournalEntryId) return "Asset posted";
  return "Asset not posted";
}

function AccountingPreviewPanel({ preview, currency }: { preview: PurchaseBillAccountingPreview; currency: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Accounting preview</h2>
          <p className="mt-1 text-sm text-steel">Read-only purchase bill posting preview. No journal is created from this panel.</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${preview.canFinalize ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {preview.canFinalize ? "Finalizable" : "Preview only"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <Summary label="Mode" value={purchaseBillInventoryPostingModeLabel(preview.inventoryPostingMode)} />
        <Summary label="Tracked lines" value={String(preview.inventoryTrackedLineCount)} />
        <Summary label="Direct lines" value={String(preview.directLineCount)} />
        <Summary label="Clearing account" value={preview.clearingAccount ? `${preview.clearingAccount.code} ${preview.clearingAccount.name}` : "Not mapped"} />
        <Summary label="VAT account" value={preview.vatReceivableAccount ? `${preview.vatReceivableAccount.code} ${preview.vatReceivableAccount.name}` : "Not mapped"} />
        <Summary label="AP account" value={preview.accountsPayableAccount ? `${preview.accountsPayableAccount.code} ${preview.accountsPayableAccount.name}` : "Not mapped"} />
        <Summary label="Total debit" value={formatMoneyAmount(preview.journal.totalDebit, currency)} />
        <Summary label="Total credit" value={formatMoneyAmount(preview.journal.totalCredit, currency)} />
      </div>

      {preview.warnings.length > 0 ? (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <ul className="space-y-1">
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.blockingReasons.length > 0 ? (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-steel">
          <p className="font-medium text-ink">Blocking reasons</p>
          <ul className="mt-2 space-y-1">
            {preview.blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">Line</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.journal.lines.map((line) => (
              <tr key={`${line.lineNumber}-${line.side}-${line.accountId ?? line.accountName}`}>
                <td className="px-3 py-2 font-mono text-xs">{line.lineNumber}</td>
                <td className="px-3 py-2">{line.side === "DEBIT" ? "Dr" : "Cr"}</td>
                <td className="px-3 py-2">{line.accountCode ? `${line.accountCode} ${line.accountName}` : line.accountName}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatMoneyAmount(line.amount, currency)}</td>
                <td className="px-3 py-2 text-steel">{line.description || purchaseBillAccountingPreviewLineDisplay(line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
          <p className="mt-1 text-sm text-steel">Operational stock receipt progress for inventory-tracked bill lines.</p>
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
              <th className="px-3 py-2 text-right">Billed</th>
              <th className="px-3 py-2 text-right">Received</th>
              <th className="px-3 py-2 text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-3 py-2">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.billedQuantity ?? line.sourceQuantity)}</td>
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
