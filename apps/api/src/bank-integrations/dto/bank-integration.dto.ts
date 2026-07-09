import { BankBeneficiaryMappingStatus, BankIntegrationProvider, BankPaymentRequestStatus, BankStatementTransactionType } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsIn, IsNumberString, IsOptional, IsString, IsUUID, Length, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreateBankConnectionDto {
  @IsOptional()
  @IsEnum(BankIntegrationProvider)
  provider?: BankIntegrationProvider;

  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  externalConnectionRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  externalInstitutionName?: string;
}

export class RecordMockFeedAccountDto {
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsUUID()
  bankAccountProfileId?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  accountRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  externalAccountRef?: string;
}

export class RecordMockFeedTransactionDto {
  @IsString()
  transactionDate!: string;

  @IsString()
  @Length(1, 240)
  description!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  reference?: string;

  @IsEnum(BankStatementTransactionType)
  type!: BankStatementTransactionType;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  externalTransactionRef?: string;
}

export class RecordMockFeedSyncDto {
  @ValidateNested()
  @Type(() => RecordMockFeedAccountDto)
  account!: RecordMockFeedAccountDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordMockFeedTransactionDto)
  transactions!: RecordMockFeedTransactionDto[];
}

export class UpsertBankBeneficiaryMappingDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  bankConnectionId?: string;

  @IsOptional()
  @IsEnum(BankBeneficiaryMappingStatus)
  status?: BankBeneficiaryMappingStatus;

  @IsString()
  @Length(1, 160)
  beneficiaryDisplayName!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  beneficiaryRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  externalBeneficiaryRef?: string;
}

export class CreateBankPaymentRequestDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  purchaseBillId?: string;

  @IsOptional()
  @IsUUID()
  bankConnectionId?: string;

  @IsOptional()
  @IsUUID()
  beneficiaryMappingId?: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  memo?: string;
}

export class ListBankPaymentRequestsDto {
  @IsOptional()
  @IsEnum(BankPaymentRequestStatus)
  status?: BankPaymentRequestStatus;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  purchaseBillId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(["ANY", "UNRECONCILED", "RECONCILED", "FEED", "STATEMENT"])
  reconciliationState?: "ANY" | "UNRECONCILED" | "RECONCILED" | "FEED" | "STATEMENT";
}

export class UpdateBankPaymentRequestStatusDto {
  @IsEnum(BankPaymentRequestStatus)
  status!: BankPaymentRequestStatus;
}

export class ManualExternalReleaseDto {
  @IsString()
  @Length(1, 160)
  externalReleaseReference!: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  note?: string;
}

export class ReconcileBankPaymentRequestDto {
  @IsOptional()
  @IsUUID()
  bankFeedTransactionId?: string;

  @IsOptional()
  @IsUUID()
  bankStatementTransactionId?: string;
}
