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

  @IsOptional()
  @IsUUID()
  salesTaxRateId?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  purchaseCost?: string;

  @IsOptional()
  @IsUUID()
  expenseAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  purchaseTaxRateId?: string | null;

  @IsOptional()
  @IsBoolean()
  inventoryTracking?: boolean;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  reorderPoint?: string | null;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  reorderQuantity?: string | null;
}
