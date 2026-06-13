import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  BankAccountStatus,
  BankDepositBatchLineSourceType,
  BankDepositBatchStatus,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  CustomerPaymentStatus,
  Prisma,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AddBankDepositBatchLineDto,
  BankDepositBatchesQueryDto,
  BankDepositSourceCandidatesQueryDto,
  CreateBankDepositBatchDto,
  MatchBankDepositBatchDto,
  UpdateBankDepositBatchDto,
} from "./dto/bank-deposit.dto";

const ACTIVE_DEPOSIT_STATUSES: BankDepositBatchStatus[] = [
  BankDepositBatchStatus.DRAFT,
  BankDepositBatchStatus.POSTED,
  BankDepositBatchStatus.MATCHED,
];

const depositBatchInclude = {
  bankAccountProfile: {
    select: {
      id: true,
      displayName: true,
      currency: true,
      status: true,
      accountId: true,
      account: { select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } },
    },
  },
  statementTransaction: {
    select: {
      id: true,
      transactionDate: true,
      description: true,
      reference: true,
      type: true,
      amount: true,
      status: true,
      matchType: true,
    },
  },
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  lines: { orderBy: { createdAt: "asc" as const } },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type DepositBatchWithLines = Awaited<ReturnType<BankDepositService["get"]>>;

@Injectable()
export class BankDepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string, query: BankDepositBatchesQueryDto = {}) {
    return this.prisma.bankDepositBatch.findMany({
      where: {
        organizationId,
        ...(query.bankAccountProfileId ? { bankAccountProfileId: query.bankAccountProfileId } : {}),
      },
      orderBy: [{ depositDate: "desc" }, { createdAt: "desc" }],
      include: depositBatchInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const batch = await this.prisma.bankDepositBatch.findFirst({
      where: { id, organizationId },
      include: depositBatchInclude,
    });
    if (!batch) {
      throw new NotFoundException("Bank deposit batch not found.");
    }
    return batch;
  }

  async sourceCandidates(organizationId: string, query: BankDepositSourceCandidatesQueryDto) {
    const profile = await this.findActiveBankProfile(organizationId, query.bankAccountProfileId);
    const currency = this.normalizeCurrency(query.currency ?? profile.currency);
    if (currency !== profile.currency) {
      throw new BadRequestException("Source candidate currency must match the selected bank account currency.");
    }

    const usedSourceIds = new Set(
      (
        await this.prisma.bankDepositBatchLine.findMany({
          where: {
            organizationId,
            sourceType: BankDepositBatchLineSourceType.CUSTOMER_PAYMENT,
            sourceId: { not: null },
            batch: { status: { in: ACTIVE_DEPOSIT_STATUSES } },
          },
          select: { sourceId: true },
        })
      )
        .map((line) => line.sourceId)
        .filter((sourceId): sourceId is string => Boolean(sourceId)),
    );

    const payments = await this.prisma.customerPayment.findMany({
      where: {
        organizationId,
        status: CustomerPaymentStatus.POSTED,
        voidReversalJournalEntryId: null,
        currency,
        amountReceived: { gt: "0" },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: query.limit ?? 50,
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        account: { select: { id: true, code: true, name: true, type: true, bankAccountProfile: { select: { id: true, type: true, displayName: true } } } },
      },
    });

    return payments
      .filter((payment) => !usedSourceIds.has(payment.id))
      .map((payment) => ({
        sourceType: BankDepositBatchLineSourceType.CUSTOMER_PAYMENT,
        sourceId: payment.id,
        reference: payment.paymentNumber,
        counterpartyName: payment.customer.displayName ?? payment.customer.name,
        amount: this.formatMoney(payment.amountReceived),
        currency: payment.currency,
        paymentDate: payment.paymentDate,
        account: payment.account,
        depositReadiness:
          payment.account.bankAccountProfile?.id === profile.id
            ? "ALREADY_POSTED_TO_THIS_BANK_ACCOUNT"
            : "OPERATIONAL_GROUPING_ONLY_CLEARING_NOT_CONFIRMED",
      }));
  }

  async create(organizationId: string, actorUserId: string, dto: CreateBankDepositBatchDto) {
    const profile = await this.findActiveBankProfile(organizationId, dto.bankAccountProfileId);
    const depositDate = this.parseDate(dto.depositDate, "Deposit date");
    const currency = this.normalizeCurrency(dto.currency);
    if (currency !== profile.currency) {
      throw new BadRequestException("Deposit batch currency must match the selected bank account currency.");
    }

    const created = await this.prisma.bankDepositBatch.create({
      data: {
        organizationId,
        bankAccountProfileId: profile.id,
        depositDate,
        currency,
        memo: this.cleanOptional(dto.memo),
        status: BankDepositBatchStatus.DRAFT,
        totalAmount: "0.0000",
        createdById: actorUserId,
        updatedById: actorUserId,
      },
      include: depositBatchInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_CREATED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateBankDepositBatchDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing);

    const data: Prisma.BankDepositBatchUncheckedUpdateInput = {
      updatedById: actorUserId,
    };
    if (dto.bankAccountProfileId !== undefined) {
      const profile = await this.findActiveBankProfile(organizationId, dto.bankAccountProfileId);
      const currency = this.normalizeCurrency(dto.currency ?? existing.currency);
      if (currency !== profile.currency) {
        throw new BadRequestException("Deposit batch currency must match the selected bank account currency.");
      }
      if (existing.lines.length > 0 && profile.id !== existing.bankAccountProfileId) {
        throw new BadRequestException("Remove deposit lines before changing the bank account.");
      }
      data.bankAccountProfileId = profile.id;
      data.currency = currency;
    } else if (dto.currency !== undefined) {
      const currency = this.normalizeCurrency(dto.currency);
      if (currency !== existing.bankAccountProfile.currency) {
        throw new BadRequestException("Deposit batch currency must match the selected bank account currency.");
      }
      if (existing.lines.some((line) => line.currency !== currency)) {
        throw new BadRequestException("Remove deposit lines before changing currency.");
      }
      data.currency = currency;
    }
    if (dto.depositDate !== undefined) {
      data.depositDate = this.parseDate(dto.depositDate, "Deposit date");
    }
    if (dto.memo !== undefined) {
      data.memo = this.cleanOptional(dto.memo);
    }

    const updated = await this.prisma.bankDepositBatch.update({
      where: { id },
      data,
      include: depositBatchInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async addLine(organizationId: string, actorUserId: string, id: string, dto: AddBankDepositBatchLineDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing);
    const amount = this.assertPositiveMoney(dto.amount, "Deposit line amount");
    const currency = this.normalizeCurrency(dto.currency);
    if (currency !== existing.currency) {
      throw new BadRequestException("Deposit line currency must match the batch currency.");
    }

    const source = await this.resolveLineSource(organizationId, dto, existing);
    if (source.sourceId) {
      await this.assertSourceNotAlreadyUsed(organizationId, source.sourceType, source.sourceId);
    }
    if (source.amount && !amount.eq(source.amount)) {
      throw new BadRequestException("Deposit line amount must match the selected source amount.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bankDepositBatchLine.create({
        data: {
          organizationId,
          batchId: id,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          counterpartyName: this.cleanOptional(dto.counterpartyName) ?? source.counterpartyName,
          reference: this.cleanOptional(dto.reference) ?? source.reference,
          amount: amount.toFixed(4),
          currency,
          memo: this.cleanOptional(dto.memo),
        },
      });
      return this.recalculateTotal(organizationId, id, actorUserId, tx);
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async removeLine(organizationId: string, actorUserId: string, id: string, lineId: string) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing);
    if (!existing.lines.some((line) => line.id === lineId)) {
      throw new NotFoundException("Bank deposit batch line not found.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bankDepositBatchLine.delete({ where: { id: lineId } });
      return this.recalculateTotal(organizationId, id, actorUserId, tx);
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async post(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing);
    if (existing.lines.length === 0 || toMoney(existing.totalAmount).lte(0)) {
      throw new BadRequestException("Deposit batch must have at least one positive line before posting.");
    }

    const posted = await this.prisma.bankDepositBatch.update({
      where: { id },
      data: {
        status: BankDepositBatchStatus.POSTED,
        postedAt: new Date(),
        updatedById: actorUserId,
      },
      include: depositBatchInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_POSTED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      before: existing,
      after: posted,
    });
    return posted;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === BankDepositBatchStatus.VOIDED) {
      return existing;
    }
    if (existing.status === BankDepositBatchStatus.MATCHED) {
      await this.assertStatementTransactionNotClosed(organizationId, existing.bankAccountProfileId, existing.statementTransaction?.transactionDate);
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      if (existing.statementTransactionId) {
        await tx.bankStatementTransaction.update({
          where: { id: existing.statementTransactionId },
          data: {
            status: BankStatementTransactionStatus.UNMATCHED,
            matchedJournalLineId: null,
            matchedJournalEntryId: null,
            matchType: null,
          },
        });
      }
      return tx.bankDepositBatch.update({
        where: { id },
        data: {
          status: BankDepositBatchStatus.VOIDED,
          statementTransactionId: null,
          voidedAt: new Date(),
          updatedById: actorUserId,
        },
        include: depositBatchInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_VOIDED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async matchCandidates(organizationId: string, id: string) {
    const batch = await this.get(organizationId, id);
    if (batch.status !== BankDepositBatchStatus.POSTED || toMoney(batch.totalAmount).lte(0)) {
      return [];
    }
    const start = new Date(batch.depositDate);
    start.setUTCDate(start.getUTCDate() - 7);
    const end = new Date(batch.depositDate);
    end.setUTCDate(end.getUTCDate() + 7);
    return this.prisma.bankStatementTransaction.findMany({
      where: {
        organizationId,
        bankAccountProfileId: batch.bankAccountProfileId,
        status: BankStatementTransactionStatus.UNMATCHED,
        type: BankStatementTransactionType.CREDIT,
        amount: this.formatMoney(batch.totalAmount),
        transactionDate: { gte: start, lte: end },
      },
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        transactionDate: true,
        description: true,
        reference: true,
        type: true,
        amount: true,
        status: true,
        rawData: true,
      },
    });
  }

  async matchStatementTransaction(organizationId: string, actorUserId: string, id: string, dto: MatchBankDepositBatchDto) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== BankDepositBatchStatus.POSTED) {
      throw new BadRequestException("Only posted, unmatched deposit batches can be matched to statement rows.");
    }
    const transaction = await this.prisma.bankStatementTransaction.findFirst({
      where: { id: dto.statementTransactionId, organizationId },
      include: { bankAccountProfile: { select: { id: true, currency: true } } },
    });
    if (!transaction) {
      throw new NotFoundException("Bank statement transaction not found.");
    }
    await this.assertStatementTransactionNotClosed(organizationId, transaction.bankAccountProfileId, transaction.transactionDate);
    this.assertStatementMatchesBatch(existing, transaction);

    const matched = await this.prisma.$transaction(async (tx) => {
      const statementClaim = await tx.bankStatementTransaction.updateMany({
        where: {
          id: transaction.id,
          organizationId,
          status: BankStatementTransactionStatus.UNMATCHED,
          bankAccountProfileId: existing.bankAccountProfileId,
          type: BankStatementTransactionType.CREDIT,
          amount: this.formatMoney(existing.totalAmount),
        },
        data: {
          status: BankStatementTransactionStatus.MATCHED,
          matchType: BankStatementMatchType.OTHER,
        },
      });
      if (statementClaim.count !== 1) {
        throw new BadRequestException("Statement transaction is no longer eligible for deposit matching.");
      }
      return tx.bankDepositBatch.update({
        where: { id },
        data: {
          status: BankDepositBatchStatus.MATCHED,
          statementTransactionId: transaction.id,
          matchedAt: new Date(),
          updatedById: actorUserId,
        },
        include: depositBatchInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_MATCHED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      before: existing,
      after: matched,
    });
    return matched;
  }

  async unmatchStatementTransaction(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== BankDepositBatchStatus.MATCHED || !existing.statementTransactionId || !existing.statementTransaction) {
      throw new BadRequestException("Only matched deposit batches can be unmatched.");
    }
    await this.assertStatementTransactionNotClosed(organizationId, existing.bankAccountProfileId, existing.statementTransaction.transactionDate);

    const unmatched = await this.prisma.$transaction(async (tx) => {
      await tx.bankStatementTransaction.update({
        where: { id: existing.statementTransactionId! },
        data: {
          status: BankStatementTransactionStatus.UNMATCHED,
          matchedJournalLineId: null,
          matchedJournalEntryId: null,
          matchType: null,
        },
      });
      return tx.bankDepositBatch.update({
        where: { id },
        data: {
          status: BankDepositBatchStatus.POSTED,
          statementTransactionId: null,
          matchedAt: null,
          updatedById: actorUserId,
        },
        include: depositBatchInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BANK_DEPOSIT_BATCH_UNMATCHED,
      entityType: AUDIT_ENTITY_TYPES.BANK_DEPOSIT_BATCH,
      entityId: id,
      before: existing,
      after: unmatched,
    });
    return unmatched;
  }

  private async recalculateTotal(
    organizationId: string,
    id: string,
    actorUserId: string,
    tx: Prisma.TransactionClient,
  ): Promise<DepositBatchWithLines> {
    const lines = await tx.bankDepositBatchLine.findMany({
      where: { organizationId, batchId: id },
      select: { amount: true },
    });
    const total = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    return tx.bankDepositBatch.update({
      where: { id },
      data: { totalAmount: total.toFixed(4), updatedById: actorUserId },
      include: depositBatchInclude,
    });
  }

  private async resolveLineSource(
    organizationId: string,
    dto: AddBankDepositBatchLineDto,
    batch: DepositBatchWithLines,
  ): Promise<{
    sourceType: BankDepositBatchLineSourceType;
    sourceId?: string | null;
    counterpartyName?: string | null;
    reference?: string | null;
    amount?: Prisma.Decimal;
  }> {
    const sourceId = this.cleanOptional(dto.sourceId);
    if (dto.sourceType === BankDepositBatchLineSourceType.CUSTOMER_PAYMENT) {
      if (!sourceId) {
        throw new BadRequestException("Customer payment deposit lines require a source id.");
      }
      const payment = await this.prisma.customerPayment.findFirst({
        where: { id: sourceId, organizationId },
        include: {
          customer: { select: { name: true, displayName: true } },
        },
      });
      if (!payment) {
        throw new BadRequestException("Customer payment source must belong to this organization.");
      }
      if (payment.status !== CustomerPaymentStatus.POSTED || payment.voidReversalJournalEntryId) {
        throw new BadRequestException("Only posted, non-voided customer payments can be added to a deposit batch.");
      }
      if (payment.currency !== batch.currency) {
        throw new BadRequestException("Customer payment currency must match the deposit batch currency.");
      }
      return {
        sourceType: dto.sourceType,
        sourceId,
        counterpartyName: payment.customer.displayName ?? payment.customer.name,
        reference: payment.paymentNumber,
        amount: new Prisma.Decimal(payment.amountReceived),
      };
    }
    if (dto.sourceType === BankDepositBatchLineSourceType.CHEQUE_PLACEHOLDER && sourceId) {
      return { sourceType: dto.sourceType, sourceId };
    }
    return {
      sourceType: dto.sourceType,
      sourceId: sourceId ?? null,
    };
  }

  private async assertSourceNotAlreadyUsed(
    organizationId: string,
    sourceType: BankDepositBatchLineSourceType,
    sourceId: string,
  ) {
    const existing = await this.prisma.bankDepositBatchLine.findFirst({
      where: {
        organizationId,
        sourceType,
        sourceId,
        batch: { status: { in: ACTIVE_DEPOSIT_STATUSES } },
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Deposit source is already linked to an active deposit batch.");
    }
  }

  private assertStatementMatchesBatch(
    batch: DepositBatchWithLines,
    transaction: {
      bankAccountProfileId: string;
      type: BankStatementTransactionType;
      status: BankStatementTransactionStatus;
      amount: Prisma.Decimal | string;
      bankAccountProfile: { currency: string };
    },
  ) {
    if (transaction.bankAccountProfileId !== batch.bankAccountProfileId) {
      throw new BadRequestException("Deposit batch can only match statement rows from the same bank account.");
    }
    if (transaction.status !== BankStatementTransactionStatus.UNMATCHED) {
      throw new BadRequestException("Deposit batch can only match an unmatched statement row.");
    }
    if (transaction.type !== BankStatementTransactionType.CREDIT) {
      throw new BadRequestException("Deposit batch can only match a credit statement row.");
    }
    if (!toMoney(transaction.amount).eq(batch.totalAmount)) {
      throw new BadRequestException("Deposit batch total must match the statement row amount.");
    }
    if (transaction.bankAccountProfile.currency !== batch.currency) {
      throw new BadRequestException("Deposit batch currency must match the statement row currency.");
    }
  }

  private async assertStatementTransactionNotClosed(
    organizationId: string,
    bankAccountProfileId: string,
    transactionDate?: Date | null,
    executor: PrismaExecutor = this.prisma,
  ) {
    if (!transactionDate) {
      throw new BadRequestException("Statement transaction date is required for reconciliation lock checks.");
    }
    const closed = await executor.bankReconciliation.findFirst({
      where: {
        organizationId,
        bankAccountProfileId,
        status: "CLOSED",
        periodStart: { lte: transactionDate },
        periodEnd: { gte: transactionDate },
      },
      select: { id: true, reconciliationNumber: true },
    });
    if (closed) {
      throw new BadRequestException(`Statement transaction belongs to closed reconciliation ${closed.reconciliationNumber}.`);
    }
  }

  private async findActiveBankProfile(organizationId: string, id: string) {
    const profile = await this.prisma.bankAccountProfile.findFirst({
      where: { id, organizationId },
      include: { account: { select: { id: true, type: true, allowPosting: true, isActive: true } } },
    });
    if (!profile) {
      throw new NotFoundException("Bank account profile not found.");
    }
    if (profile.status !== BankAccountStatus.ACTIVE) {
      throw new BadRequestException("Deposit batch bank account must be active.");
    }
    if (profile.account.type !== AccountType.ASSET || !profile.account.allowPosting || !profile.account.isActive) {
      throw new BadRequestException("Deposit batch bank account must link to an active posting asset account.");
    }
    return profile;
  }

  private assertDraft(batch: { status: BankDepositBatchStatus }) {
    if (batch.status !== BankDepositBatchStatus.DRAFT) {
      throw new BadRequestException("Only draft deposit batches can be changed.");
    }
  }

  private parseDate(value: string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} is invalid.`);
    }
    return date;
  }

  private assertPositiveMoney(value: string, label: string) {
    const amount = toMoney(value);
    if (amount.lte(0)) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
    return amount;
  }

  private normalizeCurrency(value: string) {
    const currency = value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new BadRequestException("Currency must be a three-letter ISO code.");
    }
    return currency;
  }

  private cleanOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private formatMoney(value: Prisma.Decimal | string | number) {
    return toMoney(value).toFixed(4);
  }
}
