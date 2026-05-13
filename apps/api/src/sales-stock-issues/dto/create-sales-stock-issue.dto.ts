import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsDecimal, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

export class SalesStockIssueLineDto {
  @IsUUID()
  salesInvoiceLineId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  unitCost?: string | null;
}

export class CreateSalesStockIssueDto {
  @IsUUID()
  salesInvoiceId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsUUID()
  warehouseId!: string;

  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesStockIssueLineDto)
  lines!: SalesStockIssueLineDto[];
}
