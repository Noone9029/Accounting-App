import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class PurchaseBillLineDto {
  @IsOptional()
  @IsUUID()
  itemId?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string | null;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  unitPrice!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  discountRate?: string;

  @IsOptional()
  @IsUUID()
  taxRateId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
