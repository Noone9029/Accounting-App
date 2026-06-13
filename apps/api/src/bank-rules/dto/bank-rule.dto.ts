import { PartialType } from "@nestjs/mapped-types";
import { BankRuleActionType, BankRuleDirection } from "@prisma/client";
import { IsBoolean, IsDecimal, IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class CreateBankRuleDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  priority?: number;

  @IsOptional()
  @IsEnum(BankRuleDirection)
  direction?: BankRuleDirection;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  descriptionContains?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  descriptionRegex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceContains?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankReferenceContains?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  counterpartyContains?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  amountEquals?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  amountMin?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: "0,4" })
  amountMax?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyEquals?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sourceFormat?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsEnum(BankRuleActionType)
  actionType!: BankRuleActionType;

  @IsOptional()
  @IsUUID()
  categorizeAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  ignoreReason?: string;

  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;
}

export class UpdateBankRuleDto extends PartialType(CreateBankRuleDto) {}

export class BankRulesQueryDto {
  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;
}

export class DryRunBankRuleDto {
  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ApplyBankRuleSuggestionDto {
  @IsUUID()
  ruleId!: string;

  @IsOptional()
  @IsEnum(BankRuleActionType)
  actionType?: BankRuleActionType;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsUUID()
  journalLineId?: string;
}
