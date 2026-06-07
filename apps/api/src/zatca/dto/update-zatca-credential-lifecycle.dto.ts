import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export const zatcaCredentialLifecycleStatuses = [
  "NOT_CONFIGURED",
  "CSR_PENDING",
  "OTP_REQUIRED",
  "COMPLIANCE_CSID_PENDING",
  "COMPLIANCE_CSID_ACTIVE",
  "PRODUCTION_CSID_PENDING",
  "PRODUCTION_CSID_ACTIVE",
  "ROTATION_REQUIRED",
  "REVOKED",
  "DISABLED",
  "ERROR",
] as const;

export const zatcaCredentialCustodyProviderTypes = ["NONE", "EXTERNAL_KMS", "EXTERNAL_HSM", "MANAGED_SECRET_REFERENCE", "DUMMY_LOCAL"] as const;

export class UpdateZatcaCredentialLifecycleDto {
  @IsOptional()
  @IsIn(zatcaCredentialLifecycleStatuses)
  lifecycleStatus?: (typeof zatcaCredentialLifecycleStatuses)[number];

  @IsOptional()
  @IsIn(zatcaCredentialCustodyProviderTypes)
  custodyProviderType?: (typeof zatcaCredentialCustodyProviderTypes)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  custodyReferenceAlias?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(128)
  certificateFingerprint?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(128)
  certificateSerialNumber?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(256)
  certificateIssuer?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(256)
  certificateSubject?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  certificateNotBefore?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  certificateExpiresAt?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(128)
  certificateRequestId?: string;

  @IsOptional()
  @IsIn(zatcaCredentialLifecycleStatuses)
  complianceCsidStatus?: (typeof zatcaCredentialLifecycleStatuses)[number];

  @IsOptional()
  @IsIn(zatcaCredentialLifecycleStatuses)
  productionCsidStatus?: (typeof zatcaCredentialLifecycleStatuses)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  lastReadinessCheckAt?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  errorCode?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  statusReason?: string;
}
