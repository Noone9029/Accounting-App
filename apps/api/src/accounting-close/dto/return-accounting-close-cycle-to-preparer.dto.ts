import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";

export class ReturnAccountingCloseCycleToPreparerDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  returnReason!: string;
}
