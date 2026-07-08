import { PaymentProviderType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class CreateInvoicePaymentLinkDto {
  @IsOptional()
  @IsEnum(PaymentProviderType)
  provider?: PaymentProviderType;

  @IsOptional()
  @IsString()
  @Length(0, 400)
  note?: string;
}
