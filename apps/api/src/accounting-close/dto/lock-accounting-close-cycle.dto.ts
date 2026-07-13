import { IsInt, Min } from "class-validator";

export class LockAccountingCloseCycleDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
