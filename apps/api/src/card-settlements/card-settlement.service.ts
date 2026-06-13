import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  CardSettlementStatus,
  CardSettlementType,
  Prisma,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CardSettlementsQueryDto, CreateCardSettlementDto, MatchCardSettlementDto, UpdateCardSettlementDto } from "./dto/card-settlement.dto";

const cardSettlementInclude = {
  fundingBankAccountProfile: {
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
  cardAccountProfile: {
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
type SettlementWithProfiles = Awaited<ReturnType<CardSettlementService["get"]>>;
type Profile = {
  id: string;
  accountId: string;
  displayName: string;
  type: BankAccountType;
  status: BankAccountStatus;
  currency: string;
  account: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
    allowPosting: boolean;
    isActive: boolean;
  };
};

@Injectable()
export class CardSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string, query: CardSettlementsQueryDto = {}) {
    return this.prisma.cardSettlement.findMany({
      where: {
        organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.settlementType ? { settlementType: query.settlementType } : {}),
        ...(query.bankAccountProfileId
          ? {
              OR: [{ fundingBankAccountProfileId: query.bankAccountProfileId }, { cardAccountProfileId: query.bankAccountProfileId }],
            }
          : {}),
      },
      orderBy: [{ settlementDate: "desc" }, { createdAt: "desc" }],
      include: cardSettlementInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const settlement = await this.prisma.cardSettlement.findFirst({
      where: { id, organizationId },
      include: cardSettlementInclude,
    });
    if (!settlement) {
      throw new NotFoundException("Card settlement not found.");
    }
    return settlement;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateCardSettlementDto) {
    const prepared = await this.prepareSettlementInput(organizationId, dto);
    const created = await this.prisma.cardSettlement.create({
      data: {
        organizationId,
        settlementType: dto.settlementType,
        fundingBankAccountProfileId: prepared.fundingProfile?.id ?? null,
        cardAccountProfileId: prepared.cardProfile.id,
        settlementDate: prepared.settlementDate,
        currency: prepared.currency,
        amount: prepared.amount.toFixed(4),
        status: CardSettlementStatus.DRAFT,
        memo: this.cleanOptional(dto.memo),
        reference: this.cleanOptional(dto.reference),
        createdById: actorUserId,
        updatedById: actorUserId,
      },
      include: cardSettlementInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CARD_SETTLEMENT_CREATED,
      entityType: AUDIT_ENTITY_TYPES.CARD_SETTLEMENT,
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateCardSettlementDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing);

    const next = {
      settlementType: dto.settlementType ?? existing.settlementType,
      fundingBankAccountProfileId:
        dto.fundingBankAccountProfileId !== undefined ? dto.fundingBankAccountProfileId : existing.fundingBankAccountProfileId ?? undefined,
      cardAccountProfileId: dto.cardAccountProfileId ?? existing.cardAccountProfileId,
      settlementDate: dto.settlementDate ?? existing.settlementDate.toISOString(),
      currency: dto.currency ?? existing.currency,
      amount: dto.amount ?? this.formatMoney(existing.amount),
      memo: dto.memo ?? existing.memo ?? undefined,
      reference: dto.reference ?? existing.reference ?? undefined,
    };
    const prepared = await this.prepareSettlementInput(organizationId, next);

    const updated = await this.prisma.cardSettlement.update({
      where: { id },
      data: {
        settlementType: next.settlementType,
        fundingBankAccountProfileId: prepared.fundingProfile?.id ?? null,
        cardAccountProfileId: prepared.cardProfile.id,
        settlementDate: prepared.settlementDate,
        currency: prepared.currency,
        amount: prepared.amount.toFixed(4),
        memo: dto.memo === undefined ? undefined : this.cleanOptional(dto.memo) ?? null,
        reference: dto.reference === undefined ? undefined : this.cleanOptional(dto.reference) ?? null,
        updatedById: actorUserId,
      },
      include: cardSettlementInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CARD_SETTLEMENT_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.CARD_SETTLEMENT,
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async post(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing);

    const posted = await this.prisma.cardSettlement.update({
      where: { id },
      data: {
        status: CardSettlementStatus.POSTED,
        postedAt: new Date(),
        updatedById: actorUserId,
      },
      include: cardSettlementInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CARD_SETTLEMENT_POSTED,
      entityType: AUDIT_ENTITY_TYPES.CARD_SETTLEMENT,
      entityId: id,
      before: existing,
      after: posted,
    });
    return posted;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === CardSettlementStatus.VOIDED) {
      return existing;
    }
    if (existing.status === CardSettlementStatus.MATCHED) {
      await this.assertStatementTransactionNotClosed(
        organizationId,
        existing.statementTransaction!.bankAccountProfileId,
        existing.statementTransaction?.transactionDate,
      );
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
      return tx.cardSettlement.update({
        where: { id },
        data: {
          status: CardSettlementStatus.VOIDED,
          statementTransactionId: null,
          voidedAt: new Date(),
          updatedById: actorUserId,
        },
        include: cardSettlementInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CARD_SETTLEMENT_VOIDED,
      entityType: AUDIT_ENTITY_TYPES.CARD_SETTLEMENT,
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async matchCandidates(organizationId: string, id: string) {
    const settlement = await this.get(organizationId, id);
    if (settlement.status !== CardSettlementStatus.POSTED) {
      return [];
    }
    const profileId = this.statementProfileId(settlement);
    const type = this.statementType(settlement.settlementType);
    const start = new Date(settlement.settlementDate);
    start.setUTCDate(start.getUTCDate() - 7);
    const end = new Date(settlement.settlementDate);
    end.setUTCDate(end.getUTCDate() + 7);

    return this.prisma.bankStatementTransaction.findMany({
      where: {
        organizationId,
        bankAccountProfileId: profileId,
        status: BankStatementTransactionStatus.UNMATCHED,
        type,
        amount: this.formatMoney(settlement.amount),
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

  async matchStatementTransaction(organizationId: string, actorUserId: string, id: string, dto: MatchCardSettlementDto) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== CardSettlementStatus.POSTED) {
      throw new BadRequestException("Only posted, unmatched card settlements can be matched to statement rows.");
    }
    const transaction = await this.prisma.bankStatementTransaction.findFirst({
      where: { id: dto.statementTransactionId, organizationId },
      include: { bankAccountProfile: { select: { id: true, currency: true } } },
    });
    if (!transaction) {
      throw new NotFoundException("Bank statement transaction not found.");
    }
    await this.assertStatementTransactionNotClosed(organizationId, transaction.bankAccountProfileId, transaction.transactionDate);
    this.assertStatementMatchesSettlement(existing, transaction);

    const matched = await this.prisma.$transaction(async (tx) => {
      const statementClaim = await tx.bankStatementTransaction.updateMany({
        where: {
          id: transaction.id,
          organizationId,
          status: BankStatementTransactionStatus.UNMATCHED,
          bankAccountProfileId: this.statementProfileId(existing),
          type: this.statementType(existing.settlementType),
          amount: this.formatMoney(existing.amount),
        },
        data: {
          status: BankStatementTransactionStatus.MATCHED,
          matchType: BankStatementMatchType.OTHER,
        },
      });
      if (statementClaim.count !== 1) {
        throw new BadRequestException("Statement transaction is no longer eligible for card settlement matching.");
      }
      return tx.cardSettlement.update({
        where: { id },
        data: {
          status: CardSettlementStatus.MATCHED,
          statementTransactionId: transaction.id,
          matchedAt: new Date(),
          updatedById: actorUserId,
        },
        include: cardSettlementInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CARD_SETTLEMENT_MATCHED,
      entityType: AUDIT_ENTITY_TYPES.CARD_SETTLEMENT,
      entityId: id,
      before: existing,
      after: matched,
    });
    return matched;
  }

  async unmatchStatementTransaction(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== CardSettlementStatus.MATCHED || !existing.statementTransactionId || !existing.statementTransaction) {
      throw new BadRequestException("Only matched card settlements can be unmatched.");
    }
    await this.assertStatementTransactionNotClosed(
      organizationId,
      existing.statementTransaction.bankAccountProfileId,
      existing.statementTransaction.transactionDate,
    );

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
      return tx.cardSettlement.update({
        where: { id },
        data: {
          status: CardSettlementStatus.POSTED,
          statementTransactionId: null,
          matchedAt: null,
          updatedById: actorUserId,
        },
        include: cardSettlementInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CARD_SETTLEMENT_UNMATCHED,
      entityType: AUDIT_ENTITY_TYPES.CARD_SETTLEMENT,
      entityId: id,
      before: existing,
      after: unmatched,
    });
    return unmatched;
  }

  private async prepareSettlementInput(
    organizationId: string,
    input: {
      settlementType: CardSettlementType;
      fundingBankAccountProfileId?: string;
      cardAccountProfileId: string;
      settlementDate: string;
      currency: string;
      amount: string;
    },
  ) {
    const amount = this.assertPositiveMoney(input.amount, "Settlement amount");
    const settlementDate = this.parseDate(input.settlementDate, "Settlement date");
    const [fundingProfile, cardProfile] = await Promise.all([
      input.fundingBankAccountProfileId
        ? this.findActiveProfile(organizationId, input.fundingBankAccountProfileId, "funding bank account")
        : Promise.resolve(null),
      this.findActiveProfile(organizationId, input.cardAccountProfileId, "card account"),
    ]);

    if (fundingProfile && fundingProfile.id === cardProfile.id) {
      throw new BadRequestException("Funding account and card account must be different.");
    }
    if (this.requiresFundingAccount(input.settlementType) && !fundingProfile) {
      throw new BadRequestException("Funding bank account is required for paydowns and prepaid top-ups.");
    }
    if (fundingProfile && fundingProfile.account.type !== AccountType.ASSET) {
      throw new BadRequestException("Funding bank account must link to an active posting asset account.");
    }
    if (!this.isSupportedCardProfile(input.settlementType, cardProfile)) {
      throw new BadRequestException("Card settlement requires an active card or wallet bank account profile.");
    }

    const currency = this.normalizeCurrency(input.currency);
    if (fundingProfile && currency !== fundingProfile.currency) {
      throw new BadRequestException("Settlement currency must match the funding bank account currency.");
    }
    if (currency !== cardProfile.currency) {
      throw new BadRequestException("Settlement currency must match the card account currency.");
    }

    return { amount, settlementDate, currency, fundingProfile, cardProfile };
  }

  private async findActiveProfile(organizationId: string, id: string, label: string): Promise<Profile> {
    const profile = await this.prisma.bankAccountProfile.findFirst({
      where: { id, organizationId },
      include: { account: { select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } } },
    });
    if (!profile) {
      throw new BadRequestException(`${label} must belong to this organization.`);
    }
    if (profile.status !== BankAccountStatus.ACTIVE) {
      throw new BadRequestException(`${label} must be active.`);
    }
    if (!profile.account.allowPosting || !profile.account.isActive) {
      throw new BadRequestException(`${label} must link to an active posting account.`);
    }
    return profile;
  }

  private isSupportedCardProfile(settlementType: CardSettlementType, profile: Profile) {
    if (settlementType === CardSettlementType.PREPAID_CARD_TOP_UP) {
      return profile.type === BankAccountType.CARD || profile.type === BankAccountType.WALLET;
    }
    return profile.type === BankAccountType.CARD;
  }

  private requiresFundingAccount(settlementType: CardSettlementType) {
    return settlementType === CardSettlementType.CREDIT_CARD_PAYDOWN || settlementType === CardSettlementType.PREPAID_CARD_TOP_UP;
  }

  private statementProfileId(settlement: SettlementWithProfiles) {
    if (settlement.settlementType === CardSettlementType.CREDIT_CARD_CREDIT) {
      return settlement.cardAccountProfileId;
    }
    if (!settlement.fundingBankAccountProfileId) {
      throw new BadRequestException("Settlement is missing its funding bank account.");
    }
    return settlement.fundingBankAccountProfileId;
  }

  private statementType(settlementType: CardSettlementType) {
    return settlementType === CardSettlementType.CREDIT_CARD_CREDIT
      ? BankStatementTransactionType.CREDIT
      : BankStatementTransactionType.DEBIT;
  }

  private assertStatementMatchesSettlement(
    settlement: SettlementWithProfiles,
    transaction: {
      bankAccountProfileId: string;
      type: BankStatementTransactionType;
      status: BankStatementTransactionStatus;
      amount: Prisma.Decimal | string;
      bankAccountProfile: { currency: string };
    },
  ) {
    if (transaction.bankAccountProfileId !== this.statementProfileId(settlement)) {
      throw new BadRequestException("Card settlement can only match statement rows from the expected funding or card account.");
    }
    if (transaction.status !== BankStatementTransactionStatus.UNMATCHED) {
      throw new BadRequestException("Card settlement can only match an unmatched statement row.");
    }
    if (transaction.type !== this.statementType(settlement.settlementType)) {
      throw new BadRequestException("Statement row direction does not match the card settlement type.");
    }
    if (!toMoney(transaction.amount).eq(settlement.amount)) {
      throw new BadRequestException("Card settlement amount must match the statement row amount.");
    }
    if (transaction.bankAccountProfile.currency !== settlement.currency) {
      throw new BadRequestException("Card settlement currency must match the statement row currency.");
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

  private assertDraft(settlement: { status: CardSettlementStatus }) {
    if (settlement.status !== CardSettlementStatus.DRAFT) {
      throw new BadRequestException("Only draft card settlements can be changed.");
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
