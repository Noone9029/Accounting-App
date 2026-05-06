import { TaxRateCategory, TaxRateScope } from "@prisma/client";
import { IsBoolean, IsDecimal, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateTaxRateDto {
  @IsString()
  name!: string;

  @IsEnum(TaxRateScope)
  scope!: TaxRateScope;

  @IsEnum(TaxRateCategory)
  category!: TaxRateCategory;

  @IsDecimal({ decimal_digits: "0,4" })
  rate!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
