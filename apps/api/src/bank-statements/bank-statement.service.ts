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
import { suggestBankStatementMatches } from "./bank-statement-match-suggestions";

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
  bankReference?: string;
  counterparty?: string;
  currency?: string;
  type: BankStatementTransactionType;
  amount: Prisma.Decimal;
  rawData: Record<string, unknown>;
}

interface InvalidStatementImportRow {
  rowNumber: number;
  errors: string[];
  warnings?: StatementImportRowWarning[];
  rawData: Record<string, unknown>;
}

type StatementImportWarningCode =
  | "DUPLICATE_IN_FILE"
  | "DUPLICATE_EXISTING_HIGH_CONFIDENCE"
  | "DUPLICATE_EXISTING_POSSIBLE"
  | "CLOSED_RECONCILIATION_OVERLAP"
  | "OPEN_RECONCILIATION_OVERLAP"
  | "CURRENCY_MISMATCH"
  | "PARTIAL_IMPORT_REQUIRED";

interface StatementImportRowWarning {
  rowNumber: number;
  code: StatementImportWarningCode;
  severity: "warning" | "blocking";
  message: string;
  action: string;
}

interface StatementImportValidationResult {
  validRows: NormalizedStatementImportRow[];
  invalidRows: InvalidStatementImportRow[];
  warnings: string[];
  rowWarnings: StatementImportRowWarning[];
  closedPeriodRowNumbers: number[];
  openPeriodRowNumbers: number[];
  duplicateInFileRowNumbers: number[];
  duplicateExistingHighConfidenceRowNumbers: number[];
  duplicateExistingPossibleRowNumbers: number[];
  currencyMismatchRowNumbers: number[];
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

  async previewImport(organizationId: string, bankAccountProfileId: string, dto: PreviewBankStatementImportDto, actorUserId?: string) {
    const profile = await this.findProfile(organizationId, bankAccountProfileId, { requireActive: true });
    const filename = this.requiredText(dto.filename, "Filename");
    const parsed = await parseBankStatementImportInput(dto);
    const validation = await this.validateImportRows(organizationId, profile.id, profile.currency, parsed.rows);
    const summary = this.importValidationSummary(parsed.rows.length, validation, validation.validRows.length);

    if (actorUserId) {
      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "PREVIEW_IMPORT",
        entityType: "BankStatementImport",
        entityId: profile.id,
        after: this.safeImportAuditSummary({
          sourceRowCount: parsed.rows.length,
          importedRowCount: 0,
          skippedRowCount: 0,
          invalidRowCount: validation.invalidRows.length,
          duplicateInFileCount: validation.duplicateInFileRowNumbers.length,
          duplicateExistingCount: validation.duplicateExistingHighConfidenceRowNumbers.length + validation.duplicateExistingPossibleRowNumbers.length,
          blockedByClosedReconciliationCount: validation.closedPeriodRowNumbers.length,
          openReconciliationOverlapCount: validation.openPeriodRowNumbers.length,
          currencyMismatchCount: validation.currencyMismatchRowNumbers.length,
          totalCredits: validation.totalCredits.toFixed(4),
          totalDebits: validation.totalDebits.toFixed(4),
          sourceFormat: parsed.format,
          sourceSheetName: parsed.sourceSheetName ?? null,
          rowWarnings: validation.rowWarnings,
          mode: "preview",
        }),
      });
    }

    return {
      filename,
      rowCount: parsed.rows.length,
      validRows: validation.validRows.map((row) => this.previewRow(row)),
      invalidRows: validation.invalidRows,
      totalCredits: validation.totalCredits.toFixed(4),
      totalDebits: validation.totalDebits.toFixed(4),
      detectedColumns: parsed.detectedColumns,
      sourceFormat: parsed.format,
      sourceSheetName: parsed.sourceSheetName ?? null,
      warnings: [...parsed.warnings, ...validation.warnings],
      rowWarnings: validation.rowWarnings,
      summary,
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
    const parsed = await parseBankStatementImportInput(dto);
    const validation = await this.validateImportRows(organizationId, profile.id, profile.currency, parsed.rows);
    if (validation.invalidRows.length > 0 && !dto.allowPartial) {
      throw new BadRequestException("Bank statement import contains invalid rows.");
    }
    const duplicateExistingRowNumbers = new Set([
      ...validation.duplicateExistingHighConfidenceRowNumbers,
      ...validation.duplicateExistingPossibleRowNumbers,
    ]);
    if (duplicateExistingRowNumbers.size > 0 && !dto.allowPartial) {
      throw new BadRequestException("Bank statement import contains duplicate statement rows. Preview the file and enable partial import only if the skipped rows are intentional.");
    }
    if (validation.closedPeriodRowNumbers.length > 0 && !dto.allowPartial) {
      throw new BadRequestException("Cannot import statement transactions into a closed reconciliation period.");
    }
    const skippedRowNumbers = new Set<number>([
      ...validation.closedPeriodRowNumbers,
      ...validation.duplicateExistingHighConfidenceRowNumbers,
      ...validation.duplicateExistingPossibleRowNumbers,
    ]);
    const rows = dto.allowPartial ? validation.validRows.filter((row) => !skippedRowNumbers.has(row.sourceRowNumber)) : validation.validRows;
    if (rows.length === 0) {
      throw new BadRequestException("Bank statement import must contain at least one valid row.");
    }
    const importedTotals = this.importRowTotals(rows);
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
          sourceType: parsed.format === "UNKNOWN" ? "CSV" : parsed.format,
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

    const importSummary = {
      sourceRowCount: parsed.rows.length,
      importedRowCount: rows.length,
      skippedRowCount: parsed.rows.length - rows.length,
      invalidRowCount: validation.invalidRows.length,
      duplicateInFileCount: validation.duplicateInFileRowNumbers.length,
      duplicateExistingCount: duplicateExistingRowNumbers.size,
      blockedByClosedReconciliationCount: validation.closedPeriodRowNumbers.length,
      openReconciliationOverlapCount: validation.openPeriodRowNumbers.length,
      currencyMismatchCount: validation.currencyMismatchRowNumbers.length,
      totalCredits: importedTotals.totalCredits.toFixed(4),
      totalDebits: importedTotals.totalDebits.toFixed(4),
      sourceFormat: parsed.format,
      sourceSheetName: parsed.sourceSheetName ?? null,
      warnings: [...parsed.warnings, ...validation.warnings],
      rowWarnings: validation.rowWarnings,
    };

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "IMPORT",
      entityType: "BankStatementImport",
      entityId: created.id,
      after: this.safeImportAuditSummary({ mode: "commit", ...importSummary }),
    });
    return {
      ...created,
      invalidRows: dto.allowPartial ? validation.invalidRows : [],
      importSummary,
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
    if (transaction.status !== BankStatementTransactionStatus.UNMATCHED) {
      return [];
    }
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

    return suggestBankStatementMatches(
      {
        transactionDate: transaction.transactionDate,
        type: transaction.type,
        amount: this.formatMoney(transaction.amount),
        status: transaction.status,
        reference: transaction.reference,
        description: transaction.description,
        counterparty: counterpartyFromRawData(transaction.rawData),
      },
      lines.map((line) => ({
        id: line.id,
        debit: this.formatMoney(line.debit),
        credit: this.formatMoney(line.credit),
        description: line.description,
        journalEntry: line.journalEntry,
      })),
    );
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

    const claim = await this.prisma.bankStatementTransaction.updateMany({
      where: { id, organizationId, status: BankStatementTransactionStatus.UNMATCHED },
      data: {
        status: BankStatementTransactionStatus.MATCHED,
        matchedJournalLineId: line.id,
        matchedJournalEntryId: line.journalEntryId,
        matchType: BankStatementMatchType.JOURNAL_LINE,
      },
    });
    if (claim.count !== 1) {
      throw new BadRequestException("Only unmatched bank statement transactions can be matched.");
    }
    const updated = await this.prisma.bankStatementTransaction.findUniqueOrThrow({
      where: { id },
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
    bankAccountCurrency: string,
    sourceRows: StatementImportSourceRow[],
  ): Promise<StatementImportValidationResult> {
    const validRows: NormalizedStatementImportRow[] = [];
    const invalidRows: InvalidStatementImportRow[] = [];
    const warnings: string[] = [];
    const rowWarnings: StatementImportRowWarning[] = [];
    const closedPeriodRowNumbers: number[] = [];
    const openPeriodRowNumbers: number[] = [];
    const duplicateInFileRowNumbers: number[] = [];
    const duplicateExistingHighConfidenceRowNumbers: number[] = [];
    const duplicateExistingPossibleRowNumbers: number[] = [];
    const currencyMismatchRowNumbers: number[] = [];
    const seenRows = new Map<string, number>();
    let totalCredits = new Prisma.Decimal(0);
    let totalDebits = new Prisma.Decimal(0);

    for (const sourceRow of sourceRows) {
      const normalized = this.validateImportRow(sourceRow);
      if ("errors" in normalized) {
        invalidRows.push(normalized);
        continue;
      }

      const identity = this.statementRowIdentity(bankAccountProfileId, normalized);
      normalized.rawData = {
        ...normalized.rawData,
        normalized: {
          ...(isRecord(normalized.rawData.normalized) ? normalized.rawData.normalized : {}),
          statementFingerprint: identity.fingerprint,
          statementHighConfidenceKey: identity.highConfidenceKey ?? null,
        },
      };
      const duplicateKey = identity.highConfidenceKey ?? identity.fingerprint;
      const previousRowNumber = seenRows.get(duplicateKey);
      if (previousRowNumber !== undefined) {
        duplicateInFileRowNumbers.push(normalized.sourceRowNumber);
        const warning = this.rowWarning(
          normalized.sourceRowNumber,
          "DUPLICATE_IN_FILE",
          "blocking",
          `Row ${normalized.sourceRowNumber} duplicates row ${previousRowNumber} in this import file.`,
          "Remove the repeated row or use partial import to skip duplicates.",
        );
        rowWarnings.push(warning);
        invalidRows.push({
          rowNumber: normalized.sourceRowNumber,
          errors: [warning.message],
          warnings: [warning],
          rawData: normalized.rawData,
        });
        continue;
      }
      seenRows.set(duplicateKey, normalized.sourceRowNumber);

      if (normalized.currency && normalizeIdentityText(normalized.currency) !== normalizeIdentityText(bankAccountCurrency)) {
        currencyMismatchRowNumbers.push(normalized.sourceRowNumber);
        const warning = this.rowWarning(
          normalized.sourceRowNumber,
          "CURRENCY_MISMATCH",
          "blocking",
          `Row ${normalized.sourceRowNumber} currency ${normalized.currency} does not match bank account currency ${bankAccountCurrency}.`,
          "Import this row into an account with the matching currency or correct the statement currency.",
        );
        rowWarnings.push(warning);
        invalidRows.push({
          rowNumber: normalized.sourceRowNumber,
          errors: [warning.message],
          warnings: [warning],
          rawData: normalized.rawData,
        });
        continue;
      }

      const closedReconciliation = await this.findClosedReconciliationForDate(organizationId, bankAccountProfileId, normalized.date);
      if (closedReconciliation) {
        closedPeriodRowNumbers.push(normalized.sourceRowNumber);
        rowWarnings.push(
          this.rowWarning(
            normalized.sourceRowNumber,
            "CLOSED_RECONCILIATION_OVERLAP",
            "blocking",
            `Row ${normalized.sourceRowNumber} falls inside closed reconciliation ${closedReconciliation.reconciliationNumber}.`,
            "Do not import this row into a closed reconciliation period; reopen/void the reconciliation only through an approved workflow if the statement period is wrong.",
          ),
        );
      } else {
        const openReconciliation = await this.findOpenReconciliationForDate(organizationId, bankAccountProfileId, normalized.date);
        if (openReconciliation) {
          openPeriodRowNumbers.push(normalized.sourceRowNumber);
          rowWarnings.push(
            this.rowWarning(
              normalized.sourceRowNumber,
              "OPEN_RECONCILIATION_OVERLAP",
              "warning",
              `Row ${normalized.sourceRowNumber} overlaps open reconciliation ${openReconciliation.reconciliationNumber}.`,
              "Review the open reconciliation before closing it so the newly imported row is handled deliberately.",
            ),
          );
        }
      }

      if (normalized.type === BankStatementTransactionType.CREDIT) {
        totalCredits = totalCredits.plus(normalized.amount);
      } else {
        totalDebits = totalDebits.plus(normalized.amount);
      }
      validRows.push(normalized);
    }

    const existingDuplicateWarnings = await this.existingDuplicateWarnings(organizationId, bankAccountProfileId, validRows);
    rowWarnings.push(...existingDuplicateWarnings);
    for (const warning of existingDuplicateWarnings) {
      if (warning.code === "DUPLICATE_EXISTING_HIGH_CONFIDENCE") {
        duplicateExistingHighConfidenceRowNumbers.push(warning.rowNumber);
      } else if (warning.code === "DUPLICATE_EXISTING_POSSIBLE") {
        duplicateExistingPossibleRowNumbers.push(warning.rowNumber);
      }
    }

    if (duplicateInFileRowNumbers.length > 0) {
      warnings.push(`${duplicateInFileRowNumbers.length} row${duplicateInFileRowNumbers.length === 1 ? "" : "s"} duplicate another row in this file.`);
    }
    if (duplicateExistingHighConfidenceRowNumbers.length > 0) {
      warnings.push(`${duplicateExistingHighConfidenceRowNumbers.length} row${duplicateExistingHighConfidenceRowNumbers.length === 1 ? "" : "s"} are high-confidence duplicates of existing statement transactions.`);
    }
    if (duplicateExistingPossibleRowNumbers.length > 0) {
      warnings.push(`${duplicateExistingPossibleRowNumbers.length} row${duplicateExistingPossibleRowNumbers.length === 1 ? "" : "s"} may duplicate existing statement transactions.`);
    }
    if (closedPeriodRowNumbers.length > 0) {
      warnings.push(`${closedPeriodRowNumbers.length} row${closedPeriodRowNumbers.length === 1 ? "" : "s"} overlap closed reconciliation periods and cannot be imported in full mode.`);
    }
    if (openPeriodRowNumbers.length > 0) {
      warnings.push(`${openPeriodRowNumbers.length} row${openPeriodRowNumbers.length === 1 ? "" : "s"} overlap open reconciliations; review them before closing.`);
    }
    if (
      invalidRows.length > 0 ||
      closedPeriodRowNumbers.length > 0 ||
      duplicateExistingHighConfidenceRowNumbers.length > 0 ||
      duplicateExistingPossibleRowNumbers.length > 0
    ) {
      rowWarnings.push(
        this.rowWarning(
          0,
          "PARTIAL_IMPORT_REQUIRED",
          "warning",
          "Full import is blocked until invalid, duplicate, or closed-period rows are resolved.",
          "Use preview to review row warnings; enable partial import only when skipped rows are intentional.",
        ),
      );
    }

    return {
      validRows,
      invalidRows,
      warnings,
      rowWarnings,
      closedPeriodRowNumbers,
      openPeriodRowNumbers,
      duplicateInFileRowNumbers,
      duplicateExistingHighConfidenceRowNumbers,
      duplicateExistingPossibleRowNumbers,
      currencyMismatchRowNumbers,
      totalCredits,
      totalDebits,
    };
  }

  private validateImportRow(sourceRow: StatementImportSourceRow): NormalizedStatementImportRow | InvalidStatementImportRow {
    const errors: string[] = [];
    const rowNumber = sourceRow.sourceRowNumber;
    let date: Date | null = null;
    let description = "";
    let debit = new Prisma.Decimal(0);
    let credit = new Prisma.Decimal(0);
    let signedAmount: Prisma.Decimal | null = null;

    try {
      date = this.parseDate(sourceRow.date ?? "", `Row ${rowNumber} date`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    try {
      description = this.requiredText(sourceRow.description || sourceRow.counterparty || sourceRow.reference || sourceRow.bankReference || "Imported statement row", `Row ${rowNumber} description`);
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
    try {
      signedAmount = sourceRow.amount ? this.nonNegativeOrNegativeMoney(sourceRow.amount, `Row ${rowNumber} amount`) : null;
    } catch (error) {
      errors.push(errorMessage(error));
    }
    if (debit.eq(0) && credit.eq(0) && signedAmount) {
      if (signedAmount.lt(0)) {
        debit = signedAmount.abs();
      } else {
        credit = signedAmount;
      }
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
    const reference = this.cleanOptional(sourceRow.reference || sourceRow.bankReference);
    const bankReference = this.cleanOptional(sourceRow.bankReference);
    const counterparty = this.cleanOptional(sourceRow.counterparty);
    const currency = this.cleanOptional(sourceRow.currency)?.toUpperCase();
    const amount = isCredit ? credit : debit;
    const identity = this.statementRowIdentity("", {
      date,
      description,
      reference,
      bankReference,
      counterparty,
      currency,
      type: isCredit ? BankStatementTransactionType.CREDIT : BankStatementTransactionType.DEBIT,
      amount,
    });
    return {
      sourceRowNumber: rowNumber,
      date,
      description,
      reference,
      bankReference,
      counterparty,
      currency,
      type: isCredit ? BankStatementTransactionType.CREDIT : BankStatementTransactionType.DEBIT,
      amount,
      rawData: {
        ...sourceRow.rawData,
        normalized: {
          date: sourceRow.date ?? null,
          description: sourceRow.description ?? null,
          reference: reference ?? null,
          bankReference: bankReference ?? null,
          debit: sourceRow.debit ?? null,
          credit: sourceRow.credit ?? null,
          amount: sourceRow.amount ?? null,
          balance: sourceRow.balance ?? null,
          counterparty: counterparty ?? null,
          currency: currency ?? null,
          statementFingerprint: identity.fingerprint,
          statementHighConfidenceKey: identity.highConfidenceKey ?? null,
        },
      },
    };
  }

  private async existingDuplicateWarnings(
    organizationId: string,
    bankAccountProfileId: string,
    rows: NormalizedStatementImportRow[],
  ): Promise<StatementImportRowWarning[]> {
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
      select: { transactionDate: true, type: true, amount: true, reference: true, description: true, rawData: true },
    });
    const existingHighConfidenceKeys = new Set<string>();
    const existingFingerprints = new Set<string>();
    for (const transaction of existingTransactions) {
      const identity = this.existingStatementRowIdentity(bankAccountProfileId, transaction);
      if (identity.highConfidenceKey) {
        existingHighConfidenceKeys.add(identity.highConfidenceKey);
      }
      existingFingerprints.add(identity.fingerprint);
    }

    return rows.flatMap((row) => {
      const identity = this.statementRowIdentity(bankAccountProfileId, row);
      if (identity.highConfidenceKey && existingHighConfidenceKeys.has(identity.highConfidenceKey)) {
        return [
          this.rowWarning(
            row.sourceRowNumber,
            "DUPLICATE_EXISTING_HIGH_CONFIDENCE",
            "blocking",
            `Row ${row.sourceRowNumber} has the same bank reference, date, amount, and currency as an existing statement transaction.`,
            "Skip this row unless the existing transaction has been voided and reviewed.",
          ),
        ];
      }
      if (existingFingerprints.has(identity.fingerprint)) {
        return [
          this.rowWarning(
            row.sourceRowNumber,
            "DUPLICATE_EXISTING_POSSIBLE",
            "blocking",
            `Row ${row.sourceRowNumber} matches an existing statement transaction by date, amount, currency, description, reference, and counterparty.`,
            "Review the existing transaction before importing; use partial import only to skip this row.",
          ),
        ];
      }
      return [];
    });
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

  private async findOpenReconciliationForDate(
    organizationId: string,
    bankAccountProfileId: string,
    transactionDate: Date,
    executor: PrismaExecutor = this.prisma,
  ) {
    return executor.bankReconciliation.findFirst({
      where: {
        organizationId,
        bankAccountProfileId,
        status: { in: [BankReconciliationStatus.DRAFT, BankReconciliationStatus.PENDING_APPROVAL, BankReconciliationStatus.APPROVED] },
        periodStart: { lte: transactionDate },
        periodEnd: { gte: transactionDate },
      },
      select: { id: true, reconciliationNumber: true, status: true },
    });
  }

  private previewRow(row: NormalizedStatementImportRow) {
    return {
      rowNumber: row.sourceRowNumber,
      date: row.date.toISOString(),
      description: row.description,
      reference: row.reference ?? null,
      bankReference: row.bankReference ?? null,
      counterparty: row.counterparty ?? null,
      currency: row.currency ?? null,
      type: row.type,
      amount: row.amount.toFixed(4),
      rawData: row.rawData,
    };
  }

  private importValidationSummary(
    sourceRowCount: number,
    validation: StatementImportValidationResult,
    importableRowCount: number,
  ) {
    const blockedRowCount = new Set([
      ...validation.invalidRows.map((row) => row.rowNumber),
      ...validation.closedPeriodRowNumbers,
      ...validation.duplicateExistingHighConfidenceRowNumbers,
      ...validation.duplicateExistingPossibleRowNumbers,
    ]).size;
    const safeImportableRowCount = Math.max(
      0,
      validation.validRows.length -
        validation.closedPeriodRowNumbers.length -
        validation.duplicateExistingHighConfidenceRowNumbers.length -
        validation.duplicateExistingPossibleRowNumbers.length,
    );
    return {
      sourceRowCount,
      validRowCount: validation.validRows.length,
      invalidRowCount: validation.invalidRows.length,
      importableRowCount: Math.min(importableRowCount, safeImportableRowCount),
      duplicateInFileCount: validation.duplicateInFileRowNumbers.length,
      duplicateExistingHighConfidenceCount: validation.duplicateExistingHighConfidenceRowNumbers.length,
      duplicateExistingPossibleCount: validation.duplicateExistingPossibleRowNumbers.length,
      duplicateExistingCount:
        validation.duplicateExistingHighConfidenceRowNumbers.length + validation.duplicateExistingPossibleRowNumbers.length,
      closedReconciliationOverlapCount: validation.closedPeriodRowNumbers.length,
      openReconciliationOverlapCount: validation.openPeriodRowNumbers.length,
      currencyMismatchCount: validation.currencyMismatchRowNumbers.length,
      blockedRowCount,
    };
  }

  private safeImportAuditSummary(input: {
    mode: "preview" | "commit";
    sourceRowCount: number;
    importedRowCount: number;
    skippedRowCount: number;
    invalidRowCount: number;
    duplicateInFileCount: number;
    duplicateExistingCount: number;
    blockedByClosedReconciliationCount: number;
    openReconciliationOverlapCount: number;
    currencyMismatchCount: number;
    totalCredits: string;
    totalDebits: string;
    sourceFormat: string;
    sourceSheetName: string | null;
    rowWarnings: StatementImportRowWarning[];
  }) {
    return {
      mode: input.mode,
      sourceRowCount: input.sourceRowCount,
      importedRowCount: input.importedRowCount,
      skippedRowCount: input.skippedRowCount,
      invalidRowCount: input.invalidRowCount,
      duplicateInFileCount: input.duplicateInFileCount,
      duplicateExistingCount: input.duplicateExistingCount,
      blockedByClosedReconciliationCount: input.blockedByClosedReconciliationCount,
      openReconciliationOverlapCount: input.openReconciliationOverlapCount,
      currencyMismatchCount: input.currencyMismatchCount,
      totalCredits: input.totalCredits,
      totalDebits: input.totalDebits,
      sourceFormat: input.sourceFormat,
      sourceSheetName: input.sourceSheetName,
      rowWarningSummary: input.rowWarnings.map((warning) => ({
        rowNumber: warning.rowNumber,
        code: warning.code,
        severity: warning.severity,
      })),
      rawRowsStoredInAudit: false,
      noBankCredentialsStored: true,
      noLiveBankProviderCalls: true,
    };
  }

  private importRowTotals(rows: NormalizedStatementImportRow[]) {
    return rows.reduce(
      (totals, row) => {
        if (row.type === BankStatementTransactionType.CREDIT) {
          totals.totalCredits = totals.totalCredits.plus(row.amount);
        } else {
          totals.totalDebits = totals.totalDebits.plus(row.amount);
        }
        return totals;
      },
      { totalCredits: new Prisma.Decimal(0), totalDebits: new Prisma.Decimal(0) },
    );
  }

  private statementRowIdentity(
    bankAccountProfileId: string,
    row: Pick<
      NormalizedStatementImportRow,
      "date" | "type" | "amount" | "description" | "reference" | "bankReference" | "counterparty" | "currency"
    >,
  ) {
    const signedAmount = row.type === BankStatementTransactionType.DEBIT ? row.amount.mul(-1).toFixed(4) : row.amount.toFixed(4);
    const bankReference = normalizeIdentityText(row.bankReference);
    const reference = normalizeIdentityText(row.reference);
    const description = normalizeIdentityText(row.description);
    const counterparty = normalizeIdentityText(row.counterparty);
    const currency = normalizeIdentityText(row.currency);
    const date = row.date.toISOString().slice(0, 10);
    const base = [bankAccountProfileId, date, signedAmount, currency];
    return {
      highConfidenceKey: bankReference ? [...base, bankReference].join("|") : null,
      fingerprint: [...base, description, reference, bankReference, counterparty].join("|"),
    };
  }

  private existingStatementRowIdentity(
    bankAccountProfileId: string,
    row: {
    transactionDate: Date;
    type: BankStatementTransactionType;
    amount: Prisma.Decimal.Value;
    reference: string | null;
    description: string;
    rawData: Prisma.JsonValue | null;
  }) {
    const rawIdentity = this.normalizedIdentityFromRawData(row.rawData);
    return this.statementRowIdentity(bankAccountProfileId, {
      date: row.transactionDate,
      type: row.type,
      amount: new Prisma.Decimal(row.amount),
      description: rawIdentity.description ?? row.description,
      reference: rawIdentity.reference ?? row.reference ?? undefined,
      bankReference: rawIdentity.bankReference ?? undefined,
      counterparty: rawIdentity.counterparty ?? undefined,
      currency: rawIdentity.currency ?? undefined,
    });
  }

  private normalizedIdentityFromRawData(rawData: Prisma.JsonValue | null): {
    description?: string;
    reference?: string;
    bankReference?: string;
    counterparty?: string;
    currency?: string;
  } {
    if (!isRecord(rawData)) {
      return {};
    }
    const normalized = rawData.normalized;
    const source = isRecord(normalized) ? normalized : rawData;
    return {
      description: stringValue(source.description),
      reference: stringValue(source.reference),
      bankReference: stringValue(source.bankReference),
      counterparty: stringValue(source.counterparty),
      currency: stringValue(source.currency),
    };
  }

  private rowWarning(
    rowNumber: number,
    code: StatementImportWarningCode,
    severity: "warning" | "blocking",
    message: string,
    action: string,
  ): StatementImportRowWarning {
    return { rowNumber, code, severity, message, action };
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

function counterpartyFromRawData(rawData: unknown): string | null {
  if (!isRecord(rawData)) {
    return null;
  }
  const normalized = rawData.normalized;
  if (isRecord(normalized) && typeof normalized.counterparty === "string") {
    return normalized.counterparty;
  }
  return typeof rawData.counterparty === "string" ? rawData.counterparty : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeIdentityText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
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
