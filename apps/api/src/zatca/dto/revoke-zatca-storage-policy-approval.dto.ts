import { IsOptional, IsString, MaxLength } from "class-validator";

export class RevokeZatcaStoragePolicyApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
