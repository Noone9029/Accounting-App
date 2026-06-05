import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountingRuleError, calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  ContactType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  RecurringInvoiceDateMode,
  RecurringInvoiceFrequency,
  RecurringInvoiceTemplateStatus,
  SalesInvoiceStatus,
  SalesInvoiceTaxMode,
  TaxRateScope,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRecurringInvoiceDto } from "./dto/create-recurring-invoice.dto";
import { RecurringInvoiceLineDto } from "./dto/recurring-invoice-line.dto";
import { UpdateRecurringInvoiceDto } from "./dto/update-recurring-invoice.dto";

const recurringInvoiceInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, isActive: true, taxNumber: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true, revenueAccountId: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
  runs: {
    orderBy: { createdAt: "desc" as const },
    include: {
      generatedInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true } },
      generatedBy: { select: { id: true, name: true, email: true } },
    },
  },
};

const generatedInvoiceInclude = {
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

interface PreparedTemplate {
  taxMode: SalesInvoiceTaxMode;
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: PreparedLine[];
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type PersistedRecurringLine = {
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
export class RecurringInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  list(organizationId: string, filters: { status?: string; customerId?: string; frequency?: string } = {}) {
    const where: Prisma.RecurringInvoiceTemplateWhereInput = { organizationId };
    if (filters.status) {
      where.status = this.cleanStatus(filters.status);
    }
    if (filters.frequency) {
      where.frequency = this.cleanFrequency(filters.frequency);
    }
    const customerId = this.cleanOptional(filters.customerId);
    if (customerId) {
      where.customerId = customerId;
    }

    return this.prisma.recurringInvoiceTemplate.findMany({
      where,
      orderBy: [{ nextRunDate: "asc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        runs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { generatedInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true } } },
        },
      },
    });
  }

  async nextNumberPreview(organizationId: string) {
    const preview = await this.numberSequenceService.preview(organizationId, NumberSequenceScope.RECURRING_INVOICE_TEMPLATE);
    return {
      ...preview,
      templateNumber: preview.exampleNextNumber,
      editable: false,
      overrideAllowed: false,
      policy: "SEQUENCE_ASSIGNED_ON_CREATE",
      helperText: "Preview only. The recurring template number is assigned from the recurring invoice sequence when the draft template is saved.",
    };
  }

  async get(organizationId: string, id: string) {
    const template = await this.prisma.recurringInvoiceTemplate.findFirst({
      where: { id, organizationId },
      include: recurringInvoiceInclude,
    });

    if (!template) {
      throw new NotFoundException("Recurring invoice template not found.");
    }

    return template;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateRecurringInvoiceDto) {
    await this.validateHeaderReferences(organizationId, dto.customerId, dto.branchId ?? undefined);
    const schedule = this.normalizeSchedule(dto);
    const taxMode = dto.taxMode ?? SalesInvoiceTaxMode.TAX_EXCLUSIVE;
    const prepared = await this.prepareTemplate(organizationId, dto.lines, taxMode);
    const currency = (dto.currency ?? "SAR").toUpperCase();
    const name = this.requiredText(dto.name, "Template name is required.");

    try {
      const template = await this.prisma.$transaction(async (tx) => {
        const templateNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.RECURRING_INVOICE_TEMPLATE, tx);
        return tx.recurringInvoiceTemplate.create({
          data: {
            organizationId,
            templateNumber,
            name,
            customerId: dto.customerId,
            branchId: this.cleanOptional(dto.branchId ?? undefined),
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            nextRunDate: schedule.nextRunDate,
            frequency: schedule.frequency,
            interval: schedule.interval,
            dayOfMonth: schedule.dayOfMonth,
            dayOfWeek: schedule.dayOfWeek,
            monthOfYear: schedule.monthOfYear,
            invoiceDateMode: schedule.invoiceDateMode,
            paymentTermsDays: schedule.paymentTermsDays,
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
            lines: { create: this.toTemplateLineCreateMany(organizationId, prepared.lines) },
          },
          include: recurringInvoiceInclude,
        });
      });

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "CREATE",
        entityType: "RecurringInvoiceTemplate",
        entityId: template.id,
        after: this.auditTemplateSnapshot(template),
      });
      return template;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Recurring template number already exists for this organization.");
      }
      throw error;
    }
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateRecurringInvoiceDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    const nextCustomerId = dto.customerId ?? existing.customerId;
    const nextBranchId = Object.prototype.hasOwnProperty.call(dto, "branchId")
      ? this.cleanOptional(dto.branchId ?? undefined)
      : existing.branchId ?? undefined;
    if (dto.customerId || Object.prototype.hasOwnProperty.call(dto, "branchId")) {
      await this.validateHeaderReferences(organizationId, nextCustomerId, nextBranchId);
    }

    const schedule = this.normalizeSchedule({
      startDate: dto.startDate ?? existing.startDate.toISOString(),
      endDate: Object.prototype.hasOwnProperty.call(dto, "endDate") ? dto.endDate : existing.endDate?.toISOString(),
      nextRunDate: dto.nextRunDate ?? existing.nextRunDate.toISOString(),
      frequency: dto.frequency ?? existing.frequency,
      interval: dto.interval ?? existing.interval,
      dayOfMonth: Object.prototype.hasOwnProperty.call(dto, "dayOfMonth") ? dto.dayOfMonth : existing.dayOfMonth,
      dayOfWeek: Object.prototype.hasOwnProperty.call(dto, "dayOfWeek") ? dto.dayOfWeek : existing.dayOfWeek,
      monthOfYear: Object.prototype.hasOwnProperty.call(dto, "monthOfYear") ? dto.monthOfYear : existing.monthOfYear,
      invoiceDateMode: dto.invoiceDateMode ?? existing.invoiceDateMode,
      paymentTermsDays: dto.paymentTermsDays ?? existing.paymentTermsDays,
    });

    const taxMode = dto.taxMode ?? existing.taxMode ?? SalesInvoiceTaxMode.TAX_EXCLUSIVE;
    const shouldRecalculate = Boolean(dto.lines) || dto.taxMode !== undefined;
    const recalculationLines =
      dto.lines ??
      existing.lines.map((line) => ({
        itemId: line.itemId,
        description: line.description,
        accountId: line.accountId,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        discountRate: String(line.discountRate),
        taxRateId: line.taxRateId,
        sortOrder: line.sortOrder,
      }));
    const prepared = shouldRecalculate ? await this.prepareTemplate(organizationId, recalculationLines, taxMode) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (prepared) {
        await tx.recurringInvoiceTemplateLine.deleteMany({ where: { organizationId, templateId: id } });
      }

      return tx.recurringInvoiceTemplate.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          branchId: Object.prototype.hasOwnProperty.call(dto, "branchId") ? nextBranchId ?? null : undefined,
          name: dto.name === undefined ? undefined : this.requiredText(dto.name, "Template name is required."),
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          nextRunDate: schedule.nextRunDate,
          frequency: schedule.frequency,
          interval: schedule.interval,
          dayOfMonth: schedule.dayOfMonth,
          dayOfWeek: schedule.dayOfWeek,
          monthOfYear: schedule.monthOfYear,
          invoiceDateMode: schedule.invoiceDateMode,
          paymentTermsDays: schedule.paymentTermsDays,
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
          lines: prepared ? { create: this.toTemplateLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: recurringInvoiceInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "RecurringInvoiceTemplate",
      entityId: id,
      before: this.auditTemplateSnapshot(existing),
      after: this.auditTemplateSnapshot(updated),
    });
    return updated;
  }

  async activate(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === RecurringInvoiceTemplateStatus.ACTIVE) {
      return existing;
    }
    if (existing.status !== RecurringInvoiceTemplateStatus.DRAFT) {
      throw new BadRequestException("Only draft recurring invoice templates can be activated.");
    }
    const activated = await this.changeStatus(organizationId, actorUserId, existing, RecurringInvoiceTemplateStatus.ACTIVE, "ACTIVATE");
    return activated;
  }

  async pause(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === RecurringInvoiceTemplateStatus.PAUSED) {
      return existing;
    }
    if (existing.status !== RecurringInvoiceTemplateStatus.ACTIVE) {
      throw new BadRequestException("Only active recurring invoice templates can be paused.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, RecurringInvoiceTemplateStatus.PAUSED, "PAUSE");
  }

  async resume(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === RecurringInvoiceTemplateStatus.ACTIVE) {
      return existing;
    }
    if (existing.status !== RecurringInvoiceTemplateStatus.PAUSED) {
      throw new BadRequestException("Only paused recurring invoice templates can be resumed.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, RecurringInvoiceTemplateStatus.ACTIVE, "RESUME");
  }

  async end(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === RecurringInvoiceTemplateStatus.ENDED) {
      return existing;
    }
    if (existing.status === RecurringInvoiceTemplateStatus.CANCELLED) {
      throw new BadRequestException("Cancelled recurring invoice templates cannot be ended.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, RecurringInvoiceTemplateStatus.ENDED, "END");
  }

  async cancel(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === RecurringInvoiceTemplateStatus.CANCELLED) {
      return existing;
    }
    if (existing.status === RecurringInvoiceTemplateStatus.ENDED) {
      throw new BadRequestException("Ended recurring invoice templates cannot be cancelled.");
    }
    return this.changeStatus(organizationId, actorUserId, existing, RecurringInvoiceTemplateStatus.CANCELLED, "CANCEL");
  }

  async preview(organizationId: string, id: string) {
    const template = await this.get(organizationId, id);
    const blockers = await this.previewBlockers(organizationId, template);
    return {
      templateId: template.id,
      templateNumber: template.templateNumber,
      status: template.status,
      nextInvoiceDate: template.nextRunDate,
      dueDate: addUtcDays(template.nextRunDate, template.paymentTermsDays),
      periodCovered: this.periodForRun(template.nextRunDate, template.frequency, template.interval),
      customer: template.customer,
      taxMode: template.taxMode,
      subtotal: moneyString(template.subtotal),
      discountTotal: moneyString(template.discountTotal),
      taxableTotal: moneyString(template.taxableTotal),
      taxTotal: moneyString(template.taxTotal),
      total: moneyString(template.total),
      lines: template.lines,
      nextOccurrences: nextOccurrences(template.nextRunDate, template.frequency, template.interval, template.endDate, 6),
      blockers,
      previewOnly: true,
    };
  }

  async generateNow(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    this.assertGeneratable(existing.status);
    const blockers = await this.previewBlockers(organizationId, existing, { includeStatus: false });
    if (blockers.length > 0) {
      throw new BadRequestException(`Recurring invoice template cannot generate: ${blockers.join("; ")}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const template = await tx.recurringInvoiceTemplate.findFirst({
        where: { id, organizationId },
        include: {
          customer: { select: { id: true, name: true, displayName: true, type: true, isActive: true } },
          lines: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (!template) {
        throw new NotFoundException("Recurring invoice template not found.");
      }
      this.assertGeneratable(template.status);
      if (!template.customer.isActive || (template.customer.type !== ContactType.CUSTOMER && template.customer.type !== ContactType.BOTH)) {
        throw new BadRequestException("Customer must still be an active customer contact before invoice generation.");
      }
      if (template.lines.length === 0) {
        throw new BadRequestException("Recurring invoice templates require at least one line before invoice generation.");
      }

      await this.validateLineAccounts(organizationId, template.lines.map((line) => line.accountId), tx);
      await this.getTaxRatesById(
        organizationId,
        template.lines.map((line) => line.taxRateId).filter((taxRateId): taxRateId is string => Boolean(taxRateId)),
        tx,
      );

      const duplicateRun = await tx.recurringInvoiceRun.findFirst({
        where: { organizationId, templateId: template.id, runDate: template.nextRunDate },
        select: { id: true, generatedInvoiceId: true },
      });
      if (duplicateRun) {
        throw new BadRequestException("An invoice has already been generated for this recurring template run date.");
      }

      const invoiceNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.INVOICE, tx);
      const invoiceDate = template.nextRunDate;
      const dueDate = addUtcDays(invoiceDate, template.paymentTermsDays);
      const periodCovered = this.periodForRun(invoiceDate, template.frequency, template.interval);
      const nextRunDate = advanceRunDate(template.nextRunDate, template.frequency, template.interval);
      const shouldEnd = Boolean(template.endDate && nextRunDate > template.endDate);

      const invoice = await tx.salesInvoice.create({
        data: {
          organizationId,
          invoiceNumber,
          customerId: template.customerId,
          branchId: template.branchId,
          recurringInvoiceTemplateId: template.id,
          issueDate: invoiceDate,
          dueDate,
          currency: template.currency,
          status: SalesInvoiceStatus.DRAFT,
          taxMode: template.taxMode,
          subtotal: template.subtotal,
          discountTotal: template.discountTotal,
          taxableTotal: template.taxableTotal,
          taxTotal: template.taxTotal,
          total: template.total,
          balanceDue: template.total,
          notes: template.notes,
          terms: template.terms,
          createdById: actorUserId,
          lines: { create: this.toInvoiceLineCreateMany(organizationId, template.lines) },
        },
        include: generatedInvoiceInclude,
      });

      const run = await tx.recurringInvoiceRun.create({
        data: {
          organizationId,
          templateId: template.id,
          runDate: template.nextRunDate,
          invoiceDate,
          dueDate,
          periodStart: periodCovered.startDate,
          periodEnd: periodCovered.endDate,
          generatedInvoiceId: invoice.id,
          generatedById: actorUserId,
        },
        include: {
          generatedInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true } },
          generatedBy: { select: { id: true, name: true, email: true } },
        },
      });

      const updatedTemplate = await tx.recurringInvoiceTemplate.update({
        where: { id: template.id },
        data: {
          lastRunDate: template.nextRunDate,
          nextRunDate: shouldEnd ? template.nextRunDate : nextRunDate,
          status: shouldEnd ? RecurringInvoiceTemplateStatus.ENDED : undefined,
        },
        include: recurringInvoiceInclude,
      });

      return { template: updatedTemplate, invoice, run, previousNextRunDate: template.nextRunDate, newNextRunDate: shouldEnd ? null : nextRunDate };
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "GENERATE_INVOICE",
      entityType: "RecurringInvoiceTemplate",
      entityId: id,
      before: this.auditTemplateSnapshot(existing),
      after: {
        ...this.auditTemplateSnapshot(result.template),
        generatedInvoiceId: result.invoice.id,
        generatedInvoiceNumber: result.invoice.invoiceNumber,
        runId: result.run.id,
        previousNextRunDate: result.previousNextRunDate,
        newNextRunDate: result.newNextRunDate,
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
        sourceRecurringTemplateId: id,
        sourceRecurringTemplateNumber: existing.templateNumber,
        recurringInvoiceRunId: result.run.id,
      },
    });
    return result;
  }

  private async changeStatus(
    organizationId: string,
    actorUserId: string,
    existing: Awaited<ReturnType<RecurringInvoiceService["get"]>>,
    status: RecurringInvoiceTemplateStatus,
    action: "ACTIVATE" | "PAUSE" | "RESUME" | "END" | "CANCEL",
  ) {
    const updated = await this.prisma.recurringInvoiceTemplate.update({
      where: { id: existing.id },
      data: { status },
      include: recurringInvoiceInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action,
      entityType: "RecurringInvoiceTemplate",
      entityId: existing.id,
      before: this.auditTemplateSnapshot(existing),
      after: this.auditTemplateSnapshot(updated),
    });
    return updated;
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

  private async prepareTemplate(
    organizationId: string,
    lines: RecurringInvoiceLineDto[],
    taxMode: SalesInvoiceTaxMode = SalesInvoiceTaxMode.TAX_EXCLUSIVE,
  ): Promise<PreparedTemplate> {
    if (!lines.length) {
      throw new BadRequestException("Recurring invoice templates require at least one line.");
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
        throw new BadRequestException(`Recurring invoice template line ${index + 1} requires a revenue account.`);
      }
      if (!description) {
        throw new BadRequestException(`Recurring invoice template line ${index + 1} requires a description.`);
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
          throw new BadRequestException("Unable to calculate recurring invoice template line totals.");
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

  private async previewBlockers(
    organizationId: string,
    template: Awaited<ReturnType<RecurringInvoiceService["get"]>>,
    options: { includeStatus?: boolean } = {},
  ): Promise<string[]> {
    const includeStatus = options.includeStatus ?? true;
    const blockers: string[] = [];
    if (includeStatus && template.status !== RecurringInvoiceTemplateStatus.ACTIVE) {
      blockers.push(`Template status is ${template.status}; only active templates can generate invoices.`);
    }
    if (!template.customer.isActive || (template.customer.type !== ContactType.CUSTOMER && template.customer.type !== ContactType.BOTH)) {
      blockers.push("Customer is not an active customer contact.");
    }
    if (template.endDate && template.nextRunDate > template.endDate) {
      blockers.push("End date has been reached.");
    }
    if (template.lines.length === 0) {
      blockers.push("Template has no invoice lines.");
    }

    try {
      await this.validateLineAccounts(organizationId, template.lines.map((line) => line.accountId));
      await this.getTaxRatesById(
        organizationId,
        template.lines.map((line) => line.taxRateId).filter((taxRateId): taxRateId is string => Boolean(taxRateId)),
      );
    } catch (error) {
      blockers.push(error instanceof Error ? error.message : "Template line validation failed.");
    }

    return blockers;
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
      throw new BadRequestException("Recurring invoice template line accounts must be active posting revenue accounts in this organization.");
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
      throw new BadRequestException("Recurring invoice tax rates must be active sales tax rates in this organization.");
    }

    return new Map(taxRates.map((taxRate) => [taxRate.id, taxRate]));
  }

  private normalizeSchedule(dto: Pick<CreateRecurringInvoiceDto, "startDate" | "endDate" | "nextRunDate" | "frequency"> & Partial<CreateRecurringInvoiceDto>) {
    const startDate = dateFrom(dto.startDate, "Start date");
    const endDate = dto.endDate ? dateFrom(dto.endDate, "End date") : null;
    const nextRunDate = dateFrom(dto.nextRunDate, "Next run date");
    const frequency = dto.frequency;
    const interval = dto.interval ?? 1;
    const paymentTermsDays = dto.paymentTermsDays ?? 0;
    const invoiceDateMode = dto.invoiceDateMode ?? RecurringInvoiceDateMode.RUN_DATE;

    if (endDate && endDate < startDate) {
      throw new BadRequestException("End date cannot be before start date.");
    }
    if (nextRunDate < startDate) {
      throw new BadRequestException("Next run date cannot be before start date.");
    }
    if (endDate && nextRunDate > endDate) {
      throw new BadRequestException("Next run date cannot be after end date.");
    }
    if (!Object.values(RecurringInvoiceFrequency).includes(frequency)) {
      throw new BadRequestException("Invalid recurring invoice frequency.");
    }
    if (!Number.isInteger(interval) || interval < 1) {
      throw new BadRequestException("Recurring invoice interval must be a positive integer.");
    }
    if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0) {
      throw new BadRequestException("Payment terms days must be zero or greater.");
    }
    if (invoiceDateMode !== RecurringInvoiceDateMode.RUN_DATE) {
      throw new BadRequestException("Only run-date invoice dating is supported in this sprint.");
    }

    return {
      startDate,
      endDate,
      nextRunDate,
      frequency,
      interval,
      dayOfMonth: dto.dayOfMonth ?? null,
      dayOfWeek: dto.dayOfWeek ?? null,
      monthOfYear: dto.monthOfYear ?? null,
      invoiceDateMode,
      paymentTermsDays,
    };
  }

  private periodForRun(runDate: Date, frequency: RecurringInvoiceFrequency, interval: number) {
    const nextDate = advanceRunDate(runDate, frequency, interval);
    return {
      startDate: runDate,
      endDate: addUtcDays(nextDate, -1),
    };
  }

  private assertDraft(status: RecurringInvoiceTemplateStatus): void {
    if (status !== RecurringInvoiceTemplateStatus.DRAFT) {
      throw new BadRequestException("Only draft recurring invoice templates can be edited.");
    }
  }

  private assertGeneratable(status: RecurringInvoiceTemplateStatus): void {
    if (status !== RecurringInvoiceTemplateStatus.ACTIVE) {
      throw new BadRequestException("Only active recurring invoice templates can generate draft invoices.");
    }
  }

  private cleanStatus(status: string): RecurringInvoiceTemplateStatus {
    const candidate = status.trim().toUpperCase();
    if (!Object.values(RecurringInvoiceTemplateStatus).includes(candidate as RecurringInvoiceTemplateStatus)) {
      throw new BadRequestException("Invalid recurring invoice template status filter.");
    }
    return candidate as RecurringInvoiceTemplateStatus;
  }

  private cleanFrequency(frequency: string): RecurringInvoiceFrequency {
    const candidate = frequency.trim().toUpperCase();
    if (!Object.values(RecurringInvoiceFrequency).includes(candidate as RecurringInvoiceFrequency)) {
      throw new BadRequestException("Invalid recurring invoice frequency filter.");
    }
    return candidate as RecurringInvoiceFrequency;
  }

  private toTemplateLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.RecurringInvoiceTemplateLineCreateWithoutTemplateInput[] {
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

  private toInvoiceLineCreateMany(organizationId: string, lines: PersistedRecurringLine[]): Prisma.SalesInvoiceLineCreateWithoutInvoiceInput[] {
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

  private auditTemplateSnapshot(template: any) {
    const lines = Array.isArray(template.lines) ? template.lines : [];
    return {
      id: template.id,
      templateNumber: template.templateNumber,
      name: template.name,
      customerId: template.customerId,
      status: template.status,
      startDate: template.startDate,
      endDate: template.endDate,
      nextRunDate: template.nextRunDate,
      lastRunDate: template.lastRunDate,
      frequency: template.frequency,
      interval: template.interval,
      paymentTermsDays: template.paymentTermsDays,
      currency: template.currency,
      taxMode: template.taxMode,
      subtotal: String(template.subtotal ?? "0"),
      discountTotal: String(template.discountTotal ?? "0"),
      taxableTotal: String(template.taxableTotal ?? "0"),
      taxTotal: String(template.taxTotal ?? "0"),
      total: String(template.total ?? "0"),
      lineCount: lines.length,
    };
  }

  private cleanOptional(value: string | undefined | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private requiredText(value: string | undefined | null, message: string): string {
    const trimmed = this.cleanOptional(value);
    if (!trimmed) {
      throw new BadRequestException(message);
    }
    return trimmed;
  }
}

export function advanceRunDate(date: Date, frequency: RecurringInvoiceFrequency, interval: number): Date {
  if (frequency === RecurringInvoiceFrequency.WEEKLY) {
    return addUtcDays(date, 7 * interval);
  }
  if (frequency === RecurringInvoiceFrequency.MONTHLY) {
    return addUtcMonths(date, interval);
  }
  if (frequency === RecurringInvoiceFrequency.QUARTERLY) {
    return addUtcMonths(date, 3 * interval);
  }
  return addUtcMonths(date, 12 * interval);
}

export function nextOccurrences(startDate: Date, frequency: RecurringInvoiceFrequency, interval: number, endDate: Date | null, count: number): Date[] {
  const dates: Date[] = [];
  let cursor = startDate;
  while (dates.length < count) {
    if (endDate && cursor > endDate) {
      break;
    }
    dates.push(cursor);
    cursor = advanceRunDate(cursor, frequency, interval);
  }
  return dates;
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function addUtcMonths(date: Date, months: number): Date {
  const targetMonthIndex = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(date.getUTCDate(), lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function dateFrom(value: string | Date, label: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} is invalid.`);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

function moneyString(value: unknown): string {
  return value && typeof value === "object" && "toString" in value ? String((value as { toString(): string }).toString()) : String(value ?? "0.0000");
}
