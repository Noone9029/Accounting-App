import { BankAccountType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateBankAccountProfileDto {
  @IsString()
  accountId!: string;

  @IsEnum(BankAccountType)
  type!: BankAccountType;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumberMasked?: string;

  @IsOptional()
  @IsString()
  ibanMasked?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  openingBalance?: string;

  @IsOptional()
  @IsDateString()
  openingBalanceDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
