import { IsString } from "class-validator";

export class MatchBankStatementTransactionDto {
  @IsString()
  journalLineId!: string;
}
