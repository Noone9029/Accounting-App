import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryNotePdfData, renderDeliveryNotePdf } from "@ledgerbyte/pdf-core";
import {
  ContactType,
  DeliveryNoteStatus,
  DocumentType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
  SalesQuoteStatus,
  SalesStockIssueStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDeliveryNoteDto } from "./dto/create-delivery-note.dto";
import { DeliveryNoteLineDto } from "./dto/delivery-note-line.dto";
import { UpdateDeliveryNoteDto } from "./dto/update-delivery-note.dto";

const deliveryNoteInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true, isActive: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  relatedSalesInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true } },
  relatedSalesQuote: { select: { id: true, quoteNumber: true, status: true, issueDate: true, total: true } },
  relatedSalesStockIssue: { select: { id: true, issueNumber: true, status: true, issueDate: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true, type: true, status: true } },
      sourceSalesInvoiceLine: { select: { id: true, description: true, quantity: true, itemId: true } },
      sourceSalesQuoteLine: { select: { id: true, description: true, quantity: true, itemId: true } },
      sourceSalesStockIssueLine: { select: { id: true, quantity: true, itemId: true } },
    },
  },
};

interface SourceReferences {
  relatedSalesInvoiceId?: string;
  relatedSalesQuoteId?: string;
  relatedSalesStockIssueId?: string;
}

interface PreparedLine {
  itemId?: string;
  description: string;
  quantity: string;
  unitOfMeasure?: string;
  sourceSalesInvoiceLineId?: string;
  sourceSalesQuoteLineId?: string;
  sourceSalesStockIssueLineId?: string;
  sortOrder: number;
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class DeliveryNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  list(organizationId: string, filters: { status?: string; customerId?: string } = {}) {
    const where: Prisma.DeliveryNoteWhereInput = { organizationId };
    if (filters.status) {
      where.status = this.cleanStatus(filters.status);
    }
    const customerId = this.cleanOptional(filters.customerId);
    if (customerId) {
      where.customerId = customerId;
    }

    return this.prisma.deliveryNote.findMany({
      where,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        relatedSalesInvoice: { select: { id: true, invoiceNumber: true, status: true } },
        relatedSalesQuote: { select: { id: true, quoteNumber: true, status: true } },
        relatedSalesStockIssue: { select: { id: true, issueNumber: true, status: true } },
        _count: { select: { lines: true } },
      },
    });
  }

  async nextNumberPreview(organizationId: string) {
    const preview = await this.numberSequenceService.preview(organizationId, NumberSequenceScope.DELIVERY_NOTE);
    return {
      ...preview,
      deliveryNoteNumber: preview.exampleNextNumber,
      editable: false,
      overrideAllowed: false,
      policy: "SEQUENCE_ASSIGNED_ON_CREATE",
      helperText: "Preview only. The delivery note number is assigned from the delivery note sequence when the draft is saved.",
    };
  }

  async get(organizationId: string, id: string) {
    const deliveryNote = await this.prisma.deliveryNote.findFirst({
      where: { id, organizationId },
      include: deliveryNoteInclude,
    });

    if (!deliveryNote) {
      throw new NotFoundException("Delivery note not found.");
    }
    return deliveryNote;
  }

  async pdfData(organizationId: string, id: string): Promise<DeliveryNotePdfData> {
    const deliveryNote = await this.prisma.deliveryNote.findFirst({
      where: { id, organizationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxNumber: true,
            countryCode: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            displayName: true,
            taxNumber: true,
            email: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            postalCode: true,
            countryCode: true,
          },
        },
        relatedSalesInvoice: { select: { id: true, invoiceNumber: true, status: true } },
        relatedSalesQuote: { select: { id: true, quoteNumber: true, status: true } },
        relatedSalesStockIssue: { select: { id: true, issueNumber: true, status: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            item: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    if (!deliveryNote) {
      throw new NotFoundException("Delivery note not found.");
    }

    return {
      organization: deliveryNote.organization,
      customer: deliveryNote.customer,
      deliveryNote: {
        id: deliveryNote.id,
        deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
        status: deliveryNote.status,
        issueDate: deliveryNote.issueDate,
        deliveryDate: deliveryNote.deliveryDate,
        reference: deliveryNote.reference,
        deliveryAddress: deliveryNote.deliveryAddress,
        notes: deliveryNote.notes,
        instructions: deliveryNote.instructions,
        relatedSalesInvoice: deliveryNote.relatedSalesInvoice,
        relatedSalesQuote: deliveryNote.relatedSalesQuote,
        relatedSalesStockIssue: deliveryNote.relatedSalesStockIssue,
      },
      lines: deliveryNote.lines.map((line) => ({
        itemName: line.item?.name ?? null,
        itemSku: line.item?.sku ?? null,
        description: line.description,
        quantity: moneyString(line.quantity),
        unitOfMeasure: line.unitOfMeasure,
      })),
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: DeliveryNotePdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.invoiceRenderSettings(organizationId);
    const buffer = await renderDeliveryNotePdf(data, { ...settings, title: "Delivery Note" });
    const filename = sanitizeFilename(`delivery-note-${data.deliveryNote.deliveryNoteNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.DELIVERY_NOTE,
      sourceType: "DeliveryNote",
      sourceId: data.deliveryNote.id,
      documentNumber: data.deliveryNote.deliveryNoteNumber,
      filename,
      buffer,
      generatedById: actorUserId,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "GENERATE_PDF",
      entityType: "DeliveryNote",
      entityId: data.deliveryNote.id,
      after: {
        id: data.deliveryNote.id,
        deliveryNoteNumber: data.deliveryNote.deliveryNoteNumber,
        status: data.deliveryNote.status,
        customerId: data.customer.id ?? null,
        relatedSalesInvoiceId: data.deliveryNote.relatedSalesInvoice?.id ?? null,
        relatedSalesQuoteId: data.deliveryNote.relatedSalesQuote?.id ?? null,
        relatedSalesStockIssueId: data.deliveryNote.relatedSalesStockIssue?.id ?? null,
        generatedDocumentId: (document as { id?: string } | null | undefined)?.id ?? null,
        filename,
        contentType: "application/pdf",
      },
    });

    return { data, buffer, filename, document: document ?? null };
  }

  async generatePdf(organizationId: string, actorUserId: string, id: string) {
    const { document } = await this.pdf(organizationId, actorUserId, id);
    return document;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateDeliveryNoteDto) {
    const sources = this.sourceReferences(dto);
    await this.validateHeaderReferences(organizationId, dto.customerId, dto.branchId ?? undefined, sources);
    this.assertDeliveryDate(dto.issueDate, dto.deliveryDate ?? undefined);
    const lines = await this.prepareLines(organizationId, dto.customerId, dto.lines, sources);

    try {
      const deliveryNote = await this.prisma.$transaction(async (tx) => {
        const deliveryNoteNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.DELIVERY_NOTE, tx);
        return tx.deliveryNote.create({
          data: {
            organizationId,
            deliveryNoteNumber,
            customerId: dto.customerId,
            branchId: this.cleanOptional(dto.branchId ?? undefined),
            issueDate: new Date(dto.issueDate),
            deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
            reference: this.cleanOptional(dto.reference ?? undefined),
            relatedSalesInvoiceId: sources.relatedSalesInvoiceId,
            relatedSalesQuoteId: sources.relatedSalesQuoteId,
            relatedSalesStockIssueId: sources.relatedSalesStockIssueId,
            deliveryAddress: this.cleanOptional(dto.deliveryAddress ?? undefined),
            notes: this.cleanOptional(dto.notes ?? undefined),
            instructions: this.cleanOptional(dto.instructions ?? undefined),
            createdById: actorUserId,
            lines: { create: this.toLineCreateMany(organizationId, lines) },
          },
          include: deliveryNoteInclude,
        });
      });

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "CREATE",
        entityType: "DeliveryNote",
        entityId: deliveryNote.id,
        after: this.auditSnapshot(deliveryNote),
      });
      return deliveryNote;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Delivery note number already exists for this organization.");
      }
      throw error;
    }
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateDeliveryNoteDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    const nextCustomerId = dto.customerId ?? existing.customerId;
    const nextBranchId = Object.prototype.hasOwnProperty.call(dto, "branchId")
      ? this.cleanOptional(dto.branchId ?? undefined)
      : existing.branchId ?? undefined;
    const sources = {
      relatedSalesInvoiceId: Object.prototype.hasOwnProperty.call(dto, "relatedSalesInvoiceId")
        ? this.cleanOptional(dto.relatedSalesInvoiceId ?? undefined)
        : existing.relatedSalesInvoiceId ?? undefined,
      relatedSalesQuoteId: Object.prototype.hasOwnProperty.call(dto, "relatedSalesQuoteId")
        ? this.cleanOptional(dto.relatedSalesQuoteId ?? undefined)
        : existing.relatedSalesQuoteId ?? undefined,
      relatedSalesStockIssueId: Object.prototype.hasOwnProperty.call(dto, "relatedSalesStockIssueId")
        ? this.cleanOptional(dto.relatedSalesStockIssueId ?? undefined)
        : existing.relatedSalesStockIssueId ?? undefined,
    };

    await this.validateHeaderReferences(organizationId, nextCustomerId, nextBranchId, sources);
    const nextIssueDate = dto.issueDate ? new Date(dto.issueDate) : existing.issueDate;
    const nextDeliveryDate = Object.prototype.hasOwnProperty.call(dto, "deliveryDate")
      ? dto.deliveryDate
        ? new Date(dto.deliveryDate)
        : null
      : existing.deliveryDate;
    this.assertDeliveryDate(nextIssueDate, nextDeliveryDate);

    const nextLines =
      dto.lines ??
      existing.lines.map((line) => ({
        itemId: line.itemId,
        description: line.description,
        quantity: String(line.quantity),
        unitOfMeasure: line.unitOfMeasure,
        sourceSalesInvoiceLineId: line.sourceSalesInvoiceLineId,
        sourceSalesQuoteLineId: line.sourceSalesQuoteLineId,
        sourceSalesStockIssueLineId: line.sourceSalesStockIssueLineId,
        sortOrder: line.sortOrder,
      }));
    const lines = dto.lines ? await this.prepareLines(organizationId, nextCustomerId, nextLines, sources) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (lines) {
        await tx.deliveryNoteLine.deleteMany({ where: { organizationId, deliveryNoteId: id } });
      }
      return tx.deliveryNote.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          branchId: Object.prototype.hasOwnProperty.call(dto, "branchId") ? nextBranchId ?? null : undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          deliveryDate: Object.prototype.hasOwnProperty.call(dto, "deliveryDate") ? nextDeliveryDate : undefined,
          reference: dto.reference === undefined ? undefined : this.cleanOptional(dto.reference ?? undefined),
          relatedSalesInvoiceId: Object.prototype.hasOwnProperty.call(dto, "relatedSalesInvoiceId") ? sources.relatedSalesInvoiceId ?? null : undefined,
          relatedSalesQuoteId: Object.prototype.hasOwnProperty.call(dto, "relatedSalesQuoteId") ? sources.relatedSalesQuoteId ?? null : undefined,
          relatedSalesStockIssueId: Object.prototype.hasOwnProperty.call(dto, "relatedSalesStockIssueId") ? sources.relatedSalesStockIssueId ?? null : undefined,
          deliveryAddress: dto.deliveryAddress === undefined ? undefined : this.cleanOptional(dto.deliveryAddress ?? undefined),
          notes: dto.notes === undefined ? undefined : this.cleanOptional(dto.notes ?? undefined),
          instructions: dto.instructions === undefined ? undefined : this.cleanOptional(dto.instructions ?? undefined),
          lines: lines ? { create: this.toLineCreateMany(organizationId, lines) } : undefined,
        },
        include: deliveryNoteInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "DeliveryNote",
      entityId: id,
      before: this.auditSnapshot(existing),
      after: this.auditSnapshot(updated),
    });
    return updated;
  }

  async issue(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === DeliveryNoteStatus.ISSUED) {
      return existing;
    }
    if (existing.status !== DeliveryNoteStatus.DRAFT) {
      throw new BadRequestException("Only draft delivery notes can be issued.");
    }
    if (!existing.lines.length) {
      throw new BadRequestException("Delivery notes require at least one line before issue.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, DeliveryNoteStatus.ISSUED, "ISSUE", { issuedAt: new Date() });
  }

  async markDelivered(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === DeliveryNoteStatus.DELIVERED) {
      return existing;
    }
    if (existing.status !== DeliveryNoteStatus.ISSUED) {
      throw new BadRequestException("Only issued delivery notes can be marked delivered.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, DeliveryNoteStatus.DELIVERED, "MARK_DELIVERED", { deliveredAt: new Date() });
  }

  async cancel(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === DeliveryNoteStatus.CANCELLED) {
      return existing;
    }
    if (existing.status !== DeliveryNoteStatus.DRAFT && existing.status !== DeliveryNoteStatus.ISSUED) {
      throw new BadRequestException("Only draft or issued delivery notes can be cancelled.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, DeliveryNoteStatus.CANCELLED, "CANCEL", { cancelledAt: new Date() });
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === DeliveryNoteStatus.VOIDED) {
      return existing;
    }
    if (existing.status !== DeliveryNoteStatus.ISSUED) {
      throw new BadRequestException("Only issued delivery notes can be voided.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, DeliveryNoteStatus.VOIDED, "VOID", { voidedAt: new Date() });
  }

  private async changeStatus(
    organizationId: string,
    actorUserId: string,
    existing: Awaited<ReturnType<DeliveryNoteService["get"]>>,
    status: DeliveryNoteStatus,
    action: "ISSUE" | "MARK_DELIVERED" | "CANCEL" | "VOID",
    extraData: Pick<Prisma.DeliveryNoteUpdateInput, "issuedAt" | "deliveredAt" | "cancelledAt" | "voidedAt"> = {},
  ) {
    const updated = await this.prisma.deliveryNote.update({
      where: { id: existing.id },
      data: { status, ...extraData },
      include: deliveryNoteInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action,
      entityType: "DeliveryNote",
      entityId: existing.id,
      before: this.auditSnapshot(existing),
      after: this.auditSnapshot(updated),
    });
    return updated;
  }

  private async validateHeaderReferences(organizationId: string, customerId: string, branchId?: string, sources: SourceReferences = {}) {
    const customer = await this.prisma.contact.findFirst({
      where: {
        id: customerId,
        organizationId,
        isActive: true,
        type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
      },
      select: { id: true },
    });
    if (!customer) {
      throw new BadRequestException("Customer must be an active customer contact in this organization.");
    }

    if (branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organizationId }, select: { id: true } });
      if (!branch) {
        throw new BadRequestException("Branch does not exist in this organization.");
      }
    }

    if (sources.relatedSalesInvoiceId) {
      const invoice = await this.prisma.salesInvoice.findFirst({
        where: { id: sources.relatedSalesInvoiceId, organizationId },
        select: { id: true, customerId: true, status: true },
      });
      if (!invoice || invoice.customerId !== customerId) {
        throw new BadRequestException("Related sales invoice must belong to this organization and customer.");
      }
      if (invoice.status === SalesInvoiceStatus.VOIDED) {
        throw new BadRequestException("Voided sales invoices cannot be linked to new delivery notes.");
      }
    }

    if (sources.relatedSalesQuoteId) {
      const quote = await this.prisma.salesQuote.findFirst({
        where: { id: sources.relatedSalesQuoteId, organizationId },
        select: { id: true, customerId: true, status: true },
      });
      if (!quote || quote.customerId !== customerId) {
        throw new BadRequestException("Related sales quote must belong to this organization and customer.");
      }
      if (quote.status !== SalesQuoteStatus.ACCEPTED) {
        throw new BadRequestException("Delivery notes can only be linked to accepted sales quotes.");
      }
    }

    if (sources.relatedSalesStockIssueId) {
      const issue = await this.prisma.salesStockIssue.findFirst({
        where: { id: sources.relatedSalesStockIssueId, organizationId },
        select: { id: true, customerId: true, status: true },
      });
      if (!issue || issue.customerId !== customerId) {
        throw new BadRequestException("Related sales stock issue must belong to this organization and customer.");
      }
      if (issue.status === SalesStockIssueStatus.VOIDED) {
        throw new BadRequestException("Voided sales stock issues cannot be linked to delivery notes.");
      }
    }
  }

  private async prepareLines(
    organizationId: string,
    customerId: string,
    lines: DeliveryNoteLineDto[],
    sources: SourceReferences = {},
    executor: PrismaExecutor = this.prisma,
  ): Promise<PreparedLine[]> {
    if (!lines.length) {
      throw new BadRequestException("Delivery notes require at least one line.");
    }

    const itemIds = [...new Set(lines.map((line) => this.cleanOptional(line.itemId ?? undefined)).filter((value): value is string => Boolean(value)))];
    const items = itemIds.length
      ? await executor.item.findMany({
          where: { organizationId, id: { in: itemIds }, status: ItemStatus.ACTIVE },
          select: { id: true, name: true, description: true },
        })
      : [];
    if (items.length !== itemIds.length) {
      throw new BadRequestException("One or more delivery note items do not exist or are disabled.");
    }
    const itemsById = new Map(items.map((item) => [item.id, item]));

    const invoiceLineIds = [...new Set(lines.map((line) => this.cleanOptional(line.sourceSalesInvoiceLineId ?? undefined)).filter((value): value is string => Boolean(value)))];
    const quoteLineIds = [...new Set(lines.map((line) => this.cleanOptional(line.sourceSalesQuoteLineId ?? undefined)).filter((value): value is string => Boolean(value)))];
    const stockIssueLineIds = [...new Set(lines.map((line) => this.cleanOptional(line.sourceSalesStockIssueLineId ?? undefined)).filter((value): value is string => Boolean(value)))];

    const [invoiceLines, quoteLines, stockIssueLines] = await Promise.all([
      invoiceLineIds.length
        ? executor.salesInvoiceLine.findMany({
            where: { organizationId, id: { in: invoiceLineIds } },
            select: { id: true, invoiceId: true, itemId: true, description: true, invoice: { select: { id: true, customerId: true } } },
          })
        : Promise.resolve([]),
      quoteLineIds.length
        ? executor.salesQuoteLine.findMany({
            where: { organizationId, id: { in: quoteLineIds } },
            select: { id: true, quoteId: true, itemId: true, description: true, quote: { select: { id: true, customerId: true } } },
          })
        : Promise.resolve([]),
      stockIssueLineIds.length
        ? executor.salesStockIssueLine.findMany({
            where: { organizationId, id: { in: stockIssueLineIds } },
            select: { id: true, issueId: true, itemId: true, issue: { select: { id: true, customerId: true } }, item: { select: { id: true, name: true, description: true } } },
          })
        : Promise.resolve([]),
    ]);

    if (invoiceLines.length !== invoiceLineIds.length) {
      throw new BadRequestException("One or more source sales invoice lines do not belong to this organization.");
    }
    if (quoteLines.length !== quoteLineIds.length) {
      throw new BadRequestException("One or more source sales quote lines do not belong to this organization.");
    }
    if (stockIssueLines.length !== stockIssueLineIds.length) {
      throw new BadRequestException("One or more source sales stock issue lines do not belong to this organization.");
    }

    const invoiceLinesById = new Map(invoiceLines.map((line) => [line.id, line]));
    const quoteLinesById = new Map(quoteLines.map((line) => [line.id, line]));
    const stockIssueLinesById = new Map(stockIssueLines.map((line) => [line.id, line]));

    return lines.map((line, index) => {
      const sourceSalesInvoiceLineId = this.cleanOptional(line.sourceSalesInvoiceLineId ?? undefined);
      const sourceSalesQuoteLineId = this.cleanOptional(line.sourceSalesQuoteLineId ?? undefined);
      const sourceSalesStockIssueLineId = this.cleanOptional(line.sourceSalesStockIssueLineId ?? undefined);
      const sourceCount = [sourceSalesInvoiceLineId, sourceSalesQuoteLineId, sourceSalesStockIssueLineId].filter(Boolean).length;
      if (sourceCount > 1) {
        throw new BadRequestException(`Delivery note line ${index + 1} can reference only one source line.`);
      }

      const invoiceLine = sourceSalesInvoiceLineId ? invoiceLinesById.get(sourceSalesInvoiceLineId) : undefined;
      const quoteLine = sourceSalesQuoteLineId ? quoteLinesById.get(sourceSalesQuoteLineId) : undefined;
      const stockIssueLine = sourceSalesStockIssueLineId ? stockIssueLinesById.get(sourceSalesStockIssueLineId) : undefined;
      if (invoiceLine) {
        this.assertSourceLineCustomer(index, invoiceLine.invoice.customerId, customerId, "sales invoice");
        if (sources.relatedSalesInvoiceId && invoiceLine.invoiceId !== sources.relatedSalesInvoiceId) {
          throw new BadRequestException(`Delivery note line ${index + 1} must reference a line from the related sales invoice.`);
        }
      }
      if (quoteLine) {
        this.assertSourceLineCustomer(index, quoteLine.quote.customerId, customerId, "sales quote");
        if (sources.relatedSalesQuoteId && quoteLine.quoteId !== sources.relatedSalesQuoteId) {
          throw new BadRequestException(`Delivery note line ${index + 1} must reference a line from the related sales quote.`);
        }
      }
      if (stockIssueLine) {
        this.assertSourceLineCustomer(index, stockIssueLine.issue.customerId, customerId, "sales stock issue");
        if (sources.relatedSalesStockIssueId && stockIssueLine.issueId !== sources.relatedSalesStockIssueId) {
          throw new BadRequestException(`Delivery note line ${index + 1} must reference a line from the related sales stock issue.`);
        }
      }

      const requestedItemId = this.cleanOptional(line.itemId ?? undefined);
      const sourceItemId = invoiceLine?.itemId ?? quoteLine?.itemId ?? stockIssueLine?.itemId ?? undefined;
      if (requestedItemId && sourceItemId && requestedItemId !== sourceItemId) {
        throw new BadRequestException(`Delivery note line ${index + 1} item must match the selected source line item.`);
      }
      const itemId = requestedItemId ?? sourceItemId;
      const item = itemId ? itemsById.get(itemId) ?? stockIssueLine?.item : undefined;
      const quantity = this.positiveDecimal(line.quantity, `Delivery note line ${index + 1} quantity must be greater than zero.`);
      const description = this.cleanOptional(line.description) ?? invoiceLine?.description ?? quoteLine?.description ?? item?.description ?? item?.name;

      if (!description) {
        throw new BadRequestException(`Delivery note line ${index + 1} requires a description.`);
      }

      return {
        itemId,
        description,
        quantity: quantity.toFixed(4),
        unitOfMeasure: this.cleanOptional(line.unitOfMeasure ?? undefined),
        sourceSalesInvoiceLineId,
        sourceSalesQuoteLineId,
        sourceSalesStockIssueLineId,
        sortOrder: line.sortOrder ?? index,
      };
    });
  }

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.DeliveryNoteLineCreateWithoutDeliveryNoteInput[] {
    return lines.map((line) => ({
      organization: { connect: { id: organizationId } },
      item: line.itemId ? { connect: { id: line.itemId } } : undefined,
      sourceSalesInvoiceLine: line.sourceSalesInvoiceLineId ? { connect: { id: line.sourceSalesInvoiceLineId } } : undefined,
      sourceSalesQuoteLine: line.sourceSalesQuoteLineId ? { connect: { id: line.sourceSalesQuoteLineId } } : undefined,
      sourceSalesStockIssueLine: line.sourceSalesStockIssueLineId ? { connect: { id: line.sourceSalesStockIssueLineId } } : undefined,
      description: line.description,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure,
      sortOrder: line.sortOrder,
    }));
  }

  private sourceReferences(dto: Pick<CreateDeliveryNoteDto, "relatedSalesInvoiceId" | "relatedSalesQuoteId" | "relatedSalesStockIssueId">): SourceReferences {
    return {
      relatedSalesInvoiceId: this.cleanOptional(dto.relatedSalesInvoiceId ?? undefined),
      relatedSalesQuoteId: this.cleanOptional(dto.relatedSalesQuoteId ?? undefined),
      relatedSalesStockIssueId: this.cleanOptional(dto.relatedSalesStockIssueId ?? undefined),
    };
  }

  private assertDraft(status: DeliveryNoteStatus): void {
    if (status !== DeliveryNoteStatus.DRAFT) {
      throw new BadRequestException("Only draft delivery notes can be edited.");
    }
  }

  private assertDeliveryDate(issueDateValue: string | Date, deliveryDateValue?: string | Date | null): void {
    if (!deliveryDateValue) {
      return;
    }
    const issueDate = issueDateValue instanceof Date ? issueDateValue : new Date(issueDateValue);
    const deliveryDate = deliveryDateValue instanceof Date ? deliveryDateValue : new Date(deliveryDateValue);
    if (deliveryDate < issueDate) {
      throw new BadRequestException("Delivery date cannot be before issue date.");
    }
  }

  private assertSourceLineCustomer(index: number, sourceCustomerId: string, customerId: string, sourceLabel: string): void {
    if (sourceCustomerId !== customerId) {
      throw new BadRequestException(`Delivery note line ${index + 1} ${sourceLabel} source must match the delivery note customer.`);
    }
  }

  private cleanStatus(status: string): DeliveryNoteStatus {
    const candidate = status.trim().toUpperCase();
    if (!Object.values(DeliveryNoteStatus).includes(candidate as DeliveryNoteStatus)) {
      throw new BadRequestException("Invalid delivery note status filter.");
    }
    return candidate as DeliveryNoteStatus;
  }

  private positiveDecimal(value: string, message: string): Prisma.Decimal {
    try {
      const decimal = new Prisma.Decimal(value);
      if (decimal.lte(0)) {
        throw new Error("not positive");
      }
      return decimal;
    } catch {
      throw new BadRequestException(message);
    }
  }

  private auditSnapshot(deliveryNote: any) {
    const lines = Array.isArray(deliveryNote.lines) ? deliveryNote.lines : [];
    return {
      id: deliveryNote.id,
      deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
      customerId: deliveryNote.customerId,
      status: deliveryNote.status,
      issueDate: deliveryNote.issueDate,
      deliveryDate: deliveryNote.deliveryDate,
      relatedSalesInvoiceId: deliveryNote.relatedSalesInvoiceId ?? null,
      relatedSalesQuoteId: deliveryNote.relatedSalesQuoteId ?? null,
      relatedSalesStockIssueId: deliveryNote.relatedSalesStockIssueId ?? null,
      lineCount: lines.length,
    };
  }

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

function moneyString(value: unknown): string {
  return value && typeof value === "object" && "toString" in value ? String((value as { toString(): string }).toString()) : String(value ?? "0.0000");
}
