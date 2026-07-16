import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ContactType, DocumentType, EmailTemplateType } from "@prisma/client";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { normalizeCustomerDocumentMessage, normalizeCustomerDocumentRecipient, normalizeCustomerDocumentSubject } from "../email/customer-document-email-delivery.validation";
import { buildSupplierStatementDeliveryEmail } from "../email/email-templates";
import { PrismaService } from "../prisma/prisma.service";
import { ContactLedgerService, supplierStatementSourceId } from "./contact-ledger.service";
import { CreateSupplierStatementEmailDeliveryDto } from "./dto/create-supplier-statement-email-delivery.dto";

@Injectable()
export class SupplierStatementEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactLedgerService: ContactLedgerService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(
    organizationId: string,
    actorUserId: string,
    contactId: string,
    dto: CreateSupplierStatementEmailDeliveryDto,
    requestId?: string,
  ): Promise<DocumentDeliveryQueueResult & { contactId: string }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId, type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      select: { id: true, name: true, displayName: true, email: true, type: true },
    });
    if (!contact) throw new NotFoundException("Supplier contact not found.");

    const bounds = normalizeStatementBounds(dto.from, dto.to, dto.asOf);
    const recipientEmail = normalizeCustomerDocumentRecipient(dto.recipientEmail ?? contact.email, "supplier statement");
    const statementData = await this.contactLedgerService.supplierStatementPdfData(organizationId, contactId, bounds.from, bounds.to);
    const periodFrom = statementData.periodFrom ?? bounds.from ?? "start";
    const periodTo = statementData.periodTo ?? bounds.to;
    const template = buildSupplierStatementDeliveryEmail({
      organizationName: statementData.organization.name,
      supplierDisplayName: contact.displayName ?? contact.name,
      periodLabel: `${periodFrom} to ${periodTo}`,
      asOf: bounds.asOf,
      currency: statementData.currency ?? null,
      closingBalance: statementData.closingBalance,
      message: normalizeCustomerDocumentMessage(dto.message),
    });
    const subject = normalizeCustomerDocumentSubject(dto.subject, template.subject, "supplier statement");
    const sourceId = supplierStatementSourceId(contactId, statementData);
    const sourceNumber = supplierStatementDocumentNumber(contact.displayName ?? contact.name, bounds.from, bounds.to);
    const requestContext = { from: bounds.from ?? null, to: bounds.to, asOf: bounds.asOf };

    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "SupplierStatement",
      sourceId,
      sourceNumber,
      documentType: DocumentType.SUPPLIER_STATEMENT,
      templateType: EmailTemplateType.SUPPLIER_STATEMENT,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      requestContext,
      idempotencyKey: dto.idempotencyKey,
      requestId,
    });
    if (replay) return { ...replay, contactId };

    const statement = await this.contactLedgerService.supplierStatementPdf(organizationId, actorUserId, contactId, bounds.from, bounds.to, statementData);
    const document = asDocument(statement.document, "Supplier statement PDF could not be archived for email delivery.");
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      sourceType: "SupplierStatement",
      sourceId,
      sourceNumber,
      documentType: DocumentType.SUPPLIER_STATEMENT,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.SUPPLIER_STATEMENT,
      idempotencyKey: dto.idempotencyKey,
      requestContext,
      generatedDocument: document,
      requestId,
    });
    return { ...queued, contactId };
  }

  async history(organizationId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId, type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      select: { id: true },
    });
    if (!contact) throw new NotFoundException("Supplier contact not found.");
    return this.documentDeliveryService.listHistoryBySourcePrefix(organizationId, "SupplierStatement", `supplier-statement:${contactId}`);
  }
}

function normalizeStatementBounds(from: string | undefined, to: string | undefined, asOf: string | undefined) {
  if (!asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !isValidDate(asOf)) throw new BadRequestException("A valid statement as-of date is required.");
  if (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !isValidDate(from))) throw new BadRequestException("Statement from must be a valid YYYY-MM-DD date.");
  if (to && (!/^\d{4}-\d{2}-\d{2}$/.test(to) || !isValidDate(to))) throw new BadRequestException("Statement to must be a valid YYYY-MM-DD date.");
  if (to && to !== asOf) throw new BadRequestException("Statement to must match asOf when both are provided.");
  if (from && from > asOf) throw new BadRequestException("Statement from cannot be after asOf.");
  return { from, to: to ?? asOf, asOf };
}

function isValidDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function supplierStatementDocumentNumber(name: string, from: string | undefined, to: string) {
  return `Supplier Statement ${name} (${from ?? "start"} to ${to})`;
}

function asDocument(value: unknown, message: string) {
  if (!value || typeof value !== "object") throw new BadRequestException(message);
  const document = value as Partial<{ id: string; filename: string; mimeType: string; sizeBytes: number; contentHash: string }>;
  if (!document.id || !document.filename || !document.mimeType || document.sizeBytes == null || !document.contentHash) throw new BadRequestException(message);
  return { id: document.id, filename: document.filename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, contentHash: document.contentHash };
}
