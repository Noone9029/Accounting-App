import { Transform, Type } from "class-transformer";
import { RecurringTransactionStatus, RecurringTransactionType } from "@prisma/client";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class RecurringTransactionQueryDto {
  @IsOptional()
  @IsEnum(RecurringTransactionType)
  transactionType?: RecurringTransactionType;

  @IsOptional()
  @IsEnum(RecurringTransactionStatus)
  status?: RecurringTransactionStatus;

  @IsOptional()
  @IsDateString()
  nextRunFrom?: string;

  @IsOptional()
  @IsDateString()
  nextRunTo?: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasFailedOrBlockedRun?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
