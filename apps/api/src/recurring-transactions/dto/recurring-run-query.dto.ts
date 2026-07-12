import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class RecurringRunQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
