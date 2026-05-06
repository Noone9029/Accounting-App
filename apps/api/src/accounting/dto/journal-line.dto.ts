import { IsDecimal, IsOptional, IsString } from "class-validator";

export class JournalLineDto {
  @IsString()
  accountId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  debit!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  credit!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,8" })
  exchangeRate?: string;

  @IsOptional()
  @IsString()
  taxRateId?: string;
}
