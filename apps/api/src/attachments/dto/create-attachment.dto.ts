import { AttachmentLinkedEntityType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateAttachmentDto {
  @IsEnum(AttachmentLinkedEntityType)
  linkedEntityType!: AttachmentLinkedEntityType;

  @IsUUID()
  linkedEntityId!: string;

  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsString()
  contentBase64!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
