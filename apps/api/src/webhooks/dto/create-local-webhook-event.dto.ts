import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export const WEBHOOK_EVENT_TYPES = [
  "invoice.created",
  "invoice.finalized",
  "payment.recorded",
  "document.reviewed",
  "bank.feed_transaction.ready",
  "supplier_payout.approved",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export class CreateLocalWebhookEventDto {
  @IsIn(WEBHOOK_EVENT_TYPES)
  eventType!: WebhookEventType;

  @IsString()
  @MaxLength(80)
  aggregateType!: string;

  @IsString()
  @MaxLength(120)
  aggregateId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceReference?: string;
}
