import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentType, EmailTemplateType, SupplierPaymentStatus } from "@prisma/client";
import { AUDIT_EVENTS } from "../audit-log/audit-events";
import { CreateSupplierDocumentEmailDeliveryDto } from "../email/dto/create-supplier-document-email-delivery.dto";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { buildSupplierPaymentRemittanceDeliveryEmail } from "../email/email-templates";
import { PrismaService } from "../prisma/prisma.service";
import { SupplierPaymentService } from "./supplier-payment.service";

@Injectable()
export class SupplierPaymentEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierPaymentService: SupplierPaymentService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(
    organizationId: string,
    actorUserId: string,
    paymentId: string,
    dto: CreateSupplierDocumentEmailDeliveryDto,
    requestId?: string,
  ): Promise<DocumentDeliveryQueueResult & { paymentId: string; paymentNumber: string }> {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id: paymentId, organizationId },
      select: { id: true, paymentNumber: true, status: true },
    });
    if (!payment) {
      throw new NotFoundException("Supplier payment not found.");
    }
    if (payment.status !== SupplierPaymentStatus.POSTED) {
      throw new BadRequestException("Only posted supplier payments can be sent by email.");
    }

    const data = await this.supplierPaymentService.receiptPdfData(organizationId, paymentId);
    const recipientEmail = normalizeRecipient(dto.recipientEmail ?? data.supplier.email);
    const template = buildSupplierPaymentRemittanceDeliveryEmail({
      organizationName: data.organization.name,
      supplierDisplayName: data.supplier.displayName ?? data.supplier.name,
      paymentNumber: data.payment.paymentNumber,
      currency: data.payment.currency,
      transactionAmountPaid: data.payment.amountPaid,
      paymentDate: formatDate(data.payment.paymentDate),
      safeDescription: safeDescription(data.payment.description),
      message: dto.message?.trim() || undefined,
    });
    const subject = dto.subject?.trim() || template.subject;
    assertSubject(subject);
    const requestContext = { status: payment.status };

    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "SupplierPayment",
      sourceId: payment.id,
      sourceNumber: payment.paymentNumber,
      documentType: DocumentType.SUPPLIER_PAYMENT_RECEIPT,
      templateType: EmailTemplateType.SUPPLIER_PAYMENT_REMITTANCE,
      requestContext,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      idempotencyKey: dto.idempotencyKey,
      requestId,
      replayedAuditEvent: "SUPPLIER_PAYMENT_EMAIL_DELIVERY_REPLAYED",
    });
    if (replay) {
      return { ...replay, paymentId: payment.id, paymentNumber: payment.paymentNumber };
    }

    const archived = await this.supplierPaymentService.receiptPdf(organizationId, actorUserId, paymentId);
    if (!archived.document || typeof archived.document !== "object") {
      throw new BadRequestException("Supplier payment receipt PDF could not be archived for email delivery.");
    }
    const document = archived.document as { id: string; filename: string; mimeType: string; sizeBytes: number; contentHash: string };
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      sourceType: "SupplierPayment",
      sourceId: payment.id,
      sourceNumber: payment.paymentNumber,
      documentType: DocumentType.SUPPLIER_PAYMENT_RECEIPT,
      requestContext,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.SUPPLIER_PAYMENT_REMITTANCE,
      idempotencyKey: dto.idempotencyKey,
      generatedDocument: { id: document.id, filename: document.filename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, contentHash: document.contentHash },
      requestId,
      auditEvent: AUDIT_EVENTS.EMAIL_OUTBOX_CREATED,
      replayedAuditEvent: "SUPPLIER_PAYMENT_EMAIL_DELIVERY_REPLAYED",
      blockedAuditEvent: "SUPPLIER_PAYMENT_EMAIL_DELIVERY_BLOCKED",
    });
    return { ...queued, paymentId: payment.id, paymentNumber: payment.paymentNumber };
  }

  async history(organizationId: string, paymentId: string) {
    const payment = await this.prisma.supplierPayment.findFirst({ where: { id: paymentId, organizationId }, select: { id: true } });
    if (!payment) {
      throw new NotFoundException("Supplier payment not found.");
    }
    return this.documentDeliveryService.listHistory(organizationId, "SupplierPayment", paymentId);
  }
}

function normalizeRecipient(value?: string | null): string {
  const recipient = value?.trim().toLowerCase() ?? "";
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new BadRequestException("A valid recipient email is required for supplier payment delivery.");
  }
  return recipient;
}

function safeDescription(value?: string | null): string | null {
  const description = value?.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return description ? description.slice(0, 500) : null;
}

function assertSubject(subject: string): void {
  if (subject.length > 200 || /[\r\n]/.test(subject)) {
    throw new BadRequestException("Supplier payment email subject must be 200 characters or fewer and cannot contain line breaks.");
  }
}

function formatDate(value?: Date | string | null): string {
  if (!value) return "Not specified";
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}
