import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class PurchaseReturnLineDto {
  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  unitCost?: string | null;

  @IsOptional()
  @IsUUID()
  sourcePurchaseBillLineId?: string | null;

  @IsOptional()
  @IsUUID()
  sourcePurchaseReceiptLineId?: string | null;

  @IsOptional()
  @IsUUID()
  sourcePurchaseOrderLineId?: string | null;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
