import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountingRuleError,
  assertDraftInvoiceEditable,
  assertFinalizableSalesInvoice,
  calculateSalesInvoiceTotals,
  createReversalLines,
  getJournalTotals,
  JournalLineInput,
  toMoney,
} from "@ledgerbyte/accounting-core";
import {
  AccountType,
  ContactType,
  CustomerPaymentStatus,
  ItemStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
  TaxRateScope,
} from "@prisma/client";
import { AccountingService } from "../accounting/accounting.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSalesInvoiceDto } from "./dto/create-sales-invoice.dto";
import { SalesInvoiceLineDto } from "./dto/sales-invoice-line.dto";
import { UpdateSalesInvoiceDto } from "./dto/update-sales-invoice.dto";
import { buildSalesInvoiceJournalLines } from "./sales-invoice-accounting";

const salesInvoiceInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  journalEntry: { select: { id: true, entryNumber: true, status: true, totalDebit: true, totalCredit: true, reversedBy: { select: { id: true, entryNumber: true } } } },
  reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
  paymentAllocations: {
    include: {
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          status: true,
          amountReceived: true,
          unappliedAmount: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
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

interface PreparedInvoice {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: PreparedLine[];
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SalesInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly accountingService: AccountingService,
  ) {}

  list(organizationId: string) {
    return this.prisma.salesInvoice.findMany({
      where: { organizationId },
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  open(organizationId: string, customerId?: string) {
    if (!customerId) {
      throw new BadRequestException("customerId is required.");
    }

    return this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        customerId,
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { gt: 0 },
      },
      orderBy: { issueDate: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        currency: true,
        total: true,
        balanceDue: true,
        customerId: true,
      },
    });
  }

  async get(organizationId: string, id: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, organizationId },
      include: salesInvoiceInclude,
    });

    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    return invoice;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateSalesInvoiceDto) {
    await this.validateHeaderReferences(organizationId, dto.customerId, dto.branchId ?? undefined);
    const prepared = await this.prepareInvoice(organizationId, dto.lines);
    const currency = (dto.currency ?? "SAR").toUpperCase();

    const invoice = await this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.INVOICE, tx);

      return tx.salesInvoice.create({
        data: {
          organizationId,
          invoiceNumber,
          customerId: dto.customerId,
          branchId: this.cleanOptional(dto.branchId ?? undefined),
          issueDate: new Date(dto.issueDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          currency,
          subtotal: prepared.subtotal,
          discountTotal: prepared.discountTotal,
          taxableTotal: prepared.taxableTotal,
          taxTotal: prepared.taxTotal,
          total: prepared.total,
          balanceDue: prepared.total,
          notes: this.cleanOptional(dto.notes),
          terms: this.cleanOptional(dto.terms),
          createdById: actorUserId,
          lines: { create: this.toLineCreateMany(organizationId, prepared.lines) },
        },
        include: salesInvoiceInclude,
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "SalesInvoice", entityId: invoice.id, after: invoice });
    return invoice;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateSalesInvoiceDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    if (dto.customerId || Object.prototype.hasOwnProperty.call(dto, "branchId")) {
      await this.validateHeaderReferences(organizationId, dto.customerId ?? existing.customerId, dto.branchId ?? undefined);
    }

    const prepared = dto.lines ? await this.prepareInvoice(organizationId, dto.lines) : null;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (prepared) {
        await tx.salesInvoiceLine.deleteMany({ where: { organizationId, invoiceId: id } });
      }

      return tx.salesInvoice.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          branchId: Object.prototype.hasOwnProperty.call(dto, "branchId") ? (this.cleanOptional(dto.branchId ?? undefined) ?? null) : undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate: Object.prototype.hasOwnProperty.call(dto, "dueDate") ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
          currency: dto.currency?.toUpperCase(),
          subtotal: prepared?.subtotal,
          discountTotal: prepared?.discountTotal,
          taxableTotal: prepared?.taxableTotal,
          taxTotal: prepared?.taxTotal,
          total: prepared?.total,
          balanceDue: prepared?.total,
          notes: dto.notes === undefined ? undefined : this.cleanOptional(dto.notes),
          terms: dto.terms === undefined ? undefined : this.cleanOptional(dto.terms),
          lines: prepared ? { create: this.toLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: salesInvoiceInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "SalesInvoice",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async finalize(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesInvoiceStatus.FINALIZED && existing.journalEntryId) {
      return existing;
    }

    if (existing.status === SalesInvoiceStatus.FINALIZED) {
      throw new BadRequestException("Finalized invoice is missing its journal entry.");
    }

    if (existing.status === SalesInvoiceStatus.VOIDED) {
      throw new BadRequestException("Voided invoices cannot be finalized.");
    }

    const finalized = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findFirst({
        where: { id, organizationId },
        include: {
          customer: { select: { id: true, name: true, displayName: true } },
          lines: { orderBy: { sortOrder: "asc" }, include: { account: true } },
        },
      });

      if (!invoice) {
        throw new NotFoundException("Sales invoice not found.");
      }

      if (invoice.status === SalesInvoiceStatus.FINALIZED && invoice.journalEntryId) {
        return tx.salesInvoice.findUniqueOrThrow({ where: { id }, include: salesInvoiceInclude });
      }

      if (invoice.status === SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException("Finalized invoice is missing its journal entry.");
      }

      if (invoice.status === SalesInvoiceStatus.VOIDED) {
        throw new BadRequestException("Voided invoices cannot be finalized.");
      }

      if (invoice.status !== SalesInvoiceStatus.DRAFT) {
        throw new BadRequestException("Only draft invoices can be finalized.");
      }

      this.assertFinalizableInvoice({
        subtotal: String(invoice.subtotal),
        discountTotal: String(invoice.discountTotal),
        taxableTotal: String(invoice.taxableTotal),
        taxTotal: String(invoice.taxTotal),
        total: String(invoice.total),
        lines: invoice.lines.map((line) => ({
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          discountRate: String(line.discountRate),
          lineGrossAmount: String(line.lineGrossAmount),
          discountAmount: String(line.discountAmount),
          taxRate: "0.0000",
          taxableAmount: String(line.taxableAmount),
          taxAmount: String(line.taxAmount),
          lineTotal: String(line.lineTotal),
        })),
      });

      // Conditional status claim is the concurrency boundary. Postgres locks the
      // row for this update, so a competing finalize waits and then observes 0.
      const claim = await tx.salesInvoice.updateMany({
        where: {
          id,
          organizationId,
          status: SalesInvoiceStatus.DRAFT,
          journalEntryId: null,
        },
        data: {
          status: SalesInvoiceStatus.FINALIZED,
          finalizedAt: new Date(),
          balanceDue: invoice.total,
        },
      });
      if (claim.count !== 1) {
        return tx.salesInvoice.findUniqueOrThrow({ where: { id }, include: salesInvoiceInclude });
      }

      const accountsReceivableAccount = await this.findPostingAccountByCode(organizationId, "120", tx);
      const vatPayableAccount = await this.findPostingAccountByCode(organizationId, "220", tx);
      const journalLines = buildSalesInvoiceJournalLines({
        accountsReceivableAccountId: accountsReceivableAccount.id,
        vatPayableAccountId: vatPayableAccount.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.displayName ?? invoice.customer.name,
        currency: invoice.currency,
        total: String(invoice.total),
        taxTotal: String(invoice.taxTotal),
        lines: invoice.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          taxableAmount: String(line.taxableAmount),
        })),
      });

      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: invoice.issueDate,
          description: `Sales invoice ${invoice.invoiceNumber} - ${invoice.customer.displayName ?? invoice.customer.name}`,
          reference: invoice.invoiceNumber,
          currency: invoice.currency,
          totalDebit: invoice.total,
          totalCredit: invoice.total,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      return tx.salesInvoice.update({
        where: { id },
        data: {
          journalEntryId: journalEntry.id,
        },
        include: salesInvoiceInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "FINALIZE",
      entityType: "SalesInvoice",
      entityId: id,
      before: existing,
      after: finalized,
    });
    return finalized;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesInvoiceStatus.VOIDED) {
      return existing;
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findFirst({
        where: { id, organizationId },
      });

      if (!invoice) {
        throw new NotFoundException("Sales invoice not found.");
      }
      if (invoice.status === SalesInvoiceStatus.VOIDED) {
        return tx.salesInvoice.findUniqueOrThrow({ where: { id }, include: salesInvoiceInclude });
      }
      if (invoice.status === SalesInvoiceStatus.DRAFT) {
        const claim = await tx.salesInvoice.updateMany({
          where: { id, organizationId, status: SalesInvoiceStatus.DRAFT },
          data: {
            status: SalesInvoiceStatus.VOIDED,
            balanceDue: "0.0000",
          },
        });
        if (claim.count !== 1) {
          return tx.salesInvoice.findUniqueOrThrow({ where: { id }, include: salesInvoiceInclude });
        }
        return tx.salesInvoice.findUniqueOrThrow({ where: { id }, include: salesInvoiceInclude });
      }
      if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException("Only draft or finalized invoices can be voided.");
      }
      if (!invoice.journalEntryId) {
        throw new BadRequestException("Finalized invoice is missing its journal entry.");
      }

      // Claim the invoice row before checking allocations. This blocks concurrent
      // payment allocation updates, then the count sees the latest committed state.
      const claim = await tx.salesInvoice.updateMany({
        where: { id, organizationId, status: SalesInvoiceStatus.FINALIZED },
        data: {
          status: SalesInvoiceStatus.VOIDED,
          balanceDue: "0.0000",
        },
      });
      if (claim.count !== 1) {
        return tx.salesInvoice.findUniqueOrThrow({ where: { id }, include: salesInvoiceInclude });
      }

      const activePaymentCount = await tx.customerPaymentAllocation.count({
        where: {
          invoiceId: id,
          organizationId,
          payment: { status: { not: CustomerPaymentStatus.VOIDED } },
        },
      });
      if (activePaymentCount > 0) {
        throw new BadRequestException("Cannot void invoice with active payments. Void payments first.");
      }

      const reversalJournalEntryId = await this.createOrReuseReversalJournal(
        organizationId,
        actorUserId,
        invoice.journalEntryId,
        tx,
      );

      return tx.salesInvoice.update({
        where: { id },
        data: { reversalJournalEntryId },
        include: salesInvoiceInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "SalesInvoice",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  private async createOrReuseReversalJournal(
    organizationId: string,
    actorUserId: string,
    journalEntryId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const journalEntry = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: {
        lines: { orderBy: { createdAt: "asc" } },
        reversedBy: { select: { id: true } },
      },
    });
    if (!journalEntry) {
      throw new NotFoundException("Journal entry not found.");
    }
    if (journalEntry.reversedBy) {
      return journalEntry.reversedBy.id;
    }

    const reversalLines = createReversalLines(
      journalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        description: `Reversal: ${line.description ?? journalEntry.description ?? ""}`.trim(),
        currency: line.currency,
        exchangeRate: String(line.exchangeRate),
        taxRateId: line.taxRateId,
      })),
    );
    const totals = getJournalTotals(reversalLines);
    const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);

    try {
      const reversal = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: new Date(),
          description: `Reversal of ${journalEntry.entryNumber}`,
          reference: journalEntry.reference,
          currency: journalEntry.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          reversalOfId: journalEntry.id,
          lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
        },
      });
      await tx.journalEntry.update({
        where: { id: journalEntry.id },
        data: { status: JournalEntryStatus.REVERSED },
      });
      return reversal.id;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      throw new BadRequestException("Journal entry has already been reversed.");
    }
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== SalesInvoiceStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft invoices without journal entries can be deleted.");
    }

    await this.prisma.salesInvoice.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "SalesInvoice", entityId: id, before: existing });
    return { deleted: true };
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

  private async prepareInvoice(organizationId: string, lines: SalesInvoiceLineDto[]): Promise<PreparedInvoice> {
    const itemIds = [...new Set(lines.map((line) => line.itemId).filter((value): value is string => Boolean(value)))];
    const items = await this.prisma.item.findMany({
      where: { organizationId, id: { in: itemIds }, status: ItemStatus.ACTIVE },
      select: { id: true, name: true, description: true, revenueAccountId: true, salesTaxRateId: true },
    });

    if (items.length !== itemIds.length) {
      throw new BadRequestException("One or more items do not exist or are disabled.");
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const baseLines = lines.map((line, index) => {
      const item = line.itemId ? itemsById.get(line.itemId) : undefined;
      const accountId = this.cleanOptional(line.accountId ?? undefined) ?? item?.revenueAccountId;
      const taxRateId =
        line.taxRateId === undefined ? item?.salesTaxRateId ?? undefined : this.cleanOptional(line.taxRateId ?? undefined);
      const description = this.cleanOptional(line.description) ?? item?.description ?? item?.name;

      if (!accountId) {
        throw new BadRequestException(`Invoice line ${index + 1} requires a revenue account.`);
      }

      if (!description) {
        throw new BadRequestException(`Invoice line ${index + 1} requires a description.`);
      }

      return {
        itemId: this.cleanOptional(line.itemId ?? undefined),
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
    );

    return {
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxableTotal: totals.taxableTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      lines: baseLines.map((line, index) => {
        const calculated = totals.lines[index];
        if (!calculated) {
          throw new BadRequestException("Unable to calculate invoice line totals.");
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

  private calculateTotals(lines: Parameters<typeof calculateSalesInvoiceTotals>[0]) {
    try {
      return calculateSalesInvoiceTotals(lines);
    } catch (error) {
      if (error instanceof AccountingRuleError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  private assertFinalizableInvoice(totals: ReturnType<typeof calculateSalesInvoiceTotals>): void {
    try {
      assertFinalizableSalesInvoice(totals);
    } catch (error) {
      if (error instanceof AccountingRuleError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  private async validateLineAccounts(organizationId: string, accountIds: string[]): Promise<void> {
    const uniqueAccountIds = [...new Set(accountIds)];
    const accounts = await this.prisma.account.findMany({
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
      throw new BadRequestException("Invoice line accounts must be active posting revenue accounts in this organization.");
    }
  }

  private async getTaxRatesById(organizationId: string, taxRateIds: string[]) {
    const uniqueTaxRateIds = [...new Set(taxRateIds)];
    if (uniqueTaxRateIds.length === 0) {
      return new Map<string, { id: string; rate: Prisma.Decimal }>();
    }

    const taxRates = await this.prisma.taxRate.findMany({
      where: {
        organizationId,
        id: { in: uniqueTaxRateIds },
        isActive: true,
        scope: { in: [TaxRateScope.SALES, TaxRateScope.BOTH] },
      },
      select: { id: true, rate: true },
    });

    if (taxRates.length !== uniqueTaxRateIds.length) {
      throw new BadRequestException("Invoice tax rates must be active sales tax rates in this organization.");
    }

    return new Map(taxRates.map((taxRate) => [taxRate.id, taxRate]));
  }

  private async findPostingAccountByCode(organizationId: string, code: string, executor: PrismaExecutor) {
    const account = await executor.account.findFirst({
      where: { organizationId, code, isActive: true, allowPosting: true },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(`Required posting account ${code} was not found.`);
    }
    return account;
  }

  private assertDraft(status: SalesInvoiceStatus): void {
    try {
      assertDraftInvoiceEditable(status);
    } catch (error) {
      if (error instanceof AccountingRuleError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.SalesInvoiceLineCreateWithoutInvoiceInput[] {
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

  private toJournalLineCreateMany(organizationId: string, lines: JournalLineInput[]): Prisma.JournalLineCreateWithoutJournalEntryInput[] {
    return lines.map((line, index) => ({
      organization: { connect: { id: organizationId } },
      account: { connect: { id: line.accountId } },
      lineNumber: index + 1,
      description: line.description,
      debit: String(line.debit),
      credit: String(line.credit),
      currency: line.currency,
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
    }));
  }

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
