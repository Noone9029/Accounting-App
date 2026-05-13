import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReversalLines, getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  BankAccountStatus,
  BankTransferStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBankTransferDto } from "./dto/create-bank-transfer.dto";

const bankTransferInclude = {
  fromBankAccountProfile: {
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
  toBankAccountProfile: {
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
  fromAccount: { select: { id: true, code: true, name: true, type: true } },
  toAccount: { select: { id: true, code: true, name: true, type: true } },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
      totalDebit: true,
      totalCredit: true,
      reversedBy: { select: { id: true, entryNumber: true } },
    },
  },
  voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type BankTransferProfile = {
  id: string;
  accountId: string;
  displayName: string;
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
export class BankTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly fiscalPeriodGuardService: FiscalPeriodGuardService,
  ) {}

  list(organizationId: string) {
    return this.prisma.bankTransfer.findMany({
      where: { organizationId },
      orderBy: { transferDate: "desc" },
      include: bankTransferInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const transfer = await this.prisma.bankTransfer.findFirst({
      where: { id, organizationId },
      include: bankTransferInclude,
    });
    if (!transfer) {
      throw new NotFoundException("Bank transfer not found.");
    }
    return transfer;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateBankTransferDto) {
    const amount = this.assertPositiveMoney(dto.amount, "Transfer amount");
    if (dto.fromBankAccountProfileId === dto.toBankAccountProfileId) {
      throw new BadRequestException("Transfer source and destination must be different bank accounts.");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const transferDate = this.parseDate(dto.transferDate, "Transfer date");
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, transferDate, tx);
      const [fromProfile, toProfile] = await Promise.all([
        this.findActiveTransferProfile(organizationId, dto.fromBankAccountProfileId, "source", tx),
        this.findActiveTransferProfile(organizationId, dto.toBankAccountProfileId, "destination", tx),
      ]);

      const currency = (dto.currency ?? fromProfile.currency).trim().toUpperCase();
      if (currency !== fromProfile.currency || currency !== toProfile.currency) {
        throw new BadRequestException("Transfer currency must match both bank account profile currencies.");
      }

      const transferNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.BANK_TRANSFER, tx);
      const journalLines = buildBankTransferJournalLines({
        fromAccountId: fromProfile.accountId,
        toAccountId: toProfile.accountId,
        fromDisplayName: fromProfile.displayName,
        toDisplayName: toProfile.displayName,
        transferNumber,
        amount: amount.toFixed(4),
        currency,
      });
      const totals = getJournalTotals(journalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const postedAt = new Date();
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: transferDate,
          description: `Bank transfer ${transferNumber} - ${fromProfile.displayName} to ${toProfile.displayName}`,
          reference: transferNumber,
          currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt,
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      const transfer = await tx.bankTransfer.create({
        data: {
          organizationId,
          transferNumber,
          fromBankAccountProfileId: fromProfile.id,
          toBankAccountProfileId: toProfile.id,
          fromAccountId: fromProfile.accountId,
          toAccountId: toProfile.accountId,
          transferDate,
          currency,
          amount: amount.toFixed(4),
          description: this.cleanOptional(dto.description),
          journalEntryId: journalEntry.id,
          createdById: actorUserId,
          postedAt,
        },
        select: { id: true },
      });

      return tx.bankTransfer.findUniqueOrThrow({ where: { id: transfer.id }, include: bankTransferInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "BankTransfer",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === BankTransferStatus.VOIDED) {
      return existing;
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.bankTransfer.findFirst({
        where: { id, organizationId },
        include: { journalEntry: { select: { id: true } } },
      });
      if (!transfer) {
        throw new NotFoundException("Bank transfer not found.");
      }
      if (transfer.status === BankTransferStatus.VOIDED) {
        return tx.bankTransfer.findUniqueOrThrow({ where: { id }, include: bankTransferInclude });
      }
      if (!transfer.journalEntryId) {
        throw new BadRequestException("Posted bank transfer is missing its journal entry.");
      }

      const reversalDate = new Date();
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, reversalDate, tx);
      const claim = await tx.bankTransfer.updateMany({
        where: { id, organizationId, status: BankTransferStatus.POSTED },
        data: { status: BankTransferStatus.VOIDED, voidedAt: reversalDate },
      });
      if (claim.count !== 1) {
        return tx.bankTransfer.findUniqueOrThrow({ where: { id }, include: bankTransferInclude });
      }

      const reversalJournalEntryId = await this.createOrReuseReversalJournal(
        organizationId,
        actorUserId,
        transfer.journalEntryId,
        reversalDate,
        tx,
      );
      return tx.bankTransfer.update({
        where: { id },
        data: { voidReversalJournalEntryId: reversalJournalEntryId },
        include: bankTransferInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "BankTransfer",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  private async findActiveTransferProfile(
    organizationId: string,
    profileId: string,
    label: "source" | "destination",
    tx: Prisma.TransactionClient,
  ): Promise<BankTransferProfile> {
    const profile = await tx.bankAccountProfile.findFirst({
      where: { id: profileId, organizationId },
      select: {
        id: true,
        accountId: true,
        displayName: true,
        status: true,
        currency: true,
        account: { select: { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } },
      },
    });
    if (!profile) {
      throw new BadRequestException(`Transfer ${label} bank account must belong to this organization.`);
    }
    if (profile.status !== BankAccountStatus.ACTIVE) {
      throw new BadRequestException(`Transfer ${label} bank account must be active.`);
    }
    if (profile.account.type !== AccountType.ASSET || !profile.account.allowPosting || !profile.account.isActive) {
      throw new BadRequestException(`Transfer ${label} linked account must be an active posting asset account.`);
    }
    return profile;
  }

  private async createOrReuseReversalJournal(
    organizationId: string,
    actorUserId: string,
    journalEntryId: string,
    reversalDate: Date,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const journalEntry = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: {
        lines: { orderBy: { createdAt: "asc" } },
        reversedBy: { select: { id: true } },
      },
    });
    if (!journalEntry) {
      throw new NotFoundException("Journal entry not found.");
    }
    if (journalEntry.reversedBy) {
      return journalEntry.reversedBy.id;
    }

    const reversalLines = createReversalLines(
      journalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        description: `Reversal: ${line.description ?? journalEntry.description ?? ""}`.trim(),
        currency: line.currency,
        exchangeRate: String(line.exchangeRate),
        taxRateId: line.taxRateId,
      })),
    );
    const totals = getJournalTotals(reversalLines);
    const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);

    try {
      const reversal = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: reversalDate,
          description: `Reversal of ${journalEntry.entryNumber}`,
          reference: journalEntry.reference,
          currency: journalEntry.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: reversalDate,
          postedById: actorUserId,
          createdById: actorUserId,
          reversalOfId: journalEntry.id,
          lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
        },
      });
      await tx.journalEntry.update({
        where: { id: journalEntry.id },
        data: { status: JournalEntryStatus.REVERSED },
      });
      return reversal.id;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      throw new BadRequestException("Journal entry has already been reversed.");
    }
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

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }
}

function buildBankTransferJournalLines(input: {
  fromAccountId: string;
  toAccountId: string;
  fromDisplayName: string;
  toDisplayName: string;
  transferNumber: string;
  amount: string;
  currency: string;
}): JournalLineInput[] {
  return [
    {
      accountId: input.toAccountId,
      debit: input.amount,
      credit: "0.0000",
      description: `Bank transfer ${input.transferNumber} received into ${input.toDisplayName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
    {
      accountId: input.fromAccountId,
      debit: "0.0000",
      credit: input.amount,
      description: `Bank transfer ${input.transferNumber} sent from ${input.fromDisplayName}`,
      currency: input.currency,
      exchangeRate: "1",
    },
  ];
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
