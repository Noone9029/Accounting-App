import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountingRuleError,
  assertBalancedJournal,
  assertDraftEditable,
  createReversalLines,
  getJournalTotals,
  JournalLineInput,
} from "@ledgerbyte/accounting-core";
import { JournalEntryStatus, NumberSequenceScope, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJournalEntryDto } from "./dto/create-journal-entry.dto";
import { JournalLineDto } from "./dto/journal-line.dto";
import { UpdateJournalEntryDto } from "./dto/update-journal-entry.dto";

const journalInclude = {
  lines: {
    orderBy: { lineNumber: "asc" as const },
    include: {
      account: { select: { id: true, code: true, name: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
  reversedBy: { select: { id: true, entryNumber: true } },
  reversalOf: { select: { id: true, entryNumber: true } },
};

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  list(organizationId: string) {
    return this.prisma.journalEntry.findMany({
      where: { organizationId },
      orderBy: { entryDate: "desc" },
      include: {
        lines: {
          select: {
            id: true,
            accountId: true,
            debit: true,
            credit: true,
            currency: true,
          },
        },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: journalInclude,
    });

    if (!entry) {
      throw new NotFoundException("Journal entry not found.");
    }

    return entry;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateJournalEntryDto) {
    this.assertBalanced(dto.lines);
    await this.validateLineReferences(organizationId, dto.lines);
    const totals = getJournalTotals(dto.lines);

    const entry = await this.prisma.$transaction(async (tx) => {
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);

      return tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          entryDate: new Date(dto.entryDate),
          description: dto.description.trim(),
          reference: dto.reference?.trim(),
          currency: dto.currency ?? "SAR",
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          createdById: actorUserId,
          lines: {
            create: this.toLineCreateMany(organizationId, dto.lines),
          },
        },
        include: journalInclude,
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "JournalEntry", entityId: entry.id, after: entry });
    return entry;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateJournalEntryDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    const nextLines = dto.lines ?? this.toCoreLines(existing.lines);
    this.assertBalanced(nextLines);
    await this.validateLineReferences(organizationId, nextLines);
    const totals = getJournalTotals(nextLines);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.journalLine.deleteMany({ where: { journalEntryId: id, organizationId } });
      }

      return tx.journalEntry.update({
        where: { id },
        data: {
          entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
          description: dto.description?.trim(),
          reference: dto.reference?.trim(),
          currency: dto.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          lines: dto.lines
            ? {
                create: this.toLineCreateMany(organizationId, dto.lines),
              }
            : undefined,
        },
        include: journalInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "JournalEntry",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async post(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);
    const lines = this.toCoreLines(existing.lines);
    this.assertBalanced(lines);
    const totals = getJournalTotals(lines);

    const posted = await this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.POSTED,
        postedAt: new Date(),
        postedById: actorUserId,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
      },
      include: journalInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "POST",
      entityType: "JournalEntry",
      entityId: id,
      before: existing,
      after: posted,
    });
    return posted;
  }

  async reverse(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.reversedBy) {
      throw new BadRequestException("Journal entry has already been reversed.");
    }

    if (existing.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException("Only posted journal entries can be reversed.");
    }

    const reversal = await this.prisma.$transaction(async (tx) => {
      const current = await tx.journalEntry.findFirst({
        where: { id, organizationId },
        include: journalInclude,
      });
      if (!current) {
        throw new NotFoundException("Journal entry not found.");
      }
      if (current.reversedBy) {
        throw new BadRequestException("Journal entry has already been reversed.");
      }
      if (current.status !== JournalEntryStatus.POSTED) {
        throw new BadRequestException("Only posted journal entries can be reversed.");
      }

      const reversalLines = createReversalLines(this.toCoreLines(current.lines));
      this.assertBalanced(reversalLines);
      const totals = getJournalTotals(reversalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);

      try {
        const created = await tx.journalEntry.create({
          data: {
            organizationId,
            entryNumber,
            status: JournalEntryStatus.POSTED,
            entryDate: new Date(),
            description: `Reversal of ${current.entryNumber}: ${current.description}`,
            reference: current.entryNumber,
            currency: current.currency,
            totalDebit: totals.debit,
            totalCredit: totals.credit,
            postedAt: new Date(),
            postedById: actorUserId,
            createdById: actorUserId,
            reversalOfId: current.id,
            lines: {
              create: this.toLineCreateMany(organizationId, reversalLines),
            },
          },
          include: journalInclude,
        });

        await tx.journalEntry.update({
          where: { id: current.id },
          data: { status: JournalEntryStatus.REVERSED },
        });

        return created;
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new BadRequestException("Journal entry has already been reversed.");
        }
        throw error;
      }
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REVERSE",
      entityType: "JournalEntry",
      entityId: id,
      before: existing,
      after: reversal,
    });
    return reversal;
  }

  private assertBalanced(lines: JournalLineInput[]): void {
    try {
      assertBalancedJournal(lines);
    } catch (error) {
      this.throwAccountingError(error);
    }
  }

  private assertDraft(status: JournalEntryStatus): void {
    try {
      assertDraftEditable(status);
    } catch (error) {
      this.throwAccountingError(error);
    }
  }

  private throwAccountingError(error: unknown): never {
    if (error instanceof AccountingRuleError) {
      throw new BadRequestException({ code: error.code, message: error.message });
    }
    throw error;
  }

  private async validateLineReferences(organizationId: string, lines: JournalLineInput[]): Promise<void> {
    const accountIds = [...new Set(lines.map((line) => line.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        id: { in: accountIds },
        isActive: true,
        allowPosting: true,
      },
      select: { id: true },
    });

    if (accounts.length !== accountIds.length) {
      throw new BadRequestException("One or more accounts do not exist, are inactive, or do not allow posting.");
    }

    const taxRateIds = [...new Set(lines.map((line) => line.taxRateId).filter((value): value is string => Boolean(value)))];
    if (taxRateIds.length === 0) {
      return;
    }

    const taxRates = await this.prisma.taxRate.findMany({
      where: {
        organizationId,
        id: { in: taxRateIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (taxRates.length !== taxRateIds.length) {
      throw new BadRequestException("One or more tax rates do not exist in this organization.");
    }
  }

  private toLineCreateMany(organizationId: string, lines: JournalLineInput[]): Prisma.JournalLineCreateWithoutJournalEntryInput[] {
    return lines.map((line, index) => ({
      organization: { connect: { id: organizationId } },
      account: { connect: { id: line.accountId } },
      taxRate: line.taxRateId ? { connect: { id: line.taxRateId } } : undefined,
      lineNumber: index + 1,
      description: line.description,
      debit: String(line.debit),
      credit: String(line.credit),
      currency: line.currency,
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
    }));
  }

  private toCoreLines(lines: Array<JournalLineDto | { accountId: string; debit: unknown; credit: unknown; description: string | null; currency: string; exchangeRate: unknown; taxRateId: string | null }>): JournalLineInput[] {
    return lines.map((line) => ({
      accountId: line.accountId,
      debit: String(line.debit),
      credit: String(line.credit),
      description: line.description ?? undefined,
      currency: line.currency,
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
      taxRateId: line.taxRateId ?? null,
    }));
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
