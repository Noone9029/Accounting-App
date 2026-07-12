import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class RecurringTransactionLineDto {
  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsUUID()
  taxRateId?: string | null;

  @IsOptional()
  @IsUUID()
  costCenterId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsString()
  description!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  quantity?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  unitPrice?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  discountRate?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  debit?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  credit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
