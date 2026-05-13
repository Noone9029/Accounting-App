import { IsOptional, IsString } from "class-validator";

export class ApproveBankReconciliationDto {
  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

export class ReopenBankReconciliationDto {
  @IsOptional()
  @IsString()
  reopenReason?: string;
}
