import { BackupRestoreEvidenceScope, BackupRestoreEvidenceType } from "@prisma/client";
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateBackupRestoreEvidenceDto {
  @IsIn(Object.values(BackupRestoreEvidenceType))
  evidenceType!: BackupRestoreEvidenceType;

  @IsOptional()
  @IsIn(Object.values(BackupRestoreEvidenceScope))
  scope?: BackupRestoreEvidenceScope;

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
