import { Type, Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsString, IsUUID, Matches, ValidateNested } from "class-validator";
import { SUPPORTED_CURRENCY_CODES } from "@ledgerbyte/shared";

export class FxRevaluationRateSelectionDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn(SUPPORTED_CURRENCY_CODES)
  currencyCode!: string;

  @IsUUID("4")
  rateSnapshotId!: string;
}
export class PreviewFxRevaluationDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  revaluationDate!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  rateDate!: string;

  @IsArray()
  @ArrayMaxSize(32)
  @ValidateNested({ each: true })
  @Type(() => FxRevaluationRateSelectionDto)
  rates!: FxRevaluationRateSelectionDto[];

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Matches(/^[A-Za-z0-9._:-]{8,128}$/)
  idempotencyKey!: string;
}
