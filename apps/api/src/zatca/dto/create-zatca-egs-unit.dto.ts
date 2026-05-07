import { IsIn, IsOptional, IsString } from "class-validator";
import { ZatcaEnvironment } from "@prisma/client";

export class CreateZatcaEgsUnitDto {
  @IsString()
  name!: string;

  @IsString()
  deviceSerialNumber!: string;

  @IsOptional()
  @IsIn(Object.values(ZatcaEnvironment))
  environment?: ZatcaEnvironment;

  @IsOptional()
  @IsString()
  solutionName?: string;
}
