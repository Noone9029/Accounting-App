import { InventoryAdjustmentType } from "@prisma/client";
import { IsDateString, IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateInventoryAdjustmentDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsEnum(InventoryAdjustmentType)
  type!: InventoryAdjustmentType;

  @IsDateString()
  adjustmentDate!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  unitCost?: string | null;

  @IsOptional()
  @IsString()
  reason?: string | null;
}
