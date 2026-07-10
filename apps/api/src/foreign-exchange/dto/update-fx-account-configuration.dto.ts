import { IsDefined, IsUUID, ValidateIf } from "class-validator";

export class UpdateFxAccountConfigurationDto {
  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  realizedGainAccountId!: string | null;

  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  realizedLossAccountId!: string | null;

  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  unrealizedGainAccountId!: string | null;

  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  unrealizedLossAccountId!: string | null;
}
