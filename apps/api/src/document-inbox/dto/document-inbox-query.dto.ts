import { DocumentInboxSourceType, DocumentInboxStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class DocumentInboxQueryDto {
  @IsOptional()
  @IsEnum(DocumentInboxStatus)
  status?: DocumentInboxStatus;

  @IsOptional()
  @IsEnum(DocumentInboxSourceType)
  sourceType?: DocumentInboxSourceType;
}
