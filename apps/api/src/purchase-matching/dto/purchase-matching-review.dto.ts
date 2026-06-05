import { PurchaseMatchingReviewReason, PurchaseMatchingReviewStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import type {
  PurchaseMatchingContext,
  PurchaseMatchingExceptionSeverity,
  PurchaseMatchingExceptionType,
} from "../purchase-matching.service";

export const PURCHASE_MATCHING_SOURCE_TYPES: PurchaseMatchingContext[] = ["purchaseOrder", "purchaseBill", "purchaseReceipt"];
export const PURCHASE_MATCHING_EXCEPTION_TYPES: PurchaseMatchingExceptionType[] = [
  "OVER_BILLED",
  "OVER_RECEIVED",
  "NOT_RECEIVED",
  "NOT_BILLED",
  "PARTIALLY_MATCHED",
  "RECEIPT_PENDING_BILL",
  "BILL_PENDING_RECEIPT",
  "REVIEW_REQUIRED",
];
export const PURCHASE_MATCHING_EXCEPTION_SEVERITIES: PurchaseMatchingExceptionSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export class CreatePurchaseMatchingReviewDto {
  @IsIn(PURCHASE_MATCHING_SOURCE_TYPES)
  sourceType!: PurchaseMatchingContext;

  @IsUUID()
  sourceId!: string;

  @IsIn(PURCHASE_MATCHING_EXCEPTION_TYPES)
  exceptionType!: PurchaseMatchingExceptionType;

  @IsIn(PURCHASE_MATCHING_EXCEPTION_SEVERITIES)
  severity!: PurchaseMatchingExceptionSeverity;

  @IsOptional()
  @IsUUID()
  supplierId?: string | null;

  @IsOptional()
  @IsEnum(PurchaseMatchingReviewReason)
  reasonCode?: PurchaseMatchingReviewReason | null;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class UpdatePurchaseMatchingReviewDto {
  @IsOptional()
  @IsEnum(PurchaseMatchingReviewStatus)
  status?: PurchaseMatchingReviewStatus;

  @IsOptional()
  @IsEnum(PurchaseMatchingReviewReason)
  reasonCode?: PurchaseMatchingReviewReason | null;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

export class PurchaseMatchingReviewTransitionDto {
  @IsOptional()
  @IsEnum(PurchaseMatchingReviewReason)
  reasonCode?: PurchaseMatchingReviewReason | null;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}
