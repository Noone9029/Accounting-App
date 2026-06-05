import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { DeliveryNoteLineDto } from "./delivery-note-line.dto";

export class CreateDeliveryNoteDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string | null;

  @IsOptional()
  @IsString()
  reference?: string | null;

  @IsOptional()
  @IsUUID()
  relatedSalesInvoiceId?: string | null;

  @IsOptional()
  @IsUUID()
  relatedSalesQuoteId?: string | null;

  @IsOptional()
  @IsUUID()
  relatedSalesStockIssueId?: string | null;

  @IsOptional()
  @IsString()
  deliveryAddress?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  instructions?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteLineDto)
  lines!: DeliveryNoteLineDto[];
}
