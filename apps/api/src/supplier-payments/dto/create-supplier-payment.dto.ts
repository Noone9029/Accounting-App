import { Type } from "class-transformer";
import { IsArray, IsDateString, IsDecimal, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { DocumentFxContextDto } from "../../foreign-exchange/dto/document-fx-context.dto";
import { SupplierPaymentAllocationDto } from "./supplier-payment-allocation.dto";

export class CreateSupplierPaymentDto extends DocumentFxContextDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  idempotencyKey?: string;

  @IsUUID()
  supplierId!: string;

  @IsDateString()
  paymentDate!: string;

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
