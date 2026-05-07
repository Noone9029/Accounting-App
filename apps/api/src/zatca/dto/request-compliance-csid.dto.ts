import { IsIn, IsOptional, IsString, Matches } from "class-validator";

export class RequestComplianceCsidDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "OTP must be a 6-digit value for the local mock flow." })
  otp!: string;

  @IsOptional()
  @IsIn(["mock", "sandbox-placeholder"])
  mode?: "mock" | "sandbox-placeholder";
}
