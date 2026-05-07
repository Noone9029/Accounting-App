import { IsIn, IsOptional, IsString, Matches } from "class-validator";

export class RequestComplianceCsidDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: "OTP must be a 6-digit value for the local mock flow." })
  otp?: string;

  @IsOptional()
  @IsIn(["mock", "sandbox-placeholder", "sandbox-disabled", "sandbox"])
  mode?: "mock" | "sandbox-placeholder" | "sandbox-disabled" | "sandbox";
}
