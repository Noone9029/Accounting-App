import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailDeliveryStatus, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentDeliveryService } from "./document-delivery.service";
import { EMAIL_PROVIDER, type EmailProvider } from "./email-provider";

const RETRY_SELECT = {
  id: true,
  organizationId: true,
  toEmail: true,
  fromEmail: true,
  subject: true,
  templateType: true,
  bodyText: true,
  bodyHtml: true,
  status: true,
  providerMessageId: true,
  sentAt: true,
  attemptCount: true,
  maxAttempts: true,
  nextAttemptAt: true,
  providerEventStatus: true,
  generatedDocumentId: true,
  salesInvoiceId: true,
  sourceType: true,
  sourceId: true,
  bouncedAt: true,
  complainedAt: true,
  retryLockedAt: true,
  retryLockedBy: true,
} satisfies Prisma.EmailOutboxSelect;

const DEFAULT_STALE_LOCK_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 50;

export interface EmailRetryWorkerResult {
  status: "ATTEMPTED";
  provider: string;
  candidateCount: number;
  claimCount: number;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  attachmentBlockedCount: number;
  skippedClaimCount: number;
}

@Injectable()
export class EmailRetryWorkerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async process(organizationId: string, actorUserId: string, limit = DEFAULT_LIMIT): Promise<EmailRetryWorkerResult> {
    const readiness = this.provider.readiness();
    if (readiness.provider === "invalid" || readiness.provider === "smtp-disabled" || !readiness.ready) {
      return {
        status: "ATTEMPTED",
        provider: this.provider.provider,
        candidateCount: 0,
        claimCount: 0,
        attemptedCount: 0,
        sentCount: 0,
        failedCount: 0,
        suppressedCount: 0,
        attachmentBlockedCount: 0,
        skippedClaimCount: 0,
      };
    }
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), DEFAULT_LIMIT);
    const now = new Date();
    const staleCutoff = new Date(now.getTime() - this.staleLockMs);
    const candidates = await this.prisma.emailOutbox.findMany({
      where: {
        organizationId,
        status: { in: [EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.FAILED] },
        bouncedAt: null,
        complainedAt: null,
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        AND: [{ OR: [{ retryLockedAt: null }, { retryLockedAt: { lt: staleCutoff } }] }],
      },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: boundedLimit,
      select: RETRY_SELECT,
    });

    let claimCount = 0;
    let attemptedCount = 0;
    let sentCount = 0;
    let failedCount = 0;
    let suppressedCount = 0;
    let attachmentBlockedCount = 0;
    let skippedClaimCount = 0;

    for (const email of candidates) {
      if (email.attemptCount >= email.maxAttempts) {
        skippedClaimCount += 1;
        continue;
      }
      const lockedBy = `email-retry:${actorUserId}:${email.id}:${Date.now()}`;
      const claimed = await this.prisma.emailOutbox.updateMany({
        where: {
          id: email.id,
          organizationId,
          status: { in: [EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.FAILED] },
          bouncedAt: null,
          complainedAt: null,
          attemptCount: { lt: email.maxAttempts },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          AND: [{ OR: [{ retryLockedAt: null }, { retryLockedAt: { lt: staleCutoff } }] }],
        },
        data: { retryLockedAt: now, retryLockedBy: lockedBy },
      });
      if (claimed.count !== 1) {
        skippedClaimCount += 1;
        continue;
      }
      claimCount += 1;

      const suppression = await this.prisma.emailSuppression.findFirst({
        where: { organizationId, emailHash: sha256(email.toEmail.trim().toLowerCase()), active: true },
        select: { id: true },
      });
      if (suppression) {
        suppressedCount += 1;
        await this.safeAuditLog({
          organizationId,
          actorUserId,
          action: AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_BLOCKED,
          entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
          entityId: email.id,
          after: { status: "SUPPRESSED", sourceType: email.sourceType, maskedRecipient: maskEmailAddress(email.toEmail) },
        });
        await this.finishClaim(email.id, organizationId, lockedBy, {
          status: EmailDeliveryStatus.FAILED,
          attemptCount: email.maxAttempts,
          providerEventStatus: "SUPPRESSED",
          errorMessage: "Email delivery blocked by active suppression.",
          lastErrorRedacted: "Email delivery blocked by active suppression.",
          nextAttemptAt: null,
          retryLockedAt: null,
          retryLockedBy: null,
        });
        continue;
      }

      let attachments;
      try {
        if (email.sourceType === "SalesInvoice") {
          if (!email.generatedDocumentId || !email.salesInvoiceId || email.salesInvoiceId !== email.sourceId) {
            throw new BadRequestException("Invoice email attachment source metadata is incomplete.");
          }
          attachments = [await this.documentDeliveryService.readAttachmentForWorker(organizationId, email.id)];
        }
      } catch {
        attachmentBlockedCount += 1;
        await this.safeAuditLog({
          organizationId,
          actorUserId,
          action: AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_FAILED,
          entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
          entityId: email.id,
          after: { status: "ATTACHMENT_VERIFICATION_FAILED", sourceType: email.sourceType, maskedRecipient: maskEmailAddress(email.toEmail) },
        });
        await this.finishClaim(email.id, organizationId, lockedBy, {
          status: EmailDeliveryStatus.FAILED,
          attemptCount: email.maxAttempts,
          providerEventStatus: "ATTACHMENT_VERIFICATION_FAILED",
          errorMessage: "Invoice email attachment verification failed.",
          lastErrorRedacted: "Invoice email attachment verification failed.",
          nextAttemptAt: null,
          retryLockedAt: null,
          retryLockedBy: null,
        });
        continue;
      }

      attemptedCount += 1;
      await this.safeAuditLog({
        organizationId,
        actorUserId,
        action: AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_ATTEMPTED,
        entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
        entityId: email.id,
        after: { status: "ATTEMPTED", sourceType: email.sourceType, attachmentPresent: Boolean(attachments) },
      });

      let providerResult;
      try {
        providerResult = await this.provider.send({
          organizationId: email.organizationId,
          toEmail: email.toEmail,
          fromEmail: email.fromEmail,
          subject: email.subject,
          templateType: email.templateType,
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          attachments,
        });
      } catch (error) {
        providerResult = {
          provider: this.provider.provider,
          status: EmailDeliveryStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Email provider failed.",
        };
      }

      const attemptCount = email.attemptCount + 1;
      const failed = providerResult.status === EmailDeliveryStatus.FAILED;
      const safeError = failedProviderError(providerResult.status === EmailDeliveryStatus.FAILED);
      if (failed) failedCount += 1;
      else sentCount += 1;
      const updated = await this.finishClaim(email.id, organizationId, lockedBy, {
        status: providerResult.status,
        provider: providerResult.provider,
        providerMessageId: providerResult.providerMessageId ?? email.providerMessageId ?? null,
        errorMessage: safeError,
        lastErrorRedacted: safeError,
        sentAt: providerResult.sentAt ?? (failed ? null : new Date()),
        attemptCount,
        lastAttemptAt: new Date(),
        nextAttemptAt: failed && attemptCount < email.maxAttempts ? nextRetryAt(attemptCount) : null,
        retryLockedAt: null,
        retryLockedBy: null,
      });
      if (updated.count === 1) {
        await this.safeAuditLog({
          organizationId,
          actorUserId,
          action: failed ? AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_FAILED : AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_SUCCEEDED,
          entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
          entityId: email.id,
          after: { status: providerResult.status, provider: providerResult.provider, attemptCount, errorPresent: Boolean(safeError) },
        });
      }
    }

    return { status: "ATTEMPTED", provider: this.provider.provider, candidateCount: candidates.length, claimCount, attemptedCount, sentCount, failedCount, suppressedCount, attachmentBlockedCount, skippedClaimCount };
  }

  private async finishClaim(id: string, organizationId: string, lockedBy: string, data: Prisma.EmailOutboxUpdateManyMutationInput) {
    return this.prisma.emailOutbox.updateMany({ where: { id, organizationId, retryLockedBy: lockedBy }, data });
  }

  private async safeAuditLog(input: Parameters<AuditLogService["log"]>[0]) {
    try {
      await this.auditLogService?.log(input);
    } catch {
      // Audit persistence must not prevent provider work or leave a claimed row locked.
    }
  }

  private get staleLockMs(): number {
    const value = this.config.get<string>("LEDGERBYTE_EMAIL_RETRY_LOCK_STALE_MS");
    if (value == null || value.trim() === "") return DEFAULT_STALE_LOCK_MS;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new BadRequestException("Email retry lock stale timeout must be a positive integer.");
    return parsed;
  }
}

function failedProviderError(failed: boolean): string | null {
  return failed ? "Email provider delivery failed." : null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function maskEmailAddress(value: string): string {
  const [local, domain] = value.split("@", 2);
  if (!local || !domain) return "[redacted]";
  return `${local.slice(0, 1)}***@${domain}`;
}

function nextRetryAt(attemptCount: number): Date {
  return new Date(Date.now() + Math.min(60 * 60 * 1000, 60 * 1000 * 2 ** Math.max(0, attemptCount - 1)));
}
