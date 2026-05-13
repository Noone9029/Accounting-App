import { formatUnits, parseDecimalToUnits } from "./money";
import type {
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  InventoryBalance,
  InventoryLowStockStatus,
  InventoryMovementSummaryRow,
  InventorySettings,
  InventoryStockValuationRow,
  InventoryValuationMethod,
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

const stockMovementInTypes = new Set<StockMovementType>([
  "OPENING_BALANCE",
  "ADJUSTMENT_IN",
  "TRANSFER_IN",
  "PURCHASE_RECEIPT_PLACEHOLDER",
]);
