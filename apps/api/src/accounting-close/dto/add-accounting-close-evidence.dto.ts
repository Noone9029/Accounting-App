import { IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from "class-validator";

export class AddAccountingCloseEvidenceDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,63}$/) evidenceType!: string;
  @IsString() @MaxLength(160) safeLabel!: string;
  @IsOptional() @IsUUID() closeTaskId?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,63}$/) reportType?: string;
  @IsOptional() @IsUUID() generatedDocumentId?: string;
}
