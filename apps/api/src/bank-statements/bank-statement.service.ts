import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import {
  BankAccountStatus,
  BankStatementImportStatus,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { BankReconciliationSummaryQueryDto, BankStatementTransactionsQueryDto } from "./dto/bank-statement-query.dto";
import { CategorizeBankStatementTransactionDto } from "./dto/categorize-bank-statement-transaction.dto";
import { BankStatementImportRowDto, CreateBankStatementImportDto } from "./dto/create-bank-statement-import.dto";
import { IgnoreBankStatementTransactionDto } from "./dto/ignore-bank-statement-transaction.dto";
import { MatchBankStatementTransactionDto } from "./dto/match-bank-statement-transaction.dto";

const POSTED_LEDGER_STATUSES: JournalEntryStatus[] = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];

const bankStatementImportInclude = {
  bankAccountProfile: {
    select: {
      id: true,
      displayName: true,
      accountId: true,
      currency: true,
      status: true,
      account: { select: { id: true, code: true, name: true } },
    },
  },
  importedBy: { select: { id: true, name: true, email: true } },
  _count: { select: { transactions: true } },
};

const bankStatementTransactionInclude = {
  import: { select: { id: true, filename: true, status: true, importedAt: true } },
  bankAccountProfile: {
    select: {
      id: true,
      displayName: true,
      accountId: true,
      currency: true,
      account: { select: { id: true, code: true, name: true } },
    },
  },
  matchedJournalLine: {
    select: {
      id: true,
      debit: true,
      credit: true,
      description: true,
      journalEntry: { select: { id: true, entryNumber: true, entryDate: true, description: true, reference: true } },
    },
  },
  matchedJournalEntry: { select: { id: true, entryNumber: true, entryDate: true, description: true, reference: true } },
  categorizedAccount: { select: { id: true, code: true, name: true, type: true } },
  createdJournalEntry: { select: { id: true, entryNumber: true, entryDate: true, description: true, reference: true } },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type StatementTransactionWithProfile = Awaited<ReturnType<BankStatementService["getTransactionForMutation"]>>;

@Injectable()
export class BankStatementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly fiscalPeriodGuardService: FiscalPeriodGuardService,
  ) {}

  async listImports(organizationId: string, bankAccountProfileId: string) {
    await this.findProfile(organizationId, bankAccountProfileId);
    return this.prisma.bankStatementImport.findMany({
      where: { organizationId, bankAccountProfileId },
      orderBy: { importedAt: "desc" },
      include: bankStatementImportInclude,
    });
  }

  async importStatement(
    organizationId: string,
    actorUserId: string,
    bankAccountProfileId: string,
    dto: CreateBankStatementImportDto,
  ) {
    const profile = await this.findProfile(organizationId, bankAccountProfileId, { requireActive: true });
    const filename = this.requiredText(dto.filename, "Filename");
    const rows = dto.rows.map((row, index) => this.normalizeImportRow(row, index));
    const openingStatementBalance =
      dto.openingStatementBalance === undefined ? undefined : this.nonNegativeOrNegativeMoney(dto.openingStatementBalance, "Opening statement balance");
    const closingStatementBalance =
      dto.closingStatementBalance === undefined ? undefined : this.nonNegativeOrNegativeMoney(dto.closingStatementBalance, "Closing statement balance");
    const statementStartDate = rows.reduce<Date | null>((earliest, row) => (!earliest || row.date < earliest ? row.date : earliest), null);
    const statementEndDate = rows.reduce<Date | null>((latest, row) => (!latest || row.date > latest ? row.date : latest), null);

    const created = await this.prisma.$transaction((tx) =>
      tx.bankStatementImport.create({
        data: {
          organizationId,
          bankAccountProfileId: profile.id,
          importedById: actorUserId,
          filename,
          sourceType: "CSV",
          status: BankStatementImportStatus.IMPORTED,
          statementStartDate,
          statementEndDate,
          openingStatementBalance: openingStatementBalance?.toFixed(4),
          closingStatementBalance: closingStatementBalance?.toFixed(4),
          rowCount: rows.length,
          transactions: {
            create: rows.map((row) => ({
              organizationId,
              bankAccountProfileId: profile.id,
              transactionDate: row.date,
              description: row.description,
              reference: row.reference,
              type: row.type,
              amount: row.amount.toFixed(4),
              status: BankStatementTransactionStatus.UNMATCHED,
              rawData: row.rawData as Prisma.InputJsonValue,
            })),
          },
        },
        include: bankStatementImportInclude,
      }),
    );

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "IMPORT",
      entityType: "BankStatementImport",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async getImport(organizationId: string, id: string) {
    const statementImport = await this.prisma.bankStatementImport.findFirst({
      where: { id, organizationId },
      include: {
        ...bankStatementImportInclude,
        transactions: { orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }], include: bankStatementTransactionInclude },
      },
    });
    if (!statementImport) {
      throw new NotFoundException("Bank statement import not found.");
    }
    return statementImport;
  }

  async voidImport(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.getImport(organizationId, id);
    if (existing.status === BankStatementImportStatus.VOIDED) {
      return existing;
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const blocking = await tx.bankStatementTransaction.count({
        where: {
          organizationId,
          importId: id,
          status: { in: [BankStatementTransactionStatus.MATCHED, BankStatementTransactionStatus.CATEGORIZED] },
        },
      });
      if (blocking > 0) {
        throw new BadRequestException("Cannot void a statement import after transactions have been matched or categorized.");
      }

      await tx.bankStatementTransaction.updateMany({
        where: { organizationId, importId: id, status: { not: BankStatementTransactionStatus.VOIDED } },
        data: { status: BankStatementTransactionStatus.VOIDED },
      });
      return tx.bankStatementImport.update({
        where: { id },
        data: { status: BankStatementImportStatus.VOIDED },
        include: bankStatementImportInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "BankStatementImport",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async listTransactions(organizationId: string, bankAccountProfileId: string, query: BankStatementTransactionsQueryDto) {
    await this.findProfile(organizationId, bankAccountProfileId);
    const { from, to } = this.parseDateRange(query);
    return this.prisma.bankStatementTransaction.findMany({
      where: {
        organizationId,
        bankAccountProfileId,
        status: this.statusFilter(query.status),
        transactionDate: this.entryDateFilter(from, to),
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include: bankStatementTransactionInclude,
    });
  }

  async getTransaction(organizationId: string, id: string) {
    const transaction = await this.prisma.bankStatementTransaction.findFirst({
      where: { id, organizationId },
      include: bankStatementTransactionInclude,
    });
    if (!transaction) {
      throw new NotFoundException("Bank statement transaction not found.");
    }
    return transaction;
  }

  async matchCandidates(organizationId: string, id: string) {
    const transaction = await this.getTransactionForMutation(organizationId, id);
    const windowStart = new Date(transaction.transactionDate);
    windowStart.setUTCDate(windowStart.getUTCDate() - 7);
    const windowEnd = new Date(transaction.transactionDate);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 7);

    const amount = this.formatMoney(transaction.amount);
    const directionFilter =
      transaction.type === BankStatementTransactionType.CREDIT
        ? { debit: amount, credit: "0.0000" }
        : { debit: "0.0000", credit: amount };
    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId,
        accountId: transaction.bankAccountProfile.accountId,
        ...directionFilter,
        journalEntry: {
          status: { in: POSTED_LEDGER_STATUSES },
          entryDate: { gte: windowStart, lte: windowEnd },
        },
      },
      orderBy: [{ journalEntry: { entryDate: "asc" } }, { journalEntry: { entryNumber: "asc" } }],
      include: {
        journalEntry: { select: { id: true, entryNumber: true, entryDate: true, description: true, reference: true } },
      },
    });

    return lines.map((line) => {
      const reason: string[] = ["amount and direction match"];
      let score = 70;
      if (sameUtcDate(line.journalEntry.entryDate, transaction.transactionDate)) {
        score += 20;
        reason.push("same date");
      }
      if (transaction.reference && line.journalEntry.reference?.includes(transaction.reference)) {
        score += 10;
        reason.push("reference match");
      }
      return {
        journalLineId: line.id,
        journalEntryId: line.journalEntry.id,
        date: line.journalEntry.entryDate,
        entryNumber: line.journalEntry.entryNumber,
        description: line.description ?? line.journalEntry.description,
        reference: line.journalEntry.reference,
        debit: this.formatMoney(line.debit),
        credit: this.formatMoney(line.credit),
        score: Math.min(score, 100),
        reason: reason.join(", "),
      };
    });
  }

  async matchTransaction(organizationId: string, actorUserId: string, id: string, dto: MatchBankStatementTransactionDto) {
    const existing = await this.getTransactionForMutation(organizationId, id);
    this.assertUnmatched(existing);
    const line = await this.prisma.journalLine.findFirst({
      where: { id: dto.journalLineId, organizationId },
      include: { journalEntry: { select: { id: true, status: true } } },
    });
    if (!line) {
      throw new BadRequestException("Journal line must belong to this organization.");
    }
    this.assertLineMatchesStatement(existing, line);

    const updated = await this.prisma.bankStatementTransaction.update({
      where: { id },
      data: {
        status: BankStatementTransactionStatus.MATCHED,
        matchedJournalLineId: line.id,
        matchedJournalEntryId: line.journalEntryId,
        matchType: BankStatementMatchType.JOURNAL_LINE,
      },
      include: bankStatementTransactionInclude,
    });
    await this.refreshImportStatus(organizationId, existing.importId);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "MATCH",
      entityType: "BankStatementTransaction",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async categorizeTransaction(
    organizationId: string,
    actorUserId: string,
    id: string,
    dto: CategorizeBankStatementTransactionDto,
  ) {
    const existing = await this.getTransactionForMutation(organizationId, id);
    this.assertUnmatched(existing);

    const categorized = await this.prisma.$transaction(async (tx) => {
      const current = await tx.bankStatementTransaction.findFirst({
        where: { id, organizationId },
        include: {
          bankAccountProfile: {
            select: { id: true, accountId: true, displayName: true, currency: true, account: { select: { id: true, code: true, name: true } } },
          },
        },
      });
      if (!current) {
        throw new NotFoundException("Bank statement transaction not found.");
      }
      this.assertUnmatched(current);
      const account = await tx.account.findFirst({
        where: { id: dto.accountId, organizationId, isActive: true, allowPosting: true },
        select: { id: true, code: true, name: true },
      });
      if (!account) {
        throw new BadRequestException("Categorized account must be an active posting account in this organization.");
      }
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, current.transactionDate, tx);

      const amount = this.formatMoney(current.amount);
      const description =
        this.cleanOptional(dto.description) ?? `Bank statement categorization: ${current.description}`;
      const journalLines = buildCategorizationJournalLines({
        bankAccountId: current.bankAccountProfile.accountId,
        categorizedAccountId: account.id,
        statementType: current.type,
        amount,
        currency: current.bankAccountProfile.currency,
        description,
      });
      const totals = getJournalTotals(journalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const postedAt = new Date();
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: current.transactionDate,
          description,
          reference: current.reference,
          currency: current.bankAccountProfile.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt,
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      const claim = await tx.bankStatementTransaction.updateMany({
        where: { id, organizationId, status: BankStatementTransactionStatus.UNMATCHED },
        data: {
          status: BankStatementTransactionStatus.CATEGORIZED,
          categorizedAccountId: account.id,
          createdJournalEntryId: journalEntry.id,
          matchType: BankStatementMatchType.MANUAL_JOURNAL,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Only unmatched bank statement transactions can be categorized.");
      }

      return tx.bankStatementTransaction.findUniqueOrThrow({
        where: { id },
        include: bankStatementTransactionInclude,
      });
    });

    await this.refreshImportStatus(organizationId, existing.importId);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CATEGORIZE",
      entityType: "BankStatementTransaction",
      entityId: id,
      before: existing,
      after: categorized,
    });
    return categorized;
  }

  async ignoreTransaction(organizationId: string, actorUserId: string, id: string, dto: IgnoreBankStatementTransactionDto) {
    const existing = await this.getTransactionForMutation(organizationId, id);
    this.assertUnmatched(existing);
    const reason = this.requiredText(dto.reason, "Ignore reason");
    const updated = await this.prisma.bankStatementTransaction.update({
      where: { id },
      data: {
        status: BankStatementTransactionStatus.IGNORED,
        ignoredReason: reason,
      },
      include: bankStatementTransactionInclude,
    });
    await this.refreshImportStatus(organizationId, existing.importId);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "IGNORE",
      entityType: "BankStatementTransaction",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async reconciliationSummary(organizationId: string, bankAccountProfileId: string, query: BankReconciliationSummaryQueryDto) {
    const profile = await this.findProfile(organizationId, bankAccountProfileId);
    const { from, to } = this.parseDateRange(query);
    const [imports, transactions, ledgerBalance] = await Promise.all([
      this.prisma.bankStatementImport.findMany({
        where: { organizationId, bankAccountProfileId, status: { not: BankStatementImportStatus.VOIDED } },
        orderBy: [{ statementEndDate: "desc" }, { importedAt: "desc" }],
        include: bankStatementImportInclude,
      }),
      this.prisma.bankStatementTransaction.findMany({
        where: {
          organizationId,
          bankAccountProfileId,
          status: { not: BankStatementTransactionStatus.VOIDED },
          transactionDate: this.entryDateFilter(from, to),
        },
        select: { status: true, type: true, amount: true },
      }),
      this.ledgerBalance(profile.accountId),
    ]);
    const importsInRange = imports.filter((statementImport) => importOverlapsRange(statementImport, from, to));
    const latestClosingImport = importsInRange.find((statementImport) => statementImport.closingStatementBalance !== null);
    const statementClosingBalance = latestClosingImport?.closingStatementBalance ?? null;
    const difference = statementClosingBalance === null ? null : new Prisma.Decimal(statementClosingBalance).minus(ledgerBalance);
    const totals = summarizeStatementTransactions(transactions);
    const statusSuggestion =
      difference !== null && difference.eq(0) && (totals.unmatched?.count ?? 0) === 0 ? "RECONCILED" : "NEEDS_REVIEW";

    return {
      profile,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      imports: importsInRange,
      totals,
      ledgerBalance: this.formatMoney(ledgerBalance),
      statementClosingBalance: statementClosingBalance === null ? null : this.formatMoney(statementClosingBalance),
      difference: difference === null ? null : this.formatMoney(difference),
      statusSuggestion,
    };
  }

  private async getTransactionForMutation(organizationId: string, id: string) {
    const transaction = await this.prisma.bankStatementTransaction.findFirst({
      where: { id, organizationId },
      include: {
        bankAccountProfile: {
          select: { id: true, accountId: true, displayName: true, currency: true, account: { select: { id: true, code: true, name: true } } },
        },
      },
    });
    if (!transaction) {
      throw new NotFoundException("Bank statement transaction not found.");
    }
    return transaction;
  }

  private async findProfile(organizationId: string, id: string, options: { requireActive?: boolean } = {}) {
    const profile = await this.prisma.bankAccountProfile.findFirst({
      where: { id, organizationId },
      include: { account: { select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } } },
    });
    if (!profile) {
      throw new NotFoundException("Bank account profile not found.");
    }
    if (options.requireActive && profile.status !== BankAccountStatus.ACTIVE) {
      throw new BadRequestException("Only active bank account profiles can import statements.");
    }
    return profile;
  }

  private normalizeImportRow(row: BankStatementImportRowDto, index: number) {
    const date = this.parseDate(row.date, `Row ${index + 1} date`);
    const description = this.requiredText(row.description, `Row ${index + 1} description`);
    const debit = this.nonNegativeMoney(row.debit ?? "0.0000", `Row ${index + 1} debit`);
    const credit = this.nonNegativeMoney(row.credit ?? "0.0000", `Row ${index + 1} credit`);
    if (debit.gt(0) && credit.gt(0)) {
      throw new BadRequestException(`Row ${index + 1} cannot contain both debit and credit.`);
    }
    if (debit.eq(0) && credit.eq(0)) {
      throw new BadRequestException(`Row ${index + 1} requires a debit or credit amount.`);
    }

    const isCredit = credit.gt(0);
    return {
      date,
      description,
      reference: this.cleanOptional(row.reference),
      type: isCredit ? BankStatementTransactionType.CREDIT : BankStatementTransactionType.DEBIT,
      amount: isCredit ? credit : debit,
      rawData: {
        date: row.date,
        description: row.description,
        reference: row.reference ?? null,
        debit: row.debit ?? null,
        credit: row.credit ?? null,
      },
    };
  }

  private assertUnmatched(transaction: { status: BankStatementTransactionStatus }) {
    if (transaction.status !== BankStatementTransactionStatus.UNMATCHED) {
      throw new BadRequestException("Only unmatched bank statement transactions can be changed.");
    }
  }

  private assertLineMatchesStatement(
    transaction: Pick<StatementTransactionWithProfile, "type" | "amount" | "bankAccountProfile">,
    line: {
      accountId: string;
      debit: Prisma.Decimal.Value;
      credit: Prisma.Decimal.Value;
      journalEntry: { status: JournalEntryStatus };
    },
  ) {
    if (line.accountId !== transaction.bankAccountProfile.accountId) {
      throw new BadRequestException("Journal line must use the linked bank account.");
    }
    if (!POSTED_LEDGER_STATUSES.includes(line.journalEntry.status)) {
      throw new BadRequestException("Journal line must belong to a posted ledger entry.");
    }
    const debit = new Prisma.Decimal(line.debit);
    const credit = new Prisma.Decimal(line.credit);
    const amount = new Prisma.Decimal(transaction.amount);
    const matches =
      transaction.type === BankStatementTransactionType.CREDIT
        ? debit.eq(amount) && credit.eq(0)
        : credit.eq(amount) && debit.eq(0);
    if (!matches) {
      throw new BadRequestException("Journal line amount and direction do not match the statement transaction.");
    }
  }

  private async refreshImportStatus(organizationId: string, importId: string, executor: PrismaExecutor = this.prisma) {
    const statementImport = await executor.bankStatementImport.findFirst({
      where: { id: importId, organizationId },
      select: { id: true, status: true },
    });
    if (!statementImport || statementImport.status === BankStatementImportStatus.VOIDED) {
      return;
    }
    const transactions = await executor.bankStatementTransaction.findMany({
      where: { organizationId, importId, status: { not: BankStatementTransactionStatus.VOIDED } },
      select: { status: true },
    });
    const nextStatus = importStatusForTransactions(transactions.map((item) => item.status));
    await executor.bankStatementImport.update({ where: { id: importId }, data: { status: nextStatus } });
  }

  private async ledgerBalance(accountId: string): Promise<Prisma.Decimal> {
    const lines = await this.prisma.journalLine.findMany({
      where: { accountId, journalEntry: { status: { in: POSTED_LEDGER_STATUSES } } },
      select: { debit: true, credit: true },
    });
    return lines.reduce(
      (balance, line) => balance.plus(new Prisma.Decimal(line.debit)).minus(new Prisma.Decimal(line.credit)),
      new Prisma.Decimal(0),
    );
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

  private parseDateRange(query: BankStatementTransactionsQueryDto | BankReconciliationSummaryQueryDto): { from: Date | null; to: Date | null } {
    const from = query.from ? this.parseDate(query.from, "from") : null;
    const to = query.to ? endOfDate(this.parseDate(query.to, "to")) : null;
    if (from && to && from > to) {
      throw new BadRequestException("From date cannot be after to date.");
    }
    return { from, to };
  }

  private entryDateFilter(from: Date | null, to: Date | null): Prisma.DateTimeFilter<"BankStatementTransaction"> | undefined {
    const filter: Prisma.DateTimeFilter<"BankStatementTransaction"> = {};
    if (from) {
      filter.gte = from;
    }
    if (to) {
      filter.lte = to;
    }
    return Object.keys(filter).length ? filter : undefined;
  }

  private statusFilter(status: string | undefined) {
    if (!status) {
      return undefined;
    }
    if (!Object.values(BankStatementTransactionStatus).includes(status as BankStatementTransactionStatus)) {
      throw new BadRequestException("Unknown bank statement transaction status.");
    }
    return status as BankStatementTransactionStatus;
  }

  private parseDate(value: string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} is invalid.`);
    }
    return date;
  }

  private nonNegativeMoney(value: string, label: string) {
    const money = this.nonNegativeOrNegativeMoney(value, label);
    if (money.lt(0)) {
      throw new BadRequestException(`${label} cannot be negative.`);
    }
    return money;
  }

  private nonNegativeOrNegativeMoney(value: string, label: string) {
    try {
      return toMoney(value);
    } catch {
      throw new BadRequestException(`${label} must be a valid decimal amount.`);
    }
  }

  private requiredText(value: string | undefined, label: string): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException(`${label} is required.`);
    }
    return trimmed;
  }

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private formatMoney(value: Prisma.Decimal.Value): string {
    return new Prisma.Decimal(value).toFixed(4);
  }
}

function buildCategorizationJournalLines(input: {
  bankAccountId: string;
  categorizedAccountId: string;
  statementType: BankStatementTransactionType;
  amount: string;
  currency: string;
  description: string;
}): JournalLineInput[] {
  if (input.statementType === BankStatementTransactionType.CREDIT) {
    return [
      { accountId: input.bankAccountId, debit: input.amount, credit: "0.0000", currency: input.currency, exchangeRate: "1", description: input.description },
      { accountId: input.categorizedAccountId, debit: "0.0000", credit: input.amount, currency: input.currency, exchangeRate: "1", description: input.description },
    ];
  }
  return [
    { accountId: input.categorizedAccountId, debit: input.amount, credit: "0.0000", currency: input.currency, exchangeRate: "1", description: input.description },
    { accountId: input.bankAccountId, debit: "0.0000", credit: input.amount, currency: input.currency, exchangeRate: "1", description: input.description },
  ];
}

function importStatusForTransactions(statuses: BankStatementTransactionStatus[]): BankStatementImportStatus {
  if (statuses.length === 0) {
    return BankStatementImportStatus.IMPORTED;
  }
  const unmatchedCount = statuses.filter((status) => status === BankStatementTransactionStatus.UNMATCHED).length;
  if (unmatchedCount === statuses.length) {
    return BankStatementImportStatus.IMPORTED;
  }
  if (unmatchedCount === 0) {
    return BankStatementImportStatus.RECONCILED;
  }
  return BankStatementImportStatus.PARTIALLY_RECONCILED;
}

function summarizeStatementTransactions(transactions: Array<{ status: BankStatementTransactionStatus; type: BankStatementTransactionType; amount: Prisma.Decimal }>) {
  const summary = {
    credits: { count: 0, total: new Prisma.Decimal(0) },
    debits: { count: 0, total: new Prisma.Decimal(0) },
    unmatched: { count: 0, total: new Prisma.Decimal(0) },
    matched: { count: 0, total: new Prisma.Decimal(0) },
    categorized: { count: 0, total: new Prisma.Decimal(0) },
    ignored: { count: 0, total: new Prisma.Decimal(0) },
  };

  for (const transaction of transactions) {
    const amount = new Prisma.Decimal(transaction.amount);
    if (transaction.type === BankStatementTransactionType.CREDIT) {
      summary.credits.count += 1;
      summary.credits.total = summary.credits.total.plus(amount);
    } else {
      summary.debits.count += 1;
      summary.debits.total = summary.debits.total.plus(amount);
    }

    if (transaction.status === BankStatementTransactionStatus.UNMATCHED) {
      summary.unmatched.count += 1;
      summary.unmatched.total = summary.unmatched.total.plus(amount);
    } else if (transaction.status === BankStatementTransactionStatus.MATCHED) {
      summary.matched.count += 1;
      summary.matched.total = summary.matched.total.plus(amount);
    } else if (transaction.status === BankStatementTransactionStatus.CATEGORIZED) {
      summary.categorized.count += 1;
      summary.categorized.total = summary.categorized.total.plus(amount);
    } else if (transaction.status === BankStatementTransactionStatus.IGNORED) {
      summary.ignored.count += 1;
      summary.ignored.total = summary.ignored.total.plus(amount);
    }
  }

  return Object.fromEntries(
    Object.entries(summary).map(([key, value]) => [key, { count: value.count, total: value.total.toFixed(4) }]),
  );
}

function importOverlapsRange(
  statementImport: { statementStartDate: Date | null; statementEndDate: Date | null; importedAt: Date },
  from: Date | null,
  to: Date | null,
): boolean {
  if (!from && !to) {
    return true;
  }
  const start = statementImport.statementStartDate ?? statementImport.importedAt;
  const end = statementImport.statementEndDate ?? statementImport.importedAt;
  if (from && end < from) {
    return false;
  }
  if (to && start > to) {
    return false;
  }
  return true;
}

function sameUtcDate(left: Date, right: Date): boolean {
  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function endOfDate(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
}
