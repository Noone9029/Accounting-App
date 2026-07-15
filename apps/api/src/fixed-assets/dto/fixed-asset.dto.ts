import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsNumberString, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

export class CreateFixedAssetCategoryDto {
  @IsString() @MaxLength(40) code!: string;
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsUUID() assetCostAccountId!: string;
  @IsUUID() accumulatedDepreciationAccountId!: string;
  @IsUUID() depreciationExpenseAccountId!: string;
  @IsUUID() disposalGainAccountId!: string;
  @IsUUID() disposalLossAccountId!: string;
  @Type(() => Number) @IsInt() @Min(1) defaultUsefulLifeMonths!: number;
  @IsNumberString() defaultSalvageValue!: string;
}

export class UpdateFixedAssetCategoryDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() assetCostAccountId?: string;
  @IsOptional() @IsUUID() accumulatedDepreciationAccountId?: string;
  @IsOptional() @IsUUID() depreciationExpenseAccountId?: string;
  @IsOptional() @IsUUID() disposalGainAccountId?: string;
  @IsOptional() @IsUUID() disposalLossAccountId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) defaultUsefulLifeMonths?: number;
  @IsOptional() @IsNumberString() defaultSalvageValue?: string;
}

export class CreateFixedAssetDto {
  @IsOptional() @IsString() @MaxLength(40) assetNumber?: string;
  @IsUUID() categoryId!: string;
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(160) serialNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) tagNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) location?: string;
  @IsOptional() @IsString() @MaxLength(160) custodianName?: string;
  @IsDateString() acquisitionDate!: string;
  @IsDateString() inServiceDate!: string;
  @IsNumberString() baseAcquisitionCost!: string;
  @IsNumberString() baseSalvageValue!: string;
  @Type(() => Number) @IsInt() @Min(1) usefulLifeMonths!: number;
  @IsOptional() @IsString() transactionCurrencyCode?: string;
  @IsOptional() @IsNumberString() transactionAcquisitionCost?: string;
  @IsOptional() @IsNumberString() exchangeRate?: string;
  @IsOptional() @IsDateString() rateDate?: string;
  @IsOptional() @IsString() rateSource?: string;
  @IsOptional() @IsUUID() rateSnapshotId?: string;
  @IsOptional() @IsUUID() costCenterId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() sourceReferenceId?: string;
}

export class UpdateFixedAssetDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(160) serialNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) tagNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) location?: string;
  @IsOptional() @IsString() @MaxLength(160) custodianName?: string;
  @IsOptional() @IsDateString() acquisitionDate?: string;
  @IsOptional() @IsDateString() inServiceDate?: string;
  @IsOptional() @IsNumberString() baseAcquisitionCost?: string;
  @IsOptional() @IsNumberString() baseSalvageValue?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usefulLifeMonths?: number;
  @IsOptional() @IsUUID() costCenterId?: string;
  @IsOptional() @IsUUID() projectId?: string;
}

export class ManualCapitalizationDto {
  @IsUUID() offsetAccountId!: string;
  @IsOptional() @IsDateString() postingDate?: string;
  @IsOptional() @IsString() @MaxLength(240) reason?: string;
}

export class BillLineCapitalizationDto {
  @IsUUID() billLineId!: string;
  @IsUUID() categoryId!: string;
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsDateString() inServiceDate?: string;
  @IsOptional() @IsNumberString() baseSalvageValue?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usefulLifeMonths?: number;
  @IsOptional() @IsString() @MaxLength(240) reason?: string;
}

export class FixedAssetListQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class ScheduleQueryDto {
  @IsOptional() @IsIn(["all", "unposted", "posted", "reversed"]) status?: "all" | "unposted" | "posted" | "reversed";
}

export class DepreciationRunPreviewDto {
  @IsUUID() fiscalPeriodId!: string;
  @IsDateString() depreciationDate!: string;
  @IsString() @MaxLength(120) idempotencyKey!: string;
}

export class ExpectedVersionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
}

export class DisposalDto {
  @IsDateString() disposalDate!: string;
  @IsNumberString() proceeds!: string;
  @IsOptional() @IsUUID() proceedsAccountId?: string;
  @IsString() @MaxLength(240) reason!: string;
}

export class DisposalReviewDto {
  @IsString() @MaxLength(240) reason!: string;
}
