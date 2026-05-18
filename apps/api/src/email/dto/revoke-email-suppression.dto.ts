import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeEmailSuppressionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
