import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export class InventoryReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsIn(["csv"])
  format?: "csv";
}
