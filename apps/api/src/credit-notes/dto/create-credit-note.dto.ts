import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { CreditNoteLineDto } from "./credit-note-line.dto";

export class CreateCreditNoteDto {
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
  @Type(() => CreditNoteLineDto)
  lines!: CreditNoteLineDto[];
}
