import { createHash, randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import {
  BillingEntitlementValueType,
  BillingPlanKey,
  BillingPlanStatus,
  BillingPlanVersionStatus,
  BillingPriceInterval,
  BillingProvider,
  BillingProviderEnvironment,
  BillingSubscriptionStatus,
  MembershipStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { BillingLifecycleService } from "./billing-lifecycle.service";
import { BillingProviderRegistry } from "./billing-provider.registry";
import { BillingWebhookService } from "./billing-webhook.service";
import { FakeBillingProvider } from "./fake-billing.provider";
import { BILLING_ENTITLEMENT_KEYS } from "./billing-entitlement-registry";

const describeProof = process.env.LEDGERBYTE_PAID_SAAS_LOCAL_PROOF === "true" ? describe : describe.skip;

describeProof("paid SaaS local lifecycle proof", () => {
  const prisma = new PrismaClient();
  if (process.env.LEDGERBYTE_PAID_SAAS_LOCAL_PROOF !== "true") void prisma.$disconnect();
  const marker = `paid-saas-local-proof-${randomUUID()}`;
  const now = new Date("2026-07-30T10:00:00.000Z");
  const orgA = randomUUID();
  const orgB = randomUUID();
  const accountA = randomUUID();
  const accountB = randomUUID();
  const subscriptionA = randomUUID();
  const ids = { starterPlan: randomUUID(), starterVersion: randomUUID(), growthPlan: randomUUID(), growthVersion: randomUUID(), ksaPlan: randomUUID(), ksaVersion: randomUUID(), starterPriceMonth: randomUUID(), starterPriceYear: randomUUID(), growthPriceMonth: randomUUID(), userA: randomUUID(), userB: randomUUID(), roleA: randomUUID(), memberA: randomUUID() };
  const fake = new FakeBillingProvider("paid-saas-local-proof-signing-key");
  const config = { get: (key: string) => ({ APP_ENV: "test", LEDGERBYTE_BILLING_PROVIDER: "FAKE", BILLING_ENFORCEMENT_MODE: "ENFORCE" }[key]) };
  const lifecycle = new BillingLifecycleService(prisma as never, new AuditLogService(prisma as never));
  const entitlements = new BillingEntitlementService(prisma as never, config as never);
  const webhooks = new BillingWebhookService(prisma as never, new BillingProviderRegistry(config as never, fake), new AuditLogService(prisma as never));

  beforeAll(async () => {
    await prisma.organization.createMany({ data: [{ id: orgA, name: `${marker}-a` }, { id: orgB, name: `${marker}-b` }] });
    await createPlan(ids.starterPlan, ids.starterVersion, BillingPlanKey.STARTER, 3, [ids.starterPriceMonth, ids.starterPriceYear]);
    await createPlan(ids.growthPlan, ids.growthVersion, BillingPlanKey.GROWTH, 10, [ids.growthPriceMonth]);
    await createPlan(ids.ksaPlan, ids.ksaVersion, BillingPlanKey.KSA_COMPLIANCE, 0, []);
    await prisma.organizationBillingAccount.create({ data: { id: accountA, organizationId: orgA, provider: BillingProvider.FAKE } });
    await prisma.billingProviderCustomer.create({ data: { billingAccountId: accountA, provider: BillingProvider.FAKE, environment: BillingProviderEnvironment.LOCAL_TEST, providerCustomerReference: `${marker}-customer-a` } });
    await prisma.organizationSubscription.create({ data: { id: subscriptionA, organizationId: orgA, billingAccountId: accountA, planVersionId: ids.starterVersion, provider: BillingProvider.FAKE, providerSubscriptionReference: `${marker}-subscription-a`, status: BillingSubscriptionStatus.PENDING, interval: BillingPriceInterval.MONTH } });
    await prisma.role.create({ data: { id: ids.roleA, organizationId: orgA, name: marker, permissions: [] } });
    await prisma.user.createMany({ data: [{ id: ids.userA, email: `${marker}-owner@example.test`, name: marker, passwordHash: "synthetic" }, { id: ids.userB, email: `${marker}-staff@example.test`, name: marker, passwordHash: "synthetic" }] });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.billingLifecycleEvent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.billingInvoiceReference.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.billingWebhookEvent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.billingCheckoutAttempt.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.subscriptionScheduledChange.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.organizationSubscription.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    await prisma.billingProviderCustomer.deleteMany({ where: { billingAccountId: { in: [accountA, accountB] } } });
    await prisma.organizationBillingAccount.deleteMany({ where: { id: accountA } });
    await prisma.role.deleteMany({ where: { id: ids.roleA } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.userA, ids.userB] } } });
    await prisma.billingPrice.deleteMany({ where: { planVersionId: { in: [ids.starterVersion, ids.growthVersion, ids.ksaVersion] } } });
    await prisma.billingPlanVersion.updateMany({ where: { id: { in: [ids.starterVersion, ids.growthVersion, ids.ksaVersion] } }, data: { status: BillingPlanVersionStatus.RETIRED } });
    await prisma.billingPlanEntitlement.deleteMany({ where: { planVersionId: { in: [ids.starterVersion, ids.growthVersion, ids.ksaVersion] } } });
    await prisma.billingPlanVersion.deleteMany({ where: { id: { in: [ids.starterVersion, ids.growthVersion, ids.ksaVersion] } } });
    await prisma.billingPlan.deleteMany({ where: { id: { in: [ids.starterPlan, ids.growthPlan, ids.ksaPlan] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    expect(await prisma.organization.count({ where: { name: { startsWith: marker } } })).toBe(0);
    await prisma.$disconnect();
  });

  it("keeps controlled beta compatible when billing enforcement is disabled", async () => {
    const disabled = new BillingEntitlementService(prisma as never, { get: () => "DISABLED" } as never);
    await expect(disabled.evaluate(orgB, BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "ALLOW", subscriptionStatus: "MISSING" });
    await expect(prisma.organizationBillingAccount.findFirst({ where: { organizationId: orgB } })).resolves.toBeNull();
  });

  it("starts an explicit trial exactly once and rejects changed correlation reuse", async () => {
    const trialEndsAt = new Date("2026-08-13T10:00:00.000Z");
    const first = await lifecycle.transition({ organizationId: orgA, subscriptionId: subscriptionA, expectedVersion: 1, transition: "START_TRIAL", correlationId: `${marker}-trial`, now, trialEndsAt });
    expect(first.status).toBe(BillingSubscriptionStatus.TRIALING);
    await expect(lifecycle.transition({ organizationId: orgA, subscriptionId: subscriptionA, expectedVersion: 1, transition: "START_TRIAL", correlationId: `${marker}-trial`, now, trialEndsAt })).resolves.toMatchObject({ replay: true, status: BillingSubscriptionStatus.TRIALING });
    await expect(lifecycle.transition({ organizationId: orgA, subscriptionId: subscriptionA, expectedVersion: 1, transition: "START_TRIAL", correlationId: `${marker}-trial`, now, trialEndsAt: new Date("2026-08-14T10:00:00.000Z") })).rejects.toBeInstanceOf(ConflictException);
    await expect(entitlements.evaluate(orgA, BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "ALLOW", subscriptionStatus: BillingSubscriptionStatus.TRIALING });
    await expect(entitlements.evaluate(orgB, BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
  });

  it("reserves one local fake checkout attempt under concurrent replay", async () => {
    const requestHash = digest("starter-month:billing");
    const reserve = () => prisma.billingCheckoutAttempt.create({ data: { organizationId: orgA, billingAccountId: accountA, subscriptionId: subscriptionA, planVersionId: ids.starterVersion, billingPriceId: ids.starterPriceMonth, provider: BillingProvider.FAKE, idempotencyKeyHash: digest("checkout-idempotency"), requestHash, returnRouteKey: "billing", providerSessionReference: "fake-local-session", status: "READY" } });
    const outcomes = await Promise.allSettled([reserve(), reserve()]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.billingCheckoutAttempt.count({ where: { organizationId: orgA } })).toBe(1);
    const existing = await prisma.billingCheckoutAttempt.findFirstOrThrow({ where: { organizationId: orgA } });
    expect(existing.requestHash).toBe(requestHash);
    expect(existing.returnRouteKey).toBe("billing");
    expect(existing.providerSessionReference).toMatch(/^fake-local-/);
  });

  it("reconciles only signed fake lifecycle events, safely handling duplicate, changed, stale, and out-of-order delivery", async () => {
    const reference = `${marker}-subscription-a`;
    const customer = `${marker}-customer-a`;
    const activeAt = new Date("2026-07-30T11:00:00.000Z");
    fake.seedSubscription({ providerCustomerReference: customer, providerSubscriptionReference: reference, status: BillingSubscriptionStatus.ACTIVE, interval: BillingPriceInterval.MONTH, providerUpdatedAt: activeAt, currentPeriodEndsAt: new Date("2026-08-30T10:00:00.000Z"), graceDeadline: null, cancelAtPeriodEnd: false });
    const body = webhookBody(`${marker}-activate`, "customer.subscription.updated", activeAt, customer, reference);
    const ingress = { provider: BillingProvider.FAKE, environment: BillingProviderEnvironment.LOCAL_TEST, contentType: "application/json", rawBody: body, signature: fake.signWebhook(body) };
    const received = await webhooks.ingest(ingress);
    await expect(webhooks.reconcile(received.event.id)).resolves.toMatchObject({ status: "PROCESSED" });
    await expect(webhooks.ingest(ingress)).resolves.toMatchObject({ duplicate: true });
    const changed = webhookBody(`${marker}-activate`, "customer.subscription.updated", new Date("2026-07-30T11:01:00.000Z"), customer, reference);
    await expect(webhooks.ingest({ ...ingress, rawBody: changed, signature: fake.signWebhook(changed) })).rejects.toBeInstanceOf(ConflictException);
    const stale = webhookBody(`${marker}-stale`, "invoice.paid", new Date("2026-07-30T10:59:00.000Z"), customer, reference);
    const staleReceived = await webhooks.ingest({ ...ingress, rawBody: stale, signature: fake.signWebhook(stale) });
    await expect(webhooks.reconcile(staleReceived.event.id)).resolves.toMatchObject({ status: "IGNORED_STALE" });
    expect(await prisma.billingWebhookEvent.findFirstOrThrow({ where: { id: received.event.id } })).not.toHaveProperty("rawBody");
    expect(await prisma.organizationSubscription.findUniqueOrThrow({ where: { id: subscriptionA } })).toMatchObject({ status: BillingSubscriptionStatus.ACTIVE, interval: BillingPriceInterval.MONTH });
  });

  it("enforces seat limits, scheduled changes, grace suspension, and tenant boundaries without accounting side effects", async () => {
    await prisma.organizationMember.create({ data: { id: ids.memberA, organizationId: orgA, userId: ids.userA, roleId: ids.roleA, status: MembershipStatus.ACTIVE } });
    await expect(entitlements.assertSeatInvitationAllowed(orgA, prisma as never)).resolves.toBeUndefined();
    const active = await prisma.organizationSubscription.findUniqueOrThrow({ where: { id: subscriptionA } });
    const effectiveAt = new Date("2026-08-30T10:00:00.000Z");
    const scheduled = await lifecycle.schedulePlanChange({ organizationId: orgA, subscriptionId: subscriptionA, expectedVersion: active.version, targetPlanVersionId: ids.growthVersion, effectiveAt, correlationId: `${marker}-growth` });
    await expect(lifecycle.schedulePlanChange({ organizationId: orgA, subscriptionId: subscriptionA, expectedVersion: active.version, targetPlanVersionId: ids.growthVersion, effectiveAt, correlationId: `${marker}-growth` })).resolves.toMatchObject({ id: scheduled.id, replay: true });
    await expect(lifecycle.processDuePlanChanges({ now: effectiveAt, batchSize: 1 })).resolves.toMatchObject({ processed: 1 });
    const grown = await prisma.organizationSubscription.findUniqueOrThrow({ where: { id: subscriptionA } });
    expect(grown.planVersionId).toBe(ids.growthVersion);
    await lifecycle.transition({ organizationId: orgA, subscriptionId: subscriptionA, expectedVersion: grown.version, transition: "PAYMENT_FAILED", correlationId: `${marker}-payment-failed`, now: effectiveAt, graceDeadline: new Date("2026-09-06T10:00:00.000Z") });
    await expect(entitlements.organizationAccessMode(orgA, { now: new Date("2026-09-01T10:00:00.000Z") })).resolves.toMatchObject({ accessMode: "FULL", subscriptionStatus: "GRACE" });
    await expect(lifecycle.processDueTransitions({ now: new Date("2026-09-07T10:00:00.000Z"), batchSize: 1 })).resolves.toMatchObject({ processed: 1 });
    await expect(entitlements.organizationAccessMode(orgA, { now: new Date("2026-09-07T10:00:00.000Z") })).resolves.toMatchObject({ accessMode: "READ_ONLY", subscriptionStatus: "SUSPENDED" });
    await expect(entitlements.assertBackgroundMutationAllowed(orgA)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(prisma.organizationSubscription.findFirst({ where: { id: subscriptionA, organizationId: orgB } })).resolves.toBeNull();
    await expect(prisma.organizationBillingAccount.findFirst({ where: { id: accountA, organizationId: orgB } })).resolves.toBeNull();
    await expect(prisma.journalEntry.count({ where: { organizationId: orgA } })).resolves.toBe(0);
    await expect(entitlements.evaluate(orgA, BILLING_ENTITLEMENT_KEYS.countryKsaModule, { operationalReady: false })).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
    await expect(entitlements.evaluate(orgA, BILLING_ENTITLEMENT_KEYS.countryUaeModule, { operationalReady: false })).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
  });

  async function createPlan(planId: string, versionId: string, key: BillingPlanKey, seats: number, priceIds: string[]) {
    await prisma.billingPlan.create({ data: { id: planId, key, displayName: `${marker}-${key}`, internalDescription: marker, status: BillingPlanStatus.ACTIVE, publiclyVisible: false, sellable: false } });
    await prisma.billingPlanVersion.create({ data: { id: versionId, billingPlanId: planId, version: 1, status: BillingPlanVersionStatus.DRAFT, entitlementSnapshot: { synthetic: true, key } } });
    await prisma.billingPlanEntitlement.createMany({ data: [
      { planVersionId: versionId, key: BILLING_ENTITLEMENT_KEYS.coreAccounting, valueType: BillingEntitlementValueType.BOOLEAN, booleanValue: true },
      { planVersionId: versionId, key: BILLING_ENTITLEMENT_KEYS.activeMemberSeats, valueType: BillingEntitlementValueType.INTEGER, integerValue: seats },
      { planVersionId: versionId, key: BILLING_ENTITLEMENT_KEYS.countryKsaModule, valueType: BillingEntitlementValueType.BOOLEAN, booleanValue: false },
      { planVersionId: versionId, key: BILLING_ENTITLEMENT_KEYS.countryUaeModule, valueType: BillingEntitlementValueType.BOOLEAN, booleanValue: false },
    ] });
    for (const [index, priceId] of priceIds.entries()) await prisma.billingPrice.create({ data: { id: priceId, planVersionId: versionId, provider: BillingProvider.FAKE, environment: BillingProviderEnvironment.LOCAL_TEST, interval: index === 1 ? BillingPriceInterval.YEAR : BillingPriceInterval.MONTH, currency: "XTS", amountMinor: BigInt(10_000 + index), providerProductId: `${marker}-${key}-product`, providerPriceId: `${marker}-${key}-price-${index}`, active: false } });
    await prisma.billingPlanVersion.update({ where: { id: versionId }, data: { status: BillingPlanVersionStatus.ACTIVE, effectiveAt: now } });
  }
});

function digest(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function webhookBody(id: string, type: string, created: Date, customer: string, subscription: string): Buffer { return Buffer.from(JSON.stringify({ id, type, created: created.toISOString(), customer, subscription })); }
