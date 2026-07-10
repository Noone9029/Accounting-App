import { PartialType } from "@nestjs/mapped-types";
import { DimensionStatus } from "@prisma/client";
import { IsEnum, ValidateIf } from "class-validator";
import { CreateProjectDto } from "./create-project.dto";

export class UpdateProjectDto extends PartialType(CreateProjectDto, { skipNullProperties: false }) {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(DimensionStatus)
  status?: DimensionStatus;
}
