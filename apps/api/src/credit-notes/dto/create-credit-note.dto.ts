import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { DocumentFxContextDto } from "../../foreign-exchange/dto/document-fx-context.dto";
import { CreditNoteLineDto } from "./credit-note-line.dto";

export class CreateCreditNoteDto extends DocumentFxContextDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  originalInvoiceId?: string | null;

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
  @Type(() => CreditNoteLineDto)
  lines!: CreditNoteLineDto[];
}
