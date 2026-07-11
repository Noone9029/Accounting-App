import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { SalesInvoiceTaxMode } from "@prisma/client";
import { DocumentFxContextDto } from "../../foreign-exchange/dto/document-fx-context.dto";
import { SalesInvoiceLineDto } from "./sales-invoice-line.dto";

export class CreateSalesInvoiceDto extends DocumentFxContextDto {
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
