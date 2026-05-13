import { IsString } from "class-validator";

export class IgnoreBankStatementTransactionDto {
  @IsString()
  reason!: string;
}
