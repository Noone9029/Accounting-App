import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class SalesInvoiceLineDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  unitPrice!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  discountRate?: string;

  @IsOptional()
  @IsUUID()
  taxRateId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
