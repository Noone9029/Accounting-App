import { IsIn, IsOptional, IsString } from "class-validator";
import { DocumentType, GeneratedDocumentStatus } from "@prisma/client";

export class GeneratedDocumentQueryDto {
  @IsOptional()
  @IsIn(Object.values(DocumentType))
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsIn(Object.values(GeneratedDocumentStatus))
  status?: GeneratedDocumentStatus;
}
