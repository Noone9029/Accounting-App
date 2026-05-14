import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReversePurchaseReceiptAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
