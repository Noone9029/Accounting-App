import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsDecimal, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { CustomerPaymentAllocationDto } from "./customer-payment-allocation.dto";

export class CreateCustomerPaymentDto {
  @IsUUID()
  customerId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amountReceived!: string;

  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CustomerPaymentAllocationDto)
  allocations!: CustomerPaymentAllocationDto[];
}
