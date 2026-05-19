import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeEmailDeliveryMonitoringEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
