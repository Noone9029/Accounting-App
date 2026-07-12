import { BadRequestException, Injectable } from "@nestjs/common";
import {
  RecurringCatchUpPolicy,
  RecurringExchangeRatePolicy,
  RecurringFrequency,
  RecurringInvoiceDateMode,
  RecurringInvoiceFrequency,
  RecurringInvoiceTemplateStatus,
  RecurringRunStatus,
  RecurringTransactionStatus,
  RecurringTransactionType,
  SalesInvoiceTaxMode,
} from "@prisma/client";
import { NumberSequenceScope } from "@prisma/client";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { RecurringRunService } from "../recurring-transactions/recurring-run.service";
import { RecurringTemplateService } from "../recurring-transactions/recurring-template.service";
import { CreateRecurringInvoiceDto } from "./dto/create-recurring-invoice.dto";
import { UpdateRecurringInvoiceDto } from "./dto/update-recurring-invoice.dto";

@Injectable()
export class RecurringInvoiceCompatibilityService {
  constructor(
    private readonly templates: RecurringTemplateService,
    private readonly runs: RecurringRunService,
    private readonly numberSequence: NumberSequenceService,
    private readonly prisma: PrismaService,
  ) {}

  async list(organizationId: string, filters: { status?: string; customerId?: string; frequency?: string } = {}) {
    const result = await this.templates.list(organizationId, {
      transactionType: RecurringTransactionType.SALES_INVOICE,
      status: filters.status ? this.genericStatus(filters.status) : undefined,
      partyId: filters.customerId?.trim() || undefined,
      page: 1,
      limit: 100,
    });
    const frequency = filters.frequency?.trim().toUpperCase();
    return result.items
      .filter((template) => !frequency || template.frequency === frequency)
      .map((template) => this.legacyTemplate(template));
  }

  async nextNumberPreview(organizationId: string) {
    const preview = await this.numberSequence.preview(organizationId, NumberSequenceScope.RECURRING_INVOICE_TEMPLATE);
    return {
      ...preview,
      templateNumber: preview.exampleNextNumber,
      editable: false,
      overrideAllowed: false,
      policy: "SEQUENCE_ASSIGNED_ON_CREATE",
      helperText: "Preview only. The recurring template number is assigned when the draft template is saved.",
    };
  }

  async get(organizationId: string, id: string) {
    return this.legacyTemplate(await this.salesTemplate(organizationId, id));
  }

  async create(organizationId: string, actorUserId: string, dto: CreateRecurringInvoiceDto) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { baseCurrency: true } });
    if (!organization) throw new BadRequestException("Organization not found.");
    const currencyCode = (dto.currency ?? organization.baseCurrency).toUpperCase();
    if (currencyCode !== organization.baseCurrency.toUpperCase()) {
      throw new BadRequestException("Legacy recurring invoice routes support base-currency templates only. Use recurring transactions for explicit FX policies.");
    }
    const lines = await this.resolveLegacyLines(organizationId, dto.lines);
    const created = await this.templates.create(organizationId, actorUserId, {
      transactionType: RecurringTransactionType.SALES_INVOICE,
      name: dto.name,
      timezone: undefined,
      frequency: dto.frequency as unknown as RecurringFrequency,
      interval: dto.interval ?? 1,
      startDate: dto.nextRunDate.slice(0, 10),
      endDate: dto.endDate?.slice(0, 10) ?? null,
      dayOfMonth: dto.dayOfMonth,
      dayOfWeek: dto.dayOfWeek,
      monthOfYear: dto.monthOfYear,
      catchUpPolicy: RecurringCatchUpPolicy.SKIP_MISSED,
      currencyCode,
      exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
      partyId: dto.customerId,
      branchId: dto.branchId,
      paymentTermsDays: dto.paymentTermsDays ?? 0,
      reference: dto.reference,
      notes: dto.notes,
      terms: dto.terms,
      taxMode: dto.taxMode ?? SalesInvoiceTaxMode.TAX_EXCLUSIVE,
      lines,
    });
    return this.legacyTemplate(created);
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateRecurringInvoiceDto) {
    const current = await this.salesTemplate(organizationId, id);
    if (dto.currency && dto.currency.toUpperCase() !== current.currencyCode) {
      throw new BadRequestException("Legacy recurring invoice routes cannot change FX policy. Use recurring transactions.");
    }
    const updated = await this.templates.update(organizationId, actorUserId, id, {
      expectedVersion: current.templateVersion,
      name: dto.name,
      frequency: dto.frequency as unknown as RecurringFrequency | undefined,
      interval: dto.interval,
      startDate: dto.nextRunDate?.slice(0, 10) ?? dto.startDate?.slice(0, 10),
      endDate: dto.endDate?.slice(0, 10) ?? dto.endDate,
      dayOfMonth: dto.dayOfMonth,
      dayOfWeek: dto.dayOfWeek,
      monthOfYear: dto.monthOfYear,
      partyId: dto.customerId,
      branchId: dto.branchId,
      paymentTermsDays: dto.paymentTermsDays,
      reference: dto.reference,
      notes: dto.notes,
      terms: dto.terms,
      taxMode: dto.taxMode,
      lines: dto.lines ? await this.resolveLegacyLines(organizationId, dto.lines) : undefined,
    });
    return this.legacyTemplate(updated);
  }

  async activate(organizationId: string, actorUserId: string, id: string) {
    const current = await this.salesTemplate(organizationId, id);
    if (current.status === RecurringTransactionStatus.ACTIVE) return this.legacyTemplate(current);
    return this.legacyTemplate(await this.templates.activate(organizationId, actorUserId, id));
  }

  async pause(organizationId: string, actorUserId: string, id: string) {
    const current = await this.salesTemplate(organizationId, id);
    if (current.status === RecurringTransactionStatus.PAUSED) return this.legacyTemplate(current);
    return this.legacyTemplate(await this.templates.pause(organizationId, actorUserId, id));
  }

  async resume(organizationId: string, actorUserId: string, id: string) {
    const current = await this.salesTemplate(organizationId, id);
    if (current.status === RecurringTransactionStatus.ACTIVE) return this.legacyTemplate(current);
    return this.legacyTemplate(await this.templates.resume(organizationId, actorUserId, id));
  }

  async end(organizationId: string, actorUserId: string, id: string) {
    await this.salesTemplate(organizationId, id);
    return this.legacyTemplate(await this.templates.archive(organizationId, actorUserId, id), RecurringInvoiceTemplateStatus.ENDED);
  }

  async cancel(organizationId: string, actorUserId: string, id: string) {
    await this.salesTemplate(organizationId, id);
    return this.legacyTemplate(await this.templates.archive(organizationId, actorUserId, id));
  }

  async preview(organizationId: string, id: string) {
    const template = await this.salesTemplate(organizationId, id);
    const legacy = this.legacyTemplate(template);
    return {
      templateId: template.id,
      templateNumber: template.templateCode,
      status: legacy.status,
      nextInvoiceDate: template.nextRunAt,
      dueDate: addDays(template.nextRunAt, template.paymentTermsDays),
      customer: template.party,
      taxMode: template.taxMode,
      subtotal: String(template.subtotal),
      discountTotal: String(template.discountTotal),
      taxableTotal: String(template.taxableTotal),
      taxTotal: String(template.taxTotal),
      total: String(template.total),
      lines: legacy.lines,
      nextOccurrences: [template.nextRunAt],
      blockers: template.status === RecurringTransactionStatus.ACTIVE ? [] : [`Template status is ${template.status}; only active templates can generate invoices.`],
      previewOnly: true,
    };
  }

  async generateNow(organizationId: string, actorUserId: string, id: string) {
    const template = await this.salesTemplate(organizationId, id);
    const key = `legacy:${id}:${template.nextRunAt.toISOString()}`;
    const run = await this.runs.runNow(organizationId, actorUserId, id, key, undefined, template.nextRunAt);
    const advanced = run.status === RecurringRunStatus.GENERATED
      ? await this.templates.advanceAfterLegacyRun(organizationId, actorUserId, id, template.nextRunAt)
      : template;
    return {
      template: this.legacyTemplate(advanced),
      invoice: run.generatedSalesInvoice ?? null,
      run: this.legacyRun(run),
      previousNextRunDate: template.nextRunAt,
      newNextRunDate: advanced.nextRunAt,
    };
  }

  private async salesTemplate(organizationId: string, id: string) {
    const template = await this.templates.get(organizationId, id);
    if (template.transactionType !== RecurringTransactionType.SALES_INVOICE) throw new BadRequestException("Legacy recurring invoice routes accept sales invoice templates only.");
    return template;
  }

  private async resolveLegacyLines(organizationId: string, lines: CreateRecurringInvoiceDto["lines"]) {
    const itemIds = [...new Set(lines.map((line) => line.itemId).filter((value): value is string => Boolean(value)))];
    const items = itemIds.length ? await this.prisma.item.findMany({ where: { organizationId, id: { in: itemIds } }, select: { id: true, name: true, description: true, revenueAccountId: true, salesTaxRateId: true } }) : [];
    const byId = new Map(items.map((item) => [item.id, item]));
    return lines.map((line) => {
      const item = line.itemId ? byId.get(line.itemId) : undefined;
      const accountId = line.accountId ?? item?.revenueAccountId;
      if (!accountId) throw new BadRequestException("Recurring invoice line requires an account or a tenant item with a revenue account.");
      if (line.itemId && !item) throw new BadRequestException("Recurring invoice item is missing or belongs to another organization.");
      return { itemId: line.itemId, accountId, taxRateId: line.taxRateId === undefined ? item?.salesTaxRateId : line.taxRateId, description: line.description ?? item?.description ?? item?.name ?? "Recurring invoice line", quantity: line.quantity, unitPrice: line.unitPrice, discountRate: line.discountRate, sortOrder: line.sortOrder };
    });
  }

  private legacyTemplate(template: any, statusOverride?: RecurringInvoiceTemplateStatus) {
    return {
      ...template,
      templateNumber: template.templateCode,
      customerId: template.partyId,
      customer: template.party,
      nextRunDate: template.nextRunAt,
      lastRunDate: template.lastRunAt,
      invoiceDateMode: RecurringInvoiceDateMode.RUN_DATE,
      currency: template.currencyCode,
      status: statusOverride ?? this.legacyStatus(template.status),
      lines: (template.lines ?? []).map((line: any) => ({ ...line, lineSubtotal: line.taxableAmount })),
      runs: (template.runs ?? []).map((run: any) => this.legacyRun(run)),
    };
  }

  private legacyRun(run: any) {
    return {
      ...run,
      runDate: run.scheduledLocalDate ?? run.scheduledFor,
      invoiceDate: run.scheduledLocalDate ?? run.scheduledFor,
      generatedInvoiceId: run.generatedSalesInvoiceId,
      generatedInvoice: run.generatedSalesInvoice,
      generatedById: null,
      generatedBy: null,
    };
  }

  private legacyStatus(status: RecurringTransactionStatus): RecurringInvoiceTemplateStatus {
    if (status === RecurringTransactionStatus.DRAFT) return RecurringInvoiceTemplateStatus.DRAFT;
    if (status === RecurringTransactionStatus.ACTIVE) return RecurringInvoiceTemplateStatus.ACTIVE;
    if (status === RecurringTransactionStatus.PAUSED) return RecurringInvoiceTemplateStatus.PAUSED;
    if (status === RecurringTransactionStatus.COMPLETED) return RecurringInvoiceTemplateStatus.ENDED;
    return RecurringInvoiceTemplateStatus.CANCELLED;
  }

  private genericStatus(value: string): RecurringTransactionStatus {
    const status = value.trim().toUpperCase();
    if (status === RecurringInvoiceTemplateStatus.DRAFT) return RecurringTransactionStatus.DRAFT;
    if (status === RecurringInvoiceTemplateStatus.ACTIVE) return RecurringTransactionStatus.ACTIVE;
    if (status === RecurringInvoiceTemplateStatus.PAUSED) return RecurringTransactionStatus.PAUSED;
    if (status === RecurringInvoiceTemplateStatus.ENDED) return RecurringTransactionStatus.COMPLETED;
    if (status === RecurringInvoiceTemplateStatus.CANCELLED) return RecurringTransactionStatus.ARCHIVED;
    throw new BadRequestException("Invalid recurring invoice template status filter.");
  }
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}
