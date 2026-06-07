import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDecimal, IsIn, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";

export const LANDED_COST_CATEGORIES = ["FREIGHT", "CUSTOMS_DUTY", "INSURANCE", "HANDLING", "BROKERAGE", "STORAGE", "OTHER"] as const;
export const LANDED_COST_ALLOCATION_METHODS = ["BY_VALUE", "BY_QUANTITY", "EQUAL", "MANUAL"] as const;
export const LANDED_COST_SOURCE_TYPES = ["PURCHASE_RECEIPT", "PURCHASE_BILL", "PURCHASE_ORDER"] as const;

export type LandedCostCategory = (typeof LANDED_COST_CATEGORIES)[number];
export type LandedCostAllocationMethod = (typeof LANDED_COST_ALLOCATION_METHODS)[number];
export type LandedCostSourceType = (typeof LANDED_COST_SOURCE_TYPES)[number];

export class LandedCostLineDto {
  @IsIn(LANDED_COST_CATEGORIES)
  category!: LandedCostCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amount!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string | null;
}

export class LandedCostManualAllocationDto {
  @IsUUID()
  sourceLineId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amount!: string;
}

export class LandedCostPreviewDto {
  @IsIn(LANDED_COST_SOURCE_TYPES)
  sourceType!: LandedCostSourceType;

  @IsUUID()
  sourceId!: string;

  @IsIn(LANDED_COST_ALLOCATION_METHODS)
  allocationMethod!: LandedCostAllocationMethod;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => LandedCostLineDto)
  costLines!: LandedCostLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LandedCostManualAllocationDto)
  manualAllocations?: LandedCostManualAllocationDto[];
}
