import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { DocumentFxContextDto } from "../../foreign-exchange/dto/document-fx-context.dto";
import { CashExpenseLineDto } from "./cash-expense-line.dto";

export class CreateCashExpenseDto extends DocumentFxContextDto {
  @IsOptional()
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  paidThroughAccountId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CashExpenseLineDto)
  lines!: CashExpenseLineDto[];
}
