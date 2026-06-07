import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { SalesInvoiceTaxMode } from "@prisma/client";
import { SalesInvoiceLineDto } from "./sales-invoice-line.dto";

export class CreateSalesInvoiceDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsDateString()
  issueDate!: string;

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
  @IsEnum(SalesInvoiceTaxMode)
  taxMode?: SalesInvoiceTaxMode;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceLineDto)
  lines!: SalesInvoiceLineDto[];
}
