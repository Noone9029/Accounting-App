import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { PurchaseDebitNoteLineDto } from "./purchase-debit-note-line.dto";

export class CreatePurchaseDebitNoteDto {
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
  @Length(3, 3)
  currency?: string;

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
