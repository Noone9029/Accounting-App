import { IsEmail, IsOptional, MaxLength } from "class-validator";

export class CreateApGeneratedDocumentEmailDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recipientEmail?: string;
}
