import { PartialType } from "@nestjs/mapped-types";
import { CardSettlementStatus, CardSettlementType } from "@prisma/client";
import { IsDateString, IsDecimal, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateCardSettlementDto {
  @IsEnum(CardSettlementType)
  settlementType!: CardSettlementType;

  @IsOptional()
  @IsUUID()
  fundingBankAccountProfileId?: string;

  @IsUUID()
  cardAccountProfileId!: string;

  @IsDateString()
  settlementDate!: string;

  @IsString()
  @MaxLength(3)
  currency!: string;

  @IsDecimal({ decimal_digits: "0,4" })
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}

export class UpdateCardSettlementDto extends PartialType(CreateCardSettlementDto) {}

export class CardSettlementsQueryDto {
  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;

  @IsOptional()
  @IsEnum(CardSettlementStatus)
  status?: CardSettlementStatus;

  @IsOptional()
  @IsEnum(CardSettlementType)
  settlementType?: CardSettlementType;
}

export class MatchCardSettlementDto {
  @IsUUID()
  statementTransactionId!: string;
}
