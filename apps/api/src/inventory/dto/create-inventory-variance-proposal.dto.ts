import { InventoryVarianceReason } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateInventoryVarianceProposalFromClearingVarianceDto {
  @IsOptional()
  @IsUUID()
  purchaseBillId?: string;

  @IsOptional()
  @IsUUID()
  purchaseReceiptId?: string;

  @IsEnum(InventoryVarianceReason)
  reason!: InventoryVarianceReason;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateManualInventoryVarianceProposalDto {
  @IsEnum(InventoryVarianceReason)
  reason!: InventoryVarianceReason;

  @IsDateString()
  proposalDate!: string;

  @IsString()
  amount!: string;

  @IsUUID()
  debitAccountId!: string;

  @IsUUID()
  creditAccountId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
