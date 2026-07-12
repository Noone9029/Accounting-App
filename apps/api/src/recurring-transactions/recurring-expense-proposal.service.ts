import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { CurrencyRateSource, Prisma, RecurringExpenseProposalStatus } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { CashExpenseService } from "../cash-expenses/cash-expense.service";
import { PrismaService } from "../prisma/prisma.service";

const proposalInclude = {
  lines: { orderBy: { sortOrder: "asc" as const } },
  reviewedCashExpense: { select: { id: true, expenseNumber: true, status: true } },
} satisfies Prisma.RecurringExpenseProposalInclude;

@Injectable()
export class RecurringExpenseProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashExpenses: CashExpenseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async review(
    organizationId: string,
    actorUserId: string,
    proposalId: string,
    idempotencyKey: string,
  ) {
    const key = this.idempotencyKey(idempotencyKey);
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "RecurringExpenseProposal"
        WHERE "organizationId" = ${organizationId}::uuid
          AND "id" = ${proposalId}::uuid
        FOR UPDATE
      `);
      if (locked.length !== 1) throw new NotFoundException("Recurring expense proposal not found.");

      const proposal = await tx.recurringExpenseProposal.findFirst({
        where: { id: proposalId, organizationId },
        include: proposalInclude,
      });
      if (!proposal) throw new NotFoundException("Recurring expense proposal not found.");
      if (proposal.status === RecurringExpenseProposalStatus.REVIEWED) {
        if (proposal.reviewIdempotencyKey === key && proposal.reviewedCashExpenseId) return proposal;
        throw new ConflictException("Recurring expense proposal was already reviewed with another idempotency key.");
      }
      if (proposal.status !== RecurringExpenseProposalStatus.DRAFT) {
        throw new BadRequestException("Only draft recurring expense proposals can be reviewed.");
      }

      const expense = await this.cashExpenses.createPostedInTransaction(
        organizationId,
        actorUserId,
        {
          contactId: proposal.contactId ?? undefined,
          branchId: proposal.branchId ?? undefined,
          expenseDate: this.dateText(proposal.proposedDate),
          description: proposal.description ?? undefined,
          notes: proposal.notes ?? undefined,
          paidThroughAccountId: proposal.paidThroughAccountId,
          ...this.fxInput(proposal),
          lines: proposal.lines.map((line) => ({
            itemId: line.itemId ?? undefined,
            accountId: line.accountId,
            taxRateId: line.taxRateId ?? undefined,
            costCenterId: line.costCenterId ?? undefined,
            projectId: line.projectId ?? undefined,
            description: line.description,
            quantity: String(line.quantity),
            unitPrice: String(line.unitPrice),
            discountRate: String(line.discountRate),
            sortOrder: line.sortOrder,
          })),
        },
        tx,
      );

      const reviewed = await tx.recurringExpenseProposal.update({
        where: { id: proposal.id },
        data: {
          status: RecurringExpenseProposalStatus.REVIEWED,
          reviewIdempotencyKey: key,
          reviewedCashExpenseId: expense.id,
          reviewedByUserId: actorUserId,
          reviewedAt: new Date(),
        },
        include: proposalInclude,
      });
      await this.auditLog.log({
        organizationId,
        actorUserId,
        action: "REVIEW",
        entityType: AUDIT_ENTITY_TYPES.RECURRING_EXPENSE_PROPOSAL,
        entityId: proposal.id,
        before: { status: proposal.status, reviewedCashExpenseId: proposal.reviewedCashExpenseId },
        after: { status: reviewed.status, reviewedCashExpenseId: reviewed.reviewedCashExpenseId, idempotencyKey: key },
      }, tx);
      return reviewed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private fxInput(proposal: {
    currency: string;
    baseCurrency: string;
    exchangeRate: unknown | null;
    rateDate: Date | null;
    rateSource: CurrencyRateSource | null;
    rateSnapshotId: string | null;
  }) {
    if (proposal.currency === proposal.baseCurrency) return { currency: proposal.currency };
    if (proposal.rateSnapshotId) return { currency: proposal.currency, rateSnapshotId: proposal.rateSnapshotId };
    if (!proposal.exchangeRate || !proposal.rateDate || !proposal.rateSource) {
      throw new BadRequestException("Recurring expense proposal is missing complete FX evidence.");
    }
    return {
      currency: proposal.currency,
      exchangeRate: String(proposal.exchangeRate),
      rateDate: this.dateText(proposal.rateDate),
      rateSource: proposal.rateSource,
    };
  }

  private idempotencyKey(value: string): string {
    const key = value?.trim();
    if (!key || key.length > 200) throw new BadRequestException("Idempotency key is required and must be 200 characters or fewer.");
    return key;
  }

  private dateText(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
