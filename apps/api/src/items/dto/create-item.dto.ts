import { ItemStatus, ItemType } from "@prisma/client";
import { IsBoolean, IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsEnum(ItemType)
  type!: ItemType;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsDecimal({ decimal_digits: "0,4" })
  sellingPrice!: string;

  @IsUUID()
  revenueAccountId!: string;

  @IsUUID()
  salesTaxRateId!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  purchaseCost?: string;

  @IsOptional()
  @IsUUID()
  expenseAccountId?: string;

  @IsOptional()
  @IsUUID()
  purchaseTaxRateId?: string;

  @IsOptional()
  @IsBoolean()
  inventoryTracking?: boolean;
}
