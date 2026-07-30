import { randomUUID } from "node:crypto";
import {
  BillingEntitlementValueType,
  BillingPlanStatus,
  BillingPlanVersionStatus,
  BillingPriceInterval,
  BillingProvider,
  BillingSubscriptionStatus,
  PrismaClient,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { BillingLifecycleService } from "./billing-lifecycle.service";

const describeLocalDb = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true" ? describe : describe.skip;
const runLocalDbProof = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true";

describeLocalDb("billing lifecycle local database proof", () => {
  const prisma = new PrismaClient();
  if (!runLocalDbProof) void prisma.$disconnect();
  const marker = `paid-saas-lifecycle-${randomUUID()}`;
  const ids = {
    organization: randomUUID(),
    plan: randomUUID(),
    version: randomUUID(),
    entitlement: randomUUID(),
    account: randomUUID(),
    subscription: randomUUID(),
  };
  const service = new BillingLifecycleService(prisma as never, new AuditLogService(prisma as never));
  const now = new Date("2026-07-30T00:00:00.000Z");

  beforeAll(async () => {
    await prisma.organization.create({ data: { id: ids.organization, name: marker } });
    await prisma.billingPlan.create({ data: { id: ids.plan, key: "STARTER", displayName: marker, internalDescription: marker, status: BillingPlanStatus.ACTIVE } });
    await prisma.billingPlanVersion.create({ data: { id: ids.version, billingPlanId: ids.plan, version: 1, status: BillingPlanVersionStatus.DRAFT, entitlementSnapshot: { core_accounting: true } } });
    await prisma.billingPlanEntitlement.create({ data: { id: ids.entitlement, planVersionId: ids.version, key: "core_accounting", valueType: BillingEntitlementValueType.BOOLEAN, booleanValue: true } });
    await prisma.billingPlanVersion.update({ where: { id: ids.version }, data: { status: BillingPlanVersionStatus.ACTIVE } });
    await prisma.organizationBillingAccount.create({ data: { id: ids.account, organizationId: ids.organization, provider: BillingProvider.FAKE } });
    await prisma.organizationSubscription.create({
      data: {
        id: ids.subscription,
        organizationId: ids.organization,
        billingAccountId: ids.account,
        planVersionId: ids.version,
        provider: BillingProvider.FAKE,
        status: BillingSubscriptionStatus.GRACE,
        interval: BillingPriceInterval.MONTH,
        graceDeadline: new Date("2026-07-29T00:00:00.000Z"),
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.billingLifecycleEvent.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.organizationSubscription.deleteMany({ where: { id: ids.subscription } });
    await prisma.organizationBillingAccount.deleteMany({ where: { id: ids.account } });
    await prisma.billingPlanVersion.update({ where: { id: ids.version }, data: { status: BillingPlanVersionStatus.RETIRED } });
    await prisma.billingPlanEntitlement.deleteMany({ where: { id: ids.entitlement } });
    await prisma.billingPlanVersion.deleteMany({ where: { id: ids.version } });
    await prisma.billingPlan.deleteMany({ where: { id: ids.plan } });
    await prisma.organization.deleteMany({ where: { id: ids.organization } });
    await prisma.$disconnect();
  });

  it("allows only one concurrent grace-expiry worker to perform the lifecycle transition", async () => {
    const outcomes = await Promise.allSettled([
      service.processDueTransitions({ now, batchSize: 10 }),
      service.processDueTransitions({ now, batchSize: 10 }),
    ]);

    expect(outcomes.every((outcome) => outcome.status === "fulfilled")).toBe(true);
    const processed = outcomes.reduce((total, outcome) => total + (outcome.status === "fulfilled" ? outcome.value.processed : 0), 0);
    expect(processed).toBe(1);
    await expect(prisma.organizationSubscription.findUniqueOrThrow({ where: { id: ids.subscription } })).resolves.toMatchObject({ status: BillingSubscriptionStatus.SUSPENDED, version: 2 });
    await expect(prisma.billingLifecycleEvent.count({ where: { subscriptionId: ids.subscription, eventType: "GRACE_EXPIRED" } })).resolves.toBe(1);
    await expect(prisma.auditLog.count({ where: { organizationId: ids.organization, entityId: ids.subscription } })).resolves.toBe(1);
  });
});
