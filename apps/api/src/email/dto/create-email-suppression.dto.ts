import { EmailSuppressionReason } from "@prisma/client";
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const MANUAL_SUPPRESSION_REASONS = [
  EmailSuppressionReason.BOUNCE,
  EmailSuppressionReason.COMPLAINT,
  EmailSuppressionReason.MANUAL,
  EmailSuppressionReason.PROVIDER_EVENT,
];

export class CreateEmailSuppressionDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsIn(MANUAL_SUPPRESSION_REASONS)
  reason?: EmailSuppressionReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
