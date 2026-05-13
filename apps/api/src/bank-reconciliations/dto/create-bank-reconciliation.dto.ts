import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateBankReconciliationDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsString()
  statementClosingBalance!: string;

  @IsOptional()
  @IsString()
  statementOpeningBalance?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
