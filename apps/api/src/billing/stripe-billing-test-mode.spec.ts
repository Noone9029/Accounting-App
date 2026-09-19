import Stripe from "stripe";
import { StripeBillingProvider } from "./stripe-billing.provider";

describe("Stripe synthetic test adapter", () => {
  const configured = (overrides: Record<string, string> = {}) => ({ get: (key: string) => ({ LEDGERBYTE_STRIPE_TEST_MODE_ENABLED: "true", BILLING_STRIPE_SECRET_KEY: ["rk", "test", "local-synthetic-only"].join("_"), BILLING_STRIPE_WEBHOOK_SECRET: "whsec_local_synthetic_only", APP_WEB_URL: "https://app.example.test", ...overrides } as Record<string, string>)[key] });
  const request = { organizationId: "org-1", billingAccountId: "account-1", subscriptionId: "sub-local-1", customerReference: "cus_synthetic", priceReference: "price_starter", interval: "MONTH" as const, idempotencyKey: "same-checkout", returnRouteKey: "plans" as const, expectedAmountMinor: 14900 };
  it.each(["sk", "rk"])("refuses %s live keys even if the test flag is enabled", async (prefix) => {
    const sdk = { checkout: { sessions: { create: jest.fn() } } };
    const provider = new StripeBillingProvider(undefined, configured({ BILLING_STRIPE_SECRET_KEY: [prefix, "live", "invalid-synthetic"].join("_") }) as never, sdk as never);
    await expect(provider.createCheckoutSession(request)).rejects.toThrow("disabled");
    expect(sdk.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("uses server customer/price/return mapping and subscription Checkout without implicit tax", async () => {
    const sdk = { prices: { retrieve: jest.fn().mockResolvedValue({ id: "price_starter", livemode: false, active: true, currency: "sar", unit_amount: 14900, recurring: { interval: "month", interval_count: 1 } }) }, checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: "cs_test_synthetic", livemode: false, url: "https://checkout.stripe.com/synthetic" }) } } };
    const provider = new StripeBillingProvider(undefined, configured() as never, sdk as never);
    await expect(provider.createCheckoutSession(request)).resolves.toMatchObject({ networkCallPerformed: true, providerSessionReference: "cs_test_synthetic" });
    const [params, options] = sdk.checkout.sessions.create.mock.calls[0]!;
    expect(params).toMatchObject({ mode: "subscription", customer: "cus_synthetic", subscription_data: { metadata: { ledgerbyte_subscription: "sub-local-1" } }, success_url: "https://app.example.test/settings/billing?checkout=returned" });
    expect(params).not.toHaveProperty("payment_method_types"); expect(params).not.toHaveProperty("automatic_tax");
    expect(options).toEqual({ idempotencyKey: "same-checkout" });
  });
  it("rejects a wrong price amount before checkout", async () => {
    const sdk = { prices: { retrieve: jest.fn().mockResolvedValue({ livemode: false, active: true, currency: "sar", unit_amount: 29900, recurring: { interval: "month", interval_count: 1 } }) }, checkout: { sessions: { create: jest.fn() } } };
    const provider = new StripeBillingProvider(undefined, configured() as never, sdk as never);
    await expect(provider.createCheckoutSession(request)).rejects.toThrow("Reconcile status");
    expect(sdk.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("validates the real SDK raw-body signature and rejects live webhook events", async () => {
    const stripe = new Stripe(["sk", "test", "synthetic-no-network"].join("_"));
    const provider = new StripeBillingProvider(undefined, configured() as never, stripe);
    const body = JSON.stringify({ id: "evt_test", type: "invoice.paid", livemode: false, data: { object: { id: "in_test" } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: "whsec_local_synthetic_only" });
    await expect(provider.verifyWebhook({ rawBody: Buffer.from(body), signature, environment: "TEST" })).resolves.toBe(true);
    await expect(provider.verifyWebhook({ rawBody: Buffer.from(body + " "), signature, environment: "TEST" })).resolves.toBe(false);
    const live = body.replace('"livemode":false', '"livemode":true');
    const liveSignature = stripe.webhooks.generateTestHeaderString({ payload: live, secret: "whsec_local_synthetic_only" });
    await expect(provider.verifyWebhook({ rawBody: Buffer.from(live), signature: liveSignature, environment: "TEST" })).resolves.toBe(false);
  });
  it("normalizes modern invoice parent subscription references", () => {
    const provider = new StripeBillingProvider();
    const event = provider.normalizeWebhookEvent(Buffer.from(JSON.stringify({ id: "evt_1", type: "invoice.paid", created: 1789830000, data: { object: { id: "in_1", customer: "cus_1", parent: { subscription_details: { subscription: "sub_1" } } } } })));
    expect(event.providerSubscriptionReference).toBe("sub_1");
  });

  it.each([
    { subscription_update: { enabled: true }, subscription_cancel: { enabled: false } },
    { subscription_update: { enabled: false }, subscription_cancel: { enabled: true, mode: "immediately" } },
  ])("rejects a portal policy that can bypass plan controls", async (features) => {
    const sdk = { billingPortal: { configurations: { retrieve: jest.fn().mockResolvedValue({ features }) }, sessions: { create: jest.fn() } } };
    const provider = new StripeBillingProvider(undefined, configured({ BILLING_STRIPE_PORTAL_CONFIGURATION: "bpc_synthetic" }) as never, sdk as never);
    await expect(provider.createCustomerPortalSession({ organizationId: "org-1", billingAccountId: "account-1", customerReference: "cus_synthetic", returnRouteKey: "billing-settings" } as never)).rejects.toThrow("Reconcile status");
    expect(sdk.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it("allows a portal with payment methods and period-end cancellation only", async () => {
    const sdk = { billingPortal: { configurations: { retrieve: jest.fn().mockResolvedValue({ features: { subscription_update: { enabled: false }, subscription_cancel: { enabled: true, mode: "at_period_end" } } }) }, sessions: { create: jest.fn().mockResolvedValue({ id: "bps_synthetic", url: "https://billing.stripe.com/synthetic" }) } } };
    const provider = new StripeBillingProvider(undefined, configured({ BILLING_STRIPE_PORTAL_CONFIGURATION: "bpc_synthetic" }) as never, sdk as never);
    await expect(provider.createCustomerPortalSession({ organizationId: "org-1", billingAccountId: "account-1", customerReference: "cus_synthetic", returnRouteKey: "billing-settings" } as never)).resolves.toMatchObject({ providerSessionReference: "bps_synthetic" });
  });

  function syntheticSubscription(amount = 14900) {
    return { id: "sub_test", customer: "cus_test", livemode: false, status: "active", cancel_at_period_end: false, metadata: { ledgerbyte_subscription: "local-sub" }, items: { data: [{ id: "si_test", quantity: 1, current_period_start: 1789830000, current_period_end: 1792422000, price: { id: amount === 14900 ? "price_starter" : "price_growth", unit_amount: amount, currency: "sar", recurring: { interval: "month", interval_count: 1 } } }] } };
  }
  it.each([
    { status: "expired", subscription: null, payment_status: "unpaid", safe: true },
    { status: "complete", subscription: { ...syntheticSubscription(), status: "incomplete_expired", latest_invoice: { status: "void", amount_paid: 0 } }, payment_status: "unpaid", safe: true },
    { status: "complete", subscription: { ...syntheticSubscription(), status: "incomplete", latest_invoice: { status: "open", amount_paid: 0 } }, payment_status: "unpaid", safe: false },
    { status: "complete", subscription: { ...syntheticSubscription(), status: "canceled", latest_invoice: { status: "paid", amount_paid: 14900 } }, payment_status: "paid", safe: false },
  ])("permits checkout retry only with terminal unpaid proof: $status/$safe", async ({ safe, ...session }) => {
    const sdk = { checkout: { sessions: { retrieve: jest.fn().mockResolvedValue({ id: "cs_test", livemode: false, client_reference_id: "local-sub", customer: "cus_test", ...session }) } } };
    const provider = new StripeBillingProvider(undefined, configured() as never, sdk as never);
    await expect(provider.inspectCheckoutSession("cs_test", "cus_test", "local-sub")).resolves.toMatchObject({ safeToRetry: safe });
  });
  it("upgrades only with pending payment behavior and provider-calculated proration", async () => {
    const sdk = { subscriptions: { retrieve: jest.fn().mockResolvedValue(syntheticSubscription()), update: jest.fn().mockResolvedValue(syntheticSubscription(29900)) }, prices: { retrieve: jest.fn().mockResolvedValue({ id: "price_growth", active: true, livemode: false, currency: "sar", unit_amount: 29900, recurring: { interval: "month", interval_count: 1 } }) } };
    const provider = new StripeBillingProvider(undefined, configured() as never, sdk as never);
    await expect(provider.schedulePlanChange({ providerSubscriptionReference: "sub_test", priceReference: "price_growth", effectiveAt: new Date() })).resolves.toMatchObject({ providerPriceReference: "price_growth" });
    expect(sdk.subscriptions.update).toHaveBeenCalledWith("sub_test", expect.objectContaining({ payment_behavior: "pending_if_incomplete", proration_behavior: "always_invoice" }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
  });
  it("schedules downgrade at the verified renewal boundary without immediate proration", async () => {
    const sdk = { subscriptions: { retrieve: jest.fn().mockResolvedValue(syntheticSubscription(29900)) }, prices: { retrieve: jest.fn().mockResolvedValue({ id: "price_starter", active: true, livemode: false, currency: "sar", unit_amount: 14900, recurring: { interval: "month", interval_count: 1 } }) }, subscriptionSchedules: { create: jest.fn().mockResolvedValue({ id: "sched_test" }), update: jest.fn() } };
    const provider = new StripeBillingProvider(undefined, configured() as never, sdk as never);
    await expect(provider.schedulePlanChange({ providerSubscriptionReference: "sub_test", priceReference: "price_starter", effectiveAt: new Date("2040-01-01") })).resolves.toMatchObject({ providerPriceReference: "price_growth" });
    expect(sdk.subscriptionSchedules.update).toHaveBeenCalledWith("sched_test", expect.objectContaining({ phases: [expect.objectContaining({ end_date: 1792422000, proration_behavior: "none" }), expect.objectContaining({ items: [{ price: "price_starter", quantity: 1 }], proration_behavior: "none" })] }), expect.any(Object));
  });
});
