import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateComplianceCsidCustodyRecordDto {
  @IsOptional()
  @IsIn(["MOCK", "FUTURE_SANDBOX"])
  source?: "MOCK" | "FUTURE_SANDBOX";

  @IsOptional()
  @IsIn(["PLANNED", "BLOCKED", "FUTURE_READY"])
  status?: "PLANNED" | "BLOCKED" | "FUTURE_READY";

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(128)
  requestId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(128)
  certificateRequestId?: string;

  @IsOptional()
  @IsBoolean()
  hasBinarySecurityToken?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSecret?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCertificate?: boolean;

  @IsOptional()
  @IsBoolean()
  expiryKnown?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  renewalRequired?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  custodyBlockedReason?: string;
}
