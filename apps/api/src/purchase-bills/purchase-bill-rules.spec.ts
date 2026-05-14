import { assertBalancedJournal, calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  InventoryPurchasePostingMode,
  InventoryValuationMethod,
  JournalEntryStatus,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  SupplierPaymentStatus,
} from "@prisma/client";
import { buildSupplierLedgerRows } from "../contacts/contact-ledger.service";
import { buildPurchaseBillJournalLines } from "./purchase-bill-accounting";
import { PurchaseBillService } from "./purchase-bill.service";

describe("purchase bill rules", () => {
  it("calculates purchase bill totals using invoice semantics", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "2.0000", unitPrice: "100.0000", discountRate: "10.0000", taxRate: "15.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "200.0000",
      discountTotal: "20.0000",
      taxableTotal: "180.0000",
      taxTotal: "27.0000",
      total: "207.0000",
    });
  });

  it("builds balanced AP purchase bill journal lines", () => {
    const lines = buildPurchaseBillJournalLines({
      accountsPayableAccountId: "ap",
      vatReceivableAccountId: "vat-receivable",
      billNumber: "BILL-000001",
      supplierName: "Supplier",
      currency: "SAR",
      total: "115.0000",
      taxTotal: "15.0000",
      lines: [{ accountId: "expense", description: "Services", taxableAmount: "100.0000" }],
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "expense", debit: "100.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "vat-receivable", debit: "15.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "ap", debit: "0.0000", credit: "115.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("does not post again when finalizing an already finalized purchase bill", async () => {
    const finalizedBill = { id: "bill-1", status: PurchaseBillStatus.FINALIZED, journalEntryId: "journal-1" };
    const prisma = { $transaction: jest.fn() };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(finalizedBill as never);

    await expect(service.finalize("org-1", "user-1", "bill-1")).resolves.toBe(finalizedBill);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("prevents updates to finalized purchase bills", async () => {
    const service = new PurchaseBillService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.FINALIZED } as never);

    await expect(service.update("org-1", "user-1", "bill-1", {})).rejects.toThrow("Only draft purchase bills can be edited.");
  });

  it("finalization creates a balanced posted AP journal", async () => {
    const tx = makeFinalizeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseBillService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000001") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.DRAFT, journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "bill-1")).resolves.toMatchObject({
      status: PurchaseBillStatus.FINALIZED,
      journalEntryId: "journal-1",
    });
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "115.0000",
          totalCredit: "115.0000",
          lines: {
            create: [
              expect.objectContaining({ debit: "100.0000", credit: "0.0000" }),
              expect.objectContaining({ debit: "15.0000", credit: "0.0000" }),
              expect.objectContaining({ debit: "0.0000", credit: "115.0000" }),
            ],
          },
        }),
      }),
    );
  });

  it("returns direct purchase bill accounting preview matching current posting behavior", async () => {
    const { service } = makePreviewService({ mode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET });

    const preview = await service.accountingPreview("org-1", "bill-1");

    expect(preview.inventoryPostingMode).toBe(PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET);
    expect(preview.canFinalize).toBe(true);
    expect(preview.journal.lines).toEqual([
      expect.objectContaining({ side: "DEBIT", accountCode: "510", accountName: "Purchases", amount: "100.0000" }),
      expect.objectContaining({ side: "DEBIT", accountCode: "230", accountName: "VAT Receivable", amount: "15.0000" }),
      expect.objectContaining({ side: "CREDIT", accountCode: "210", accountName: "Accounts Payable", amount: "115.0000" }),
    ]);
  });

  it("returns inventory clearing purchase bill preview for tracked lines while keeping non-inventory lines direct", async () => {
    const { service } = makePreviewService({ mode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING, includeServiceLine: true });

    const preview = await service.accountingPreview("org-1", "bill-1");

    expect(preview.inventoryPostingMode).toBe(PurchaseBillInventoryPostingMode.INVENTORY_CLEARING);
    expect(preview.canFinalize).toBe(false);
    expect(preview.canUseInventoryClearingMode).toBe(true);
    expect(preview.inventoryTrackedLineCount).toBe(1);
    expect(preview.directLineCount).toBe(1);
    expect(preview.blockingReasons).toContain("Inventory clearing bill finalization is preview-only and is not enabled yet.");
    expect(preview.journal.lines).toEqual([
      expect.objectContaining({ side: "DEBIT", accountCode: "240", accountName: "Inventory Clearing", amount: "100.0000" }),
      expect.objectContaining({ side: "DEBIT", accountCode: "510", accountName: "Purchases", amount: "50.0000" }),
      expect.objectContaining({ side: "DEBIT", accountCode: "230", accountName: "VAT Receivable", amount: "22.5000" }),
      expect.objectContaining({ side: "CREDIT", accountCode: "210", accountName: "Accounts Payable", amount: "172.5000" }),
    ]);
  });

  it("rejects saving inventory clearing mode when inventory accounting settings are missing", async () => {
    const prisma = {
      inventorySettings: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({
      id: "bill-1",
      status: PurchaseBillStatus.DRAFT,
      inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
      lines: [{ item: { inventoryTracking: true } }],
    } as never);

    await expectBadRequestMessage(
      service.update("org-1", "user-1", "bill-1", { inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING } as never),
      "Inventory accounting must be enabled before purchase bills can use inventory clearing mode.",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks inventory clearing mode finalization until the future posting workflow is implemented", async () => {
    const tx = makeFinalizeTransactionMock(PurchaseBillInventoryPostingMode.INVENTORY_CLEARING);
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.DRAFT, journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "bill-1")).rejects.toThrow(
      "Inventory clearing purchase bill finalization is preview-only and is not enabled yet.",
    );
    expect(tx.purchaseBill.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("blocks purchase bill finalization in a closed fiscal period", async () => {
    const tx = makeFinalizeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const guard = { assertPostingDateAllowed: jest.fn().mockRejectedValue(new Error("Posting date falls in a closed fiscal period.")) };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, undefined, undefined, guard as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.DRAFT, journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "bill-1")).rejects.toThrow("Posting date falls in a closed fiscal period.");
    expect(tx.purchaseBill.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("blocks voiding finalized bills with active supplier payment allocations", async () => {
    const tx = makeVoidTransactionMock({ activePaymentCount: 1 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.FINALIZED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "bill-1")).rejects.toThrow(
      "Cannot void purchase bill with active supplier payment allocations. Void payments first.",
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("supplier ledger balance increases for bills and decreases for payments", () => {
    const rows = buildSupplierLedgerRows({
      bills: [
        {
          id: "bill-1",
          billNumber: "BILL-000001",
          billDate: "2026-05-12T00:00:00.000Z",
          total: "115.0000",
          balanceDue: "40.0000",
          status: PurchaseBillStatus.FINALIZED,
          journalEntryId: "journal-1",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      ],
      payments: [
        {
          id: "payment-1",
          paymentNumber: "PAY-000001",
          paymentDate: "2026-05-13T00:00:00.000Z",
          status: SupplierPaymentStatus.POSTED,
          amountPaid: "75.0000",
          unappliedAmount: "0.0000",
          createdAt: "2026-05-13T00:00:00.000Z",
          updatedAt: "2026-05-13T00:00:00.000Z",
          allocations: [],
        },
      ],
    });

    expect(rows.map((row) => row.balance)).toEqual(["115.0000", "40.0000"]);
  });
});

function makePreviewService(options: { mode: PurchaseBillInventoryPostingMode; includeServiceLine?: boolean }) {
  const billLines = [
    {
      accountId: "purchase-expense",
      description: "Tracked item",
      taxableAmount: "100.0000",
      item: { id: "item-1", name: "Tracked Item", sku: "TRK", inventoryTracking: true },
      account: account("purchase-expense", "510", "Purchases", AccountType.EXPENSE),
    },
    ...(options.includeServiceLine
      ? [
          {
            accountId: "purchase-expense",
            description: "Service line",
            taxableAmount: "50.0000",
            item: null,
            account: account("purchase-expense", "510", "Purchases", AccountType.EXPENSE),
          },
        ]
      : []),
  ];
  const billTotal = options.includeServiceLine ? "172.5000" : "115.0000";
  const taxTotal = options.includeServiceLine ? "22.5000" : "15.0000";
  const prisma = {
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue({
        id: "bill-1",
        billNumber: "BILL-000001",
        supplier: { id: "supplier-1", name: "Supplier", displayName: "Supplier" },
        status: PurchaseBillStatus.DRAFT,
        billDate: new Date("2026-05-12T00:00:00.000Z"),
        currency: "SAR",
        total: billTotal,
        taxTotal,
        inventoryPostingMode: options.mode,
        lines: billLines,
      }),
    },
    account: {
      findFirst: jest.fn(({ where }: { where: { code: string } }) => {
        if (where.code === "210") return Promise.resolve(account("ap", "210", "Accounts Payable", AccountType.LIABILITY));
        if (where.code === "230") return Promise.resolve(account("vat-receivable", "230", "VAT Receivable", AccountType.ASSET));
        return Promise.resolve(null);
      }),
    },
    inventorySettings: {
      findUnique: jest.fn().mockResolvedValue({
        enableInventoryAccounting: true,
        valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
        purchaseReceiptPostingMode: InventoryPurchasePostingMode.PREVIEW_ONLY,
        inventoryAssetAccountId: "inventory-asset",
        inventoryClearingAccountId: "clearing",
        inventoryAssetAccount: account("inventory-asset", "130", "Inventory", AccountType.ASSET),
        inventoryClearingAccount: account("clearing", "240", "Inventory Clearing", AccountType.LIABILITY),
      }),
    },
  };
  return { service: new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never), prisma };
}

function makeFinalizeTransactionMock(
  inventoryPostingMode: PurchaseBillInventoryPostingMode = PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
) {
  const bill = {
    id: "bill-1",
    billNumber: "BILL-000001",
    supplierId: "supplier-1",
    status: PurchaseBillStatus.DRAFT,
    inventoryPostingMode,
    billDate: new Date("2026-05-12T00:00:00.000Z"),
    currency: "SAR",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    journalEntryId: null,
    supplier: { id: "supplier-1", name: "Supplier", displayName: "Supplier" },
    lines: [
      {
        accountId: "expense",
        description: "Services",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        account: { id: "expense" },
      },
    ],
  };

  return {
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue(bill),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ ...bill, status: PurchaseBillStatus.FINALIZED, journalEntryId: "journal-existing" }),
      update: jest.fn().mockResolvedValue({ ...bill, status: PurchaseBillStatus.FINALIZED, journalEntryId: "journal-1" }),
    },
    account: {
      findFirst: jest.fn(({ where }: { where: { code: string } }) => Promise.resolve({ id: where.code === "210" ? "ap" : "vat-receivable" })),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
  };
}

function makeVoidTransactionMock(options: { activePaymentCount?: number } = {}) {
  return {
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue({
        id: "bill-1",
        status: PurchaseBillStatus.FINALIZED,
        journalEntryId: "journal-1",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.VOIDED }),
      update: jest.fn().mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.VOIDED, reversalJournalEntryId: "reversal-1" }),
    },
    supplierPaymentAllocation: {
      count: jest.fn().mockResolvedValue(options.activePaymentCount ?? 0),
    },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "journal-1",
        entryNumber: "JE-000001",
        reference: "BILL-000001",
        currency: "SAR",
        description: "Purchase bill BILL-000001",
        reversedBy: null,
        lines: [
          { accountId: "expense", debit: "100.0000", credit: "0.0000", description: "Expense", currency: "SAR", exchangeRate: "1", taxRateId: null },
          { accountId: "ap", debit: "0.0000", credit: "100.0000", description: "AP", currency: "SAR", exchangeRate: "1", taxRateId: null },
        ],
      }),
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function account(id: string, code: string, name: string, type: AccountType) {
  return { id, code, name, type, allowPosting: true, isActive: true };
}

async function expectBadRequestMessage(promise: Promise<unknown>, expected: string) {
  try {
    await promise;
  } catch (error) {
    if (error && typeof error === "object" && "getResponse" in error && typeof error.getResponse === "function") {
      const response = error.getResponse() as { message?: string | string[] };
      const messages = Array.isArray(response.message) ? response.message : [response.message];
      expect(messages).toContain(expected);
      return;
    }
    throw error;
  }
  throw new Error("Expected BadRequestException.");
}
