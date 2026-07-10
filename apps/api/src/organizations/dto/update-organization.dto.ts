import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Length } from "class-validator";
import { SUPPORTED_CURRENCY_CODES } from "@ledgerbyte/shared";

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

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

  @IsOptional()
  @IsString()
  tradeLicenseNumber?: string;

  @IsOptional()
  @IsString()
  uaeTrn?: string;

  @IsOptional()
  @IsString()
  uaeTin?: string;

  @IsOptional()
  @IsString()
  uaeVatRegistrationStatus?: string;

  @IsOptional()
  @IsString()
  uaeAddressLine1?: string;

  @IsOptional()
  @IsString()
  uaeAddressLine2?: string;

  @IsOptional()
  @IsString()
  uaeEmirate?: string;

  @IsOptional()
  @IsString()
  uaeBusinessActivity?: string;

  @IsOptional()
  @IsString()
  peppolParticipantId?: string;

  @IsOptional()
  @IsString()
  uaeAspSelected?: string;

  @IsOptional()
  @IsString()
  uaeAspOnboardingStatus?: string;
}
