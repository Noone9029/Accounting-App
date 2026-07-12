import { Type } from "class-transformer";
import {
  RecurringCatchUpPolicy,
  RecurringExchangeRatePolicy,
  RecurringFrequency,
  RecurringTransactionType,
  SalesInvoiceTaxMode,
  PurchaseBillInventoryPostingMode,
} from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { RecurringTransactionLineDto } from "./recurring-transaction-line.dto";

export class CreateRecurringTransactionDto {
  @IsEnum(RecurringTransactionType)
  transactionType!: RecurringTransactionType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsEnum(RecurringFrequency)
  frequency!: RecurringFrequency;

  @IsInt()
  @Min(1)
  @Max(24)
  interval!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

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
  @IsEnum(RecurringCatchUpPolicy)
  catchUpPolicy?: RecurringCatchUpPolicy;

  @IsString()
  @Length(3, 3)
  currencyCode!: string;

  @IsEnum(RecurringExchangeRatePolicy)
  exchangeRatePolicy!: RecurringExchangeRatePolicy;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,8" })
  fixedExchangeRate?: string | null;

  @IsOptional()
  @IsUUID()
  rateSnapshotId?: string | null;

  @IsOptional()
  @IsUUID()
  partyId?: string | null;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsUUID()
  paidThroughAccountId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  paymentTermsDays?: number;

  @IsOptional()
  @IsString()
  reference?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  terms?: string | null;

  @IsOptional()
  @IsEnum(SalesInvoiceTaxMode)
  taxMode?: SalesInvoiceTaxMode;

  @IsOptional()
  @IsEnum(PurchaseBillInventoryPostingMode)
  inventoryPostingMode?: PurchaseBillInventoryPostingMode;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecurringTransactionLineDto)
  lines!: RecurringTransactionLineDto[];
}
