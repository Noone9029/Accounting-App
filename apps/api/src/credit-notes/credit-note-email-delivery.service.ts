import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreditNoteStatus, DocumentType, EmailTemplateType } from "@prisma/client";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { normalizeCustomerDocumentMessage, normalizeCustomerDocumentRecipient, normalizeCustomerDocumentSubject } from "../email/customer-document-email-delivery.validation";
import { buildCreditNoteDeliveryEmail } from "../email/email-templates";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCreditNoteEmailDeliveryDto } from "./dto/create-credit-note-email-delivery.dto";
import { CreditNoteService } from "./credit-note.service";

@Injectable()
export class CreditNoteEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditNoteService: CreditNoteService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(organizationId: string, actorUserId: string, creditNoteId: string, dto: CreateCreditNoteEmailDeliveryDto, requestId?: string): Promise<DocumentDeliveryQueueResult & { creditNoteNumber: string }> {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id: creditNoteId, organizationId },
      select: {
        id: true,
        organizationId: true,
        creditNoteNumber: true,
        status: true,
        currency: true,
        total: true,
        issueDate: true,
        customer: { select: { name: true, displayName: true, email: true } },
        originalInvoice: { select: { invoiceNumber: true } },
        organization: { select: { name: true } },
      },
    });
    if (!creditNote) throw new NotFoundException("Credit note not found.");
    if (creditNote.status !== CreditNoteStatus.FINALIZED) {
      throw new BadRequestException("Only finalized credit notes can be sent by email.");
    }

    const recipientEmail = normalizeCustomerDocumentRecipient(dto.recipientEmail ?? creditNote.customer.email, "credit note");
    const template = buildCreditNoteDeliveryEmail({
      organizationName: creditNote.organization.name,
      customerDisplayName: creditNote.customer.displayName ?? creditNote.customer.name,
      creditNoteNumber: creditNote.creditNoteNumber,
      currency: creditNote.currency,
      total: String(creditNote.total),
      issueDate: creditNote.issueDate.toISOString().slice(0, 10),
      sourceInvoiceNumber: creditNote.originalInvoice?.invoiceNumber ?? null,
      message: normalizeCustomerDocumentMessage(dto.message),
    });
    const subject = normalizeCustomerDocumentSubject(dto.subject, template.subject, "credit note");
    const requestContext = { sourceInvoiceNumber: creditNote.originalInvoice?.invoiceNumber ?? null };
    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "CreditNote",
      sourceId: creditNote.id,
      sourceNumber: creditNote.creditNoteNumber,
      documentType: DocumentType.CREDIT_NOTE,
      templateType: EmailTemplateType.CREDIT_NOTE,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      requestContext,
      idempotencyKey: dto.idempotencyKey,
      requestId,
    });
    if (replay) return { ...replay, creditNoteNumber: creditNote.creditNoteNumber };

    const archived = await this.creditNoteService.pdf(organizationId, actorUserId, creditNote.id);
    const document = asDocument(archived.document, "Credit note PDF could not be archived for email delivery.");
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      sourceType: "CreditNote",
      sourceId: creditNote.id,
      sourceNumber: creditNote.creditNoteNumber,
      documentType: DocumentType.CREDIT_NOTE,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.CREDIT_NOTE,
      idempotencyKey: dto.idempotencyKey,
      requestContext,
      generatedDocument: document,
      requestId,
    });
    return { ...queued, creditNoteNumber: creditNote.creditNoteNumber };
  }

  async history(organizationId: string, creditNoteId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({ where: { id: creditNoteId, organizationId }, select: { id: true } });
    if (!creditNote) throw new NotFoundException("Credit note not found.");
    return this.documentDeliveryService.listHistory(organizationId, "CreditNote", creditNoteId);
  }
}

function asDocument(value: unknown, message: string) {
  if (!value || typeof value !== "object") throw new BadRequestException(message);
  const document = value as Partial<{ id: string; filename: string; mimeType: string; sizeBytes: number; contentHash: string }>;
  if (!document.id || !document.filename || !document.mimeType || document.sizeBytes == null || !document.contentHash) throw new BadRequestException(message);
  return { id: document.id, filename: document.filename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, contentHash: document.contentHash };
}
