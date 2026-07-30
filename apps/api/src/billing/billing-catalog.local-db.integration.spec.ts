import { randomUUID } from "node:crypto";
import {
  BillingEntitlementValueType,
  BillingPlanStatus,
  BillingPlanVersionStatus,
  BillingPriceInterval,
  BillingProvider,
  BillingProviderEnvironment,
  BillingSubscriptionStatus,
  PrismaClient,
} from "@prisma/client";

const runLocalDbProof = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true";
const describeLocalDb = runLocalDbProof ? describe : describe.skip;

describeLocalDb("billing catalog schema local database proof", () => {
  const prisma = new PrismaClient();
  const marker = `paid-saas-catalog-${randomUUID()}`;
  const fixture = {
    organizationAId: randomUUID(),
    organizationBId: randomUUID(),
    planId: randomUUID(),
    planVersionId: randomUUID(),
    planVersionTwoId: randomUUID(),
    entitlementId: randomUUID(),
    accountAId: randomUUID(),
    accountBId: randomUUID(),
    priceId: randomUUID(),
  };

  beforeAll(async () => {
    await prisma.organization.createMany({
      data: [
        { id: fixture.organizationAId, name: `${marker}-a` },
        { id: fixture.organizationBId, name: `${marker}-b` },
      ],
    });
    await prisma.billingPlan.create({
      data: {
        id: fixture.planId,
        key: "STARTER",
        displayName: "Synthetic starter",
        internalDescription: marker,
        status: BillingPlanStatus.ACTIVE,
      },
    });
    await prisma.billingPlanVersion.create({
      data: {
        id: fixture.planVersionId,
        billingPlanId: fixture.planId,
        version: 1,
        status: BillingPlanVersionStatus.DRAFT,
        effectiveAt: new Date("2026-07-30T00:00:00.000Z"),
        entitlementSnapshot: { core_accounting: true, active_member_seats: 3 },
      },
    });
    await prisma.billingPlanEntitlement.create({
      data: {
        id: fixture.entitlementId,
        planVersionId: fixture.planVersionId,
        key: "core_accounting",
        valueType: BillingEntitlementValueType.BOOLEAN,
        booleanValue: true,
      },
    });
    await prisma.billingPrice.create({
      data: {
        id: fixture.priceId,
        planVersionId: fixture.planVersionId,
        provider: BillingProvider.FAKE,
        environment: BillingProviderEnvironment.LOCAL_TEST,
        interval: BillingPriceInterval.MONTH,
        currency: "XTS",
        amountMinor: 12_345n,
        providerProductId: `${marker}-product`,
        providerPriceId: `${marker}-price`,
      },
    });
    await prisma.billingPlanVersion.update({ where: { id: fixture.planVersionId }, data: { status: BillingPlanVersionStatus.ACTIVE } });
    await prisma.organizationBillingAccount.createMany({
      data: [
        { id: fixture.accountAId, organizationId: fixture.organizationAId, provider: BillingProvider.FAKE },
        { id: fixture.accountBId, organizationId: fixture.organizationBId, provider: BillingProvider.FAKE },
      ],
    });
  });

  afterAll(async () => {
    await prisma.billingLifecycleEvent.deleteMany({ where: { organizationId: { in: [fixture.organizationAId, fixture.organizationBId] } } });
    await prisma.billingInvoiceReference.deleteMany({ where: { organizationId: { in: [fixture.organizationAId, fixture.organizationBId] } } });
    await prisma.billingWebhookEvent.deleteMany({ where: { organizationId: { in: [fixture.organizationAId, fixture.organizationBId] } } });
    await prisma.billingCheckoutAttempt.deleteMany({ where: { organizationId: { in: [fixture.organizationAId, fixture.organizationBId] } } });
    await prisma.subscriptionScheduledChange.deleteMany({ where: { organizationId: { in: [fixture.organizationAId, fixture.organizationBId] } } });
    await prisma.organizationSubscription.deleteMany({ where: { organizationId: { in: [fixture.organizationAId, fixture.organizationBId] } } });
    await prisma.billingProviderCustomer.deleteMany({ where: { billingAccountId: { in: [fixture.accountAId, fixture.accountBId] } } });
    await prisma.organizationBillingAccount.deleteMany({ where: { id: { in: [fixture.accountAId, fixture.accountBId] } } });
    await prisma.billingPrice.deleteMany({ where: { planVersionId: { in: [fixture.planVersionId, fixture.planVersionTwoId] } } });
    await prisma.billingPlanVersion.updateMany({
      where: { id: { in: [fixture.planVersionId, fixture.planVersionTwoId] } },
      data: { status: BillingPlanVersionStatus.RETIRED },
    });
    await prisma.billingPlanEntitlement.deleteMany({ where: { planVersionId: { in: [fixture.planVersionId, fixture.planVersionTwoId] } } });
    await prisma.billingPlanVersion.deleteMany({ where: { id: { in: [fixture.planVersionId, fixture.planVersionTwoId] } } });
    await prisma.billingPlan.deleteMany({ where: { id: fixture.planId } });
    await prisma.organization.deleteMany({ where: { id: { in: [fixture.organizationAId, fixture.organizationBId] } } });
    await prisma.$disconnect();
  });

  it("freezes activated plan contracts and their entitlement rows", async () => {
    await expect(
      prisma.billingPlanVersion.update({ where: { id: fixture.planVersionId }, data: { entitlementSnapshot: { core_accounting: false } } }),
    ).rejects.toThrow("Activated billing plan versions are immutable");
    await expect(
      prisma.billingPlanEntitlement.update({ where: { id: fixture.entitlementId }, data: { booleanValue: false } }),
    ).rejects.toThrow("Activated billing plan entitlements are immutable");
  });

  it("rejects duplicate provider identifiers", async () => {
    await prisma.billingProviderCustomer.create({
      data: {
        billingAccountId: fixture.accountAId,
        provider: BillingProvider.FAKE,
        environment: BillingProviderEnvironment.LOCAL_TEST,
        providerCustomerReference: `${marker}-customer`,
      },
    });
    await expect(
      prisma.billingProviderCustomer.create({
        data: {
          billingAccountId: fixture.accountBId,
          provider: BillingProvider.FAKE,
          environment: BillingProviderEnvironment.LOCAL_TEST,
          providerCustomerReference: `${marker}-customer`,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("reserves exactly one durable record for concurrent duplicate provider events", async () => {
    const providerEventId = `${marker}-event`;
    const createWebhook = () => prisma.billingWebhookEvent.create({
      data: {
        organizationId: fixture.organizationAId,
        provider: BillingProvider.FAKE,
        environment: BillingProviderEnvironment.LOCAL_TEST,
        providerEventId,
        eventType: "invoice.paid",
        payloadHash: `${marker}-payload-hash`,
      },
    });

    const outcomes = await Promise.allSettled([createWebhook(), createWebhook()]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
    expect(await prisma.billingWebhookEvent.count({ where: { provider: BillingProvider.FAKE, environment: BillingProviderEnvironment.LOCAL_TEST, providerEventId } })).toBe(1);
  });

  it("permits exactly one concurrent open subscription and keeps it tenant-scoped", async () => {
    const createSubscription = (reference: string) =>
      prisma.organizationSubscription.create({
        data: {
          organizationId: fixture.organizationAId,
          billingAccountId: fixture.accountAId,
          planVersionId: fixture.planVersionId,
          provider: BillingProvider.FAKE,
          providerSubscriptionReference: reference,
          status: BillingSubscriptionStatus.ACTIVE,
          interval: BillingPriceInterval.MONTH,
        },
      });

    const outcomes = await Promise.allSettled([createSubscription(`${marker}-sub-a`), createSubscription(`${marker}-sub-b`)]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
    expect(await prisma.organizationSubscription.count({ where: { organizationId: fixture.organizationAId } })).toBe(1);

    const subscription = await prisma.organizationSubscription.findFirstOrThrow({ where: { organizationId: fixture.organizationAId } });
    expect(await prisma.organizationSubscription.findFirst({ where: { id: subscription.id, organizationId: fixture.organizationBId } })).toBeNull();
  });
});
