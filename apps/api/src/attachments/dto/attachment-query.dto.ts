import { AttachmentLinkedEntityType, AttachmentStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

export class AttachmentQueryDto {
  @IsOptional()
  @IsEnum(AttachmentLinkedEntityType)
  linkedEntityType?: AttachmentLinkedEntityType;

  @IsOptional()
  @IsUUID()
  linkedEntityId?: string;

  @IsOptional()
  @IsEnum(AttachmentStatus)
  status?: AttachmentStatus;
}
