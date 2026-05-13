import { InventoryValuationMethod } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export class UpdateInventorySettingsDto {
  @IsOptional()
  @IsEnum(InventoryValuationMethod)
  valuationMethod?: InventoryValuationMethod;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsBoolean()
  trackInventoryValue?: boolean;
}
