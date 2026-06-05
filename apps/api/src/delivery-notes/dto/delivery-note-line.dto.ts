import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class DeliveryNoteLineDto {
  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string | null;

  @IsOptional()
  @IsUUID()
  sourceSalesInvoiceLineId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceSalesQuoteLineId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceSalesStockIssueLineId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
