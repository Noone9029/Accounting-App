import { IsOptional, IsString, MaxLength } from "class-validator";

export class RecurringRunNowDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requestId?: string;
}
