import { BadRequestException, Injectable } from "@nestjs/common";
import {
  AccountType,
  CurrencyRateSource,
  ContactType,
  ItemStatus,
  JournalEntryStatus,
  Prisma,
  PurchaseBillStatus,
  RecurringExchangeRatePolicy,
  RecurringTransactionType,
  SalesInvoiceStatus,
  TaxRateScope,
} from "@prisma/client";
import { AccountingService } from "../accounting/accounting.service";
import { lockActiveDocumentLineDimensions } from "../accounting/document-line-dimensions";
import { PurchaseBillService } from "../purchase-bills/purchase-bill.service";
import { SalesInvoiceService } from "../sales-invoices/sales-invoice.service";
import type {
  RecurringGeneratedTarget,
  RecurringGenerationAdapter,
  RecurringGenerationContext,
} from "./recurring-generation.dispatcher";

interface TemplateLine {
  itemId?: string | null;
  accountId: string;
  taxRateId?: string | null;
  costCenterId?: string | null;
  projectId?: string | null;
  description: string;
  quantity: unknown;
  unitPrice: unknown;
  discountRate: unknown;
  debit: unknown;
  credit: unknown;
  lineGrossAmount?: unknown;
  discountAmount?: unknown;
  taxableAmount?: unknown;
  taxAmount?: unknown;
  lineTotal?: unknown;
  sortOrder: number;
}

interface GenerationTemplate {
  id: string;
  transactionType: RecurringTransactionType;
  partyId: string | null;
  branchId: string | null;
  paidThroughAccountId: string | null;
  paymentTermsDays: number;
  currencyCode: string;
  exchangeRatePolicy: RecurringExchangeRatePolicy;
  fixedExchangeRate: unknown | null;
  rateSnapshotId: string | null;
  taxMode?: any;
  inventoryPostingMode?: any;
  description: string | null;
  reference: string | null;
  notes: string | null;
  terms: string | null;
  createdByUserId: string | null;
  subtotal: unknown;
  discountTotal: unknown;
  taxableTotal: unknown;
  taxTotal: unknown;
  total: unknown;
  lines: TemplateLine[];
}

@Injectable()
export class RecurringSalesInvoiceAdapter implements RecurringGenerationAdapter {
  readonly transactionType = RecurringTransactionType.SALES_INVOICE;

  constructor(private readonly salesInvoices: SalesInvoiceService) {}

  async generate(context: RecurringGenerationContext, tx: Prisma.TransactionClient): Promise<RecurringGeneratedTarget> {
    const template = asTemplate(context);
    if (!template.partyId) throw new BadRequestException("Recurring sales invoice customer is missing.");
    const date = dateText(context.scheduledLocalDate);
    const invoice = await this.salesInvoices.createDraftInTransaction(
      context.organizationId,
      context.actorUserId ?? template.createdByUserId,
      {
        customerId: template.partyId,
        branchId: template.branchId,
        issueDate: date,
        dueDate: addDays(date, template.paymentTermsDays),
        notes: template.notes ?? undefined,
        terms: template.terms ?? undefined,
        taxMode: template.taxMode,
        ...documentFxInput(template, date),
        lines: documentLines(template.lines),
      },
      tx,
    );
    if (invoice.status !== SalesInvoiceStatus.DRAFT) throw new BadRequestException("Recurring sales invoice generation did not remain in draft.");
    return { generatedEntityType: "SALES_INVOICE", generatedEntityId: invoice.id, link: { generatedSalesInvoiceId: invoice.id } };
  }
}

@Injectable()
export class RecurringPurchaseBillAdapter implements RecurringGenerationAdapter {
  readonly transactionType = RecurringTransactionType.PURCHASE_BILL;

  constructor(private readonly purchaseBills: PurchaseBillService) {}

  async generate(context: RecurringGenerationContext, tx: Prisma.TransactionClient): Promise<RecurringGeneratedTarget> {
    const template = asTemplate(context);
    if (!template.partyId) throw new BadRequestException("Recurring purchase bill supplier is missing.");
    const date = dateText(context.scheduledLocalDate);
    const bill = await this.purchaseBills.createDraftInTransaction(
      context.organizationId,
      context.actorUserId ?? template.createdByUserId,
      {
        supplierId: template.partyId,
        branchId: template.branchId,
        billDate: date,
        dueDate: addDays(date, template.paymentTermsDays),
        notes: template.notes ?? undefined,
        terms: template.terms ?? undefined,
        inventoryPostingMode: template.inventoryPostingMode,
        ...documentFxInput(template, date),
        lines: documentLines(template.lines),
      },
      tx,
    );
    if (bill.status !== PurchaseBillStatus.DRAFT) throw new BadRequestException("Recurring purchase bill generation did not remain in draft.");
    return { generatedEntityType: "PURCHASE_BILL", generatedEntityId: bill.id, link: { generatedPurchaseBillId: bill.id } };
  }
}

@Injectable()
export class RecurringJournalAdapter implements RecurringGenerationAdapter {
  readonly transactionType = RecurringTransactionType.MANUAL_JOURNAL;

  constructor(private readonly accounting: AccountingService) {}

  async generate(context: RecurringGenerationContext, tx: Prisma.TransactionClient): Promise<RecurringGeneratedTarget> {
    const template = asTemplate(context);
    if (template.exchangeRatePolicy !== RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY) {
      throw new BadRequestException("Foreign-currency recurring manual journals are not enabled.");
    }
    const journal = await this.accounting.createDraftInTransaction(
      context.organizationId,
      context.actorUserId ?? template.createdByUserId,
      {
        entryDate: dateText(context.scheduledLocalDate),
        description: template.description?.trim() || "Recurring manual journal",
        reference: template.reference ?? undefined,
        currency: template.currencyCode,
        lines: template.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          debit: String(line.debit),
          credit: String(line.credit),
          currency: template.currencyCode,
          exchangeRate: "1",
          costCenterId: line.costCenterId ?? undefined,
          projectId: line.projectId ?? undefined,
        })),
      },
      tx,
    );
    if (journal.status !== JournalEntryStatus.DRAFT) throw new BadRequestException("Recurring journal generation did not remain in draft.");
    return { generatedEntityType: "MANUAL_JOURNAL", generatedEntityId: journal.id, link: { generatedJournalEntryId: journal.id } };
  }
}

@Injectable()
export class RecurringExpenseProposalAdapter implements RecurringGenerationAdapter {
  readonly transactionType = RecurringTransactionType.EXPENSE;

  async generate(context: RecurringGenerationContext, tx: Prisma.TransactionClient): Promise<RecurringGeneratedTarget> {
    const template = asTemplate(context);
    if (!template.paidThroughAccountId) throw new BadRequestException("Recurring expense paid-through account is missing.");
    const date = dateText(context.scheduledLocalDate);
    await validateExpenseReferences(context.organizationId, template, tx);
    const fx = await proposalFx(context.organizationId, template, date, tx);
    const proposal = await tx.recurringExpenseProposal.create({
      data: {
        organizationId: context.organizationId,
        proposedDate: context.scheduledLocalDate,
        contactId: template.partyId,
        branchId: template.branchId,
        paidThroughAccountId: template.paidThroughAccountId,
        currency: template.currencyCode,
        baseCurrency: fx.baseCurrency,
        exchangeRate: fx.exchangeRate,
        rateDate: fx.rateDate,
        rateSource: fx.rateSource,
        rateSnapshotId: fx.rateSnapshotId,
        subtotal: String(template.subtotal),
        discountTotal: String(template.discountTotal),
        taxableTotal: String(template.taxableTotal),
        taxTotal: String(template.taxTotal),
        total: String(template.total),
        description: template.description,
        notes: template.notes,
        lines: {
          create: template.lines.map((line) => ({
            organizationId: context.organizationId,
            itemId: line.itemId ?? null,
            accountId: line.accountId,
            taxRateId: line.taxRateId ?? null,
            costCenterId: line.costCenterId ?? null,
            projectId: line.projectId ?? null,
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            discountRate: String(line.discountRate),
            lineGrossAmount: String(line.lineGrossAmount ?? 0),
            discountAmount: String(line.discountAmount ?? 0),
            taxableAmount: String(line.taxableAmount ?? 0),
            taxAmount: String(line.taxAmount ?? 0),
            lineTotal: String(line.lineTotal ?? 0),
            sortOrder: line.sortOrder,
          })),
        },
      },
    });
    return { generatedEntityType: "EXPENSE_PROPOSAL", generatedEntityId: proposal.id, link: { generatedExpenseProposalId: proposal.id } };
  }
}

async function validateExpenseReferences(
  organizationId: string,
  template: GenerationTemplate,
  tx: Prisma.TransactionClient,
) {
  const lineAccountIds = unique(template.lines.map((line) => line.accountId));
  const expectedAccountIds = unique([...lineAccountIds, template.paidThroughAccountId!]);
  const accounts = await tx.account.findMany({
    where: {
      organizationId,
      isActive: true,
      allowPosting: true,
      OR: [
        { id: { in: lineAccountIds }, type: { in: [AccountType.EXPENSE, AccountType.COST_OF_SALES, AccountType.ASSET] } },
        { id: template.paidThroughAccountId!, type: AccountType.ASSET },
      ],
    },
    select: { id: true },
  });
  if (new Set(accounts.map((account) => account.id)).size !== expectedAccountIds.length) {
    throw new BadRequestException("Recurring expense accounts are missing, inactive, non-posting, or belong to another organization.");
  }

  if (template.partyId) {
    const contact = await tx.contact.findFirst({
      where: { id: template.partyId, organizationId, isActive: true, type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      select: { id: true },
    });
    if (!contact) throw new BadRequestException("Recurring expense contact is missing or inactive.");
  }
  if (template.branchId) {
    const branch = await tx.branch.findFirst({ where: { id: template.branchId, organizationId }, select: { id: true } });
    if (!branch) throw new BadRequestException("Recurring expense branch is missing.");
  }

  const itemIds = unique(template.lines.map((line) => line.itemId));
  if (itemIds.length) {
    const items = await tx.item.findMany({ where: { organizationId, id: { in: itemIds }, status: ItemStatus.ACTIVE }, select: { id: true } });
    if (items.length !== itemIds.length) throw new BadRequestException("Recurring expense items are missing or inactive.");
  }
  const taxRateIds = unique(template.lines.map((line) => line.taxRateId));
  if (taxRateIds.length) {
    const taxRates = await tx.taxRate.findMany({ where: { organizationId, id: { in: taxRateIds }, isActive: true, scope: { in: [TaxRateScope.PURCHASES, TaxRateScope.BOTH] } }, select: { id: true } });
    if (taxRates.length !== taxRateIds.length) throw new BadRequestException("Recurring expense tax rates are missing or inactive.");
  }
  await lockActiveDocumentLineDimensions(tx, organizationId, template.lines);
}

function asTemplate(context: RecurringGenerationContext): GenerationTemplate {
  const template = context.template as GenerationTemplate;
  if (!template || template.id !== context.templateId || template.transactionType === undefined || !Array.isArray(template.lines)) {
    throw new BadRequestException("Recurring generation template snapshot is incomplete.");
  }
  return template;
}

function documentLines(lines: TemplateLine[]) {
  return lines.map((line) => ({
    itemId: line.itemId ?? undefined,
    accountId: line.accountId,
    taxRateId: line.taxRateId ?? undefined,
    costCenterId: line.costCenterId ?? undefined,
    projectId: line.projectId ?? undefined,
    description: line.description,
    quantity: String(line.quantity),
    unitPrice: String(line.unitPrice),
    discountRate: String(line.discountRate),
    sortOrder: line.sortOrder,
  }));
}

function documentFxInput(template: GenerationTemplate, date: string) {
  if (template.exchangeRatePolicy === RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY) {
    return { currency: template.currencyCode };
  }
  if (template.exchangeRatePolicy === RecurringExchangeRatePolicy.FIXED_TEMPLATE_RATE) {
    const exchangeRate = template.fixedExchangeRate == null ? "" : String(template.fixedExchangeRate);
    if (!positiveRate(exchangeRate)) throw new BadRequestException("Recurring template fixed exchange rate is missing or invalid.");
    return { currency: template.currencyCode, exchangeRate, rateDate: date, rateSource: CurrencyRateSource.MANUAL };
  }
  if (template.exchangeRatePolicy === RecurringExchangeRatePolicy.RATE_SNAPSHOT) {
    if (!template.rateSnapshotId) throw new BadRequestException("Recurring template FX snapshot is missing.");
    return { currency: template.currencyCode, rateSnapshotId: template.rateSnapshotId };
  }
  throw new BadRequestException("This recurring run requires exchange-rate evidence from an accountant.");
}

async function proposalFx(
  organizationId: string,
  template: GenerationTemplate,
  date: string,
  tx: Prisma.TransactionClient,
) {
  const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { baseCurrency: true } });
  if (!organization) throw new BadRequestException("Recurring expense organization is missing.");
  const input = documentFxInput(template, date);
  if (template.exchangeRatePolicy === RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY) {
    if (template.currencyCode !== organization.baseCurrency) throw new BadRequestException("Recurring expense base currency does not match the organization.");
    return { baseCurrency: organization.baseCurrency, exchangeRate: "1", rateDate: new Date(`${date}T00:00:00.000Z`), rateSource: CurrencyRateSource.SYSTEM_RATE_1, rateSnapshotId: null };
  }
  if (template.exchangeRatePolicy === RecurringExchangeRatePolicy.FIXED_TEMPLATE_RATE) {
    return { baseCurrency: organization.baseCurrency, exchangeRate: input.exchangeRate!, rateDate: new Date(`${date}T00:00:00.000Z`), rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: null };
  }
  const snapshot = await tx.currencyRateSnapshot.findFirst({ where: { id: template.rateSnapshotId!, organizationId } });
  if (!snapshot || snapshot.transactionCurrency !== template.currencyCode || snapshot.baseCurrency !== organization.baseCurrency || snapshot.source === CurrencyRateSource.FUTURE_PROVIDER_DISABLED) {
    throw new BadRequestException("Recurring expense FX snapshot is missing, mismatched, or unavailable.");
  }
  return { baseCurrency: organization.baseCurrency, exchangeRate: snapshot.rate, rateDate: snapshot.rateDate, rateSource: snapshot.source, rateSnapshotId: snapshot.id };
}

function positiveRate(value: string): boolean {
  return /^\d{1,10}(?:\.\d{1,8})?$/.test(value) && Number(value) > 0;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function dateText(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
