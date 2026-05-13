import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getJournalTotals, JournalLineInput } from "@ledgerbyte/accounting-core";
import { AccountType, BankAccountStatus, JournalEntryStatus, NumberSequenceScope, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { BankAccountTransactionsQueryDto } from "./dto/bank-account-transactions-query.dto";
import { CreateBankAccountProfileDto } from "./dto/create-bank-account-profile.dto";
import { UpdateBankAccountProfileDto } from "./dto/update-bank-account-profile.dto";

const POSTED_LEDGER_STATUSES = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];

const bankAccountInclude = {
  account: { select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } },
  openingBalanceJournalEntry: { select: { id: true, entryNumber: true, status: true } },
};

const journalLineInclude = {
  account: { select: { id: true, code: true, name: true } },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      entryDate: true,
      description: true,
      reference: true,
      salesInvoice: { select: { id: true } },
      voidedSalesInvoice: { select: { id: true } },
      creditNote: { select: { id: true } },
      voidedCreditNote: { select: { id: true } },
      purchaseBill: { select: { id: true } },
      voidedPurchaseBill: { select: { id: true } },
      purchaseDebitNote: { select: { id: true } },
      voidedPurchaseDebitNote: { select: { id: true } },
      cashExpense: { select: { id: true } },
      voidedCashExpense: { select: { id: true } },
      customerPayment: { select: { id: true } },
      voidedCustomerPayment: { select: { id: true } },
      supplierPayment: { select: { id: true } },
      voidedSupplierPayment: { select: { id: true } },
      customerRefund: { select: { id: true } },
      voidedCustomerRefund: { select: { id: true } },
      supplierRefund: { select: { id: true } },
      voidedSupplierRefund: { select: { id: true } },
      bankTransfer: { select: { id: true, transferNumber: true } },
      voidedBankTransfer: { select: { id: true, transferNumber: true } },
      bankAccountOpeningProfile: { select: { id: true, displayName: true } },
    },
  },
};

type SourceEntry = {
  id: string;
  reference?: string | null;
  salesInvoice?: { id: string } | null;
  voidedSalesInvoice?: { id: string } | null;
  creditNote?: { id: string } | null;
  voidedCreditNote?: { id: string } | null;
  purchaseBill?: { id: string } | null;
  voidedPurchaseBill?: { id: string } | null;
  purchaseDebitNote?: { id: string } | null;
  voidedPurchaseDebitNote?: { id: string } | null;
  cashExpense?: { id: string } | null;
  voidedCashExpense?: { id: string } | null;
  customerPayment?: { id: string } | null;
  voidedCustomerPayment?: { id: string } | null;
  supplierPayment?: { id: string } | null;
  voidedSupplierPayment?: { id: string } | null;
  customerRefund?: { id: string } | null;
  voidedCustomerRefund?: { id: string } | null;
  supplierRefund?: { id: string } | null;
  voidedSupplierRefund?: { id: string } | null;
  bankTransfer?: { id: string; transferNumber: string } | null;
  voidedBankTransfer?: { id: string; transferNumber: string } | null;
  bankAccountOpeningProfile?: { id: string; displayName: string } | null;
};

@Injectable()
export class BankAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly fiscalPeriodGuardService: FiscalPeriodGuardService,
  ) {}

  async list(organizationId: string) {
    const profiles = await this.prisma.bankAccountProfile.findMany({
      where: { organizationId },
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
      include: bankAccountInclude,
    });

    return Promise.all(profiles.map((profile) => this.withLedgerSummary(profile)));
  }

  async get(organizationId: string, id: string) {
    const profile = await this.findExisting(organizationId, id);
    return this.withLedgerSummary(profile);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateBankAccountProfileDto) {
    const account = await this.validateLinkedAccount(organizationId, dto.accountId);
    const existing = await this.prisma.bankAccountProfile.findUnique({ where: { accountId: account.id }, select: { id: true } });
    if (existing) {
      throw new BadRequestException("This account already has a bank account profile.");
    }

    const profile = await this.prisma.bankAccountProfile.create({
      data: {
        organizationId,
        accountId: account.id,
        type: dto.type,
        displayName: this.requiredText(dto.displayName, "Display name"),
        bankName: this.cleanOptional(dto.bankName),
        accountNumberMasked: this.cleanOptional(dto.accountNumberMasked),
        ibanMasked: this.cleanOptional(dto.ibanMasked),
        currency: (dto.currency ?? "SAR").trim().toUpperCase(),
        openingBalance: this.money(dto.openingBalance ?? "0.0000"),
        openingBalanceDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : null,
        notes: this.cleanOptional(dto.notes),
      },
      include: bankAccountInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "BankAccountProfile",
      entityId: profile.id,
      after: profile,
    });

    return this.withLedgerSummary(profile);
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateBankAccountProfileDto) {
    const existing = await this.findExisting(organizationId, id);
    this.assertOpeningBalanceCanChange(existing, dto);

    const profile = await this.prisma.bankAccountProfile.update({
      where: { id },
      data: {
        type: dto.type,
        displayName: dto.displayName === undefined ? undefined : this.requiredText(dto.displayName, "Display name"),
        bankName: this.cleanNullable(dto.bankName),
        accountNumberMasked: this.cleanNullable(dto.accountNumberMasked),
        ibanMasked: this.cleanNullable(dto.ibanMasked),
        currency: dto.currency === undefined ? undefined : dto.currency.trim().toUpperCase(),
        openingBalance: dto.openingBalance === undefined ? undefined : this.money(dto.openingBalance),
        openingBalanceDate:
          dto.openingBalanceDate === undefined
            ? undefined
            : dto.openingBalanceDate === null
              ? null
              : new Date(dto.openingBalanceDate),
        notes: this.cleanNullable(dto.notes),
      },
      include: bankAccountInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "BankAccountProfile",
      entityId: id,
      before: existing,
      after: profile,
    });

    return this.withLedgerSummary(profile);
  }

  async postOpeningBalance(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);

    const profile = await this.prisma.$transaction(async (tx) => {
      const current = await tx.bankAccountProfile.findFirst({
        where: { id, organizationId },
        include: bankAccountInclude,
      });
      if (!current) {
        throw new NotFoundException("Bank account profile not found.");
      }
      if (current.status !== BankAccountStatus.ACTIVE) {
        throw new BadRequestException("Only active bank account profiles can post opening balances.");
      }
      if (current.openingBalanceJournalEntryId) {
        throw new BadRequestException("Opening balance has already been posted.");
      }
      if (!current.openingBalanceDate) {
        throw new BadRequestException("Opening balance date is required before posting.");
      }

      const openingBalance = this.decimal(current.openingBalance);
      if (openingBalance.eq(0)) {
        throw new BadRequestException("Opening balance must be non-zero before posting.");
      }

      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, current.openingBalanceDate, tx);
      const equityAccount = await this.findPostingAccountByCode(organizationId, "310", tx);
      const amount = openingBalance.abs().toFixed(4);
      const journalLines = buildOpeningBalanceJournalLines({
        bankAccountId: current.accountId,
        equityAccountId: equityAccount.id,
        displayName: current.displayName,
        amount,
        currency: current.currency,
        isPositive: openingBalance.gt(0),
      });
      const totals = getJournalTotals(journalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const postedAt = new Date();
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: current.openingBalanceDate,
          description: `Opening balance for ${current.displayName}`,
          reference: `OPENING-${current.account.code}`,
          currency: current.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt,
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      const claim = await tx.bankAccountProfile.updateMany({
        where: { id, organizationId, openingBalanceJournalEntryId: null },
        data: { openingBalanceJournalEntryId: journalEntry.id, openingBalancePostedAt: postedAt },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Opening balance has already been posted.");
      }

      return tx.bankAccountProfile.findUniqueOrThrow({ where: { id }, include: bankAccountInclude });
    });

    const withSummary = await this.withLedgerSummary(profile);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "POST_OPENING_BALANCE",
      entityType: "BankAccountProfile",
      entityId: id,
      before: existing,
      after: withSummary,
    });
    return withSummary;
  }

  async archive(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);
    const profile = await this.prisma.bankAccountProfile.update({
      where: { id },
      data: { status: BankAccountStatus.ARCHIVED },
      include: bankAccountInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "ARCHIVE",
      entityType: "BankAccountProfile",
      entityId: id,
      before: existing,
      after: profile,
    });
    return this.withLedgerSummary(profile);
  }

  async reactivate(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);
    await this.validateLinkedAccount(organizationId, existing.accountId);
    const profile = await this.prisma.bankAccountProfile.update({
      where: { id },
      data: { status: BankAccountStatus.ACTIVE },
      include: bankAccountInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REACTIVATE",
      entityType: "BankAccountProfile",
      entityId: id,
      before: existing,
      after: profile,
    });
    return this.withLedgerSummary(profile);
  }

  async transactions(organizationId: string, id: string, query: BankAccountTransactionsQueryDto) {
    const profile = await this.findExisting(organizationId, id);
    const { from, to } = this.parseDateRange(query);

    const openingBalance = from ? await this.ledgerBalance(profile.accountId, { lt: from }) : new Prisma.Decimal(0);
    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId,
        accountId: profile.accountId,
        journalEntry: {
          status: { in: POSTED_LEDGER_STATUSES },
          entryDate: this.entryDateFilter(from, to),
        },
      },
      orderBy: [{ journalEntry: { entryDate: "asc" } }, { journalEntry: { entryNumber: "asc" } }, { lineNumber: "asc" }],
      include: journalLineInclude,
    });

    let runningBalance = openingBalance;
    const transactions = lines.map((line) => {
      runningBalance = runningBalance.plus(this.decimal(line.debit)).minus(this.decimal(line.credit));
      const source = this.sourceForEntry(line.journalEntry);

      return {
        id: line.id,
        date: line.journalEntry.entryDate,
        entryNumber: line.journalEntry.entryNumber,
        journalEntryId: line.journalEntry.id,
        description: line.description ?? line.journalEntry.description,
        reference: line.journalEntry.reference,
        debit: this.formatMoney(line.debit),
        credit: this.formatMoney(line.credit),
        runningBalance: this.formatMoney(runningBalance),
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        sourceNumber: source.sourceNumber,
      };
    });

    return {
      profile,
      account: profile.account,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      openingBalance: this.formatMoney(openingBalance),
      closingBalance: this.formatMoney(runningBalance),
      transactions,
    };
  }

  private async findExisting(organizationId: string, id: string) {
    const profile = await this.prisma.bankAccountProfile.findFirst({
      where: { id, organizationId },
      include: bankAccountInclude,
    });

    if (!profile) {
      throw new NotFoundException("Bank account profile not found.");
    }

    return profile;
  }

  private async validateLinkedAccount(organizationId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, organizationId },
      select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true },
    });

    if (!account) {
      throw new BadRequestException("Linked account must belong to this organization.");
    }
    if (account.type !== AccountType.ASSET) {
      throw new BadRequestException("Bank account profiles can only be linked to asset accounts.");
    }
    if (!account.allowPosting || !account.isActive) {
      throw new BadRequestException("Bank account profiles require an active posting account.");
    }

    return account;
  }

  private async withLedgerSummary<T extends { organizationId: string; accountId: string }>(profile: T) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId: profile.organizationId,
        accountId: profile.accountId,
        journalEntry: { status: { in: POSTED_LEDGER_STATUSES } },
      },
      select: {
        debit: true,
        credit: true,
        journalEntry: { select: { entryDate: true } },
      },
      orderBy: [{ journalEntry: { entryDate: "asc" } }],
    });

    const ledgerBalance = lines.reduce(
      (balance, line) => balance.plus(this.decimal(line.debit)).minus(this.decimal(line.credit)),
      new Prisma.Decimal(0),
    );
    const latestTransactionDate = lines.at(-1)?.journalEntry.entryDate ?? null;

    return {
      ...profile,
      ledgerBalance: this.formatMoney(ledgerBalance),
      latestTransactionDate,
      transactionCount: lines.length,
    };
  }

  private async ledgerBalance(accountId: string, dateFilter?: Prisma.DateTimeFilter<"JournalEntry">): Promise<Prisma.Decimal> {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          status: { in: POSTED_LEDGER_STATUSES },
          entryDate: dateFilter,
        },
      },
      select: { debit: true, credit: true },
    });

    return lines.reduce(
      (balance, line) => balance.plus(this.decimal(line.debit)).minus(this.decimal(line.credit)),
      new Prisma.Decimal(0),
    );
  }

  private parseDateRange(query: BankAccountTransactionsQueryDto): { from: Date | null; to: Date | null } {
    const from = query.from ? this.parseDate(query.from, "from") : null;
    const to = query.to ? this.parseDate(query.to, "to") : null;
    if (from && to && from > to) {
      throw new BadRequestException("From date cannot be after to date.");
    }
    return { from, to };
  }

  private parseDate(value: string, label: "from" | "to"): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly && label === "to" ? `${value}T23:59:59.999Z` : value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label} date.`);
    }
    return date;
  }

  private entryDateFilter(from: Date | null, to: Date | null): Prisma.DateTimeFilter<"JournalEntry"> | undefined {
    if (!from && !to) {
      return undefined;
    }
    return {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  private async findPostingAccountByCode(organizationId: string, code: string, executor: PrismaService | Prisma.TransactionClient) {
    const account = await executor.account.findFirst({
      where: { organizationId, code, isActive: true, allowPosting: true },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(`Required posting account ${code} was not found.`);
    }
    return account;
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

  private assertOpeningBalanceCanChange(
    existing: { openingBalanceJournalEntryId?: string | null; openingBalance?: Prisma.Decimal.Value; openingBalanceDate?: Date | null },
    dto: UpdateBankAccountProfileDto,
  ): void {
    if (!existing.openingBalanceJournalEntryId) {
      return;
    }

    const currentBalance = this.formatMoney(existing.openingBalance ?? "0.0000");
    const nextBalance = dto.openingBalance === undefined ? currentBalance : this.formatMoney(dto.openingBalance);
    const currentDate = existing.openingBalanceDate?.toISOString() ?? null;
    const nextDate =
      dto.openingBalanceDate === undefined
        ? currentDate
        : dto.openingBalanceDate === null
          ? null
          : new Date(dto.openingBalanceDate).toISOString();

    if (nextBalance !== currentBalance || nextDate !== currentDate) {
      throw new BadRequestException("Opening balance cannot be changed after it has been posted.");
    }
  }

  private sourceForEntry(entry: SourceEntry): { sourceType: string; sourceId: string | null; sourceNumber: string | null } {
    if (entry.bankTransfer) {
      return { sourceType: "BANK_TRANSFER", sourceId: entry.bankTransfer.id, sourceNumber: entry.bankTransfer.transferNumber };
    }
    if (entry.voidedBankTransfer) {
      return { sourceType: "VOID_BANK_TRANSFER", sourceId: entry.voidedBankTransfer.id, sourceNumber: entry.voidedBankTransfer.transferNumber };
    }
    if (entry.bankAccountOpeningProfile) {
      return {
        sourceType: "BANK_ACCOUNT_OPENING_BALANCE",
        sourceId: entry.bankAccountOpeningProfile.id,
        sourceNumber: entry.reference ?? null,
      };
    }

    const sources: Array<[string, { id: string } | null | undefined]> = [
      ["SalesInvoice", entry.salesInvoice],
      ["VoidSalesInvoice", entry.voidedSalesInvoice],
      ["CreditNote", entry.creditNote],
      ["VoidCreditNote", entry.voidedCreditNote],
      ["PurchaseBill", entry.purchaseBill],
      ["VoidPurchaseBill", entry.voidedPurchaseBill],
      ["PurchaseDebitNote", entry.purchaseDebitNote],
      ["VoidPurchaseDebitNote", entry.voidedPurchaseDebitNote],
      ["CashExpense", entry.cashExpense],
      ["VoidCashExpense", entry.voidedCashExpense],
      ["CustomerPayment", entry.customerPayment],
      ["VoidCustomerPayment", entry.voidedCustomerPayment],
      ["SupplierPayment", entry.supplierPayment],
      ["VoidSupplierPayment", entry.voidedSupplierPayment],
      ["CustomerRefund", entry.customerRefund],
      ["VoidCustomerRefund", entry.voidedCustomerRefund],
      ["SupplierRefund", entry.supplierRefund],
      ["VoidSupplierRefund", entry.voidedSupplierRefund],
    ];
    const source = sources.find(([, value]) => Boolean(value));
    return source
      ? { sourceType: source[0], sourceId: source[1]?.id ?? null, sourceNumber: entry.reference ?? null }
      : { sourceType: "ManualJournal", sourceId: entry.id, sourceNumber: entry.reference ?? null };
  }

  private cleanOptional(value?: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private cleanNullable(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.cleanOptional(value);
  }

  private requiredText(value: string, label: string): string {
    const cleaned = value.trim();
    if (!cleaned) {
      throw new BadRequestException(`${label} is required.`);
    }
    return cleaned;
  }

  private money(value: string): string {
    return this.formatMoney(this.decimal(value));
  }

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException("Amount must be a valid decimal value.");
    }
  }

  private formatMoney(value: Prisma.Decimal.Value): string {
    return new Prisma.Decimal(value).toFixed(4);
  }
}

function buildOpeningBalanceJournalLines(input: {
  bankAccountId: string;
  equityAccountId: string;
  displayName: string;
  amount: string;
  currency: string;
  isPositive: boolean;
}): JournalLineInput[] {
  if (input.isPositive) {
    return [
      {
        accountId: input.bankAccountId,
        debit: input.amount,
        credit: "0.0000",
        description: `Opening balance for ${input.displayName}`,
        currency: input.currency,
        exchangeRate: "1",
      },
      {
        accountId: input.equityAccountId,
        debit: "0.0000",
        credit: input.amount,
        description: `Opening balance equity offset for ${input.displayName}`,
        currency: input.currency,
        exchangeRate: "1",
      },
    ];
  }

  return [
    {
      accountId: input.equityAccountId,
      debit: input.amount,
      credit: "0.0000",
      description: `Opening balance equity offset for ${input.displayName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
    {
      accountId: input.bankAccountId,
      debit: "0.0000",
      credit: input.amount,
      description: `Opening balance for ${input.displayName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];
}
