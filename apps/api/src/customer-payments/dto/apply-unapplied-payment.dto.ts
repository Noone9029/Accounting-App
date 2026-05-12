import { IsDecimal, IsUUID } from "class-validator";

export class ApplyUnappliedPaymentDto {
  @IsUUID()
  invoiceId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amountApplied!: string;
}
