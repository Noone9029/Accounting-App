import { EmailSenderDomainEvidenceType } from "@prisma/client";
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateEmailSenderDomainEvidenceDto {
  @IsString()
  @MaxLength(253)
  domain!: string;

  @IsIn(Object.values(EmailSenderDomainEvidenceType))
  evidenceType!: EmailSenderDomainEvidenceType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;

  @IsObject()
  evidenceSummaryJson!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
