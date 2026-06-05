import { CollectionActivityType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateCollectionActivityDto {
  @IsEnum(CollectionActivityType)
  activityType!: CollectionActivityType;

  @IsOptional()
  @IsDateString()
  activityDate?: string | null;

  @IsString()
  note!: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string | null;

  @IsOptional()
  @IsDateString()
  promisedPaymentDate?: string | null;

  @IsOptional()
  @IsString()
  promisedAmount?: string | null;
}
