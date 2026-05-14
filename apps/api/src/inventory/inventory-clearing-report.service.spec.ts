import {
  AccountType,
  ItemStatus,
  ItemType,
  JournalEntryStatus,
  Prisma,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  PurchaseReceiptStatus,
} from "@prisma/client";
import { InventoryClearingReportService } from "./inventory-clearing-report.service";

describe("InventoryClearingReportService", () => {
  const supplier = { id: "supplier-1", name: "Supplier", displayName: "Supplier Co" };
  const clearingAccount = account("clearing-1", "240", "Inventory Clearing", AccountType.LIABILITY);
  const item = {
    id: "item-1",
    name: "Tracked Item",
    sku: "TRK",
    type: ItemType.PRODUCT,
    status: ItemStatus.ACTIVE,
    inventoryTracking: true,
  };
  const baseSettings = {
    id: "settings-1",
    organizationId: "org-1",
    inventoryClearingAccount: clearingAccount,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      inventorySettings: { findUnique: jest.fn().mockResolvedValue(baseSettings) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([clearingBill()]) },
      purchaseReceipt: { findMany: jest.fn().mockResolvedValue([]) },
      journalLine: {
        findMany: jest.fn().mockResolvedValue([
          { debit: new Prisma.Decimal("8.0000"), credit: new Prisma.Decimal("0.0000") },
          { debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("8.0000") },
        ]),
      },
      ...overrides,
    };
    return { service: new InventoryClearingReportService(prisma as never), prisma };
  }

  it("includes finalized inventory-clearing bills and reports matched bill/receipt values", async () => {
    const { service, prisma } = makeService();

    const report = await service.clearingReconciliationReport("org-1");

    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        status: "MATCHED",
        billClearingDebit: "8.0000",
        receiptClearingCredit: "8.0000",
        netClearingDifference: "0.0000",
        billedQuantity: "2.0000",
        receivedQuantity: "2.0000",
      }),
    );
    expect(report.clearingAccountBalance).toBe("0.0000");
    expect(report.summary.matchedCount).toBe(1);
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
        }),
      }),
    );
  });

  it("excludes direct-mode bills unless explicitly requested", async () => {
    const directBill = clearingBill({ inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET });
    const { service, prisma } = makeService({
      purchaseBill: { findMany: jest.fn().mockResolvedValue([directBill]) },
    });

    const report = await service.clearingReconciliationReport("org-1", { status: "DIRECT_MODE_EXCLUDED" });

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        status: "DIRECT_MODE_EXCLUDED",
        billClearingDebit: "0.0000",
      }),
    );
    expect(report.summary.directModeExcludedCount).toBe(1);
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
        }),
      }),
    );
  });

  it("reports clearing bills without active receipt asset postings", async () => {
    const bill = clearingBill({
      purchaseReceipts: [receipt({ inventoryAssetJournalEntryId: null })],
    });
    const { service } = makeService({
      purchaseBill: { findMany: jest.fn().mockResolvedValue([bill]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([{ debit: new Prisma.Decimal("8.0000"), credit: new Prisma.Decimal("0.0000") }]) },
    });

    const report = await service.clearingReconciliationReport("org-1");
    const row = required(report.rows[0]);

    expect(row.status).toBe("BILL_WITHOUT_RECEIPT_POSTING");
    expect(row.receiptClearingCredit).toBe("0.0000");
    expect(row.warnings).toEqual(expect.arrayContaining(["Inventory clearing bill has no active receipt inventory asset posting."]));
  });

  it("returns variance rows for reversed receipt asset postings", async () => {
    const bill = clearingBill({
      purchaseReceipts: [receipt({ inventoryAssetReversalJournalEntryId: "journal-reversal-1" })],
    });
    const { service } = makeService({
      purchaseBill: { findMany: jest.fn().mockResolvedValue([bill]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([{ debit: new Prisma.Decimal("8.0000"), credit: new Prisma.Decimal("0.0000") }]) },
    });

    const report = await service.clearingVarianceReport("org-1");

    expect(report.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          varianceReason: "Receipt asset posting was reversed.",
          recommendedAction: expect.stringContaining("reposted"),
        }),
      ]),
    );
  });

  it("reports direct-mode receipt asset postings as variance warnings", async () => {
    const directReceipt = receiptWithoutCompatibleBill({
      purchaseBill: {
        id: "bill-direct-1",
        billNumber: "BILL-DIRECT",
        billDate: new Date("2026-05-01T00:00:00.000Z"),
        status: PurchaseBillStatus.FINALIZED,
        inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
        total: new Prisma.Decimal("8.0000"),
        currency: "SAR",
        journalEntryId: "journal-direct-1",
        supplier,
      },
    });
    const { service } = makeService({
      purchaseBill: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseReceipt: { findMany: jest.fn().mockResolvedValue([directReceipt]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([{ debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("8.0000") }]) },
    });

    const report = await service.clearingVarianceReport("org-1");

    expect(report.rows[0]).toEqual(
      expect.objectContaining({
        status: "RECEIPT_WITHOUT_CLEARING_BILL",
        varianceReason: "Receipt is linked to direct-mode bill; asset posting should not be used.",
        recommendedAction: "Receipt is linked to direct-mode bill; asset posting should not be used.",
      }),
    );
  });

  it("calculates variance amount from receipt unit-cost differences", async () => {
    const bill = clearingBill({
      purchaseReceipts: [receipt({ lines: [receiptLine({ unitCost: "3.0000" })] })],
    });
    const { service } = makeService({
      purchaseBill: { findMany: jest.fn().mockResolvedValue([bill]) },
      journalLine: {
        findMany: jest.fn().mockResolvedValue([
          { debit: new Prisma.Decimal("8.0000"), credit: new Prisma.Decimal("0.0000") },
          { debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("6.0000") },
        ]),
      },
    });

    const report = await service.clearingVarianceReport("org-1");

    expect(report.rows[0]).toEqual(expect.objectContaining({ status: "VARIANCE", varianceAmount: "2.0000" }));
  });

  it("keeps tenant filters on bills and clearing journal lines", async () => {
    const { service, prisma } = makeService();

    await service.clearingReconciliationReport("org-2", { supplierId: "supplier-2", from: "2026-05-01", to: "2026-05-31" });

    expect(prisma.inventorySettings.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-2" },
      }),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-2",
          supplierId: "supplier-2",
        }),
      }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-2",
          accountId: clearingAccount.id,
        }),
      }),
    );
  });

  function account(id: string, code: string, name: string, type: AccountType) {
    return { id, code, name, type, allowPosting: true, isActive: true };
  }

  function clearingBill(overrides: Record<string, unknown> = {}) {
    return {
      id: "bill-1",
      organizationId: "org-1",
      billNumber: "BILL-000001",
      supplierId: supplier.id,
      billDate: new Date("2026-05-01T00:00:00.000Z"),
      status: PurchaseBillStatus.FINALIZED,
      inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
      taxTotal: new Prisma.Decimal("0.0000"),
      total: new Prisma.Decimal("8.0000"),
      currency: "SAR",
      journalEntryId: "journal-bill-1",
      supplier,
      journalEntry: { id: "journal-bill-1", entryNumber: "JE-000001", status: JournalEntryStatus.POSTED },
      lines: [billLine()],
      purchaseReceipts: [receipt()],
      ...overrides,
    };
  }

  function billLine(overrides: Record<string, unknown> = {}) {
    return {
      id: "bill-line-1",
      description: "Tracked item",
      accountId: "expense-1",
      quantity: new Prisma.Decimal("2.0000"),
      unitPrice: new Prisma.Decimal("4.0000"),
      taxableAmount: new Prisma.Decimal("8.0000"),
      item,
      account: account("expense-1", "510", "Purchases", AccountType.EXPENSE),
      ...overrides,
    };
  }

  function receipt(overrides: Record<string, unknown> = {}) {
    return {
      id: "receipt-1",
      receiptNumber: "PRC-000001",
      receiptDate: new Date("2026-05-02T00:00:00.000Z"),
      status: PurchaseReceiptStatus.POSTED,
      inventoryAssetJournalEntryId: "journal-receipt-1",
      inventoryAssetReversalJournalEntryId: null,
      inventoryAssetJournalEntry: { id: "journal-receipt-1", entryNumber: "JE-000002", status: JournalEntryStatus.POSTED },
      inventoryAssetReversalJournalEntry: null,
      supplier,
      lines: [receiptLine()],
      ...overrides,
    };
  }

  function receiptLine(overrides: Record<string, unknown> = {}) {
    return {
      id: "receipt-line-1",
      purchaseBillLineId: "bill-line-1",
      quantity: new Prisma.Decimal("2.0000"),
      unitCost: new Prisma.Decimal("4.0000"),
      item,
      purchaseBillLine: { id: "bill-line-1", description: "Tracked item" },
      ...overrides,
    };
  }

  function receiptWithoutCompatibleBill(overrides: Record<string, unknown> = {}) {
    return {
      id: "receipt-direct-1",
      receiptNumber: "PRC-DIRECT",
      receiptDate: new Date("2026-05-03T00:00:00.000Z"),
      status: PurchaseReceiptStatus.POSTED,
      inventoryAssetJournalEntryId: "journal-direct-receipt-1",
      inventoryAssetReversalJournalEntryId: null,
      inventoryAssetJournalEntry: { id: "journal-direct-receipt-1", entryNumber: "JE-000003", status: JournalEntryStatus.POSTED },
      inventoryAssetReversalJournalEntry: null,
      supplier,
      purchaseBill: null,
      lines: [receiptLine()],
      ...overrides,
    };
  }

  function required<T>(value: T | undefined): T {
    if (value === undefined) {
      throw new Error("Expected value to be present.");
    }
    return value;
  }
});
