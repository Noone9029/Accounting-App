import { IsDateString, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

export class CreateSupplierStatementEmailDeliveryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  to?: string;

  @IsDateString()
  asOf!: string;

  @IsOptional()
  @IsString()
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
