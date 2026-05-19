import { EmailDeliveryMonitoringEvidenceType } from "@prisma/client";
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateEmailDeliveryMonitoringEvidenceDto {
  @IsIn(Object.values(EmailDeliveryMonitoringEvidenceType))
  evidenceType!: EmailDeliveryMonitoringEvidenceType;

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
