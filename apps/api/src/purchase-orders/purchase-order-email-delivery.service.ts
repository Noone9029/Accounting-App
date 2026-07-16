import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentType, EmailTemplateType, PurchaseOrderStatus } from "@prisma/client";
import { AUDIT_EVENTS } from "../audit-log/audit-events";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { buildPurchaseOrderDeliveryEmail } from "../email/email-templates";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSupplierDocumentEmailDeliveryDto } from "../email/dto/create-supplier-document-email-delivery.dto";
import { PurchaseOrderService } from "./purchase-order.service";

const SENDABLE_STATUSES = new Set<PurchaseOrderStatus>([PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.SENT]);

@Injectable()
export class PurchaseOrderEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(
    organizationId: string,
    actorUserId: string,
    purchaseOrderId: string,
    dto: CreateSupplierDocumentEmailDeliveryDto,
    requestId?: string,
  ): Promise<DocumentDeliveryQueueResult & { purchaseOrderId: string; purchaseOrderNumber: string }> {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      select: {
        id: true,
        purchaseOrderNumber: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Purchase order not found.");
    }
    if (!SENDABLE_STATUSES.has(order.status)) {
      throw new BadRequestException("Only approved or sent purchase orders can be sent by email.");
    }

    const data = await this.purchaseOrderService.pdfData(organizationId, purchaseOrderId);
    const recipientEmail = normalizeRecipient(dto.recipientEmail ?? data.supplier.email);
    const template = buildPurchaseOrderDeliveryEmail({
      organizationName: data.organization.name,
      supplierDisplayName: data.supplier.displayName ?? data.supplier.name,
      purchaseOrderNumber: data.purchaseOrder.purchaseOrderNumber,
      currency: data.purchaseOrder.currency,
      total: data.purchaseOrder.total,
      orderDate: formatDate(data.purchaseOrder.orderDate),
      expectedDeliveryDate: formatDate(data.purchaseOrder.expectedDeliveryDate),
      message: dto.message?.trim() || undefined,
    });
    const subject = dto.subject?.trim() || template.subject;
    assertSubject(subject);
    const requestContext = { status: order.status };

    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "PurchaseOrder",
      sourceId: order.id,
      sourceNumber: order.purchaseOrderNumber,
      documentType: DocumentType.PURCHASE_ORDER,
      templateType: EmailTemplateType.PURCHASE_ORDER,
      requestContext,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      idempotencyKey: dto.idempotencyKey,
      requestId,
      replayedAuditEvent: "PURCHASE_ORDER_EMAIL_DELIVERY_REPLAYED",
    });
    if (replay) {
      return { ...replay, purchaseOrderId: order.id, purchaseOrderNumber: order.purchaseOrderNumber };
    }

    const archived = await this.purchaseOrderService.pdf(organizationId, actorUserId, purchaseOrderId);
    if (!archived.document || typeof archived.document !== "object") {
      throw new BadRequestException("Purchase order PDF could not be archived for email delivery.");
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
      sourceType: "PurchaseOrder",
      sourceId: order.id,
      sourceNumber: order.purchaseOrderNumber,
      documentType: DocumentType.PURCHASE_ORDER,
      requestContext,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.PURCHASE_ORDER,
      idempotencyKey: dto.idempotencyKey,
      generatedDocument: {
        id: document.id,
        filename: document.filename,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        contentHash: document.contentHash,
      },
      requestId,
      auditEvent: AUDIT_EVENTS.EMAIL_OUTBOX_CREATED,
      replayedAuditEvent: "PURCHASE_ORDER_EMAIL_DELIVERY_REPLAYED",
      blockedAuditEvent: "PURCHASE_ORDER_EMAIL_DELIVERY_BLOCKED",
    });

    return { ...queued, purchaseOrderId: order.id, purchaseOrderNumber: order.purchaseOrderNumber };
  }

  async history(organizationId: string, purchaseOrderId: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException("Purchase order not found.");
    }
    return this.documentDeliveryService.listHistory(organizationId, "PurchaseOrder", purchaseOrderId);
  }
}

function normalizeRecipient(value?: string | null): string {
  const recipient = value?.trim().toLowerCase() ?? "";
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new BadRequestException("A valid recipient email is required for purchase order delivery.");
  }
  return recipient;
}

function assertSubject(subject: string): void {
  if (subject.length > 200 || /[\r\n]/.test(subject)) {
    throw new BadRequestException("Purchase order email subject must be 200 characters or fewer and cannot contain line breaks.");
  }
}

function formatDate(value?: Date | string | null): string {
  if (!value) {
    return "Not specified";
  }
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}
