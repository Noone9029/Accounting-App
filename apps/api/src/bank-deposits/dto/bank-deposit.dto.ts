import { PartialType } from "@nestjs/mapped-types";
import { BankDepositBatchLineSourceType } from "@prisma/client";
import { IsDateString, IsDecimal, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateBankDepositBatchDto {
  @IsUUID()
  bankAccountProfileId!: string;

  @IsDateString()
  depositDate!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}

export class UpdateBankDepositBatchDto extends PartialType(CreateBankDepositBatchDto) {}

export class BankDepositBatchesQueryDto {
  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;
}

export class AddBankDepositBatchLineDto {
  @IsEnum(BankDepositBatchLineSourceType)
  sourceType!: BankDepositBatchLineSourceType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amount!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}

export class MatchBankDepositBatchDto {
  @IsUUID()
  statementTransactionId!: string;
}

export class BankDepositSourceCandidatesQueryDto {
  @IsUUID()
  bankAccountProfileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
