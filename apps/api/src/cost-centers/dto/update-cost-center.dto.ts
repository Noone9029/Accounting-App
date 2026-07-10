import { PartialType } from "@nestjs/mapped-types";
import { DimensionStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { CreateCostCenterDto } from "./create-cost-center.dto";

export class UpdateCostCenterDto extends PartialType(CreateCostCenterDto) {
  @IsOptional()
  @IsEnum(DimensionStatus)
  status?: DimensionStatus;
}
