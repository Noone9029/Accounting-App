import { IsBoolean, IsString, MinLength } from "class-validator";

export class EnableZatcaSdkHashModeDto {
  @IsString()
  @MinLength(10)
  reason!: string;

  @IsBoolean()
  confirmReset!: boolean;
}
