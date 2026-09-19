import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import { BillingPlanVersionStatus, BillingProvider, BillingSubscriptionStatus, Prisma } from "@prisma/client";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { BillingLifecycleService } from "./billing-lifecycle.service";
import { BillingProviderRegistry } from "./billing-provider.registry";
import { PrismaService } from "../prisma/prisma.service";
import { LAUNCH_CATALOG_VERSION, LAUNCH_PLANS } from "./self-service-billing.service";
import { BillingWebhookService } from "./billing-webhook.service";

@Injectable()
export class BillingManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: BillingEntitlementService,
    private readonly lifecycle: BillingLifecycleService,
    private readonly providers: BillingProviderRegistry,
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly webhooks?: BillingWebhookService,
  ) {}

  async status(organizationId: string) {
    const account = await this.prisma.organizationBillingAccount.findFirst({
      where: { organizationId },
      select: {
        id: true, provider: true, status: true, enforcementExempt: true,
        subscriptions: { orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, status: true, interval: true, planVersionId: true, currentPeriodEndsAt: true, trialEndsAt: true, graceDeadline: true, cancelAtPeriodEnd: true, version: true, scheduledChanges: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1, select: { effectiveAt: true, targetPlanVersion: { select: { billingPlan: { select: { key: true, displayName: true } } } } } }, planVersion: { select: { billingPlan: { select: { key: true, displayName: true } } } } } },
      },
    });
    const subscription = account?.subscriptions[0] ?? null;
    const access = await this.entitlementService.organizationAccessMode(organizationId);
    return {
      account: account ? { provider: account.provider, status: account.status, enforcementExempt: account.enforcementExempt } : null,
      subscription: subscription ? { id: subscription.id, status: subscription.status, interval: subscription.interval, planKey: subscription.planVersion.billingPlan.key, planName: subscription.planVersion.billingPlan.displayName, currentPeriodEndsAt: subscription.currentPeriodEndsAt, trialEndsAt: subscription.trialEndsAt, graceDeadline: subscription.graceDeadline, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, version: subscription.version, scheduledChange: subscription.scheduledChanges?.[0] ? { planKey: subscription.scheduledChanges[0].targetPlanVersion.billingPlan.key, planName: subscription.scheduledChanges[0].targetPlanVersion.billingPlan.displayName, effectiveAt: subscription.scheduledChanges[0].effectiveAt } : null } : null,
      access,
      providerReadiness: this.providers.active().readiness(),
    };
  }

  async entitlements(organizationId: string) {
    const account = await this.prisma.organizationBillingAccount.findFirst({
      where: { organizationId },
      select: { subscriptions: { orderBy: { updatedAt: "desc" }, take: 1, select: { status: true, planVersion: { select: { entitlements: { select: { key: true, valueType: true, booleanValue: true, integerValue: true, stringValue: true } } } } } } },
    });
    const subscription = account?.subscriptions[0] ?? null;
    return { subscriptionStatus: subscription?.status ?? "MISSING", entitlements: subscription?.planVersion.entitlements ?? [] };
  }

  async availablePlans() {
    const plans = await this.prisma.billingPlan.findMany({
      where: { publiclyVisible: true, sellable: true, status: "ACTIVE", key: { not: "KSA_COMPLIANCE" } },
      orderBy: { key: "asc" },
      select: { key: true, displayName: true, versions: { where: { status: BillingPlanVersionStatus.ACTIVE }, orderBy: { effectiveAt: "desc" }, take: 1, select: { id: true, entitlements: { select: { key: true, valueType: true, booleanValue: true, integerValue: true, stringValue: true } } } } },
    });
    // Prices, currencies, provider IDs, and checkout identifiers remain private
    // until an owner-approved public catalog and provider execution exist.
    return plans.filter((plan) => plan.versions.length === 1).map((plan) => ({ key: plan.key, displayName: plan.displayName, planVersionId: plan.versions[0]!.id, entitlements: plan.versions[0]!.entitlements }));
  }

  async prepareCheckout(organizationId: string, planVersionId: string, returnRouteKey: "billing" | "plans") {
    const plan = await this.prisma.billingPlanVersion.findFirst({ where: { id: planVersionId, status: BillingPlanVersionStatus.ACTIVE, billingPlan: { publiclyVisible: true, sellable: true, key: { not: "KSA_COMPLIANCE" } } }, select: { id: true, billingPlan: { select: { key: true } } } });
    if (!plan) throw new BadRequestException("The requested billing plan is unavailable.");
    const provider = this.providers.active();
    if (!provider.readiness().checkoutEnabled) return { prepared: false, reasonCode: "BILLING_PROVIDER_EXECUTION_DISABLED", planKey: plan.billingPlan.key, returnRouteKey, providerReadiness: provider.readiness() };
    let subscription = await this.requireSubscription(organizationId);
    const price = await this.configuredPrice(planVersionId);
    if (!provider.ensureCustomer) throw new BadRequestException("Billing provider customer creation is unavailable.");
    const providerCustomer = await this.prisma.billingProviderCustomer.findUnique({ where: { billingAccountId_provider_environment: { billingAccountId: subscription.billingAccountId, provider: BillingProvider.STRIPE, environment: "TEST" } } });
    const customerReference = providerCustomer?.providerCustomerReference ?? await provider.ensureCustomer({ organizationId, billingAccountId: subscription.billingAccountId });
    await this.prisma.billingProviderCustomer.upsert({ where: { billingAccountId_provider_environment: { billingAccountId: subscription.billingAccountId, provider: BillingProvider.STRIPE, environment: "TEST" } }, create: { billingAccountId: subscription.billingAccountId, provider: BillingProvider.STRIPE, environment: "TEST", providerCustomerReference: customerReference }, update: {} });
    const requestHash = createHash("sha256").update(`${planVersionId}:${returnRouteKey}`).digest("hex");
    const pending = await this.prisma.billingCheckoutAttempt.findFirst({ where: { organizationId, subscriptionId: subscription.id, status: { in: ["PROVIDER_PENDING", "READY"] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (pending?.providerSessionReference) {
      if (!provider.inspectCheckoutSession) throw new ConflictException("Checkout reconciliation is unavailable.");
      const inspected = await provider.inspectCheckoutSession(pending.providerSessionReference, customerReference, subscription.id);
      if (inspected.status === "open" && inspected.redirectUrl) {
        if (pending.requestHash !== requestHash) throw new ConflictException("An open checkout already exists for another selection. Complete or let it expire before changing plans.");
        return { prepared: true, redirectUrl: inspected.redirectUrl, providerReadiness: provider.readiness() };
      }
      if (!inspected.safeToRetry) {
        const snapshot = inspected.subscription;
        if (snapshot && !snapshot.initialPaymentIncomplete && this.webhooks) {
          if (subscription.providerSubscriptionReference && subscription.providerSubscriptionReference !== snapshot.providerSubscriptionReference) throw new ConflictException("Checkout subscription mapping changed. Reload billing.");
          if (!subscription.providerSubscriptionReference) {
            const claim = await this.prisma.organizationSubscription.updateMany({ where: { id: subscription.id, organizationId, version: subscription.version, providerSubscriptionReference: null }, data: { providerSubscriptionReference: snapshot.providerSubscriptionReference, version: { increment: 1 } } });
            if (claim.count !== 1) throw new ConflictException("Subscription changed. Reload billing.");
            subscription = await this.requireSubscription(organizationId, subscription.id);
          }
          await this.webhooks.applyVerifiedSnapshot(organizationId, subscription.id, snapshot, subscription.version);
          return { prepared: false, reasonCode: "CHECKOUT_RECONCILED", providerReadiness: provider.readiness() };
        }
        throw new ConflictException("Payment is still pending. Your remaining trial is preserved; another checkout cannot be opened yet.");
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`;
        const current = await tx.organizationSubscription.findFirstOrThrow({ where: { id: subscription.id, organizationId } });
        if (current.currentPeriodStartedAt || !["TRIALING", "SUSPENDED", "PENDING"].includes(current.status)) throw new ConflictException("The subscription has already activated. Reload billing.");
        if (current.providerSubscriptionReference && current.providerSubscriptionReference !== inspected.subscription?.providerSubscriptionReference) throw new ConflictException("Checkout subscription mapping changed. Reload billing.");
        if (current.providerSubscriptionReference) await tx.organizationSubscription.update({ where: { id: current.id }, data: { providerSubscriptionReference: null, version: { increment: 1 } } });
        await tx.billingCheckoutAttempt.updateMany({ where: { id: pending.id, status: { in: ["PROVIDER_PENDING", "READY"] } }, data: { status: "EXPIRED" } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      subscription = await this.requireSubscription(organizationId, subscription.id);
    }
    if (subscription.providerSubscriptionReference || !["TRIALING", "SUSPENDED", "PENDING"].includes(subscription.status)) throw new BadRequestException("Use subscription management for an existing paid subscription.");
    const attempt = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`;
      const existing = await tx.billingCheckoutAttempt.findFirst({ where: { organizationId, subscriptionId: subscription.id, status: { in: ["PROVIDER_PENDING", "READY"] } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
      if (existing) return existing;
      const current = await tx.organizationSubscription.findFirstOrThrow({ where: { id: subscription.id, organizationId } });
      if (current.providerSubscriptionReference || current.currentPeriodStartedAt || !["TRIALING", "SUSPENDED", "PENDING"].includes(current.status)) throw new ConflictException("The subscription has already activated. Reload billing.");
      const seats = await tx.billingPlanEntitlement.findUnique({ where: { planVersionId_key: { planVersionId, key: "active_member_seats" } } });
      const usage = await tx.organizationMember.count({ where: { organizationId, status: { in: ["ACTIVE", "INVITED"] } } });
      if (!seats?.integerValue || usage > seats.integerValue) throw new BadRequestException("Reduce active members and pending invitations before selecting this plan.");
      const attemptId = randomUUID();
      const idempotencyKeyHash = createHash("sha256").update(`checkout:${attemptId}`).digest("hex");
      return tx.billingCheckoutAttempt.create({ data: { id: attemptId, organizationId, billingAccountId: subscription.billingAccountId, subscriptionId: subscription.id, planVersionId, billingPriceId: price.id, provider: "STRIPE", idempotencyKeyHash, requestHash, returnRouteKey, status: "PROVIDER_PENDING" } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (attempt.requestHash !== requestHash) throw new ConflictException("A checkout already exists for another selection. Resolve that checkout before changing plans.");
    // Only a provider-confirmed expired/void checkout permits a fresh key. A lost
    // response without a session reference remains fail-closed after Stripe's replay window.
    if (attempt.createdAt.getTime() < Date.now() - 23 * 3600000) throw new ConflictException("The unconfirmed checkout needs operator reconciliation before another payment session can be created.");
    const session = await provider.createCheckoutSession({ organizationId, billingAccountId: subscription.billingAccountId, subscriptionId: subscription.id, checkoutAttemptId: attempt.id, customerReference, priceReference: price.providerPriceId!, interval: "MONTH", idempotencyKey: `checkout:${attempt.id}`, returnRouteKey, expectedAmountMinor: Number(price.amountMinor) });
    await this.prisma.billingCheckoutAttempt.update({ where: { id: attempt.id }, data: { providerSessionReference: session.providerSessionReference, status: "READY" } });
    return { prepared: true, redirectUrl: session.redirectUrl, providerReadiness: provider.readiness() };
  }

  async preparePortal(organizationId: string) {
    const subscription = await this.requireSubscription(organizationId);
    const provider = this.providers.active();
    if (!provider.readiness().portalEnabled) return { prepared: false, reasonCode: "BILLING_PROVIDER_EXECUTION_DISABLED", returnRouteKey: "billing", providerReadiness: provider.readiness() };
    const customer = await this.prisma.billingProviderCustomer.findUnique({ where: { billingAccountId_provider_environment: { billingAccountId: subscription.billingAccountId, provider: "STRIPE", environment: "TEST" } } });
    if (!customer) throw new BadRequestException("No verified billing customer is available.");
    const session = await provider.createCustomerPortalSession({ organizationId, customerReference: customer.providerCustomerReference, returnRouteKey: "billing" });
    return { prepared: true, redirectUrl: session.redirectUrl, providerReadiness: provider.readiness() };
  }

  async cancel(organizationId: string, subscriptionId: string, expectedVersion: number, correlationId: string, actorUserId: string) {
    const subscription = await this.requireSubscription(organizationId, subscriptionId);
    if (subscription.status !== BillingSubscriptionStatus.ACTIVE) throw new BadRequestException("Only active subscriptions can be scheduled for cancellation.");
    if (!subscription.currentPeriodEndsAt) throw new BadRequestException("The subscription does not have a verified period end.");
    if (subscription.provider === BillingProvider.STRIPE) {
      if (!subscription.providerSubscriptionReference || subscription.version !== expectedVersion || !this.webhooks) throw new ConflictException("Reload the verified subscription before canceling.");
      const snapshot = await this.providers.active().cancelAtPeriodEnd(subscription.providerSubscriptionReference);
      return this.webhooks.applyVerifiedSnapshot(organizationId, subscription.id, snapshot, expectedVersion);
    }
    return this.lifecycle.transition({ organizationId, subscriptionId, expectedVersion, transition: "SCHEDULE_CANCELLATION", currentPeriodEndsAt: subscription.currentPeriodEndsAt, correlationId, actorUserId });
  }

  async reactivate(organizationId: string, subscriptionId: string, expectedVersion: number, correlationId: string, actorUserId: string) {
    const subscription = await this.requireSubscription(organizationId, subscriptionId);
    if (subscription.provider === BillingProvider.STRIPE) {
      if (!subscription.providerSubscriptionReference || subscription.version !== expectedVersion || subscription.status !== "CANCEL_AT_PERIOD_END" || !this.webhooks) throw new ConflictException("Reload the verified subscription before reactivating.");
      return this.webhooks.applyVerifiedSnapshot(organizationId, subscription.id, await this.providers.active().reactivateSubscription(subscription.providerSubscriptionReference), expectedVersion);
    }
    return this.lifecycle.transition({ organizationId, subscriptionId, expectedVersion, transition: "REACTIVATE", correlationId, actorUserId });
  }

  async schedulePlanChange(organizationId: string, subscriptionId: string, expectedVersion: number, targetPlanVersionId: string, effectiveAt: Date, correlationId: string, actorUserId: string) {
    if (Number.isNaN(effectiveAt.getTime()) || effectiveAt <= new Date()) throw new BadRequestException("A future plan-change effective time is required.");
    const subscription = await this.requireSubscription(organizationId, subscriptionId);
    const target = await this.prisma.billingPlanVersion.findFirst({ where: { id: targetPlanVersionId, status: BillingPlanVersionStatus.ACTIVE, billingPlan: { sellable: true, key: { not: "KSA_COMPLIANCE" } } }, select: { id: true } });
    if (!target) throw new BadRequestException("The requested billing plan is unavailable.");
    if (subscription.provider === BillingProvider.STRIPE) {
      if (!subscription.providerSubscriptionReference || subscription.version !== expectedVersion || !this.webhooks || subscription.status !== "ACTIVE") throw new ConflictException("Plan changes require a verified active subscription.");
      const price = await this.configuredPrice(target.id);
      const seats = await this.prisma.billingPlanEntitlement.findUnique({ where: { planVersionId_key: { planVersionId: target.id, key: "active_member_seats" } } });
      const usage = await this.prisma.organizationMember.count({ where: { organizationId, status: { in: ["ACTIVE", "INVITED"] } } });
      if (!seats?.integerValue || usage > seats.integerValue) throw new BadRequestException("Reduce active and invited members to the target plan limit before downgrading.");
      // Reserve target seats BEFORE contacting Stripe, so invitations cannot race a downgrade.
      await this.lifecycle.schedulePlanChange({ organizationId, subscriptionId, expectedVersion, targetPlanVersionId: target.id, effectiveAt: subscription.currentPeriodEndsAt ?? new Date(Date.now() + 60000), correlationId, actorUserId });
      const snapshot = await this.providers.active().schedulePlanChange({ providerSubscriptionReference: subscription.providerSubscriptionReference, priceReference: price.providerPriceId!, effectiveAt: subscription.currentPeriodEndsAt ?? new Date() });
      return this.webhooks.applyVerifiedSnapshot(organizationId, subscription.id, snapshot, expectedVersion + 1);
    }
    return this.lifecycle.schedulePlanChange({ organizationId, subscriptionId, expectedVersion, targetPlanVersionId: target.id, effectiveAt, correlationId, actorUserId });
  }

  private async requireSubscription(organizationId: string, id?: string) {
    const subscription = await this.prisma.organizationSubscription.findFirst({ where: { organizationId, ...(id ? { id } : {}) } });
    if (!subscription) throw new NotFoundException("Billing subscription not found.");
    return subscription;
  }

  private async configuredPrice(planVersionId: string) {
    const version = await this.prisma.billingPlanVersion.findFirst({ where: { id: planVersionId, version: LAUNCH_CATALOG_VERSION, status: "ACTIVE" }, include: { billingPlan: true, prices: { where: { provider: "STRIPE", environment: "TEST", interval: "MONTH", currency: "SAR" } } } });
    const definition = LAUNCH_PLANS.find((plan) => plan.key === version?.billingPlan.key);
    const mapping = definition && this.config?.get<string>(`BILLING_STRIPE_${definition.key}_MONTHLY_PRICE_ID`)?.trim();
    const price = version?.prices.find((candidate) => candidate.amountMinor === BigInt(definition?.amountMinor ?? -1));
    if (!price || !mapping?.startsWith("price_")) throw new BadRequestException("The approved Stripe test price mapping is missing.");
    return this.prisma.billingPrice.update({ where: { id: price.id }, data: { providerPriceId: mapping, active: true } });
  }
}
