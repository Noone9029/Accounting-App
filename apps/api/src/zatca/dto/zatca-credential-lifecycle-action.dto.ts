import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class ZatcaCredentialLifecycleActionDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  statusReason?: string;
}
