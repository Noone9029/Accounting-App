import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { SalesInventoryReturnLineDto } from "./sales-inventory-return-line.dto";

export class CreateSalesInventoryReturnDto {
  @IsUUID()
  customerId!: string;

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
  sourceSalesInvoiceId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceCreditNoteId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceDeliveryNoteId?: string | null;

  @IsOptional()
  @IsUUID()
  sourceSalesStockIssueId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesInventoryReturnLineDto)
  lines!: SalesInventoryReturnLineDto[];
}
