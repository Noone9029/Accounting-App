import { StockMovementType } from "@prisma/client";
import { IsDateString, IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateStockMovementDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  warehouseId!: string;

  @IsDateString()
  movementDate!: string;

  @IsEnum(StockMovementType)
  type!: StockMovementType;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  unitCost?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
