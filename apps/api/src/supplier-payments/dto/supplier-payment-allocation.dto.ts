import { IsDecimal, IsUUID } from "class-validator";

export class SupplierPaymentAllocationDto {
  @IsUUID()
  billId!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amountApplied!: string;
}
