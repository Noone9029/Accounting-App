import { SupplierRefundSourceType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSupplierRefundDto {
  @IsUUID()
  supplierId!: string;

  @IsEnum(SupplierRefundSourceType)
  sourceType!: SupplierRefundSourceType;

  @IsOptional()
  @IsUUID()
  sourcePaymentId?: string;

  @IsOptional()
  @IsUUID()
  sourceDebitNoteId?: string;

  @IsDateString()
  refundDate!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  amountRefunded!: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
