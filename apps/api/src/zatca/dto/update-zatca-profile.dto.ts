import { IsIn, IsOptional, IsString } from "class-validator";
import { ZatcaEnvironment, ZatcaRegistrationStatus } from "@prisma/client";

export class UpdateZatcaProfileDto {
  @IsOptional()
  @IsIn(Object.values(ZatcaEnvironment))
  environment?: ZatcaEnvironment;

  @IsOptional()
  @IsIn(Object.values(ZatcaRegistrationStatus))
  registrationStatus?: ZatcaRegistrationStatus;

  @IsOptional()
  @IsString()
  sellerName?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  companyIdType?: string;

  @IsOptional()
  @IsString()
  companyIdNumber?: string;

  @IsOptional()
  @IsString()
  buildingNumber?: string;

  @IsOptional()
  @IsString()
  streetName?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  additionalAddressNumber?: string;

  @IsOptional()
  @IsString()
  businessCategory?: string;
}
