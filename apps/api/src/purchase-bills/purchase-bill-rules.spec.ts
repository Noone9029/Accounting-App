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
    expect(preview.canFinalize).toBe(true);
    expect(preview.canUseInventoryClearingMode).toBe(true);
    expect(preview.inventoryTrackedLineCount).toBe(1);
    expect(preview.directLineCount).toBe(1);
    expect(preview.blockingReasons).toEqual([]);
    expect(preview.warnings).toEqual(
      expect.arrayContaining([
        "Inventory clearing mode requires explicit manual receipt asset posting for linked receipts.",
        "Automatic purchase receipt GL posting remains disabled.",
        "Use only after accountant review.",
      ]),
    );
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

  it("finalizes inventory clearing mode by debiting clearing for tracked lines and direct accounts for non-inventory lines", async () => {
    const tx = makeFinalizeTransactionMock({ inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING, includeServiceLine: true });
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
          totalDebit: "172.5000",
          totalCredit: "172.5000",
          lines: {
            create: [
              expect.objectContaining({ account: { connect: { id: "clearing" } }, debit: "100.0000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: "expense" } }, debit: "50.0000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: "vat-receivable" } }, debit: "22.5000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: "ap" } }, debit: "0.0000", credit: "172.5000" }),
            ],
          },
        }),
      }),
    );
  });

  it("blocks inventory clearing mode finalization without a clearing account", async () => {
    const tx = makeFinalizeTransactionMock({
      inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
      inventorySettings: null,
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.DRAFT, journalEntryId: null } as never);

    await expectBadRequestMessage(
      service.finalize("org-1", "user-1", "bill-1"),
      "Inventory clearing account mapping is required before purchase bills can use inventory clearing mode.",
    );
    expect(tx.purchaseBill.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("blocks inventory clearing mode finalization when clearing account is Accounts Payable 210", async () => {
    const tx = makeFinalizeTransactionMock({
      inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
      clearingAccount: account("ap", "210", "Accounts Payable", AccountType.LIABILITY),
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.DRAFT, journalEntryId: null } as never);

    await expectBadRequestMessage(
      service.finalize("org-1", "user-1", "bill-1"),
      "Inventory clearing account must be separate from Accounts Payable account code 210.",
    );
    expect(tx.purchaseBill.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("blocks inventory clearing mode finalization when no lines are inventory-tracked", async () => {
    const tx = makeFinalizeTransactionMock({
      inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
      trackedLine: false,
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseBillService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.DRAFT, journalEntryId: null } as never);

    await expectBadRequestMessage(
      service.finalize("org-1", "user-1", "bill-1"),
      "Inventory clearing mode requires at least one inventory-tracked purchase bill line.",
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

  it("void reverses an inventory clearing purchase bill journal without stock movement mutation", async () => {
    const tx = makeVoidTransactionMock({ clearingJournal: true });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseBillService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.FINALIZED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "bill-1")).resolves.toMatchObject({
      status: PurchaseBillStatus.VOIDED,
      reversalJournalEntryId: "reversal-1",
    });

    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reversalOfId: "journal-1",
          lines: {
            create: [
              expect.objectContaining({ account: { connect: { id: "clearing" } }, debit: "0.0000", credit: "100.0000" }),
              expect.objectContaining({ account: { connect: { id: "vat-receivable" } }, debit: "0.0000", credit: "15.0000" }),
              expect.objectContaining({ account: { connect: { id: "ap" } }, debit: "115.0000", credit: "0.0000" }),
            ],
          },
        }),
      }),
    );
    expect((tx as { stockMovement?: unknown }).stockMovement).toBeUndefined();
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
      itemId: "item-1",
      description: "Tracked item",
      taxableAmount: "100.0000",
      item: { id: "item-1", name: "Tracked Item", sku: "TRK", inventoryTracking: true },
      account: account("purchase-expense", "510", "Purchases", AccountType.EXPENSE),
    },
    ...(options.includeServiceLine
      ? [
          {
            accountId: "purchase-expense",
            itemId: null,
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
      findFirst: jest.fn(({ where }: { where: { code?: string; id?: string } }) => {
        if (where.id === "clearing") return Promise.resolve(account("clearing", "240", "Inventory Clearing", AccountType.LIABILITY));
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

interface FinalizeTransactionMockOptions {
  inventoryPostingMode?: PurchaseBillInventoryPostingMode;
  includeServiceLine?: boolean;
  trackedLine?: boolean;
  inventorySettings?: Record<string, unknown> | null;
  clearingAccount?: ReturnType<typeof account>;
}

function makeFinalizeTransactionMock(
  options: PurchaseBillInventoryPostingMode | FinalizeTransactionMockOptions = PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
) {
  const resolved: FinalizeTransactionMockOptions =
    typeof options === "string"
      ? { inventoryPostingMode: options }
      : { inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET, trackedLine: true, ...options };
  const inventoryPostingMode = resolved.inventoryPostingMode ?? PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET;
  const trackedLine = resolved.trackedLine ?? true;
  const clearingAccount = resolved.clearingAccount ?? account("clearing", "240", "Inventory Clearing", AccountType.LIABILITY);
  const billLines = [
    {
      accountId: "expense",
      itemId: trackedLine ? "item-1" : null,
      description: trackedLine ? "Tracked item" : "Services",
      quantity: "1.0000",
      unitPrice: "100.0000",
      discountRate: "0.0000",
      lineGrossAmount: "100.0000",
      discountAmount: "0.0000",
      taxableAmount: "100.0000",
      taxAmount: "15.0000",
      lineTotal: "115.0000",
      item: trackedLine ? { id: "item-1", inventoryTracking: true } : null,
      account: { id: "expense" },
    },
    ...(resolved.includeServiceLine
      ? [
          {
            accountId: "expense",
            itemId: null,
            description: "Services",
            quantity: "1.0000",
            unitPrice: "50.0000",
            discountRate: "0.0000",
            lineGrossAmount: "50.0000",
            discountAmount: "0.0000",
            taxableAmount: "50.0000",
            taxAmount: "7.5000",
            lineTotal: "57.5000",
            item: null,
            account: { id: "expense" },
          },
        ]
      : []),
  ];
  const totals = resolved.includeServiceLine
    ? { subtotal: "150.0000", taxableTotal: "150.0000", taxTotal: "22.5000", total: "172.5000" }
    : { subtotal: "100.0000", taxableTotal: "100.0000", taxTotal: "15.0000", total: "115.0000" };
  const inventorySettings =
    resolved.inventorySettings === undefined
      ? {
          enableInventoryAccounting: true,
          valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
          purchaseReceiptPostingMode: InventoryPurchasePostingMode.PREVIEW_ONLY,
          inventoryAssetAccountId: "inventory-asset",
          inventoryClearingAccountId: clearingAccount.id,
          inventoryAssetAccount: account("inventory-asset", "130", "Inventory", AccountType.ASSET),
          inventoryClearingAccount: clearingAccount,
        }
      : resolved.inventorySettings;
  const bill = {
    id: "bill-1",
    billNumber: "BILL-000001",
    supplierId: "supplier-1",
    status: PurchaseBillStatus.DRAFT,
    inventoryPostingMode,
    billDate: new Date("2026-05-12T00:00:00.000Z"),
    currency: "SAR",
    subtotal: totals.subtotal,
    discountTotal: "0.0000",
    taxableTotal: totals.taxableTotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    journalEntryId: null,
    supplier: { id: "supplier-1", name: "Supplier", displayName: "Supplier" },
    lines: billLines,
  };

  return {
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue(bill),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ ...bill, status: PurchaseBillStatus.FINALIZED, journalEntryId: "journal-existing" }),
      update: jest.fn().mockResolvedValue({ ...bill, status: PurchaseBillStatus.FINALIZED, journalEntryId: "journal-1" }),
    },
    inventorySettings: {
      findUnique: jest.fn().mockResolvedValue(inventorySettings),
    },
    account: {
      findFirst: jest.fn(({ where }: { where: { code?: string; id?: string } }) => {
        if (where.id === clearingAccount.id) return Promise.resolve(clearingAccount);
        return Promise.resolve({ id: where.code === "210" ? "ap" : "vat-receivable" });
      }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
  };
}

function makeVoidTransactionMock(options: { activePaymentCount?: number; clearingJournal?: boolean } = {}) {
  const journalLines = options.clearingJournal
    ? [
        {
          accountId: "clearing",
          debit: "100.0000",
          credit: "0.0000",
          description: "Inventory clearing",
          currency: "SAR",
          exchangeRate: "1",
          taxRateId: null,
        },
        {
          accountId: "vat-receivable",
          debit: "15.0000",
          credit: "0.0000",
          description: "VAT",
          currency: "SAR",
          exchangeRate: "1",
          taxRateId: null,
        },
        { accountId: "ap", debit: "0.0000", credit: "115.0000", description: "AP", currency: "SAR", exchangeRate: "1", taxRateId: null },
      ]
    : [
        { accountId: "expense", debit: "100.0000", credit: "0.0000", description: "Expense", currency: "SAR", exchangeRate: "1", taxRateId: null },
        { accountId: "ap", debit: "0.0000", credit: "100.0000", description: "AP", currency: "SAR", exchangeRate: "1", taxRateId: null },
      ];
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
    purchaseDebitNoteAllocation: {
      count: jest.fn().mockResolvedValue(0),
    },
    supplierPaymentUnappliedAllocation: {
      count: jest.fn().mockResolvedValue(0),
    },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "journal-1",
        entryNumber: "JE-000001",
        reference: "BILL-000001",
        currency: "SAR",
        description: "Purchase bill BILL-000001",
        reversedBy: null,
        lines: journalLines,
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
