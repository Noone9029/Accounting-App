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
  ChequeInstrumentStatus,
  ChequeInstrumentType,
  Prisma,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { BounceChequeDto, ChequesQueryDto, CreateChequeDto, DepositChequeDto, MatchChequeDto, UpdateChequeDto, VoidChequeDto } from "./dto/cheque.dto";

const chequeInclude = {
  bankAccountProfile: {
    select: {
      id: true,
      displayName: true,
      type: true,
      status: true,
      currency: true,
      accountId: true,
      account: { select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } },
    },
  },
  depositBatch: {
    select: {
      id: true,
      depositDate: true,
      status: true,
      totalAmount: true,
      bankAccountProfileId: true,
    },
  },
  statementTransaction: {
    select: {
      id: true,
      bankAccountProfileId: true,
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
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type ChequeWithRelations = Awaited<ReturnType<ChequeService["get"]>>;
const OPEN_CHEQUE_STATUSES: ChequeInstrumentStatus[] = [
  ChequeInstrumentStatus.RECEIVED,
  ChequeInstrumentStatus.ISSUED,
  ChequeInstrumentStatus.DEPOSITED,
];
const FINAL_CHEQUE_STATUSES: ChequeInstrumentStatus[] = [
  ChequeInstrumentStatus.CLEARED,
  ChequeInstrumentStatus.BOUNCED,
  ChequeInstrumentStatus.VOIDED,
];

@Injectable()
export class ChequeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string, query: ChequesQueryDto = {}) {
    return this.prisma.chequeInstrument.findMany({
      where: {
        organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.chequeType ? { chequeType: query.chequeType } : {}),
        ...(query.bankAccountProfileId ? { bankAccountProfileId: query.bankAccountProfileId } : {}),
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: chequeInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const cheque = await this.prisma.chequeInstrument.findFirst({
      where: { id, organizationId },
      include: chequeInclude,
    });
    if (!cheque) {
      throw new NotFoundException("Cheque not found.");
    }
    return cheque;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateChequeDto) {
    const prepared = await this.prepareChequeInput(organizationId, dto);
    const created = await this.prisma.chequeInstrument.create({
      data: {
        organizationId,
        chequeType: dto.chequeType,
        status: ChequeInstrumentStatus.DRAFT,
        bankAccountProfileId: prepared.bankAccountProfileId,
        counterpartyType: dto.counterpartyType,
        counterpartyId: this.cleanOptional(dto.counterpartyId),
        counterpartyName: prepared.counterpartyName,
        chequeNumber: prepared.chequeNumber,
        drawerBankName: this.cleanOptional(dto.drawerBankName),
        payeeName: this.cleanOptional(dto.payeeName),
        issueDate: this.parseOptionalDate(dto.issueDate, "Issue date"),
        receivedDate: this.parseOptionalDate(dto.receivedDate, "Received date"),
        dueDate: this.parseOptionalDate(dto.dueDate, "Due date"),
        amount: prepared.amount.toFixed(4),
        currency: prepared.currency,
        reference: this.cleanOptional(dto.reference),
        memo: this.cleanOptional(dto.memo),
        createdById: actorUserId,
        updatedById: actorUserId,
      },
      include: chequeInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_CREATED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateChequeDto) {
    const existing = await this.get(organizationId, id);
    this.assertEditable(existing);
    const prepared = await this.prepareChequeInput(organizationId, {
      chequeType: dto.chequeType ?? existing.chequeType,
      bankAccountProfileId: dto.bankAccountProfileId !== undefined ? dto.bankAccountProfileId : existing.bankAccountProfileId ?? undefined,
      counterpartyType: dto.counterpartyType ?? existing.counterpartyType ?? undefined,
      counterpartyId: dto.counterpartyId ?? existing.counterpartyId ?? undefined,
      counterpartyName: dto.counterpartyName ?? existing.counterpartyName,
      chequeNumber: dto.chequeNumber ?? existing.chequeNumber,
      drawerBankName: dto.drawerBankName ?? existing.drawerBankName ?? undefined,
      payeeName: dto.payeeName ?? existing.payeeName ?? undefined,
      issueDate: dto.issueDate ?? existing.issueDate?.toISOString(),
      receivedDate: dto.receivedDate ?? existing.receivedDate?.toISOString(),
      dueDate: dto.dueDate ?? existing.dueDate?.toISOString(),
      amount: dto.amount ?? this.formatMoney(existing.amount),
      currency: dto.currency ?? existing.currency,
      reference: dto.reference ?? existing.reference ?? undefined,
      memo: dto.memo ?? existing.memo ?? undefined,
    });

    const updated = await this.prisma.chequeInstrument.update({
      where: { id },
      data: {
        chequeType: dto.chequeType,
        bankAccountProfileId: prepared.bankAccountProfileId,
        counterpartyType: dto.counterpartyType,
        counterpartyId: dto.counterpartyId === undefined ? undefined : this.cleanOptional(dto.counterpartyId) ?? null,
        counterpartyName: dto.counterpartyName === undefined ? undefined : prepared.counterpartyName,
        chequeNumber: dto.chequeNumber === undefined ? undefined : prepared.chequeNumber,
        drawerBankName: dto.drawerBankName === undefined ? undefined : this.cleanOptional(dto.drawerBankName) ?? null,
        payeeName: dto.payeeName === undefined ? undefined : this.cleanOptional(dto.payeeName) ?? null,
        issueDate: dto.issueDate === undefined ? undefined : this.parseOptionalDate(dto.issueDate, "Issue date"),
        receivedDate: dto.receivedDate === undefined ? undefined : this.parseOptionalDate(dto.receivedDate, "Received date"),
        dueDate: dto.dueDate === undefined ? undefined : this.parseOptionalDate(dto.dueDate, "Due date"),
        amount: dto.amount === undefined ? undefined : prepared.amount.toFixed(4),
        currency: dto.currency === undefined ? undefined : prepared.currency,
        reference: dto.reference === undefined ? undefined : this.cleanOptional(dto.reference) ?? null,
        memo: dto.memo === undefined ? undefined : this.cleanOptional(dto.memo) ?? null,
        updatedById: actorUserId,
      },
      include: chequeInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  markReceived(organizationId: string, actorUserId: string, id: string) {
    return this.markOpen(organizationId, actorUserId, id, ChequeInstrumentType.RECEIVED, ChequeInstrumentStatus.RECEIVED, AUDIT_EVENTS.CHEQUE_INSTRUMENT_RECEIVED);
  }

  markIssued(organizationId: string, actorUserId: string, id: string) {
    return this.markOpen(organizationId, actorUserId, id, ChequeInstrumentType.ISSUED, ChequeInstrumentStatus.ISSUED, AUDIT_EVENTS.CHEQUE_INSTRUMENT_ISSUED);
  }

  async deposit(organizationId: string, actorUserId: string, id: string, dto: DepositChequeDto) {
    const existing = await this.get(organizationId, id);
    if (existing.chequeType !== ChequeInstrumentType.RECEIVED || existing.status !== ChequeInstrumentStatus.RECEIVED) {
      throw new BadRequestException("Only received cheques can be deposited into a bank deposit batch.");
    }
    if (existing.depositBatchId) {
      throw new BadRequestException("Cheque is already linked to a deposit batch.");
    }
    const batch = await this.prisma.bankDepositBatch.findFirst({
      where: { id: dto.depositBatchId, organizationId },
      include: { bankAccountProfile: { select: { id: true, currency: true, status: true, account: { select: { type: true, allowPosting: true, isActive: true } } } } },
    });
    if (!batch) {
      throw new NotFoundException("Bank deposit batch not found.");
    }
    if (batch.status !== BankDepositBatchStatus.DRAFT) {
      throw new BadRequestException("Cheque can only be deposited into a draft bank deposit batch.");
    }
    if (batch.currency !== existing.currency || batch.bankAccountProfile.currency !== existing.currency) {
      throw new BadRequestException("Cheque currency must match the deposit batch currency.");
    }
    if (batch.bankAccountProfile.status !== BankAccountStatus.ACTIVE || batch.bankAccountProfile.account.type !== AccountType.ASSET) {
      throw new BadRequestException("Deposit batch must use an active posting bank account.");
    }
    await this.assertChequeNotInActiveDeposit(organizationId, id);

    const deposited = await this.prisma.$transaction(async (tx) => {
      await tx.bankDepositBatchLine.create({
        data: {
          organizationId,
          batchId: batch.id,
          sourceType: BankDepositBatchLineSourceType.CHEQUE_PLACEHOLDER,
          sourceId: id,
          counterpartyName: existing.counterpartyName,
          reference: existing.chequeNumber,
          amount: this.formatMoney(existing.amount),
          currency: existing.currency,
          memo: existing.memo ?? "Received cheque",
        },
      });
      const lines = await tx.bankDepositBatchLine.findMany({ where: { organizationId, batchId: batch.id }, select: { amount: true } });
      const total = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
      await tx.bankDepositBatch.update({
        where: { id: batch.id },
        data: { totalAmount: total.toFixed(4), updatedById: actorUserId },
      });
      return tx.chequeInstrument.update({
        where: { id },
        data: {
          status: ChequeInstrumentStatus.DEPOSITED,
          depositBatchId: batch.id,
          bankAccountProfileId: batch.bankAccountProfileId,
          depositDate: batch.depositDate,
          updatedById: actorUserId,
        },
        include: chequeInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_DEPOSITED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: deposited,
    });
    return deposited;
  }

  async clear(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    this.assertCanClear(existing);
    const cleared = await this.prisma.chequeInstrument.update({
      where: { id },
      data: { status: ChequeInstrumentStatus.CLEARED, clearedDate: new Date(), updatedById: actorUserId },
      include: chequeInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_CLEARED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: cleared,
    });
    return cleared;
  }

  async bounce(organizationId: string, actorUserId: string, id: string, dto: BounceChequeDto) {
    const existing = await this.get(organizationId, id);
    if (!OPEN_CHEQUE_STATUSES.includes(existing.status)) {
      throw new BadRequestException("Only open, received, issued, or deposited cheques can be bounced or stopped.");
    }
    const reason = this.requiredReason(dto.bounceReason, "Bounce reason");
    const bounced = await this.prisma.chequeInstrument.update({
      where: { id },
      data: { status: ChequeInstrumentStatus.BOUNCED, bounceReason: reason, bouncedDate: new Date(), updatedById: actorUserId },
      include: chequeInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_BOUNCED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: bounced,
    });
    return bounced;
  }

  async void(organizationId: string, actorUserId: string, id: string, dto: VoidChequeDto) {
    const existing = await this.get(organizationId, id);
    if (existing.status === ChequeInstrumentStatus.VOIDED) {
      return existing;
    }
    const reason = this.requiredReason(dto.voidReason, "Void reason");
    if (existing.statementTransactionId && existing.statementTransaction) {
      await this.assertStatementTransactionNotClosed(organizationId, existing.statementTransaction.bankAccountProfileId, existing.statementTransaction.transactionDate);
    }
    const voided = await this.prisma.$transaction(async (tx) => {
      if (existing.statementTransactionId) {
        await tx.bankStatementTransaction.update({
          where: { id: existing.statementTransactionId },
          data: { status: BankStatementTransactionStatus.UNMATCHED, matchedJournalLineId: null, matchedJournalEntryId: null, matchType: null },
        });
      }
      return tx.chequeInstrument.update({
        where: { id },
        data: {
          status: ChequeInstrumentStatus.VOIDED,
          statementTransactionId: null,
          voidReason: reason,
          voidedDate: new Date(),
          updatedById: actorUserId,
        },
        include: chequeInclude,
      });
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_VOIDED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async matchCandidates(organizationId: string, id: string) {
    const cheque = await this.get(organizationId, id);
    if (!this.canMatchStatus(cheque.status) || !cheque.bankAccountProfileId) {
      return [];
    }
    const anchor = cheque.depositDate ?? cheque.dueDate ?? cheque.receivedDate ?? cheque.issueDate ?? cheque.createdAt;
    const start = new Date(anchor);
    start.setUTCDate(start.getUTCDate() - 14);
    const end = new Date(anchor);
    end.setUTCDate(end.getUTCDate() + 14);
    return this.prisma.bankStatementTransaction.findMany({
      where: {
        organizationId,
        bankAccountProfileId: cheque.bankAccountProfileId,
        status: BankStatementTransactionStatus.UNMATCHED,
        type: this.statementType(cheque.chequeType),
        amount: this.formatMoney(cheque.amount),
        transactionDate: { gte: start, lte: end },
      },
      orderBy: [{ transactionDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        bankAccountProfileId: true,
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

  async matchStatementTransaction(organizationId: string, actorUserId: string, id: string, dto: MatchChequeDto) {
    const existing = await this.get(organizationId, id);
    if (!this.canMatchStatus(existing.status)) {
      throw new BadRequestException("Only open received, deposited, or issued cheques can be matched to statement rows.");
    }
    const transaction = await this.prisma.bankStatementTransaction.findFirst({
      where: { id: dto.statementTransactionId, organizationId },
      include: { bankAccountProfile: { select: { id: true, currency: true } } },
    });
    if (!transaction) {
      throw new NotFoundException("Bank statement transaction not found.");
    }
    await this.assertStatementTransactionNotClosed(organizationId, transaction.bankAccountProfileId, transaction.transactionDate);
    this.assertStatementMatchesCheque(existing, transaction);

    const matched = await this.prisma.$transaction(async (tx) => {
      const statementClaim = await tx.bankStatementTransaction.updateMany({
        where: {
          id: transaction.id,
          organizationId,
          status: BankStatementTransactionStatus.UNMATCHED,
          type: this.statementType(existing.chequeType),
          amount: this.formatMoney(existing.amount),
          ...(existing.bankAccountProfileId ? { bankAccountProfileId: existing.bankAccountProfileId } : {}),
        },
        data: { status: BankStatementTransactionStatus.MATCHED, matchType: BankStatementMatchType.OTHER },
      });
      if (statementClaim.count !== 1) {
        throw new BadRequestException("Statement transaction is no longer eligible for cheque matching.");
      }
      return tx.chequeInstrument.update({
        where: { id },
        data: {
          status: ChequeInstrumentStatus.CLEARED,
          statementTransactionId: transaction.id,
          bankAccountProfileId: transaction.bankAccountProfileId,
          clearedDate: new Date(),
          updatedById: actorUserId,
        },
        include: chequeInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_MATCHED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: matched,
    });
    return matched;
  }

  async unmatchStatementTransaction(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (!existing.statementTransactionId || !existing.statementTransaction) {
      throw new BadRequestException("Only matched cheques can be unmatched.");
    }
    await this.assertStatementTransactionNotClosed(organizationId, existing.statementTransaction.bankAccountProfileId, existing.statementTransaction.transactionDate);
    const previousStatus =
      existing.chequeType === ChequeInstrumentType.RECEIVED
        ? existing.depositBatchId
          ? ChequeInstrumentStatus.DEPOSITED
          : ChequeInstrumentStatus.RECEIVED
        : ChequeInstrumentStatus.ISSUED;
    const unmatched = await this.prisma.$transaction(async (tx) => {
      await tx.bankStatementTransaction.update({
        where: { id: existing.statementTransactionId! },
        data: { status: BankStatementTransactionStatus.UNMATCHED, matchedJournalLineId: null, matchedJournalEntryId: null, matchType: null },
      });
      return tx.chequeInstrument.update({
        where: { id },
        data: { status: previousStatus, statementTransactionId: null, clearedDate: null, updatedById: actorUserId },
        include: chequeInclude,
      });
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CHEQUE_INSTRUMENT_UNMATCHED,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: unmatched,
    });
    return unmatched;
  }

  private async markOpen(
    organizationId: string,
    actorUserId: string,
    id: string,
    type: ChequeInstrumentType,
    status: ChequeInstrumentStatus,
    auditEvent: string,
  ) {
    const existing = await this.get(organizationId, id);
    if (existing.chequeType !== type || existing.status !== ChequeInstrumentStatus.DRAFT) {
      throw new BadRequestException(`Only draft ${type.toLowerCase()} cheques can be marked ${status.toLowerCase()}.`);
    }
    if (type === ChequeInstrumentType.ISSUED && !existing.issueDate) {
      throw new BadRequestException("Issued cheques require an issue date.");
    }
    if (type === ChequeInstrumentType.RECEIVED && !existing.receivedDate && !existing.issueDate) {
      throw new BadRequestException("Received cheques require a received date or issue date.");
    }
    const updated = await this.prisma.chequeInstrument.update({
      where: { id },
      data: { status, updatedById: actorUserId },
      include: chequeInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: auditEvent,
      entityType: AUDIT_ENTITY_TYPES.CHEQUE_INSTRUMENT,
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  private async prepareChequeInput(organizationId: string, dto: CreateChequeDto) {
    const amount = this.assertPositiveMoney(dto.amount, "Cheque amount");
    const currency = this.normalizeCurrency(dto.currency);
    const chequeNumber = this.requiredText(dto.chequeNumber, "Cheque number");
    const counterpartyName = this.requiredText(dto.counterpartyName, "Counterparty name");
    let bankAccountProfileId = this.cleanOptional(dto.bankAccountProfileId);
    if (bankAccountProfileId) {
      const profile = await this.findActiveBankProfile(organizationId, bankAccountProfileId);
      if (profile.currency !== currency) {
        throw new BadRequestException("Cheque currency must match the selected bank account currency.");
      }
      bankAccountProfileId = profile.id;
    }
    return { amount, currency, chequeNumber, counterpartyName, bankAccountProfileId };
  }

  private async findActiveBankProfile(organizationId: string, id: string) {
    const profile = await this.prisma.bankAccountProfile.findFirst({
      where: { id, organizationId },
      include: { account: { select: { type: true, allowPosting: true, isActive: true } } },
    });
    if (!profile) {
      throw new NotFoundException("Bank account profile not found.");
    }
    if (profile.status !== BankAccountStatus.ACTIVE) {
      throw new BadRequestException("Cheque bank account must be active.");
    }
    if (profile.account.type !== AccountType.ASSET || !profile.account.allowPosting || !profile.account.isActive) {
      throw new BadRequestException("Cheque bank account must link to an active posting asset account.");
    }
    return profile;
  }

  private async assertChequeNotInActiveDeposit(organizationId: string, chequeId: string) {
    const existing = await this.prisma.bankDepositBatchLine.findFirst({
      where: {
        organizationId,
        sourceType: BankDepositBatchLineSourceType.CHEQUE_PLACEHOLDER,
        sourceId: chequeId,
        batch: { status: { in: [BankDepositBatchStatus.DRAFT, BankDepositBatchStatus.POSTED, BankDepositBatchStatus.MATCHED] } },
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Cheque is already linked to an active deposit batch.");
    }
  }

  private assertCanClear(cheque: { chequeType: ChequeInstrumentType; status: ChequeInstrumentStatus }) {
    const allowed: ChequeInstrumentStatus[] =
      cheque.chequeType === ChequeInstrumentType.RECEIVED
        ? [ChequeInstrumentStatus.RECEIVED, ChequeInstrumentStatus.DEPOSITED]
        : [ChequeInstrumentStatus.ISSUED];
    if (!allowed.includes(cheque.status)) {
      throw new BadRequestException("Cheque cannot be cleared from its current status.");
    }
  }

  private canMatchStatus(status: ChequeInstrumentStatus) {
    return OPEN_CHEQUE_STATUSES.includes(status);
  }

  private statementType(chequeType: ChequeInstrumentType) {
    return chequeType === ChequeInstrumentType.RECEIVED ? BankStatementTransactionType.CREDIT : BankStatementTransactionType.DEBIT;
  }

  private assertStatementMatchesCheque(
    cheque: ChequeWithRelations,
    transaction: {
      bankAccountProfileId: string;
      type: BankStatementTransactionType;
      status: BankStatementTransactionStatus;
      amount: Prisma.Decimal | string;
      bankAccountProfile: { currency: string };
    },
  ) {
    if (cheque.bankAccountProfileId && transaction.bankAccountProfileId !== cheque.bankAccountProfileId) {
      throw new BadRequestException("Cheque can only match statement rows from the selected bank account.");
    }
    if (transaction.status !== BankStatementTransactionStatus.UNMATCHED) {
      throw new BadRequestException("Cheque can only match an unmatched statement row.");
    }
    if (transaction.type !== this.statementType(cheque.chequeType)) {
      throw new BadRequestException("Statement row direction does not match the cheque type.");
    }
    if (!toMoney(transaction.amount).eq(cheque.amount)) {
      throw new BadRequestException("Cheque amount must match the statement row amount.");
    }
    if (transaction.bankAccountProfile.currency !== cheque.currency) {
      throw new BadRequestException("Cheque currency must match the statement row currency.");
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

  private assertEditable(cheque: { status: ChequeInstrumentStatus }) {
    if (FINAL_CHEQUE_STATUSES.includes(cheque.status)) {
      throw new BadRequestException("Cleared, bounced, or voided cheques cannot be edited.");
    }
  }

  private parseOptionalDate(value: string | undefined, label: string) {
    if (!value) {
      return undefined;
    }
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

  private requiredText(value: string | undefined, label: string) {
    const trimmed = this.cleanOptional(value);
    if (!trimmed) {
      throw new BadRequestException(`${label} is required.`);
    }
    return trimmed;
  }

  private requiredReason(value: string | undefined, label: string) {
    return this.requiredText(value, label);
  }

  private formatMoney(value: Prisma.Decimal | string | number) {
    return toMoney(value).toFixed(4);
  }
}
