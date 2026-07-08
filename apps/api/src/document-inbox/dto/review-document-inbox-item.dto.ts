import { DocumentReviewDecisionType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

export class ReviewDocumentInboxItemDto {
  @IsEnum(DocumentReviewDecisionType)
  decisionType!: DocumentReviewDecisionType;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  reviewerNote?: string;
}
