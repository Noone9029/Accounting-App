import {
  AccountType,
  ContactType,
  InventoryPurchasePostingMode,
  InventoryValuationMethod,
  ItemStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  PurchaseOrderStatus,
  PurchaseReceiptStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { PurchaseReceiptService } from "./purchase-receipt.service";

describe("PurchaseReceiptService", () => {
  const item = { id: "item-1", inventoryTracking: true, status: ItemStatus.ACTIVE };
  const previewItem = { id: item.id, name: "Tracked Item", sku: "TRK", type: "PRODUCT", status: ItemStatus.ACTIVE, inventoryTracking: true };
  const supplier = { id: "supplier-1", type: ContactType.SUPPLIER, isActive: true };
  const warehouse = { id: "warehouse-1", status: WarehouseStatus.ACTIVE };
  const assetAccount = { id: "asset-1", code: "130", name: "Inventory", type: AccountType.ASSET, allowPosting: true, isActive: true };
  const clearingAccount = { id: "clearing-1", code: "240", name: "Inventory Clearing", type: AccountType.LIABILITY, allowPosting: true, isActive: true };
  const poLine = { id: "po-line-1", itemId: item.id, quantity: new Prisma.Decimal("5.0000"), unitPrice: new Prisma.Decimal("7.0000"), item };
  const billLine = { id: "bill-line-1", itemId: item.id, quantity: new Prisma.Decimal("4.0000"), unitPrice: new Prisma.Decimal("8.0000"), item };
  const previewBillLine = {
    id: billLine.id,
    description: "Tracked bill line",
    quantity: billLine.quantity,
    unitPrice: billLine.unitPrice,
    account: { id: "expense-1", code: "511", name: "General Expenses", type: AccountType.EXPENSE },
  };
  const receipt = {
    id: "receipt-1",
    organizationId: "org-1",
    receiptNumber: "PRC-000001",
    purchaseOrderId: null,
    purchaseBillId: null,
    supplierId: supplier.id,
    warehouseId: warehouse.id,
    status: PurchaseReceiptStatus.POSTED,
    receiptDate: new Date("2026-05-14T00:00:00.000Z"),
    inventoryAssetJournalEntryId: null,
    inventoryAssetReversalJournalEntryId: null,
    inventoryAssetPostedAt: null,
    inventoryAssetPostedById: null,
    inventoryAssetReversedAt: null,
    inventoryAssetReversedById: null,
    inventoryAssetJournalEntry: null,
    inventoryAssetReversalJournalEntry: null,
    lines: [{ id: "receipt-line-1", itemId: item.id, item: previewItem, quantity: new Prisma.Decimal("2.0000"), unitCost: new Prisma.Decimal("7.0000") }],
  };
  const linkedClearingBill = {
    id: "bill-1",
    billNumber: "BILL-000001",
    status: PurchaseBillStatus.FINALIZED,
    billDate: new Date("2026-05-13T00:00:00.000Z"),
    total: new Prisma.Decimal("32.0000"),
    inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
  };
  const assetJournalEntry = {
    id: "journal-asset-1",
    entryNumber: "JE-000001",
    status: JournalEntryStatus.POSTED,
    entryDate: receipt.receiptDate,
    description: "Inventory asset posting for purchase receipt PRC-000001",
    reference: receipt.receiptNumber,
    currency: "SAR",
    totalDebit: new Prisma.Decimal("14.0000"),
    totalCredit: new Prisma.Decimal("14.0000"),
    reversedBy: null,
    lines: [
      {
        accountId: assetAccount.id,
        debit: new Prisma.Decimal("14.0000"),
        credit: new Prisma.Decimal("0.0000"),
        description: "Purchase receipt PRC-000001 inventory asset preview",
        currency: "SAR",
        exchangeRate: new Prisma.Decimal("1.00000000"),
      },
      {
        accountId: clearingAccount.id,
        debit: new Prisma.Decimal("0.0000"),
        credit: new Prisma.Decimal("14.0000"),
        description: "Inventory clearing preview pending bill/receipt matching design",
        currency: "SAR",
        exchangeRate: new Prisma.Decimal("1.00000000"),
      },
    ],
  };

  function makeService(tx: Record<string, unknown>, directOverrides: Record<string, unknown> = {}) {
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      purchaseReceipt: { findMany: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      purchaseOrder: { findFirst: jest.fn() },
      purchaseBill: { findFirst: jest.fn() },
      purchaseReceiptLine: { findMany: jest.fn() },
      journalEntry: { create: jest.fn() },
      ...directOverrides,
    };
    const audit = { log: jest.fn() };
    const numbers = {
      next: jest.fn((_organizationId: string, scope: NumberSequenceScope) =>
        Promise.resolve(scope === NumberSequenceScope.JOURNAL_ENTRY ? "JE-000001" : "PRC-000001"),
      ),
    };
    const inventoryAccounting = {
      previewReadiness: jest.fn().mockResolvedValue({
        settings: {
          valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
          enableInventoryAccounting: true,
          inventoryAssetAccount: assetAccount,
          inventoryClearingAccount: clearingAccount,
          purchaseReceiptPostingMode: InventoryPurchasePostingMode.PREVIEW_ONLY,
        },
        blockingReasons: [],
        warnings: ["Not posting to GL yet."],
      }),
    };
    const fiscal = { assertPostingDateAllowed: jest.fn() };
    return {
      service: new PurchaseReceiptService(prisma as never, audit as never, numbers as never, inventoryAccounting as never, fiscal as never),
      prisma,
      audit,
      numbers,
      inventoryAccounting,
      fiscal,
    };
  }

  function makeTx(overrides: Record<string, unknown> = {}) {
    return {
      warehouse: { findFirst: jest.fn().mockResolvedValue(warehouse) },
      contact: { findFirst: jest.fn().mockResolvedValue(supplier) },
      item: { findFirst: jest.fn().mockResolvedValue(item) },
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue({
          id: "po-1",
          supplierId: supplier.id,
          status: PurchaseOrderStatus.APPROVED,
          lines: [poLine],
        }),
      },
      purchaseBill: {
        findFirst: jest.fn().mockResolvedValue({
          id: "bill-1",
          supplierId: supplier.id,
          status: PurchaseBillStatus.FINALIZED,
          inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
          lines: [billLine],
        }),
      },
      purchaseOrderLine: { findMany: jest.fn().mockResolvedValue([{ id: poLine.id, quantity: poLine.quantity }]) },
      purchaseBillLine: { findMany: jest.fn().mockResolvedValue([{ id: billLine.id, quantity: billLine.quantity }]) },
      purchaseReceipt: {
        create: jest.fn().mockResolvedValue({ id: receipt.id }),
        findFirst: jest.fn().mockResolvedValue(receipt),
        findUniqueOrThrow: jest.fn().mockResolvedValue(receipt),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "receipt-line-1" }),
        update: jest.fn().mockResolvedValue({ id: "receipt-line-1" }),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([{ type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, quantity: new Prisma.Decimal("2.0000") }]),
        create: jest.fn().mockResolvedValue({ id: "movement-1" }),
      },
      journalEntry: { create: jest.fn().mockResolvedValue(assetJournalEntry), update: jest.fn().mockResolvedValue(assetJournalEntry) },
      ...overrides,
    };
  }

  it("creates a purchase receipt from a purchase order with a stock movement and no journal entry", async () => {
    const tx = makeTx();
    const { service, numbers, audit } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        purchaseOrderId: "po-1",
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ purchaseOrderLineId: poLine.id, quantity: "2.0000" }],
      }),
    ).resolves.toMatchObject({ id: receipt.id });

    expect(numbers.next).toHaveBeenCalledWith("org-1", "PURCHASE_RECEIPT", tx);
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
          referenceType: "PurchaseReceipt",
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "PurchaseReceipt" }));
  });

  it("rejects purchase order receipts above remaining quantity", async () => {
    const tx = makeTx({
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([{ purchaseOrderLineId: poLine.id, purchaseBillLineId: null, quantity: new Prisma.Decimal("4.0000") }]),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    const { service } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        purchaseOrderId: "po-1",
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ purchaseOrderLineId: poLine.id, quantity: "2.0000" }],
      }),
    ).rejects.toThrow("Receipt quantity cannot exceed the remaining source quantity.");
  });

  it("creates purchase bill and standalone receipts", async () => {
    await expect(
      makeService(makeTx()).service.create("org-1", "user-1", {
        purchaseBillId: "bill-1",
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ purchaseBillLineId: billLine.id, quantity: "1.0000" }],
      }),
    ).resolves.toMatchObject({ id: receipt.id });

    await expect(
      makeService(makeTx()).service.create("org-1", "user-1", {
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        receiptDate: "2026-05-14",
        lines: [{ itemId: item.id, quantity: "1.0000", unitCost: "6.0000" }],
      }),
    ).resolves.toMatchObject({ id: receipt.id });
  });

  it("voids a receipt with reversing stock movement and rejects double void", async () => {
    const tx = makeTx();
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(receipt as never);

    await expect(service.void("org-1", "user-1", receipt.id)).resolves.toMatchObject({ id: receipt.id });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_OUT, referenceType: "PurchaseReceiptVoid" }) }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();

    jest.spyOn(service, "get").mockResolvedValueOnce({ ...receipt, status: PurchaseReceiptStatus.VOIDED } as never);
    await expect(service.void("org-1", "user-1", receipt.id)).rejects.toThrow("Purchase receipt is already voided.");
  });

  it("rejects receipt void when stock would go negative", async () => {
    const tx = makeTx({ stockMovement: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() } });
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(receipt as never);

    await expect(service.void("org-1", "user-1", receipt.id)).rejects.toThrow("Voiding this purchase receipt cannot make stock negative.");
  });

  it("returns purchase source receiving status and tenant-scoped get", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseOrder: { findFirst: jest.fn().mockResolvedValue({ id: "po-1", lines: [{ id: poLine.id, item, quantity: poLine.quantity }] }) },
      purchaseReceiptLine: { findMany: jest.fn().mockResolvedValue([{ purchaseOrderLineId: poLine.id, quantity: new Prisma.Decimal("2.0000") }]) },
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.purchaseOrderReceivingStatus("org-1", "po-1")).resolves.toMatchObject({
      status: "PARTIAL",
      lines: [expect.objectContaining({ receivedQuantity: "2.0000", remainingQuantity: "3.0000" })],
    });
    await expect(service.get("other-org", receipt.id)).rejects.toThrow("Purchase receipt not found.");
    expect(prisma.purchaseReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: receipt.id, organizationId: "other-org" } }));
  });

  it("returns a design-only purchase receipt accounting preview without creating a journal entry", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(receipt) },
    });

    const preview = await service.accountingPreview("org-1", receipt.id);

    expect(preview).toEqual(
      expect.objectContaining({
        previewOnly: true,
        postingStatus: "DESIGN_ONLY",
        canPost: false,
        warnings: expect.arrayContaining(["Standalone receipt cannot be financially posted until a bill or clearing workflow is selected."]),
        blockingReasons: expect.arrayContaining(["Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode."]),
      }),
    );
    expect(preview.lines[0]).toEqual(expect.objectContaining({ lineValue: "14.0000" }));
    expect(preview).toEqual(
      expect.objectContaining({
        postingMode: "PREVIEW_ONLY",
        receiptValue: "14.0000",
        matchedBillValue: "0.0000",
        unmatchedReceiptValue: "14.0000",
      }),
    );
    expect(preview.journal.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ side: "DEBIT", accountCode: "130", amount: "14.0000" }),
        expect.objectContaining({ side: "CREDIT", accountCode: "240", accountName: "Inventory Clearing", amount: "14.0000" }),
      ]),
    );
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("shows linked bill quantities and value differences in purchase receipt preview", async () => {
    const linkedReceipt = {
      ...receipt,
      purchaseBillId: "bill-1",
      purchaseBill: { ...linkedClearingBill, inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET },
      lines: [{ ...receipt.lines[0], purchaseBillLine: previewBillLine }],
    };
    const { service } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(linkedReceipt) },
    });

    const preview = await service.accountingPreview("org-1", receipt.id);

    expect(preview.matchingSummary).toEqual(
      expect.objectContaining({
        sourceType: "purchaseBill",
        matchedQuantity: "2.0000",
        unmatchedQuantity: "0.0000",
        valueDifference: "-2.0000",
      }),
    );
    expect(preview.matchedBillValue).toBe("16.0000");
    expect(preview.warnings).toEqual(expect.arrayContaining([expect.stringContaining("not inventory-related")]));
  });

  it("allows purchase receipt asset preview only for finalized inventory-clearing bills", async () => {
    const clearingReceipt = {
      ...receipt,
      purchaseBillId: "bill-1",
      purchaseBill: linkedClearingBill,
      lines: [{ ...receipt.lines[0], purchaseBillLine: previewBillLine }],
    };
    const directReceipt = {
      ...clearingReceipt,
      purchaseBill: { ...linkedClearingBill, inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET },
    };
    const { service } = makeService(makeTx(), {
      purchaseReceipt: {
        findFirst: jest.fn().mockResolvedValueOnce(clearingReceipt).mockResolvedValueOnce(directReceipt),
      },
    });

    await expect(service.accountingPreview("org-1", receipt.id)).resolves.toEqual(
      expect.objectContaining({
        canPost: true,
        postingStatus: "POSTABLE",
        linkedBill: expect.objectContaining({ inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING }),
        journal: expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ side: "DEBIT", accountCode: "130", amount: "14.0000" }),
            expect.objectContaining({ side: "CREDIT", accountCode: "240", amount: "14.0000" }),
          ]),
        }),
      }),
    );
    await expect(service.accountingPreview("org-1", receipt.id)).resolves.toEqual(
      expect.objectContaining({
        canPost: false,
        blockingReasons: expect.arrayContaining(["Purchase receipt asset posting requires a finalized INVENTORY_CLEARING purchase bill."]),
      }),
    );
  });

  it("posts receipt inventory asset as a balanced journal and does not mutate stock movements", async () => {
    const clearingReceipt = {
      ...receipt,
      purchaseBillId: "bill-1",
      purchaseBill: linkedClearingBill,
      lines: [{ ...receipt.lines[0], purchaseBillLine: previewBillLine }],
    };
    const postedReceipt = { ...clearingReceipt, inventoryAssetJournalEntryId: assetJournalEntry.id, inventoryAssetJournalEntry: assetJournalEntry };
    const tx = makeTx({
      purchaseReceipt: {
        create: jest.fn().mockResolvedValue({ id: receipt.id }),
        findFirst: jest.fn().mockResolvedValue(clearingReceipt),
        findUniqueOrThrow: jest.fn().mockResolvedValue(postedReceipt),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const { service, fiscal, numbers, audit } = makeService(tx, {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(clearingReceipt) },
    });
    jest.spyOn(service, "get").mockResolvedValueOnce(clearingReceipt as never);

    await expect(service.postInventoryAsset("org-1", "user-1", receipt.id)).resolves.toMatchObject({
      id: receipt.id,
      inventoryAssetJournalEntryId: assetJournalEntry.id,
    });

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", receipt.receiptDate, tx);
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.JOURNAL_ENTRY, tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          entryDate: receipt.receiptDate,
          description: "Inventory asset posting for purchase receipt PRC-000001",
          totalDebit: "14.0000",
          totalCredit: "14.0000",
        }),
      }),
    );
    expect(tx.purchaseReceipt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: receipt.id, organizationId: "org-1", inventoryAssetJournalEntryId: null }),
        data: expect.objectContaining({ inventoryAssetJournalEntryId: assetJournalEntry.id, inventoryAssetPostedById: "user-1" }),
      }),
    );
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "POST_INVENTORY_ASSET", entityType: "PurchaseReceipt" }));
  });

  it("blocks receipt asset posting without compatible settings or unit cost", async () => {
    const clearingReceipt = {
      ...receipt,
      purchaseBillId: "bill-1",
      purchaseBill: linkedClearingBill,
      lines: [{ ...receipt.lines[0], unitCost: null, purchaseBillLine: previewBillLine }],
    };
    const missingCost = makeService(makeTx({ purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(clearingReceipt) } }), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(clearingReceipt) },
    });
    jest.spyOn(missingCost.service, "get").mockResolvedValueOnce(clearingReceipt as never);

    await expectBadRequestMessage(missingCost.service.postInventoryAsset("org-1", "user-1", receipt.id), "Purchase receipt line 1 is missing unit cost.");

    const disabled = makeService(makeTx(), { purchaseReceipt: { findFirst: jest.fn().mockResolvedValue({ ...clearingReceipt, lines: receipt.lines }) } });
    jest.spyOn(disabled.service, "get").mockResolvedValueOnce({ ...clearingReceipt, lines: receipt.lines } as never);
    disabled.inventoryAccounting.previewReadiness.mockResolvedValueOnce({
      settings: {
        valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
        enableInventoryAccounting: false,
        inventoryAssetAccount: assetAccount,
        inventoryClearingAccount: clearingAccount,
        purchaseReceiptPostingMode: InventoryPurchasePostingMode.PREVIEW_ONLY,
      },
      blockingReasons: [],
      warnings: [],
    });

    await expectBadRequestMessage(
      disabled.service.postInventoryAsset("org-1", "user-1", receipt.id),
      "Inventory accounting must be enabled before purchase receipt asset posting.",
    );
  });

  it("reverses receipt inventory asset posting and rejects double reversal", async () => {
    const postedReceipt = { ...receipt, inventoryAssetJournalEntryId: assetJournalEntry.id, inventoryAssetJournalEntry: assetJournalEntry };
    const reversedReceipt = {
      ...postedReceipt,
      inventoryAssetReversalJournalEntryId: "journal-reversal-1",
      inventoryAssetReversalJournalEntry: { id: "journal-reversal-1", entryNumber: "JE-000002" },
    };
    const tx = makeTx({
      purchaseReceipt: {
        findFirst: jest.fn().mockResolvedValue(postedReceipt),
        findUniqueOrThrow: jest.fn().mockResolvedValue(reversedReceipt),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      journalEntry: {
        create: jest.fn().mockResolvedValue({ id: "journal-reversal-1", entryNumber: "JE-000002" }),
        update: jest.fn().mockResolvedValue({ id: assetJournalEntry.id }),
      },
    });
    const { service, fiscal, audit } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(postedReceipt as never);

    await expect(service.reverseInventoryAsset("org-1", "user-1", receipt.id, { reason: "Review correction" })).resolves.toMatchObject({
      inventoryAssetReversalJournalEntryId: "journal-reversal-1",
    });

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", expect.any(Date), tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          reversalOfId: assetJournalEntry.id,
          totalDebit: "14.0000",
          totalCredit: "14.0000",
        }),
      }),
    );
    expect(tx.journalEntry.update).toHaveBeenCalledWith({ where: { id: assetJournalEntry.id }, data: { status: JournalEntryStatus.REVERSED } });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVERSE_INVENTORY_ASSET", entityType: "PurchaseReceipt" }));

    const twice = makeService(makeTx({ purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(reversedReceipt) } }));
    jest.spyOn(twice.service, "get").mockResolvedValueOnce(reversedReceipt as never);
    await expect(twice.service.reverseInventoryAsset("org-1", "user-1", receipt.id, {})).rejects.toThrow(
      "Inventory asset posting has already been reversed for this purchase receipt.",
    );
  });

  it("blocks receipt void while asset posting is active and allows void after reversal", async () => {
    const activeAssetReceipt = { ...receipt, inventoryAssetJournalEntryId: assetJournalEntry.id, inventoryAssetReversalJournalEntryId: null };
    const active = makeService(makeTx());
    jest.spyOn(active.service, "get").mockResolvedValueOnce(activeAssetReceipt as never);
    await expect(active.service.void("org-1", "user-1", receipt.id)).rejects.toThrow(
      "Reverse inventory asset posting before voiding this purchase receipt.",
    );

    const reversedAssetReceipt = { ...receipt, inventoryAssetJournalEntryId: assetJournalEntry.id, inventoryAssetReversalJournalEntryId: "journal-reversal-1" };
    const tx = makeTx({
      purchaseReceipt: {
        findFirst: jest.fn().mockResolvedValue(reversedAssetReceipt),
        findUniqueOrThrow: jest.fn().mockResolvedValue(reversedAssetReceipt),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const reversed = makeService(tx);
    jest.spyOn(reversed.service, "get").mockResolvedValueOnce(reversedAssetReceipt as never);

    await expect(reversed.service.void("org-1", "user-1", receipt.id)).resolves.toMatchObject({ id: receipt.id });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_OUT, referenceType: "PurchaseReceiptVoid" }) }),
    );
  });

  it("warns when receipt preview is standalone or linked only to a purchase order", async () => {
    const { service } = makeService(makeTx(), {
      purchaseReceipt: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ ...receipt, purchaseOrderId: null, purchaseBillId: null })
          .mockResolvedValueOnce({ ...receipt, purchaseOrderId: "po-1", purchaseBillId: null }),
      },
    });

    await expect(service.accountingPreview("org-1", receipt.id)).resolves.toEqual(
      expect.objectContaining({ warnings: expect.arrayContaining([expect.stringContaining("Standalone receipt")]) }),
    );
    await expect(service.accountingPreview("org-1", receipt.id)).resolves.toEqual(
      expect.objectContaining({ warnings: expect.arrayContaining([expect.stringContaining("Bill matching is not available")]) }),
    );
  });

  it("returns purchase bill receipt matching status with matched quantities", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseBill: {
        findFirst: jest.fn().mockResolvedValue({
          id: "bill-1",
          billNumber: "BILL-000001",
          status: PurchaseBillStatus.FINALIZED,
          total: new Prisma.Decimal("32.0000"),
          supplier: { id: supplier.id, name: "Supplier", displayName: null },
          lines: [{ ...previewBillLine, item: previewItem }],
        }),
      },
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            purchaseBillLineId: billLine.id,
            quantity: new Prisma.Decimal("4.0000"),
            unitCost: new Prisma.Decimal("8.0000"),
            receipt: { id: receipt.id, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate, status: PurchaseReceiptStatus.POSTED },
          },
        ]),
      },
    });

    await expect(service.purchaseBillReceiptMatchingStatus("org-1", "bill-1")).resolves.toEqual(
      expect.objectContaining({
        status: "FULLY_RECEIVED",
        receiptCount: 1,
        receiptValue: "32.0000",
        lines: [expect.objectContaining({ receivedQuantity: "4.0000", remainingQuantity: "0.0000" })],
      }),
    );
    expect(prisma.purchaseBill.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "bill-1", organizationId: "org-1" } }));
  });

  it("returns purchase order receipt matching status with bill matching warning", async () => {
    const { service } = makeService(makeTx(), {
      purchaseOrder: {
        findFirst: jest.fn().mockResolvedValue({
          id: "po-1",
          purchaseOrderNumber: "PO-000001",
          status: PurchaseOrderStatus.APPROVED,
          total: new Prisma.Decimal("35.0000"),
          supplier: { id: supplier.id, name: "Supplier", displayName: null },
          convertedBill: null,
          lines: [{ id: poLine.id, description: "Tracked PO line", item: previewItem, quantity: poLine.quantity, unitPrice: poLine.unitPrice }],
        }),
      },
      purchaseReceiptLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            purchaseOrderLineId: poLine.id,
            quantity: new Prisma.Decimal("2.0000"),
            unitCost: new Prisma.Decimal("7.0000"),
            receipt: { id: receipt.id, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate, status: PurchaseReceiptStatus.POSTED },
          },
        ]),
      },
    });

    await expect(service.purchaseOrderReceiptMatchingStatus("org-1", "po-1")).resolves.toEqual(
      expect.objectContaining({
        status: "PARTIALLY_RECEIVED",
        receiptValueEstimate: "14.0000",
        warnings: expect.arrayContaining([expect.stringContaining("Bill matching is not available")]),
      }),
    );
  });

  it("keeps receipt matching status tenant-scoped", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseBill: { findFirst: jest.fn().mockResolvedValue(null) },
      purchaseOrder: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.purchaseBillReceiptMatchingStatus("other-org", "bill-1")).rejects.toThrow("Purchase bill not found.");
    await expect(service.purchaseOrderReceiptMatchingStatus("other-org", "po-1")).rejects.toThrow("Purchase order not found.");
    expect(prisma.purchaseBill.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "bill-1", organizationId: "other-org" } }));
    expect(prisma.purchaseOrder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "po-1", organizationId: "other-org" } }));
  });

  it("blocks purchase receipt preview lines that are missing unit cost", async () => {
    const missingCostReceipt = { ...receipt, lines: [{ ...receipt.lines[0], unitCost: null }] };
    const { service } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(missingCostReceipt) },
    });

    const preview = await service.accountingPreview("org-1", receipt.id);

    expect(preview.blockingReasons).toContain("Purchase receipt line 1 is missing unit cost.");
    expect(preview.lines[0]).toEqual(expect.objectContaining({ unitCost: null, lineValue: null }));
  });

  it("keeps purchase receipt accounting preview tenant-scoped", async () => {
    const { service, prisma } = makeService(makeTx(), {
      purchaseReceipt: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.accountingPreview("other-org", receipt.id)).rejects.toThrow("Purchase receipt not found.");
    expect(prisma.purchaseReceipt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: receipt.id, organizationId: "other-org" } }));
  });

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
});
