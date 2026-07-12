import { IsDecimal, IsInt, IsOptional, IsString, Min } from "class-validator";
import { IsPostgresUuid } from "./postgres-uuid.decorator";

export class PurchaseBillLineDto {
  @IsOptional()
  @IsPostgresUuid()
  itemId?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsPostgresUuid()
  accountId?: string | null;

  @IsDecimal({ decimal_digits: "0,4" })
  quantity!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  unitPrice!: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  discountRate?: string;

  @IsOptional()
  @IsPostgresUuid()
  taxRateId?: string | null;

  @IsOptional()
  @IsPostgresUuid()
  costCenterId?: string | null;

  @IsOptional()
  @IsPostgresUuid()
  projectId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
