import { Prisma } from "@prisma/client";

// A missing journal is acceptable only for an explicitly reviewed, entirely zero-cost
// document. A deleted positive journal, legacy snapshot, or missing reviewer stays pending.
const invalidZeroCost: Prisma.StockMovementWhereInput = {
  OR: [{ valuationVersion: null }, { valuationVersion: { not: 1 } }, { totalCost: null }, { totalCost: { not: 0 } }],
};

export const pendingReceiptReview: Prisma.PurchaseReceiptWhereInput = {
  OR: [
    { inventoryAssetReversalJournalEntryId: { not: null } },
    { inventoryAssetJournalEntryId: null, OR: [
      { inventoryAssetPostedAt: null }, { inventoryAssetPostedById: null }, { lines: { none: {} } },
      { lines: { some: { OR: [{ stockMovementId: null }, { stockMovement: { is: invalidZeroCost } }] } } },
    ] },
  ],
};

export const pendingIssueReview: Prisma.SalesStockIssueWhereInput = {
  OR: [
    { cogsReversalJournalEntryId: { not: null } },
    { cogsJournalEntryId: null, OR: [
      { cogsPostedAt: null }, { cogsPostedById: null }, { lines: { none: {} } },
      { lines: { some: { OR: [{ stockMovementId: null }, { stockMovement: { is: invalidZeroCost } }] } } },
    ] },
  ],
};
