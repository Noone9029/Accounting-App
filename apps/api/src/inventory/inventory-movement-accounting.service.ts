import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountType, JournalEntryStatus, NumberSequenceScope, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { resolveOrganizationBaseCurrency } from "../foreign-exchange/base-currency-posting-guard.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { lockInventory } from "./valued-stock-movement";
import { PostInventoryMovementDto } from "./dto/post-inventory-movement.dto";
import { pendingIssueReview, pendingReceiptReview } from "./inventory-pending-review";

const reviewableTypes = [StockMovementType.OPENING_BALANCE, StockMovementType.ADJUSTMENT_IN, StockMovementType.ADJUSTMENT_OUT, StockMovementType.SALES_RETURN_IN, StockMovementType.PURCHASE_RETURN_OUT];
const dedicatedReversals = ["PurchaseReceiptVoid", "SalesStockIssueVoid"];
const journalInclude = { lines: { orderBy: { lineNumber: "asc" as const } } };

@Injectable()
export class InventoryMovementAccountingService {
  constructor(private readonly prisma: PrismaService, private readonly numbers: NumberSequenceService, private readonly fiscal: FiscalPeriodGuardService) {}

  pending(organizationId: string, executor: PrismaService | Prisma.TransactionClient = this.prisma) {
    return executor.stockMovement.findMany({ where: {
      organizationId, valuationVersion: 1, type: { in: reviewableTypes }, inventoryMovementPosting: null,
      OR: [{ referenceType: null }, { referenceType: { notIn: dedicatedReversals } }],
    }, include: { item: { select: { id: true, name: true } }, warehouse: { select: { id: true, name: true } } }, orderBy: [{ movementDate: "asc" }, { createdAt: "asc" }] });
  }

  async preview(organizationId: string, movementId: string, dto: PostInventoryMovementDto = {}) {
    return this.plan(this.prisma, organizationId, movementId, dto);
  }

  async reconciliation(organizationId: string) {
    return this.prisma.$transaction(async (tx) => {
    const settings = await tx.inventorySettings.findUnique({ where: { organizationId } });
    const [balances, legacyMovements, pendingMovements, pendingReceipts, pendingIssues, ledger] = await Promise.all([
      tx.inventoryValuationBalance.aggregate({ where: { organizationId }, _sum: { value: true } }),
      tx.stockMovement.count({ where: { organizationId, OR: [{ valuationVersion: null }, { valuationVersion: { not: 1 } }] } }),
      this.pending(organizationId, tx),
      tx.purchaseReceipt.count({ where: { organizationId, status: "POSTED", ...pendingReceiptReview } }),
      tx.salesStockIssue.count({ where: { organizationId, status: "POSTED", ...pendingIssueReview } }),
      settings?.inventoryAssetAccountId ? tx.journalLine.aggregate({ where: { organizationId, accountId: settings.inventoryAssetAccountId,
        journalEntry: { organizationId, status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] } } }, _sum: { debit: true, credit: true } }) : null,
    ]);
    const stockValue = balances._sum.value ?? new Prisma.Decimal(0);
    const assetBalance = new Prisma.Decimal(ledger?._sum.debit ?? 0).minus(ledger?._sum.credit ?? 0);
    const difference = stockValue.minus(assetBalance);
    return { subledgerValue: stockValue.toFixed(4), inventoryAssetBalance: assetBalance.toFixed(4), difference: difference.toFixed(4),
      legacyMovements, pendingMovementReviews: pendingMovements.length, pendingReceipts, pendingIssues,
      reconciled: Boolean(settings?.inventoryAssetAccountId) && legacyMovements === 0 && pendingMovements.length === 0 && pendingReceipts === 0 && pendingIssues === 0 && difference.eq(0),
      manualReviewRequired: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async post(organizationId: string, actorUserId: string, movementId: string, dto: PostInventoryMovementDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockInventory(tx, organizationId);
      const existing = await tx.inventoryMovementPosting.findFirst({ where: { organizationId, movementId } });
      if (existing) return existing;
      const plan = await this.plan(tx, organizationId, movementId, dto);
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "FiscalPeriod" WHERE "organizationId" = ${organizationId}::uuid FOR SHARE`);
      await this.fiscal.assertPostingDateAllowed(organizationId, plan.movementDate, tx);
      let journalEntryId: string | null = null;
      if (new Prisma.Decimal(plan.amount).gt(0)) {
        const entryNumber = await this.numbers.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
        const journal = await tx.journalEntry.create({ data: {
          organizationId, entryNumber, status: JournalEntryStatus.POSTED, entryDate: plan.movementDate,
          description: `Reviewed inventory movement ${movementId}`, reference: movementId,
          currency: plan.currency, totalDebit: plan.amount, totalCredit: plan.amount,
          postedAt: new Date(), postedById: actorUserId, createdById: actorUserId,
          lines: { create: plan.lines.map((line, index) => ({ organizationId, accountId: line.accountId, lineNumber: index + 1,
            debit: line.side === "DEBIT" ? line.amount : "0", credit: line.side === "CREDIT" ? line.amount : "0", currency: plan.currency, exchangeRate: "1" })) },
        } });
        journalEntryId = journal.id;
      }
      const posting = await tx.inventoryMovementPosting.create({ data: { organizationId, movementId, journalEntryId, reviewedById: actorUserId } });
      await tx.auditLog.create({ data: { organizationId, actorUserId, action: "POST_INVENTORY_MOVEMENT", entityType: "StockMovement", entityId: movementId, after: { postingId: posting.id, journalEntryId, amount: plan.amount } } });
      return posting;
    });
  }

  private async plan(tx: PrismaService | Prisma.TransactionClient, organizationId: string, movementId: string, dto: PostInventoryMovementDto) {
    const movement = await tx.stockMovement.findFirst({ where: { id: movementId, organizationId } });
    if (!movement) throw new NotFoundException("Inventory movement not found.");
    if (movement.valuationVersion !== 1 || movement.totalCost === null) throw new BadRequestException("Inventory valuation cutover is required before financial posting.");
    if (!reviewableTypes.includes(movement.type as typeof reviewableTypes[number]) || dedicatedReversals.includes(movement.referenceType ?? "")) throw new BadRequestException("Use the linked receipt or stock issue accounting workflow for this movement.");
    const settings = await tx.inventorySettings.findUnique({ where: { organizationId } });
    if (!settings?.enableInventoryAccounting || !settings.inventoryAssetAccountId) throw new BadRequestException("Enable reviewed inventory accounting and configure the inventory asset account first.");
    let assetAccountId = settings.inventoryAssetAccountId;
    let offsetAccountId: string | null | undefined;
    let currency = await resolveOrganizationBaseCurrency(organizationId, tx);
    if (movement.type === StockMovementType.SALES_RETURN_IN || movement.type === StockMovementType.PURCHASE_RETURN_OUT) {
      if (!movement.valuationSourceMovementId) throw new BadRequestException("Returns require an original valued source movement.");
      const salesSource = movement.type === StockMovementType.SALES_RETURN_IN
        ? await tx.salesStockIssueLine.findFirst({ where: { organizationId, stockMovementId: movement.valuationSourceMovementId }, include: { stockMovement: true, issue: { include: { cogsJournalEntry: { include: journalInclude } } } } }) : null;
      const purchaseSource = movement.type === StockMovementType.PURCHASE_RETURN_OUT
        ? await tx.purchaseReceiptLine.findFirst({ where: { organizationId, stockMovementId: movement.valuationSourceMovementId }, include: { stockMovement: true, receipt: { include: { inventoryAssetJournalEntry: { include: journalInclude } } } } }) : null;
      const journal = salesSource?.issue.cogsJournalEntry ?? purchaseSource?.receipt.inventoryAssetJournalEntry;
      const sourceMovement = salesSource?.stockMovement ?? purchaseSource?.stockMovement;
      const reviewedZeroSource = sourceMovement?.valuationVersion === 1 && sourceMovement.totalCost?.eq(0) && (
        salesSource ? salesSource.issue.status === "POSTED" && salesSource.issue.cogsPostedAt && salesSource.issue.cogsPostedById && !salesSource.issue.cogsReversalJournalEntryId
          : purchaseSource?.receipt.status === "POSTED" && purchaseSource.receipt.inventoryAssetPostedAt && purchaseSource.receipt.inventoryAssetPostedById && !purchaseSource.receipt.inventoryAssetReversalJournalEntryId
      );
      if (!journal && reviewedZeroSource) {
        const incompleteSource = salesSource
          ? await tx.salesStockIssue.count({ where: { organizationId, id: salesSource.issue.id, ...pendingIssueReview } })
          : await tx.purchaseReceipt.count({ where: { organizationId, id: purchaseSource!.receipt.id, ...pendingReceiptReview } });
        if (incompleteSource !== 0) throw new BadRequestException("The original zero-cost inventory review requires accountant reconciliation.");
        // No historical financial mapping exists for a zero-cost source. Current
        // mappings are used only for any carrying-value variance on a supplier return.
        if (movement.type === StockMovementType.SALES_RETURN_IN && !movement.totalCost.eq(0)) throw new BadRequestException("A return of zero-cost issued goods must retain its original zero cost.");
        if (movement.type === StockMovementType.PURCHASE_RETURN_OUT && !movement.valuationSourceValue?.eq(0)) throw new BadRequestException("A return of zero-cost received goods must retain its original zero source cost.");
        offsetAccountId = movement.type === StockMovementType.SALES_RETURN_IN ? settings.cogsAccountId : settings.inventoryClearingAccountId;
      } else {
        if (!journal || journal.status !== JournalEntryStatus.POSTED || journal.lines.length !== 2) throw new BadRequestException("Post the original active receipt asset or issue COGS journal before reviewing the return.");
        const originalAsset = journal.lines.find((line) => movement.type === StockMovementType.SALES_RETURN_IN ? line.credit.gt(0) : line.debit.gt(0));
        const originalOffset = journal.lines.find((line) => movement.type === StockMovementType.SALES_RETURN_IN ? line.debit.gt(0) : line.credit.gt(0));
        if (!originalAsset || !originalOffset) throw new BadRequestException("Original inventory journal debit and credit mappings require accountant review.");
        assetAccountId = originalAsset.accountId;
        offsetAccountId = originalOffset.accountId;
        currency = journal.currency;
      }
    } else if (movement.referenceType === "InventoryAdjustmentVoid" && movement.valuationSourceMovementId) {
      const original = await tx.inventoryMovementPosting.findFirst({ where: { organizationId, movementId: movement.valuationSourceMovementId }, include: { journalEntry: { include: journalInclude } } });
      if (!original) throw new BadRequestException("Review the original adjustment before posting its correction.");
      const journal = original.journalEntry;
      if (journal && (journal.status !== JournalEntryStatus.POSTED || journal.lines.length !== 2)) throw new BadRequestException("The original adjustment journal requires accountant reconciliation.");
      const originalAsset = journal?.lines.find((line) => stockMovementDirection(movement.type) === "IN" ? line.credit.gt(0) : line.debit.gt(0));
      const originalOffset = journal?.lines.find((line) => stockMovementDirection(movement.type) === "IN" ? line.debit.gt(0) : line.credit.gt(0));
      assetAccountId = originalAsset?.accountId ?? assetAccountId;
      offsetAccountId = originalOffset?.accountId ?? (stockMovementDirection(movement.type) === "IN" ? settings.inventoryAdjustmentLossAccountId : settings.inventoryAdjustmentGainAccountId);
    } else if (movement.type === StockMovementType.OPENING_BALANCE) {
      offsetAccountId = dto.openingEquityAccountId;
      const equity = offsetAccountId && await tx.account.findFirst({ where: { id: offsetAccountId, organizationId, type: AccountType.EQUITY } });
      if (!equity) throw new BadRequestException("Select the accountant-reviewed opening equity account.");
    } else {
      offsetAccountId = stockMovementDirection(movement.type) === "IN" ? settings.inventoryAdjustmentGainAccountId : settings.inventoryAdjustmentLossAccountId;
    }
    if (!offsetAccountId || offsetAccountId === assetAccountId) throw new BadRequestException("Separate mapped inventory asset and offset posting accounts are required.");
    const accounts = await tx.account.count({ where: { organizationId, id: { in: [assetAccountId, offsetAccountId] }, isActive: true, allowPosting: true } });
    if (accounts !== 2) throw new BadRequestException("Inventory posting accounts must be active and belong to this organization.");
    const incoming = stockMovementDirection(movement.type) === "IN";
    const debitAccountId = incoming ? assetAccountId : offsetAccountId;
    const creditAccountId = incoming ? offsetAccountId : assetAccountId;
    const carryingValue = movement.totalCost;
    const sourceValue = movement.type === StockMovementType.PURCHASE_RETURN_OUT ? movement.valuationSourceValue : null;
    if (movement.type === StockMovementType.PURCHASE_RETURN_OUT && sourceValue === null) throw new BadRequestException("Original purchase receipt cost is required before reviewing the return.");
    const lines: Array<{ accountId: string; side: "DEBIT" | "CREDIT"; amount: string }> = [
      { accountId: debitAccountId, side: "DEBIT", amount: (sourceValue ?? carryingValue).toFixed(4) },
      { accountId: creditAccountId, side: "CREDIT", amount: carryingValue.toFixed(4) },
    ];
    const variance = sourceValue === null ? new Prisma.Decimal(0) : sourceValue.minus(carryingValue);
    if (!variance.eq(0)) {
      const varianceAccountId = variance.gt(0) ? settings.inventoryAdjustmentGainAccountId : settings.inventoryAdjustmentLossAccountId;
      const varianceAccount = varianceAccountId && await tx.account.findFirst({ where: { id: varianceAccountId, organizationId, isActive: true, allowPosting: true,
        type: { in: variance.gt(0) ? [AccountType.REVENUE] : [AccountType.EXPENSE, AccountType.COST_OF_SALES] } } });
      if (!varianceAccount || varianceAccount.id === assetAccountId || varianceAccount.id === offsetAccountId) throw new BadRequestException("The original receipt cost differs from carrying value. Configure a separate reviewed inventory gain/loss account before posting this variance.");
      lines.push({ accountId: varianceAccount.id, side: variance.gt(0) ? "CREDIT" : "DEBIT", amount: variance.abs().toFixed(4) });
    }
    const nonzeroLines = lines.filter((line) => new Prisma.Decimal(line.amount).gt(0));
    const amount = lines.filter((line) => line.side === "DEBIT").reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    return { movementId, movementDate: movement.movementDate, amount: amount.toFixed(4), currency, debitAccountId, creditAccountId,
      inventoryCarryingCost: carryingValue.toFixed(4), originalSourceCost: sourceValue?.toFixed(4) ?? carryingValue.toFixed(4),
      purchaseReturnVariance: variance.toFixed(4), lines: nonzeroLines, manualReviewRequired: true };
  }
}
