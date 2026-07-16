import { BadRequestException, ConflictException, Injectable, Optional } from "@nestjs/common";
import { EmailDeliveryStatus, EmailTemplateType, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { salesInvoiceDeliveryStatusLabel } from "./email-delivery-status";
import { maskEmailAddress } from "./email-redaction";
import type { EmailProvider } from "./email-provider";

export interface DocumentAttachmentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
}

export interface QueueDocumentDeliveryInput {
  organizationId: string;
  actorUserId: string;
  salesInvoiceId?: string | null;
  sourceType: string;
  sourceId: string;
  recipientEmail: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  templateType: EmailTemplateType;
  idempotencyKey: string;
  generatedDocument: DocumentAttachmentMetadata;
  requestId?: string;
  auditEvent?: string;
  replayedAuditEvent?: string;
  blockedAuditEvent?: string;
}

export interface DocumentDeliveryQueueResult {
  id: string;
  organizationId: string | null;
  invoiceId: string | null;
  generatedDocumentId: string | null;
  attachmentFilename: string | null;
  maskedRecipient: string;
  status: EmailDeliveryStatus;
  userFacingStatus: string;
  attemptCount: number;
  latestAttemptAt: Date | null;
  nextAttemptAt: Date | null;
  provider: string;
  safeError: string | null;
  idempotentReplay: boolean;
  createdAt: Date;
}

const DEFAULT_MAX_ATTEMPTS = 3;

@Injectable()
export class DocumentDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: EmailProvider,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async queue(input: QueueDocumentDeliveryInput): Promise<DocumentDeliveryQueueResult> {
    const recipientEmail = normalizeEmail(input.recipientEmail);
    const idempotencyKeyHash = hashText(normalizeIdempotencyKey(input.idempotencyKey));
    const requestHash = hashText(
      JSON.stringify({
        invoiceId: input.salesInvoiceId ?? null,
        recipientEmail,
        subject: input.subject,
        message: input.bodyText,
      }),
    );

    const existing = await this.findByIdempotency(input.organizationId, idempotencyKeyHash);
    if (existing) {
      return this.replayOrConflict(existing, requestHash, input);
    }

    const suppression = await this.prisma.emailSuppression.findFirst({
      where: { organizationId: input.organizationId, emailHash: hashText(recipientEmail), active: true },
      select: { id: true },
    });
    if (suppression) {
      await this.auditLogService?.log({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.blockedAuditEvent ?? (input.auditEvent ? `${input.auditEvent}_BLOCKED` : "EMAIL_DELIVERY_BLOCKED"),
        entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
        entityId: input.salesInvoiceId ?? input.sourceId,
        after: safeAuditMetadata(input, "SUPPRESSED"),
      });
      throw new BadRequestException("Invoice email delivery is blocked by an active suppression.");
    }

    this.assertProviderUsable();

    const data = {
      organizationId: input.organizationId,
      toEmail: recipientEmail,
      fromEmail: input.fromEmail,
      subject: input.subject,
      templateType: input.templateType,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml ?? null,
      status: EmailDeliveryStatus.QUEUED,
      provider: this.provider.provider,
      providerMessageId: null,
      errorMessage: null,
      sentAt: null,
      attemptCount: 0,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      nextAttemptAt: null,
      lastAttemptAt: null,
      lastErrorRedacted: null,
      providerEventStatus: null,
      generatedDocumentId: input.generatedDocument.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      attachmentFilename: input.generatedDocument.filename,
      attachmentMimeType: input.generatedDocument.mimeType,
      attachmentSizeBytes: input.generatedDocument.sizeBytes,
      attachmentContentHash: input.generatedDocument.contentHash,
      salesInvoiceId: input.salesInvoiceId ?? null,
      requestedById: input.actorUserId,
      idempotencyKeyHash,
      requestHash,
      retryLockedAt: null,
      retryLockedBy: null,
    } satisfies Prisma.EmailOutboxUncheckedCreateInput;

    let created: Prisma.EmailOutboxGetPayload<{ select: typeof safeOutboxSelect }>;
    try {
      created = await this.prisma.emailOutbox.create({ data, select: safeOutboxSelect });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      const concurrent = await this.findByIdempotency(input.organizationId, idempotencyKeyHash);
      if (!concurrent) {
        throw error;
      }
      return this.replayOrConflict(concurrent, requestHash, input);
    }

    const response = this.map(created, false);
    await this.auditLogService?.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.auditEvent ?? AUDIT_EVENTS.EMAIL_OUTBOX_CREATED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
      entityId: created.id,
      after: safeAuditMetadata(input, created.status),
    });
    return response;
  }

  async listHistory(organizationId: string, sourceType: string, sourceId: string): Promise<DocumentDeliveryQueueResult[]> {
    const rows = await this.prisma.emailOutbox.findMany({
      where: { organizationId, sourceType, sourceId },
      orderBy: { createdAt: "desc" },
      select: safeOutboxSelect,
    });
    return rows.map((row: Prisma.EmailOutboxGetPayload<{ select: typeof safeOutboxSelect }>) => this.map(row, false));
  }

  private async findByIdempotency(organizationId: string, idempotencyKeyHash: string) {
    return this.prisma.emailOutbox.findFirst({ where: { organizationId, idempotencyKeyHash }, select: safeOutboxSelect });
  }

  private async replayOrConflict(
    row: Prisma.EmailOutboxGetPayload<{ select: typeof safeOutboxSelect }>,
    requestHash: string,
    input: QueueDocumentDeliveryInput,
  ) {
    if (row.requestHash !== requestHash) {
      throw new ConflictException("The idempotency key was already used for a different invoice delivery request.");
    }
    const response = this.map(row, true);
    await this.auditLogService?.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.replayedAuditEvent ?? "EMAIL_DELIVERY_REPLAYED",
      entityType: AUDIT_ENTITY_TYPES.EMAIL_OUTBOX,
      entityId: row.id,
      after: safeAuditMetadata(input, row.status),
    });
    return response;
  }

  private assertProviderUsable() {
    const readiness = this.provider.readiness();
    if (readiness.provider === "invalid" || readiness.provider === "smtp-disabled" || !readiness.ready) {
      const blocker = readiness.blockingReasons?.[0] ?? "The configured email provider is not usable in this environment.";
      throw new BadRequestException(`Invoice email delivery is unavailable: ${blocker}`);
    }
  }

  private map(row: Prisma.EmailOutboxGetPayload<{ select: typeof safeOutboxSelect }>, idempotentReplay: boolean): DocumentDeliveryQueueResult {
    return {
      id: row.id,
      organizationId: row.organizationId,
      invoiceId: row.salesInvoiceId,
      generatedDocumentId: row.generatedDocumentId,
      attachmentFilename: row.attachmentFilename,
      maskedRecipient: maskEmailAddress(row.toEmail),
      status: row.status,
      userFacingStatus: salesInvoiceDeliveryStatusLabel(row.status, { nextAttemptAt: row.nextAttemptAt, providerEventStatus: row.providerEventStatus }),
      attemptCount: row.attemptCount,
      latestAttemptAt: row.lastAttemptAt,
      nextAttemptAt: row.nextAttemptAt,
      provider: row.provider,
      safeError: row.lastErrorRedacted ?? row.errorMessage,
      idempotentReplay,
      createdAt: row.createdAt,
    };
  }
}

const safeOutboxSelect = {
  id: true,
  organizationId: true,
  toEmail: true,
  status: true,
  provider: true,
  errorMessage: true,
  attemptCount: true,
  nextAttemptAt: true,
  lastAttemptAt: true,
  lastErrorRedacted: true,
  providerEventStatus: true,
  generatedDocumentId: true,
  salesInvoiceId: true,
  attachmentFilename: true,
  requestHash: true,
  createdAt: true,
} satisfies Prisma.EmailOutboxSelect;

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException("Invoice email delivery requires a valid recipient email.");
  }
  return email;
}

function normalizeIdempotencyKey(value: string): string {
  const key = value.trim();
  if (key.length < 16 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new BadRequestException("Invoice email delivery requires a safe idempotency key between 16 and 128 characters.");
  }
  return key;
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2002");
}

function safeAuditMetadata(input: QueueDocumentDeliveryInput, status: string) {
  return {
    invoiceId: input.salesInvoiceId ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    generatedDocumentId: input.generatedDocument.id,
    maskedRecipient: maskEmailAddress(input.recipientEmail),
    templateType: input.templateType,
    attachmentFilename: input.generatedDocument.filename,
    attachmentSize: input.generatedDocument.sizeBytes,
    attachmentHashPresent: Boolean(input.generatedDocument.contentHash),
    status,
    requestId: input.requestId ?? null,
  };
}
