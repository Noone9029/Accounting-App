import { IsUUID } from "class-validator";

export class AccountingCloseReadinessQueryDto {
  @IsUUID()
  fiscalPeriodId!: string;
}
