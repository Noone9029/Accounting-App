import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";

export class ReopenAccountingCloseTaskDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reopenReason!: string;
}
