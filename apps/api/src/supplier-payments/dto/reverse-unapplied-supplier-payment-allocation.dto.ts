import { IsOptional, IsString, Length } from "class-validator";

export class ReverseUnappliedSupplierPaymentAllocationDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
