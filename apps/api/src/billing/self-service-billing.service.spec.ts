import { SelfServiceBillingService, LAUNCH_CATALOG_VERSION } from "./self-service-billing.service";
import { billingDeadlineExpired, BillingEntitlementService } from "./billing-entitlement.service";

describe("self-service subscription boundaries", () => {
  function harness() {
    const tx = {
      $queryRaw: jest.fn(),
      organizationMember: { findFirst: jest.fn().mockResolvedValue({ user: { emailVerifiedAt: new Date() } }), count: jest.fn().mockResolvedValue(1) },
      organizationSubscription: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(({ data }) => Promise.resolve({ id: "sub-1", ...data })) },
      organizationBillingAccount: { upsert: jest.fn().mockResolvedValue({ id: "billing-1" }) },
      billingPlanVersion: { findFirst: jest.fn().mockResolvedValue({ id: "plan-1" }) },
      billingLifecycleEvent: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)) };
    const config = { get: jest.fn((key: string): string | undefined => key === "LEDGERBYTE_SELF_SERVICE_ENABLED" ? "true" : key === "BILLING_ENFORCEMENT_MODE" ? "ENFORCE" : undefined) };
    const audit = { log: jest.fn() };
    return { service: new SelfServiceBillingService(prisma as never, config as never, audit as never), tx, config, prisma };
  }
  it("starts one owner-verified 14-day trial with server-owned dates and no provider call", async () => {
    const { service, tx, prisma } = harness();
    const result = await service.startTrial("org-1", "owner-1", "STARTER");
    const data = tx.organizationSubscription.create.mock.calls[0]![0].data;
    expect(data.trialEndsAt.getTime() - data.trialStartedAt.getTime()).toBe(14 * 86400000);
    expect(result).toMatchObject({ status: "TRIALING", replay: false });
    expect(tx.billingPlanVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ version: LAUNCH_CATALOG_VERSION }) }));
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(tx.$queryRaw).toHaveBeenCalled();
  });
  it("replays existing or expired subscriptions without refreshing their trial", async () => {
    const { service, tx } = harness();
    const prior = { id: "existing", status: "SUSPENDED", trialEndsAt: new Date("2026-01-01") };
    tx.organizationSubscription.findFirst.mockResolvedValue(prior as never);
    await expect(service.startTrial("org-1", "owner-1", "GROWTH")).resolves.toEqual({ ...prior, replay: true });
    expect(tx.organizationSubscription.create).not.toHaveBeenCalled();
  });
  it("rejects unverified/non-owner accounts and excess seats", async () => {
    const { service, tx } = harness();
    tx.organizationMember.findFirst.mockResolvedValue(null as never);
    await expect(service.startTrial("org-1", "user-1", "STARTER")).rejects.toThrow("verify their email");
    tx.organizationMember.findFirst.mockResolvedValue({ user: { emailVerifiedAt: new Date() } });
    tx.organizationMember.count.mockResolvedValue(4);
    await expect(service.startTrial("org-1", "owner-1", "STARTER")).rejects.toThrow("Reduce active members");
    expect(tx.organizationSubscription.create).not.toHaveBeenCalled();
  });
  it("does not infer the UAE seller's legal name", () => {
    const { service } = harness();
    expect(service.catalog()).toMatchObject({ seller: { legalName: null, country: "AE" }, cardRequired: false, complianceSubmissionIncluded: false });
    expect(service.catalog().plans.map((p) => [p.amountMinor, p.seats])).toEqual([[14900, 3], [29900, 10]]);
  });

  it("keeps signup and trial closed when subscription enforcement is not enabled", async () => {
    const { service, config, tx } = harness();
    config.get.mockImplementation((key) => key === "LEDGERBYTE_SELF_SERVICE_ENABLED" ? "true" : "DISABLED");
    expect(service.catalog().selfServiceEnabled).toBe(false);
    await expect(service.startTrial("org-1", "owner-1", "STARTER")).rejects.toThrow("not enabled");
    expect(tx.organizationSubscription.create).not.toHaveBeenCalled();
  });
  it.each(["TRIALING", "GRACE"] as const)("enforces elapsed %s at request time without a worker", async (status) => {
    const now = new Date("2026-09-19T12:00:00Z");
    const subscription = { status, trialEndsAt: now, graceDeadline: now, planVersion: { entitlements: [{ key: "core_accounting", valueType: "BOOLEAN", booleanValue: true }] } };
    const prisma = { organizationBillingAccount: { findFirst: jest.fn().mockResolvedValue({ subscriptions: [subscription] }) } };
    const service = new BillingEntitlementService(prisma as never, { get: () => "ENFORCE" } as never);
    expect(billingDeadlineExpired(subscription, now)).toBe(true);
    await expect(service.organizationAccessMode("org-1", { now })).resolves.toMatchObject({ accessMode: "READ_ONLY" });
    await expect(service.evaluate("org-1", "core_accounting", { now })).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
  });
});
