import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CustomerPaymentStatus, DocumentType, EmailTemplateType } from "@prisma/client";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { normalizeCustomerDocumentMessage, normalizeCustomerDocumentRecipient, normalizeCustomerDocumentSubject } from "../email/customer-document-email-delivery.validation";
import { buildCustomerPaymentReceiptDeliveryEmail } from "../email/email-templates";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerPaymentEmailDeliveryDto } from "./dto/create-customer-payment-email-delivery.dto";
import { CustomerPaymentService } from "./customer-payment.service";

@Injectable()
export class CustomerPaymentEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerPaymentService: CustomerPaymentService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(organizationId: string, actorUserId: string, paymentId: string, dto: CreateCustomerPaymentEmailDeliveryDto, requestId?: string): Promise<DocumentDeliveryQueueResult & { paymentNumber: string }> {
    const payment = await this.prisma.customerPayment.findFirst({
      where: { id: paymentId, organizationId },
      select: {
        id: true,
        organizationId: true,
        paymentNumber: true,
        status: true,
        paymentDate: true,
        currency: true,
        amountReceived: true,
        description: true,
        customer: { select: { name: true, displayName: true, email: true } },
        organization: { select: { name: true } },
      },
    });
    if (!payment) throw new NotFoundException("Customer payment not found.");
    if (payment.status !== CustomerPaymentStatus.POSTED) {
      throw new BadRequestException("Only posted customer payments can be sent by email.");
    }

    const recipientEmail = normalizeCustomerDocumentRecipient(dto.recipientEmail ?? payment.customer.email, "payment receipt");
    const template = buildCustomerPaymentReceiptDeliveryEmail({
      organizationName: payment.organization.name,
      customerDisplayName: payment.customer.displayName ?? payment.customer.name,
      paymentNumber: payment.paymentNumber,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      currency: payment.currency,
      amountReceived: String(payment.amountReceived),
      reference: payment.description?.trim() || null,
      message: normalizeCustomerDocumentMessage(dto.message),
    });
    const subject = normalizeCustomerDocumentSubject(dto.subject, template.subject, "payment receipt");
    const requestContext = { reference: payment.description?.trim() || null };
    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "CustomerPayment",
      sourceId: payment.id,
      sourceNumber: payment.paymentNumber,
      documentType: DocumentType.CUSTOMER_PAYMENT_RECEIPT,
      templateType: EmailTemplateType.PAYMENT_RECEIPT,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      requestContext,
      idempotencyKey: dto.idempotencyKey,
      requestId,
    });
    if (replay) return { ...replay, paymentNumber: payment.paymentNumber };

    const archived = await this.customerPaymentService.receiptPdf(organizationId, actorUserId, payment.id);
    const document = asDocument(archived.document, "Payment receipt PDF could not be archived for email delivery.");
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      sourceType: "CustomerPayment",
      sourceId: payment.id,
      sourceNumber: payment.paymentNumber,
      documentType: DocumentType.CUSTOMER_PAYMENT_RECEIPT,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.PAYMENT_RECEIPT,
      idempotencyKey: dto.idempotencyKey,
      requestContext,
      generatedDocument: document,
      requestId,
    });
    return { ...queued, paymentNumber: payment.paymentNumber };
  }

  async history(organizationId: string, paymentId: string) {
    const payment = await this.prisma.customerPayment.findFirst({ where: { id: paymentId, organizationId }, select: { id: true } });
    if (!payment) throw new NotFoundException("Customer payment not found.");
    return this.documentDeliveryService.listHistory(organizationId, "CustomerPayment", paymentId);
  }
}

function asDocument(value: unknown, message: string) {
  if (!value || typeof value !== "object") throw new BadRequestException(message);
  const document = value as Partial<{ id: string; filename: string; mimeType: string; sizeBytes: number; contentHash: string }>;
  if (!document.id || !document.filename || !document.mimeType || document.sizeBytes == null || !document.contentHash) throw new BadRequestException(message);
  return { id: document.id, filename: document.filename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, contentHash: document.contentHash };
}
