import { IsInt, Min } from "class-validator";

export class RefreshAccountingCloseCycleDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
