import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BillingEntitlementValueType, BillingSubscriptionStatus, MembershipStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BILLING_ENTITLEMENT_KEYS, BILLING_ENTITLEMENT_REGISTRY, type BillingEntitlementKey } from "./billing-entitlement-registry";

export type BillingEnforcementMode = "DISABLED" | "OBSERVE" | "ENFORCE";
export type BillingEntitlementDecisionCode =
  | "ALLOW"
  | "ALLOW_OBSERVE_ONLY"
  | "DENY_PLAN"
  | "DENY_LIMIT"
  | "DENY_BILLING_STATE"
  | "DENY_OPERATIONAL_READINESS"
  | "DENY_TENANT";

export interface BillingEntitlementDecision {
  organizationId: string;
  entitlementKey: BillingEntitlementKey;
  code: BillingEntitlementDecisionCode;
  enforcementMode: BillingEnforcementMode;
  subscriptionStatus: BillingSubscriptionStatus | "MISSING";
  correlationId: string | null;
  usage: number | null;
  limit: number | null;
}

export type BillingOrganizationAccessMode = "FULL" | "READ_ONLY" | "BILLING_ONLY";

/** Enforce time boundaries on every request even if the expiry worker is unavailable. */
export function billingDeadlineExpired(subscription: { status: BillingSubscriptionStatus; trialEndsAt?: Date | null; graceDeadline?: Date | null }, now: Date): boolean {
  if (subscription.status === BillingSubscriptionStatus.TRIALING) return !subscription.trialEndsAt || subscription.trialEndsAt <= now;
  if (subscription.status === BillingSubscriptionStatus.GRACE) return !subscription.graceDeadline || subscription.graceDeadline <= now;
  return false;
}

export interface BillingOrganizationAccessDecision {
  organizationId: string;
  accessMode: BillingOrganizationAccessMode;
  enforcementMode: BillingEnforcementMode;
  subscriptionStatus: BillingSubscriptionStatus | "MISSING";
}

type BillingReadClient = PrismaService | Prisma.TransactionClient;

const ENTITLEMENT_GRANTING_STATUSES: BillingSubscriptionStatus[] = [
  BillingSubscriptionStatus.TRIALING,
  BillingSubscriptionStatus.ACTIVE,
  BillingSubscriptionStatus.GRACE,
  BillingSubscriptionStatus.CANCEL_AT_PERIOD_END,
];

const KNOWN_ACCESS_STATUSES: BillingSubscriptionStatus[] = [
  ...ENTITLEMENT_GRANTING_STATUSES,
  BillingSubscriptionStatus.SUSPENDED,
  BillingSubscriptionStatus.CANCELED,
];

const FULL_ACCESS_STATUSES: BillingSubscriptionStatus[] = [
  BillingSubscriptionStatus.TRIALING,
  BillingSubscriptionStatus.ACTIVE,
  BillingSubscriptionStatus.GRACE,
];

@Injectable()
export class BillingEntitlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  enforcementMode(): BillingEnforcementMode {
    const value = this.config.get<string>("BILLING_ENFORCEMENT_MODE")?.trim().toUpperCase();
    if (!value || value === "DISABLED") return "DISABLED";
    if (value === "OBSERVE" || value === "ENFORCE") return value;
    return "DISABLED";
  }

  async evaluate(
    organizationId: string,
    entitlementKey: BillingEntitlementKey,
    options: { correlationId?: string | null; usage?: number | null; operationalReady?: boolean; client?: BillingReadClient; now?: Date } = {},
  ): Promise<BillingEntitlementDecision> {
    const mode = this.enforcementMode();
    const client = options.client ?? this.prisma;
    const correlationId = options.correlationId ?? null;

    if (mode === "DISABLED") {
      return decision(organizationId, entitlementKey, "ALLOW", mode, "MISSING", correlationId, options.usage ?? null, null);
    }

    const account = await client.organizationBillingAccount.findFirst({
      where: { organizationId, status: "ACTIVE" },
      select: {
        enforcementExempt: true,
        subscriptions: {
          where: { status: { in: KNOWN_ACCESS_STATUSES } },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            status: true,
            currentPeriodEndsAt: true,
            trialEndsAt: true,
            graceDeadline: true,
            planVersion: { select: { entitlements: { select: { key: true, valueType: true, booleanValue: true, integerValue: true, stringValue: true } } } },
          },
        },
      },
    });
    const subscription = account?.subscriptions[0];
    const status = subscription?.status ?? "MISSING";
    const wouldDeny = (): BillingEntitlementDecision => {
      if (account?.enforcementExempt) return decision(organizationId, entitlementKey, "ALLOW", mode, status, correlationId, options.usage ?? null, null);
      if (!subscription) return decision(organizationId, entitlementKey, "DENY_BILLING_STATE", mode, status, correlationId, options.usage ?? null, null);
      if (billingDeadlineExpired(subscription, options.now ?? new Date())) return decision(organizationId, entitlementKey, "DENY_BILLING_STATE", mode, status, correlationId, options.usage ?? null, null);
      if (subscription.status === BillingSubscriptionStatus.CANCEL_AT_PERIOD_END && (!subscription.currentPeriodEndsAt || subscription.currentPeriodEndsAt <= (options.now ?? new Date()))) {
        return decision(organizationId, entitlementKey, "DENY_BILLING_STATE", mode, status, correlationId, options.usage ?? null, null);
      }
      if (!ENTITLEMENT_GRANTING_STATUSES.includes(subscription.status)) {
        return decision(organizationId, entitlementKey, "DENY_BILLING_STATE", mode, status, correlationId, options.usage ?? null, null);
      }
      if (!BILLING_ENTITLEMENT_REGISTRY[entitlementKey].allowsCommercialAccess || options.operationalReady === false) {
        return decision(organizationId, entitlementKey, "DENY_OPERATIONAL_READINESS", mode, status, correlationId, options.usage ?? null, null);
      }
      const entitlement = subscription.planVersion.entitlements.find((item) => item.key === entitlementKey);
      if (!entitlement) return decision(organizationId, entitlementKey, "DENY_PLAN", mode, status, correlationId, options.usage ?? null, null);
      if (entitlement.valueType === BillingEntitlementValueType.BOOLEAN && entitlement.booleanValue !== true) {
        return decision(organizationId, entitlementKey, "DENY_PLAN", mode, status, correlationId, options.usage ?? null, null);
      }
      if (entitlement.valueType === BillingEntitlementValueType.INTEGER) {
        const limit = entitlement.integerValue ?? 0;
        if ((options.usage ?? 0) >= limit) return decision(organizationId, entitlementKey, "DENY_LIMIT", mode, status, correlationId, options.usage ?? 0, limit);
        return decision(organizationId, entitlementKey, "ALLOW", mode, status, correlationId, options.usage ?? 0, limit);
      }
      return decision(organizationId, entitlementKey, "ALLOW", mode, status, correlationId, options.usage ?? null, null);
    };

    const result = wouldDeny();
    if (mode === "OBSERVE" && result.code.startsWith("DENY")) {
      return { ...result, code: "ALLOW_OBSERVE_ONLY" };
    }
    return result;
  }

  async organizationAccessMode(organizationId: string, options: { client?: BillingReadClient; now?: Date } = {}): Promise<BillingOrganizationAccessDecision> {
    const enforcementMode = this.enforcementMode();
    if (enforcementMode !== "ENFORCE") {
      return { organizationId, accessMode: "FULL", enforcementMode, subscriptionStatus: "MISSING" };
    }

    const account = await (options.client ?? this.prisma).organizationBillingAccount.findFirst({
      where: { organizationId, status: "ACTIVE" },
      select: {
        enforcementExempt: true,
        subscriptions: {
          where: { status: { in: KNOWN_ACCESS_STATUSES } },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { status: true, currentPeriodEndsAt: true, trialEndsAt: true, graceDeadline: true },
        },
      },
    });
    const subscription = account?.subscriptions[0];
    const subscriptionStatus = subscription?.status ?? "MISSING";
    if (account?.enforcementExempt) return { organizationId, accessMode: "FULL", enforcementMode, subscriptionStatus };
    if (!subscription) return { organizationId, accessMode: "BILLING_ONLY", enforcementMode, subscriptionStatus };
    if (billingDeadlineExpired(subscription, options.now ?? new Date())) return { organizationId, accessMode: "READ_ONLY", enforcementMode, subscriptionStatus };
    if (subscription.status === BillingSubscriptionStatus.CANCEL_AT_PERIOD_END && subscription.currentPeriodEndsAt && subscription.currentPeriodEndsAt > (options.now ?? new Date())) {
      return { organizationId, accessMode: "FULL", enforcementMode, subscriptionStatus };
    }
    if (FULL_ACCESS_STATUSES.includes(subscription.status)) {
      return { organizationId, accessMode: "FULL", enforcementMode, subscriptionStatus };
    }
    return { organizationId, accessMode: "READ_ONLY", enforcementMode, subscriptionStatus };
  }

  async assertSeatInvitationAllowed(organizationId: string, client: BillingReadClient, correlationId: string | null = null): Promise<void> {
    if (this.enforcementMode() !== "DISABLED") {
      // Share the tenant lock with scheduling and trial activation: a downgrade
      // reserves its smaller limit immediately, including outstanding invites.
      await client.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`;
    }
    const usage = await client.organizationMember.count({
      where: { organizationId, status: { in: [MembershipStatus.ACTIVE, MembershipStatus.INVITED] } },
    });
    const result = await this.evaluate(organizationId, BILLING_ENTITLEMENT_KEYS.activeMemberSeats, { client, correlationId, usage });
    if (result.code === "DENY_LIMIT" || result.code === "DENY_BILLING_STATE" || result.code === "DENY_PLAN") {
      throw new ForbiddenException("Your organization subscription does not allow another member invitation.");
    }
    if (this.enforcementMode() === "ENFORCE") {
      const changes = await client.subscriptionScheduledChange.findMany({
        where: { organizationId, status: "PENDING" },
        select: { targetPlanVersion: { select: { entitlements: { where: { key: BILLING_ENTITLEMENT_KEYS.activeMemberSeats }, select: { integerValue: true } } } } },
      });
      const limits = changes.flatMap((change) => change.targetPlanVersion.entitlements.map((entitlement) => entitlement.integerValue)).filter((limit): limit is number => limit !== null);
      const checkouts = await client.billingCheckoutAttempt.findMany({
        where: { organizationId, status: { in: ["PROVIDER_PENDING", "READY"] } },
        select: { planVersion: { select: { entitlements: { where: { key: BILLING_ENTITLEMENT_KEYS.activeMemberSeats }, select: { integerValue: true } } } } },
      });
      limits.push(...checkouts.flatMap((checkout) => checkout.planVersion.entitlements.map((entitlement) => entitlement.integerValue)).filter((limit): limit is number => limit !== null));
      if (limits.some((limit) => usage >= limit)) throw new ForbiddenException("The scheduled plan reserves fewer seats. Remove a member or cancel the plan change before adding another.");
    }
  }

  async assertBackgroundMutationAllowed(organizationId: string, correlationId: string | null = null): Promise<void> {
    const result = await this.evaluate(organizationId, BILLING_ENTITLEMENT_KEYS.coreAccounting, { correlationId });
    if (result.code === "DENY_BILLING_STATE" || result.code === "DENY_PLAN" || result.code === "DENY_OPERATIONAL_READINESS") {
      throw new ForbiddenException("The organization subscription does not allow this background mutation.");
    }
  }
}

function decision(
  organizationId: string,
  entitlementKey: BillingEntitlementKey,
  code: BillingEntitlementDecisionCode,
  enforcementMode: BillingEnforcementMode,
  subscriptionStatus: BillingEntitlementDecision["subscriptionStatus"],
  correlationId: string | null,
  usage: number | null,
  limit: number | null,
): BillingEntitlementDecision {
  return { organizationId, entitlementKey, code, enforcementMode, subscriptionStatus, correlationId, usage, limit };
}
