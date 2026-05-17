import { IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ZatcaSignedArtifactStorageControlEvidenceType } from "@prisma/client";

export class CreateZatcaStorageControlEvidenceDto {
  @IsOptional()
  @IsUUID()
  policyApprovalId?: string;

  @IsIn(Object.values(ZatcaSignedArtifactStorageControlEvidenceType))
  evidenceType!: ZatcaSignedArtifactStorageControlEvidenceType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bucketNameRedacted?: string;

  @IsObject()
  evidenceSummaryJson!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
