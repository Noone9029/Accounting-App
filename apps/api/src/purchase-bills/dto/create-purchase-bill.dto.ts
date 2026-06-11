import { Type } from "class-transformer";
import { PurchaseBillInventoryPostingMode } from "@prisma/client";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, Length, ValidateNested } from "class-validator";
import { IsPostgresUuid } from "./postgres-uuid.decorator";
import { PurchaseBillLineDto } from "./purchase-bill-line.dto";

export class CreatePurchaseBillDto {
  @IsPostgresUuid()
  supplierId!: string;

  @IsOptional()
  @IsPostgresUuid()
  branchId?: string | null;

  @IsDateString()
  billDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsEnum(PurchaseBillInventoryPostingMode)
  inventoryPostingMode?: PurchaseBillInventoryPostingMode;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseBillLineDto)
  lines!: PurchaseBillLineDto[];
}
