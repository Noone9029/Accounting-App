import { CurrencyRateSource } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

export class DocumentFxContextDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}(?:\.\d{1,8})?$/, {
    message: "exchangeRate must be a positive plain decimal with up to eight decimal places.",
  })
  exchangeRate?: string;

  @IsOptional()
  @IsDateString()
  rateDate?: string;

  @IsOptional()
  @IsEnum(CurrencyRateSource)
  rateSource?: CurrencyRateSource;

  @IsOptional()
  @IsUUID()
  rateSnapshotId?: string | null;
}
