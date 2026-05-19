import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class VerifyEmailDeliveryMonitoringEvidenceDto {
  @IsOptional()
  @IsBoolean()
  productionReadyContribution?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
