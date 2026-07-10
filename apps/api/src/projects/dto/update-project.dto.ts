import { PartialType } from "@nestjs/mapped-types";
import { DimensionStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { CreateProjectDto } from "./create-project.dto";

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsEnum(DimensionStatus)
  status?: DimensionStatus;
}
