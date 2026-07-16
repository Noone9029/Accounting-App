import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ContactType, DocumentType, EmailTemplateType } from "@prisma/client";
import { DocumentDeliveryService, type DocumentDeliveryQueueResult } from "../email/document-delivery.service";
import { normalizeCustomerDocumentMessage, normalizeCustomerDocumentRecipient, normalizeCustomerDocumentSubject } from "../email/customer-document-email-delivery.validation";
import { buildCustomerStatementDeliveryEmail } from "../email/email-templates";
import { PrismaService } from "../prisma/prisma.service";
import { ContactLedgerService, customerStatementSourceId } from "./contact-ledger.service";
import { CreateCustomerStatementEmailDeliveryDto } from "./dto/create-customer-statement-email-delivery.dto";

@Injectable()
export class CustomerStatementEmailDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contactLedgerService: ContactLedgerService,
    private readonly documentDeliveryService: DocumentDeliveryService,
    private readonly config: ConfigService,
  ) {}

  async queue(organizationId: string, actorUserId: string, contactId: string, dto: CreateCustomerStatementEmailDeliveryDto, requestId?: string): Promise<DocumentDeliveryQueueResult & { contactId: string }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId, type: { in: [ContactType.CUSTOMER, ContactType.BOTH] } },
      select: { id: true, name: true, displayName: true, email: true, type: true },
    });
    if (!contact) throw new NotFoundException("Customer contact not found.");

    const bounds = normalizeStatementBounds(dto.from, dto.to, dto.asOf);
    const recipientEmail = normalizeCustomerDocumentRecipient(dto.recipientEmail ?? contact.email, "customer statement");
    const statementData = await this.contactLedgerService.statementPdfData(organizationId, contactId, bounds.from, bounds.to);
    const template = buildCustomerStatementDeliveryEmail({
      organizationName: statementData.organization.name,
      customerDisplayName: contact.displayName ?? contact.name,
      periodFrom: statementData.periodFrom ?? "start",
      periodTo: statementData.periodTo ?? bounds.to,
      asOf: bounds.asOf,
      closingBalance: statementData.closingBalance,
      currency: statementData.currency ?? null,
      message: normalizeCustomerDocumentMessage(dto.message),
    });
    const subject = normalizeCustomerDocumentSubject(dto.subject, template.subject, "customer statement");
    const sourceId = customerStatementSourceId(contactId, statementData);
    const requestContext = { from: bounds.from ?? null, to: bounds.to, asOf: bounds.asOf };
    const replay = await this.documentDeliveryService.replayIfExisting({
      organizationId,
      actorUserId,
      sourceType: "CustomerStatement",
      sourceId,
      sourceNumber: statementDocumentNumber(contact.displayName ?? contact.name, bounds.from, bounds.to),
      documentType: DocumentType.CUSTOMER_STATEMENT,
      templateType: EmailTemplateType.CUSTOMER_STATEMENT,
      recipientEmail,
      subject,
      bodyText: template.bodyText,
      requestContext,
      idempotencyKey: dto.idempotencyKey,
      requestId,
    });
    if (replay) return { ...replay, contactId };

    const statement = await this.contactLedgerService.statementPdf(organizationId, actorUserId, contactId, bounds.from, bounds.to, statementData);
    const document = asDocument(statement.document, "Customer statement PDF could not be archived for email delivery.");
    const queued = await this.documentDeliveryService.queue({
      organizationId,
      actorUserId,
      sourceType: "CustomerStatement",
      sourceId,
      sourceNumber: statementDocumentNumber(contact.displayName ?? contact.name, bounds.from, bounds.to),
      documentType: DocumentType.CUSTOMER_STATEMENT,
      recipientEmail,
      fromEmail: this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local",
      subject,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
      templateType: EmailTemplateType.CUSTOMER_STATEMENT,
      idempotencyKey: dto.idempotencyKey,
      requestContext,
      generatedDocument: document,
      requestId,
    });
    return { ...queued, contactId };
  }

  async history(organizationId: string, contactId: string, from: string | undefined = "2026-07-01", to: string | undefined = "2026-07-31") {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, organizationId, type: { in: [ContactType.CUSTOMER, ContactType.BOTH] } }, select: { id: true, name: true, displayName: true } });
    if (!contact) throw new NotFoundException("Customer contact not found.");
    return this.documentDeliveryService.listHistoryBySourcePrefix(organizationId, "CustomerStatement", `customer-statement:${contactId}`);
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

function statementDocumentNumber(name: string, from: string | undefined, to: string) {
  return `Statement ${name} (${from ?? "start"} to ${to})`;
}

function asDocument(value: unknown, message: string) {
  if (!value || typeof value !== "object") throw new BadRequestException(message);
  const document = value as Partial<{ id: string; filename: string; mimeType: string; sizeBytes: number; contentHash: string }>;
  if (!document.id || !document.filename || !document.mimeType || document.sizeBytes == null || !document.contentHash) throw new BadRequestException(message);
  return { id: document.id, filename: document.filename, mimeType: document.mimeType, sizeBytes: document.sizeBytes, contentHash: document.contentHash };
}
