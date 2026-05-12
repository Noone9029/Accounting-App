import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { PurchaseBillLineDto } from "./purchase-bill-line.dto";

export class CreatePurchaseBillDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseBillLineDto)
  lines!: PurchaseBillLineDto[];
}
