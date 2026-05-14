import {
  InventoryVarianceProposalSourceType,
  InventoryVarianceProposalStatus,
  InventoryVarianceReason,
} from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";

export class InventoryVarianceProposalQueryDto {
  @IsOptional()
  @IsEnum(InventoryVarianceProposalStatus)
  status?: InventoryVarianceProposalStatus;

  @IsOptional()
  @IsEnum(InventoryVarianceProposalSourceType)
  sourceType?: InventoryVarianceProposalSourceType;

  @IsOptional()
  @IsEnum(InventoryVarianceReason)
  reason?: InventoryVarianceReason;

  @IsOptional()
  @IsUUID()
  purchaseBillId?: string;

  @IsOptional()
  @IsUUID()
  purchaseReceiptId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
