import { randomUUID } from "node:crypto";
import {
  BillingEntitlementValueType,
  BillingPlanStatus,
  BillingPlanVersionStatus,
  BillingPriceInterval,
  BillingProvider,
  BillingSubscriptionStatus,
  MembershipStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { BillingEntitlementService } from "./billing-entitlement.service";

const describeLocalDb = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true" ? describe : describe.skip;

describeLocalDb("billing entitlement local database proof", () => {
  const prisma = new PrismaClient();
  const marker = `paid-saas-entitlement-${randomUUID()}`;
  const ids = {
    organization: randomUUID(), plan: randomUUID(), version: randomUUID(), entitlement: randomUUID(), account: randomUUID(), subscription: randomUUID(), role: randomUUID(),
    users: [randomUUID(), randomUUID()], members: [randomUUID(), randomUUID()],
  };
  const service = new BillingEntitlementService(prisma as never, { get: () => "ENFORCE" } as never);

  beforeAll(async () => {
    await prisma.organization.create({ data: { id: ids.organization, name: marker } });
    await prisma.billingPlan.create({ data: { id: ids.plan, key: "STARTER", displayName: marker, internalDescription: marker, status: BillingPlanStatus.ACTIVE } });
    await prisma.billingPlanVersion.create({ data: { id: ids.version, billingPlanId: ids.plan, version: 1, status: BillingPlanVersionStatus.DRAFT, entitlementSnapshot: { active_member_seats: 1 } } });
    await prisma.billingPlanEntitlement.create({ data: { id: ids.entitlement, planVersionId: ids.version, key: "active_member_seats", valueType: BillingEntitlementValueType.INTEGER, integerValue: 1 } });
    await prisma.billingPlanVersion.update({ where: { id: ids.version }, data: { status: BillingPlanVersionStatus.ACTIVE } });
    await prisma.organizationBillingAccount.create({ data: { id: ids.account, organizationId: ids.organization, provider: BillingProvider.FAKE } });
    await prisma.organizationSubscription.create({ data: { id: ids.subscription, organizationId: ids.organization, billingAccountId: ids.account, planVersionId: ids.version, provider: BillingProvider.FAKE, status: BillingSubscriptionStatus.ACTIVE, interval: BillingPriceInterval.MONTH } });
    await prisma.role.create({ data: { id: ids.role, organizationId: ids.organization, name: marker, permissions: [] } });
    await prisma.user.createMany({ data: ids.users.map((id, index) => ({ id, email: `${marker}-${index}@example.test`, name: marker, passwordHash: "synthetic" })) });
  });

  afterAll(async () => {
    await prisma.organizationMember.deleteMany({ where: { organizationId: ids.organization } });
    await prisma.user.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.organizationSubscription.deleteMany({ where: { id: ids.subscription } });
    await prisma.organizationBillingAccount.deleteMany({ where: { id: ids.account } });
    await prisma.role.deleteMany({ where: { id: ids.role } });
    await prisma.billingPlanVersion.update({ where: { id: ids.version }, data: { status: BillingPlanVersionStatus.RETIRED } });
    await prisma.billingPlanEntitlement.deleteMany({ where: { id: ids.entitlement } });
    await prisma.billingPlanVersion.deleteMany({ where: { id: ids.version } });
    await prisma.billingPlan.deleteMany({ where: { id: ids.plan } });
    await prisma.organization.deleteMany({ where: { id: ids.organization } });
    await prisma.$disconnect();
  });

  it("allows exactly one concurrent seat reservation", async () => {
    const invite = (index: number) => prisma.$transaction(async (tx) => {
      await service.assertSeatInvitationAllowed(ids.organization, tx);
      await tx.$executeRaw(Prisma.sql`SELECT pg_sleep(0.15)`);
      return tx.organizationMember.create({ data: { id: ids.members[index]!, organizationId: ids.organization, userId: ids.users[index]!, roleId: ids.role, status: MembershipStatus.INVITED } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const outcomes = await Promise.allSettled([invite(0), invite(1)]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
    expect(await prisma.organizationMember.count({ where: { organizationId: ids.organization, status: { in: [MembershipStatus.ACTIVE, MembershipStatus.INVITED] } } })).toBe(1);
  });
});
