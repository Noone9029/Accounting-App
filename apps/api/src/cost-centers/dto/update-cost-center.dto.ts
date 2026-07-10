import { PartialType } from "@nestjs/mapped-types";
import { DimensionStatus } from "@prisma/client";
import { IsEnum, ValidateIf } from "class-validator";
import { CreateCostCenterDto } from "./create-cost-center.dto";

export class UpdateCostCenterDto extends PartialType(CreateCostCenterDto, { skipNullProperties: false }) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(DimensionStatus)
  status?: DimensionStatus;
}
