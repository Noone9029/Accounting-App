import { IsOptional, IsString } from "class-validator";

export class ReverseUnappliedSupplierPaymentAllocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
