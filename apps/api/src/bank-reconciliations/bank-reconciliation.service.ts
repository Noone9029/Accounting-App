import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { renderBankReconciliationReportPdf } from "@ledgerbyte/pdf-core";
import {
  BankAccountStatus,
  BankDepositBatchStatus,
  BankReconciliationReviewAction,
  BankReconciliationStatus,
  CardSettlementStatus,
  ChequeInstrumentStatus,
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
const REOPENABLE_RECONCILIATION_STATUSES: BankReconciliationStatus[] = [
  BankReconciliationStatus.PENDING_APPROVAL,
  BankReconciliationStatus.APPROVED,
];
const NON_VOIDED_DEPOSIT_STATUSES = [
  BankDepositBatchStatus.DRAFT,
  BankDepositBatchStatus.POSTED,
  BankDepositBatchStatus.MATCHED,
];
const NON_VOIDED_CARD_SETTLEMENT_STATUSES = [
  CardSettlementStatus.DRAFT,
  CardSettlementStatus.POSTED,
  CardSettlementStatus.MATCHED,
];
const NON_VOIDED_CHEQUE_STATUSES = [
  ChequeInstrumentStatus.DRAFT,
  ChequeInstrumentStatus.RECEIVED,
  ChequeInstrumentStatus.ISSUED,
  ChequeInstrumentStatus.DEPOSITED,
  ChequeInstrumentStatus.CLEARED,
  ChequeInstrumentStatus.BOUNCED,
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
  submittedBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  reopenedBy: { select: { id: true, name: true, email: true } },
  closedBy: { select: { id: true, name: true, email: true } },
  voidedBy: { select: { id: true, name: true, email: true } },
  _count: { select: { items: true } },
};

const bankReconciliationReviewEventInclude = {
  actorUser: { select: { id: true, name: true, email: true } },
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

  async submit(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findReconciliation(organizationId, id);
    if (existing.status !== BankReconciliationStatus.DRAFT) {
      throw new BadRequestException("Only draft reconciliations can be submitted for approval.");
    }

    const submitted = await this.prisma.$transaction(async (tx) => {
      const reconciliation = await this.findReconciliationForWorkflow(organizationId, id, tx);
      if (reconciliation.status !== BankReconciliationStatus.DRAFT) {
        throw new BadRequestException("Only draft reconciliations can be submitted for approval.");
      }
      const ready = await this.assertReadyForReview(
        organizationId,
        reconciliation,
        "Cannot submit reconciliation while difference is not zero.",
        "Cannot submit reconciliation with unmatched statement transactions.",
        tx,
      );
      const updated = await tx.bankReconciliation.update({
        where: { id },
        data: {
          status: BankReconciliationStatus.PENDING_APPROVAL,
          submittedById: actorUserId,
          submittedAt: new Date(),
          ledgerClosingBalance: ready.ledgerClosingBalance.toFixed(4),
          difference: "0.0000",
        },
        include: bankReconciliationInclude,
      });
      await this.createReviewEvent(tx, {
        organizationId,
        reconciliationId: id,
        actorUserId,
        action: BankReconciliationReviewAction.SUBMIT,
        fromStatus: BankReconciliationStatus.DRAFT,
        toStatus: BankReconciliationStatus.PENDING_APPROVAL,
      });
      return updated;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "SUBMIT",
      entityType: "BankReconciliation",
      entityId: id,
      before: existing,
      after: submitted,
    });
    return this.withCloseState(submitted);
  }

  async approve(
    organizationId: string,
    actorUserId: string,
    id: string,
    options: { approvalNotes?: string | null; allowSelfApproval?: boolean } = {},
  ) {
    const existing = await this.findReconciliation(organizationId, id);
    if (existing.status !== BankReconciliationStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Only reconciliations pending approval can be approved.");
    }
    if (existing.submittedById === actorUserId && !options.allowSelfApproval) {
      throw new BadRequestException("Submitter cannot approve their own reconciliation.");
    }

    const approvalNotes = this.cleanOptional(options.approvalNotes);
    const approved = await this.prisma.$transaction(async (tx) => {
      const current = await this.findReconciliationForWorkflow(organizationId, id, tx);
      if (current.status !== BankReconciliationStatus.PENDING_APPROVAL) {
        throw new BadRequestException("Only reconciliations pending approval can be approved.");
      }
      if (current.submittedById === actorUserId && !options.allowSelfApproval) {
        throw new BadRequestException("Submitter cannot approve their own reconciliation.");
      }
      const updated = await tx.bankReconciliation.update({
        where: { id },
        data: {
          status: BankReconciliationStatus.APPROVED,
          approvedById: actorUserId,
          approvedAt: new Date(),
          approvalNotes,
        },
        include: bankReconciliationInclude,
      });
      await this.createReviewEvent(tx, {
        organizationId,
        reconciliationId: id,
        actorUserId,
        action: BankReconciliationReviewAction.APPROVE,
        fromStatus: BankReconciliationStatus.PENDING_APPROVAL,
        toStatus: BankReconciliationStatus.APPROVED,
        notes: approvalNotes,
      });
      return updated;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "APPROVE",
      entityType: "BankReconciliation",
      entityId: id,
      before: existing,
      after: approved,
    });
    return this.withCloseState(approved);
  }

  async close(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findReconciliation(organizationId, id);
    if (existing.status !== BankReconciliationStatus.APPROVED) {
      throw new BadRequestException("Only approved reconciliations can be closed.");
    }

    const closed = await this.prisma.$transaction(async (tx) => {
      const reconciliation = await tx.bankReconciliation.findFirst({
        where: { id, organizationId },
        include: bankReconciliationInclude,
      });
      if (!reconciliation) {
        throw new NotFoundException("Bank reconciliation not found.");
      }
      if (reconciliation.status !== BankReconciliationStatus.APPROVED) {
        throw new BadRequestException("Only approved reconciliations can be closed.");
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

      const updated = await tx.bankReconciliation.update({
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
      await this.createReviewEvent(tx, {
        organizationId,
        reconciliationId: id,
        actorUserId,
        action: BankReconciliationReviewAction.CLOSE,
        fromStatus: BankReconciliationStatus.APPROVED,
        toStatus: BankReconciliationStatus.CLOSED,
      });
      return updated;
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

  async reopen(
    organizationId: string,
    actorUserId: string,
    id: string,
    options: { reopenReason?: string | null } = {},
  ) {
    const existing = await this.findReconciliation(organizationId, id);
    if (!REOPENABLE_RECONCILIATION_STATUSES.includes(existing.status)) {
      throw new BadRequestException("Only pending approval or approved reconciliations can be reopened.");
    }

    const reopenReason = this.cleanOptional(options.reopenReason);
    const reopened = await this.prisma.$transaction(async (tx) => {
      const current = await this.findReconciliationForWorkflow(organizationId, id, tx);
      if (!REOPENABLE_RECONCILIATION_STATUSES.includes(current.status)) {
        throw new BadRequestException("Only pending approval or approved reconciliations can be reopened.");
      }
      const fromStatus = current.status;
      const updated = await tx.bankReconciliation.update({
        where: { id },
        data: {
          status: BankReconciliationStatus.DRAFT,
          submittedById: null,
          submittedAt: null,
          approvedById: null,
          approvedAt: null,
          approvalNotes: null,
          reopenedById: actorUserId,
          reopenedAt: new Date(),
          reopenReason,
        },
        include: bankReconciliationInclude,
      });
      await this.createReviewEvent(tx, {
        organizationId,
        reconciliationId: id,
        actorUserId,
        action: BankReconciliationReviewAction.REOPEN,
        fromStatus,
        toStatus: BankReconciliationStatus.DRAFT,
        notes: reopenReason,
      });
      return updated;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REOPEN",
      entityType: "BankReconciliation",
      entityId: id,
      before: existing,
      after: reopened,
    });
    return this.withCloseState(reopened);
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findReconciliation(organizationId, id);
    if (existing.status === BankReconciliationStatus.VOIDED) {
      return this.withCloseState(existing);
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.bankReconciliation.update({
        where: { id },
        data: {
          status: BankReconciliationStatus.VOIDED,
          voidedById: actorUserId,
          voidedAt: new Date(),
        },
        include: bankReconciliationInclude,
      });
      await this.createReviewEvent(tx, {
        organizationId,
        reconciliationId: id,
        actorUserId,
        action: BankReconciliationReviewAction.VOID,
        fromStatus: existing.status,
        toStatus: BankReconciliationStatus.VOIDED,
      });
      return updated;
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

  async reviewEvents(organizationId: string, id: string) {
    await this.findReconciliation(organizationId, id);
    return this.prisma.bankReconciliationReviewEvent.findMany({
      where: { organizationId, reconciliationId: id },
      orderBy: { createdAt: "asc" },
      include: bankReconciliationReviewEventInclude,
    });
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
          submittedBy: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true, email: true } },
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

    const periodFilter = {
      gte: reconciliation.periodStart,
      lte: reconciliation.periodEnd,
    };
    const [periodTransactions, reviewEvents, deposits, cardSettlements, cheques, clearingConfig] = await Promise.all([
      this.prisma.bankStatementTransaction.findMany({
        where: {
          organizationId,
          bankAccountProfileId: reconciliation.bankAccountProfileId,
          status: { not: BankStatementTransactionStatus.VOIDED },
          transactionDate: periodFilter,
        },
        orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          importId: true,
          transactionDate: true,
          description: true,
          reference: true,
          type: true,
          amount: true,
          status: true,
          matchType: true,
          matchedJournalEntryId: true,
          createdJournalEntryId: true,
          categorizedAccountId: true,
          ignoredReason: true,
          createdAt: true,
          updatedAt: true,
          import: { select: { id: true, filename: true, status: true, rowCount: true, importedAt: true } },
          matchedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
          createdJournalEntry: { select: { id: true, entryNumber: true, status: true } },
        },
      }),
      this.reviewEvents(organizationId, id),
      this.prisma.bankDepositBatch.findMany({
        where: {
          organizationId,
          bankAccountProfileId: reconciliation.bankAccountProfileId,
          status: { in: NON_VOIDED_DEPOSIT_STATUSES },
          depositDate: periodFilter,
        },
        orderBy: [{ depositDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          status: true,
          depositDate: true,
          totalAmount: true,
          currency: true,
          statementTransactionId: true,
          postedJournalEntryId: true,
          postedAt: true,
          matchedAt: true,
          postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
        },
      }),
      this.prisma.cardSettlement.findMany({
        where: {
          organizationId,
          status: { in: NON_VOIDED_CARD_SETTLEMENT_STATUSES },
          settlementDate: periodFilter,
          OR: [
            { fundingBankAccountProfileId: reconciliation.bankAccountProfileId },
            { cardAccountProfileId: reconciliation.bankAccountProfileId },
          ],
        },
        orderBy: [{ settlementDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          settlementType: true,
          status: true,
          settlementDate: true,
          amount: true,
          currency: true,
          statementTransactionId: true,
          postedJournalEntryId: true,
          postedAt: true,
          matchedAt: true,
          postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
        },
      }),
      this.prisma.chequeInstrument.findMany({
        where: {
          organizationId,
          status: { in: NON_VOIDED_CHEQUE_STATUSES },
          OR: [
            { bankAccountProfileId: reconciliation.bankAccountProfileId },
            { depositBatch: { bankAccountProfileId: reconciliation.bankAccountProfileId } },
            { statementTransaction: { bankAccountProfileId: reconciliation.bankAccountProfileId } },
          ],
        },
        orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          chequeType: true,
          status: true,
          chequeNumber: true,
          counterpartyName: true,
          amount: true,
          currency: true,
          issueDate: true,
          receivedDate: true,
          dueDate: true,
          depositDate: true,
          clearedDate: true,
          bouncedDate: true,
          voidedDate: true,
          statementTransactionId: true,
          depositBatchId: true,
          postedJournalEntryId: true,
          createdAt: true,
          updatedAt: true,
          postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
        },
      }),
      this.prisma.bankingClearingAccountConfig.findUnique({
        where: { organizationId },
        select: {
          id: true,
          enabled: true,
          undepositedFundsAccountId: true,
          chequeInHandAccountId: true,
          outstandingChequesAccountId: true,
          cardClearingAccountId: true,
          creditCardLiabilityAccountId: true,
          prepaidCardAssetAccountId: true,
          updatedAt: true,
        },
      }),
    ]);

    const periodCheques = cheques.filter((cheque) =>
      [cheque.issueDate, cheque.receivedDate, cheque.dueDate, cheque.depositDate, cheque.clearedDate, cheque.bouncedDate, cheque.createdAt, cheque.updatedAt].some(
        (date) => this.dateInRange(date, reconciliation.periodStart, reconciliation.periodEnd),
      ),
    );
    const statementSummary = this.statementSummary(periodTransactions);
    const linkedTreasurySummary = this.linkedTreasurySummary(deposits, cardSettlements, periodCheques);
    const accountingStatusSummary = this.accountingStatusSummary(deposits, cardSettlements, periodCheques, clearingConfig);
    const bankRuleApplications = periodTransactions.length
      ? await this.prisma.bankRuleApplication.findMany({
          where: {
            organizationId,
            bankStatementTransactionId: { in: periodTransactions.map((transaction) => transaction.id) },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            actionType: true,
            status: true,
            createdAt: true,
            bankStatementTransactionId: true,
            bankRule: { select: { id: true, name: true } },
            appliedBy: { select: { id: true, name: true, email: true } },
          },
        })
      : [];
    const auditEntityIds = [
      id,
      ...periodTransactions.map((transaction) => transaction.id),
      ...new Set(periodTransactions.map((transaction) => transaction.importId)),
      ...deposits.map((deposit) => deposit.id),
      ...cardSettlements.map((settlement) => settlement.id),
      ...periodCheques.map((cheque) => cheque.id),
    ].filter((entityId): entityId is string => Boolean(entityId));
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityId: { in: auditEntityIds },
        entityType: {
          in: [
            "BankStatementImport",
            "BankStatementTransaction",
            "BankDepositBatch",
            "CardSettlement",
            "ChequeInstrument",
            "BankReconciliation",
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actorUser: { select: { id: true, name: true, email: true } },
      },
    });
    const auditTimeline = this.auditTimeline({
      imports: this.uniqueImports(periodTransactions),
      transactions: periodTransactions,
      reviewEvents,
      bankRuleApplications,
      deposits,
      cardSettlements,
      cheques: periodCheques,
      auditLogs,
    });

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
        submittedAt: reconciliation.submittedAt,
        submittedBy: reconciliation.submittedBy,
        approvedAt: reconciliation.approvedAt,
        approvedBy: reconciliation.approvedBy,
        approvalNotes: reconciliation.approvalNotes,
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
        ...statementSummary,
        ruleAppliedRowsCount: new Set(bankRuleApplications.map((application) => application.bankStatementTransactionId)).size,
      },
      linkedTreasurySummary,
      accountingStatusSummary,
      auditTimeline,
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

  private async findReconciliationForWorkflow(organizationId: string, id: string, executor: PrismaExecutor) {
    const reconciliation = await executor.bankReconciliation.findFirst({
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

  private async assertReadyForReview(
    organizationId: string,
    reconciliation: {
      id: string;
      bankAccountProfileId: string;
      periodStart: Date;
      periodEnd: Date;
      statementClosingBalance: Prisma.Decimal.Value;
      bankAccountProfile: { accountId: string };
    },
    differenceMessage: string,
    unmatchedMessage: string,
    executor: PrismaExecutor,
  ): Promise<{ ledgerClosingBalance: Prisma.Decimal }> {
    await this.assertNoClosedOverlap(
      organizationId,
      reconciliation.bankAccountProfileId,
      reconciliation.periodStart,
      reconciliation.periodEnd,
      reconciliation.id,
      executor,
    );
    const ledgerClosingBalance = await this.ledgerBalance(
      organizationId,
      reconciliation.bankAccountProfile.accountId,
      reconciliation.periodEnd,
      executor,
    );
    const difference = new Prisma.Decimal(reconciliation.statementClosingBalance).minus(ledgerClosingBalance);
    if (!difference.eq(0)) {
      await executor.bankReconciliation.update({
        where: { id: reconciliation.id },
        data: { ledgerClosingBalance: ledgerClosingBalance.toFixed(4), difference: difference.toFixed(4) },
      });
      throw new BadRequestException(differenceMessage);
    }

    const unmatchedCount = await executor.bankStatementTransaction.count({
      where: {
        organizationId,
        bankAccountProfileId: reconciliation.bankAccountProfileId,
        status: BankStatementTransactionStatus.UNMATCHED,
        transactionDate: { gte: reconciliation.periodStart, lte: reconciliation.periodEnd },
      },
    });
    if (unmatchedCount > 0) {
      throw new BadRequestException(unmatchedMessage);
    }
    return { ledgerClosingBalance };
  }

  private async createReviewEvent(
    executor: PrismaExecutor,
    input: {
      organizationId: string;
      reconciliationId: string;
      actorUserId: string | null;
      action: BankReconciliationReviewAction;
      fromStatus: BankReconciliationStatus | null;
      toStatus: BankReconciliationStatus;
      notes?: string | null;
    },
  ) {
    await executor.bankReconciliationReviewEvent.create({
      data: {
        organizationId: input.organizationId,
        reconciliationId: input.reconciliationId,
        actorUserId: input.actorUserId,
        action: input.action,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        notes: input.notes ?? null,
      },
    });
  }

  private statementSummary(
    transactions: Array<{
      status: BankStatementTransactionStatus;
      type: BankStatementTransactionType;
      amount: Prisma.Decimal.Value;
    }>,
  ) {
    const summary = {
      totalRowsCount: transactions.length,
      matchedRowsCount: 0,
      categorizedRowsCount: 0,
      ignoredRowsCount: 0,
      unmatchedRowsCount: 0,
      unreconciledRowsCount: 0,
      creditRowsCount: 0,
      debitRowsCount: 0,
      creditRowsTotal: new Prisma.Decimal(0),
      debitRowsTotal: new Prisma.Decimal(0),
      exceptionRowsCount: 0,
    };

    for (const transaction of transactions) {
      const amount = new Prisma.Decimal(transaction.amount);
      if (transaction.type === BankStatementTransactionType.CREDIT) {
        summary.creditRowsCount += 1;
        summary.creditRowsTotal = summary.creditRowsTotal.plus(amount);
      } else {
        summary.debitRowsCount += 1;
        summary.debitRowsTotal = summary.debitRowsTotal.plus(amount);
      }

      if (transaction.status === BankStatementTransactionStatus.MATCHED) {
        summary.matchedRowsCount += 1;
      } else if (transaction.status === BankStatementTransactionStatus.CATEGORIZED) {
        summary.categorizedRowsCount += 1;
      } else if (transaction.status === BankStatementTransactionStatus.IGNORED) {
        summary.ignoredRowsCount += 1;
      } else if (transaction.status === BankStatementTransactionStatus.UNMATCHED) {
        summary.unmatchedRowsCount += 1;
      }
    }

    summary.unreconciledRowsCount = summary.unmatchedRowsCount;
    summary.exceptionRowsCount = summary.unmatchedRowsCount;
    return {
      ...summary,
      creditRowsTotal: summary.creditRowsTotal.toFixed(4),
      debitRowsTotal: summary.debitRowsTotal.toFixed(4),
    };
  }

  private linkedTreasurySummary(deposits: any[], cardSettlements: any[], cheques: any[]) {
    return {
      depositBatches: this.treasuryCountSummary(deposits, "totalAmount"),
      cardSettlements: this.treasuryCountSummary(cardSettlements, "amount"),
      cheques: this.treasuryCountSummary(cheques, "amount"),
    };
  }

  private accountingStatusSummary(deposits: any[], cardSettlements: any[], cheques: any[], clearingConfig: any) {
    const records = [...deposits, ...cardSettlements, ...cheques];
    const journalPostedCount = records.filter((record) => Boolean(record.postedJournalEntryId)).length;
    const operationalOnlyCount = records.length - journalPostedCount;
    const configuredAccountCount = clearingConfig
      ? [
          clearingConfig.undepositedFundsAccountId,
          clearingConfig.chequeInHandAccountId,
          clearingConfig.outstandingChequesAccountId,
          clearingConfig.cardClearingAccountId,
          clearingConfig.creditCardLiabilityAccountId,
          clearingConfig.prepaidCardAssetAccountId,
        ].filter(Boolean).length
      : 0;
    return {
      clearingConfigEnabled: Boolean(clearingConfig?.enabled),
      configuredAccountCount,
      journalPostedCount,
      operationalOnlyCount,
      missingClearingConfig: !clearingConfig?.enabled,
    };
  }

  private treasuryCountSummary(records: any[], amountKey: "amount" | "totalAmount") {
    const totalAmount = records.reduce((sum, record) => sum.plus(new Prisma.Decimal(record[amountKey] ?? 0)), new Prisma.Decimal(0));
    return {
      count: records.length,
      matchedCount: records.filter((record) => Boolean(record.statementTransactionId)).length,
      journalPostedCount: records.filter((record) => Boolean(record.postedJournalEntryId)).length,
      operationalOnlyCount: records.filter((record) => !record.postedJournalEntryId).length,
      totalAmount: totalAmount.toFixed(4),
    };
  }

  private auditTimeline(input: {
    imports: any[];
    transactions: any[];
    reviewEvents: any[];
    bankRuleApplications: any[];
    deposits: any[];
    cardSettlements: any[];
    cheques: any[];
    auditLogs: any[];
  }) {
    const events: Array<{
      id: string;
      occurredAt: Date;
      type: string;
      label: string;
      entityType: string;
      entityId: string;
      status?: string | null;
      actor?: { id: string; name: string | null; email: string | null } | null;
      amount?: string | null;
      reference?: string | null;
    }> = [];

    for (const statementImport of input.imports) {
      events.push({
        id: `import-${statementImport.id}`,
        occurredAt: statementImport.importedAt,
        type: "STATEMENT_IMPORT",
        label: `Statement import created (${statementImport.rowCount} rows)`,
        entityType: "BankStatementImport",
        entityId: statementImport.id,
        status: statementImport.status,
        reference: statementImport.filename,
      });
    }
    for (const transaction of input.transactions) {
      events.push({
        id: `statement-${transaction.id}-${transaction.status}`,
        occurredAt: transaction.updatedAt ?? transaction.createdAt,
        type: "STATEMENT_ROW_REVIEW",
        label: this.statementTimelineLabel(transaction),
        entityType: "BankStatementTransaction",
        entityId: transaction.id,
        status: transaction.status,
        amount: this.formatMoney(transaction.amount),
        reference: transaction.reference,
      });
    }
    for (const application of input.bankRuleApplications) {
      events.push({
        id: `rule-${application.id}`,
        occurredAt: application.createdAt,
        type: "BANK_RULE_APPLIED",
        label: `Bank rule ${application.status.toLowerCase()}: ${application.bankRule?.name ?? application.actionType}`,
        entityType: "BankRuleApplication",
        entityId: application.id,
        status: application.status,
        actor: application.appliedBy,
      });
    }
    for (const deposit of input.deposits) {
      events.push({
        id: `deposit-${deposit.id}-${deposit.status}`,
        occurredAt: deposit.matchedAt ?? deposit.postedAt ?? deposit.depositDate,
        type: "DEPOSIT_BATCH",
        label: `Deposit batch ${String(deposit.status).toLowerCase()}`,
        entityType: "BankDepositBatch",
        entityId: deposit.id,
        status: deposit.status,
        amount: this.formatMoney(deposit.totalAmount),
        reference: deposit.postedJournalEntry?.entryNumber ?? null,
      });
      if (deposit.postedJournalEntryId) {
        events.push({
          id: `deposit-journal-${deposit.id}`,
          occurredAt: deposit.postedAt ?? deposit.depositDate,
          type: "CLEARING_JOURNAL_POSTED",
          label: `Deposit clearing journal posted (${deposit.postedJournalEntry?.entryNumber ?? "journal linked"})`,
          entityType: "JournalEntry",
          entityId: deposit.postedJournalEntryId,
          status: deposit.postedJournalEntry?.status ?? null,
          amount: this.formatMoney(deposit.totalAmount),
        });
      }
    }
    for (const settlement of input.cardSettlements) {
      events.push({
        id: `card-${settlement.id}-${settlement.status}`,
        occurredAt: settlement.matchedAt ?? settlement.postedAt ?? settlement.settlementDate,
        type: "CARD_SETTLEMENT",
        label: `Card settlement ${String(settlement.status).toLowerCase()}`,
        entityType: "CardSettlement",
        entityId: settlement.id,
        status: settlement.status,
        amount: this.formatMoney(settlement.amount),
        reference: settlement.postedJournalEntry?.entryNumber ?? null,
      });
      if (settlement.postedJournalEntryId) {
        events.push({
          id: `card-journal-${settlement.id}`,
          occurredAt: settlement.postedAt ?? settlement.settlementDate,
          type: "CLEARING_JOURNAL_POSTED",
          label: `Card clearing journal posted (${settlement.postedJournalEntry?.entryNumber ?? "journal linked"})`,
          entityType: "JournalEntry",
          entityId: settlement.postedJournalEntryId,
          status: settlement.postedJournalEntry?.status ?? null,
          amount: this.formatMoney(settlement.amount),
        });
      }
    }
    for (const cheque of input.cheques) {
      events.push({
        id: `cheque-${cheque.id}-${cheque.status}`,
        occurredAt: cheque.clearedDate ?? cheque.depositDate ?? cheque.dueDate ?? cheque.receivedDate ?? cheque.issueDate ?? cheque.updatedAt,
        type: "CHEQUE_LIFECYCLE",
        label: `Cheque ${cheque.chequeNumber} ${String(cheque.status).toLowerCase()}`,
        entityType: "ChequeInstrument",
        entityId: cheque.id,
        status: cheque.status,
        amount: this.formatMoney(cheque.amount),
        reference: cheque.chequeNumber,
      });
    }
    for (const reviewEvent of input.reviewEvents) {
      events.push({
        id: `review-${reviewEvent.id}`,
        occurredAt: reviewEvent.createdAt,
        type: "RECONCILIATION_REVIEW",
        label: `Reconciliation ${String(reviewEvent.action).toLowerCase()}`,
        entityType: "BankReconciliation",
        entityId: reviewEvent.reconciliationId,
        status: reviewEvent.toStatus,
        actor: reviewEvent.actorUser,
      });
    }
    for (const log of input.auditLogs) {
      events.push({
        id: `audit-${log.id}`,
        occurredAt: log.createdAt,
        type: "AUDIT_LOG",
        label: `${log.entityType} ${String(log.action).toLowerCase()}`,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actorUser,
      });
    }

    return events
      .sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime())
      .map((event) => ({ ...event, occurredAt: event.occurredAt.toISOString() }));
  }

  private uniqueImports(transactions: Array<{ import: any }>) {
    const byId = new Map<string, any>();
    for (const transaction of transactions) {
      if (transaction.import?.id) {
        byId.set(transaction.import.id, transaction.import);
      }
    }
    return [...byId.values()];
  }

  private statementTimelineLabel(transaction: {
    status: BankStatementTransactionStatus;
    matchedJournalEntryId?: string | null;
    createdJournalEntryId?: string | null;
    categorizedAccountId?: string | null;
    ignoredReason?: string | null;
  }) {
    if (transaction.status === BankStatementTransactionStatus.MATCHED) {
      return "Statement row matched";
    }
    if (transaction.status === BankStatementTransactionStatus.CATEGORIZED) {
      return transaction.createdJournalEntryId ? "Statement row categorized with journal" : "Statement row categorized";
    }
    if (transaction.status === BankStatementTransactionStatus.IGNORED) {
      return "Statement row ignored";
    }
    return "Statement row pending review";
  }

  private dateInRange(value: Date | null | undefined, start: Date, end: Date) {
    return Boolean(value && value >= start && value <= end);
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
