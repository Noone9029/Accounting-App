import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class CreateCostCenterDto {
  @IsString()
  @Length(1, 32)
  code!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
