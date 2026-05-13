import { StockMovementType } from "@prisma/client";

export const STOCK_MOVEMENT_IN_TYPES = new Set<StockMovementType>([
  StockMovementType.OPENING_BALANCE,
  StockMovementType.ADJUSTMENT_IN,
  StockMovementType.TRANSFER_IN,
  StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
]);

export const STOCK_MOVEMENT_OUT_TYPES = new Set<StockMovementType>([
  StockMovementType.ADJUSTMENT_OUT,
  StockMovementType.TRANSFER_OUT,
  StockMovementType.SALES_ISSUE_PLACEHOLDER,
]);

export const STOCK_MOVEMENT_MVP_CREATE_TYPES = new Set<StockMovementType>([
  StockMovementType.OPENING_BALANCE,
]);

export function stockMovementDirection(type: StockMovementType): "IN" | "OUT" {
  if (STOCK_MOVEMENT_IN_TYPES.has(type)) {
    return "IN";
  }
  return "OUT";
}
