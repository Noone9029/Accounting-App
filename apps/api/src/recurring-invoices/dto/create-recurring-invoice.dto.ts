import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min, ValidateNested } from "class-validator";
import { RecurringInvoiceDateMode, RecurringInvoiceFrequency, SalesInvoiceTaxMode } from "@prisma/client";
import { RecurringInvoiceLineDto } from "./recurring-invoice-line.dto";

export class CreateRecurringInvoiceDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsDateString()
  nextRunDate!: string;

  @IsEnum(RecurringInvoiceFrequency)
  frequency!: RecurringInvoiceFrequency;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  interval?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  monthOfYear?: number | null;

  @IsOptional()
  @IsEnum(RecurringInvoiceDateMode)
  invoiceDateMode?: RecurringInvoiceDateMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  paymentTermsDays?: number;

  @IsOptional()
  @IsString()
  reference?: string;

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
  @Type(() => RecurringInvoiceLineDto)
  lines!: RecurringInvoiceLineDto[];
}
