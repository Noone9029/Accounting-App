import { IsInt, Min } from "class-validator";

export class PrepareAccountingCloseCycleDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
