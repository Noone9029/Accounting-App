import { IsISO8601, IsString, Length } from "class-validator";

export class CreateFiscalPeriodDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsISO8601()
  startsOn!: string;

  @IsISO8601()
  endsOn!: string;
}
