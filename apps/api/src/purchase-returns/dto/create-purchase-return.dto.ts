import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { PurchaseReturnLineDto } from "./purchase-return-line.dto";

export class CreatePurchaseReturnDto {
  @IsUUID()
  supplierId!: string;

  @IsDateString()
  returnDate!: string;

  @IsOptional()
  @IsString()
  reason?: string | null;

  @IsOptional()
  @IsString()
  reference?: string | null;

  @IsOptional()
  @IsUUID()
  sourcePurchaseBillId?: string | null;

  @IsOptional()
  @IsUUID()
  sourcePurchaseOrderId?: string | null;

  @IsOptional()
  @IsUUID()
  sourcePurchaseReceiptId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceMatchingReviewId?: string | null;

  @IsOptional()
  @IsUUID()
  relatedPurchaseDebitNoteId?: string | null;

  @IsOptional()
  @IsUUID()
  relatedSupplierRefundId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnLineDto)
  lines!: PurchaseReturnLineDto[];
}
