import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsDecimal, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

export class PurchaseReceiptLineDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderLineId?: string;

  @IsOptional()
  @IsUUID()
  purchaseBillLineId?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  unitCost?: string | null;
}

export class CreatePurchaseReceiptDto {
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsOptional()
  @IsUUID()
  purchaseBillId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsUUID()
  warehouseId!: string;

  @IsDateString()
  receiptDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseReceiptLineDto)
  lines!: PurchaseReceiptLineDto[];
}
