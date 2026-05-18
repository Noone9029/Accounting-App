import { EmailProviderEventType } from "@prisma/client";
import { IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

const EMAIL_PROVIDER_EVENT_TYPES: EmailProviderEventType[] = [
  EmailProviderEventType.DELIVERED,
  EmailProviderEventType.BOUNCED,
  EmailProviderEventType.COMPLAINED,
  EmailProviderEventType.FAILED,
  EmailProviderEventType.OPENED,
  EmailProviderEventType.CLICKED,
  EmailProviderEventType.UNKNOWN,
];

export class ReceiveEmailProviderWebhookDto {
  @IsString()
  @MaxLength(80)
  provider!: string;

  @IsIn(EMAIL_PROVIDER_EVENT_TYPES)
  eventType!: EmailProviderEventType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  providerMessageId?: string;

  @IsOptional()
  @IsUUID()
  emailOutboxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  recipientEmail?: string;

  @IsString()
  @MaxLength(200)
  signature!: string;

  @IsOptional()
  @IsObject()
  payloadSummaryJson?: Record<string, unknown>;
}
