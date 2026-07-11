import { Type } from "class-transformer";
import { PurchaseBillInventoryPostingMode } from "@prisma/client";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { DocumentFxContextDto } from "../../foreign-exchange/dto/document-fx-context.dto";
import { IsPostgresUuid } from "./postgres-uuid.decorator";
import { PurchaseBillLineDto } from "./purchase-bill-line.dto";

export class CreatePurchaseBillDto extends DocumentFxContextDto {
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
