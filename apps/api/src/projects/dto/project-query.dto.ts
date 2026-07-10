import { DimensionStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ProjectQueryDto {
  @IsOptional()
  @IsEnum(DimensionStatus)
  status?: DimensionStatus;
}
