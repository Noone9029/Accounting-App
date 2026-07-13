import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class CompleteAccountingCloseTaskDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  completionNote?: string;
}
