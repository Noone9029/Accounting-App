import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { DocumentFxContextDto } from "../../foreign-exchange/dto/document-fx-context.dto";
import { PurchaseDebitNoteLineDto } from "./purchase-debit-note-line.dto";

export class CreatePurchaseDebitNoteDto extends DocumentFxContextDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  originalBillId?: string | null;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseDebitNoteLineDto)
  lines!: PurchaseDebitNoteLineDto[];
}
