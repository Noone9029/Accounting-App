import { IsUUID } from "class-validator";

export class FindAccountingCloseCycleDto {
  @IsUUID()
  fiscalPeriodId!: string;
}
