import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BillingPlanKey, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { selfServiceEnrollmentEnabled } from "./self-service-policy";

export const LAUNCH_CATALOG_VERSION = 20260919;
export const LAUNCH_PLANS = [
  { key: "STARTER" as const, displayName: "Starter", amountMinor: 14900, currency: "SAR", interval: "MONTH", seats: 3 },
  { key: "GROWTH" as const, displayName: "Growth", amountMinor: 29900, currency: "SAR", interval: "MONTH", seats: 10 },
];

@Injectable()
export class SelfServiceBillingService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly audit: AuditLogService) {}

  catalog() {
    return {
      plans: LAUNCH_PLANS,
      trialDays: 14,
      cardRequired: false,
      selfServiceEnabled: selfServiceEnrollmentEnabled(this.config),
      seller: { legalName: this.config.get<string>("BILLING_SELLER_LEGAL_NAME")?.trim() || null, country: "AE" },
      taxDisplay: "Applicable taxes will be shown before checkout.",
      complianceSubmissionIncluded: false,
    };
  }

  async startTrial(organizationId: string, userId: string, planKey: "STARTER" | "GROWTH") {
    if (!this.catalog().selfServiceEnabled) throw new ForbiddenException("Self-service registration is not enabled for this environment.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Lock the tenant, not a missing subscription row, so first-trial races serialize.
        await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`;
        const member = await tx.organizationMember.findFirst({ where: { organizationId, userId, status: "ACTIVE", role: { name: "Owner" } }, select: { user: { select: { emailVerifiedAt: true } } } });
        if (!member?.user.emailVerifiedAt) throw new ForbiddenException("The organization owner must verify their email before starting a trial.");
        const previous = await tx.organizationSubscription.findFirst({ where: { organizationId }, orderBy: { createdAt: "asc" } });
        if (previous) return { id: previous.id, status: previous.status, trialEndsAt: previous.trialEndsAt, replay: true };
        const seats = LAUNCH_PLANS.find((plan) => plan.key === planKey)!.seats;
        const usedSeats = await tx.organizationMember.count({ where: { organizationId, status: { in: ["ACTIVE", "INVITED"] } } });
        if (usedSeats > seats) throw new BadRequestException("Reduce active members and pending invitations before selecting this trial plan.");
        const version = await tx.billingPlanVersion.findFirst({ where: { version: LAUNCH_CATALOG_VERSION, status: "ACTIVE", billingPlan: { key: planKey as BillingPlanKey } }, select: { id: true } });
        if (!version) throw new BadRequestException("The selected trial plan is not configured.");
        const now = new Date();
        const account = await tx.organizationBillingAccount.upsert({ where: { organizationId_provider: { organizationId, provider: "STRIPE" } }, create: { organizationId, provider: "STRIPE" }, update: {} });
        const subscription = await tx.organizationSubscription.create({ data: { organizationId, billingAccountId: account.id, planVersionId: version.id, provider: "STRIPE", status: "TRIALING", interval: "MONTH", trialStartedAt: now, trialEndsAt: new Date(now.getTime() + 14 * 86400000) } });
        await tx.billingLifecycleEvent.create({ data: { organizationId, subscriptionId: subscription.id, eventType: "TRIAL_STARTED", nextStatus: "TRIALING", reasonCode: "SELF_SERVICE_14_DAY_TRIAL", correlationId: `trial:${organizationId}` } });
        await this.audit.log({ organizationId, actorUserId: userId, action: "START_TRIAL", entityType: "OrganizationSubscription", entityId: subscription.id, after: { planKey, trialEndsAt: subscription.trialEndsAt?.toISOString(), cardRequired: false } }, tx);
        return { id: subscription.id, status: subscription.status, trialEndsAt: subscription.trialEndsAt, replay: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((error as { code?: string }).code === "P2034") throw new ConflictException("Trial creation conflicted. Retry the same request.");
      throw error;
    }
  }
}
