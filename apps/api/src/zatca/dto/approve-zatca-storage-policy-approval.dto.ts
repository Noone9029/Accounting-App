import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { ZatcaSignedArtifactStoragePolicyRetentionStatus } from "@prisma/client";

export class ApproveZatcaStoragePolicyApprovalDto {
  @IsIn(Object.values(ZatcaSignedArtifactStoragePolicyRetentionStatus))
  retentionDurationStatus!: ZatcaSignedArtifactStoragePolicyRetentionStatus;

  @IsString()
  @MaxLength(160)
  retentionDurationValue!: string;

  @IsBoolean()
  objectVersioningApproved!: boolean;

  @IsBoolean()
  immutableArchiveApproved!: boolean;

  @IsBoolean()
  deletionPolicyApproved!: boolean;

  @IsBoolean()
  supersessionPolicyApproved!: boolean;

  @IsBoolean()
  accessControlApproved!: boolean;

  @IsBoolean()
  encryptionAtRestApproved!: boolean;

  @IsBoolean()
  backupRestoreApproved!: boolean;

  @IsBoolean()
  archiveRestoreTested!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
