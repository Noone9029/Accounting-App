import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";
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

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
