import { BillingPriceInterval, BillingProvider, BillingSubscriptionStatus } from "@prisma/client";
import { BillingProviderDisabledError } from "./billing-provider.errors";
import { BillingProviderRegistry } from "./billing-provider.registry";
import { DisabledBillingProvider } from "./disabled-billing.provider";
import { FakeBillingProvider } from "./fake-billing.provider";
import { StripeBillingProvider } from "./stripe-billing.provider";

describe("LedgerByte subscription billing providers", () => {
  const checkout = {
    organizationId: "org-1",
    billingAccountId: "account-1",
    customerReference: "fake_customer_1",
    priceReference: "price_local_month",
    interval: BillingPriceInterval.MONTH,
    idempotencyKey: "checkout-1",
    returnRouteKey: "billing" as const,
  };

  it("defaults to a disabled provider and never creates a checkout", async () => {
    const provider = new DisabledBillingProvider();
    expect(provider.readiness()).toMatchObject({ provider: BillingProvider.DISABLED, status: "DISABLED", networkEnabled: false });
    await expect(provider.createCheckoutSession(checkout)).rejects.toBeInstanceOf(BillingProviderDisabledError);
  });

  it("uses a deterministic local fake provider only in local/test environments", async () => {
    const fake = new FakeBillingProvider("test-authenticator");
    const registry = new BillingProviderRegistry({ get: (key: string) => key === "LEDGERBYTE_BILLING_PROVIDER" ? "FAKE" : "test" } as never, fake);
    const first = await registry.active().createCheckoutSession(checkout);
    const second = await registry.active().createCheckoutSession(checkout);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ provider: BillingProvider.FAKE, networkCallPerformed: false });

    const nonLocal = new BillingProviderRegistry({ get: (key: string) => key === "LEDGERBYTE_BILLING_PROVIDER" ? "FAKE" : "production" } as never, fake);
    expect(nonLocal.active().provider).toBe(BillingProvider.DISABLED);
    expect(nonLocal.forProvider(BillingProvider.FAKE).provider).toBe(BillingProvider.DISABLED);
  });

  it("verifies a fake webhook from its raw body before parsing and normalizes only bounded metadata", async () => {
    const provider = new FakeBillingProvider("test-authenticator");
    const rawBody = Buffer.from(JSON.stringify({ id: "evt_fake_1", type: "customer.subscription.updated", created: "2026-07-30T00:00:00.000Z", customer: "cus_fake_1", subscription: "sub_fake_1" }));
    const signature = provider.signWebhook(rawBody);

    await expect(provider.verifyWebhook({ rawBody, signature, environment: "LOCAL_TEST" })).resolves.toBe(true);
    await expect(provider.verifyWebhook({ rawBody, signature: "wrong", environment: "LOCAL_TEST" })).resolves.toBe(false);
    expect(provider.normalizeWebhookEvent(rawBody)).toEqual(expect.objectContaining({ providerEventId: "evt_fake_1", providerCustomerReference: "cus_fake_1", providerSubscriptionReference: "sub_fake_1" }));
  });

  it("supports a deterministic fake cancellation and reactivation lifecycle without network I/O", async () => {
    const provider = new FakeBillingProvider("test-authenticator");
    provider.seedSubscription({
      providerCustomerReference: "cus_fake_1",
      providerSubscriptionReference: "sub_fake_1",
      status: BillingSubscriptionStatus.ACTIVE,
      interval: BillingPriceInterval.MONTH,
      providerUpdatedAt: new Date("2026-07-30T00:00:00.000Z"),
      currentPeriodEndsAt: new Date("2026-08-30T00:00:00.000Z"),
      graceDeadline: null,
      cancelAtPeriodEnd: false,
    });
    await expect(provider.cancelAtPeriodEnd("sub_fake_1")).resolves.toMatchObject({ status: BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, cancelAtPeriodEnd: true });
    await expect(provider.reactivateSubscription("sub_fake_1")).resolves.toMatchObject({ status: BillingSubscriptionStatus.ACTIVE, cancelAtPeriodEnd: false });
  });

  it("keeps Stripe architecture implemented but execution-disabled while merchant eligibility is pending", async () => {
    const verifier = { verify: jest.fn().mockResolvedValue(true) };
    const provider = new StripeBillingProvider(verifier);
    const rawBody = Buffer.from(JSON.stringify({ id: "evt_stripe_1", type: "invoice.paid", created: 1785369600, data: { object: { customer: "cus_1", subscription: "sub_1", id: "in_1" } } }));
    expect(provider.readiness()).toMatchObject({ provider: BillingProvider.STRIPE, status: "IMPLEMENTED_DISABLED", merchantEligibility: "PENDING_OWNER_EVIDENCE", networkEnabled: false });
    await expect(provider.createCheckoutSession(checkout)).rejects.toBeInstanceOf(BillingProviderDisabledError);
    await expect(provider.verifyWebhook({ rawBody, signature: "local-proof", environment: "TEST" })).resolves.toBe(true);
    expect(provider.normalizeWebhookEvent(rawBody)).toEqual(expect.objectContaining({ providerEventId: "evt_stripe_1", providerCustomerReference: "cus_1", providerSubscriptionReference: "sub_1", providerInvoiceReference: "in_1" }));
  });
});
