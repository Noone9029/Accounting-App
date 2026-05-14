import { IsOptional, IsString } from "class-validator";

export class UpdateAttachmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
