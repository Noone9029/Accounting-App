import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountType, BankAccountStatus, JournalEntryStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { BankAccountTransactionsQueryDto } from "./dto/bank-account-transactions-query.dto";
import { CreateBankAccountProfileDto } from "./dto/create-bank-account-profile.dto";
import { UpdateBankAccountProfileDto } from "./dto/update-bank-account-profile.dto";

const bankAccountInclude = {
  account: { select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } },
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
    },
  },
};

type SourceEntry = {
  id: string;
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
};

@Injectable()
export class BankAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
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
          status: JournalEntryStatus.POSTED,
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
        journalEntry: { status: JournalEntryStatus.POSTED },
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
          status: JournalEntryStatus.POSTED,
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

  private sourceForEntry(entry: SourceEntry): { sourceType: string; sourceId: string | null } {
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
    return source ? { sourceType: source[0], sourceId: source[1]?.id ?? null } : { sourceType: "ManualJournal", sourceId: entry.id };
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
