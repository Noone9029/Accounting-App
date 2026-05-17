import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, Matches, ValidateIf } from "class-validator";

export const complianceCsidMockScenarios = [
  "success",
  "invalid-otp",
  "expired-otp",
  "duplicate-request",
  "adapter-disabled",
  "malformed-response",
] as const;

export type ComplianceCsidMockScenario = (typeof complianceCsidMockScenarios)[number];

export class ComplianceCsidRequestDryRunDto {
  @IsOptional()
  @IsIn(["plan", "mock", "real"])
  mode?: "plan" | "mock" | "real";

  @ValidateIf((dto: ComplianceCsidRequestDryRunDto) => dto.mode === "mock" || dto.mode === "real")
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Matches(/^[0-9]{6}$/, {
    message: "OTP must be a 6-digit numeric value for sandbox compliance CSID dry-run.",
  })
  otp?: string;

  @IsOptional()
  @IsIn(complianceCsidMockScenarios)
  mockScenario?: ComplianceCsidMockScenario;
}
