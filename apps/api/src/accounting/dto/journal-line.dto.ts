import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class JournalLineDto {
  @IsString()
  accountId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  debit!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  credit!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  transactionDebit?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  transactionCredit?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,8" })
  exchangeRate?: string;

  @IsOptional()
  @IsUUID()
  rateSnapshotId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  fxRoundingComponentCount?: number;

  @IsOptional()
  @IsString()
  taxRateId?: string;

  @IsOptional()
  @IsUUID()
  costCenterId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;
}
