import { BankAccountType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateBankAccountProfileDto {
  @IsOptional()
  @IsEnum(BankAccountType)
  type?: BankAccountType;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  accountNumberMasked?: string | null;

  @IsOptional()
  @IsString()
  ibanMasked?: string | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  openingBalance?: string;

  @IsOptional()
  @IsDateString()
  openingBalanceDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
