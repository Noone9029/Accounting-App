import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Length } from "class-validator";
import { SUPPORTED_CURRENCY_CODES } from "@ledgerbyte/shared";

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  countryCode?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn(SUPPORTED_CURRENCY_CODES)
  baseCurrency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
