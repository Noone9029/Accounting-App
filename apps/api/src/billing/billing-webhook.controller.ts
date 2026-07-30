import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import { BillingProvider, BillingProviderEnvironment } from "@prisma/client";
import type { Request } from "express";
import { BillingWebhookService } from "./billing-webhook.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Provider webhooks intentionally have no LedgerByte session guard. The raw
 * request body is passed straight to signature verification; no @Body DTO is
 * accepted and no raw provider payload is stored or logged.
 */
@Controller("billing/webhooks")
export class BillingWebhookController {
  constructor(private readonly webhooks: BillingWebhookService) {}

  @Post("stripe")
  @HttpCode(202)
  async receiveStripe(
    @Req() request: RawBodyRequest,
    @Headers("content-type") contentType: string | undefined,
    @Headers("stripe-signature") signature: string | undefined,
  ) {
    if (!request.rawBody) throw new BadRequestException("Billing webhook raw body is unavailable.");
    const result = await this.webhooks.ingest({
      provider: BillingProvider.STRIPE,
      environment: BillingProviderEnvironment.TEST,
      contentType,
      rawBody: request.rawBody,
      signature,
    });
    return { accepted: !result.duplicate, duplicate: result.duplicate, eventId: result.event.id };
  }
}
