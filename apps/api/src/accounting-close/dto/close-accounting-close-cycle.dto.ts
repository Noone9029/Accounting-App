import { IsInt, Min } from "class-validator";

export class CloseAccountingCloseCycleDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
