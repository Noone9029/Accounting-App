import { IsEmail, IsOptional } from "class-validator";

export class RunEmailDiagnosticsDto {
  @IsOptional()
  @IsEmail()
  toEmail?: string;
}
