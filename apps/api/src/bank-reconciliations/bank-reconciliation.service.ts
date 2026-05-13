import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { renderBankReconciliationReportPdf } from "@ledgerbyte/pdf-core";
import {
  BankAccountStatus,
  BankReconciliationStatus,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBankReconciliationDto } from "./dto/create-bank-reconciliation.dto";
import { bankReconciliationReportCsv } from "../reports/report-csv";

const POSTED_LEDGER_STATUSES: JournalEntryStatus[] = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];
const RECONCILED_STATEMENT_STATUSES: BankStatementTransactionStatus[] = [
  BankStatementTransactionStatus.MATCHED,
  BankStatementTransactionStatus.CATEGORIZED,
  BankStatementTransactionStatus.IGNORED,
];

const bankReconciliationInclude = {
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
  createdBy: { select: { id: true, name: true, email: true } },
  closedBy: { select: { id: true, name: true, email: true } },
  voidedBy: { select: { id: true, name: true, email: true } },
  _count: { select: { items: true } },
};

const bankReconciliationItemInclude = {
  statementTransaction: {
    include: {
      import: { select: { id: true, filename: true, status: true, importedAt: true } },
      matchedJournalEntry: { select: { id: true, entryNumber: true, entryDate: true, description: true, reference: true } },
      createdJournalEntry: { select: { id: true, entryNumber: true, entryDate: true, description: true, reference: true } },
      categorizedAccount: { select: { id: true, code: true, name: true, type: true } },
    },
  },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BankReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  async listForBankAccount(organizationId: string, bankAccountProfileId: string) {
    await this.findProfile(organizationId, bankAccountProfileId);
    return this.prisma.bankReconciliation.findMany({
      where: { organizationId, bankAccountProfileId },
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
      include: bankReconciliationInclude,
    });
  }

  async create(organizationId: string, actorUserId: string, bankAccountProfileId: string, dto: CreateBankReconciliationDto) {
    const profile = await this.findProfile(organizationId, bankAccountProfileId, { requireActive: true });
    const { periodStart, periodEnd } = this.parsePeriod(dto.periodStart, dto.periodEnd);
    const statementClosingBalance = this.money(dto.statementClosingBalance, "Statement closing balance");
    const statementOpeningBalance =
      dto.statementOpeningBalance === undefined ? null : this.money(dto.statementOpeningBalance, "Statement opening balance");
    await this.assertNoClosedOverlap(organizationId, profile.id, periodStart, periodEnd);
    const ledgerClosingBalance = await this.ledgerBalance(organizationId, profile.accountId, periodEnd);
    const difference = statementClosingBalance.minus(ledgerClosingBalance);

    const created = await this.prisma.$transaction(async (tx) => {
      const reconciliationNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.BANK_RECONCILIATION, tx);
      return tx.bankReconciliation.create({
        data: {
          organizationId,
          bankAccountProfileId: profile.id,
          reconciliationNumber,
          periodStart,
          periodEnd,
          statementOpeningBalance: statementOpeningBalance?.toFixed(4) ?? null,
          statementClosingBalance: statementClosingBalance.toFixed(4),
          ledgerClosingBalance: ledgerClosingBalance.toFixed(4),
          difference: difference.toFixed(4),
          notes: this.cleanOptional(dto.notes),
          createdById: actorUserId,
        },
        include: bankReconciliationInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "BankReconciliation",
      entityId: created.id,
      after: created,
    });
    return this.withCloseState(created);
  }

  async get(organizationId: string, id: string) {
    const reconciliation = await this.findReconciliation(organizationId, id);
    return this.withCloseState(reconciliation);
  }

  async close(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findReconciliation(organizationId, id);
    if (existing.status !== BankReconciliationStatus.DRAFT) {
      throw new BadRequestException("Only draft reconciliations can be closed.");
    }

    const closed = await this.prisma.$transaction(async (tx) => {
      const reconciliation = await tx.bankReconciliation.findFirst({
        where: { id, organizationId },
        include: bankReconciliationInclude,
      });
      if (!reconciliation) {
        throw new NotFoundException("Bank reconciliation not found.");
      }
      if (reconciliation.status !== BankReconciliationStatus.DRAFT) {
        throw new BadRequestException("Only draft reconciliations can be closed.");
      }

      await this.assertNoClosedOverlap(
        organizationId,
        reconciliation.bankAccountProfileId,
        reconciliation.periodStart,
        reconciliation.periodEnd,
        reconciliation.id,
        tx,
      );
      const ledgerClosingBalance = await this.ledgerBalance(
        organizationId,
        reconciliation.bankAccountProfile.accountId,
        reconciliation.periodEnd,
        tx,
      );
      const difference = new Prisma.Decimal(reconciliation.statementClosingBalance).minus(ledgerClosingBalance);
      if (!difference.eq(0)) {
        await tx.bankReconciliation.update({
          where: { id },
          data: { ledgerClosingBalance: ledgerClosingBalance.toFixed(4), difference: difference.toFixed(4) },
        });
        throw new BadRequestException("Cannot close reconciliation while difference is not zero.");
      }

      const unmatchedCount = await tx.bankStatementTransaction.count({
        where: {
          organizationId,
          bankAccountProfileId: reconciliation.bankAccountProfileId,
          status: BankStatementTransactionStatus.UNMATCHED,
          transactionDate: { gte: reconciliation.periodStart, lte: reconciliation.periodEnd },
        },
      });
      if (unmatchedCount > 0) {
        throw new BadRequestException("Cannot close reconciliation with unmatched statement transactions.");
      }

      const statementTransactions = await tx.bankStatementTransaction.findMany({
        where: {
          organizationId,
          bankAccountProfileId: reconciliation.bankAccountProfileId,
          status: { in: RECONCILED_STATEMENT_STATUSES },
          transactionDate: { gte: reconciliation.periodStart, lte: reconciliation.periodEnd },
        },
        select: { id: true, status: true, amount: true, type: true },
        orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
      });

      if (statementTransactions.length > 0) {
        await tx.bankReconciliationItem.createMany({
          data: statementTransactions.map((transaction) => ({
            organizationId,
            reconciliationId: id,
            statementTransactionId: transaction.id,
            statusAtClose: transaction.status,
            amount: this.formatMoney(transaction.amount),
            type: transaction.type,
          })),
          skipDuplicates: true,
        });
      }

      return tx.bankReconciliation.update({
        where: { id },
        data: {
          status: BankReconciliationStatus.CLOSED,
          ledgerClosingBalance: ledgerClosingBalance.toFixed(4),
          difference: "0.0000",
          closedById: actorUserId,
          closedAt: new Date(),
        },
        include: bankReconciliationInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CLOSE",
      entityType: "BankReconciliation",
      entityId: id,
      before: existing,
      after: closed,
    });
    return this.withCloseState(closed);
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findReconciliation(organizationId, id);
    if (existing.status === BankReconciliationStatus.VOIDED) {
      return this.withCloseState(existing);
    }

    const voided = await this.prisma.bankReconciliation.update({
      where: { id },
      data: {
        status: BankReconciliationStatus.VOIDED,
        voidedById: actorUserId,
        voidedAt: new Date(),
      },
      include: bankReconciliationInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "BankReconciliation",
      entityId: id,
      before: existing,
      after: voided,
    });
    return this.withCloseState(voided);
  }

  async items(organizationId: string, id: string) {
    await this.findReconciliation(organizationId, id);
    return this.prisma.bankReconciliationItem.findMany({
      where: { organizationId, reconciliationId: id },
      orderBy: { createdAt: "asc" },
      include: bankReconciliationItemInclude,
    });
  }

  async reportData(organizationId: string, id: string) {
    const [organization, reconciliation] = await Promise.all([
      this.prisma.organization.findFirst({
        where: { id: organizationId },
        select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true, baseCurrency: true },
      }),
      this.prisma.bankReconciliation.findFirst({
        where: { id, organizationId },
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
          closedBy: { select: { id: true, name: true, email: true } },
          voidedBy: { select: { id: true, name: true, email: true } },
          items: {
            orderBy: { createdAt: "asc" },
            include: {
              statementTransaction: {
                select: {
                  id: true,
                  transactionDate: true,
                  description: true,
                  reference: true,
                },
              },
            },
          },
        },
      }),
    ]);
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }
    if (!reconciliation) {
      throw new NotFoundException("Bank reconciliation not found.");
    }

    const items = reconciliation.items.map((item) => ({
      id: item.id,
      statementTransactionId: item.statementTransactionId,
      transactionDate: item.statementTransaction.transactionDate,
      description: item.statementTransaction.description,
      reference: item.statementTransaction.reference,
      type: item.type,
      amount: this.formatMoney(item.amount),
      statusAtClose: item.statusAtClose,
    }));
    const summary = items.reduce(
      (accumulator, item) => {
        const amount = new Prisma.Decimal(item.amount);
        if (item.type === BankStatementTransactionType.DEBIT) {
          accumulator.debitTotal = accumulator.debitTotal.plus(amount);
        } else {
          accumulator.creditTotal = accumulator.creditTotal.plus(amount);
        }
        if (item.statusAtClose === BankStatementTransactionStatus.MATCHED) {
          accumulator.matchedCount += 1;
        } else if (item.statusAtClose === BankStatementTransactionStatus.CATEGORIZED) {
          accumulator.categorizedCount += 1;
        } else if (item.statusAtClose === BankStatementTransactionStatus.IGNORED) {
          accumulator.ignoredCount += 1;
        }
        return accumulator;
      },
      {
        debitTotal: new Prisma.Decimal(0),
        creditTotal: new Prisma.Decimal(0),
        matchedCount: 0,
        categorizedCount: 0,
        ignoredCount: 0,
      },
    );

    return {
      organization,
      currency: reconciliation.bankAccountProfile.currency || organization.baseCurrency,
      reconciliation: {
        id: reconciliation.id,
        reconciliationNumber: reconciliation.reconciliationNumber,
        status: reconciliation.status,
        periodStart: reconciliation.periodStart,
        periodEnd: reconciliation.periodEnd,
        statementOpeningBalance:
          reconciliation.statementOpeningBalance === null ? null : this.formatMoney(reconciliation.statementOpeningBalance),
        statementClosingBalance: this.formatMoney(reconciliation.statementClosingBalance),
        ledgerClosingBalance: this.formatMoney(reconciliation.ledgerClosingBalance),
        difference: this.formatMoney(reconciliation.difference),
        closedAt: reconciliation.closedAt,
        closedBy: reconciliation.closedBy,
        voidedAt: reconciliation.voidedAt,
        voidedBy: reconciliation.voidedBy,
      },
      bankAccount: {
        id: reconciliation.bankAccountProfile.id,
        displayName: reconciliation.bankAccountProfile.displayName,
        currency: reconciliation.bankAccountProfile.currency,
        account: reconciliation.bankAccountProfile.account,
      },
      items,
      summary: {
        itemCount: items.length,
        debitTotal: summary.debitTotal.toFixed(4),
        creditTotal: summary.creditTotal.toFixed(4),
        matchedCount: summary.matchedCount,
        categorizedCount: summary.categorizedCount,
        ignoredCount: summary.ignoredCount,
      },
      generatedAt: new Date(),
    };
  }

  async reportCsvFile(organizationId: string, id: string) {
    const data = await this.reportData(organizationId, id);
    return bankReconciliationReportCsv(data, new Date());
  }

  async reportPdf(organizationId: string, actorUserId: string, id: string) {
    const data = await this.reportData(organizationId, id);
    const settings = await this.documentSettingsService?.statementRenderSettings(organizationId);
    const buffer = await renderBankReconciliationReportPdf(data, { ...settings, title: "Bank Reconciliation Report" });
    const filename = sanitizeFilename(`reconciliation-${data.reconciliation.reconciliationNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.BANK_RECONCILIATION_REPORT,
      sourceType: "BankReconciliation",
      sourceId: data.reconciliation.id,
      documentNumber: data.reconciliation.reconciliationNumber,
      filename,
      buffer,
      generatedById: actorUserId,
    });
    return { data, buffer, filename, document: document ?? null };
  }

  private async findReconciliation(organizationId: string, id: string) {
    const reconciliation = await this.prisma.bankReconciliation.findFirst({
      where: { id, organizationId },
      include: bankReconciliationInclude,
    });
    if (!reconciliation) {
      throw new NotFoundException("Bank reconciliation not found.");
    }
    return reconciliation;
  }

  private async findProfile(organizationId: string, id: string, options: { requireActive?: boolean } = {}) {
    const profile = await this.prisma.bankAccountProfile.findFirst({
      where: { id, organizationId },
      include: { account: { select: { id: true, code: true, name: true } } },
    });
    if (!profile) {
      throw new NotFoundException("Bank account profile not found.");
    }
    if (options.requireActive && profile.status !== BankAccountStatus.ACTIVE) {
      throw new BadRequestException("Only active bank account profiles can be reconciled.");
    }
    return profile;
  }

  private async withCloseState<T extends { organizationId: string; bankAccountProfileId: string; periodStart: Date; periodEnd: Date }>(reconciliation: T) {
    const unmatchedTransactionCount = await this.prisma.bankStatementTransaction.count({
      where: {
        organizationId: reconciliation.organizationId,
        bankAccountProfileId: reconciliation.bankAccountProfileId,
        status: BankStatementTransactionStatus.UNMATCHED,
        transactionDate: { gte: reconciliation.periodStart, lte: reconciliation.periodEnd },
      },
    });
    return { ...reconciliation, unmatchedTransactionCount };
  }

  private async assertNoClosedOverlap(
    organizationId: string,
    bankAccountProfileId: string,
    periodStart: Date,
    periodEnd: Date,
    excludeId?: string,
    executor: PrismaExecutor = this.prisma,
  ): Promise<void> {
    const overlapping = await executor.bankReconciliation.findFirst({
      where: {
        organizationId,
        bankAccountProfileId,
        status: BankReconciliationStatus.CLOSED,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        periodStart: { lte: periodEnd },
        periodEnd: { gte: periodStart },
      },
      select: { id: true, reconciliationNumber: true },
    });
    if (overlapping) {
      throw new BadRequestException("Reconciliation period overlaps a closed reconciliation for this bank account.");
    }
  }

  private async ledgerBalance(
    organizationId: string,
    accountId: string,
    periodEnd: Date,
    executor: PrismaExecutor = this.prisma,
  ): Promise<Prisma.Decimal> {
    const lines = await executor.journalLine.findMany({
      where: {
        organizationId,
        accountId,
        journalEntry: {
          status: { in: POSTED_LEDGER_STATUSES },
          entryDate: { lte: periodEnd },
        },
      },
      select: { debit: true, credit: true },
    });
    return lines.reduce(
      (balance, line) => balance.plus(new Prisma.Decimal(line.debit)).minus(new Prisma.Decimal(line.credit)),
      new Prisma.Decimal(0),
    );
  }

  private parsePeriod(startValue: string, endValue: string): { periodStart: Date; periodEnd: Date } {
    const periodStart = this.parseDate(startValue, "Period start");
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodEnd = this.parseDate(endValue, "Period end");
    periodEnd.setUTCHours(23, 59, 59, 999);
    if (periodStart > periodEnd) {
      throw new BadRequestException("Period start cannot be after period end.");
    }
    return { periodStart, periodEnd };
  }

  private parseDate(value: string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} is invalid.`);
    }
    return date;
  }

  private money(value: string, label: string): Prisma.Decimal {
    try {
      return toMoney(value);
    } catch {
      throw new BadRequestException(`${label} must be a valid decimal amount.`);
    }
  }

  private cleanOptional(value?: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private formatMoney(value: Prisma.Decimal.Value): string {
    return new Prisma.Decimal(value).toFixed(4);
  }
}
