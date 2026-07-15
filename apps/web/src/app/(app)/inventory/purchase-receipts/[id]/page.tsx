"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { ValuationVariancePreviewPanel } from "@/components/inventory/valuation-variance-preview-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PurchaseMatchingPanel } from "@/components/purchases/purchase-matching-panel";
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
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  accountingPreviewCanPost,
  accountingPreviewLineDisplay,
  canShowPostReceiptAssetAction,
  canShowReverseReceiptAssetAction,
  canVoidPostedStockDocument,
  formatInventoryQuantity,
  inventoryClearingReportUrl,
  inventoryClearingStatusLabel,
  inventoryOperationalWarning,
  inventoryValuationVariancePreviewUrl,
  landedCostPreviewUrl,
  linkedPurchaseBillModeWarning,
  purchaseReceiptPostingModeLabel,
  receiptAssetPostingFinancialReportWarning,
  receiptAssetPostingStatus,
  stockDocumentStatusLabel,
  stockMovementTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  InventoryClearingReconciliationReport,
  InventoryValuationVariancePreviewResponse,
  PurchaseMatchingSummary,
  PurchaseReceipt,
  PurchaseReceiptAccountingPreview,
  PurchaseReceiptLine,
} from "@/lib/types";

export default function PurchaseReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);
  const [preview, setPreview] = useState<PurchaseReceiptAccountingPreview | null>(null);
  const [clearingReport, setClearingReport] = useState<InventoryClearingReconciliationReport | null>(null);
  const [valuationVariancePreview, setValuationVariancePreview] = useState<InventoryValuationVariancePreviewResponse | null>(null);
  const [matchingSummary, setMatchingSummary] = useState<PurchaseMatchingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [postingAsset, setPostingAsset] = useState(false);
  const [reversingAsset, setReversingAsset] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState<"void" | "post-asset" | "reverse-asset" | null>(null);
  const canVoid = can(PERMISSIONS.purchaseReceiving.create);
  const canPostAsset = can(PERMISSIONS.inventory.receiptsPostAsset);
  const canReverseAsset = can(PERMISSIONS.inventory.receiptsReverseAsset);
  const canViewValuationVariances = can(PERMISSIONS.inventory.view);
  const canViewLandedCostPreview = canViewValuationVariances && can(PERMISSIONS.purchaseReceiving.view);

  useEffect(() => {
    if (!organizationId || !params.id) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setPreviewError("");

    Promise.all([
      apiRequest<PurchaseReceipt>(`/purchase-receipts/${params.id}`),
      apiRequest<PurchaseReceiptAccountingPreview>(`/purchase-receipts/${params.id}/accounting-preview`),
      apiRequest<InventoryClearingReconciliationReport>(`/inventory/reports/clearing-reconciliation?purchaseReceiptId=${encodeURIComponent(params.id)}`).catch(() => null),
      apiRequest<PurchaseMatchingSummary>(`/purchase-matching/purchase-receipts/${params.id}`).catch(() => null),
      canViewValuationVariances
        ? apiRequest<InventoryValuationVariancePreviewResponse>(`/inventory/valuation-variances/purchase-receipts/${params.id}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([receiptResult, previewResult, clearingReportResult, matchingResult, valuationVarianceResult]) => {
        if (!cancelled) {
          setReceipt(receiptResult);
          setPreview(previewResult);
          setClearingReport(clearingReportResult);
          setMatchingSummary(matchingResult);
          setValuationVariancePreview(valuationVarianceResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase receipt.");
          setPreviewError(loadError instanceof Error ? loadError.message : "Unable to load accounting preview.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewValuationVariances, organizationId, params.id, reloadToken]);

  async function voidReceipt(): Promise<boolean> {
    if (!receipt) return false;
    setVoiding(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<PurchaseReceipt>(`/purchase-receipts/${receipt.id}/void`, { method: "POST" });
      setReceipt(updated);
      setSuccess(`${updated.receiptNumber} has been voided.`);
      setReloadToken((current) => current + 1);
      return true;
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void purchase receipt.");
      return false;
    } finally {
      setVoiding(false);
    }
  }

  async function postInventoryAsset(): Promise<boolean> {
    if (!receipt) return false;
    setPostingAsset(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<PurchaseReceipt>(`/purchase-receipts/${receipt.id}/post-inventory-asset`, { method: "POST" });
      setReceipt(updated);
      setSuccess(`Inventory asset journal posted for ${updated.receiptNumber}.`);
      setReloadToken((current) => current + 1);
      return true;
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post inventory asset journal.");
      return false;
    } finally {
      setPostingAsset(false);
    }
  }

  async function reverseInventoryAsset(): Promise<boolean> {
    if (!receipt) return false;
    setReversingAsset(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<PurchaseReceipt>(`/purchase-receipts/${receipt.id}/reverse-inventory-asset`, { method: "POST" });
      setReceipt(updated);
      setSuccess(`Inventory asset posting reversed for ${updated.receiptNumber}.`);
      setReloadToken((current) => current + 1);
      return true;
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : "Unable to reverse inventory asset journal.");
      return false;
    } finally {
      setReversingAsset(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title={receipt?.receiptNumber ?? "Purchase receipt"}
        description="Receipt detail and linked operational stock movements."
        badge={receipt ? <LedgerStatusBadge tone={stockDocumentStatusTone(receipt.status)}>{stockDocumentStatusLabel(receipt.status)}</LedgerStatusBadge> : null}
        actions={
          <>
            <LedgerButton href="/inventory/purchase-receipts">Back</LedgerButton>
            {receipt && canVoid && canVoidPostedStockDocument(receipt.status) ? (
              <LedgerButton type="button" disabled={voiding} onClick={() => setPendingAction("void")} variant="danger">
                {voiding ? "Voiding..." : "Void"}
              </LedgerButton>
            ) : null}
            {receipt && canViewLandedCostPreview ? (
              <LedgerButton href={landedCostPreviewUrl({ sourceType: "PURCHASE_RECEIPT", sourceId: receipt.id })}>Preview landed cost</LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase receipt details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading purchase receipt" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {receipt ? (
          <>
            <AttachmentPanel linkedEntityType="PURCHASE_RECEIPT" linkedEntityId={receipt.id} />
            <PurchaseReceiptWorkflowGuidance
              receipt={receipt}
              preview={preview}
              canVoid={canVoid}
              canPostAsset={canPostAsset}
              canReverseAsset={canReverseAsset}
              onVoid={() => setPendingAction("void")}
              onPostAsset={() => setPendingAction("post-asset")}
              onReverseAsset={() => setPendingAction("reverse-asset")}
              actionLoading={voiding || postingAsset || reversingAsset}
            />

            <LedgerSection title="Receipt profile" description={receipt.notes || "Operational receipt metadata for the linked supplier and warehouse."}>
              <LedgerMetadataRow
                items={[
                  { label: "Supplier", value: receipt.supplier?.displayName ?? receipt.supplier?.name ?? receipt.supplierId },
                  { label: "Warehouse", value: receipt.warehouse ? `${receipt.warehouse.code} ${receipt.warehouse.name}` : receipt.warehouseId },
                  { label: "Date", value: <LedgerDate>{formatOptionalDate(receipt.receiptDate, "-")}</LedgerDate> },
                  { label: "Status", value: <LedgerStatusBadge tone={stockDocumentStatusTone(receipt.status)}>{stockDocumentStatusLabel(receipt.status)}</LedgerStatusBadge> },
                  { label: "Source PO", value: receipt.purchaseOrder?.purchaseOrderNumber ?? "-" },
                  { label: "Source bill", value: receipt.purchaseBill?.billNumber ?? "-" },
                  { label: "Posted at", value: <LedgerDate>{formatOptionalDate(receipt.postedAt, "-")}</LedgerDate> },
                  { label: "Voided at", value: <LedgerDate>{formatOptionalDate(receipt.voidedAt, "-")}</LedgerDate> },
                ]}
              />
            </LedgerSection>

            {matchingSummary ? <PurchaseMatchingPanel summary={matchingSummary} showValuationVariancePreviewLink={canViewValuationVariances} /> : null}
            {canViewValuationVariances ? (
              <ValuationVariancePreviewPanel
                preview={valuationVariancePreview}
                href={inventoryValuationVariancePreviewUrl({ purchaseReceiptId: receipt.id, sourceType: "purchaseReceipt" })}
              />
            ) : null}

            <LedgerSection title="Receipt lines" description="Operational stock movement references and optional void movement references for each line.">
              <LedgerDataTable minWidth="920px">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Source line</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit cost</th>
                    <th className="px-4 py-3">Movement</th>
                    <th className="px-4 py-3">Void movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.itemId}</td>
                      <td className="px-4 py-3 text-steel">{line.purchaseOrderLine?.description ?? line.purchaseBillLine?.description ?? "-"}</td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.quantity)}</LedgerMoney></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{line.unitCost ? formatInventoryQuantity(line.unitCost) : "-"}</LedgerMoney></td>
                      <td className="px-4 py-3"><Movement line={line} kind="stockMovement" /></td>
                      <td className="px-4 py-3"><Movement line={line} kind="voidStockMovement" /></td>
                    </tr>
                  ))}
                </tbody>
              </LedgerDataTable>
            </LedgerSection>

            <PurchaseReceiptAccountingPreviewPanel
              preview={preview}
              error={previewError}
              canPostAsset={canPostAsset}
              canReverseAsset={canReverseAsset}
              postingAsset={postingAsset}
              reversingAsset={reversingAsset}
              onPostAsset={() => setPendingAction("post-asset")}
              onReverseAsset={() => setPendingAction("reverse-asset")}
            />
            <ReceiptClearingReconciliationPanel receipt={receipt} preview={preview} report={clearingReport} />
          </>
        ) : null}
        <LedgerActionDialog
          open={Boolean(pendingAction && receipt)}
          onOpenChange={(open) => {
            if (!open && !voiding && !postingAsset && !reversingAsset) setPendingAction(null);
          }}
          tone="danger"
          title={pendingAction === "post-asset" ? "Post inventory asset" : pendingAction === "reverse-asset" ? "Reverse inventory asset" : "Void purchase receipt"}
          description={receipt ? pendingAction === "post-asset" ? `Post inventory asset for ${receipt.receiptNumber}? ${receiptAssetPostingFinancialReportWarning()}` : pendingAction === "reverse-asset" ? `Reverse inventory asset posting for ${receipt.receiptNumber}?` : `Void purchase receipt ${receipt.receiptNumber}?` : ""}
          confirmLabel={pendingAction === "post-asset" ? "Post asset" : pendingAction === "reverse-asset" ? "Reverse" : "Void"}
          busy={voiding || postingAsset || reversingAsset}
          onConfirm={async () => {
            const succeeded = pendingAction === "post-asset" ? await postInventoryAsset() : pendingAction === "reverse-asset" ? await reverseInventoryAsset() : await voidReceipt();
            if (succeeded) setPendingAction(null);
          }}
        />
      </LedgerPageBody>
    </LedgerPage>
  );
}

function Movement({ line, kind }: { line: PurchaseReceiptLine; kind: "stockMovement" | "voidStockMovement" }) {
  const movement = line[kind];
  return movement ? (
    <div>
      <p className="text-ink">{stockMovementTypeLabel(movement.type)}</p>
      <p className="font-mono text-xs text-steel">{movement.id}</p>
    </div>
  ) : (
    <span className="text-steel">-</span>
  );
}

export function PurchaseReceiptWorkflowGuidance({
  receipt,
  preview,
  canVoid,
  canPostAsset,
  canReverseAsset,
  onVoid,
  onPostAsset,
  onReverseAsset,
  actionLoading,
}: {
  receipt: PurchaseReceipt;
  preview: PurchaseReceiptAccountingPreview | null;
  canVoid: boolean;
  canPostAsset: boolean;
  canReverseAsset: boolean;
  onVoid: () => void;
  onPostAsset: () => void;
  onReverseAsset: () => void;
  actionLoading: boolean;
}) {
  const isPosted = receipt.status === "POSTED";
  const isVoided = receipt.status === "VOIDED";
  const showPostAsset = preview ? canShowPostReceiptAssetAction(preview, canPostAsset) : false;
  const showReverseAsset = preview ? canShowReverseReceiptAssetAction(preview, canReverseAsset) : false;
  const warehouseLabel = receipt.warehouse ? `${receipt.warehouse.code} ${receipt.warehouse.name}` : "the receiving warehouse";

  return (
    <LedgerSummaryBand tone="success">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <LedgerStatusBadge tone={stockDocumentStatusTone(receipt.status)}>{stockDocumentStatusLabel(receipt.status)}</LedgerStatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Stock movement</p>
              <p className="mt-1">
                {isVoided
                  ? "This receipt was voided, so reversal movements should offset the original stock increase."
                  : `This receipt increases stock in ${warehouseLabel} when posted.`}
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">Accounting boundary</p>
              <p className="mt-1">Inventory asset accounting is manual only and appears through the explicit posting action when the receipt is eligible.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Where to inspect</p>
              <p className="mt-1">Use the line table for item quantities, stock movement IDs, void movements, and clearing reconciliation status.</p>
            </div>
          </div>
          {!isPosted ? <p className="mt-3 text-xs leading-5">Voided receipts stay available for audit but should not be used as current stock activity.</p> : null}
        </div>
        <LedgerActionBar className="lg:justify-end">
          {isPosted && canVoid ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onVoid} variant="danger">
              Void receipt
            </LedgerButton>
          ) : null}
          {showPostAsset ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onPostAsset} variant="primary">
              Post asset journal
            </LedgerButton>
          ) : null}
          {showReverseAsset ? (
            <LedgerButton type="button" disabled={actionLoading} onClick={onReverseAsset} variant="danger">
              Reverse asset journal
            </LedgerButton>
          ) : null}
          <LedgerButton href={`/inventory/warehouses/${receipt.warehouseId}`}>View warehouse</LedgerButton>
          <LedgerButton href="/inventory/stock-movements">Stock movements</LedgerButton>
          <LedgerButton href="/inventory/reports/movement-summary">Inventory report</LedgerButton>
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </LedgerActionBar>
      </div>
    </LedgerSummaryBand>
  );
}

function ReceiptClearingReconciliationPanel({
  receipt,
  preview,
  report,
}: {
  receipt: PurchaseReceipt;
  preview: PurchaseReceiptAccountingPreview | null;
  report: InventoryClearingReconciliationReport | null;
}) {
  const row = report?.rows[0] ?? null;
  const receiptSummary = row?.receipts.find((candidate) => candidate.id === receipt.id) ?? null;
  const status = row?.status ?? null;
  const billId = preview?.linkedBill?.id ?? receipt.purchaseBillId ?? null;
  const receiptStatus =
    receiptSummary?.assetPostingStatus ?? (receipt.inventoryAssetReversalJournalEntryId ? "REVERSED" : receipt.inventoryAssetJournalEntryId ? "POSTED" : "NOT_POSTED");

  return (
    <LedgerSection
      title="Clearing reconciliation"
      description="Receipt asset posting state against the linked inventory-clearing purchase bill."
      action={status ? <LedgerStatusBadge tone={clearingStatusTone(status)}>{inventoryClearingStatusLabel(status)}</LedgerStatusBadge> : null}
    >
      <div className="space-y-5">
        <LedgerMetadataRow
          items={[
            { label: "Linked bill mode", value: preview?.linkedBill?.inventoryPostingMode?.replaceAll("_", " ") ?? "No linked bill" },
            { label: "Asset posting state", value: receiptStatus.replaceAll("_", " ") },
            { label: "Receipt value", value: <LedgerMoney>{receiptSummary ? formatInventoryQuantity(receiptSummary.receiptValue) : preview ? formatInventoryQuantity(preview.receiptValue) : "-"}</LedgerMoney> },
            { label: "Active clearing credit", value: <LedgerMoney>{receiptSummary ? formatInventoryQuantity(receiptSummary.activeClearingCredit) : "-"}</LedgerMoney> },
            { label: "Bill clearing debit", value: <LedgerMoney>{row ? formatInventoryQuantity(row.billClearingDebit) : "-"}</LedgerMoney> },
            { label: "Net difference", value: <LedgerMoney>{row ? formatInventoryQuantity(row.netClearingDifference) : "-"}</LedgerMoney> },
            { label: "Asset journal", value: receipt.inventoryAssetJournalEntryId ?? "-" },
            { label: "Reversal journal", value: receipt.inventoryAssetReversalJournalEntryId ?? "-" },
          ]}
        />

        {row?.warnings.length ? (
          <LedgerAlert tone="warning">
            <ul className="space-y-1">
              {row.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </LedgerAlert>
        ) : null}

        <LedgerActionBar>
          <LedgerButton href={inventoryClearingReportUrl({ purchaseBillId: billId, purchaseReceiptId: receipt.id })}>Open clearing report</LedgerButton>
          <LedgerButton href={`/inventory/reports/clearing-variance?purchaseReceiptId=${encodeURIComponent(receipt.id)}`}>Open variance report</LedgerButton>
        </LedgerActionBar>
      </div>
    </LedgerSection>
  );
}

function PurchaseReceiptAccountingPreviewPanel({
  preview,
  error,
  canPostAsset,
  canReverseAsset,
  postingAsset,
  reversingAsset,
  onPostAsset,
  onReverseAsset,
}: {
  preview: PurchaseReceiptAccountingPreview | null;
  error: string;
  canPostAsset: boolean;
  canReverseAsset: boolean;
  postingAsset: boolean;
  reversingAsset: boolean;
  onPostAsset: () => void;
  onReverseAsset: () => void;
}) {
  if (error) {
    return <LedgerAlert tone="danger">{error}</LedgerAlert>;
  }
  if (!preview) {
    return null;
  }

  const postable = accountingPreviewCanPost(preview);
  const showPostAsset = canShowPostReceiptAssetAction(preview, canPostAsset);
  const showReverseAsset = canShowReverseReceiptAssetAction(preview, canReverseAsset);

  return (
    <LedgerSection
      title="Accounting Preview"
      description="Manual inventory asset preview for compatible inventory-clearing purchase bills."
      action={
        <>
          <LedgerStatusBadge tone="warning">{preview.postingStatus.replaceAll("_", " ")}</LedgerStatusBadge>
          <LedgerStatusBadge tone={postable ? "success" : "neutral"}>{postable ? "Eligible" : "Blocked"}</LedgerStatusBadge>
          {showPostAsset ? (
            <LedgerButton type="button" onClick={onPostAsset} disabled={postingAsset} variant="primary">
              {postingAsset ? "Posting..." : "Post Inventory Asset"}
            </LedgerButton>
          ) : null}
          {showReverseAsset ? (
            <LedgerButton type="button" onClick={onReverseAsset} disabled={reversingAsset} variant="danger">
              {reversingAsset ? "Reversing..." : "Reverse Inventory Asset Posting"}
            </LedgerButton>
          ) : null}
        </>
      }
    >
      <div className="space-y-5">
        <LedgerSummaryBand tone="warning">{receiptAssetPostingFinancialReportWarning()}</LedgerSummaryBand>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PreviewList title="Blocking reasons" items={preview.blockingReasons} emptyText={preview.canPostReason} tone="slate" />
          <PreviewList title="Warnings" items={preview.warnings} emptyText="No warnings." tone="amber" />
        </div>

        <LedgerMetadataRow
          items={[
            { label: "Asset posting status", value: receiptAssetPostingStatus(preview) },
            { label: "Posting mode", value: purchaseReceiptPostingModeLabel(preview.postingMode) },
            { label: "Linked bill mode", value: preview.linkedBill ? preview.linkedBill.inventoryPostingMode.replaceAll("_", " ") : "No linked bill" },
            { label: "Linked bill status", value: preview.linkedBill ? preview.linkedBill.status : "No linked bill" },
            { label: "Receipt value", value: <LedgerMoney>{formatInventoryQuantity(preview.receiptValue)}</LedgerMoney> },
            { label: "Matched bill value", value: <LedgerMoney>{formatInventoryQuantity(preview.matchedBillValue)}</LedgerMoney> },
            { label: "Value difference", value: <LedgerMoney>{formatInventoryQuantity(preview.valueDifference)}</LedgerMoney> },
            { label: "Asset journal", value: preview.journalEntryId ?? "-" },
            { label: "Reversal journal", value: preview.reversalJournalEntryId ?? "-" },
          ]}
        />
        <p className="text-sm text-steel">{linkedPurchaseBillModeWarning(preview.linkedBill?.inventoryPostingMode)}</p>

        <LedgerDataTable minWidth="920px">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Unit cost</th>
              <th className="px-4 py-3 text-right">Line value</th>
              <th className="px-4 py-3 text-right">Matched qty</th>
              <th className="px-4 py-3 text-right">Bill value</th>
              <th className="px-4 py-3">Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-4 py-3">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
                <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.quantity)}</LedgerMoney></td>
                <td className="px-4 py-3 text-right"><LedgerMoney>{line.unitCost ? formatInventoryQuantity(line.unitCost) : "-"}</LedgerMoney></td>
                <td className="px-4 py-3 text-right"><LedgerMoney>{line.lineValue ? formatInventoryQuantity(line.lineValue) : "-"}</LedgerMoney></td>
                <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.matchedQuantity)}</LedgerMoney></td>
                <td className="px-4 py-3 text-right"><LedgerMoney>{line.matchedBillValue ? formatInventoryQuantity(line.matchedBillValue) : "-"}</LedgerMoney></td>
                <td className="px-4 py-3 text-steel">{line.warnings.length > 0 ? line.warnings.join("; ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </LedgerDataTable>

        <JournalPreview preview={preview} />
        <MatchingSummary preview={preview} />
      </div>
    </LedgerSection>
  );
}

function MatchingSummary({ preview }: { preview: PurchaseReceiptAccountingPreview }) {
  return (
    <LedgerPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Bill/receipt matching</h3>
          <p className="mt-1 text-sm text-steel">Operational comparison only. No purchase receipt journal is posted.</p>
        </div>
        <LedgerStatusBadge tone="neutral">{preview.matchingSummary.sourceType}</LedgerStatusBadge>
      </div>
      <div className="mt-3">
        <LedgerMetadataRow
          items={[
            { label: "Matched quantity", value: <LedgerMoney>{formatInventoryQuantity(preview.matchingSummary.matchedQuantity)}</LedgerMoney> },
            { label: "Unmatched quantity", value: <LedgerMoney>{formatInventoryQuantity(preview.matchingSummary.unmatchedQuantity)}</LedgerMoney> },
            { label: "Unmatched receipt value", value: <LedgerMoney>{formatInventoryQuantity(preview.unmatchedReceiptValue)}</LedgerMoney> },
          ]}
        />
      </div>
      {preview.matchingSummary.billLines.length > 0 ? (
        <div className="mt-4">
          <LedgerDataTable minWidth="720px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Bill line</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2 text-right">Billed qty</th>
                <th className="px-3 py-2 text-right">Matched qty</th>
                <th className="px-3 py-2 text-right">Matched value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.matchingSummary.billLines.map((line) => (
                <tr key={line.lineId}>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2 text-steel">{line.account.code} {line.account.name}</td>
                  <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.billedQuantity)}</LedgerMoney></td>
                  <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.matchedQuantity)}</LedgerMoney></td>
                  <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.matchedValue)}</LedgerMoney></td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        </div>
      ) : null}
    </LedgerPanel>
  );
}

function JournalPreview({ preview }: { preview: PurchaseReceiptAccountingPreview }) {
  return (
    <LedgerPanel>
      <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-semibold text-ink">Preview journal lines</h3>
        <p className="text-xs text-steel">
          Debit {formatInventoryQuantity(preview.journal.totalDebit)} / Credit {formatInventoryQuantity(preview.journal.totalCredit)}
        </p>
      </div>
      <LedgerDataTable minWidth="720px">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-4 py-3">Line</th>
            <th className="px-4 py-3">Preview</th>
            <th className="px-4 py-3">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {preview.journal.lines.length > 0 ? (
            preview.journal.lines.map((line) => (
              <tr key={`${line.side}-${line.lineNumber}`}>
                <td className="px-4 py-3 font-mono text-xs">{line.lineNumber}</td>
                <td className="px-4 py-3 font-mono text-xs">{accountingPreviewLineDisplay(line)}</td>
                <td className="px-4 py-3 text-steel">{line.description}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-3 text-steel" colSpan={3}>
                No journal lines available until mappings and cost data are complete.
              </td>
            </tr>
          )}
        </tbody>
      </LedgerDataTable>
    </LedgerPanel>
  );
}

function PreviewList({ title, items, emptyText, tone }: { title: string; items: string[]; emptyText: string; tone: "amber" | "slate" }) {
  return (
    <LedgerPanel className={tone === "amber" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-steel"}>
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>{emptyText}</li>}
      </ul>
    </LedgerPanel>
  );
}

function stockDocumentStatusTone(status: string): LedgerStatusTone {
  if (status === "POSTED") return "success";
  if (status === "VOIDED") return "danger";
  if (status === "DRAFT") return "draft";
  return "neutral";
}

function clearingStatusTone(status: string): LedgerStatusTone {
  if (status === "MATCHED" || status === "RECONCILED") return "success";
  if (status === "VARIANCE" || status === "MISMATCHED") return "warning";
  return "neutral";
}
