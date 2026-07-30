import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { BillingLifecycleEventType, BillingProvider, BillingProviderEnvironment, BillingWebhookProcessingStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { BillingProviderRegistry } from "./billing-provider.registry";

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
      await this.prisma.billingWebhookEvent.update({ where: { id: event.id }, data: { status: BillingWebhookProcessingStatus.IGNORED_DUPLICATE } });
      return { event: { ...event, status: BillingWebhookProcessingStatus.IGNORED_DUPLICATE }, duplicate: true };
    }
  }

  async reconcile(eventId: string) {
    const event = await this.prisma.billingWebhookEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException("Billing webhook event not found.");
    if (!event.subscriptionId || !event.organizationId || !event.providerSubscriptionReference) {
      return this.markOperatorReview(event.id, "UNMAPPED_PROVIDER_REFERENCE");
    }

    const provider = this.providers.forProvider(event.provider);
    const snapshot = await provider.reconcileSubscription(event.providerSubscriptionReference);
    if (!snapshot) return this.markOperatorReview(event.id, "CANONICAL_SUBSCRIPTION_UNAVAILABLE");
    if (snapshot.provider !== event.provider || snapshot.providerSubscriptionReference !== event.providerSubscriptionReference) {
      return this.markOperatorReview(event.id, "CANONICAL_REFERENCE_MISMATCH");
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
