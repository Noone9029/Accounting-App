import { IsOptional, IsString, Length } from "class-validator";

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
  @IsString()
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
