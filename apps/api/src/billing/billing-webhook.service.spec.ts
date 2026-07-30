import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { BillingProvider, BillingWebhookProcessingStatus } from "@prisma/client";
import { BillingWebhookService } from "./billing-webhook.service";

describe("BillingWebhookService", () => {
  function harness() {
    const tx = {
      billingWebhookEvent: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      organizationSubscription: { findFirst: jest.fn(), update: jest.fn() },
      billingLifecycleEvent: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      billingWebhookEvent: { create: jest.fn(), findUniqueOrThrow: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      billingProviderCustomer: { findFirst: jest.fn() },
      organizationSubscription: { findFirst: jest.fn() },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const provider = {
      verifyWebhook: jest.fn().mockResolvedValue(true),
      normalizeWebhookEvent: jest.fn().mockReturnValue({ provider: BillingProvider.FAKE, providerEventId: "evt-1", eventType: "invoice.paid", providerCreatedAt: new Date("2026-07-30T00:00:00.000Z"), providerCustomerReference: "cus-1", providerSubscriptionReference: "sub-ref-1", providerInvoiceReference: "in-1" }),
      reconcileSubscription: jest.fn(),
    };
    const providers = { forProvider: jest.fn(() => provider) };
    const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new BillingWebhookService(prisma as never, providers as never, auditLog as never), prisma, tx, provider, providers, auditLog };
  }

  const ingress = (rawBody = Buffer.from('{"safe":"body"}')) => ({ provider: BillingProvider.FAKE, environment: "LOCAL_TEST" as const, contentType: "application/json; charset=utf-8", rawBody, signature: "verified" });

  it("verifies the raw body before parsing or persisting safe webhook metadata", async () => {
    const { service, prisma, provider, auditLog } = harness();
    prisma.billingProviderCustomer.findFirst.mockResolvedValue({ billingAccount: { organizationId: "org-1" } });
    prisma.organizationSubscription.findFirst.mockResolvedValue({ id: "sub-1", organizationId: "org-1", billingAccountId: "account-1" });
    prisma.billingWebhookEvent.create.mockResolvedValue({ id: "event-1" });

    await expect(service.ingest(ingress())).resolves.toMatchObject({ duplicate: false, event: { id: "event-1" } });
    expect(provider.verifyWebhook.mock.invocationCallOrder[0]!).toBeLessThan(provider.normalizeWebhookEvent.mock.invocationCallOrder[0]!);
    expect(prisma.billingWebhookEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payloadHash: expect.any(String), organizationId: "org-1", subscriptionId: "sub-1" }) }));
    expect(prisma.billingWebhookEvent.create.mock.calls[0][0].data).not.toHaveProperty("rawBody");
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "BILLING_WEBHOOK_RECEIVED" }));
  });

  it("rejects invalid content, oversized bodies, and invalid signatures before persistence", async () => {
    const { service, prisma, provider } = harness();
    await expect(service.ingest({ ...ingress(), contentType: "text/plain" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.ingest({ ...ingress(Buffer.alloc(65 * 1024)), contentType: "application/json" })).rejects.toBeInstanceOf(BadRequestException);
    provider.verifyWebhook.mockResolvedValue(false);
    await expect(service.ingest(ingress())).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.billingWebhookEvent.create).not.toHaveBeenCalled();
  });

  it("records a duplicate provider event once and marks its replay as ignored", async () => {
    const { service, prisma } = harness();
    prisma.billingProviderCustomer.findFirst.mockResolvedValue(null);
    prisma.organizationSubscription.findFirst.mockResolvedValue(null);
    prisma.billingWebhookEvent.create.mockRejectedValue({ code: "P2002" });
    prisma.billingWebhookEvent.findUniqueOrThrow.mockResolvedValue({ id: "event-1", status: BillingWebhookProcessingStatus.RECEIVED });

    await expect(service.ingest(ingress())).resolves.toMatchObject({ duplicate: true, event: { status: BillingWebhookProcessingStatus.IGNORED_DUPLICATE } });
    expect(prisma.billingWebhookEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: BillingWebhookProcessingStatus.IGNORED_DUPLICATE } }));
  });

  it("ignores a stale verified event instead of moving local subscription state backward", async () => {
    const { service, prisma, tx, provider } = harness();
    prisma.billingWebhookEvent.findUnique.mockResolvedValue({ id: "event-1", organizationId: "org-1", subscriptionId: "sub-1", provider: BillingProvider.FAKE, providerSubscriptionReference: "sub-ref-1", providerCreatedAt: new Date("2026-07-30T00:00:00.000Z") });
    provider.reconcileSubscription.mockResolvedValue({ provider: BillingProvider.FAKE, providerCustomerReference: "cus-1", providerSubscriptionReference: "sub-ref-1", status: "ACTIVE", interval: "MONTH", providerUpdatedAt: new Date("2026-07-30T00:00:00.000Z"), currentPeriodEndsAt: null, graceDeadline: null, cancelAtPeriodEnd: false });
    tx.billingWebhookEvent.findUniqueOrThrow.mockResolvedValue({ id: "event-1", providerCreatedAt: new Date("2026-07-30T00:00:00.000Z") });
    tx.organizationSubscription.findFirst.mockResolvedValue({ id: "sub-1", organizationId: "org-1", provider: BillingProvider.FAKE, providerSubscriptionReference: "sub-ref-1", providerUpdatedAt: new Date("2026-07-30T00:00:00.000Z"), status: "ACTIVE", version: 4 });

    await expect(service.reconcile("event-1")).resolves.toEqual({ status: BillingWebhookProcessingStatus.IGNORED_STALE });
    expect(tx.organizationSubscription.update).not.toHaveBeenCalled();
    expect(tx.billingWebhookEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: BillingWebhookProcessingStatus.IGNORED_STALE }) }));
  });
});
