import { formatUnits, parseDecimalToUnits } from "./money";
import type {
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  InventoryAccountingPreviewJournalLine,
  InventoryAccountingSettings,
  InventoryBalance,
  InventoryClearingReportStatus,
  InventoryClearingVarianceRow,
  InventoryBatchStatus,
  InventoryBinLocationStatus,
  InventoryBinLocationType,
  InventoryFifoPreviewWarningType,
  InventorySerialNumberStatus,
  LandedCostAllocationMethod,
  LandedCostCategory,
  LandedCostSourceType,
  InventoryLowStockStatus,
  InventoryMovementSummaryRow,
  InventoryPurchasePostingMode,
  InventorySettings,
  InventorySourceProgressStatus,
  InventoryStockValuationRow,
  InventoryValuationVarianceSeverity,
  InventoryValuationVarianceSourceType,
  InventoryValuationVarianceStatus,
  InventoryValuationVarianceType,
  InventoryValuationMethod,
  InventoryVarianceProposalAccountingPreview,
  InventoryVarianceProposalStatus,
  InventoryVarianceReason,
  ItemStatus,
  ItemTrackingMode,
  ItemType,
  PurchaseBillInventoryPostingMode,
  PurchaseReceiptAccountingPreview,
  PurchaseReceiptPostingReadiness,
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
  if (type === "PURCHASE_RETURN_OUT") return "Purchase return out";
  if (type === "SALES_RETURN_IN") return "Sales return in";
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
  return "Inventory quantities are operational in this beta. Financial inventory journals are created only through the explicit manual posting actions shown on eligible pages.";
}

export function itemTypeLabel(type: ItemType): string {
  return type === "PRODUCT" ? "Product" : "Service";
}

export function itemStatusLabel(status: ItemStatus): string {
  return status === "ACTIVE" ? "Active" : "Disabled";
}

export function itemStatusBadgeClass(status: ItemStatus): string {
  return status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
}

export function itemTrackingModeLabel(mode: ItemTrackingMode | null | undefined): string {
  switch (mode ?? "NONE") {
    case "NONE":
      return "None";
    case "SERIAL":
      return "Serial";
    case "BATCH":
      return "Batch";
    case "SERIAL_AND_BATCH":
      return "Serial and batch";
  }
}

export function inventoryTrackingSafeHelperText(): string {
  return "Tracking settings add operational traceability. They do not change historical inventory valuation, FIFO preview, COGS, journals, VAT, or financial statements.";
}

export function inventoryTraceabilityUrl(itemId: string): string {
  return `/inventory/traceability/items/${itemId}`;
}

export function inventoryBinLocationTypeLabel(type: InventoryBinLocationType): string {
  return titleCaseInventoryValue(type);
}

export function inventoryBinLocationStatusLabel(status: InventoryBinLocationStatus): string {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

export function inventoryBatchStatusLabel(status: InventoryBatchStatus): string {
  return titleCaseInventoryValue(status);
}

export function inventorySerialNumberStatusLabel(status: InventorySerialNumberStatus): string {
  return titleCaseInventoryValue(status);
}

export function inventoryTraceabilityStatusBadgeClass(status: string): string {
  if (status === "ACTIVE" || status === "AVAILABLE") return "bg-emerald-50 text-emerald-700";
  if (status === "INACTIVE" || status === "CLOSED" || status === "ISSUED") return "bg-slate-100 text-slate-700";
  if (status === "EXPIRED" || status === "LOST" || status === "SCRAPPED") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function titleCaseInventoryValue(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function inventoryAccountingWarnings(): string[] {
  return [
    "Enabling this only allows manual COGS and compatible receipt asset posting. It does not auto-post inventory journals.",
    "Purchase receipt GL posting requires an explicit manual post action after review.",
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
  return "Purchase receipt GL posting requires an explicit manual post action after review.";
}

export function purchaseReceiptPostingReadinessLabel(readiness: Pick<PurchaseReceiptPostingReadiness, "ready">): string {
  return readiness.ready ? "Ready for future implementation" : "Not ready";
}

export function purchaseReceiptPostingReadinessBadgeClass(readiness: Pick<PurchaseReceiptPostingReadiness, "ready">): string {
  return readiness.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
}

export function purchaseReceiptPostingBlockingReasonDisplay(reasons: string[]): string {
  return reasons.length > 0 ? reasons.join("; ") : "No readiness blockers.";
}

export function purchaseReceiptPostingWarningDisplay(warnings: string[]): string {
  return warnings.length > 0 ? warnings.join("; ") : "No warnings.";
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

export function receiptAssetPostingStatus(
  preview: Pick<PurchaseReceiptAccountingPreview, "alreadyPosted" | "alreadyReversed">,
): "Not posted" | "Posted" | "Reversed" {
  if (preview.alreadyReversed) return "Reversed";
  if (preview.alreadyPosted) return "Posted";
  return "Not posted";
}

export function canShowPostReceiptAssetAction(
  preview: Pick<PurchaseReceiptAccountingPreview, "canPost" | "alreadyPosted">,
  hasPermission: boolean,
): boolean {
  return hasPermission && preview.canPost === true && preview.alreadyPosted !== true;
}

export function canShowReverseReceiptAssetAction(
  preview: Pick<PurchaseReceiptAccountingPreview, "alreadyPosted" | "alreadyReversed">,
  hasPermission: boolean,
): boolean {
  return hasPermission && preview.alreadyPosted === true && preview.alreadyReversed !== true;
}

export function receiptAssetPostingFinancialReportWarning(): string {
  return "This creates accounting journal entries and affects inventory asset and clearing balances.";
}

export function linkedPurchaseBillModeWarning(mode: PurchaseBillInventoryPostingMode | null | undefined): string {
  return mode === "INVENTORY_CLEARING"
    ? "Linked bill uses inventory clearing mode."
    : "Purchase receipt asset posting requires a finalized INVENTORY_CLEARING purchase bill.";
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

export function inventoryClearingStatusLabel(status: InventoryClearingReportStatus): string {
  switch (status) {
    case "MATCHED":
      return "Matched";
    case "PARTIAL":
      return "Partial";
    case "VARIANCE":
      return "Variance";
    case "BILL_WITHOUT_RECEIPT_POSTING":
      return "Bill without receipt posting";
    case "RECEIPT_WITHOUT_CLEARING_BILL":
      return "Receipt without clearing bill";
    case "DIRECT_MODE_EXCLUDED":
      return "Direct mode excluded";
  }
}

export function inventoryClearingStatusBadgeClass(status: InventoryClearingReportStatus): string {
  switch (status) {
    case "MATCHED":
      return "bg-emerald-50 text-emerald-700";
    case "PARTIAL":
      return "bg-amber-50 text-amber-700";
    case "VARIANCE":
    case "BILL_WITHOUT_RECEIPT_POSTING":
    case "RECEIPT_WITHOUT_CLEARING_BILL":
      return "bg-rose-50 text-rose-700";
    case "DIRECT_MODE_EXCLUDED":
      return "bg-slate-100 text-slate-700";
  }
}

export function inventoryClearingAmountDisplay(value: string | number | null | undefined): string {
  return formatInventoryQuantity(value);
}

export function inventoryClearingVarianceReasonLabel(reason: string | null | undefined): string {
  return reason && reason.trim().length > 0 ? reason : "No variance reason.";
}

export function inventoryClearingReportUrl(filters: { purchaseBillId?: string | null; purchaseReceiptId?: string | null; status?: InventoryClearingReportStatus | null }): string {
  const query = new URLSearchParams();
  if (filters.purchaseBillId) query.set("purchaseBillId", filters.purchaseBillId);
  if (filters.purchaseReceiptId) query.set("purchaseReceiptId", filters.purchaseReceiptId);
  if (filters.status) query.set("status", filters.status);
  const suffix = query.toString();
  return `/inventory/reports/clearing-reconciliation${suffix ? `?${suffix}` : ""}`;
}

export function inventoryValuationVarianceTypeLabel(type: InventoryValuationVarianceType): string {
  switch (type) {
    case "PRICE_VARIANCE":
      return "Price variance";
    case "QUANTITY_VARIANCE":
      return "Quantity variance";
    case "RECEIPT_WITHOUT_BILL":
      return "Receipt without bill";
    case "BILL_WITHOUT_RECEIPT":
      return "Bill without receipt";
    case "OVER_RECEIVED_VALUE":
      return "Over received value";
    case "OVER_BILLED_VALUE":
      return "Over billed value";
    case "RETURN_PENDING_CREDIT":
      return "Return pending credit";
    case "REVIEW_REQUIRED":
      return "Review required";
  }
}

export function inventoryValuationVarianceSeverityLabel(severity: InventoryValuationVarianceSeverity): string {
  if (severity === "CRITICAL") return "Critical";
  if (severity === "HIGH") return "High";
  if (severity === "MEDIUM") return "Medium";
  return "Low";
}

export function inventoryValuationVarianceSeverityBadgeClass(severity: InventoryValuationVarianceSeverity): string {
  if (severity === "CRITICAL") return "bg-rose-50 text-rose-700";
  if (severity === "HIGH") return "bg-amber-50 text-amber-700";
  if (severity === "MEDIUM") return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-700";
}

export function inventoryValuationVarianceStatusLabel(status: InventoryValuationVarianceStatus): string {
  if (status === "PREVIEW_ONLY") return "Preview only";
  if (status === "NEEDS_ACCOUNTANT_REVIEW") return "Needs accountant review";
  if (status === "NEEDS_MATCHING_REVIEW") return "Needs matching review";
  if (status === "NEEDS_RETURN_REVIEW") return "Needs return review";
  return "Ready for policy decision";
}

export function inventoryValuationVarianceSourceTypeLabel(sourceType: InventoryValuationVarianceSourceType): string {
  if (sourceType === "purchaseOrder") return "Purchase order";
  if (sourceType === "purchaseBill") return "Purchase bill";
  if (sourceType === "purchaseReceipt") return "Purchase receipt";
  if (sourceType === "purchaseReturn") return "Purchase return";
  return "Matching review";
}

export function inventoryValuationVarianceAmountDisplay(value: string | number | null | undefined): string {
  return formatInventoryQuantity(value);
}

export function inventoryValuationVariancePreviewUrl(filters: {
  purchaseReceiptId?: string | null;
  purchaseBillId?: string | null;
  matchingReviewId?: string | null;
  sourceType?: InventoryValuationVarianceSourceType | null;
  search?: string | null;
}): string {
  const query = new URLSearchParams();
  if (filters.purchaseReceiptId) query.set("purchaseReceiptId", filters.purchaseReceiptId);
  if (filters.purchaseBillId) query.set("purchaseBillId", filters.purchaseBillId);
  if (filters.matchingReviewId) query.set("matchingReviewId", filters.matchingReviewId);
  if (filters.sourceType) query.set("sourceType", filters.sourceType);
  if (filters.search) query.set("search", filters.search);
  const suffix = query.toString();
  return `/inventory/valuation-variances${suffix ? `?${suffix}` : ""}`;
}

export function landedCostCategoryLabel(category: LandedCostCategory): string {
  switch (category) {
    case "FREIGHT":
      return "Freight";
    case "CUSTOMS_DUTY":
      return "Customs duty";
    case "INSURANCE":
      return "Insurance";
    case "HANDLING":
      return "Handling";
    case "BROKERAGE":
      return "Brokerage";
    case "STORAGE":
      return "Storage";
    case "OTHER":
      return "Other";
  }
}

export function landedCostAllocationMethodLabel(method: LandedCostAllocationMethod): string {
  switch (method) {
    case "BY_VALUE":
      return "By value";
    case "BY_QUANTITY":
      return "By quantity";
    case "EQUAL":
      return "Equal";
    case "MANUAL":
      return "Manual";
  }
}

export function landedCostSourceTypeLabel(sourceType: LandedCostSourceType): string {
  switch (sourceType) {
    case "PURCHASE_RECEIPT":
      return "Purchase receipt";
    case "PURCHASE_BILL":
      return "Purchase bill";
    case "PURCHASE_ORDER":
      return "Purchase order";
  }
}

export function landedCostPreviewUrl(filters: { sourceType?: LandedCostSourceType | null; sourceId?: string | null }): string {
  const query = new URLSearchParams();
  if (filters.sourceType) query.set("sourceType", filters.sourceType);
  if (filters.sourceId) query.set("sourceId", filters.sourceId);
  const suffix = query.toString();
  return `/inventory/landed-cost${suffix ? `?${suffix}` : ""}`;
}

export function inventoryFifoPreviewSafeHelperText(): string {
  return "FIFO preview reconstructs possible cost layers from existing inventory movements. It is read-only and does not change inventory valuation, moving average, COGS, journals, VAT, ZATCA, AP, AR, financial statements, source documents, or stock movements.";
}

export function inventoryFifoPreviewUrl(filters: { itemId?: string | null; warehouseId?: string | null; asOfDate?: string | null }): string {
  const query = new URLSearchParams();
  if (filters.itemId) query.set("itemId", filters.itemId);
  if (filters.warehouseId) query.set("warehouseId", filters.warehouseId);
  if (filters.asOfDate) query.set("asOfDate", filters.asOfDate);
  const suffix = query.toString();
  return `/inventory/fifo-preview${suffix ? `?${suffix}` : ""}`;
}

export function inventoryFifoPreviewWarningLabel(type: InventoryFifoPreviewWarningType): string {
  switch (type) {
    case "MISSING_UNIT_COST":
      return "Missing unit cost";
    case "NEGATIVE_LAYER_QUANTITY":
      return "Negative layer quantity";
    case "INSUFFICIENT_LAYER_QUANTITY":
      return "Insufficient layer quantity";
    case "UNSUPPORTED_TRANSFER_SHAPE":
      return "Unsupported transfer shape";
    case "UNTRACEABLE_PURCHASE_RETURN_COST":
      return "Untraceable purchase return cost";
    case "UNTRACEABLE_SALES_RETURN_COST":
      return "Untraceable sales return cost";
    case "MIXED_WAREHOUSE_SCOPE":
      return "Mixed warehouse scope";
    case "NO_MOVEMENTS":
      return "No movements";
    case "PREVIEW_ONLY_NOT_ACCOUNTING_METHOD":
      return "Preview only";
  }
}

export function inventoryFifoPreviewWarningBadgeClass(type: InventoryFifoPreviewWarningType): string {
  if (type === "INSUFFICIENT_LAYER_QUANTITY" || type === "NEGATIVE_LAYER_QUANTITY") {
    return "bg-rose-50 text-rose-700";
  }
  if (type === "PREVIEW_ONLY_NOT_ACCOUNTING_METHOD" || type === "NO_MOVEMENTS") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-amber-50 text-amber-700";
}

export function inventoryVarianceProposalStatusLabel(status: InventoryVarianceProposalStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "APPROVED":
      return "Approved";
    case "POSTED":
      return "Posted";
    case "REVERSED":
      return "Reversed";
    case "VOIDED":
      return "Voided";
  }
}

export function inventoryVarianceProposalStatusBadgeClass(status: InventoryVarianceProposalStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "PENDING_APPROVAL":
      return "bg-amber-50 text-amber-700";
    case "APPROVED":
      return "bg-sky-50 text-sky-700";
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "REVERSED":
      return "bg-violet-50 text-violet-700";
    case "VOIDED":
      return "bg-rose-50 text-rose-700";
  }
}

export function inventoryVarianceReasonLabel(reason: InventoryVarianceReason): string {
  switch (reason) {
    case "PRICE_DIFFERENCE":
      return "Price difference";
    case "QUANTITY_DIFFERENCE":
      return "Quantity difference";
    case "RECEIPT_WITHOUT_CLEARING_BILL":
      return "Receipt without clearing bill";
    case "CLEARING_BILL_WITHOUT_RECEIPT":
      return "Clearing bill without receipt";
    case "REVERSED_RECEIPT_POSTING":
      return "Reversed receipt posting";
    case "MANUAL_ADJUSTMENT":
      return "Manual adjustment";
  }
}

export function canSubmitInventoryVarianceProposal(status: InventoryVarianceProposalStatus, hasPermission: boolean): boolean {
  return hasPermission && status === "DRAFT";
}

export function canApproveInventoryVarianceProposal(status: InventoryVarianceProposalStatus, hasPermission: boolean): boolean {
  return hasPermission && status === "PENDING_APPROVAL";
}

export function canPostInventoryVarianceProposal(
  preview: Pick<InventoryVarianceProposalAccountingPreview, "canPost" | "status" | "journalEntryId"> | null,
  hasPermission: boolean,
): boolean {
  return hasPermission && preview?.status === "APPROVED" && preview.canPost === true && !preview.journalEntryId;
}

export function canReverseInventoryVarianceProposal(status: InventoryVarianceProposalStatus, hasPermission: boolean): boolean {
  return hasPermission && status === "POSTED";
}

export function canVoidInventoryVarianceProposal(status: InventoryVarianceProposalStatus, hasPermission: boolean): boolean {
  return hasPermission && (status === "DRAFT" || status === "PENDING_APPROVAL" || status === "APPROVED");
}

export function inventoryVarianceProposalFinancialReportWarning(): string {
  return "Posting this proposal creates accounting journal entries and affects financial reports.";
}

export function inventoryVarianceProposalReasonFromClearingRow(row: Pick<InventoryClearingVarianceRow, "status" | "varianceReason" | "warnings">): InventoryVarianceReason {
  if (row.status === "BILL_WITHOUT_RECEIPT_POSTING") {
    return "CLEARING_BILL_WITHOUT_RECEIPT";
  }
  if (row.status === "RECEIPT_WITHOUT_CLEARING_BILL") {
    return "RECEIPT_WITHOUT_CLEARING_BILL";
  }
  if ([row.varianceReason, ...row.warnings].some((value) => value.toLowerCase().includes("reversed"))) {
    return "REVERSED_RECEIPT_POSTING";
  }
  if (row.status === "PARTIAL") {
    return "QUANTITY_DIFFERENCE";
  }
  return "PRICE_DIFFERENCE";
}

export function inventoryVarianceProposalCreateUrl(
  row: Pick<InventoryClearingVarianceRow, "status" | "varianceReason" | "warnings"> & {
    purchaseBill?: { id: string } | null;
    receipt?: { id: string } | null;
  },
): string {
  const query = new URLSearchParams();
  if (row.purchaseBill?.id) query.set("purchaseBillId", row.purchaseBill.id);
  if (row.receipt?.id) query.set("purchaseReceiptId", row.receipt.id);
  query.set("reason", inventoryVarianceProposalReasonFromClearingRow(row));
  const suffix = query.toString();
  return `/inventory/variance-proposals/new${suffix ? `?${suffix}` : ""}`;
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
  "SALES_RETURN_IN",
]);
