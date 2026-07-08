import { BadRequestException } from "@nestjs/common";
import { WebhookOutboxService } from "./webhook-outbox.service";

describe("WebhookOutboxService", () => {
  it("reports disabled readiness by default without external calls or secrets", () => {
    const { service } = makeService();

    expect(service.readiness()).toMatchObject({
      mode: "DISABLED",
      status: "Disabled",
      outboundDeliveryEnabled: false,
      externalCallsEnabled: false,
      signingSecretsStored: false,
      safePayloadsOnly: true,
    });
    expect(service.eventCatalog()).toMatchObject({
      noExternalCalls: true,
      noSecretsReturned: true,
    });
  });

  it("blocks local mock event creation unless MOCK_LOCAL is explicitly configured", async () => {
    const { service } = makeService();

    await expect(
      service.createLocalMockEvent("org-1", "user-1", {
        eventType: "invoice.created",
        aggregateType: "SalesInvoice",
        aggregateId: "invoice-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records local mock outbox/event/attempt with safe summaries only", async () => {
    const { service, prisma, audit } = makeService({ LEDGERBYTE_OUTBOUND_WEBHOOKS_MODE: "MOCK_LOCAL" });

    await expect(
      service.createLocalMockEvent("org-1", "user-1", {
        eventType: "supplier_payout.approved",
        aggregateType: "BankPaymentRequest",
        aggregateId: "payment-request-1",
        sourceReference: "secret-provider-payload-should-not-be-stored",
      }),
    ).resolves.toMatchObject({
      status: "MOCK_DELIVERED",
      eventId: "event-1",
      outboxItemId: "outbox-1",
      deliveryAttemptId: "attempt-1",
      requestId: "req-webhook-1",
      externalCallAttempted: false,
      safePayloadsOnly: true,
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    const tx = prisma.__tx;
    expect(tx.eventOutboxItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        status: "QUEUED",
        requestId: "req-webhook-1",
        safePayloadSummary: expect.objectContaining({
          rawPayloadStored: false,
          providerPayloadStored: false,
          secretFieldsStored: false,
          sourceReferencePresent: true,
        }),
      }),
    });
    expect(tx.webhookDeliveryAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "MOCK_DELIVERED",
        responseSummary: expect.objectContaining({
          externalCallAttempted: false,
          noResponseBodyStored: true,
        }),
      }),
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-1",
        action: "WEBHOOK_LOCAL_MOCK_EVENT_RECORDED",
        after: expect.objectContaining({ externalCallAttempted: false, safePayloadsOnly: true }),
      }),
    );
    const serialized = JSON.stringify([...tx.eventOutboxItem.create.mock.calls, ...tx.webhookEvent.create.mock.calls, ...tx.webhookDeliveryAttempt.create.mock.calls, ...audit.log.mock.calls]);
    expect(serialized).not.toContain("secret-provider-payload-should-not-be-stored");
  });
});

function makeService(env: Record<string, string | undefined> = {}) {
  const tx = {
    eventOutboxItem: {
      create: jest.fn().mockResolvedValue({ id: "outbox-1" }),
    },
    webhookEvent: {
      create: jest.fn().mockResolvedValue({ id: "event-1" }),
    },
    webhookDeliveryAttempt: {
      create: jest.fn().mockResolvedValue({ id: "attempt-1" }),
    },
  };
  const prisma = {
    __tx: tx,
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const config = {
    get: jest.fn((key: string) => env[key]),
  };
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  const observability = {
    getRequestId: jest.fn(() => "req-webhook-1"),
  };

  return {
    service: new WebhookOutboxService(prisma as never, config as never, audit as never, observability as never),
    prisma,
    audit,
  };
}
