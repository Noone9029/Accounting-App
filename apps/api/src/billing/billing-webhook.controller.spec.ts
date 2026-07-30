import { BadRequestException } from "@nestjs/common";
import { BillingProvider, BillingProviderEnvironment, BillingWebhookProcessingStatus } from "@prisma/client";
import { BillingWebhookController } from "./billing-webhook.controller";
import { BillingWebhookService } from "./billing-webhook.service";

describe("BillingWebhookController", () => {
  const rawBody = Buffer.from('{"id":"evt_safe"}');
  const event = { id: "event-1", status: BillingWebhookProcessingStatus.RECEIVED };

  it("forwards the untouched raw body and Stripe test metadata to verification", async () => {
    const ingest = jest.fn().mockResolvedValue({ event, duplicate: false });
    const controller = new BillingWebhookController({ ingest } as unknown as BillingWebhookService);

    await expect(controller.receiveStripe({ rawBody } as never, "application/json; charset=utf-8", "signature-value"))
      .resolves.toEqual({ accepted: true, duplicate: false, eventId: "event-1" });

    expect(ingest).toHaveBeenCalledWith({
      provider: BillingProvider.STRIPE,
      environment: BillingProviderEnvironment.TEST,
      contentType: "application/json; charset=utf-8",
      rawBody,
      signature: "signature-value",
    });
  });

  it("rejects a request when the framework did not preserve a raw body", async () => {
    const controller = new BillingWebhookController({ ingest: jest.fn() } as unknown as BillingWebhookService);

    await expect(controller.receiveStripe({} as never, "application/json", "signature-value"))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
