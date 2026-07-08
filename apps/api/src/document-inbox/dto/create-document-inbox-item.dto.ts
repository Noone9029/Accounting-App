import { DocumentInboxSourceType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateDocumentInboxItemDto {
  @IsUUID()
  attachmentId!: string;

  @IsOptional()
  @IsEnum(DocumentInboxSourceType)
  sourceType?: DocumentInboxSourceType;

  @IsString()
  @Length(1, 160)
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
