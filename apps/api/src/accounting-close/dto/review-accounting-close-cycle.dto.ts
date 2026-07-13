import { IsInt, Min } from "class-validator";

export class ReviewAccountingCloseCycleDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
