import { IsDecimal, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class ApplyUnappliedSupplierPaymentDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  idempotencyKey?: string;

  @IsUUID()
  billId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amountApplied!: string;
}
