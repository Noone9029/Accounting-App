import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeBackupRestoreEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
