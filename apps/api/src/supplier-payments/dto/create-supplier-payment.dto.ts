import { Type } from "class-transformer";
import { IsArray, IsDateString, IsDecimal, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { SupplierPaymentAllocationDto } from "./supplier-payment-allocation.dto";

export class CreateSupplierPaymentDto {
  @IsUUID()
  supplierId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amountPaid!: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierPaymentAllocationDto)
  allocations?: SupplierPaymentAllocationDto[];
}
