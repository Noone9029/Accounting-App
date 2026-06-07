import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class SalesInventoryReturnLineDto {
  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsUUID()
  sourceSalesInvoiceLineId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceCreditNoteLineId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceDeliveryNoteLineId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceSalesStockIssueLineId?: string | null;

  @IsOptional()
  @IsUUID()
  warehouseId?: string | null;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
