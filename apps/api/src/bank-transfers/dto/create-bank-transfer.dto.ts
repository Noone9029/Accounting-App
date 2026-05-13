import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateBankTransferDto {
  @IsString()
  fromBankAccountProfileId!: string;

  @IsString()
  toBankAccountProfileId!: string;

  @IsDateString()
  transferDate!: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
