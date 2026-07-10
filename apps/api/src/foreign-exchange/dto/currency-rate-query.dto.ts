import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Matches } from "class-validator";
import { SUPPORTED_CURRENCY_CODES } from "@ledgerbyte/shared";

export class CurrencyRateQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn(SUPPORTED_CURRENCY_CODES)
  transactionCurrency?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  rateDate?: string;
}
