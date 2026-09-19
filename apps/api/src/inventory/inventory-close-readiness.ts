import { BadRequestException } from "@nestjs/common";
import { JournalEntryStatus, Prisma, StockMovementType } from "@prisma/client";
import { pendingIssueReview, pendingReceiptReview } from "./inventory-pending-review";

/** Caller holds the tenant inventory lock through the fiscal close/lock transaction. */
export async function assertInventoryReadyForPeriodClose(organizationId: string, endsOn: Date, tx: Prisma.TransactionClient) {
  const cutoff = new Date(endsOn);
  cutoff.setUTCHours(23, 59, 59, 999);
  const scope = { organizationId, movementDate: { lte: cutoff } };
  const movementCount = await tx.stockMovement.count({ where: scope });
  const settings = await tx.inventorySettings.findUnique({ where: { organizationId }, select: { inventoryAssetAccountId: true } });
  if (movementCount === 0 && !settings?.inventoryAssetAccountId) return;
  const [legacy, reviews, receipts, issues] = await Promise.all([
    tx.stockMovement.count({ where: { ...scope, OR: [{ valuationVersion: null }, { valuationVersion: { not: 1 } }] } }),
    tx.stockMovement.count({ where: { ...scope, valuationVersion: 1, inventoryMovementPosting: null,
      type: { in: [StockMovementType.OPENING_BALANCE, StockMovementType.ADJUSTMENT_IN, StockMovementType.ADJUSTMENT_OUT, StockMovementType.SALES_RETURN_IN, StockMovementType.PURCHASE_RETURN_OUT] },
      OR: [{ referenceType: null }, { referenceType: { notIn: ["PurchaseReceiptVoid", "SalesStockIssueVoid"] } }],
    } }),
    tx.purchaseReceipt.count({ where: { organizationId, receiptDate: { lte: cutoff }, status: "POSTED",
      ...pendingReceiptReview } }),
    tx.salesStockIssue.count({ where: { organizationId, issueDate: { lte: cutoff }, status: "POSTED",
      ...pendingIssueReview } }),
  ]);
  if (legacy || reviews || receipts || issues) {
    throw new BadRequestException(`Inventory must be reconciled through the period end before closing or locking: ${legacy} legacy movements, ${reviews} movement reviews, ${receipts} receipt postings, ${issues} COGS postings remain. Open Inventory accounting review.`);
  }
  if (!settings?.inventoryAssetAccountId) throw new BadRequestException("Configure and reconcile the inventory asset account before closing or locking this period.");
  // Historical close compares the last immutable snapshot per item/warehouse, not today's balance.
  const rows = await tx.$queryRaw<Array<{ value: Prisma.Decimal }>>(Prisma.sql`
    SELECT COALESCE(SUM(latest."valuationValueAfter"), 0) AS value FROM (
      SELECT DISTINCT ON ("itemId", "warehouseId") "valuationValueAfter"
      FROM "StockMovement"
      WHERE "organizationId" = ${organizationId}::uuid AND "valuationVersion" = 1 AND "movementDate" <= ${cutoff}
      ORDER BY "itemId", "warehouseId", "valuationSequence" DESC
    ) latest`);
  const ledger = await tx.journalLine.aggregate({ where: { organizationId, accountId: settings.inventoryAssetAccountId,
    journalEntry: { organizationId, entryDate: { lte: cutoff }, status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] } } }, _sum: { debit: true, credit: true } });
  const value = new Prisma.Decimal(rows[0]?.value ?? 0);
  const asset = new Prisma.Decimal(ledger._sum.debit ?? 0).minus(ledger._sum.credit ?? 0);
  if (!value.eq(asset)) throw new BadRequestException(`Inventory subledger and asset account differ by ${value.minus(asset).toFixed(4)} at period end. Reconcile Inventory accounting review before closing or locking.`);
}
