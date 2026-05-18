import { IsInt, IsOptional, Max, Min } from "class-validator";

export class RunEmailRetryProcessDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
