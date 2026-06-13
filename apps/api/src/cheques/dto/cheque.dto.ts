import { PartialType } from "@nestjs/mapped-types";
import { ChequeCounterpartyType, ChequeInstrumentStatus, ChequeInstrumentType } from "@prisma/client";
import { IsDateString, IsDecimal, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateChequeDto {
  @IsEnum(ChequeInstrumentType)
  chequeType!: ChequeInstrumentType;

  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;

  @IsOptional()
  @IsEnum(ChequeCounterpartyType)
  counterpartyType?: ChequeCounterpartyType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  counterpartyId?: string;

  @IsString()
  @MaxLength(160)
  counterpartyName!: string;

  @IsString()
  @MaxLength(80)
  chequeNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  drawerBankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  payeeName?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amount!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}

export class UpdateChequeDto extends PartialType(CreateChequeDto) {}

export class ChequesQueryDto {
  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;

  @IsOptional()
  @IsEnum(ChequeInstrumentStatus)
  status?: ChequeInstrumentStatus;

  @IsOptional()
  @IsEnum(ChequeInstrumentType)
  chequeType?: ChequeInstrumentType;
}

export class DepositChequeDto {
  @IsUUID()
  depositBatchId!: string;
}

export class MatchChequeDto {
  @IsUUID()
  statementTransactionId!: string;
}

export class BounceChequeDto {
  @IsString()
  @MaxLength(500)
  bounceReason!: string;
}

export class VoidChequeDto {
  @IsString()
  @MaxLength(500)
  voidReason!: string;
}
