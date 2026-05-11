import { CustomerRefundSourceType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCustomerRefundDto {
  @IsUUID()
  customerId!: string;

  @IsEnum(CustomerRefundSourceType)
  sourceType!: CustomerRefundSourceType;

  @IsOptional()
  @IsUUID()
  sourcePaymentId?: string;

  @IsOptional()
  @IsUUID()
  sourceCreditNoteId?: string;

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
