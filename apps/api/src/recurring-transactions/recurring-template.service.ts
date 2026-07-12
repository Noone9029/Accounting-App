import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountingRuleError, calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import {
  ContactType,
  DimensionStatus,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  RecurringCatchUpPolicy,
  RecurringExchangeRatePolicy,
  RecurringGenerationMode,
  RecurringTransactionStatus,
  RecurringTransactionType,
  SalesInvoiceTaxMode,
} from "@prisma/client";
import Decimal from "decimal.js";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRecurringTransactionDto } from "./dto/create-recurring-transaction.dto";
import { RecurringTransactionLineDto } from "./dto/recurring-transaction-line.dto";
import { UpdateRecurringTransactionDto } from "./dto/update-recurring-transaction.dto";
import { firstOccurrence, type RecurringSchedule } from "./recurring-schedule";

const templateInclude = {
  party: { select: { id: true, name: true, displayName: true, type: true, isActive: true } },
  branch: { select: { id: true, name: true, displayName: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, sku: true, name: true, status: true } },
      account: { select: { id: true, code: true, name: true, isActive: true, allowPosting: true } },
      taxRate: { select: { id: true, name: true, rate: true, isActive: true } },
      costCenter: { select: { id: true, code: true, name: true, status: true } },
      project: { select: { id: true, code: true, name: true, status: true } },
    },
  },
  runs: { orderBy: { createdAt: "desc" as const }, take: 1 },
} satisfies Prisma.RecurringTransactionTemplateInclude;

type Executor = Prisma.TransactionClient;

interface PreparedLine {
  itemId: string | null;
  accountId: string;
  taxRateId: string | null;
  costCenterId: string | null;
  projectId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  debit: string;
  credit: string;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
}

interface PreparedTemplate {
  lines: PreparedLine[];
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
}

@Injectable()
export class RecurringTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly numberSequence: NumberSequenceService,
  ) {}

  async create(organizationId: string, actorUserId: string, dto: CreateRecurringTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, timezone: true, baseCurrency: true },
      });
      if (!organization) {
        throw new NotFoundException("Organization not found.");
      }

      const normalized = this.normalizeInput(dto, organization.timezone, organization.baseCurrency);
      const prepared = await this.prepareLines(tx, organizationId, normalized);
      await this.validateHeaderReferences(tx, organizationId, normalized);
      await this.validateFxPolicy(tx, organizationId, organization.baseCurrency, normalized);
      const occurrence = firstOccurrence(this.toSchedule(normalized));
      const templateCode = await this.numberSequence.next(organizationId, NumberSequenceScope.RECURRING_INVOICE_TEMPLATE, tx);

      const template = await tx.recurringTransactionTemplate.create({
        data: {
          organizationId,
          transactionType: normalized.transactionType,
          templateCode,
          name: normalized.name,
          description: normalized.description,
          status: RecurringTransactionStatus.DRAFT,
          timezone: normalized.timezone,
          frequency: normalized.frequency,
          interval: normalized.interval,
          dayOfWeek: normalized.dayOfWeek,
          dayOfMonth: normalized.dayOfMonth,
          monthOfYear: normalized.monthOfYear,
          startDate: this.dateOnly(normalized.startDate),
          endDate: normalized.endDate ? this.dateOnly(normalized.endDate) : null,
          nextRunAt: occurrence.scheduledFor,
          catchUpPolicy: normalized.catchUpPolicy,
          generationMode: RecurringGenerationMode.DRAFT_ONLY,
          templateVersion: 1,
          currencyCode: normalized.currencyCode,
          exchangeRatePolicy: normalized.exchangeRatePolicy,
          fixedExchangeRate: normalized.fixedExchangeRate,
          rateSnapshotId: normalized.rateSnapshotId,
          partyId: normalized.partyId,
          branchId: normalized.branchId,
          paidThroughAccountId: normalized.paidThroughAccountId,
          paymentTermsDays: normalized.paymentTermsDays,
          reference: normalized.reference,
          notes: normalized.notes,
          terms: normalized.terms,
          taxMode: normalized.taxMode,
          inventoryPostingMode: normalized.inventoryPostingMode,
          subtotal: prepared.subtotal,
          discountTotal: prepared.discountTotal,
          taxableTotal: prepared.taxableTotal,
          taxTotal: prepared.taxTotal,
          total: prepared.total,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          lines: { create: prepared.lines.map((line) => ({ organizationId, ...line })) },
        },
        include: templateInclude,
      });

      await this.auditLog.log(
        {
          organizationId,
          actorUserId,
          action: "CREATE",
          entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_TEMPLATE,
          entityId: template.id,
          after: this.auditSnapshot(template),
        },
        tx,
      );
      return template;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateRecurringTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.recurringTransactionTemplate.findFirst({ where: { id, organizationId }, include: templateInclude });
      if (!existing) throw new NotFoundException("Recurring transaction template not found.");
      if (existing.status === RecurringTransactionStatus.ARCHIVED || existing.status === RecurringTransactionStatus.COMPLETED) {
        throw new BadRequestException("Archived or completed recurring templates cannot be edited.");
      }
      if (dto.expectedVersion !== existing.templateVersion) {
        throw new ConflictException("Recurring template changed while editing. Reload and retry.");
      }
      if (dto.transactionType && dto.transactionType !== existing.transactionType) {
        throw new BadRequestException("Recurring transaction type cannot be changed after creation.");
      }

      const patchKeys = Object.keys(dto).filter((key) => key !== "expectedVersion" && dto[key as keyof UpdateRecurringTransactionDto] !== undefined);
      if (patchKeys.length === 0) return existing;

      const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { id: true, timezone: true, baseCurrency: true } });
      if (!organization) throw new NotFoundException("Organization not found.");
      const merged = this.mergeExisting(existing, dto);
      const normalized = this.normalizeInput(merged, organization.timezone, organization.baseCurrency);
      const prepared = await this.prepareLines(tx, organizationId, normalized);
      await this.validateHeaderReferences(tx, organizationId, normalized);
      await this.validateFxPolicy(tx, organizationId, organization.baseCurrency, normalized);

      const claim = await tx.recurringTransactionTemplate.updateMany({
        where: { id, organizationId, templateVersion: dto.expectedVersion },
        data: { updatedAt: existing.updatedAt },
      });
      if (claim.count !== 1) throw new ConflictException("Recurring template changed while editing. Reload and retry.");
      if (dto.lines) {
        await tx.recurringTransactionTemplateLine.deleteMany({ where: { organizationId, templateId: id } });
      }

      const scheduleChanged = this.scheduleChanged(dto);
      const updateData = {
        name: normalized.name,
        description: normalized.description,
        timezone: normalized.timezone,
        frequency: normalized.frequency,
        interval: normalized.interval,
        dayOfWeek: normalized.dayOfWeek,
        dayOfMonth: normalized.dayOfMonth,
        monthOfYear: normalized.monthOfYear,
        startDate: this.dateOnly(normalized.startDate),
        endDate: normalized.endDate ? this.dateOnly(normalized.endDate) : null,
        nextRunAt: undefined as Date | undefined,
        catchUpPolicy: normalized.catchUpPolicy,
        templateVersion: { increment: 1 },
        currencyCode: normalized.currencyCode,
        exchangeRatePolicy: normalized.exchangeRatePolicy,
        fixedExchangeRate: normalized.fixedExchangeRate,
        rateSnapshotId: normalized.rateSnapshotId,
        partyId: normalized.partyId,
        branchId: normalized.branchId,
        paidThroughAccountId: normalized.paidThroughAccountId,
        paymentTermsDays: normalized.paymentTermsDays,
        reference: normalized.reference,
        notes: normalized.notes,
        terms: normalized.terms,
        taxMode: normalized.taxMode,
        inventoryPostingMode: normalized.inventoryPostingMode,
        subtotal: prepared.subtotal,
        discountTotal: prepared.discountTotal,
        taxableTotal: prepared.taxableTotal,
        taxTotal: prepared.taxTotal,
        total: prepared.total,
        updatedByUserId: actorUserId,
        lines: dto.lines ? { create: prepared.lines.map((line) => ({ organizationId, ...line })) } : undefined,
      };
      if (dto.startDate !== undefined || dto.timezone !== undefined) {
        updateData.nextRunAt = firstOccurrence(this.toSchedule(normalized)).scheduledFor;
      }
      const updated = await tx.recurringTransactionTemplate.update({ where: { id }, data: updateData, include: templateInclude });

      await this.auditLog.log({ organizationId, actorUserId, action: "UPDATE", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_TEMPLATE, entityId: id, before: this.auditSnapshot(existing), after: this.auditSnapshot(updated) }, tx);
      if (scheduleChanged) {
        await this.auditLog.log({ organizationId, actorUserId, action: "SCHEDULE_CHANGE", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_TEMPLATE, entityId: id, before: this.scheduleSnapshot(existing), after: this.scheduleSnapshot(updated) }, tx);
      }
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  activate(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, [RecurringTransactionStatus.DRAFT], RecurringTransactionStatus.ACTIVE, "ACTIVATE");
  }

  pause(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, [RecurringTransactionStatus.ACTIVE], RecurringTransactionStatus.PAUSED, "PAUSE");
  }

  resume(organizationId: string, actorUserId: string, id: string) {
    return this.transition(organizationId, actorUserId, id, [RecurringTransactionStatus.PAUSED], RecurringTransactionStatus.ACTIVE, "RESUME");
  }

  archive(organizationId: string, actorUserId: string, id: string) {
    return this.transition(
      organizationId,
      actorUserId,
      id,
      [RecurringTransactionStatus.DRAFT, RecurringTransactionStatus.ACTIVE, RecurringTransactionStatus.PAUSED, RecurringTransactionStatus.COMPLETED],
      RecurringTransactionStatus.ARCHIVED,
      "ARCHIVE",
    );
  }

  private async transition(organizationId: string, actorUserId: string, id: string, allowed: RecurringTransactionStatus[], status: RecurringTransactionStatus, action: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.recurringTransactionTemplate.findFirst({ where: { id, organizationId }, include: templateInclude });
      if (!existing) throw new NotFoundException("Recurring transaction template not found.");
      if (!allowed.includes(existing.status)) throw new BadRequestException(`Recurring template cannot ${action.toLowerCase()} from ${existing.status}.`);
      if (status === RecurringTransactionStatus.ACTIVE) {
        const organization = await tx.organization.findUnique({
          where: { id: organizationId },
          select: { id: true, timezone: true, baseCurrency: true },
        });
        if (!organization) throw new NotFoundException("Organization not found.");
        const normalized = this.normalizeInput(
          this.mergeExisting(existing, { expectedVersion: existing.templateVersion }),
          organization.timezone,
          organization.baseCurrency,
        );
        await this.prepareLines(tx, organizationId, normalized);
        await this.validateHeaderReferences(tx, organizationId, normalized);
        await this.validateFxPolicy(tx, organizationId, organization.baseCurrency, normalized);
      }
      const updated = await tx.recurringTransactionTemplate.update({
        where: { id },
        data: { status, archivedAt: status === RecurringTransactionStatus.ARCHIVED ? new Date() : undefined, updatedByUserId: actorUserId },
        include: templateInclude,
      });
      await this.auditLog.log({ organizationId, actorUserId, action, entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_TEMPLATE, entityId: id, before: this.auditSnapshot(existing), after: this.auditSnapshot(updated) }, tx);
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private normalizeInput(dto: CreateRecurringTransactionDto, organizationTimezone: string, baseCurrency: string): CreateRecurringTransactionDto & Required<Pick<CreateRecurringTransactionDto, "timezone" | "catchUpPolicy" | "paymentTermsDays">> {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException("Recurring template name is required.");
    const timezone = dto.timezone?.trim() || organizationTimezone;
    const currencyCode = dto.currencyCode?.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCode)) throw new BadRequestException("Recurring template currency must be a three-letter code.");
    const normalized = {
      ...dto,
      name,
      description: this.clean(dto.description),
      timezone,
      interval: dto.interval ?? 1,
      dayOfMonth: dto.dayOfMonth ?? null,
      dayOfWeek: dto.dayOfWeek ?? null,
      monthOfYear: dto.monthOfYear ?? null,
      endDate: dto.endDate ?? null,
      catchUpPolicy: dto.catchUpPolicy ?? RecurringCatchUpPolicy.SKIP_MISSED,
      currencyCode,
      fixedExchangeRate: this.clean(dto.fixedExchangeRate),
      rateSnapshotId: this.clean(dto.rateSnapshotId),
      partyId: this.clean(dto.partyId),
      branchId: this.clean(dto.branchId),
      paidThroughAccountId: this.clean(dto.paidThroughAccountId),
      paymentTermsDays: dto.paymentTermsDays ?? 0,
      reference: this.clean(dto.reference),
      notes: this.clean(dto.notes),
      terms: this.clean(dto.terms),
      taxMode: dto.taxMode ?? (dto.transactionType === RecurringTransactionType.SALES_INVOICE ? SalesInvoiceTaxMode.TAX_EXCLUSIVE : undefined),
    };
    if (dto.transactionType === RecurringTransactionType.MANUAL_JOURNAL && (currencyCode !== baseCurrency.toUpperCase() || dto.exchangeRatePolicy !== RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY)) {
      throw new BadRequestException("Foreign-currency recurring journals are not enabled; use the organization base currency at rate one.");
    }
    return normalized;
  }

  private async prepareLines(tx: Executor, organizationId: string, dto: CreateRecurringTransactionDto): Promise<PreparedTemplate> {
    if (!dto.lines?.length) throw new BadRequestException("Recurring templates require at least one line.");
    const accountIds = [...new Set([...dto.lines.map((line) => line.accountId), ...(dto.paidThroughAccountId ? [dto.paidThroughAccountId] : [])])];
    const accounts = await tx.account.findMany({ where: { organizationId, id: { in: accountIds }, isActive: true, allowPosting: true }, select: { id: true, isActive: true, allowPosting: true } });
    if (accounts.length !== accountIds.length) throw new BadRequestException("One or more recurring line or paid-through accounts are missing, inactive, or non-posting.");
    await this.assertActiveCatalog(tx.item, organizationId, dto.lines.map((line) => line.itemId), { status: ItemStatus.ACTIVE }, "item");
    await this.assertActiveCatalog(tx.costCenter, organizationId, dto.lines.map((line) => line.costCenterId), { status: DimensionStatus.ACTIVE }, "cost center");
    await this.assertActiveCatalog(tx.project, organizationId, dto.lines.map((line) => line.projectId), { status: DimensionStatus.ACTIVE }, "project");

    const taxRateIds = [...new Set(dto.lines.map((line) => line.taxRateId).filter((value): value is string => Boolean(value)))];
    const taxRates = taxRateIds.length ? await tx.taxRate.findMany({ where: { organizationId, id: { in: taxRateIds }, isActive: true }, select: { id: true, rate: true } }) : [];
    if (taxRates.length !== taxRateIds.length) throw new BadRequestException("One or more recurring tax rates are missing or inactive.");
    const taxRateById = new Map(taxRates.map((rate) => [rate.id, String(rate.rate)]));

    if (dto.transactionType === RecurringTransactionType.MANUAL_JOURNAL) {
      const prepared = dto.lines.map((line, index) => this.prepareJournalLine(line, index));
      const debit = prepared.reduce((sum, line) => sum.plus(line.debit), new Decimal(0));
      const credit = prepared.reduce((sum, line) => sum.plus(line.credit), new Decimal(0));
      if (debit.lte(0) || !debit.equals(credit)) throw new BadRequestException("Recurring manual journal template debit and credit totals must balance and be greater than zero.");
      return { lines: prepared, subtotal: "0", discountTotal: "0", taxableTotal: "0", taxTotal: "0", total: debit.toFixed(4) };
    }

    try {
      const taxMode = dto.taxMode ?? SalesInvoiceTaxMode.TAX_EXCLUSIVE;
      const totals = calculateSalesInvoiceTotals(dto.lines.map((line) => ({
        quantity: line.quantity ?? "1",
        unitPrice: line.unitPrice ?? "0",
        discountRate: line.discountRate ?? "0",
        taxRate: line.taxRateId ? taxRateById.get(line.taxRateId) ?? "0" : "0",
      })), taxMode);
      return {
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxableTotal: totals.taxableTotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        lines: dto.lines.map((line, index) => {
          const calculated = totals.lines[index];
          if (!calculated) throw new BadRequestException("Unable to calculate recurring template line totals.");
          return {
            itemId: this.clean(line.itemId), accountId: line.accountId, taxRateId: this.clean(line.taxRateId), costCenterId: this.clean(line.costCenterId), projectId: this.clean(line.projectId),
            description: this.required(line.description, `Recurring template line ${index + 1} requires a description.`),
            quantity: calculated.quantity, unitPrice: calculated.unitPrice, discountRate: calculated.discountRate,
            debit: "0", credit: "0", lineGrossAmount: calculated.lineGrossAmount, discountAmount: calculated.discountAmount,
            taxableAmount: calculated.taxableAmount, taxAmount: calculated.taxAmount, lineTotal: calculated.lineTotal, sortOrder: line.sortOrder ?? index,
          };
        }),
      };
    } catch (error) {
      if (error instanceof AccountingRuleError) throw new BadRequestException({ code: error.code, message: error.message });
      throw error;
    }
  }

  private prepareJournalLine(line: RecurringTransactionLineDto, index: number): PreparedLine {
    const debit = new Decimal(line.debit ?? 0);
    const credit = new Decimal(line.credit ?? 0);
    if (debit.isNegative() || credit.isNegative() || (debit.gt(0) === credit.gt(0))) throw new BadRequestException(`Recurring journal line ${index + 1} must contain either a positive debit or a positive credit.`);
    return { itemId: null, accountId: line.accountId, taxRateId: null, costCenterId: this.clean(line.costCenterId), projectId: this.clean(line.projectId), description: this.required(line.description, `Recurring journal line ${index + 1} requires a description.`), quantity: "1", unitPrice: "0", discountRate: "0", debit: debit.toFixed(4), credit: credit.toFixed(4), lineGrossAmount: "0", discountAmount: "0", taxableAmount: "0", taxAmount: "0", lineTotal: "0", sortOrder: line.sortOrder ?? index };
  }

  private async validateHeaderReferences(tx: Executor, organizationId: string, dto: CreateRecurringTransactionDto) {
    if (dto.transactionType === RecurringTransactionType.SALES_INVOICE || dto.transactionType === RecurringTransactionType.PURCHASE_BILL) {
      if (!dto.partyId) throw new BadRequestException(dto.transactionType === RecurringTransactionType.SALES_INVOICE ? "Customer is required." : "Supplier is required.");
      const acceptedTypes = dto.transactionType === RecurringTransactionType.SALES_INVOICE ? [ContactType.CUSTOMER, ContactType.BOTH] : [ContactType.SUPPLIER, ContactType.BOTH];
      const party = await tx.contact.findFirst({ where: { id: dto.partyId, organizationId, isActive: true, type: { in: acceptedTypes } }, select: { id: true } });
      if (!party) throw new BadRequestException(dto.transactionType === RecurringTransactionType.SALES_INVOICE ? "Customer is missing, inactive, or belongs to another organization." : "Supplier is missing, inactive, or belongs to another organization.");
    } else if (dto.partyId) {
      const party = await tx.contact.findFirst({ where: { id: dto.partyId, organizationId, isActive: true }, select: { id: true } });
      if (!party) throw new BadRequestException("Expense contact is missing, inactive, or belongs to another organization.");
    }
    if (dto.transactionType === RecurringTransactionType.EXPENSE && !dto.paidThroughAccountId) throw new BadRequestException("Recurring expense proposals require an expected paid-through account.");
    if (dto.branchId) {
      const branch = await tx.branch.findFirst({ where: { id: dto.branchId, organizationId }, select: { id: true } });
      if (!branch) throw new BadRequestException("Branch is missing or belongs to another organization.");
    }
  }

  private async validateFxPolicy(tx: Executor, organizationId: string, baseCurrency: string, dto: CreateRecurringTransactionDto) {
    const currency = dto.currencyCode.toUpperCase();
    const base = baseCurrency.toUpperCase();
    if (dto.exchangeRatePolicy === RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY) {
      if (currency !== base || dto.fixedExchangeRate || dto.rateSnapshotId) throw new BadRequestException("Base-currency-only recurring templates must use the organization base currency at rate one.");
      return;
    }
    if (currency === base) throw new BadRequestException("Same-currency recurring templates must use the base-currency-only rate policy.");
    if (dto.exchangeRatePolicy === RecurringExchangeRatePolicy.FIXED_TEMPLATE_RATE) {
      if (!dto.fixedExchangeRate || new Decimal(dto.fixedExchangeRate).lte(0) || dto.rateSnapshotId) throw new BadRequestException("Fixed recurring FX policy requires one explicit positive rate and no snapshot.");
      return;
    }
    if (dto.exchangeRatePolicy === RecurringExchangeRatePolicy.RATE_SNAPSHOT) {
      if (!dto.rateSnapshotId || dto.fixedExchangeRate) throw new BadRequestException("Snapshot recurring FX policy requires one tenant rate snapshot.");
      const snapshot = await tx.currencyRateSnapshot.findFirst({ where: { id: dto.rateSnapshotId, organizationId, transactionCurrency: currency, baseCurrency: base }, select: { id: true } });
      if (!snapshot) throw new BadRequestException("Recurring FX rate snapshot is missing, stale, mismatched, or belongs to another organization.");
      return;
    }
    if (dto.fixedExchangeRate || dto.rateSnapshotId) throw new BadRequestException("Rate-at-run policy cannot retain a fixed rate or snapshot.");
  }

  private async assertActiveCatalog(delegate: { findMany(args: any): Promise<Array<{ id: string }>> }, organizationId: string, values: Array<string | null | undefined>, active: object, label: string) {
    const ids = [...new Set(values.filter((value): value is string => Boolean(value)))];
    if (!ids.length) return;
    const rows = await delegate.findMany({ where: { organizationId, id: { in: ids }, ...active }, select: { id: true } });
    if (rows.length !== ids.length) throw new BadRequestException(`One or more recurring ${label} references are missing, archived, inactive, or belong to another organization.`);
  }

  private mergeExisting(existing: any, dto: UpdateRecurringTransactionDto): CreateRecurringTransactionDto {
    return {
      transactionType: existing.transactionType,
      name: dto.name ?? existing.name,
      description: dto.description === undefined ? existing.description : dto.description,
      timezone: dto.timezone ?? existing.timezone,
      frequency: dto.frequency ?? existing.frequency,
      interval: dto.interval ?? existing.interval,
      startDate: dto.startDate ?? this.toDateString(existing.startDate),
      endDate: dto.endDate === undefined ? (existing.endDate ? this.toDateString(existing.endDate) : null) : dto.endDate,
      dayOfMonth: dto.dayOfMonth === undefined ? existing.dayOfMonth : dto.dayOfMonth,
      dayOfWeek: dto.dayOfWeek === undefined ? existing.dayOfWeek : dto.dayOfWeek,
      monthOfYear: dto.monthOfYear === undefined ? existing.monthOfYear : dto.monthOfYear,
      catchUpPolicy: dto.catchUpPolicy ?? existing.catchUpPolicy,
      currencyCode: dto.currencyCode ?? existing.currencyCode,
      exchangeRatePolicy: dto.exchangeRatePolicy ?? existing.exchangeRatePolicy,
      fixedExchangeRate: dto.fixedExchangeRate === undefined ? (existing.fixedExchangeRate ? String(existing.fixedExchangeRate) : null) : dto.fixedExchangeRate,
      rateSnapshotId: dto.rateSnapshotId === undefined ? existing.rateSnapshotId : dto.rateSnapshotId,
      partyId: dto.partyId === undefined ? existing.partyId : dto.partyId,
      branchId: dto.branchId === undefined ? existing.branchId : dto.branchId,
      paidThroughAccountId: dto.paidThroughAccountId === undefined ? existing.paidThroughAccountId : dto.paidThroughAccountId,
      paymentTermsDays: dto.paymentTermsDays ?? existing.paymentTermsDays,
      reference: dto.reference === undefined ? existing.reference : dto.reference,
      notes: dto.notes === undefined ? existing.notes : dto.notes,
      terms: dto.terms === undefined ? existing.terms : dto.terms,
      taxMode: dto.taxMode ?? existing.taxMode ?? undefined,
      inventoryPostingMode: dto.inventoryPostingMode ?? existing.inventoryPostingMode ?? undefined,
      lines: dto.lines ?? existing.lines.map((line: any) => ({ itemId: line.itemId, accountId: line.accountId, taxRateId: line.taxRateId, costCenterId: line.costCenterId, projectId: line.projectId, description: line.description, quantity: String(line.quantity), unitPrice: String(line.unitPrice), discountRate: String(line.discountRate), debit: String(line.debit), credit: String(line.credit), sortOrder: line.sortOrder })),
    };
  }

  private toSchedule(dto: CreateRecurringTransactionDto): RecurringSchedule {
    return { timeZone: dto.timezone!, frequency: dto.frequency, interval: dto.interval, anchorDate: dto.startDate, endDate: dto.endDate ?? null, dayOfMonth: dto.dayOfMonth ?? null, dayOfWeek: dto.dayOfWeek ?? null, monthOfYear: dto.monthOfYear ?? null };
  }

  private scheduleChanged(dto: UpdateRecurringTransactionDto): boolean {
    return ["timezone", "frequency", "interval", "startDate", "endDate", "dayOfMonth", "dayOfWeek", "monthOfYear", "catchUpPolicy"].some((key) => dto[key as keyof UpdateRecurringTransactionDto] !== undefined);
  }

  private auditSnapshot(template: any) { return { id: template.id, templateCode: template.templateCode, transactionType: template.transactionType, name: template.name, status: template.status, timezone: template.timezone, frequency: template.frequency, interval: template.interval, nextRunAt: template.nextRunAt, templateVersion: template.templateVersion, currencyCode: template.currencyCode, exchangeRatePolicy: template.exchangeRatePolicy, lineCount: Array.isArray(template.lines) ? template.lines.length : 0 }; }
  private scheduleSnapshot(template: any) { return { timezone: template.timezone, frequency: template.frequency, interval: template.interval, dayOfWeek: template.dayOfWeek, dayOfMonth: template.dayOfMonth, monthOfYear: template.monthOfYear, startDate: template.startDate, endDate: template.endDate, nextRunAt: template.nextRunAt, catchUpPolicy: template.catchUpPolicy, templateVersion: template.templateVersion }; }
  private clean(value: string | null | undefined): string | null { const cleaned = value?.trim(); return cleaned || null; }
  private required(value: string | null | undefined, message: string): string { const cleaned = this.clean(value); if (!cleaned) throw new BadRequestException(message); return cleaned; }
  private dateOnly(value: string): Date { return new Date(`${value.slice(0, 10)}T00:00:00.000Z`); }
  private toDateString(value: Date | string): string { return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10); }
}
