import { InventoryValuationMethod } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsUUID } from "class-validator";

export class UpdateInventoryAccountingSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableInventoryAccounting?: boolean;

  @IsOptional()
  @IsUUID()
  inventoryAssetAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  cogsAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  inventoryAdjustmentGainAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  inventoryAdjustmentLossAccountId?: string | null;

  @IsOptional()
  @IsEnum(InventoryValuationMethod)
  valuationMethod?: InventoryValuationMethod;
}
