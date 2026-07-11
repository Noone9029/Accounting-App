"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { ValuationVariancePreviewPanel } from "@/components/inventory/valuation-variance-preview-panel";
import { PurchaseMatchingPanel } from "@/components/purchases/purchase-matching-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { documentFxPostingIsReady, documentFxRateEvidence, INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE, isForeignCurrencyDocument, transactionDocumentDisplayTotals, transactionLineDisplayAmounts } from "@/lib/document-fx";
import {
  formatInventoryQuantity,
  hasRemainingInventoryQuantity,
  inventoryClearingReportUrl,
  inventoryClearingStatusBadgeClass,
  inventoryClearingStatusLabel,
  inventoryProgressStatusBadgeClass,
  inventoryProgressStatusLabel,
  inventoryValuationVariancePreviewUrl,
  landedCostPreviewUrl,
} from "@/lib/inventory";
import { formatUnits, parseDecimalToUnits } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import { downloadPdf, purchaseBillPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import { purchaseDebitNoteStatusLabel } from "@/lib/purchase-debit-notes";
import { purchaseBillAccountingPreviewLineDisplay, purchaseBillInventoryPostingModeLabel } from "@/lib/purchase-bills";
import type {
  InventoryClearingReconciliationReport,
  InventoryValuationVariancePreviewResponse,
  PurchaseBill,
  PurchaseBillAccountingPreview,
  PurchaseMatchingSummary,
  PurchaseReceivingStatus,
} from "@/lib/types";

export default function PurchaseBillDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [bill, setBill] = useState<PurchaseBill | null>(null);
  const [receivingStatus, setReceivingStatus] = useState<PurchaseReceivingStatus | null>(null);
  const [matchingSummary, setMatchingSummary] = useState<PurchaseMatchingSummary | null>(null);
  const [accountingPreview, setAccountingPreview] = useState<PurchaseBillAccountingPreview | null>(null);
  const [clearingReport, setClearingReport] = useState<InventoryClearingReconciliationReport | null>(null);
  const [valuationVariancePreview, setValuationVariancePreview] = useState<InventoryValuationVariancePreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateBill = can(PERMISSIONS.purchaseBills.update);
  const canFinalizeBill = can(PERMISSIONS.purchaseBills.finalize);
  const foreignCurrencyDocument = bill ? isForeignCurrencyDocument(bill) : false;
  const fxPostingReady = bill ? documentFxPostingIsReady(bill) : false;
  const fxRateEvidence = bill ? documentFxRateEvidence(bill) : null;
  const billDisplayTotals = bill ? transactionDocumentDisplayTotals(bill) : null;
  const canVoidBill = can(PERMISSIONS.purchaseBills.void);
  const canCreateDebitNote = can(PERMISSIONS.purchaseDebitNotes.create);
  const canCreateSupplierPayment = can(PERMISSIONS.supplierPayments.create);
  const canViewPurchaseOrders = can(PERMISSIONS.purchaseOrders.view);
  const canCreateReceipt = can(PERMISSIONS.purchaseReceiving.create);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const canViewValuationVariances = can(PERMISSIONS.inventory.view);
  const canViewLandedCostPreview = canViewValuationVariances && can(PERMISSIONS.purchaseBills.view);
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const billDetailHref = purchaseBillDetailHref(params.id, returnTo);

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
      apiRequest<PurchaseMatchingSummary>(`/purchase-matching/purchase-bills/${params.id}`).catch(() => null),
      apiRequest<PurchaseBillAccountingPreview>(`/purchase-bills/${params.id}/accounting-preview`).catch(() => null),
      apiRequest<InventoryClearingReconciliationReport>(`/inventory/reports/clearing-reconciliation?purchaseBillId=${encodeURIComponent(params.id)}`).catch(() => null),
      canViewValuationVariances
        ? apiRequest<InventoryValuationVariancePreviewResponse>(`/inventory/valuation-variances/purchase-bills/${params.id}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([result, statusResult, matchingResult, accountingPreviewResult, clearingReportResult, valuationVarianceResult]) => {
        if (!cancelled) {
          setBill(result);
          setReceivingStatus(statusResult);
          setMatchingSummary(matchingResult);
          setAccountingPreview(accountingPreviewResult);
          setClearingReport(clearingReportResult);
          setValuationVariancePreview(valuationVarianceResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load purchase bill."));
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
  }, [canViewValuationVariances, organizationId, params.id, tc]);

  async function runAction(action: "finalize" | "void") {
    if (!bill) {
      return;
    }

    if (action === "finalize" && !documentFxPostingIsReady(bill)) {
      setError(tc(INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE));
      return;
    }

    if (action === "void" && !window.confirm(tc("Void purchase bill {number}?", { number: bill.billNumber }))) {
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
      setSuccess(action === "finalize" ? tc("Finalized bill {number}.", { number: updated.billNumber }) : tc("Voided bill {number}.", { number: updated.billNumber }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc(action === "finalize" ? "Unable to finalize purchase bill." : "Unable to void purchase bill."));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteBill() {
    if (!bill || !window.confirm(tc("Delete draft purchase bill {number}?", { number: bill.billNumber }))) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/purchase-bills/${bill.id}`, { method: "DELETE" });
      router.push("/purchases/bills");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tc("Unable to delete purchase bill."));
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
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download purchase bill PDF."));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{bill ? <bdi dir="ltr">{bill.billNumber}</bdi> : tc("Purchase bill")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Supplier bill detail, AP posting, allocations, and PDF download.")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={returnTo || "/purchases/bills"} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {bill?.status === "DRAFT" && canUpdateBill ? (
            <Link href={`/purchases/bills/${bill.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
          {bill?.supplierId ? (
            <Link href={`/suppliers/${bill.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Supplier ledger")}
            </Link>
          ) : null}
          {bill?.supplierId && canCreateDebitNote ? (
            <Link
              href={`/purchases/debit-notes/new?billId=${encodeURIComponent(bill.id)}&supplierId=${encodeURIComponent(bill.supplierId)}&returnTo=${encodeURIComponent(billDetailHref)}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {tc("Create debit note")}
            </Link>
          ) : null}
          {bill && receivingStatus && canCreateReceipt && hasReceiptRemaining(receivingStatus) ? (
            <Link
              href={`/inventory/purchase-receipts/new?sourceType=purchaseBill&purchaseBillId=${encodeURIComponent(bill.id)}&returnTo=${encodeURIComponent(billDetailHref)}`}
              className="rounded-md border border-palm px-3 py-2 text-center text-sm font-medium text-palm hover:bg-teal-50"
            >
              {tc("Receive stock")}
            </Link>
          ) : null}
          {bill && canViewLandedCostPreview ? (
            <Link href={landedCostPreviewUrl({ sourceType: "PURCHASE_BILL", sourceId: bill.id })} className="rounded-md border border-palm px-3 py-2 text-center text-sm font-medium text-palm hover:bg-teal-50">
              {tc("Preview landed cost")}
            </Link>
          ) : null}
          {bill && canDownloadGeneratedDocuments ? (
            <button type="button" onClick={() => void downloadBillPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download purchase bill PDF")}
            </button>
          ) : null}
          {bill?.status === "DRAFT" && canFinalizeBill ? (
            <button
              type="button"
              onClick={() => void runAction("finalize")}
              disabled={actionLoading || !fxPostingReady || (accountingPreview !== null && !accountingPreview.canFinalize)}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {tc("Finalize")}
            </button>
          ) : null}
          {bill && bill.status !== "VOIDED" && canVoidBill ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
          {bill?.status === "DRAFT" && canUpdateBill ? (
            <button type="button" onClick={() => void deleteBill()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Delete")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load purchase bills.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading purchase bill...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {bill ? (
        <div className="mt-5 space-y-5">
      <PurchaseBillWorkflowGuidance
        bill={bill}
        actionLoading={actionLoading}
        canFinalizeBill={canFinalizeBill}
        canCreateSupplierPayment={canCreateSupplierPayment}
        canCreateDebitNote={canCreateDebitNote}
        canDownloadGeneratedDocuments={canDownloadGeneratedDocuments}
        returnTo={returnTo}
        onFinalize={() => void runAction("finalize")}
        onDownloadPdf={() => void downloadBillPdf()}
      />

          <AttachmentPanel linkedEntityType="PURCHASE_BILL" linkedEntityId={bill.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={bill.supplier?.displayName ?? bill.supplier?.name ?? "-"} />
              <Summary label="Status" value={tc(purchaseBillStatusLabel(bill.status))} />
              <Summary label="Bill date" value={formatAppDate(bill.billDate, locale, "-")} />
              <Summary label="Due date" value={formatAppDate(bill.dueDate, locale, "-")} />
              <Summary label="Branch" value={bill.branch?.displayName ?? bill.branch?.name ?? "-"} />
              <Summary
                label="Source PO"
                value={bill.purchaseOrder ? bill.purchaseOrder.purchaseOrderNumber : "-"}
                href={bill.purchaseOrder && canViewPurchaseOrders ? `/purchases/purchase-orders/${bill.purchaseOrder.id}` : undefined}
              />
              <Summary label="Total" value={formatAppMoney(billDisplayTotals?.total ?? bill.total, bill.currency, locale)} />
              <Summary label="Balance due" value={formatAppMoney(bill.status === "DRAFT" ? (billDisplayTotals?.total ?? bill.total) : bill.balanceDue, bill.currency, locale)} />
              {foreignCurrencyDocument ? <Summary label={tc("Base equivalent")} value={formatAppMoney(bill.total, bill.baseCurrency ?? bill.currency, locale)} /> : null}
              {foreignCurrencyDocument ? <Summary label={tc("Captured FX rate")} value={fxRateEvidence ?? tc("Incomplete FX context")} /> : null}
              {foreignCurrencyDocument ? <Summary label={tc("FX rate status")} value={bill.status === "DRAFT" ? tc("Freezes on finalization") : tc("Frozen; reverse to correct")} /> : null}
              <Summary label="Inventory posting mode" value={tc(purchaseBillInventoryPostingModeLabel(bill.inventoryPostingMode))} />
              <Summary label="Journal entry" value={bill.journalEntry ? `${bill.journalEntry.entryNumber} (${bill.journalEntry.id})` : "-"} bidi />
              <Summary label="Reversal journal" value={bill.reversalJournalEntry ? `${bill.reversalJournalEntry.entryNumber} (${bill.reversalJournalEntry.id})` : "-"} bidi />
            </div>
          </div>

          {receivingStatus ? <ReceivingStatusPanel status={receivingStatus} /> : null}
          {matchingSummary ? <PurchaseMatchingPanel summary={matchingSummary} showValuationVariancePreviewLink={canViewValuationVariances} /> : null}
          {canViewValuationVariances ? (
            <ValuationVariancePreviewPanel
              preview={valuationVariancePreview}
              href={inventoryValuationVariancePreviewUrl({ purchaseBillId: bill.id, sourceType: "purchaseBill" })}
            />
          ) : null}
          {accountingPreview ? <AccountingPreviewPanel preview={accountingPreview} currency={bill.currency} /> : null}
          <ClearingReconciliationPanel bill={bill} report={clearingReport} />

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
                {bill.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <bdi dir="ltr">{`${line.account.code} ${line.account.name}`}</bdi> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, bill.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).discountAmount, bill.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).taxAmount, bill.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).lineTotal, bill.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Totals")}</h2>
              <div className="mt-4 space-y-2 text-sm">
                <TotalRow label="Subtotal" value={formatAppMoney(billDisplayTotals?.subtotal ?? bill.subtotal, bill.currency, locale)} />
                <TotalRow label="Discount" value={formatAppMoney(billDisplayTotals?.discountTotal ?? bill.discountTotal, bill.currency, locale)} />
                <TotalRow label="Taxable" value={formatAppMoney(billDisplayTotals?.taxableTotal ?? bill.taxableTotal, bill.currency, locale)} />
                <TotalRow label="VAT / Tax" value={formatAppMoney(billDisplayTotals?.taxTotal ?? bill.taxTotal, bill.currency, locale)} />
                <TotalRow label="Total" value={formatAppMoney(billDisplayTotals?.total ?? bill.total, bill.currency, locale)} strong />
                <TotalRow label="Balance due" value={formatAppMoney(bill.status === "DRAFT" ? (billDisplayTotals?.total ?? bill.total) : bill.balanceDue, bill.currency, locale)} strong />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Supplier payment allocations")}</h2>
              {bill.paymentAllocations?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">{tc("Payment")}</th>
                        <th className="px-3 py-2">{tc("Date")}</th>
                        <th className="px-3 py-2">{tc("Status")}</th>
                        <th className="px-3 py-2">{tc("Applied")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.paymentAllocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/supplier-payments/${allocation.paymentId}?returnTo=${encodeURIComponent(billDetailHref)}`} className="font-mono text-xs text-palm hover:underline">
                              <bdi dir="ltr">{allocation.payment?.paymentNumber ?? allocation.paymentId}</bdi>
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-steel">{formatAppDate(allocation.payment?.paymentDate, locale, "-")}</td>
                          <td className="px-3 py-2 text-steel">{tc(supplierPaymentStatusLabel(allocation.payment?.status))}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatAppMoney(allocation.amountApplied, bill.currency, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">{tc("No supplier payments have been applied to this bill.")}</p>
              )}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Unapplied supplier payment applications")}</h2>
              {bill.supplierPaymentUnappliedAllocations?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">{tc("Payment")}</th>
                        <th className="px-3 py-2">{tc("Applied")}</th>
                        <th className="px-3 py-2">{tc("Status")}</th>
                        <th className="px-3 py-2">{tc("Reversed")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.supplierPaymentUnappliedAllocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/supplier-payments/${allocation.paymentId}?returnTo=${encodeURIComponent(billDetailHref)}`} className="font-mono text-xs text-palm hover:underline">
                              <bdi dir="ltr">{allocation.payment?.paymentNumber ?? allocation.paymentId}</bdi>
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{formatAppMoney(allocation.amountApplied, bill.currency, locale)}</td>
                          <td className="px-3 py-2 text-steel">{tc(allocation.reversedAt ? "Reversed" : "Active")}</td>
                          <td className="px-3 py-2 text-steel">{formatAppDate(allocation.reversedAt, locale, "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">{tc("No unapplied supplier payment amounts have been applied to this bill.")}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Linked debit notes")}</h2>
              {bill.debitNotes?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">{tc("Debit note")}</th>
                        <th className="px-3 py-2">{tc("Status")}</th>
                        <th className="px-3 py-2">{tc("Total")}</th>
                        <th className="px-3 py-2">{tc("Unapplied")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.debitNotes.map((debitNote) => (
                        <tr key={debitNote.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/debit-notes/${debitNote.id}`} className="font-mono text-xs text-palm hover:underline">
                              <bdi dir="ltr">{debitNote.debitNoteNumber}</bdi>
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-steel">{tc(purchaseDebitNoteStatusLabel(debitNote.status))}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatAppMoney(debitNote.total, bill.currency, locale)}</td>
                          <td className="px-3 py-2 font-mono text-xs">{formatAppMoney(debitNote.unappliedAmount, bill.currency, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">{tc("No debit notes are linked to this bill.")}</p>
              )}
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">{tc("Debit note allocations")}</h2>
              {bill.debitNoteAllocations?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-start text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                      <tr>
                        <th className="px-3 py-2">{tc("Debit note")}</th>
                        <th className="px-3 py-2">{tc("Applied")}</th>
                        <th className="px-3 py-2">{tc("Status")}</th>
                        <th className="px-3 py-2">{tc("Reversed")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.debitNoteAllocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td className="px-3 py-2">
                            <Link href={`/purchases/debit-notes/${allocation.debitNoteId}`} className="font-mono text-xs text-palm hover:underline">
                              <bdi dir="ltr">{allocation.debitNote?.debitNoteNumber ?? allocation.debitNoteId}</bdi>
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{formatAppMoney(allocation.amountApplied, bill.currency, locale)}</td>
                          <td className="px-3 py-2 text-steel">{tc(allocation.reversedAt ? "Reversed" : "Active")}</td>
                          <td className="px-3 py-2 text-steel">{formatAppDate(allocation.reversedAt, locale, "-")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-steel">{tc("No debit note amounts have been applied to this bill.")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function PurchaseBillWorkflowGuidance({
  bill,
  actionLoading,
  canFinalizeBill,
  canCreateSupplierPayment,
  canCreateDebitNote,
  canDownloadGeneratedDocuments,
  returnTo = "",
  onFinalize,
  onDownloadPdf,
}: {
  bill: PurchaseBill;
  actionLoading: boolean;
  canFinalizeBill: boolean;
  canCreateSupplierPayment: boolean;
  canCreateDebitNote: boolean;
  canDownloadGeneratedDocuments: boolean;
  returnTo?: string;
  onFinalize: () => void;
  onDownloadPdf: () => void;
}) {
  const { locale, tc } = useAppLocale();
  const displayTotals = transactionDocumentDisplayTotals(bill);
  const paymentState = purchaseBillPaymentState(bill);
  const supplierName = bill.supplier?.displayName ?? bill.supplier?.name ?? tc("this supplier");
  const hasBalanceDue = paymentState !== "Paid";
  const paidUnits = Math.max(0, parseDecimalToUnits(bill.total) - parseDecimalToUnits(bill.balanceDue));
  const billDetailHref = purchaseBillDetailHref(bill.id, returnTo);
  const fxPostingReady = documentFxPostingIsReady(bill);
  const fxRateEvidence = documentFxRateEvidence(bill);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("What happened?")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc(purchaseBillOutcomeDescription(bill, paymentState))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${purchaseBillStatusBadgeClass(bill.status)}`}>
              {tc(purchaseBillStatusLabel(bill.status))}
            </span>
            {bill.status === "FINALIZED" ? (
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${purchaseBillPaymentStateBadgeClass(paymentState)}`}>
                {tc(paymentState)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Summary label="Supplier" value={supplierName} />
          <Summary label="Paid or credited" value={formatAppMoney(formatUnits(paidUnits), bill.currency, locale)} />
          <Summary label="Balance due" value={formatAppMoney(bill.status === "DRAFT" ? displayTotals.total : bill.balanceDue, bill.currency, locale)} />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Next actions")}</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{tc(purchaseBillNextActionDescription(bill, paymentState, canCreateSupplierPayment))}</p>
        <div className="mt-4 flex flex-col gap-2">
          {bill.status === "DRAFT" && canFinalizeBill ? (
            <button
              type="button"
              onClick={onFinalize}
              disabled={actionLoading || !fxPostingReady}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {tc("Finalize bill")}
            </button>
          ) : null}
          {bill.status === "DRAFT" && !fxPostingReady ? (
            <p className="text-xs leading-5 text-amber-700">{tc(INCOMPLETE_DOCUMENT_FX_CONTEXT_MESSAGE)}</p>
          ) : null}
          {fxRateEvidence ? <p className="text-xs leading-5 text-steel"><bdi dir="ltr">{fxRateEvidence}</bdi> · {tc(bill.status === "DRAFT" ? "Freezes on finalization" : "Frozen; reverse to correct")}</p> : null}
          {bill.status === "FINALIZED" && hasBalanceDue && bill.supplierId && canCreateSupplierPayment ? (
            <Link
              href={`/purchases/supplier-payments/new?supplierId=${encodeURIComponent(bill.supplierId)}&billId=${encodeURIComponent(bill.id)}&returnTo=${encodeURIComponent(billDetailHref)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              {tc("Record supplier payment")}
            </Link>
          ) : null}
          {bill.status === "FINALIZED" && bill.supplierId && canCreateDebitNote ? (
            <Link
              href={`/purchases/debit-notes/new?billId=${encodeURIComponent(bill.id)}&supplierId=${encodeURIComponent(bill.supplierId)}&returnTo=${encodeURIComponent(billDetailHref)}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {tc("Create debit note")}
            </Link>
          ) : null}
          {canDownloadGeneratedDocuments ? (
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={actionLoading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {tc("Download purchase bill PDF")}
            </button>
          ) : null}
          {bill.supplierId ? (
            <Link href={`/suppliers/${bill.supplierId}`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("View supplier ledger")}
            </Link>
          ) : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <APActionLink href={`/reports/aged-payables?returnTo=${encodeURIComponent(billDetailHref)}`}>AP report</APActionLink>
            <APActionLink href="/dashboard">Dashboard</APActionLink>
          </div>
        </div>
        {bill.status === "DRAFT" && !canFinalizeBill ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("You need purchase bill finalization permission before this draft can post AP entries.")}</p>
        ) : null}
        {bill.status === "FINALIZED" && hasBalanceDue && !canCreateSupplierPayment ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("The supplier payable is still open, but your role cannot record supplier payments.")}</p>
        ) : null}
        {bill.status === "VOIDED" ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("Voided bills are closed for supplier payments. Review reversal details below if present.")}</p>
        ) : null}
        <SourceDocumentGuidance className="mt-4" />
      </div>
    </div>
  );
}

function purchaseBillPaymentState(bill: PurchaseBill): "Unpaid" | "Partially paid" | "Paid" {
  if (bill.status !== "FINALIZED") {
    return "Unpaid";
  }
  const totalUnits = parseDecimalToUnits(bill.total);
  const balanceUnits = parseDecimalToUnits(bill.balanceDue);
  if (balanceUnits <= 0) {
    return "Paid";
  }
  if (balanceUnits < totalUnits) {
    return "Partially paid";
  }
  return "Unpaid";
}

function purchaseBillStatusLabel(status: PurchaseBill["status"] | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "FINALIZED":
      return "Finalized/posted";
    case "VOIDED":
      return "Voided";
    default:
      return "-";
  }
}

function purchaseBillStatusBadgeClass(status: PurchaseBill["status"]): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "FINALIZED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
  }
}

function purchaseBillPaymentStateBadgeClass(paymentState: ReturnType<typeof purchaseBillPaymentState>): string {
  switch (paymentState) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700";
    case "Partially paid":
      return "bg-amber-50 text-amber-700";
    case "Unpaid":
      return "bg-slate-100 text-slate-700";
  }
}

function purchaseBillOutcomeDescription(bill: PurchaseBill, paymentState: ReturnType<typeof purchaseBillPaymentState>): string {
  if (bill.status === "DRAFT") {
    return "This draft bill is saved and editable. It has not posted AP or accounting entries yet, so finalize it only after supplier, tax, lines, and totals are ready.";
  }

  if (bill.status === "VOIDED") {
    return "This purchase bill is voided. It is closed for supplier payments, and reversal journal details remain visible for review.";
  }

  if (paymentState === "Paid") {
    return "This bill is finalized, AP entries are posted, and supplier payments or debit notes have cleared the balance.";
  }

  if (paymentState === "Partially paid") {
    return "This bill is finalized and posted, with part of the payable already settled. Record another supplier payment or debit note when the remaining balance is resolved.";
  }

  return "This bill is finalized and posted. The supplier payable is open, so the next operating step is recording payment when cash is paid out.";
}

function purchaseBillNextActionDescription(bill: PurchaseBill, paymentState: ReturnType<typeof purchaseBillPaymentState>, canCreateSupplierPayment: boolean): string {
  if (bill.status === "DRAFT") {
    return "Finalize the bill to post AP, then record supplier payment or create a debit note when the balance changes.";
  }

  if (bill.status === "VOIDED") {
    return "Use the links below for review and reporting. Create a new bill if the supplier document needs replacement.";
  }

  if (paymentState === "Paid") {
    return "The payables loop is complete. Review the supplier ledger, PDF, dashboard, or AP report for the audit trail.";
  }

  return canCreateSupplierPayment
    ? "Record supplier payment next, then review the supplier ledger and AP report to confirm the payable is reflected."
    : "Payment is still due, but your role cannot record supplier payments.";
}

function supplierPaymentStatusLabel(status: string | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "VOIDED":
      return "Voided";
    default:
      return "-";
  }
}

function APActionLink({ href, children }: { href: string; children: ReactNode }) {
  const { tc } = useAppLocale();
  return (
    <Link href={href} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
      {typeof children === "string" ? tc(children) : children}
    </Link>
  );
}

function ClearingReconciliationPanel({ bill, report }: { bill: PurchaseBill; report: InventoryClearingReconciliationReport | null }) {
  const { locale, tc } = useAppLocale();
  if (bill.inventoryPostingMode !== "INVENTORY_CLEARING") {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Clearing reconciliation")}</h2>
        <p className="mt-2 text-sm text-steel">{tc("This bill uses direct expense/asset posting and is excluded from inventory clearing reconciliation.")}</p>
      </div>
    );
  }

  const row = report?.rows[0] ?? null;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Clearing reconciliation")}</h2>
          <p className="mt-1 text-sm text-steel">{tc("Inventory Clearing debit from this bill compared with active receipt asset postings.")}</p>
        </div>
        {row ? (
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryClearingStatusBadgeClass(row.status)}`}>
            {tc(inventoryClearingStatusLabel(row.status))}
          </span>
        ) : null}
      </div>

      {row ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
            <Summary label="Bill clearing debit" value={formatAppMoney(row.billClearingDebit, bill.currency, locale)} />
            <Summary label="Receipt clearing credit" value={formatAppMoney(row.receiptClearingCredit, bill.currency, locale)} />
            <Summary label="Net difference" value={formatAppMoney(row.netClearingDifference, bill.currency, locale)} />
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
              {tc("Open clearing report")}
            </Link>
            <Link href={`/inventory/reports/clearing-variance?purchaseBillId=${encodeURIComponent(bill.id)}`} className="font-medium text-palm hover:underline">
              {tc("Open variance report")}
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-steel">{tc("No clearing reconciliation row is available for this bill yet.")}</p>
      )}
    </div>
  );
}

function AccountingPreviewPanel({ preview, currency }: { preview: PurchaseBillAccountingPreview; currency: string }) {
  const { locale, tc } = useAppLocale();
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Accounting preview")}</h2>
          <p className="mt-1 text-sm text-steel">{tc("Read-only purchase bill posting preview. No journal is created from this panel.")}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${preview.canFinalize ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {tc(preview.canFinalize ? "Finalizable" : "Preview only")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <Summary label="Mode" value={tc(purchaseBillInventoryPostingModeLabel(preview.inventoryPostingMode))} />
        <Summary label="Tracked lines" value={String(preview.inventoryTrackedLineCount)} />
        <Summary label="Direct lines" value={String(preview.directLineCount)} />
        <Summary label="Clearing account" value={preview.clearingAccount ? `${preview.clearingAccount.code} ${preview.clearingAccount.name}` : tc("Not mapped")} bidi={Boolean(preview.clearingAccount)} />
        <Summary label="VAT account" value={preview.vatReceivableAccount ? `${preview.vatReceivableAccount.code} ${preview.vatReceivableAccount.name}` : tc("Not mapped")} bidi={Boolean(preview.vatReceivableAccount)} />
        <Summary label="AP account" value={preview.accountsPayableAccount ? `${preview.accountsPayableAccount.code} ${preview.accountsPayableAccount.name}` : tc("Not mapped")} bidi={Boolean(preview.accountsPayableAccount)} />
        <Summary label="Total debit" value={formatAppMoney(preview.journal.totalDebit, currency, locale)} />
        <Summary label="Total credit" value={formatAppMoney(preview.journal.totalCredit, currency, locale)} />
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
          <p className="font-medium text-ink">{tc("Blocking reasons")}</p>
          <ul className="mt-2 space-y-1">
            {preview.blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">{tc("Line")}</th>
              <th className="px-3 py-2">{tc("Side")}</th>
              <th className="px-3 py-2">{tc("Account")}</th>
              <th className="px-3 py-2 text-end">{tc("Amount")}</th>
              <th className="px-3 py-2">{tc("Description")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.journal.lines.map((line) => (
              <tr key={`${line.lineNumber}-${line.side}-${line.accountId ?? line.accountName}`}>
                <td className="px-3 py-2 font-mono text-xs">{line.lineNumber}</td>
                <td className="px-3 py-2">{tc(line.side === "DEBIT" ? "Dr" : "Cr")}</td>
                <td className="px-3 py-2">{line.accountCode ? <bdi dir="ltr">{`${line.accountCode} ${line.accountName}`}</bdi> : line.accountName}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatAppMoney(line.amount, currency, locale)}</td>
                <td className="px-3 py-2 text-steel">{line.description || purchaseBillAccountingPreviewLineDisplay(line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ label, value, href, bidi = false }: { label: string; value: string; href?: string; bidi?: boolean }) {
  const { tc } = useAppLocale();
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{tc(label)}</div>
      {href ? (
        <Link href={href} className="mt-1 block font-medium text-palm hover:underline">
          {bidi ? <bdi dir="ltr">{value}</bdi> : value}
        </Link>
      ) : (
        <div className="mt-1 break-words font-medium text-ink">{bidi ? <bdi dir="ltr">{value}</bdi> : value}</div>
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
          <p className="mt-1 text-sm text-steel">{tc("Operational stock receipt progress for inventory-tracked bill lines.")}</p>
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
              <th className="px-3 py-2 text-end">{tc("Billed")}</th>
              <th className="px-3 py-2 text-end">{tc("Received")}</th>
              <th className="px-3 py-2 text-end">{tc("Remaining")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-3 py-2">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatInventoryQuantity(line.billedQuantity ?? line.sourceQuantity)}</td>
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
  const { tc } = useAppLocale();
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{tc(label)}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function purchaseBillDetailHref(billId: string, returnTo = ""): string {
  const href = `/purchases/bills/${encodeURIComponent(billId)}`;
  return returnTo ? `${href}?returnTo=${encodeURIComponent(returnTo)}` : href;
}
