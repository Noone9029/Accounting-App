import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class FxReportQueryDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_PATTERN)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_PATTERN)
  to?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim().toUpperCase() : value)
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  transactionCurrency?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsString()
  @IsIn(["json", "csv"])
  format?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit?: number;
}
