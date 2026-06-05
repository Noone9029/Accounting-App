import { CollectionCaseStatus, CollectionPriority } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateCollectionCaseDto {
  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string | null;

  @IsOptional()
  @IsEnum(CollectionCaseStatus)
  status?: CollectionCaseStatus;

  @IsOptional()
  @IsEnum(CollectionPriority)
  priority?: CollectionPriority;

  @IsOptional()
  @IsDateString()
  followUpDate?: string | null;

  @IsOptional()
  @IsDateString()
  nextActionAt?: string | null;

  @IsOptional()
  @IsDateString()
  promisedPaymentDate?: string | null;

  @IsOptional()
  @IsString()
  promisedAmount?: string | null;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;

  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
