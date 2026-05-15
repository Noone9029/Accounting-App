import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import { AttachmentLinkedEntityType, AttachmentStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { AttachmentStorageService } from "./attachment-storage.service";
import { AttachmentQueryDto } from "./dto/attachment-query.dto";
import { CreateAttachmentDto } from "./dto/create-attachment.dto";
import { UpdateAttachmentDto } from "./dto/update-attachment.dto";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const attachmentPublicSelect = {
  id: true,
  organizationId: true,
  linkedEntityType: true,
  linkedEntityId: true,
  filename: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  storageProvider: true,
  storageKey: true,
  contentHash: true,
  status: true,
  uploadedById: true,
  uploadedAt: true,
  deletedById: true,
  deletedAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: { select: { id: true, name: true, email: true } },
  deletedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AttachmentSelect;

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AttachmentStorageService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
  ) {}

  list(organizationId: string, query: AttachmentQueryDto = {}) {
    return this.prisma.attachment.findMany({
      where: {
        organizationId,
        linkedEntityType: query.linkedEntityType,
        linkedEntityId: query.linkedEntityId,
        status: query.status ?? AttachmentStatus.ACTIVE,
      },
      orderBy: { uploadedAt: "desc" },
      select: attachmentPublicSelect,
    });
  }

  async get(organizationId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, organizationId },
      select: attachmentPublicSelect,
    });
    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }
    return attachment;
  }

  async upload(organizationId: string, actorUserId: string, dto: CreateAttachmentDto) {
    await this.assertLinkedEntityBelongsToOrganization(organizationId, dto.linkedEntityType, dto.linkedEntityId);
    const originalFilename = dto.filename?.trim();
    if (!originalFilename) {
      throw new BadRequestException("Attachment filename is required.");
    }
    const filename = sanitizeAttachmentFilename(originalFilename);
    const mimeType = dto.mimeType.trim().toLowerCase();
    if (!allowedMimeTypes.has(mimeType)) {
      throw new BadRequestException("Unsupported attachment file type.");
    }
    const buffer = decodeBase64Content(dto.contentBase64);
    if (buffer.byteLength === 0) {
      throw new BadRequestException("Attachment file cannot be empty.");
    }
    const maxBytes = this.maxSizeBytes();
    if (buffer.byteLength > maxBytes) {
      throw new BadRequestException(`Attachment file exceeds the ${this.maxSizeMb()} MB limit.`);
    }
    const contentHash = createHash("sha256").update(buffer).digest("hex");
    const attachmentId = randomUUID();
    const stored = await this.storage.save({ buffer, filename, contentHash, organizationId, attachmentId, mimeType });
    const created = await this.prisma.attachment.create({
      data: {
        id: attachmentId,
        organizationId,
        linkedEntityType: dto.linkedEntityType,
        linkedEntityId: dto.linkedEntityId,
        filename,
        originalFilename,
        mimeType,
        sizeBytes: buffer.byteLength,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey ?? null,
        contentBase64: stored.contentBase64 ?? null,
        contentHash,
        uploadedById: actorUserId,
        notes: cleanOptional(dto.notes),
      },
      select: attachmentPublicSelect,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPLOAD",
      entityType: "Attachment",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateAttachmentDto) {
    const existing = await this.get(organizationId, id);
    if (existing.status === AttachmentStatus.DELETED) {
      throw new BadRequestException("Deleted attachments cannot be updated.");
    }
    const updated = await this.prisma.attachment.update({
      where: { id },
      data: { notes: cleanOptional(dto.notes) },
      select: attachmentPublicSelect,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Attachment",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async softDelete(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === AttachmentStatus.DELETED) {
      throw new BadRequestException("Attachment is already deleted.");
    }
    const deleted = await this.prisma.attachment.update({
      where: { id },
      data: {
        status: AttachmentStatus.DELETED,
        deletedById: actorUserId,
        deletedAt: new Date(),
      },
      select: attachmentPublicSelect,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "DELETE",
      entityType: "Attachment",
      entityId: id,
      before: existing,
      after: deleted,
    });
    return deleted;
  }

  async download(organizationId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        status: true,
        storageProvider: true,
        storageKey: true,
        contentBase64: true,
      },
    });
    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }
    if (attachment.status === AttachmentStatus.DELETED) {
      throw new NotFoundException("Attachment not found.");
    }
    const buffer = await this.storage.read(attachment);
    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      buffer,
    };
  }

  async assertLinkedEntityBelongsToOrganization(
    organizationId: string,
    linkedEntityType: AttachmentLinkedEntityType,
    linkedEntityId: string,
  ): Promise<void> {
    const found = await this.findLinkedEntity(organizationId, linkedEntityType, linkedEntityId);
    if (!found) {
      throw new BadRequestException("Linked entity was not found in this organization or is not supported for attachments.");
    }
  }

  private async findLinkedEntity(organizationId: string, linkedEntityType: AttachmentLinkedEntityType, linkedEntityId: string) {
    const where = { id: linkedEntityId, organizationId };
    switch (linkedEntityType) {
      case AttachmentLinkedEntityType.SALES_INVOICE:
        return this.prisma.salesInvoice.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.CUSTOMER_PAYMENT:
        return this.prisma.customerPayment.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.CREDIT_NOTE:
        return this.prisma.creditNote.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.CUSTOMER_REFUND:
        return this.prisma.customerRefund.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.PURCHASE_BILL:
        return this.prisma.purchaseBill.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.SUPPLIER_PAYMENT:
        return this.prisma.supplierPayment.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.PURCHASE_DEBIT_NOTE:
        return this.prisma.purchaseDebitNote.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.SUPPLIER_REFUND:
        return this.prisma.supplierRefund.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.PURCHASE_ORDER:
        return this.prisma.purchaseOrder.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.CASH_EXPENSE:
        return this.prisma.cashExpense.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.BANK_STATEMENT_IMPORT:
        return this.prisma.bankStatementImport.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.BANK_STATEMENT_TRANSACTION:
        return this.prisma.bankStatementTransaction.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.BANK_RECONCILIATION:
        return this.prisma.bankReconciliation.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.PURCHASE_RECEIPT:
        return this.prisma.purchaseReceipt.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.SALES_STOCK_ISSUE:
        return this.prisma.salesStockIssue.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.INVENTORY_ADJUSTMENT:
        return this.prisma.inventoryAdjustment.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.WAREHOUSE_TRANSFER:
        return this.prisma.warehouseTransfer.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.INVENTORY_VARIANCE_PROPOSAL:
        return this.prisma.inventoryVarianceProposal.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.CONTACT:
        return this.prisma.contact.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.ITEM:
        return this.prisma.item.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.MANUAL_JOURNAL:
        return this.prisma.journalEntry.findFirst({ where, select: { id: true } });
      case AttachmentLinkedEntityType.OTHER:
        throw new BadRequestException("OTHER attachments are not supported until a concrete linked entity is selected.");
    }
  }

  private maxSizeMb(): number {
    const raw = Number(this.configService.get<string>("ATTACHMENT_MAX_SIZE_MB") ?? "10");
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  }

  private maxSizeBytes(): number {
    return Math.floor(this.maxSizeMb() * 1024 * 1024);
  }
}

export function sanitizeAttachmentFilename(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned || "attachment";
}

function cleanOptional(value?: string | null): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function decodeBase64Content(value: string): Buffer {
  const trimmed = value.trim();
  const raw = trimmed.includes(",") ? (trimmed.split(",").pop() ?? "") : trimmed;
  const normalized = raw.replace(/\s+/g, "");
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new BadRequestException("Attachment contentBase64 must be valid base64.");
  }
  const buffer = Buffer.from(normalized, "base64");
  const reencoded = buffer.toString("base64").replace(/=+$/, "");
  if (reencoded !== normalized.replace(/=+$/, "")) {
    throw new BadRequestException("Attachment contentBase64 must be valid base64.");
  }
  return buffer;
}
