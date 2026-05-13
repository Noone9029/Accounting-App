import { formatUnits, parseDecimalToUnits } from "./money";
import type { InventoryBalance, StockMovementType, WarehouseStatus } from "./types";

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

const stockMovementInTypes = new Set<StockMovementType>([
  "OPENING_BALANCE",
  "ADJUSTMENT_IN",
  "TRANSFER_IN",
  "PURCHASE_RECEIPT_PLACEHOLDER",
]);
