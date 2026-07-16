import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

export class CreateCustomerPaymentEmailDeliveryDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[^\r\n]*$/)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsString()
  @Length(16, 128)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  idempotencyKey!: string;
}
