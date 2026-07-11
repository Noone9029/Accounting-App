import { IsDecimal, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

export class ApplyUnappliedPaymentDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  idempotencyKey?: string;

  @IsUUID()
  invoiceId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  @Matches(/^(?=.*[1-9])\d+(?:\.\d{1,4})?$/, {
    message: "amountApplied must be a positive decimal with up to 4 decimal places.",
  })
  amountApplied!: string;
}
