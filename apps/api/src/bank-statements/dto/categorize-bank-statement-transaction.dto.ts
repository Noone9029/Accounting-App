import { IsOptional, IsString } from "class-validator";

export class CategorizeBankStatementTransactionDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
