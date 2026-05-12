import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountingRuleError,
  assertFinalizableSalesInvoice,
  calculateSalesInvoiceTotals,
  createReversalLines,
  getJournalTotals,
  JournalLineInput,
} from "@ledgerbyte/accounting-core";
import { CashExpensePdfData, renderCashExpensePdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  CashExpenseStatus,
  ContactType,
  DocumentType,
  ItemStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  TaxRateScope,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CashExpenseLineDto } from "./dto/cash-expense-line.dto";
import { CreateCashExpenseDto } from "./dto/create-cash-expense.dto";
import { buildCashExpenseJournalLines } from "./cash-expense-accounting";

const cashExpenseInclude = {
  contact: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  paidThroughAccount: { select: { id: true, code: true, name: true, type: true } },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
      totalDebit: true,
      totalCredit: true,
      reversedBy: { select: { id: true, entryNumber: true } },
    },
  },
  voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
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
  lineTotal: string;
  sortOrder: number;
}

interface PreparedCashExpense {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: PreparedLine[];
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CashExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  list(organizationId: string) {
    return this.prisma.cashExpense.findMany({
      where: { organizationId },
      orderBy: { expenseDate: "desc" },
      include: {
        contact: { select: { id: true, name: true, displayName: true, type: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        paidThroughAccount: { select: { id: true, code: true, name: true, type: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const expense = await this.prisma.cashExpense.findFirst({
      where: { id, organizationId },
      include: cashExpenseInclude,
    });

    if (!expense) {
      throw new NotFoundException("Cash expense not found.");
    }

    return expense;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateCashExpenseDto) {
    const prepared = await this.prepareCashExpense(organizationId, dto.lines);
    await this.validateHeaderReferences(
      organizationId,
      this.cleanOptional(dto.contactId ?? undefined),
      this.cleanOptional(dto.branchId ?? undefined),
      dto.paidThroughAccountId,
    );
    this.assertPostableCashExpense(prepared);

    const currency = (dto.currency ?? "SAR").toUpperCase();
    const expense = await this.prisma.$transaction(async (tx) => {
      const expenseNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.CASH_EXPENSE, tx);
      const paidThroughAccount = await this.findPaidThroughAccount(organizationId, dto.paidThroughAccountId, tx);
      const vatReceivableAccount = await this.findPostingAccountByCode(organizationId, "230", tx);
      const journalLines = buildCashExpenseJournalLines({
        paidThroughAccountId: paidThroughAccount.id,
        vatReceivableAccountId: vatReceivableAccount.id,
        expenseNumber,
        currency,
        total: prepared.total,
        taxTotal: prepared.taxTotal,
        lines: prepared.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          taxableAmount: line.taxableAmount,
        })),
      });
      const totals = getJournalTotals(journalLines);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
          status: JournalEntryStatus.POSTED,
          entryDate: new Date(dto.expenseDate),
          description: `Cash expense ${expenseNumber}`,
          reference: expenseNumber,
          currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      return tx.cashExpense.create({
        data: {
          organizationId,
          expenseNumber,
          contactId: this.cleanOptional(dto.contactId ?? undefined) ?? null,
          branchId: this.cleanOptional(dto.branchId ?? undefined) ?? null,
          expenseDate: new Date(dto.expenseDate),
          currency,
          status: CashExpenseStatus.POSTED,
          subtotal: prepared.subtotal,
          discountTotal: prepared.discountTotal,
          taxableTotal: prepared.taxableTotal,
          taxTotal: prepared.taxTotal,
          total: prepared.total,
          description: this.cleanOptional(dto.description),
          notes: this.cleanOptional(dto.notes),
          paidThroughAccountId: dto.paidThroughAccountId,
          createdById: actorUserId,
          postedAt: new Date(),
          journalEntryId: journalEntry.id,
          lines: { create: this.toLineCreateMany(organizationId, prepared.lines) },
        },
        include: cashExpenseInclude,
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "CashExpense", entityId: expense.id, after: expense });
    return expense;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === CashExpenseStatus.VOIDED) {
      return existing;
    }
    if (existing.status !== CashExpenseStatus.POSTED || !existing.journalEntryId) {
      throw new BadRequestException("Only posted cash expenses can be voided.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.cashExpense.findFirst({
        where: { id, organizationId },
        include: {
          journalEntry: {
            include: {
              lines: { orderBy: { lineNumber: "asc" } },
              reversedBy: { select: { id: true } },
            },
          },
        },
      });

      if (!expense) {
        throw new NotFoundException("Cash expense not found.");
      }
      if (expense.status === CashExpenseStatus.VOIDED) {
        return tx.cashExpense.findUniqueOrThrow({ where: { id }, include: cashExpenseInclude });
      }
      if (expense.status !== CashExpenseStatus.POSTED) {
        throw new BadRequestException("Only posted cash expenses can be voided.");
      }
      if (!expense.journalEntry) {
        throw new BadRequestException("Cash expense has no journal entry to reverse.");
      }

      const claim = await tx.cashExpense.updateMany({
        where: { id, organizationId, status: CashExpenseStatus.POSTED },
        data: { status: CashExpenseStatus.VOIDED, voidedAt: new Date() },
      });
      if (claim.count !== 1) {
        return tx.cashExpense.findUniqueOrThrow({ where: { id }, include: cashExpenseInclude });
      }

      const reversalJournalEntryId =
        expense.journalEntry.reversedBy?.id ??
        (await this.createReversalJournal(
          organizationId,
          actorUserId,
          {
            expenseNumber: expense.expenseNumber,
            currency: expense.currency,
            journalEntry: expense.journalEntry,
          },
          tx,
        ));

      return tx.cashExpense.update({
        where: { id },
        data: { voidReversalJournalEntryId: reversalJournalEntryId },
        include: cashExpenseInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "CashExpense",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== CashExpenseStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft cash expenses without journal entries can be deleted.");
    }

    await this.prisma.cashExpense.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "CashExpense", entityId: id, before: existing });
    return { deleted: true };
  }

  async pdfData(organizationId: string, id: string): Promise<CashExpensePdfData> {
    const expense = await this.prisma.cashExpense.findFirst({
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
        contact: {
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
        paidThroughAccount: { select: { id: true, code: true, name: true, type: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            taxRate: { select: { name: true } },
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException("Cash expense not found.");
    }

    return {
      organization: expense.organization,
      contact: expense.contact,
      expense: {
        id: expense.id,
        expenseNumber: expense.expenseNumber,
        status: expense.status,
        expenseDate: expense.expenseDate,
        currency: expense.currency,
        description: expense.description,
        notes: expense.notes,
        subtotal: moneyString(expense.subtotal),
        discountTotal: moneyString(expense.discountTotal),
        taxableTotal: moneyString(expense.taxableTotal),
        taxTotal: moneyString(expense.taxTotal),
        total: moneyString(expense.total),
      },
      paidThroughAccount: expense.paidThroughAccount,
      lines: expense.lines.map((line) => ({
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
      journalEntry: expense.journalEntry,
      voidReversalJournalEntry: expense.voidReversalJournalEntry,
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: CashExpensePdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.receiptRenderSettings(organizationId);
    const buffer = await renderCashExpensePdf(data, { ...settings, title: "Cash Expense" });
    const filename = sanitizeFilename(`cash-expense-${data.expense.expenseNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.CASH_EXPENSE,
      sourceType: "CashExpense",
      sourceId: data.expense.id,
      documentNumber: data.expense.expenseNumber,
      filename,
      buffer,
      generatedById: actorUserId,
    });
    return { data, buffer, filename, document: document ?? null };
  }

  async generatePdf(organizationId: string, actorUserId: string, id: string) {
    const { document } = await this.pdf(organizationId, actorUserId, id);
    return document;
  }

  private async prepareCashExpense(organizationId: string, lines: CashExpenseLineDto[]): Promise<PreparedCashExpense> {
    const itemIds = lines.map((line) => this.cleanOptional(line.itemId ?? undefined)).filter((itemId): itemId is string => Boolean(itemId));
    const items = itemIds.length
      ? await this.prisma.item.findMany({
          where: { organizationId, id: { in: [...new Set(itemIds)] }, status: ItemStatus.ACTIVE },
          select: { id: true, name: true, description: true, expenseAccountId: true, purchaseTaxRateId: true },
        })
      : [];
    const itemsById = new Map(items.map((item) => [item.id, item]));

    if (items.length !== new Set(itemIds).size) {
      throw new BadRequestException("Cash expense line items must be active items in this organization.");
    }

    const baseLines = lines.map((line, index) => {
      const itemId = this.cleanOptional(line.itemId ?? undefined);
      const item = itemId ? itemsById.get(itemId) : undefined;
      const accountId = this.cleanOptional(line.accountId ?? undefined) ?? item?.expenseAccountId ?? undefined;
      if (!accountId) {
        throw new BadRequestException(`Cash expense line ${index + 1} requires an account.`);
      }
      const taxRateId = this.cleanOptional(line.taxRateId ?? undefined) ?? item?.purchaseTaxRateId ?? undefined;

      return {
        itemId,
        description: this.cleanOptional(line.description) ?? item?.description ?? item?.name ?? `Line ${index + 1}`,
        accountId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate ?? "0",
        taxRateId,
        sortOrder: line.sortOrder ?? index,
      };
    });

    await this.validateLineAccounts(
      organizationId,
      baseLines.map((line) => line.accountId),
    );
    const taxRatesById = await this.getTaxRatesById(
      organizationId,
      baseLines.map((line) => line.taxRateId).filter((taxRateId): taxRateId is string => Boolean(taxRateId)),
    );

    const totals = this.calculateTotals(
      baseLines.map((line) => ({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate,
        taxRate: line.taxRateId ? String(taxRatesById.get(line.taxRateId)?.rate ?? "0") : "0",
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
          throw new BadRequestException("Unable to calculate cash expense line totals.");
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
          lineTotal: calculated.lineTotal,
        };
      }),
    };
  }

  private async validateHeaderReferences(
    organizationId: string,
    contactId: string | undefined,
    branchId: string | undefined,
    paidThroughAccountId: string,
  ): Promise<void> {
    await this.findPaidThroughAccount(organizationId, paidThroughAccountId);

    if (contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: {
          id: contactId,
          organizationId,
          isActive: true,
          type: { in: [ContactType.SUPPLIER, ContactType.BOTH] },
        },
        select: { id: true },
      });
      if (!contact) {
        throw new BadRequestException("Cash expense contact must be an active supplier contact in this organization.");
      }
    }

    if (branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organizationId }, select: { id: true } });
      if (!branch) {
        throw new BadRequestException("Branch does not exist in this organization.");
      }
    }
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

  private assertPostableCashExpense(totals: ReturnType<typeof calculateSalesInvoiceTotals>): void {
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
        type: { in: [AccountType.EXPENSE, AccountType.COST_OF_SALES, AccountType.ASSET] },
        isActive: true,
        allowPosting: true,
      },
      select: { id: true },
    });

    if (accounts.length !== uniqueAccountIds.length) {
      throw new BadRequestException("Cash expense line accounts must be active posting expense, cost of sales, or asset accounts in this organization.");
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
        scope: { in: [TaxRateScope.PURCHASES, TaxRateScope.BOTH] },
      },
      select: { id: true, rate: true },
    });

    if (taxRates.length !== uniqueTaxRateIds.length) {
      throw new BadRequestException("Cash expense tax rates must be active purchase tax rates in this organization.");
    }

    return new Map(taxRates.map((taxRate) => [taxRate.id, taxRate]));
  }

  private async findPaidThroughAccount(organizationId: string, accountId: string, executor: PrismaExecutor = this.prisma) {
    const account = await executor.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        isActive: true,
        allowPosting: true,
        type: AccountType.ASSET,
      },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException("Paid-through account must be an active posting asset account in this organization.");
    }
    return account;
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

  private async createReversalJournal(
    organizationId: string,
    actorUserId: string,
    expense: {
      expenseNumber: string;
      currency: string;
      journalEntry: {
        id: string;
        entryNumber: string;
        description: string;
        reference: string | null;
        currency: string;
        lines: Array<{
          accountId: string;
          debit: Prisma.Decimal;
          credit: Prisma.Decimal;
          description: string | null;
          currency: string;
          exchangeRate: Prisma.Decimal;
          taxRateId: string | null;
        }>;
      };
    },
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const reversalLines = createReversalLines(
      expense.journalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        description: `Reversal: ${line.description ?? expense.journalEntry.description ?? ""}`.trim(),
        currency: line.currency,
        exchangeRate: String(line.exchangeRate),
        taxRateId: line.taxRateId,
      })),
    );
    const totals = getJournalTotals(reversalLines);

    try {
      const reversal = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
          status: JournalEntryStatus.POSTED,
          entryDate: new Date(),
          description: `Reversal of cash expense ${expense.expenseNumber}`,
          reference: expense.journalEntry.reference,
          currency: expense.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          reversalOfId: expense.journalEntry.id,
          lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
        },
      });
      await tx.journalEntry.update({
        where: { id: expense.journalEntry.id },
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

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.CashExpenseLineCreateWithoutCashExpenseInput[] {
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

function moneyString(value: unknown): string {
  return String(value ?? "0");
}
