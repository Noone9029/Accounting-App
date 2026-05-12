import { IsISO8601, IsOptional, IsString, Length } from "class-validator";

export class UpdateFiscalPeriodDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsISO8601()
  startsOn?: string;

  @IsOptional()
  @IsISO8601()
  endsOn?: string;
}
