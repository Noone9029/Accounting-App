import { IsInt, IsOptional, Max, Min } from "class-validator";

export class RunEmailRetryWorkerDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
