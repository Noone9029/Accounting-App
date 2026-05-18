import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class RevokeComplianceCsidCustodyRecordDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}
