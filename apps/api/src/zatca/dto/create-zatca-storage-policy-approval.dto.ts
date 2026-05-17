import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ZatcaSignedArtifactStoragePolicyRetentionStatus } from "@prisma/client";

export class CreateZatcaStoragePolicyApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  policyVersion?: string;

  @IsOptional()
  @IsIn(Object.values(ZatcaSignedArtifactStoragePolicyRetentionStatus))
  retentionDurationStatus?: ZatcaSignedArtifactStoragePolicyRetentionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  retentionDurationValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
