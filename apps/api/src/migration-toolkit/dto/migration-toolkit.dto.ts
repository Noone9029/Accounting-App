import { ImportEntityType } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateImportJobDto {
  @IsEnum(ImportEntityType)
  entityType!: ImportEntityType;

  @IsString()
  @MaxLength(180)
  filename!: string;

  @IsString()
  csvContent!: string;

  @IsOptional()
  @IsBoolean()
  previewOnly?: boolean;
}

export class CommitImportJobDto {
  @IsBoolean()
  confirmReviewed!: boolean;
}
