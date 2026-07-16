import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailDeliveryStatus, EmailTemplateType, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { GeneratedDocumentService } from "../generated-documents/generated-document.service";
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

export interface DocumentDeliveryReplayLookupInput {
  organizationId: string;
  actorUserId: string;
  salesInvoiceId?: string | null;
  sourceType: string;
  sourceId: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  idempotencyKey: string;
  requestId?: string;
  replayedAuditEvent?: string;
}

export interface DocumentDeliveryQueueResult {
  id: string;
  organizationId: string | null;
  invoiceId: string | null;
  generatedDocumentId: string | null;
  attachmentFilename: string | null;
  attachmentMimeType: string | null;
  attachmentSizeBytes: number | null;
  attachmentContentHash: string | null;
  requestedBy: { id: string; name: string | null } | null;
  maskedRecipient: string;
  status: EmailDeliveryStatus;
  userFacingStatus: string;
  attemptCount: number;
  latestAttemptAt: Date | null;
  nextAttemptAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  suppressionStatus: string | null;
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
    @Optional() private readonly generatedDocumentService?: GeneratedDocumentService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async queue(input: QueueDocumentDeliveryInput): Promise<DocumentDeliveryQueueResult> {
    const recipientEmail = normalizeEmail(input.recipientEmail);
    const idempotencyKeyHash = hashText(normalizeIdempotencyKey(input.idempotencyKey));
    const requestHash = buildRequestHash(input.salesInvoiceId, recipientEmail, input.subject, input.bodyText);

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

  async replayIfExisting(input: DocumentDeliveryReplayLookupInput): Promise<DocumentDeliveryQueueResult | null> {
    const recipientEmail = normalizeEmail(input.recipientEmail);
    const idempotencyKeyHash = hashText(normalizeIdempotencyKey(input.idempotencyKey));
    const existing = await this.findByIdempotency(input.organizationId, idempotencyKeyHash);
    if (!existing) return null;
    return this.replayOrConflict(existing, buildRequestHash(input.salesInvoiceId, recipientEmail, input.subject, input.bodyText), {
      ...input,
      recipientEmail,
      fromEmail: "",
      bodyHtml: null,
      templateType: EmailTemplateType.SALES_INVOICE,
      generatedDocument: {
        id: existing.generatedDocumentId ?? "unknown",
        filename: existing.attachmentFilename ?? "unknown",
        mimeType: "application/pdf",
        sizeBytes: 0,
        contentHash: "present",
      },
    });
  }

  async listHistory(organizationId: string, sourceType: string, sourceId: string): Promise<DocumentDeliveryQueueResult[]> {
    const rows = await this.prisma.emailOutbox.findMany({
      where: { organizationId, sourceType, sourceId },
      orderBy: { createdAt: "desc" },
      select: safeOutboxSelect,
    });
    return rows.map((row: Prisma.EmailOutboxGetPayload<{ select: typeof safeOutboxSelect }>) => this.map(row, false));
  }

  async readAttachmentForWorker(organizationId: string, outboxId: string) {
    if (!this.generatedDocumentService) {
      throw new NotFoundException("Generated document worker access is unavailable.");
    }
    const outbox = await this.prisma.emailOutbox.findFirst({
      where: { id: outboxId, organizationId },
      select: {
        id: true,
        generatedDocumentId: true,
        sourceType: true,
        sourceId: true,
        attachmentFilename: true,
        attachmentMimeType: true,
        attachmentSizeBytes: true,
        attachmentContentHash: true,
      },
    });
    if (!outbox?.generatedDocumentId || !outbox.attachmentFilename || !outbox.attachmentMimeType || !outbox.attachmentContentHash) {
      throw new BadRequestException("Invoice email attachment metadata is incomplete.");
    }
    const document = await this.generatedDocumentService.readContentForWorker(organizationId, outbox.generatedDocumentId);
    const maxBytes = configuredPositiveInteger(this.config?.get<string>("LEDGERBYTE_EMAIL_ATTACHMENT_MAX_BYTES"), 10 * 1024 * 1024);
    if (document.sourceType !== outbox.sourceType || document.sourceId !== outbox.sourceId) {
      throw new BadRequestException("Invoice email attachment source verification failed.");
    }
    if (document.mimeType !== outbox.attachmentMimeType || document.mimeType !== "application/pdf") {
      throw new BadRequestException("Invoice email attachment MIME verification failed.");
    }
    if (document.filename !== outbox.attachmentFilename || document.sizeBytes !== outbox.attachmentSizeBytes || document.contentHash !== outbox.attachmentContentHash) {
      throw new BadRequestException("Invoice email attachment metadata verification failed.");
    }
    if (document.buffer.byteLength !== document.sizeBytes || document.buffer.byteLength > maxBytes) {
      throw new BadRequestException("Invoice email attachment size verification failed.");
    }
    const contentHash = hashBuffer(document.buffer);
    if (contentHash !== document.contentHash) {
      throw new BadRequestException("Invoice email attachment hash verification failed.");
    }
    return {
      filename: document.filename,
      mimeType: document.mimeType,
      content: document.buffer,
      contentHash,
    };
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
      attachmentMimeType: row.attachmentMimeType,
      attachmentSizeBytes: row.attachmentSizeBytes,
      attachmentContentHash: row.attachmentContentHash,
      requestedBy: row.requestedBy ? { id: row.requestedBy.id, name: row.requestedBy.name } : null,
      maskedRecipient: maskEmailAddress(row.toEmail),
      status: row.status,
      userFacingStatus: salesInvoiceDeliveryStatusLabel(row.status, { nextAttemptAt: row.nextAttemptAt, providerEventStatus: row.providerEventStatus }),
      attemptCount: row.attemptCount,
      latestAttemptAt: row.lastAttemptAt,
      nextAttemptAt: row.nextAttemptAt,
      bouncedAt: row.bouncedAt ?? null,
      complainedAt: row.complainedAt ?? null,
      suppressionStatus: row.providerEventStatus === "SUPPRESSED" ? "Blocked by suppression" : null,
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
  attachmentMimeType: true,
  attachmentSizeBytes: true,
  attachmentContentHash: true,
  bouncedAt: true,
  complainedAt: true,
  requestedBy: { select: { id: true, name: true } },
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

function buildRequestHash(invoiceId: string | null | undefined, recipientEmail: string, subject: string, bodyText: string): string {
  return hashText(JSON.stringify({ invoiceId: invoiceId ?? null, recipientEmail, subject, message: bodyText }));
}

function hashBuffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function configuredPositiveInteger(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new BadRequestException("Invoice email attachment size configuration is invalid.");
  }
  return parsed;
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
