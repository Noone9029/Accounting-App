import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { BillingLifecycleEventType, BillingProvider, BillingProviderEnvironment, BillingWebhookProcessingStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { BillingProviderRegistry } from "./billing-provider.registry";
import type { BillingSubscriptionSnapshot } from "./billing-provider.types";

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

export interface BillingWebhookIngressInput {
  provider: BillingProvider;
  environment: BillingProviderEnvironment;
  contentType: string | undefined;
  rawBody: Buffer;
  signature: string | undefined;
}

@Injectable()
export class BillingWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: BillingProviderRegistry,
    private readonly auditLog: AuditLogService,
  ) {}

  async ingest(input: BillingWebhookIngressInput) {
    this.assertWebhookShape(input);
    const provider = this.providers.forProvider(input.provider);
    if (!await provider.verifyWebhook({ rawBody: input.rawBody, signature: input.signature, environment: input.environment })) {
      throw new ForbiddenException("Billing webhook signature verification failed.");
    }

    // Parsing happens only after raw-body signature verification succeeds.
    const normalized = provider.normalizeWebhookEvent(input.rawBody);
    const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
    const ownership = await this.resolveOwnership(input.provider, input.environment, normalized.providerCustomerReference, normalized.providerSubscriptionReference);
    try {
      const event = await this.prisma.billingWebhookEvent.create({
        data: {
          provider: input.provider,
          environment: input.environment,
          providerEventId: normalized.providerEventId,
          eventType: normalized.eventType,
          providerCreatedAt: normalized.providerCreatedAt,
          payloadHash,
          providerCustomerReference: normalized.providerCustomerReference,
          providerSubscriptionReference: normalized.providerSubscriptionReference,
          organizationId: ownership.organizationId,
          subscriptionId: ownership.subscriptionId,
          status: BillingWebhookProcessingStatus.RECEIVED,
        },
      });
      if (ownership.organizationId) {
        await this.auditLog.log({
          organizationId: ownership.organizationId,
          action: "BILLING_WEBHOOK_RECEIVED",
          entityType: "BillingWebhookEvent",
          entityId: event.id,
          after: { provider: input.provider, eventType: normalized.eventType, rawBodyStored: false, payloadHashPresent: true },
        });
      }
      return { event, duplicate: false };
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
      const event = await this.prisma.billingWebhookEvent.findUniqueOrThrow({
        where: { provider_environment_providerEventId: { provider: input.provider, environment: input.environment, providerEventId: normalized.providerEventId } },
      });
      if (event.payloadHash !== payloadHash) {
        throw new ConflictException("Billing provider event identity was reused with a different verified payload.");
      }
      // A replay must not remove unprocessed work or overwrite successful evidence.
      return { event, duplicate: true };
    }
  }

  async reconcile(eventId: string) {
    let event = await this.prisma.billingWebhookEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException("Billing webhook event not found.");
    if (event.status === "PROCESSED" || event.status === "IGNORED_STALE") return { status: event.status };
    if (!event.subscriptionId && event.providerSubscriptionReference && event.organizationId && event.provider === BillingProvider.STRIPE) {
      const snapshot = await this.providers.forProvider(event.provider).reconcileSubscription(event.providerSubscriptionReference);
      if (!snapshot?.localSubscriptionId) return this.markOperatorReview(event.id, "UNMAPPED_PROVIDER_REFERENCE");
      const subscription = await this.prisma.organizationSubscription.findFirst({ where: { id: snapshot.localSubscriptionId, organizationId: event.organizationId, provider: event.provider } });
      const customer = subscription && await this.prisma.billingProviderCustomer.findFirst({ where: { billingAccountId: subscription.billingAccountId, provider: event.provider, environment: event.environment, providerCustomerReference: snapshot.providerCustomerReference } });
      if (!subscription || !customer || (subscription.providerSubscriptionReference && subscription.providerSubscriptionReference !== snapshot.providerSubscriptionReference)) return this.markOperatorReview(event.id, "CANONICAL_REFERENCE_MISMATCH");
      if (snapshot.initialPaymentIncomplete && !subscription.currentPeriodStartedAt) {
        // Opening or abandoning payment cannot consume a no-card local trial.
        await this.prisma.billingWebhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), attemptCount: { increment: 1 } } });
        return { status: BillingWebhookProcessingStatus.PROCESSED };
      }
      await this.prisma.organizationSubscription.updateMany({ where: { id: subscription.id, organizationId: event.organizationId, providerSubscriptionReference: null }, data: { providerSubscriptionReference: snapshot.providerSubscriptionReference, version: { increment: 1 } } });
      event = await this.prisma.billingWebhookEvent.update({ where: { id: event.id }, data: { subscriptionId: subscription.id } });
    }
    if (!event.subscriptionId || !event.organizationId || !event.providerSubscriptionReference) {
      return this.markOperatorReview(event.id, "UNMAPPED_PROVIDER_REFERENCE");
    }

    const provider = this.providers.forProvider(event.provider);
    const beforeFetch = event.provider === BillingProvider.STRIPE ? await this.prisma.organizationSubscription.findFirst({ where: { id: event.subscriptionId, organizationId: event.organizationId }, select: { version: true } }) : null;
    const snapshot = await provider.reconcileSubscription(event.providerSubscriptionReference);
    if (!snapshot) return this.markOperatorReview(event.id, "CANONICAL_SUBSCRIPTION_UNAVAILABLE");
    if (snapshot.provider !== event.provider || snapshot.providerSubscriptionReference !== event.providerSubscriptionReference) {
      return this.markOperatorReview(event.id, "CANONICAL_REFERENCE_MISMATCH");
    }

    if (event.provider === BillingProvider.STRIPE) {
      if (!beforeFetch) return this.markOperatorReview(event.id, "SUBSCRIPTION_TENANT_MISMATCH");
      const subscription = await this.applyVerifiedSnapshot(event.organizationId, event.subscriptionId, snapshot, beforeFetch.version);
      await this.prisma.billingWebhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), attemptCount: { increment: 1 }, safeErrorCode: null } });
      return { status: BillingWebhookProcessingStatus.PROCESSED, subscription };
    }

    return this.prisma.$transaction(async (tx) => {
      const currentEvent = await tx.billingWebhookEvent.findUniqueOrThrow({ where: { id: event.id } });
      const subscription = await tx.organizationSubscription.findFirst({ where: { id: event.subscriptionId!, organizationId: event.organizationId!, provider: event.provider, providerSubscriptionReference: event.providerSubscriptionReference } });
      if (!subscription) return this.markOperatorReviewInTransaction(tx, currentEvent.id, "SUBSCRIPTION_TENANT_MISMATCH");
      if (currentEvent.providerCreatedAt && subscription.providerUpdatedAt && currentEvent.providerCreatedAt <= subscription.providerUpdatedAt) {
        await tx.billingWebhookEvent.update({ where: { id: currentEvent.id }, data: { status: BillingWebhookProcessingStatus.IGNORED_STALE, attemptCount: { increment: 1 }, processedAt: new Date(), safeErrorCode: "STALE_PROVIDER_EVENT" } });
        return { status: BillingWebhookProcessingStatus.IGNORED_STALE };
      }

      const updated = await tx.organizationSubscription.update({
        where: { id: subscription.id },
        data: {
          status: snapshot.status,
          interval: snapshot.interval,
          currentPeriodEndsAt: snapshot.currentPeriodEndsAt,
          graceDeadline: snapshot.graceDeadline,
          cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
          providerUpdatedAt: snapshot.providerUpdatedAt,
          lastReconciledAt: new Date(),
          version: { increment: 1 },
        },
      });
      await tx.billingLifecycleEvent.create({
        data: {
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          eventType: BillingLifecycleEventType.WEBHOOK_RECONCILED,
          previousStatus: subscription.status,
          nextStatus: updated.status,
          reasonCode: "CANONICAL_PROVIDER_RECONCILIATION",
          correlationId: `billing-webhook:${currentEvent.id}`,
          safeMetadataJson: { providerEventIdPresent: true, provider: event.provider },
        },
      });
      await tx.billingWebhookEvent.update({ where: { id: currentEvent.id }, data: { status: BillingWebhookProcessingStatus.PROCESSED, attemptCount: { increment: 1 }, processedAt: new Date(), safeErrorCode: null } });
      await this.auditLog.log({
        organizationId: subscription.organizationId,
        action: "BILLING_WEBHOOK_RECONCILED",
        entityType: "OrganizationSubscription",
        entityId: subscription.id,
        before: { status: subscription.status, version: subscription.version },
        after: { status: updated.status, version: updated.version, providerPayloadStored: false },
      }, tx);
      return { status: BillingWebhookProcessingStatus.PROCESSED, subscription: updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private assertWebhookShape(input: BillingWebhookIngressInput) {
    if (input.provider !== BillingProvider.FAKE && input.provider !== BillingProvider.STRIPE) throw new BadRequestException("Billing webhook provider is not supported.");
    if (!input.contentType?.toLowerCase().startsWith("application/json")) throw new BadRequestException("Billing webhook content type must be application/json.");
    if (!Buffer.isBuffer(input.rawBody) || input.rawBody.length === 0 || input.rawBody.length > MAX_WEBHOOK_BODY_BYTES) throw new BadRequestException("Billing webhook body is invalid or exceeds the safe limit.");
  }

  async processPending(input: { batchSize?: number } = {}) {
    const pending = await this.prisma.billingWebhookEvent.findMany({ where: { status: { in: ["RECEIVED", "FAILED"] }, attemptCount: { lt: 5 } }, orderBy: { createdAt: "asc" }, take: Math.min(50, Math.max(1, input.batchSize ?? 25)), select: { id: true } });
    let processed = 0;
    for (const event of pending) {
      try { await this.reconcile(event.id); processed++; }
      catch { await this.prisma.billingWebhookEvent.updateMany({ where: { id: event.id, status: { in: ["RECEIVED", "FAILED", "PROCESSING"] } }, data: { status: "FAILED", attemptCount: { increment: 1 }, safeErrorCode: "CANONICAL_RECONCILIATION_FAILED" } }); }
    }
    return { processed, pending: pending.length };
  }

  async applyVerifiedSnapshot(organizationId: string, subscriptionId: string, snapshot: BillingSubscriptionSnapshot, expectedVersion: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "OrganizationSubscription" WHERE id = ${subscriptionId}::uuid AND "organizationId" = ${organizationId}::uuid FOR UPDATE`;
      const subscription = await tx.organizationSubscription.findFirst({ where: { id: subscriptionId, organizationId, provider: snapshot.provider, providerSubscriptionReference: snapshot.providerSubscriptionReference } });
      if (!subscription) throw new ConflictException("Verified billing subscription does not belong to this organization.");
      if (subscription.version !== expectedVersion) throw new ConflictException("Subscription changed during the provider read. Fetch canonical state again.");
      if (snapshot.initialPaymentIncomplete && !subscription.currentPeriodStartedAt) return subscription;
      const customer = await tx.billingProviderCustomer.findFirst({ where: { billingAccountId: subscription.billingAccountId, provider: snapshot.provider, environment: "TEST", providerCustomerReference: snapshot.providerCustomerReference } });
      const price = snapshot.providerPriceReference && await tx.billingPrice.findFirst({ where: { provider: snapshot.provider, environment: "TEST", providerPriceId: snapshot.providerPriceReference, active: true, currency: "SAR", interval: "MONTH" }, include: { planVersion: { include: { billingPlan: true } } } });
      if (!customer || !price || !["STARTER", "GROWTH"].includes(price.planVersion.billingPlan.key)) throw new ConflictException("Verified provider price or customer mapping is unavailable.");
      const updated = await tx.organizationSubscription.update({ where: { id: subscription.id }, data: { planVersionId: price.planVersionId, status: snapshot.status, currentPeriodStartedAt: snapshot.currentPeriodStartedAt, currentPeriodEndsAt: snapshot.currentPeriodEndsAt, trialEndsAt: snapshot.trialEndsAt, graceDeadline: snapshot.graceDeadline, cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd, providerUpdatedAt: snapshot.providerUpdatedAt, lastReconciledAt: new Date(), version: { increment: 1 } } });
      await tx.subscriptionScheduledChange.updateMany({ where: { subscriptionId, organizationId, status: "PENDING", targetPlanVersionId: price.planVersionId }, data: { status: "APPLIED" } });
      await tx.billingCheckoutAttempt.updateMany({ where: { subscriptionId, organizationId, status: { in: ["PROVIDER_PENDING", "READY"] } }, data: { status: "COMPLETED" } });
      await tx.billingLifecycleEvent.create({ data: { organizationId, subscriptionId, eventType: "WEBHOOK_RECONCILED", previousStatus: subscription.status, nextStatus: updated.status, reasonCode: "VERIFIED_STRIPE_TEST_SNAPSHOT", safeMetadataJson: { planKey: price.planVersion.billingPlan.key } } });
      await this.auditLog.log({ organizationId, action: "BILLING_CANONICAL_RECONCILIATION", entityType: "OrganizationSubscription", entityId: subscriptionId, before: { status: subscription.status }, after: { status: updated.status, planKey: price.planVersion.billingPlan.key } }, tx);
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async resolveOwnership(provider: BillingProvider, environment: BillingProviderEnvironment, customerReference: string | null, subscriptionReference: string | null) {
    const customer = customerReference ? await this.prisma.billingProviderCustomer.findFirst({
      where: { provider, environment, providerCustomerReference: customerReference },
      include: { billingAccount: { select: { organizationId: true } } },
    }) : null;
    const subscription = subscriptionReference ? await this.prisma.organizationSubscription.findFirst({
      where: { provider, providerSubscriptionReference: subscriptionReference },
      select: { id: true, organizationId: true, billingAccountId: true },
    }) : null;
    if (customer && subscription && customer.billingAccount.organizationId !== subscription.organizationId) {
      throw new ConflictException("Billing provider references do not belong to the same organization.");
    }
    return { organizationId: subscription?.organizationId ?? customer?.billingAccount.organizationId ?? null, subscriptionId: subscription?.id ?? null };
  }

  private async markOperatorReview(eventId: string, safeErrorCode: string) {
    await this.prisma.billingWebhookEvent.update({ where: { id: eventId }, data: { status: BillingWebhookProcessingStatus.OPERATOR_REVIEW, attemptCount: { increment: 1 }, safeErrorCode } });
    return { status: BillingWebhookProcessingStatus.OPERATOR_REVIEW, safeErrorCode };
  }

  private async markOperatorReviewInTransaction(tx: Prisma.TransactionClient, eventId: string, safeErrorCode: string) {
    await tx.billingWebhookEvent.update({ where: { id: eventId }, data: { status: BillingWebhookProcessingStatus.OPERATOR_REVIEW, attemptCount: { increment: 1 }, safeErrorCode } });
    return { status: BillingWebhookProcessingStatus.OPERATOR_REVIEW, safeErrorCode };
  }
}
