import { IsOptional, IsString, MaxLength } from "class-validator";

export class VerifyZatcaStorageControlEvidenceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
