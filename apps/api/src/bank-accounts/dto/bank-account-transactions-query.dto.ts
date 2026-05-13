import { IsDateString, IsOptional } from "class-validator";

export class BankAccountTransactionsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
