import { PartialType } from "@nestjs/mapped-types";
import { IsInt, Min } from "class-validator";
import { CreateRecurringTransactionDto } from "./create-recurring-transaction.dto";

export class UpdateRecurringTransactionDto extends PartialType(CreateRecurringTransactionDto) {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
