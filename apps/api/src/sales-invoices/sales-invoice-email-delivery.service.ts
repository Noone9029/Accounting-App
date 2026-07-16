import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailTemplateType, SalesInvoiceStatus } from "@prisma/client";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { buildSalesInvoiceDeliveryEmail } from "../email/email-templates";
import { AUDIT_EVENTS } from "../audit-log/audit-events";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSalesInvoiceEmailDeliveryDto } from "./dto/create-sales-invoice-email-delivery.dto";
import { SalesInvoiceService } from "./sales-invoice.service";

@Injectable()
export class SalesInvoiceEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesInvoiceService: SalesInvoiceService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(
    organizationId: string,
    actorUserId: string,
    invoiceId: string,
    dto: CreateSalesInvoiceEmailDeliveryDto,
    requestId?: string,
  ): Promise<DocumentDeliveryQueueResult & { invoiceNumber: string }> {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: {
        id: true,
        organizationId: true,
        invoiceNumber: true,
        status: true,
        currency: true,
        total: true,
        balanceDue: true,
        transactionTotal: true,
        transactionBalanceDue: true,
        dueDate: true,
        customer: { select: { name: true, displayName: true, email: true } },
        organization: { select: { name: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }
    if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
      throw new BadRequestException("Only finalized sales invoices can be sent by email.");
    }

    const recipientEmail = normalizeRecipient(dto.recipientEmail ?? invoice.customer.email);
    const template = buildSalesInvoiceDeliveryEmail({
      organizationName: invoice.organization.name,
      customerDisplayName: invoice.customer.displayName ?? invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      transactionTotal: String(invoice.transactionTotal ?? invoice.total),
      transactionBalanceDue: String(invoice.transactionBalanceDue ?? invoice.balanceDue),
      dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
      message: dto.message?.trim() || undefined,
    });
    const subject = dto.subject?.trim() || template.subject;
    if (subject.length > 200 || /[\r\n]/.test(subject)) {
      throw new BadRequestException("Invoice email subject must be 200 characters or fewer and cannot contain line breaks.");
    }

    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      salesInvoiceId: invoice.id,
      sourceType: "SalesInvoice",
      sourceId: invoice.id,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      idempotencyKey: dto.idempotencyKey,
      requestId,
      replayedAuditEvent: AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_REPLAYED,
    });
    if (replay) {
      return { ...replay, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
    }

    const archived = await this.salesInvoiceService.pdf(organizationId, actorUserId, invoice.id);
    if (!archived.document || typeof archived.document !== "object") {
      throw new BadRequestException("Invoice PDF could not be archived for email delivery.");
    }

    const document = archived.document as {
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      contentHash: string;
    };
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      salesInvoiceId: invoice.id,
      sourceType: "SalesInvoice",
      sourceId: invoice.id,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.SALES_INVOICE,
      idempotencyKey: dto.idempotencyKey,
      generatedDocument: {
        id: document.id,
        filename: document.filename,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        contentHash: document.contentHash,
      },
      requestId,
      auditEvent: AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_QUEUED,
      replayedAuditEvent: AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_REPLAYED,
      blockedAuditEvent: AUDIT_EVENTS.SALES_INVOICE_EMAIL_DELIVERY_BLOCKED,
    });

    return { ...queued, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
  }

  async history(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({ where: { id: invoiceId, organizationId }, select: { id: true } });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }
    return this.documentDeliveryService.listHistory(organizationId, "SalesInvoice", invoiceId);
  }
}

function normalizeRecipient(value?: string | null): string {
  const recipient = value?.trim().toLowerCase() ?? "";
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new BadRequestException("A valid recipient email is required for invoice delivery.");
  }
  return recipient;
}
