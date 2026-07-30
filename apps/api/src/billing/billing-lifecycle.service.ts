import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BillingLifecycleEventType, BillingScheduledChangeStatus, BillingSubscriptionStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";

export type BillingTransition = "START_TRIAL" | "ACTIVATE" | "PAYMENT_FAILED" | "EXPIRE_GRACE" | "SCHEDULE_CANCELLATION" | "CANCEL" | "REACTIVATE";

export interface BillingTransitionInput {
  organizationId: string;
  subscriptionId: string;
  expectedVersion: number;
  transition: BillingTransition;
  correlationId: string;
  actorUserId?: string;
  now?: Date;
  trialEndsAt?: Date;
  graceDeadline?: Date;
  currentPeriodEndsAt?: Date;
}

export interface BillingLifecycleWorkerResult {
  processed: number;
  skipped: number;
}

const TRANSITIONS: Record<BillingTransition, { from: readonly BillingSubscriptionStatus[]; to: BillingSubscriptionStatus; event: BillingLifecycleEventType }> = {
  START_TRIAL: { from: [BillingSubscriptionStatus.PENDING], to: BillingSubscriptionStatus.TRIALING, event: BillingLifecycleEventType.TRIAL_STARTED },
  ACTIVATE: { from: [BillingSubscriptionStatus.PENDING, BillingSubscriptionStatus.TRIALING], to: BillingSubscriptionStatus.ACTIVE, event: BillingLifecycleEventType.ACTIVATED },
  PAYMENT_FAILED: { from: [BillingSubscriptionStatus.ACTIVE, BillingSubscriptionStatus.TRIALING], to: BillingSubscriptionStatus.GRACE, event: BillingLifecycleEventType.PAYMENT_FAILED },
  EXPIRE_GRACE: { from: [BillingSubscriptionStatus.GRACE], to: BillingSubscriptionStatus.SUSPENDED, event: BillingLifecycleEventType.GRACE_EXPIRED },
  SCHEDULE_CANCELLATION: { from: [BillingSubscriptionStatus.ACTIVE], to: BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, event: BillingLifecycleEventType.CANCELLATION_SCHEDULED },
  CANCEL: { from: [BillingSubscriptionStatus.CANCEL_AT_PERIOD_END], to: BillingSubscriptionStatus.CANCELED, event: BillingLifecycleEventType.CANCELED },
  REACTIVATE: { from: [BillingSubscriptionStatus.CANCEL_AT_PERIOD_END], to: BillingSubscriptionStatus.ACTIVE, event: BillingLifecycleEventType.REACTIVATED },
};

const SCHEDULABLE_PLAN_CHANGE_STATUSES: BillingSubscriptionStatus[] = [
  BillingSubscriptionStatus.TRIALING,
  BillingSubscriptionStatus.ACTIVE,
  BillingSubscriptionStatus.GRACE,
];

@Injectable()
export class BillingLifecycleService {
  constructor(private readonly prisma: PrismaService, private readonly auditLog: AuditLogService) {}

  async transition(input: BillingTransitionInput) {
    const now = input.now ?? new Date();
    if (!input.correlationId?.trim()) throw new BadRequestException("A lifecycle correlation ID is required.");
    const policy = TRANSITIONS[input.transition];
    if (input.transition === "START_TRIAL" && (!input.trialEndsAt || input.trialEndsAt <= now)) throw new BadRequestException("A future trial end is required.");
    if (input.transition === "PAYMENT_FAILED" && (!input.graceDeadline || input.graceDeadline <= now)) throw new BadRequestException("A future grace deadline is required.");
    if (input.transition === "SCHEDULE_CANCELLATION" && (!input.currentPeriodEndsAt || input.currentPeriodEndsAt <= now)) throw new BadRequestException("A future period end is required.");

    try {
      return await this.prisma.$transaction(async (tx) => {
        const subscription = await tx.organizationSubscription.findFirst({ where: { id: input.subscriptionId, organizationId: input.organizationId } });
        if (!subscription) throw new NotFoundException("Subscription not found.");
        const requestHash = transitionRequestHash(input);
        const duplicate = await tx.billingLifecycleEvent.findFirst({
          where: { organizationId: input.organizationId, subscriptionId: subscription.id, correlationId: input.correlationId.trim() },
          select: { id: true, safeMetadataJson: true },
        });
        if (duplicate) {
          if (metadataRequestHash(duplicate.safeMetadataJson) !== requestHash) throw new ConflictException("Lifecycle correlation ID was reused with a different request.");
          return { ...subscription, replay: true };
        }
        if (!policy.from.includes(subscription.status)) throw new ConflictException("Subscription transition is not valid from its current state.");
        if (input.transition === "EXPIRE_GRACE" && (!subscription.graceDeadline || subscription.graceDeadline > now)) throw new ConflictException("Grace period has not expired.");
        if (input.transition === "CANCEL" && (!subscription.currentPeriodEndsAt || subscription.currentPeriodEndsAt > now)) throw new ConflictException("Current paid period has not ended.");
        if (input.transition === "REACTIVATE" && (!subscription.currentPeriodEndsAt || subscription.currentPeriodEndsAt <= now)) throw new ConflictException("Subscription can no longer be reactivated after its period end.");

        const claimed = await tx.organizationSubscription.updateMany({
          where: { id: subscription.id, organizationId: input.organizationId, version: input.expectedVersion, status: subscription.status },
          data: lifecycleData(input, policy.to, now),
        });
        if (claimed.count !== 1) throw new ConflictException("Subscription changed. Reload and retry.");
        const updated = await tx.organizationSubscription.findUniqueOrThrow({ where: { id: subscription.id } });
        await tx.billingLifecycleEvent.create({ data: { organizationId: input.organizationId, subscriptionId: subscription.id, eventType: policy.event, previousStatus: subscription.status, nextStatus: updated.status, reasonCode: input.transition, correlationId: input.correlationId.trim(), safeMetadataJson: { version: updated.version, requestHash } } });
        await this.auditLog.log({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: input.transition, entityType: "OrganizationSubscription", entityId: subscription.id, before: { status: subscription.status, version: subscription.version }, after: { status: updated.status, version: updated.version } }, tx);
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((error as { code?: string }).code === "P2034") throw new ConflictException("Subscription transition conflicted. Reload and retry.");
      throw error;
    }
  }

  async schedulePlanChange(input: { organizationId: string; subscriptionId: string; expectedVersion: number; targetPlanVersionId: string; effectiveAt: Date; correlationId: string; actorUserId?: string }) {
    if (!input.correlationId?.trim()) throw new BadRequestException("A lifecycle correlation ID is required.");
    if (input.effectiveAt <= new Date()) throw new BadRequestException("A future plan-change effective date is required.");
    try {
      return await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.organizationSubscription.findFirst({ where: { id: input.subscriptionId, organizationId: input.organizationId } });
      if (!subscription) throw new NotFoundException("Subscription not found.");
      const requestHash = planChangeRequestHash(input);
      const duplicate = await tx.billingLifecycleEvent.findFirst({
        where: { organizationId: input.organizationId, subscriptionId: subscription.id, correlationId: input.correlationId.trim() },
        select: { id: true, safeMetadataJson: true },
      });
      if (duplicate) {
        if (metadataRequestHash(duplicate.safeMetadataJson) !== requestHash) throw new ConflictException("Plan-change correlation ID was reused with a different request.");
        const existing = await tx.subscriptionScheduledChange.findFirst({ where: { subscriptionId: subscription.id, organizationId: input.organizationId, status: BillingScheduledChangeStatus.PENDING } });
        if (!existing) throw new ConflictException("Plan change was already processed.");
        return { ...existing, replay: true };
      }
      if (subscription.version !== input.expectedVersion) throw new ConflictException("Subscription changed. Reload and retry.");
      if (!SCHEDULABLE_PLAN_CHANGE_STATUSES.includes(subscription.status)) {
        throw new ConflictException("Plan changes require an active commercial subscription state.");
      }
      if (subscription.planVersionId === input.targetPlanVersionId) throw new BadRequestException("Target plan must differ from the current plan.");
      const target = await tx.billingPlanVersion.findFirst({ where: { id: input.targetPlanVersionId, status: "ACTIVE" } });
      if (!target) throw new BadRequestException("Target plan version is not active.");
      await tx.subscriptionScheduledChange.updateMany({ where: { subscriptionId: subscription.id, status: BillingScheduledChangeStatus.PENDING }, data: { status: BillingScheduledChangeStatus.SUPERSEDED } });
      const change = await tx.subscriptionScheduledChange.create({ data: { organizationId: input.organizationId, subscriptionId: subscription.id, currentPlanVersionId: subscription.planVersionId, targetPlanVersionId: target.id, effectiveAt: input.effectiveAt, reasonCode: "PLAN_CHANGE", status: BillingScheduledChangeStatus.PENDING } });
      const claimed = await tx.organizationSubscription.updateMany({
        where: { id: subscription.id, organizationId: input.organizationId, version: input.expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new ConflictException("Subscription changed. Reload and retry.");
      await tx.billingLifecycleEvent.create({ data: { organizationId: input.organizationId, subscriptionId: subscription.id, eventType: BillingLifecycleEventType.PLAN_CHANGE_SCHEDULED, previousStatus: subscription.status, nextStatus: subscription.status, reasonCode: "PLAN_CHANGE", correlationId: input.correlationId.trim(), safeMetadataJson: { scheduledChangeId: change.id, requestHash } } });
      await this.auditLog.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: "SCHEDULE_PLAN_CHANGE",
        entityType: "OrganizationSubscription",
        entityId: subscription.id,
        before: { planVersionId: subscription.planVersionId, version: subscription.version },
        after: { planVersionId: subscription.planVersionId, scheduledChangeId: change.id, version: subscription.version + 1 },
      }, tx);
        return change;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((error as { code?: string }).code === "P2034") throw new ConflictException("Plan change conflicted. Reload and retry.");
      throw error;
    }
  }

  /**
   * The queue/worker boundary can invoke this deterministic runner repeatedly.
   * A worker only claims due rows through the optimistic versioned transition;
   * another worker winning the race is a harmless skip rather than a second
   * lifecycle transition.
   */
  async processDueTransitions(input: { now?: Date; batchSize?: number } = {}): Promise<BillingLifecycleWorkerResult> {
    const now = input.now ?? new Date();
    const batchSize = Math.min(Math.max(input.batchSize ?? 100, 1), 250);
    const due = await this.prisma.organizationSubscription.findMany({
      where: {
        OR: [
          { status: BillingSubscriptionStatus.GRACE, graceDeadline: { lte: now } },
          { status: BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, currentPeriodEndsAt: { lte: now } },
        ],
      },
      orderBy: { updatedAt: "asc" },
      take: batchSize,
      select: { id: true, organizationId: true, version: true, status: true },
    });

    let processed = 0;
    let skipped = 0;
    for (const subscription of due) {
      const transition = subscription.status === BillingSubscriptionStatus.GRACE ? "EXPIRE_GRACE" : "CANCEL";
      try {
        await this.transition({
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          expectedVersion: subscription.version,
          transition,
          correlationId: `billing-lifecycle-expiry:${subscription.id}:${subscription.version}`,
          now,
        });
        processed += 1;
      } catch (error) {
        if (error instanceof ConflictException || error instanceof NotFoundException) {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }
    return { processed, skipped };
  }

  /** Applies period-bound plan changes without creating a second worker system. */
  async processDuePlanChanges(input: { now?: Date; batchSize?: number } = {}): Promise<BillingLifecycleWorkerResult> {
    const now = input.now ?? new Date();
    const batchSize = Math.min(Math.max(input.batchSize ?? 100, 1), 250);
    const due = await this.prisma.subscriptionScheduledChange.findMany({
      where: { status: BillingScheduledChangeStatus.PENDING, effectiveAt: { lte: now } },
      orderBy: { effectiveAt: "asc" },
      take: batchSize,
      select: { id: true },
    });

    let processed = 0;
    let skipped = 0;
    for (const change of due) {
      try {
        const applied = await this.applyScheduledPlanChange(change.id, now);
        if (applied) processed += 1;
        else skipped += 1;
      } catch (error) {
        if (error instanceof ConflictException || error instanceof NotFoundException) {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }
    return { processed, skipped };
  }

  private async applyScheduledPlanChange(changeId: string, now: Date): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const change = await tx.subscriptionScheduledChange.findFirst({
          where: { id: changeId, status: BillingScheduledChangeStatus.PENDING, effectiveAt: { lte: now } },
        });
        if (!change) return false;
        const subscription = await tx.organizationSubscription.findFirst({ where: { id: change.subscriptionId, organizationId: change.organizationId } });
        if (!subscription) throw new NotFoundException("Subscription not found.");
        if (subscription.planVersionId !== change.currentPlanVersionId) {
          await tx.subscriptionScheduledChange.updateMany({
            where: { id: change.id, status: BillingScheduledChangeStatus.PENDING },
            data: { status: BillingScheduledChangeStatus.SUPERSEDED },
          });
          return false;
        }
        if (!SCHEDULABLE_PLAN_CHANGE_STATUSES.includes(subscription.status)) {
          await tx.subscriptionScheduledChange.updateMany({
            where: { id: change.id, status: BillingScheduledChangeStatus.PENDING },
            data: { status: BillingScheduledChangeStatus.CANCELED },
          });
          return false;
        }
        const claimed = await tx.subscriptionScheduledChange.updateMany({
          where: { id: change.id, status: BillingScheduledChangeStatus.PENDING },
          data: { status: BillingScheduledChangeStatus.APPLIED },
        });
        if (claimed.count !== 1) return false;
        const updated = await tx.organizationSubscription.updateMany({
          where: { id: subscription.id, organizationId: change.organizationId, version: subscription.version, planVersionId: change.currentPlanVersionId },
          data: { planVersionId: change.targetPlanVersionId, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw new ConflictException("Subscription changed. Reload and retry.");
        await tx.billingLifecycleEvent.create({
          data: {
            organizationId: change.organizationId,
            subscriptionId: subscription.id,
            eventType: BillingLifecycleEventType.PLAN_CHANGE_APPLIED,
            previousStatus: subscription.status,
            nextStatus: subscription.status,
            reasonCode: change.reasonCode,
            correlationId: `billing-plan-change:${change.id}`,
            safeMetadataJson: { scheduledChangeId: change.id },
          },
        });
        await this.auditLog.log({
          organizationId: change.organizationId,
          action: "APPLY_PLAN_CHANGE",
          entityType: "OrganizationSubscription",
          entityId: subscription.id,
          before: { planVersionId: change.currentPlanVersionId, version: subscription.version },
          after: { planVersionId: change.targetPlanVersionId, version: subscription.version + 1 },
        }, tx);
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((error as { code?: string }).code === "P2034") throw new ConflictException("Scheduled plan change conflicted. Reload and retry.");
      throw error;
    }
  }
}

function transitionRequestHash(input: BillingTransitionInput): string {
  return requestHash({ transition: input.transition, trialEndsAt: input.trialEndsAt?.toISOString() ?? null, graceDeadline: input.graceDeadline?.toISOString() ?? null, currentPeriodEndsAt: input.currentPeriodEndsAt?.toISOString() ?? null });
}

function planChangeRequestHash(input: { targetPlanVersionId: string; effectiveAt: Date }): string {
  return requestHash({ targetPlanVersionId: input.targetPlanVersionId, effectiveAt: input.effectiveAt.toISOString() });
}

function requestHash(value: object): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function metadataRequestHash(value: Prisma.JsonValue | null): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const requestHash = (value as Record<string, unknown>).requestHash;
  return typeof requestHash === "string" ? requestHash : null;
}

function lifecycleData(input: BillingTransitionInput, status: BillingSubscriptionStatus, now: Date): Prisma.OrganizationSubscriptionUpdateManyMutationInput {
  const common = { status, version: { increment: 1 } };
  switch (input.transition) {
    case "START_TRIAL": return { ...common, trialStartedAt: now, trialEndsAt: input.trialEndsAt! };
    case "ACTIVATE": return { ...common, graceDeadline: null, suspendedAt: null };
    case "PAYMENT_FAILED": return { ...common, graceDeadline: input.graceDeadline! };
    case "EXPIRE_GRACE": return { ...common, suspendedAt: now };
    case "SCHEDULE_CANCELLATION": return { ...common, cancelAtPeriodEnd: true, currentPeriodEndsAt: input.currentPeriodEndsAt! };
    case "CANCEL": return { ...common, canceledAt: now };
    case "REACTIVATE": return { ...common, cancelAtPeriodEnd: false, canceledAt: null, suspendedAt: null, graceDeadline: null };
  }
}
