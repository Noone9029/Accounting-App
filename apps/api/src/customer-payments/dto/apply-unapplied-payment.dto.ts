import { IsDecimal, IsUUID, Matches } from "class-validator";

export class ApplyUnappliedPaymentDto {
  @IsUUID()
  invoiceId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  @Matches(/^(?=.*[1-9])\d+(?:\.\d{1,4})?$/, {
    message: "amountApplied must be a positive decimal with up to 4 decimal places.",
  })
  amountApplied!: string;
}
