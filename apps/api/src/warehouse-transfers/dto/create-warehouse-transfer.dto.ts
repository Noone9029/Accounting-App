import { IsDateString, IsDecimal, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateWarehouseTransferDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  fromWarehouseId!: string;

  @IsUUID()
  toWarehouseId!: string;

  @IsDateString()
  transferDate!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  unitCost?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
