import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class InventoryFifoPreviewQueryDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
