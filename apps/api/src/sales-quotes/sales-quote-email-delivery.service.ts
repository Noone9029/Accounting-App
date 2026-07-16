import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentType, EmailTemplateType, SalesQuoteDocumentKind, SalesQuoteStatus } from "@prisma/client";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { buildSalesQuoteDeliveryEmail } from "../email/email-templates";
import { normalizeCustomerDocumentMessage, normalizeCustomerDocumentRecipient, normalizeCustomerDocumentSubject } from "../email/customer-document-email-delivery.validation";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSalesQuoteEmailDeliveryDto } from "./dto/create-sales-quote-email-delivery.dto";
import { SalesQuoteService } from "./sales-quote.service";

@Injectable()
export class SalesQuoteEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesQuoteService: SalesQuoteService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(
    organizationId: string,
    actorUserId: string,
    quoteId: string,
    dto: CreateSalesQuoteEmailDeliveryDto,
    requestId?: string,
  ): Promise<DocumentDeliveryQueueResult & { quoteNumber: string }> {
    const quote = await this.prisma.salesQuote.findFirst({
      where: { id: quoteId, organizationId },
      select: {
        id: true,
        organizationId: true,
        quoteNumber: true,
        status: true,
        documentKind: true,
        currency: true,
        total: true,
        expiryDate: true,
        customer: { select: { name: true, displayName: true, email: true } },
        organization: { select: { name: true } },
      },
    });

    if (!quote) throw new NotFoundException("Sales quote not found.");
    if (quote.status !== SalesQuoteStatus.SENT && quote.status !== SalesQuoteStatus.ACCEPTED) {
      throw new BadRequestException("Only sent or accepted sales quotes can be sent by email.");
    }

    const documentKind = quote.documentKind ?? SalesQuoteDocumentKind.QUOTE;
    const label = documentKind === SalesQuoteDocumentKind.PROFORMA ? "proforma" : "sales quote";
    const recipientEmail = normalizeCustomerDocumentRecipient(dto.recipientEmail ?? quote.customer.email, label);
    const template = buildSalesQuoteDeliveryEmail({
      documentKind,
      organizationName: quote.organization.name,
      customerDisplayName: quote.customer.displayName ?? quote.customer.name,
      quoteNumber: quote.quoteNumber,
      currency: quote.currency,
      total: String(quote.total),
      expiryDate: quote.expiryDate?.toISOString().slice(0, 10) ?? null,
      message: normalizeCustomerDocumentMessage(dto.message),
    });
    const subject = normalizeCustomerDocumentSubject(dto.subject, template.subject, label);
    const requestContext = { documentKind };
    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "SalesQuote",
      sourceId: quote.id,
      sourceNumber: quote.quoteNumber,
      documentType: DocumentType.SALES_QUOTE,
      templateType: EmailTemplateType.SALES_QUOTE,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      requestContext,
      idempotencyKey: dto.idempotencyKey,
      requestId,
    });
    if (replay) return { ...replay, sourceNumber: quote.quoteNumber, quoteNumber: quote.quoteNumber };

    const archived = await this.salesQuoteService.pdf(organizationId, actorUserId, quote.id);
    const document = asDocument(archived.document, "Sales quote PDF could not be archived for email delivery.");
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      sourceType: "SalesQuote",
      sourceId: quote.id,
      sourceNumber: quote.quoteNumber,
      documentType: DocumentType.SALES_QUOTE,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.SALES_QUOTE,
      idempotencyKey: dto.idempotencyKey,
      requestContext,
      generatedDocument: document,
      requestId,
    });
    return { ...queued, quoteNumber: quote.quoteNumber };
  }

  async history(organizationId: string, quoteId: string) {
    const quote = await this.prisma.salesQuote.findFirst({ where: { id: quoteId, organizationId }, select: { id: true } });
    if (!quote) throw new NotFoundException("Sales quote not found.");
    return this.documentDeliveryService.listHistory(organizationId, "SalesQuote", quoteId);
  }
}

function asDocument(value: unknown, message: string) {
  if (!value || typeof value !== "object") throw new BadRequestException(message);
  const document = value as Partial<{ id: string; filename: string; mimeType: string; sizeBytes: number; contentHash: string }>;
  if (!document.id || !document.filename || !document.mimeType || document.sizeBytes == null || !document.contentHash) {
    throw new BadRequestException(message);
  }
  return {
    id: document.id,
    filename: document.filename,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    contentHash: document.contentHash,
  };
}
