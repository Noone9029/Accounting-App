import { IsIn, IsOptional, IsString } from "class-validator";
import { ZatcaEnvironment, ZatcaRegistrationStatus } from "@prisma/client";

export class UpdateZatcaEgsUnitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  deviceSerialNumber?: string;

  @IsOptional()
  @IsIn(Object.values(ZatcaEnvironment))
  environment?: ZatcaEnvironment;

  @IsOptional()
  @IsIn(Object.values(ZatcaRegistrationStatus))
  status?: ZatcaRegistrationStatus;

  @IsOptional()
  @IsString()
  solutionName?: string;

  @IsOptional()
  @IsString()
  csrPem?: string;
}
