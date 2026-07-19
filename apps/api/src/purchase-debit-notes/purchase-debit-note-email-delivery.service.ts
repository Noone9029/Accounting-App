import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentType, EmailTemplateType, PurchaseDebitNoteStatus } from "@prisma/client";
import { AUDIT_EVENTS } from "../audit-log/audit-events";
import { CreateSupplierDocumentEmailDeliveryDto } from "../email/dto/create-supplier-document-email-delivery.dto";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { buildPurchaseDebitNoteDeliveryEmail } from "../email/email-templates";
import { PrismaService } from "../prisma/prisma.service";
import { PurchaseDebitNoteService } from "./purchase-debit-note.service";

@Injectable()
export class PurchaseDebitNoteEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseDebitNoteService: PurchaseDebitNoteService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(
    organizationId: string,
    actorUserId: string,
    debitNoteId: string,
    dto: CreateSupplierDocumentEmailDeliveryDto,
    requestId?: string,
  ): Promise<DocumentDeliveryQueueResult & { debitNoteId: string; debitNoteNumber: string }> {
    const debitNote = await this.prisma.purchaseDebitNote.findFirst({
      where: { id: debitNoteId, organizationId },
      select: { id: true, debitNoteNumber: true, status: true },
    });
    if (!debitNote) {
      throw new NotFoundException("Purchase debit note not found.");
    }
    if (debitNote.status !== PurchaseDebitNoteStatus.FINALIZED) {
      throw new BadRequestException("Only finalized purchase debit notes can be sent by email.");
    }

    const data = await this.purchaseDebitNoteService.pdfData(organizationId, debitNoteId);
    const recipientEmail = normalizeRecipient(dto.recipientEmail ?? data.supplier.email);
    const template = buildPurchaseDebitNoteDeliveryEmail({
      organizationName: data.organization.name,
      supplierDisplayName: data.supplier.displayName ?? data.supplier.name,
      debitNoteNumber: data.debitNote.debitNoteNumber,
      currency: data.debitNote.currency,
      transactionTotal: data.debitNote.total,
      issueDate: formatDate(data.debitNote.issueDate),
      originalBillNumber: data.originalBill?.billNumber,
      message: dto.message?.trim() || undefined,
    });
    const subject = dto.subject?.trim() || template.subject;
    assertSubject(subject);
    const requestContext = { status: debitNote.status };

    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "PurchaseDebitNote",
      sourceId: debitNote.id,
      sourceNumber: debitNote.debitNoteNumber,
      documentType: DocumentType.PURCHASE_DEBIT_NOTE,
      templateType: EmailTemplateType.PURCHASE_DEBIT_NOTE,
      requestContext,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      idempotencyKey: dto.idempotencyKey,
      requestId,
      replayedAuditEvent: "PURCHASE_DEBIT_NOTE_EMAIL_DELIVERY_REPLAYED",
    });
    if (replay) {
      return { ...replay, debitNoteId: debitNote.id, debitNoteNumber: debitNote.debitNoteNumber };
    }

    const archived = await this.purchaseDebitNoteService.pdf(organizationId, actorUserId, debitNoteId);
    if (!archived.document || typeof archived.document !== "object") {
      throw new BadRequestException("Purchase debit note PDF could not be archived for email delivery.");
    }
    const document = archived.document as { id: string; filename: string; mimeType: string; sizeBytes: number; contentHash: string };
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      sourceType: "PurchaseDebitNote",
      sourceId: debitNote.id,
      sourceNumber: debitNote.debitNoteNumber,
      documentType: DocumentType.PURCHASE_DEBIT_NOTE,
      requestContext,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.PURCHASE_DEBIT_NOTE,
      idempotencyKey: dto.idempotencyKey,
      generatedDocument: { id: document.id, filename: document.filename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, contentHash: document.contentHash },
      requestId,
      auditEvent: AUDIT_EVENTS.EMAIL_OUTBOX_CREATED,
      replayedAuditEvent: "PURCHASE_DEBIT_NOTE_EMAIL_DELIVERY_REPLAYED",
      blockedAuditEvent: "PURCHASE_DEBIT_NOTE_EMAIL_DELIVERY_BLOCKED",
    });
    return { ...queued, debitNoteId: debitNote.id, debitNoteNumber: debitNote.debitNoteNumber };
  }

  async history(organizationId: string, debitNoteId: string) {
    const debitNote = await this.prisma.purchaseDebitNote.findFirst({ where: { id: debitNoteId, organizationId }, select: { id: true } });
    if (!debitNote) {
      throw new NotFoundException("Purchase debit note not found.");
    }
    return this.documentDeliveryService.listHistory(organizationId, "PurchaseDebitNote", debitNoteId);
  }
}

function normalizeRecipient(value?: string | null): string {
  const recipient = value?.trim().toLowerCase() ?? "";
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new BadRequestException("A valid recipient email is required for purchase debit note delivery.");
  }
  return recipient;
}

function assertSubject(subject: string): void {
  if (subject.length > 200 || /[\r\n]/.test(subject)) {
    throw new BadRequestException("Purchase debit note email subject must be 200 characters or fewer and cannot contain line breaks.");
  }
}

function formatDate(value?: Date | string | null): string {
  if (!value) return "Not specified";
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}
