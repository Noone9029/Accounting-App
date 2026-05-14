import { formatUnits, parseDecimalToUnits } from "./money";
import type {
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  InventoryAccountingPreviewJournalLine,
  InventoryAccountingSettings,
  InventoryBalance,
  InventoryLowStockStatus,
  InventoryMovementSummaryRow,
  InventoryPurchasePostingMode,
  InventorySettings,
  InventorySourceProgressStatus,
  InventoryStockValuationRow,
  InventoryValuationMethod,
  PurchaseReceiptMatchingStatus,
  PurchaseReceiptStatus,
  SalesStockIssueAccountingPreview,
  SalesStockIssueStatus,
  StockMovementType,
  WarehouseStatus,
  WarehouseTransferStatus,
} from "./types";

export function warehouseStatusLabel(status: WarehouseStatus): string {
  return status === "ACTIVE" ? "Active" : "Archived";
}

export function warehouseStatusBadgeClass(status: WarehouseStatus): string {
  return status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
}

export function stockMovementTypeLabel(type: StockMovementType): string {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stockMovementDirection(type: StockMovementType): "IN" | "OUT" {
  return stockMovementInTypes.has(type) ? "IN" : "OUT";
}

export function stockMovementDirectionLabel(type: StockMovementType): string {
  return stockMovementDirection(type) === "IN" ? "In" : "Out";
}

export function formatInventoryQuantity(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "0.0000";
  }
  const units = typeof value === "number" ? Math.round(value * 10000) : parseDecimalToUnits(value);
  return formatUnits(units);
}

export function inventoryBalanceDisplay(balance: Pick<InventoryBalance, "quantityOnHand" | "averageUnitCost" | "inventoryValue">): {
  quantity: string;
  averageUnitCost: string;
  inventoryValue: string;
} {
  return {
    quantity: formatInventoryQuantity(balance.quantityOnHand),
    averageUnitCost: balance.averageUnitCost === null ? "Valuation pending" : formatInventoryQuantity(balance.averageUnitCost),
    inventoryValue: balance.inventoryValue === null ? "Valuation pending" : formatInventoryQuantity(balance.inventoryValue),
  };
}

export function inventoryOperationalWarning(): string {
  return "Inventory movements are operational only in this MVP and do not post GL, COGS, inventory asset, or financial statement entries.";
}

export function inventoryAccountingWarnings(): string[] {
  return [
    "Enabling this only allows manual COGS posting. It does not auto-post inventory journals.",
    "Purchase receipt GL posting is not enabled yet.",
    "COGS posting requires an explicit manual post action after review.",
    "Accountant review required before enabling financial inventory postings.",
  ];
}

export function accountingPreviewCanPost(preview: { canPost: boolean; previewOnly?: boolean }): boolean {
  return preview.canPost === true;
}

export function accountingPreviewLineDisplay(line: InventoryAccountingPreviewJournalLine): string {
  const side = line.side === "DEBIT" ? "Dr" : "Cr";
  const account = line.accountCode ? `${line.accountCode} ${line.accountName}` : line.accountName;
  return `${side} ${account} ${formatInventoryQuantity(line.amount)}`;
}

export function missingInventoryAccountMappingWarnings(
  settings: Pick<
    InventoryAccountingSettings,
    "inventoryAssetAccountId" | "cogsAccountId" | "inventoryClearingAccountId" | "inventoryAdjustmentGainAccountId" | "inventoryAdjustmentLossAccountId"
  >,
): string[] {
  const warnings: string[] = [];
  if (!settings.inventoryAssetAccountId) warnings.push("Inventory asset account mapping is missing.");
  if (!settings.cogsAccountId) warnings.push("COGS account mapping is missing.");
  if (!settings.inventoryClearingAccountId) warnings.push("Inventory clearing account mapping is missing.");
  if (!settings.inventoryAdjustmentGainAccountId) warnings.push("Inventory adjustment gain account mapping is not set.");
  if (!settings.inventoryAdjustmentLossAccountId) warnings.push("Inventory adjustment loss account mapping is not set.");
  return warnings;
}

export function purchaseReceiptPostingModeLabel(mode: InventoryPurchasePostingMode): string {
  return mode === "PREVIEW_ONLY" ? "Preview only" : "Disabled";
}

export function purchaseReceiptGlPostingWarning(): string {
  return "Purchase receipt GL posting is not enabled yet.";
}

export function receiptMatchingStatusLabel(status: PurchaseReceiptMatchingStatus): string {
  switch (status) {
    case "NOT_RECEIVED":
      return "Not received";
    case "PARTIALLY_RECEIVED":
      return "Partially received";
    case "FULLY_RECEIVED":
      return "Fully received";
    case "OVER_RECEIVED_WARNING":
      return "Over received";
  }
}

export function receiptMatchingStatusBadgeClass(status: PurchaseReceiptMatchingStatus): string {
  switch (status) {
    case "NOT_RECEIVED":
      return "bg-slate-100 text-slate-700";
    case "PARTIALLY_RECEIVED":
      return "bg-amber-50 text-amber-700";
    case "FULLY_RECEIVED":
      return "bg-emerald-50 text-emerald-700";
    case "OVER_RECEIVED_WARNING":
      return "bg-rose-50 text-rose-700";
  }
}

export function cogsPostingStatus(preview: Pick<SalesStockIssueAccountingPreview, "alreadyPosted" | "alreadyReversed">): "Not posted" | "Posted" | "Reversed" {
  if (preview.alreadyReversed) return "Reversed";
  if (preview.alreadyPosted) return "Posted";
  return "Not posted";
}

export function canShowPostCogsAction(
  preview: Pick<SalesStockIssueAccountingPreview, "canPost" | "alreadyPosted">,
  hasPermission: boolean,
): boolean {
  return hasPermission && preview.canPost === true && preview.alreadyPosted !== true;
}

export function canShowReverseCogsAction(
  preview: Pick<SalesStockIssueAccountingPreview, "alreadyPosted" | "alreadyReversed">,
  hasPermission: boolean,
): boolean {
  return hasPermission && preview.alreadyPosted === true && preview.alreadyReversed !== true;
}

export function cogsPostingFinancialReportWarning(): string {
  return "This creates accounting journal entries and affects financial reports.";
}

export function inventoryValuationMethodLabel(method: InventoryValuationMethod): string {
  return method === "MOVING_AVERAGE" ? "Moving average" : "FIFO placeholder";
}

export function inventorySettingsLabel(settings: Pick<InventorySettings, "valuationMethod" | "allowNegativeStock" | "trackInventoryValue">): string {
  const valueTracking = settings.trackInventoryValue ? "value tracking on" : "value tracking off";
  const negativeStock = settings.allowNegativeStock ? "negative stock allowed" : "negative stock blocked";
  return `${inventoryValuationMethodLabel(settings.valuationMethod)}, ${negativeStock}, ${valueTracking}`;
}

export function inventorySettingsWarnings(settings: Pick<InventorySettings, "valuationMethod" | "allowNegativeStock">): string[] {
  const warnings = [inventoryOperationalWarning()];
  if (settings.valuationMethod === "FIFO_PLACEHOLDER") {
    warnings.push("FIFO can be saved as a placeholder, but reports still use moving-average estimates.");
  }
  if (settings.allowNegativeStock) {
    warnings.push("Allowing negative stock is risky and should be reviewed before enabling.");
  }
  return warnings;
}

export function inventoryValuationWarningText(row: Pick<InventoryStockValuationRow, "warnings">): string {
  return row.warnings.length > 0 ? row.warnings.join("; ") : "Cost data complete";
}

export function inventoryReportValueDisplay(value: string | null): string {
  return value === null ? "Valuation pending" : formatInventoryQuantity(value);
}

export function lowStockStatusLabel(status: InventoryLowStockStatus): string {
  return status === "AT_REORDER_POINT" ? "At reorder point" : "Below reorder point";
}

export function lowStockStatusBadgeClass(status: InventoryLowStockStatus): string {
  return status === "AT_REORDER_POINT" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
}

export function movementSummaryNetChange(row: Pick<InventoryMovementSummaryRow, "inboundQuantity" | "outboundQuantity">): string {
  return formatUnits(parseDecimalToUnits(row.inboundQuantity) - parseDecimalToUnits(row.outboundQuantity));
}

export function inventoryAdjustmentStatusLabel(status: InventoryAdjustmentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function inventoryAdjustmentStatusBadgeClass(status: InventoryAdjustmentStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-amber-50 text-amber-700";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-slate-100 text-slate-600";
  }
}

export function inventoryAdjustmentTypeLabel(type: InventoryAdjustmentType): string {
  return type === "INCREASE" ? "Increase" : "Decrease";
}

export function canEditInventoryAdjustment(status: InventoryAdjustmentStatus): boolean {
  return status === "DRAFT";
}

export function canApproveInventoryAdjustment(status: InventoryAdjustmentStatus): boolean {
  return status === "DRAFT";
}

export function canVoidInventoryAdjustment(status: InventoryAdjustmentStatus): boolean {
  return status === "DRAFT" || status === "APPROVED";
}

export function warehouseTransferStatusLabel(status: WarehouseTransferStatus): string {
  return status === "POSTED" ? "Posted" : "Voided";
}

export function warehouseTransferStatusBadgeClass(status: WarehouseTransferStatus): string {
  return status === "POSTED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
}

export function canVoidWarehouseTransfer(status: WarehouseTransferStatus): boolean {
  return status === "POSTED";
}

export function stockDocumentStatusLabel(status: PurchaseReceiptStatus | SalesStockIssueStatus): string {
  return status === "POSTED" ? "Posted" : "Voided";
}

export function stockDocumentStatusBadgeClass(status: PurchaseReceiptStatus | SalesStockIssueStatus): string {
  return status === "POSTED" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
}

export function canVoidPostedStockDocument(status: PurchaseReceiptStatus | SalesStockIssueStatus): boolean {
  return status === "POSTED";
}

export function inventoryProgressStatusLabel(status: InventorySourceProgressStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not started";
    case "PARTIAL":
      return "Partial";
    case "COMPLETE":
      return "Complete";
  }
}

export function inventoryProgressStatusBadgeClass(status: InventorySourceProgressStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "bg-slate-100 text-slate-700";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700";
    case "COMPLETE":
      return "bg-emerald-50 text-emerald-700";
  }
}

export function purchaseReceiptSourceTypeLabel(sourceType: "purchaseOrder" | "purchaseBill" | "standalone"): string {
  switch (sourceType) {
    case "purchaseOrder":
      return "Purchase order";
    case "purchaseBill":
      return "Purchase bill";
    case "standalone":
      return "Standalone";
  }
}

export function hasRemainingInventoryQuantity(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }
  return parseDecimalToUnits(String(value)) > 0;
}

export function validateWarehouseTransferInput(input: {
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: string;
}): string | null {
  if (!input.itemId) {
    return "Select an inventory-tracked item.";
  }
  if (!input.fromWarehouseId) {
    return "Select the source warehouse.";
  }
  if (!input.toWarehouseId) {
    return "Select the destination warehouse.";
  }
  if (input.fromWarehouseId === input.toWarehouseId) {
    return "Source and destination warehouses must be different.";
  }
  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0) {
    return "Transfer quantity must be greater than zero.";
  }
  return null;
}

export function validatePurchaseReceiptInput(input: { warehouseId: string; lineCount: number }): string | null {
  if (!input.warehouseId) {
    return "Select a warehouse.";
  }
  if (input.lineCount <= 0) {
    return "Enter at least one quantity to receive.";
  }
  return null;
}

export function validateSalesStockIssueInput(input: { salesInvoiceId: string; warehouseId: string; lineCount: number }): string | null {
  if (!input.salesInvoiceId) {
    return "Select a finalized sales invoice.";
  }
  if (!input.warehouseId) {
    return "Select a warehouse.";
  }
  if (input.lineCount <= 0) {
    return "Enter at least one quantity to issue.";
  }
  return null;
}

const stockMovementInTypes = new Set<StockMovementType>([
  "OPENING_BALANCE",
  "ADJUSTMENT_IN",
  "TRANSFER_IN",
  "PURCHASE_RECEIPT_PLACEHOLDER",
]);
