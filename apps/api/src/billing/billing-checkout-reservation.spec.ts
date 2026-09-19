import { BillingManagementService } from "./billing-management.service";

describe("server-owned checkout reservation", () => {
  function harness() {
    const subscription = { id: "sub-local", organizationId: "org-1", billingAccountId: "account-1", status: "TRIALING", provider: "STRIPE", providerSubscriptionReference: null, version: 1 };
    const price = { id: "local-price", providerPriceId: "price_starter", amountMinor: 14900n };
    const attempts: Array<Record<string, any>> = [];
    const prisma = {
      $queryRaw: jest.fn(), $transaction: jest.fn(),
      organizationSubscription: { findFirst: jest.fn().mockImplementation(() => subscription), findFirstOrThrow: jest.fn().mockImplementation(() => subscription) },
      organizationMember: { count: jest.fn().mockResolvedValue(1) },
      billingPlanEntitlement: { findUnique: jest.fn().mockResolvedValue({ integerValue: 3 }) },
      billingPlanVersion: { findFirst: jest.fn().mockResolvedValue({ id: "starter-version", billingPlan: { key: "STARTER" }, prices: [price] }) },
      billingPrice: { update: jest.fn().mockResolvedValue(price) },
      billingProviderCustomer: { findUnique: jest.fn().mockResolvedValue({ providerCustomerReference: "cus_server" }), upsert: jest.fn() },
      billingCheckoutAttempt: {
        findFirst: jest.fn(() => attempts.find((attempt) => ["PROVIDER_PENDING", "READY"].includes(attempt.status)) ?? null),
        create: jest.fn(({ data }) => { const attempt = { createdAt: new Date(), ...data }; attempts.push(attempt); return attempt; }),
        update: jest.fn(({ where, data }) => Object.assign(attempts.find((attempt) => attempt.id === where.id)!, data)),
        updateMany: jest.fn(({ where, data }) => { Object.assign(attempts.find((attempt) => attempt.id === where.id)!, data); return { count: 1 }; }),
      },
    };
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    const provider = { readiness: () => ({ checkoutEnabled: true }), ensureCustomer: jest.fn(), inspectCheckoutSession: jest.fn().mockResolvedValue({ status: "open", redirectUrl: "https://checkout.stripe.com/synthetic", safeToRetry: false, subscription: null }), createCheckoutSession: jest.fn().mockResolvedValue({ providerSessionReference: "cs_test", redirectUrl: "https://checkout.stripe.com/synthetic" }) };
    const config = { get: () => "price_starter" };
    return { service: new BillingManagementService(prisma as never, {} as never, {} as never, { active: () => provider } as never, config as never), prisma, provider, subscription, attempts };
  }
  it("reuses the same payment session key across a local trial expiry revision", async () => {
    const { service, provider, subscription } = harness();
    await expect(service.prepareCheckout("org-1", "starter-version", "plans")).resolves.toMatchObject({ prepared: true });
    subscription.version = 2; subscription.status = "SUSPENDED";
    await service.prepareCheckout("org-1", "starter-version", "plans");
    expect(provider.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(provider.createCheckoutSession.mock.calls[0]![0].idempotencyKey).toMatch(/^checkout:/);
    expect(provider.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({ customerReference: "cus_server", priceReference: "price_starter", subscriptionId: "sub-local", expectedAmountMinor: 14900 }));
  });
  it("does not allow a larger trial team to buy a smaller plan", async () => {
    const { service, prisma, provider } = harness();
    prisma.organizationMember.count.mockResolvedValue(4);
    await expect(service.prepareCheckout("org-1", "starter-version", "plans")).rejects.toThrow("Reduce active members");
    expect(provider.createCheckoutSession).not.toHaveBeenCalled();
    expect(prisma.billingCheckoutAttempt.create).not.toHaveBeenCalled();
  });
  it("rejects changed checkout selection without creating another provider session", async () => {
    const { service, provider } = harness();
    await service.prepareCheckout("org-1", "starter-version", "plans");
    await expect(service.prepareCheckout("org-1", "another-version", "plans")).rejects.toThrow("another selection");
    expect(provider.createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it("rotates an expired provider-confirmed checkout once and keeps each new key stable", async () => {
    const { service, provider, attempts } = harness();
    await service.prepareCheckout("org-1", "starter-version", "plans");
    attempts[0]!.createdAt = new Date(Date.now() - 25 * 3600000);
    provider.inspectCheckoutSession.mockResolvedValueOnce({ status: "expired", safeToRetry: true, subscription: null, redirectUrl: null });
    await expect(service.prepareCheckout("org-1", "starter-version", "plans")).resolves.toMatchObject({ prepared: true });
    expect(attempts).toHaveLength(2);
    expect(attempts[0]!.status).toBe("EXPIRED");
    expect(provider.createCheckoutSession.mock.calls[0]![0].idempotencyKey).not.toEqual(provider.createCheckoutSession.mock.calls[1]![0].idempotencyKey);
    await service.prepareCheckout("org-1", "starter-version", "plans");
    expect(provider.createCheckoutSession).toHaveBeenCalledTimes(2);
  });

  it("preserves the trial and refuses another session while initial payment remains incomplete", async () => {
    const { service, provider, subscription } = harness();
    await service.prepareCheckout("org-1", "starter-version", "plans");
    provider.inspectCheckoutSession.mockResolvedValueOnce({ status: "complete", safeToRetry: false, subscription: { initialPaymentIncomplete: true }, redirectUrl: null });
    await expect(service.prepareCheckout("org-1", "starter-version", "plans")).rejects.toThrow("remaining trial is preserved");
    expect(provider.createCheckoutSession).toHaveBeenCalledTimes(1);
    expect(subscription.status).toBe("TRIALING");
  });

  it("rechecks activation inside the reservation transaction before creating another checkout", async () => {
    const { service, prisma, provider, subscription } = harness();
    prisma.organizationSubscription.findFirstOrThrow.mockResolvedValueOnce({ ...subscription, status: "ACTIVE", providerSubscriptionReference: "sub_paid" } as never);
    await expect(service.prepareCheckout("org-1", "starter-version", "plans")).rejects.toThrow("already activated");
    expect(provider.createCheckoutSession).not.toHaveBeenCalled();
  });
});
