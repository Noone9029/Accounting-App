import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountingRuleError, calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import { SalesQuotePdfData, renderSalesQuotePdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  DocumentType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
  SalesInvoiceTaxMode,
  SalesQuoteStatus,
  TaxRateScope,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSalesQuoteDto } from "./dto/create-sales-quote.dto";
import { SalesQuoteLineDto } from "./dto/sales-quote-line.dto";
import { UpdateSalesQuoteDto } from "./dto/update-sales-quote.dto";

const salesQuoteInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true, isActive: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  convertedSalesInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true, revenueAccountId: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
};

const convertedSalesInvoiceInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
};

interface PreparedLine {
  itemId?: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId?: string;
  taxRate: string;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineSubtotal: string;
  lineTotal: string;
  sortOrder: number;
}

interface PreparedQuote {
  taxMode: SalesInvoiceTaxMode;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: PreparedLine[];
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type PersistedSalesQuoteLine = {
  itemId: string | null;
  description: string;
  accountId: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  discountRate: Prisma.Decimal;
  taxRateId: string | null;
  lineGrossAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  sortOrder: number;
};

@Injectable()
export class SalesQuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  list(organizationId: string, filters: { status?: string; customerId?: string } = {}) {
    const where: Prisma.SalesQuoteWhereInput = { organizationId };
    if (filters.status) {
      where.status = this.cleanStatus(filters.status);
    }
    const customerId = this.cleanOptional(filters.customerId);
    if (customerId) {
      where.customerId = customerId;
    }

    return this.prisma.salesQuote.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        convertedSalesInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true } },
      },
    });
  }

  async nextNumberPreview(organizationId: string) {
    const preview = await this.numberSequenceService.preview(organizationId, NumberSequenceScope.SALES_QUOTE);
    return {
      ...preview,
      quoteNumber: preview.exampleNextNumber,
      editable: false,
      overrideAllowed: false,
      policy: "SEQUENCE_ASSIGNED_ON_CREATE",
      helperText: "Preview only. The quote number is assigned from the sales quote sequence when the draft is saved.",
    };
  }

  async get(organizationId: string, id: string) {
    const quote = await this.prisma.salesQuote.findFirst({
      where: { id, organizationId },
      include: salesQuoteInclude,
    });

    if (!quote) {
      throw new NotFoundException("Sales quote not found.");
    }

    return quote;
  }

  async pdfData(organizationId: string, id: string): Promise<SalesQuotePdfData> {
    const quote = await this.prisma.salesQuote.findFirst({
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
        convertedSalesInvoice: { select: { id: true, invoiceNumber: true, status: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            item: { select: { id: true, name: true, sku: true } },
            taxRate: { select: { name: true } },
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException("Sales quote not found.");
    }

    return {
      organization: quote.organization,
      customer: quote.customer,
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        issueDate: quote.issueDate,
        expiryDate: quote.expiryDate,
        reference: quote.reference,
        currency: quote.currency,
        taxMode: quote.taxMode,
        notes: quote.notes,
        terms: quote.terms,
        subtotal: moneyString(quote.subtotal),
        discountTotal: moneyString(quote.discountTotal),
        taxableTotal: moneyString(quote.taxableTotal),
        taxTotal: moneyString(quote.taxTotal),
        total: moneyString(quote.total),
        convertedSalesInvoice: quote.convertedSalesInvoice,
      },
      lines: quote.lines.map((line) => ({
        itemName: line.item?.name ?? null,
        itemSku: line.item?.sku ?? null,
        description: line.description,
        quantity: moneyString(line.quantity),
        unitPrice: moneyString(line.unitPrice),
        discountRate: moneyString(line.discountRate),
        lineGrossAmount: moneyString(line.lineGrossAmount),
        discountAmount: moneyString(line.discountAmount),
        taxableAmount: moneyString(line.taxableAmount),
        taxAmount: moneyString(line.taxAmount),
        lineTotal: moneyString(line.lineTotal),
        taxRateName: line.taxRate?.name ?? null,
      })),
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: SalesQuotePdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.invoiceRenderSettings(organizationId);
    const buffer = await renderSalesQuotePdf(data, { ...settings, title: "Sales Quote" });
    const filename = sanitizeFilename(`sales-quote-${data.quote.quoteNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.SALES_QUOTE,
      sourceType: "SalesQuote",
      sourceId: data.quote.id,
      documentNumber: data.quote.quoteNumber,
      filename,
      buffer,
      generatedById: actorUserId,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "GENERATE_PDF",
      entityType: "SalesQuote",
      entityId: data.quote.id,
      after: {
        id: data.quote.id,
        quoteNumber: data.quote.quoteNumber,
        status: data.quote.status,
        convertedSalesInvoiceId: data.quote.convertedSalesInvoice?.id ?? null,
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

  async create(organizationId: string, actorUserId: string, dto: CreateSalesQuoteDto) {
    await this.validateHeaderReferences(organizationId, dto.customerId, dto.branchId ?? undefined);
    this.assertExpiryDate(dto.issueDate, dto.expiryDate ?? undefined);
    const taxMode = dto.taxMode ?? SalesInvoiceTaxMode.TAX_EXCLUSIVE;
    const prepared = await this.prepareQuote(organizationId, dto.lines, taxMode);
    const currency = (dto.currency ?? "SAR").toUpperCase();

    try {
      const quote = await this.prisma.$transaction(async (tx) => {
        const quoteNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.SALES_QUOTE, tx);

        return tx.salesQuote.create({
          data: {
            organizationId,
            quoteNumber,
            customerId: dto.customerId,
            branchId: this.cleanOptional(dto.branchId ?? undefined),
            issueDate: new Date(dto.issueDate),
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
            reference: this.cleanOptional(dto.reference),
            currency,
            taxMode: prepared.taxMode,
            subtotal: prepared.subtotal,
            discountTotal: prepared.discountTotal,
            taxableTotal: prepared.taxableTotal,
            taxTotal: prepared.taxTotal,
            total: prepared.total,
            notes: this.cleanOptional(dto.notes),
            terms: this.cleanOptional(dto.terms),
            createdById: actorUserId,
            lines: { create: this.toQuoteLineCreateMany(organizationId, prepared.lines) },
          },
          include: salesQuoteInclude,
        });
      });

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "CREATE",
        entityType: "SalesQuote",
        entityId: quote.id,
        after: this.auditQuoteSnapshot(quote),
      });
      return quote;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Quote number already exists for this organization.");
      }
      throw error;
    }
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateSalesQuoteDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    const nextCustomerId = dto.customerId ?? existing.customerId;
    const nextBranchId = Object.prototype.hasOwnProperty.call(dto, "branchId")
      ? this.cleanOptional(dto.branchId ?? undefined)
      : existing.branchId ?? undefined;
    if (dto.customerId || Object.prototype.hasOwnProperty.call(dto, "branchId")) {
      await this.validateHeaderReferences(organizationId, nextCustomerId, nextBranchId);
    }

    const nextIssueDate = dto.issueDate ? new Date(dto.issueDate) : existing.issueDate;
    const nextExpiryDate = Object.prototype.hasOwnProperty.call(dto, "expiryDate")
      ? dto.expiryDate
        ? new Date(dto.expiryDate)
        : null
      : existing.expiryDate;
    this.assertExpiryDate(nextIssueDate, nextExpiryDate);

    const taxMode = dto.taxMode ?? existing.taxMode ?? SalesInvoiceTaxMode.TAX_EXCLUSIVE;
    const shouldRecalculate = Boolean(dto.lines) || dto.taxMode !== undefined;
    const recalculationLines =
      dto.lines ??
      existing.lines?.map((line) => ({
        itemId: line.itemId,
        description: line.description,
        accountId: line.accountId,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        discountRate: String(line.discountRate),
        taxRateId: line.taxRateId,
        sortOrder: line.sortOrder,
      }));
    const prepared = shouldRecalculate ? await this.prepareQuote(organizationId, recalculationLines ?? [], taxMode) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (prepared) {
        await tx.salesQuoteLine.deleteMany({ where: { organizationId, quoteId: id } });
      }

      return tx.salesQuote.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          branchId: Object.prototype.hasOwnProperty.call(dto, "branchId") ? nextBranchId ?? null : undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          expiryDate: Object.prototype.hasOwnProperty.call(dto, "expiryDate") ? nextExpiryDate : undefined,
          reference: dto.reference === undefined ? undefined : this.cleanOptional(dto.reference),
          currency: dto.currency?.toUpperCase(),
          taxMode: prepared?.taxMode ?? dto.taxMode,
          subtotal: prepared?.subtotal,
          discountTotal: prepared?.discountTotal,
          taxableTotal: prepared?.taxableTotal,
          taxTotal: prepared?.taxTotal,
          total: prepared?.total,
          notes: dto.notes === undefined ? undefined : this.cleanOptional(dto.notes),
          terms: dto.terms === undefined ? undefined : this.cleanOptional(dto.terms),
          lines: prepared ? { create: this.toQuoteLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: salesQuoteInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "SalesQuote",
      entityId: id,
      before: this.auditQuoteSnapshot(existing),
      after: this.auditQuoteSnapshot(updated),
    });
    return updated;
  }

  async markSent(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesQuoteStatus.SENT) {
      return existing;
    }
    if (existing.status !== SalesQuoteStatus.DRAFT) {
      throw new BadRequestException("Only draft sales quotes can be marked as sent.");
    }
    const sent = await this.prisma.salesQuote.update({
      where: { id },
      data: { status: SalesQuoteStatus.SENT, sentAt: new Date() },
      include: salesQuoteInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "MARK_SENT", entityType: "SalesQuote", entityId: id, before: this.auditQuoteSnapshot(existing), after: this.auditQuoteSnapshot(sent) });
    return sent;
  }

  async accept(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesQuoteStatus.ACCEPTED) {
      return existing;
    }
    if (existing.status !== SalesQuoteStatus.SENT) {
      throw new BadRequestException("Only sent sales quotes can be accepted.");
    }
    const accepted = await this.prisma.salesQuote.update({
      where: { id },
      data: { status: SalesQuoteStatus.ACCEPTED, acceptedAt: new Date() },
      include: salesQuoteInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "ACCEPT", entityType: "SalesQuote", entityId: id, before: this.auditQuoteSnapshot(existing), after: this.auditQuoteSnapshot(accepted) });
    return accepted;
  }

  async reject(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesQuoteStatus.REJECTED) {
      return existing;
    }
    if (existing.status !== SalesQuoteStatus.SENT) {
      throw new BadRequestException("Only sent sales quotes can be rejected.");
    }
    const rejected = await this.prisma.salesQuote.update({
      where: { id },
      data: { status: SalesQuoteStatus.REJECTED, rejectedAt: new Date() },
      include: salesQuoteInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "REJECT", entityType: "SalesQuote", entityId: id, before: this.auditQuoteSnapshot(existing), after: this.auditQuoteSnapshot(rejected) });
    return rejected;
  }

  async expire(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesQuoteStatus.EXPIRED) {
      return existing;
    }
    if (existing.status !== SalesQuoteStatus.SENT) {
      throw new BadRequestException("Only sent sales quotes can be expired.");
    }
    const expired = await this.prisma.salesQuote.update({
      where: { id },
      data: { status: SalesQuoteStatus.EXPIRED, expiredAt: new Date() },
      include: salesQuoteInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "EXPIRE", entityType: "SalesQuote", entityId: id, before: this.auditQuoteSnapshot(existing), after: this.auditQuoteSnapshot(expired) });
    return expired;
  }

  async cancel(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesQuoteStatus.CANCELLED) {
      return existing;
    }
    if (existing.status !== SalesQuoteStatus.DRAFT && existing.status !== SalesQuoteStatus.SENT) {
      throw new BadRequestException("Only draft or sent sales quotes can be cancelled.");
    }
    const cancelled = await this.prisma.salesQuote.update({
      where: { id },
      data: { status: SalesQuoteStatus.CANCELLED, cancelledAt: new Date() },
      include: salesQuoteInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CANCEL", entityType: "SalesQuote", entityId: id, before: this.auditQuoteSnapshot(existing), after: this.auditQuoteSnapshot(cancelled) });
    return cancelled;
  }

  async convertToInvoice(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    this.assertConvertible(existing.status, existing.convertedSalesInvoiceId);

    const result = await this.prisma.$transaction(async (tx) => {
      const quote = await tx.salesQuote.findFirst({
        where: { id, organizationId },
        include: {
          customer: { select: { id: true, name: true, displayName: true, type: true, isActive: true } },
          lines: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!quote) {
        throw new NotFoundException("Sales quote not found.");
      }
      this.assertConvertible(quote.status, quote.convertedSalesInvoiceId);
      if (!quote.customer.isActive || (quote.customer.type !== ContactType.CUSTOMER && quote.customer.type !== ContactType.BOTH)) {
        throw new BadRequestException("Customer must still be an active customer contact before conversion.");
      }

      if (quote.lines.length === 0) {
        throw new BadRequestException("Sales quote requires at least one line before conversion.");
      }
      await this.validateLineAccounts(organizationId, quote.lines.map((line) => line.accountId), tx);
      await this.getTaxRatesById(
        organizationId,
        quote.lines.map((line) => line.taxRateId).filter((taxRateId): taxRateId is string => Boolean(taxRateId)),
        tx,
      );

      const invoiceNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.INVOICE, tx);
      const invoice = await tx.salesInvoice.create({
        data: {
          organizationId,
          invoiceNumber,
          customerId: quote.customerId,
          branchId: quote.branchId,
          issueDate: new Date(),
          dueDate: null,
          currency: quote.currency,
          status: SalesInvoiceStatus.DRAFT,
          taxMode: quote.taxMode,
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          taxableTotal: quote.taxableTotal,
          taxTotal: quote.taxTotal,
          total: quote.total,
          balanceDue: quote.total,
          notes: quote.notes,
          terms: quote.terms,
          createdById: actorUserId,
          lines: { create: this.toInvoiceLineCreateMany(organizationId, quote.lines) },
        },
        include: convertedSalesInvoiceInclude,
      });

      const convertedQuote = await tx.salesQuote.update({
        where: { id: quote.id },
        data: {
          status: SalesQuoteStatus.CONVERTED,
          convertedSalesInvoiceId: invoice.id,
          convertedAt: new Date(),
        },
        include: salesQuoteInclude,
      });

      return { quote: convertedQuote, invoice };
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CONVERT_TO_INVOICE",
      entityType: "SalesQuote",
      entityId: id,
      before: this.auditQuoteSnapshot(existing),
      after: {
        ...this.auditQuoteSnapshot(result.quote),
        convertedSalesInvoiceNumber: result.invoice.invoiceNumber,
      },
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "SalesInvoice",
      entityId: result.invoice.id,
      after: {
        id: result.invoice.id,
        invoiceNumber: result.invoice.invoiceNumber,
        status: result.invoice.status,
        customerId: result.invoice.customerId,
        taxMode: result.invoice.taxMode,
        total: String(result.invoice.total),
        sourceQuoteId: id,
        sourceQuoteNumber: existing.quoteNumber,
      },
    });
    return result;
  }

  private async validateHeaderReferences(organizationId: string, customerId: string, branchId?: string): Promise<void> {
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

    if (!branchId) {
      return;
    }

    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organizationId }, select: { id: true } });
    if (!branch) {
      throw new BadRequestException("Branch does not exist in this organization.");
    }
  }

  private async prepareQuote(
    organizationId: string,
    lines: SalesQuoteLineDto[],
    taxMode: SalesInvoiceTaxMode = SalesInvoiceTaxMode.TAX_EXCLUSIVE,
  ): Promise<PreparedQuote> {
    if (!lines.length) {
      throw new BadRequestException("Sales quotes require at least one line.");
    }

    const itemIds = [
      ...new Set(lines.map((line) => this.cleanOptional(line.itemId ?? undefined)).filter((value): value is string => Boolean(value))),
    ];
    const items = itemIds.length
      ? await this.prisma.item.findMany({
          where: { organizationId, id: { in: itemIds }, status: ItemStatus.ACTIVE },
          select: { id: true, name: true, description: true, revenueAccountId: true, salesTaxRateId: true },
        })
      : [];

    if (items.length !== itemIds.length) {
      throw new BadRequestException("One or more items do not exist or are disabled.");
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const baseLines = lines.map((line, index) => {
      const itemId = this.cleanOptional(line.itemId ?? undefined);
      const item = itemId ? itemsById.get(itemId) : undefined;
      const accountId = this.cleanOptional(line.accountId ?? undefined) ?? item?.revenueAccountId;
      const requestedTaxRateId =
        line.taxRateId === undefined ? item?.salesTaxRateId ?? undefined : this.cleanOptional(line.taxRateId ?? undefined);
      const taxRateId = taxMode === SalesInvoiceTaxMode.NO_TAX ? undefined : requestedTaxRateId;
      const description = this.cleanOptional(line.description) ?? item?.description ?? item?.name;

      if (!accountId) {
        throw new BadRequestException(`Sales quote line ${index + 1} requires a revenue account.`);
      }

      if (!description) {
        throw new BadRequestException(`Sales quote line ${index + 1} requires a description.`);
      }

      return {
        itemId,
        description,
        accountId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate ?? "0.0000",
        taxRateId,
        sortOrder: line.sortOrder ?? index,
      };
    });

    await this.validateLineAccounts(organizationId, baseLines.map((line) => line.accountId));
    const taxRatesById = await this.getTaxRatesById(
      organizationId,
      baseLines.map((line) => line.taxRateId).filter((value): value is string => Boolean(value)),
    );

    const totals = this.calculateTotals(
      baseLines.map((line) => ({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate,
        taxRate: line.taxRateId ? String(taxRatesById.get(line.taxRateId)?.rate ?? "0.0000") : "0.0000",
      })),
      taxMode,
    );

    return {
      taxMode,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxableTotal: totals.taxableTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      lines: baseLines.map((line, index) => {
        const calculated = totals.lines[index];
        if (!calculated) {
          throw new BadRequestException("Unable to calculate sales quote line totals.");
        }

        return {
          ...line,
          quantity: calculated.quantity,
          unitPrice: calculated.unitPrice,
          discountRate: calculated.discountRate,
          taxRate: calculated.taxRate,
          lineGrossAmount: calculated.lineGrossAmount,
          discountAmount: calculated.discountAmount,
          taxableAmount: calculated.taxableAmount,
          taxAmount: calculated.taxAmount,
          lineSubtotal: calculated.taxableAmount,
          lineTotal: calculated.lineTotal,
        };
      }),
    };
  }

  private calculateTotals(lines: Parameters<typeof calculateSalesInvoiceTotals>[0], taxMode: SalesInvoiceTaxMode) {
    try {
      return calculateSalesInvoiceTotals(lines, taxMode);
    } catch (error) {
      if (error instanceof AccountingRuleError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  private async validateLineAccounts(organizationId: string, accountIds: string[], executor: PrismaExecutor = this.prisma): Promise<void> {
    const uniqueAccountIds = [...new Set(accountIds)];
    const accounts = await executor.account.findMany({
      where: {
        organizationId,
        id: { in: uniqueAccountIds },
        type: AccountType.REVENUE,
        isActive: true,
        allowPosting: true,
      },
      select: { id: true },
    });

    if (accounts.length !== uniqueAccountIds.length) {
      throw new BadRequestException("Sales quote line accounts must be active posting revenue accounts in this organization.");
    }
  }

  private async getTaxRatesById(organizationId: string, taxRateIds: string[], executor: PrismaExecutor = this.prisma) {
    const uniqueTaxRateIds = [...new Set(taxRateIds)];
    if (uniqueTaxRateIds.length === 0) {
      return new Map<string, { id: string; rate: Prisma.Decimal }>();
    }

    const taxRates = await executor.taxRate.findMany({
      where: {
        organizationId,
        id: { in: uniqueTaxRateIds },
        isActive: true,
        scope: { in: [TaxRateScope.SALES, TaxRateScope.BOTH] },
      },
      select: { id: true, rate: true },
    });

    if (taxRates.length !== uniqueTaxRateIds.length) {
      throw new BadRequestException("Sales quote tax rates must be active sales tax rates in this organization.");
    }

    return new Map(taxRates.map((taxRate) => [taxRate.id, taxRate]));
  }

  private assertDraft(status: SalesQuoteStatus): void {
    if (status !== SalesQuoteStatus.DRAFT) {
      throw new BadRequestException("Only draft sales quotes can be edited.");
    }
  }

  private assertConvertible(status: SalesQuoteStatus, convertedSalesInvoiceId?: string | null): void {
    if (convertedSalesInvoiceId || status === SalesQuoteStatus.CONVERTED) {
      throw new BadRequestException("Sales quote has already been converted to an invoice.");
    }
    if (status !== SalesQuoteStatus.ACCEPTED) {
      throw new BadRequestException("Only accepted sales quotes can be converted to draft invoices.");
    }
  }

  private assertExpiryDate(issueDateValue: string | Date, expiryDateValue?: string | Date | null): void {
    if (!expiryDateValue) {
      return;
    }
    const issueDate = issueDateValue instanceof Date ? issueDateValue : new Date(issueDateValue);
    const expiryDate = expiryDateValue instanceof Date ? expiryDateValue : new Date(expiryDateValue);
    if (expiryDate < issueDate) {
      throw new BadRequestException("Expiry date cannot be before issue date.");
    }
  }

  private cleanStatus(status: string): SalesQuoteStatus {
    const candidate = status.trim().toUpperCase();
    if (!Object.values(SalesQuoteStatus).includes(candidate as SalesQuoteStatus)) {
      throw new BadRequestException("Invalid sales quote status filter.");
    }
    return candidate as SalesQuoteStatus;
  }

  private toQuoteLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.SalesQuoteLineCreateWithoutQuoteInput[] {
    return lines.map((line) => ({
      organization: { connect: { id: organizationId } },
      item: line.itemId ? { connect: { id: line.itemId } } : undefined,
      account: { connect: { id: line.accountId } },
      taxRate: line.taxRateId ? { connect: { id: line.taxRateId } } : undefined,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      lineGrossAmount: line.lineGrossAmount,
      discountAmount: line.discountAmount,
      taxableAmount: line.taxableAmount,
      taxAmount: line.taxAmount,
      lineSubtotal: line.lineSubtotal,
      lineTotal: line.lineTotal,
      sortOrder: line.sortOrder,
    }));
  }

  private toInvoiceLineCreateMany(
    organizationId: string,
    lines: PersistedSalesQuoteLine[],
  ): Prisma.SalesInvoiceLineCreateWithoutInvoiceInput[] {
    return lines.map((line) => ({
      organization: { connect: { id: organizationId } },
      item: line.itemId ? { connect: { id: line.itemId } } : undefined,
      account: { connect: { id: line.accountId } },
      taxRate: line.taxRateId ? { connect: { id: line.taxRateId } } : undefined,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      lineGrossAmount: line.lineGrossAmount,
      discountAmount: line.discountAmount,
      taxableAmount: line.taxableAmount,
      taxAmount: line.taxAmount,
      lineSubtotal: line.lineSubtotal,
      lineTotal: line.lineTotal,
      sortOrder: line.sortOrder,
    }));
  }

  private auditQuoteSnapshot(quote: any) {
    const lines = Array.isArray(quote.lines) ? quote.lines : [];
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerId: quote.customerId,
      status: quote.status,
      issueDate: quote.issueDate,
      expiryDate: quote.expiryDate,
      currency: quote.currency,
      taxMode: quote.taxMode,
      subtotal: String(quote.subtotal ?? "0"),
      discountTotal: String(quote.discountTotal ?? "0"),
      taxableTotal: String(quote.taxableTotal ?? "0"),
      taxTotal: String(quote.taxTotal ?? "0"),
      total: String(quote.total ?? "0"),
      convertedSalesInvoiceId: quote.convertedSalesInvoiceId ?? null,
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
