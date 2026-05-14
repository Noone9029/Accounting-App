import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReversalLines, getJournalTotals, JournalLineInput } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  InventoryVarianceProposalAction,
  InventoryVarianceProposalSourceType,
  InventoryVarianceProposalStatus,
  InventoryVarianceReason,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateInventoryVarianceProposalFromClearingVarianceDto,
  CreateManualInventoryVarianceProposalDto,
} from "./dto/create-inventory-variance-proposal.dto";
import { InventoryClearingReportQueryDto } from "./dto/inventory-clearing-report-query.dto";
import { InventoryVarianceProposalQueryDto } from "./dto/inventory-variance-proposal-query.dto";
import {
  ApproveInventoryVarianceProposalDto,
  ReverseInventoryVarianceProposalDto,
  SubmitInventoryVarianceProposalDto,
  VoidInventoryVarianceProposalDto,
} from "./dto/inventory-variance-proposal-workflow.dto";
import { InventoryClearingReportService } from "./inventory-clearing-report.service";

const accountSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  allowPosting: true,
  isActive: true,
} satisfies Prisma.AccountSelect;

const userSelect = { id: true, name: true, email: true } satisfies Prisma.UserSelect;
const contactSelect = { id: true, name: true, displayName: true } satisfies Prisma.ContactSelect;
const journalEntrySelect = { id: true, entryNumber: true, entryDate: true, status: true } satisfies Prisma.JournalEntrySelect;

const proposalInclude = {
  purchaseBill: { select: { id: true, billNumber: true, billDate: true, status: true, inventoryPostingMode: true, total: true, currency: true } },
  purchaseReceipt: { select: { id: true, receiptNumber: true, receiptDate: true, status: true, inventoryAssetJournalEntryId: true, inventoryAssetReversalJournalEntryId: true } },
  supplier: { select: contactSelect },
  debitAccount: { select: accountSelect },
  creditAccount: { select: accountSelect },
  createdBy: { select: userSelect },
  submittedBy: { select: userSelect },
  approvedBy: { select: userSelect },
  postedBy: { select: userSelect },
  reversedBy: { select: userSelect },
  voidedBy: { select: userSelect },
  journalEntry: { select: journalEntrySelect },
  reversalJournalEntry: { select: journalEntrySelect },
} satisfies Prisma.InventoryVarianceProposalInclude;

const eventInclude = {
  actorUser: { select: userSelect },
} satisfies Prisma.InventoryVarianceProposalEventInclude;

type PrismaExecutor = PrismaService | Prisma.TransactionClient;
type ProposalWithInclude = Prisma.InventoryVarianceProposalGetPayload<{ include: typeof proposalInclude }>;
type ClearingVarianceReport = Awaited<ReturnType<InventoryClearingReportService["clearingVarianceReport"]>>;
type ClearingVarianceRow = ClearingVarianceReport["rows"][number];
type ClearingReconciliationReport = Awaited<ReturnType<InventoryClearingReportService["clearingReconciliationReport"]>>;
type ClearingReconciliationRow = ClearingReconciliationReport["rows"][number];

@Injectable()
export class InventoryVarianceProposalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly inventoryClearingReportService: InventoryClearingReportService,
    private readonly fiscalPeriodGuardService?: FiscalPeriodGuardService,
  ) {}

  async list(organizationId: string, query: InventoryVarianceProposalQueryDto = {}) {
    const dateRange = this.dateRange(this.parseOptionalDate(query.from, "from", "start"), this.parseOptionalDate(query.to, "to", "end"));
    return this.prisma.inventoryVarianceProposal.findMany({
      where: {
        organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.sourceType ? { sourceType: query.sourceType } : {}),
        ...(query.reason ? { reason: query.reason } : {}),
        ...(query.purchaseBillId ? { purchaseBillId: query.purchaseBillId } : {}),
        ...(query.purchaseReceiptId ? { purchaseReceiptId: query.purchaseReceiptId } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(dateRange ? { proposalDate: dateRange } : {}),
      },
      orderBy: [{ proposalDate: "desc" }, { createdAt: "desc" }],
      include: proposalInclude,
    });
  }

  async get(organizationId: string, id: string) {
    return this.findProposal(organizationId, id);
  }

  async events(organizationId: string, id: string) {
    await this.findProposal(organizationId, id);
    return this.prisma.inventoryVarianceProposalEvent.findMany({
      where: { organizationId, proposalId: id },
      orderBy: { createdAt: "asc" },
      include: eventInclude,
    });
  }

  async createFromClearingVariance(
    organizationId: string,
    actorUserId: string,
    dto: CreateInventoryVarianceProposalFromClearingVarianceDto,
  ) {
    if (!dto.purchaseBillId && !dto.purchaseReceiptId) {
      throw new BadRequestException("Select a purchase bill or purchase receipt variance source.");
    }

    const reportQuery: InventoryClearingReportQueryDto = {
      ...(dto.purchaseBillId ? { purchaseBillId: dto.purchaseBillId } : {}),
      ...(dto.purchaseReceiptId ? { purchaseReceiptId: dto.purchaseReceiptId } : {}),
    };
    const [varianceReport, reconciliationReport] = await Promise.all([
      this.inventoryClearingReportService.clearingVarianceReport(organizationId, reportQuery),
      this.inventoryClearingReportService.clearingReconciliationReport(organizationId, reportQuery),
    ]);
    const varianceRow = this.findVarianceRow(varianceReport.rows, dto.purchaseBillId, dto.purchaseReceiptId);
    if (!varianceRow) {
      throw new BadRequestException("No clearing variance found for the selected source.");
    }
    const amount = this.positiveDecimal(varianceRow.varianceAmount, "Variance amount");
    const reconciliationRow = this.findReconciliationRow(reconciliationReport.rows, varianceRow, dto.purchaseBillId, dto.purchaseReceiptId);
    const netClearingDifference = reconciliationRow
      ? new Prisma.Decimal(reconciliationRow.netClearingDifference)
      : this.directionFromVarianceRow(varianceRow).mul(amount);
    const accounts = await this.accountsForClearingVarianceDirection(organizationId, netClearingDifference);
    const proposalDate = new Date();
    const description =
      this.cleanOptional(dto.description) ??
      `Inventory clearing variance for ${varianceRow.purchaseBill?.billNumber ?? varianceRow.receipt?.receiptNumber ?? "selected source"}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const proposalNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.INVENTORY_VARIANCE_PROPOSAL, tx);
      const proposal = await tx.inventoryVarianceProposal.create({
        data: {
          organizationId,
          proposalNumber,
          sourceType: InventoryVarianceProposalSourceType.CLEARING_VARIANCE,
          reason: dto.reason,
          status: InventoryVarianceProposalStatus.DRAFT,
          purchaseBillId: varianceRow.purchaseBill?.id ?? dto.purchaseBillId ?? null,
          purchaseReceiptId: varianceRow.receipt?.id ?? dto.purchaseReceiptId ?? null,
          supplierId: varianceRow.supplier?.id ?? null,
          proposalDate,
          amount: amount.toFixed(4),
          description,
          debitAccountId: accounts.debitAccount.id,
          creditAccountId: accounts.creditAccount.id,
          createdById: actorUserId,
        },
        include: proposalInclude,
      });
      await this.createEvent(tx, {
        organizationId,
        proposalId: proposal.id,
        actorUserId,
        action: InventoryVarianceProposalAction.CREATE,
        toStatus: InventoryVarianceProposalStatus.DRAFT,
        notes: description,
      });
      return proposal;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "InventoryVarianceProposal",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async createManual(organizationId: string, actorUserId: string, dto: CreateManualInventoryVarianceProposalDto) {
    const amount = this.positiveDecimal(dto.amount, "Variance proposal amount");
    const proposalDate = this.requiredDate(dto.proposalDate, "Proposal date");
    if (dto.debitAccountId === dto.creditAccountId) {
      throw new BadRequestException("Debit and credit accounts must be different.");
    }
    const [debitAccount, creditAccount] = await Promise.all([
      this.findPostingAccount(organizationId, dto.debitAccountId),
      this.findPostingAccount(organizationId, dto.creditAccountId),
    ]);

    const created = await this.prisma.$transaction(async (tx) => {
      const proposalNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.INVENTORY_VARIANCE_PROPOSAL, tx);
      const proposal = await tx.inventoryVarianceProposal.create({
        data: {
          organizationId,
          proposalNumber,
          sourceType: InventoryVarianceProposalSourceType.MANUAL,
          reason: dto.reason,
          status: InventoryVarianceProposalStatus.DRAFT,
          proposalDate,
          amount: amount.toFixed(4),
          description: this.cleanOptional(dto.description) ?? "Manual inventory variance proposal",
          debitAccountId: debitAccount.id,
          creditAccountId: creditAccount.id,
          createdById: actorUserId,
        },
        include: proposalInclude,
      });
      await this.createEvent(tx, {
        organizationId,
        proposalId: proposal.id,
        actorUserId,
        action: InventoryVarianceProposalAction.CREATE,
        toStatus: InventoryVarianceProposalStatus.DRAFT,
        notes: proposal.description,
      });
      return proposal;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "InventoryVarianceProposal",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async submit(organizationId: string, actorUserId: string, id: string, dto: SubmitInventoryVarianceProposalDto = {}) {
    const existing = await this.findProposal(organizationId, id);
    if (existing.status !== InventoryVarianceProposalStatus.DRAFT) {
      throw new BadRequestException("Only draft variance proposals can be submitted.");
    }
    const notes = this.cleanOptional(dto.notes);
    const submitted = await this.prisma.$transaction(async (tx) => {
      const current = await this.findProposalForWorkflow(organizationId, id, tx);
      if (current.status !== InventoryVarianceProposalStatus.DRAFT) {
        throw new BadRequestException("Only draft variance proposals can be submitted.");
      }
      const updated = await tx.inventoryVarianceProposal.update({
        where: { id },
        data: {
          status: InventoryVarianceProposalStatus.PENDING_APPROVAL,
          submittedById: actorUserId,
          submittedAt: new Date(),
        },
        include: proposalInclude,
      });
      await this.createEvent(tx, {
        organizationId,
        proposalId: id,
        actorUserId,
        action: InventoryVarianceProposalAction.SUBMIT,
        fromStatus: InventoryVarianceProposalStatus.DRAFT,
        toStatus: InventoryVarianceProposalStatus.PENDING_APPROVAL,
        notes,
      });
      return updated;
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "SUBMIT", entityType: "InventoryVarianceProposal", entityId: id, before: existing, after: submitted });
    return submitted;
  }

  async approve(organizationId: string, actorUserId: string, id: string, dto: ApproveInventoryVarianceProposalDto = {}) {
    const existing = await this.findProposal(organizationId, id);
    if (existing.status !== InventoryVarianceProposalStatus.PENDING_APPROVAL) {
      throw new BadRequestException("Only variance proposals pending approval can be approved.");
    }
    const approvalNotes = this.cleanOptional(dto.approvalNotes);
    const approved = await this.prisma.$transaction(async (tx) => {
      const current = await this.findProposalForWorkflow(organizationId, id, tx);
      if (current.status !== InventoryVarianceProposalStatus.PENDING_APPROVAL) {
        throw new BadRequestException("Only variance proposals pending approval can be approved.");
      }
      const updated = await tx.inventoryVarianceProposal.update({
        where: { id },
        data: {
          status: InventoryVarianceProposalStatus.APPROVED,
          approvedById: actorUserId,
          approvedAt: new Date(),
          approvalNotes,
        },
        include: proposalInclude,
      });
      await this.createEvent(tx, {
        organizationId,
        proposalId: id,
        actorUserId,
        action: InventoryVarianceProposalAction.APPROVE,
        fromStatus: InventoryVarianceProposalStatus.PENDING_APPROVAL,
        toStatus: InventoryVarianceProposalStatus.APPROVED,
        notes: approvalNotes,
      });
      return updated;
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "APPROVE", entityType: "InventoryVarianceProposal", entityId: id, before: existing, after: approved });
    return approved;
  }

  async accountingPreview(organizationId: string, id: string) {
    return this.buildAccountingPreview(organizationId, id);
  }

  async post(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findProposal(organizationId, id);
    const posted = await this.prisma.$transaction(async (tx) => {
      const proposal = await this.findProposalForWorkflow(organizationId, id, tx);
      if (proposal.status !== InventoryVarianceProposalStatus.APPROVED) {
        throw new BadRequestException("Only approved variance proposals can be posted.");
      }
      if (proposal.journalEntryId) {
        throw new BadRequestException("Variance proposal has already been posted.");
      }
      const preview = await this.buildAccountingPreview(organizationId, id, tx);
      if (!preview.canPost) {
        throw new BadRequestException(preview.blockingReasons.length > 0 ? preview.blockingReasons : "Variance proposal cannot be posted.");
      }

      await this.assertPostingDateAllowed(organizationId, proposal.proposalDate, tx);
      const postedAt = new Date();
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const journalLines = this.previewJournalToCoreLines(preview.journal.lines);
      const totals = getJournalTotals(journalLines);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: proposal.proposalDate,
          description: `Inventory variance proposal ${proposal.proposalNumber}`,
          reference: proposal.proposalNumber,
          currency: "SAR",
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt,
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });
      const claim = await tx.inventoryVarianceProposal.updateMany({
        where: { id, organizationId, status: InventoryVarianceProposalStatus.APPROVED, journalEntryId: null },
        data: {
          status: InventoryVarianceProposalStatus.POSTED,
          journalEntryId: journalEntry.id,
          postedById: actorUserId,
          postedAt,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Variance proposal has already been posted.");
      }
      await this.createEvent(tx, {
        organizationId,
        proposalId: id,
        actorUserId,
        action: InventoryVarianceProposalAction.POST,
        fromStatus: InventoryVarianceProposalStatus.APPROVED,
        toStatus: InventoryVarianceProposalStatus.POSTED,
      });
      return tx.inventoryVarianceProposal.findUniqueOrThrow({ where: { id }, include: proposalInclude });
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "POST", entityType: "InventoryVarianceProposal", entityId: id, before: existing, after: posted });
    return posted;
  }

  async reverse(organizationId: string, actorUserId: string, id: string, dto: ReverseInventoryVarianceProposalDto = {}) {
    const existing = await this.findProposal(organizationId, id);
    const reversed = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.inventoryVarianceProposal.findFirst({
        where: { id, organizationId },
        include: {
          ...proposalInclude,
          journalEntry: {
            include: {
              lines: { orderBy: { lineNumber: "asc" }, include: { account: { select: { id: true, code: true, name: true } } } },
              reversedBy: { select: { id: true, entryNumber: true } },
            },
          },
        },
      });
      if (!proposal) {
        throw new NotFoundException("Inventory variance proposal not found.");
      }
      if (proposal.status !== InventoryVarianceProposalStatus.POSTED) {
        throw new BadRequestException("Only posted variance proposals can be reversed.");
      }
      if (!proposal.journalEntryId || !proposal.journalEntry) {
        throw new BadRequestException("Variance proposal has not been posted.");
      }
      if (proposal.reversalJournalEntryId || proposal.journalEntry.reversedBy) {
        throw new BadRequestException("Variance proposal has already been reversed.");
      }
      if (proposal.journalEntry.status !== JournalEntryStatus.POSTED) {
        throw new BadRequestException("Only an active posted variance proposal journal can be reversed.");
      }

      const reversalDate = new Date();
      await this.assertPostingDateAllowed(organizationId, reversalDate, tx);
      const reason = this.cleanOptional(dto.reason);
      const reversalLines = createReversalLines(this.toCoreLines(proposal.journalEntry.lines));
      const totals = getJournalTotals(reversalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const reversalJournalEntry = await tx.journalEntry
        .create({
          data: {
            organizationId,
            entryNumber,
            status: JournalEntryStatus.POSTED,
            entryDate: reversalDate,
            description: reason
              ? `Reversal of inventory variance proposal ${proposal.proposalNumber}: ${reason}`
              : `Reversal of inventory variance proposal ${proposal.proposalNumber}`,
            reference: proposal.journalEntry.entryNumber,
            currency: proposal.journalEntry.currency,
            totalDebit: totals.debit,
            totalCredit: totals.credit,
            postedAt: reversalDate,
            postedById: actorUserId,
            createdById: actorUserId,
            reversalOfId: proposal.journalEntry.id,
            lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
          },
        })
        .catch((error: unknown) => {
          if (isUniqueConstraintError(error)) {
            throw new BadRequestException("Variance proposal has already been reversed.");
          }
          throw error;
        });

      await tx.journalEntry.update({
        where: { id: proposal.journalEntry.id },
        data: { status: JournalEntryStatus.REVERSED },
      });
      const claim = await tx.inventoryVarianceProposal.updateMany({
        where: { id, organizationId, status: InventoryVarianceProposalStatus.POSTED, reversalJournalEntryId: null },
        data: {
          status: InventoryVarianceProposalStatus.REVERSED,
          reversalJournalEntryId: reversalJournalEntry.id,
          reversedById: actorUserId,
          reversedAt: reversalDate,
          reversalReason: reason,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Variance proposal has already been reversed.");
      }
      await this.createEvent(tx, {
        organizationId,
        proposalId: id,
        actorUserId,
        action: InventoryVarianceProposalAction.REVERSE,
        fromStatus: InventoryVarianceProposalStatus.POSTED,
        toStatus: InventoryVarianceProposalStatus.REVERSED,
        notes: reason,
      });
      return tx.inventoryVarianceProposal.findUniqueOrThrow({ where: { id }, include: proposalInclude });
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "REVERSE", entityType: "InventoryVarianceProposal", entityId: id, before: existing, after: reversed });
    return reversed;
  }

  async void(organizationId: string, actorUserId: string, id: string, dto: VoidInventoryVarianceProposalDto = {}) {
    const existing = await this.findProposal(organizationId, id);
    if (existing.status === InventoryVarianceProposalStatus.POSTED) {
      throw new BadRequestException("Reverse variance proposal journal before voiding this proposal.");
    }
    if (existing.status === InventoryVarianceProposalStatus.REVERSED) {
      throw new BadRequestException("Reversed variance proposals are terminal.");
    }
    if (existing.status === InventoryVarianceProposalStatus.VOIDED) {
      throw new BadRequestException("Variance proposal is already voided.");
    }
    const reason = this.cleanOptional(dto.reason);
    const voided = await this.prisma.$transaction(async (tx) => {
      const current = await this.findProposalForWorkflow(organizationId, id, tx);
      if (current.status === InventoryVarianceProposalStatus.POSTED) {
        throw new BadRequestException("Reverse variance proposal journal before voiding this proposal.");
      }
      if (current.status === InventoryVarianceProposalStatus.REVERSED) {
        throw new BadRequestException("Reversed variance proposals are terminal.");
      }
      if (current.status === InventoryVarianceProposalStatus.VOIDED) {
        throw new BadRequestException("Variance proposal is already voided.");
      }
      const fromStatus = current.status;
      const updated = await tx.inventoryVarianceProposal.update({
        where: { id },
        data: {
          status: InventoryVarianceProposalStatus.VOIDED,
          voidedById: actorUserId,
          voidedAt: new Date(),
          voidReason: reason,
        },
        include: proposalInclude,
      });
      await this.createEvent(tx, {
        organizationId,
        proposalId: id,
        actorUserId,
        action: InventoryVarianceProposalAction.VOID,
        fromStatus,
        toStatus: InventoryVarianceProposalStatus.VOIDED,
        notes: reason,
      });
      return updated;
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "VOID", entityType: "InventoryVarianceProposal", entityId: id, before: existing, after: voided });
    return voided;
  }

  private async buildAccountingPreview(organizationId: string, id: string, executor: PrismaExecutor = this.prisma) {
    const proposal = await executor.inventoryVarianceProposal.findFirst({
      where: { id, organizationId },
      include: proposalInclude,
    });
    if (!proposal) {
      throw new NotFoundException("Inventory variance proposal not found.");
    }

    const blockingReasons: string[] = [];
    const warnings = [
      "Inventory variance journals are never auto-posted.",
      "Posting this proposal creates accounting journal entries and affects financial reports.",
      "Accountant review is required before posting.",
    ];
    if (proposal.status !== InventoryVarianceProposalStatus.APPROVED) {
      blockingReasons.push("Only approved variance proposals can be posted.");
    }
    if (proposal.journalEntryId) {
      blockingReasons.push("Variance proposal has already been posted.");
    }
    if (new Prisma.Decimal(proposal.amount).lte(0)) {
      blockingReasons.push("Variance proposal amount must be greater than zero.");
    }
    this.addAccountBlockingReasons(blockingReasons, proposal.debitAccount, "Debit");
    this.addAccountBlockingReasons(blockingReasons, proposal.creditAccount, "Credit");
    if (proposal.debitAccountId === proposal.creditAccountId) {
      blockingReasons.push("Debit and credit accounts must be different.");
    }
    await this.addFiscalBlockingReason(organizationId, proposal.proposalDate, blockingReasons, executor);

    const journalLines = this.journalPreviewLines(proposal);
    const uniqueBlockingReasons = this.uniqueStrings(blockingReasons);
    return {
      sourceType: "InventoryVarianceProposal",
      sourceId: proposal.id,
      sourceNumber: proposal.proposalNumber,
      previewOnly: true,
      status: proposal.status,
      canPost: uniqueBlockingReasons.length === 0,
      blockingReasons: uniqueBlockingReasons,
      warnings: this.uniqueStrings(warnings),
      amount: this.decimalString(new Prisma.Decimal(proposal.amount)),
      debitAccount: proposal.debitAccount,
      creditAccount: proposal.creditAccount,
      purchaseBill: proposal.purchaseBill,
      purchaseReceipt: proposal.purchaseReceipt,
      journalEntryId: proposal.journalEntryId,
      reversalJournalEntryId: proposal.reversalJournalEntryId,
      journal: {
        description: `Inventory variance proposal ${proposal.proposalNumber}`,
        entryDate: proposal.proposalDate.toISOString(),
        totalDebit: this.decimalString(new Prisma.Decimal(proposal.amount)),
        totalCredit: this.decimalString(new Prisma.Decimal(proposal.amount)),
        lines: journalLines,
      },
      journalLines,
    };
  }

  private async accountsForClearingVarianceDirection(organizationId: string, netClearingDifference: Prisma.Decimal) {
    if (netClearingDifference.eq(0)) {
      throw new BadRequestException("No clearing variance found for the selected source.");
    }
    const settings = await this.prisma.inventorySettings.findUnique({
      where: { organizationId },
      include: {
        inventoryClearingAccount: { select: accountSelect },
        inventoryAdjustmentGainAccount: { select: accountSelect },
        inventoryAdjustmentLossAccount: { select: accountSelect },
      },
    });
    if (!settings?.enableInventoryAccounting) {
      throw new BadRequestException("Inventory accounting must be enabled before creating clearing variance proposals.");
    }
    const clearingAccount = settings.inventoryClearingAccount;
    this.assertPostingAccount(clearingAccount, "Inventory clearing");
    if (netClearingDifference.gt(0)) {
      this.assertPostingAccount(settings.inventoryAdjustmentLossAccount, "Inventory adjustment loss", [AccountType.EXPENSE, AccountType.COST_OF_SALES]);
      return {
        debitAccount: settings.inventoryAdjustmentLossAccount!,
        creditAccount: clearingAccount!,
      };
    }
    this.assertPostingAccount(settings.inventoryAdjustmentGainAccount, "Inventory adjustment gain", [AccountType.REVENUE]);
    return {
      debitAccount: clearingAccount!,
      creditAccount: settings.inventoryAdjustmentGainAccount!,
    };
  }

  private findVarianceRow(rows: ClearingVarianceRow[], purchaseBillId?: string, purchaseReceiptId?: string): ClearingVarianceRow | null {
    return (
      rows.find((row) => {
        if (purchaseBillId && row.purchaseBill?.id !== purchaseBillId) {
          return false;
        }
        if (purchaseReceiptId && row.receipt?.id !== purchaseReceiptId) {
          return false;
        }
        return new Prisma.Decimal(row.varianceAmount).gt(0);
      }) ?? null
    );
  }

  private findReconciliationRow(
    rows: ClearingReconciliationRow[],
    varianceRow: ClearingVarianceRow,
    purchaseBillId?: string,
    purchaseReceiptId?: string,
  ): ClearingReconciliationRow | null {
    return (
      rows.find((row) => {
        if (purchaseBillId && row.purchaseBill?.id !== purchaseBillId) {
          return false;
        }
        if (purchaseReceiptId && !row.receipts.some((receipt) => receipt.id === purchaseReceiptId)) {
          return false;
        }
        if (!purchaseBillId && varianceRow.purchaseBill?.id && row.purchaseBill?.id !== varianceRow.purchaseBill.id) {
          return false;
        }
        if (!purchaseReceiptId && varianceRow.receipt?.id && !row.receipts.some((receipt) => receipt.id === varianceRow.receipt?.id)) {
          return false;
        }
        return true;
      }) ?? null
    );
  }

  private directionFromVarianceRow(row: ClearingVarianceRow): Prisma.Decimal {
    return row.status === "RECEIPT_WITHOUT_CLEARING_BILL" ? new Prisma.Decimal(-1) : new Prisma.Decimal(1);
  }

  private async findProposal(organizationId: string, id: string): Promise<ProposalWithInclude> {
    const proposal = await this.prisma.inventoryVarianceProposal.findFirst({ where: { id, organizationId }, include: proposalInclude });
    if (!proposal) {
      throw new NotFoundException("Inventory variance proposal not found.");
    }
    return proposal;
  }

  private async findProposalForWorkflow(organizationId: string, id: string, executor: PrismaExecutor) {
    const proposal = await executor.inventoryVarianceProposal.findFirst({
      where: { id, organizationId },
      include: proposalInclude,
    });
    if (!proposal) {
      throw new NotFoundException("Inventory variance proposal not found.");
    }
    return proposal;
  }

  private async findPostingAccount(organizationId: string, accountId: string, executor: PrismaExecutor = this.prisma) {
    const account = await executor.account.findFirst({ where: { id: accountId, organizationId }, select: accountSelect });
    this.assertPostingAccount(account, "Account");
    return account!;
  }

  private assertPostingAccount(account: Prisma.AccountGetPayload<{ select: typeof accountSelect }> | null, label: string, allowedTypes?: AccountType[]) {
    if (!account) {
      throw new BadRequestException(`${label} account must belong to this organization.`);
    }
    const reasons: string[] = [];
    this.addAccountBlockingReasons(reasons, account, label, allowedTypes);
    if (reasons.length > 0) {
      throw new BadRequestException(reasons);
    }
  }

  private addAccountBlockingReasons(
    reasons: string[],
    account: Prisma.AccountGetPayload<{ select: typeof accountSelect }> | null,
    label: string,
    allowedTypes?: AccountType[],
  ): void {
    if (!account) {
      reasons.push(`${label} account must belong to this organization.`);
      return;
    }
    if (!account.isActive) {
      reasons.push(`${label} account must be active.`);
    }
    if (!account.allowPosting) {
      reasons.push(`${label} account must allow posting.`);
    }
    if (allowedTypes && !allowedTypes.includes(account.type)) {
      reasons.push(`${label} account must be one of: ${allowedTypes.join(", ")}.`);
    }
  }

  private journalPreviewLines(proposal: ProposalWithInclude) {
    const amount = this.decimalString(new Prisma.Decimal(proposal.amount));
    return [
      {
        lineNumber: 1,
        side: "DEBIT" as const,
        accountId: proposal.debitAccountId,
        accountCode: proposal.debitAccount.code,
        accountName: proposal.debitAccount.name,
        amount,
        description: proposal.description ?? `Inventory variance proposal ${proposal.proposalNumber}`,
      },
      {
        lineNumber: 2,
        side: "CREDIT" as const,
        accountId: proposal.creditAccountId,
        accountCode: proposal.creditAccount.code,
        accountName: proposal.creditAccount.name,
        amount,
        description: proposal.description ?? `Inventory variance proposal ${proposal.proposalNumber}`,
      },
    ];
  }

  private previewJournalToCoreLines(
    lines: Array<{
      side: "DEBIT" | "CREDIT";
      accountId: string | null;
      amount: string;
      description: string;
    }>,
  ): JournalLineInput[] {
    return lines.map((line) => {
      if (!line.accountId) {
        throw new BadRequestException("Variance proposal preview journal lines require mapped posting accounts.");
      }
      return {
        accountId: line.accountId,
        debit: line.side === "DEBIT" ? line.amount : "0",
        credit: line.side === "CREDIT" ? line.amount : "0",
        description: line.description,
        currency: "SAR",
      };
    });
  }

  private toCoreLines(
    lines: Array<{ accountId: string; debit: unknown; credit: unknown; description: string | null; currency: string; exchangeRate: unknown }>,
  ): JournalLineInput[] {
    return lines.map((line) => ({
      accountId: line.accountId,
      debit: String(line.debit),
      credit: String(line.credit),
      description: line.description ?? undefined,
      currency: line.currency,
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
    }));
  }

  private toJournalLineCreateMany(organizationId: string, lines: JournalLineInput[]): Prisma.JournalLineCreateWithoutJournalEntryInput[] {
    return lines.map((line, index) => ({
      organization: { connect: { id: organizationId } },
      account: { connect: { id: line.accountId } },
      lineNumber: index + 1,
      description: line.description,
      debit: String(line.debit),
      credit: String(line.credit),
      currency: line.currency ?? "SAR",
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
    }));
  }

  private async createEvent(
    executor: Prisma.TransactionClient,
    input: {
      organizationId: string;
      proposalId: string;
      actorUserId: string;
      action: InventoryVarianceProposalAction;
      fromStatus?: InventoryVarianceProposalStatus;
      toStatus: InventoryVarianceProposalStatus;
      notes?: string | null;
    },
  ) {
    await executor.inventoryVarianceProposalEvent.create({
      data: {
        organizationId: input.organizationId,
        proposalId: input.proposalId,
        actorUserId: input.actorUserId,
        action: input.action,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        notes: this.cleanOptional(input.notes ?? undefined),
      },
    });
  }

  private async addFiscalBlockingReason(
    organizationId: string,
    postingDate: string | Date,
    blockingReasons: string[],
    executor: PrismaExecutor,
  ): Promise<void> {
    try {
      await this.assertPostingDateAllowed(organizationId, postingDate, executor);
    } catch (error) {
      blockingReasons.push(error instanceof Error ? error.message : "Posting date is not allowed.");
    }
  }

  private async assertPostingDateAllowed(organizationId: string, postingDate: string | Date, executor?: PrismaExecutor): Promise<void> {
    await this.fiscalPeriodGuardService?.assertPostingDateAllowed(organizationId, postingDate, executor);
  }

  private dateRange(fromDate: Date | null | undefined, toDate: Date | null | undefined): Prisma.DateTimeFilter | null {
    if (!fromDate && !toDate) {
      return null;
    }
    return {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  private parseOptionalDate(value: string | undefined, label: string, boundary: "start" | "end"): Date | null {
    if (!value) {
      return null;
    }
    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(value) && boundary === "start"
        ? `${value}T00:00:00.000Z`
        : /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? `${value}T23:59:59.999Z`
          : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label} date.`);
    }
    return date;
  }

  private requiredDate(value: string, label: string): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date.`);
    }
    return date;
  }

  private positiveDecimal(value: Prisma.Decimal.Value, label: string): Prisma.Decimal {
    let decimal: Prisma.Decimal;
    try {
      decimal = new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException(`${label} must be a valid decimal.`);
    }
    if (decimal.lte(0)) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
    return decimal;
  }

  private cleanOptional(value?: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private decimalString(value: Prisma.Decimal): string {
    return value.toFixed(4);
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
