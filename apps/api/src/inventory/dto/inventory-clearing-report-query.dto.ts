import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export const inventoryClearingReportStatuses = [
  "MATCHED",
  "PARTIAL",
  "VARIANCE",
  "BILL_WITHOUT_RECEIPT_POSTING",
  "RECEIPT_WITHOUT_CLEARING_BILL",
  "DIRECT_MODE_EXCLUDED",
] as const;

export type InventoryClearingReportStatus = (typeof inventoryClearingReportStatuses)[number];

export class InventoryClearingReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  purchaseBillId?: string;

  @IsOptional()
  @IsUUID()
  purchaseReceiptId?: string;

  @IsOptional()
  @IsIn(inventoryClearingReportStatuses)
  status?: InventoryClearingReportStatus;

  @IsOptional()
  @IsIn(["csv"])
  format?: "csv";
}
