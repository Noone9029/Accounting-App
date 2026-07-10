import { DimensionStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class CostCenterQueryDto {
  @IsOptional()
  @IsEnum(DimensionStatus)
  status?: DimensionStatus;
}
