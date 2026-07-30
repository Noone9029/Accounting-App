import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BillingPlanVersionStatus, BillingProvider, BillingSubscriptionStatus } from "@prisma/client";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { BillingLifecycleService } from "./billing-lifecycle.service";
import { BillingProviderRegistry } from "./billing-provider.registry";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BillingManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: BillingEntitlementService,
    private readonly lifecycle: BillingLifecycleService,
    private readonly providers: BillingProviderRegistry,
  ) {}

  async status(organizationId: string) {
    const account = await this.prisma.organizationBillingAccount.findFirst({
      where: { organizationId },
      select: {
        id: true, provider: true, status: true, enforcementExempt: true,
        subscriptions: { orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, status: true, interval: true, planVersionId: true, currentPeriodEndsAt: true, trialEndsAt: true, graceDeadline: true, cancelAtPeriodEnd: true, version: true, planVersion: { select: { billingPlan: { select: { key: true, displayName: true } } } } } },
      },
    });
    const subscription = account?.subscriptions[0] ?? null;
    const access = await this.entitlementService.organizationAccessMode(organizationId);
    return {
      account: account ? { provider: account.provider, status: account.status, enforcementExempt: account.enforcementExempt } : null,
      subscription: subscription ? { id: subscription.id, status: subscription.status, interval: subscription.interval, planKey: subscription.planVersion.billingPlan.key, planName: subscription.planVersion.billingPlan.displayName, currentPeriodEndsAt: subscription.currentPeriodEndsAt, trialEndsAt: subscription.trialEndsAt, graceDeadline: subscription.graceDeadline, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd, version: subscription.version } : null,
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
    return { prepared: false, reasonCode: "BILLING_PROVIDER_EXECUTION_DISABLED", planKey: plan.billingPlan.key, returnRouteKey, providerReadiness: this.providers.active().readiness() };
  }

  async preparePortal(organizationId: string) {
    await this.requireSubscription(organizationId);
    return { prepared: false, reasonCode: "BILLING_PROVIDER_EXECUTION_DISABLED", returnRouteKey: "billing", providerReadiness: this.providers.active().readiness() };
  }

  async cancel(organizationId: string, subscriptionId: string, expectedVersion: number, correlationId: string, actorUserId: string) {
    const subscription = await this.requireSubscription(organizationId, subscriptionId);
    if (subscription.status !== BillingSubscriptionStatus.ACTIVE) throw new BadRequestException("Only active subscriptions can be scheduled for cancellation.");
    if (!subscription.currentPeriodEndsAt) throw new BadRequestException("The subscription does not have a verified period end.");
    return this.lifecycle.transition({ organizationId, subscriptionId, expectedVersion, transition: "SCHEDULE_CANCELLATION", currentPeriodEndsAt: subscription.currentPeriodEndsAt, correlationId, actorUserId });
  }

  async reactivate(organizationId: string, subscriptionId: string, expectedVersion: number, correlationId: string, actorUserId: string) {
    await this.requireSubscription(organizationId, subscriptionId);
    return this.lifecycle.transition({ organizationId, subscriptionId, expectedVersion, transition: "REACTIVATE", correlationId, actorUserId });
  }

  async schedulePlanChange(organizationId: string, subscriptionId: string, expectedVersion: number, targetPlanVersionId: string, effectiveAt: Date, correlationId: string, actorUserId: string) {
    if (Number.isNaN(effectiveAt.getTime()) || effectiveAt <= new Date()) throw new BadRequestException("A future plan-change effective time is required.");
    await this.requireSubscription(organizationId, subscriptionId);
    const target = await this.prisma.billingPlanVersion.findFirst({ where: { id: targetPlanVersionId, status: BillingPlanVersionStatus.ACTIVE, billingPlan: { sellable: true, key: { not: "KSA_COMPLIANCE" } } }, select: { id: true } });
    if (!target) throw new BadRequestException("The requested billing plan is unavailable.");
    return this.lifecycle.schedulePlanChange({ organizationId, subscriptionId, expectedVersion, targetPlanVersionId: target.id, effectiveAt, correlationId, actorUserId });
  }

  private async requireSubscription(organizationId: string, id?: string) {
    const subscription = await this.prisma.organizationSubscription.findFirst({ where: { organizationId, ...(id ? { id } : {}) } });
    if (!subscription) throw new NotFoundException("Billing subscription not found.");
    return subscription;
  }
}
