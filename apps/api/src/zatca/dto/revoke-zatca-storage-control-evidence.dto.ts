import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeZatcaStorageControlEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
