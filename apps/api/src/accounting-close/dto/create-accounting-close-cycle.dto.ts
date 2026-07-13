import { IsUUID } from "class-validator";

export class CreateAccountingCloseCycleDto {
  @IsUUID()
  fiscalPeriodId!: string;
}
