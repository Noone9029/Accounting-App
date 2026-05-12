import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { CashExpenseLineDto } from "./cash-expense-line.dto";

export class CreateCashExpenseDto {
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
  @Length(3, 3)
  currency?: string;

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
