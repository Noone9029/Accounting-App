import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import {
  BankAccountStatus,
  BankReconciliationStatus,
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
import { parseBankStatementImportInput, StatementImportSourceRow } from "./bank-statement-import-parser";
import { CategorizeBankStatementTransactionDto } from "./dto/categorize-bank-statement-transaction.dto";
import { CreateBankStatementImportDto, PreviewBankStatementImportDto } from "./dto/create-bank-statement-import.dto";
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
  reconciliationItems: {
    include: {
      reconciliation: {
        select: {
          id: true,
          reconciliationNumber: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          closedAt: true,
        },
      },
    },
  },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type StatementTransactionWithProfile = Awaited<ReturnType<BankStatementService["getTransactionForMutation"]>>;

interface NormalizedStatementImportRow {
  sourceRowNumber: number;
  date: Date;
  description: string;
  reference?: string;
  type: BankStatementTransactionType;
  amount: Prisma.Decimal;
  rawData: Record<string, unknown>;
}

interface InvalidStatementImportRow {
  rowNumber: number;
  errors: string[];
  rawData: Record<string, unknown>;
}

interface StatementImportValidationResult {
  validRows: NormalizedStatementImportRow[];
  invalidRows: InvalidStatementImportRow[];
  warnings: string[];
  closedPeriodRowNumbers: number[];
  totalCredits: Prisma.Decimal;
  totalDebits: Prisma.Decimal;
}

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

  async previewImport(organizationId: string, bankAccountProfileId: string, dto: PreviewBankStatementImportDto) {
    await this.findProfile(organizationId, bankAccountProfileId, { requireActive: true });
    const filename = this.requiredText(dto.filename, "Filename");
    const parsed = parseBankStatementImportInput(dto);
    const validation = await this.validateImportRows(organizationId, bankAccountProfileId, parsed.rows);

    return {
      filename,
      rowCount: parsed.rows.length,
      validRows: validation.validRows.map((row) => this.previewRow(row)),
      invalidRows: validation.invalidRows,
      totalCredits: validation.totalCredits.toFixed(4),
      totalDebits: validation.totalDebits.toFixed(4),
      detectedColumns: parsed.detectedColumns,
      warnings: [...parsed.warnings, ...validation.warnings],
    };
  }

  async importStatement(
    organizationId: string,
    actorUserId: string,
    bankAccountProfileId: string,
    dto: CreateBankStatementImportDto,
  ) {
    const profile = await this.findProfile(organizationId, bankAccountProfileId, { requireActive: true });
    const filename = this.requiredText(dto.filename, "Filename");
    const parsed = parseBankStatementImportInput(dto);
    const validation = await this.validateImportRows(organizationId, profile.id, parsed.rows);
    if (validation.invalidRows.length > 0 && !dto.allowPartial) {
      throw new BadRequestException("Bank statement import contains invalid rows.");
    }
    if (validation.closedPeriodRowNumbers.length > 0) {
      throw new BadRequestException("Cannot import statement transactions into a closed reconciliation period.");
    }
    const rows = validation.validRows;
    if (rows.length === 0) {
      throw new BadRequestException("Bank statement import must contain at least one valid row.");
    }
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
    return {
      ...created,
      invalidRows: dto.allowPartial ? validation.invalidRows : [],
      importSummary: {
        sourceRowCount: parsed.rows.length,
        importedRowCount: rows.length,
        invalidRowCount: validation.invalidRows.length,
        totalCredits: validation.totalCredits.toFixed(4),
        totalDebits: validation.totalDebits.toFixed(4),
        warnings: [...parsed.warnings, ...validation.warnings],
      },
    };
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
      const affectedRows = await tx.bankStatementTransaction.findMany({
        where: { organizationId, importId: id, status: { not: BankStatementTransactionStatus.VOIDED } },
        select: { bankAccountProfileId: true, transactionDate: true },
      });
      await this.assertRowsNotInClosedReconciliation(organizationId, null, affectedRows, tx);

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
    await this.assertTransactionNotInClosedReconciliation(organizationId, existing.bankAccountProfile.id, existing.transactionDate);
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
    await this.assertTransactionNotInClosedReconciliation(organizationId, existing.bankAccountProfile.id, existing.transactionDate);
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
      await this.assertTransactionNotInClosedReconciliation(organizationId, current.bankAccountProfile.id, current.transactionDate, tx);
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
    await this.assertTransactionNotInClosedReconciliation(organizationId, existing.bankAccountProfile.id, existing.transactionDate);
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
    const [imports, transactions, ledgerBalance, latestClosedReconciliation, openDraftCount, unreconciledTransactionCount] = await Promise.all([
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
      this.ledgerBalance(organizationId, profile.accountId),
      this.prisma.bankReconciliation.findFirst({
        where: { organizationId, bankAccountProfileId, status: BankReconciliationStatus.CLOSED },
        orderBy: [{ periodEnd: "desc" }, { closedAt: "desc" }],
        include: {
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
          _count: { select: { items: true } },
        },
      }),
      this.prisma.bankReconciliation.count({
        where: { organizationId, bankAccountProfileId, status: BankReconciliationStatus.DRAFT },
      }),
      this.prisma.bankStatementTransaction.count({
        where: {
          organizationId,
          bankAccountProfileId,
          status: { not: BankStatementTransactionStatus.VOIDED },
          transactionDate: this.entryDateFilter(from, to),
          reconciliationItems: { none: { reconciliation: { status: BankReconciliationStatus.CLOSED } } },
        },
      }),
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
      latestClosedReconciliation,
      hasOpenDraftReconciliation: openDraftCount > 0,
      unreconciledTransactionCount,
      closedThroughDate: latestClosedReconciliation?.periodEnd?.toISOString() ?? null,
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

  private async assertRowsNotInClosedReconciliation(
    organizationId: string,
    defaultBankAccountProfileId: string | null,
    rows: Array<{ bankAccountProfileId?: string; date?: Date; transactionDate?: Date }>,
    executor: PrismaExecutor = this.prisma,
  ): Promise<void> {
    for (const row of rows) {
      const bankAccountProfileId = row.bankAccountProfileId ?? defaultBankAccountProfileId;
      const transactionDate = row.transactionDate ?? row.date;
      if (!bankAccountProfileId || !transactionDate) {
        continue;
      }
      await this.assertTransactionNotInClosedReconciliation(organizationId, bankAccountProfileId, transactionDate, executor);
    }
  }

  private async assertTransactionNotInClosedReconciliation(
    organizationId: string,
    bankAccountProfileId: string,
    transactionDate: Date,
    executor: PrismaExecutor = this.prisma,
  ): Promise<void> {
    const closedReconciliation = await this.findClosedReconciliationForDate(organizationId, bankAccountProfileId, transactionDate, executor);
    if (closedReconciliation) {
      throw new BadRequestException("Statement transaction belongs to a closed reconciliation period.");
    }
  }

  private async validateImportRows(
    organizationId: string,
    bankAccountProfileId: string,
    sourceRows: StatementImportSourceRow[],
  ): Promise<StatementImportValidationResult> {
    const validRows: NormalizedStatementImportRow[] = [];
    const invalidRows: InvalidStatementImportRow[] = [];
    const warnings: string[] = [];
    const closedPeriodRowNumbers: number[] = [];
    const seenRows = new Set<string>();
    let totalCredits = new Prisma.Decimal(0);
    let totalDebits = new Prisma.Decimal(0);

    for (const sourceRow of sourceRows) {
      const normalized = this.validateImportRow(sourceRow);
      if ("errors" in normalized) {
        invalidRows.push(normalized);
        continue;
      }

      const duplicateKey = this.statementDuplicateKey(normalized);
      if (seenRows.has(duplicateKey)) {
        invalidRows.push({
          rowNumber: normalized.sourceRowNumber,
          errors: ["Duplicate row in import file."],
          rawData: normalized.rawData,
        });
        continue;
      }
      seenRows.add(duplicateKey);

      const closedReconciliation = await this.findClosedReconciliationForDate(organizationId, bankAccountProfileId, normalized.date);
      if (closedReconciliation) {
        closedPeriodRowNumbers.push(normalized.sourceRowNumber);
        warnings.push(`Row ${normalized.sourceRowNumber} falls inside closed reconciliation ${closedReconciliation.reconciliationNumber}.`);
      }

      if (normalized.type === BankStatementTransactionType.CREDIT) {
        totalCredits = totalCredits.plus(normalized.amount);
      } else {
        totalDebits = totalDebits.plus(normalized.amount);
      }
      validRows.push(normalized);
    }

    warnings.push(...(await this.existingDuplicateWarnings(organizationId, bankAccountProfileId, validRows)));

    return { validRows, invalidRows, warnings, closedPeriodRowNumbers, totalCredits, totalDebits };
  }

  private validateImportRow(sourceRow: StatementImportSourceRow): NormalizedStatementImportRow | InvalidStatementImportRow {
    const errors: string[] = [];
    const rowNumber = sourceRow.sourceRowNumber;
    let date: Date | null = null;
    let description = "";
    let debit = new Prisma.Decimal(0);
    let credit = new Prisma.Decimal(0);

    try {
      date = this.parseDate(sourceRow.date ?? "", `Row ${rowNumber} date`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      description = this.requiredText(sourceRow.description, `Row ${rowNumber} description`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      debit = this.nonNegativeMoney(sourceRow.debit ?? "0.0000", `Row ${rowNumber} debit`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      credit = this.nonNegativeMoney(sourceRow.credit ?? "0.0000", `Row ${rowNumber} credit`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    if (debit.gt(0) && credit.gt(0)) {
      errors.push(`Row ${rowNumber} cannot contain both debit and credit.`);
    }
    if (debit.eq(0) && credit.eq(0)) {
      errors.push(`Row ${rowNumber} requires a debit or credit amount.`);
    }
    if (errors.length > 0 || !date) {
      return { rowNumber, errors, rawData: sourceRow.rawData };
    }

    const isCredit = credit.gt(0);
    return {
      sourceRowNumber: rowNumber,
      date,
      description,
      reference: this.cleanOptional(sourceRow.reference),
      type: isCredit ? BankStatementTransactionType.CREDIT : BankStatementTransactionType.DEBIT,
      amount: isCredit ? credit : debit,
      rawData: {
        ...sourceRow.rawData,
        normalized: {
          date: sourceRow.date ?? null,
          description: sourceRow.description ?? null,
          reference: sourceRow.reference ?? null,
          debit: sourceRow.debit ?? null,
          credit: sourceRow.credit ?? null,
        },
      },
    };
  }

  private async existingDuplicateWarnings(
    organizationId: string,
    bankAccountProfileId: string,
    rows: NormalizedStatementImportRow[],
  ): Promise<string[]> {
    if (rows.length === 0) {
      return [];
    }
    const firstDate = rows[0]!.date;
    const minDate = rows.reduce((minimum, row) => (row.date < minimum ? row.date : minimum), firstDate);
    const maxDate = rows.reduce((maximum, row) => (row.date > maximum ? row.date : maximum), firstDate);
    const existingTransactions = await this.prisma.bankStatementTransaction.findMany({
      where: {
        organizationId,
        bankAccountProfileId,
        status: { not: BankStatementTransactionStatus.VOIDED },
        transactionDate: { gte: startOfDate(minDate), lte: endOfDate(maxDate) },
      },
      select: { transactionDate: true, type: true, amount: true, reference: true, description: true },
    });
    const existingKeys = new Set(existingTransactions.map((transaction) => this.existingStatementDuplicateKey(transaction)));
    return rows
      .filter((row) => existingKeys.has(this.statementDuplicateKey(row)))
      .map((row) => `Row ${row.sourceRowNumber} may duplicate an existing statement transaction.`);
  }

  private async findClosedReconciliationForDate(
    organizationId: string,
    bankAccountProfileId: string,
    transactionDate: Date,
    executor: PrismaExecutor = this.prisma,
  ) {
    return executor.bankReconciliation.findFirst({
      where: {
        organizationId,
        bankAccountProfileId,
        status: BankReconciliationStatus.CLOSED,
        periodStart: { lte: transactionDate },
        periodEnd: { gte: transactionDate },
      },
      select: { id: true, reconciliationNumber: true },
    });
  }

  private previewRow(row: NormalizedStatementImportRow) {
    return {
      rowNumber: row.sourceRowNumber,
      date: row.date.toISOString(),
      description: row.description,
      reference: row.reference ?? null,
      type: row.type,
      amount: row.amount.toFixed(4),
      rawData: row.rawData,
    };
  }

  private statementDuplicateKey(row: NormalizedStatementImportRow): string {
    return [
      row.date.toISOString().slice(0, 10),
      row.type,
      row.amount.toFixed(4),
      (row.reference ?? "").trim().toLowerCase(),
      row.description.trim().toLowerCase(),
    ].join("|");
  }

  private existingStatementDuplicateKey(row: {
    transactionDate: Date;
    type: BankStatementTransactionType;
    amount: Prisma.Decimal.Value;
    reference: string | null;
    description: string;
  }): string {
    return [
      row.transactionDate.toISOString().slice(0, 10),
      row.type,
      new Prisma.Decimal(row.amount).toFixed(4),
      (row.reference ?? "").trim().toLowerCase(),
      row.description.trim().toLowerCase(),
    ].join("|");
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

  private async ledgerBalance(organizationId: string, accountId: string): Promise<Prisma.Decimal> {
    const lines = await this.prisma.journalLine.findMany({
      where: { organizationId, accountId, journalEntry: { status: { in: POSTED_LEDGER_STATUSES } } },
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

function startOfDate(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function endOfDate(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Invalid row.";
}
