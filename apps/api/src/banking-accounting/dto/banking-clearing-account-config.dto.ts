import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class UpdateBankingClearingAccountConfigDto {
  @IsOptional()
  @IsUUID()
  undepositedFundsAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  chequeInHandAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  outstandingChequesAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  cardClearingAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  creditCardLiabilityAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  prepaidCardAssetAccountId?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
