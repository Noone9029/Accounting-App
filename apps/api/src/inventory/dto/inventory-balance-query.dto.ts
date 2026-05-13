import { IsOptional, IsUUID } from "class-validator";

export class InventoryBalanceQueryDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
