import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsDecimal, IsOptional, IsString, IsUUID, Length, Matches, ValidateNested } from "class-validator";
import { DocumentFxContextDto } from "../../foreign-exchange/dto/document-fx-context.dto";
import { CustomerPaymentAllocationDto } from "./customer-payment-allocation.dto";

export class CreateCustomerPaymentDto extends DocumentFxContextDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  idempotencyKey?: string;

  @IsUUID()
  customerId!: string;

  @IsDateString()
  paymentDate!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  @Matches(/^(?=.*[1-9])\d+(?:\.\d{1,4})?$/, {
    message: "amountReceived must be a positive decimal with up to 4 decimal places.",
  })
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
