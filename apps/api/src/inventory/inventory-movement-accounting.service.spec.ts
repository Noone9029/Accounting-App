import { AccountType, JournalEntryStatus, Prisma, StockMovementType } from "@prisma/client";
import { InventoryMovementAccountingService } from "./inventory-movement-accounting.service";

describe("reviewed inventory movement accounting", () => {
  function harness(type: StockMovementType = StockMovementType.SALES_RETURN_IN) {
    const movement = { id: "return-movement", organizationId: "tenant-a", type, referenceType: "SalesInventoryReturn", valuationVersion: 1,
      totalCost: new Prisma.Decimal("20"), valuationSourceValue: null as Prisma.Decimal | null, valuationSourceMovementId: "original-issue", movementDate: new Date("2026-09-19") };
    const originalJournal = { status: JournalEntryStatus.POSTED as JournalEntryStatus, currency: "SAR", lines: [
      { accountId: "original-cogs", debit: new Prisma.Decimal(80), credit: new Prisma.Decimal(0) },
      { accountId: "original-asset", debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(80) },
    ] };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      stockMovement: { findFirst: jest.fn().mockResolvedValue(movement) },
      inventorySettings: { findUnique: jest.fn().mockResolvedValue({ enableInventoryAccounting: true, inventoryAssetAccountId: "current-asset", inventoryClearingAccountId: "current-clearing", cogsAccountId: "current-cogs", inventoryAdjustmentGainAccountId: "gain", inventoryAdjustmentLossAccountId: "loss" }) },
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "SAR" }) },
      account: { count: jest.fn().mockResolvedValue(2), findFirst: jest.fn().mockResolvedValue({ id: "opening-equity", type: AccountType.EQUITY }) },
      salesStockIssueLine: { findFirst: jest.fn().mockResolvedValue({ issue: { cogsJournalEntry: originalJournal } }) },
      purchaseReceiptLine: { findFirst: jest.fn() },
      purchaseReceipt: { count: jest.fn().mockResolvedValue(0) },
      salesStockIssue: { count: jest.fn().mockResolvedValue(0) },
      inventoryMovementPosting: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockImplementation(({ data }) => ({ id: "review-1", ...data })) },
      journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-return" }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    };
    const prisma = { ...tx, $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)) };
    const numbers = { next: jest.fn().mockResolvedValue("JE-TEST") };
    const fiscal = { assertPostingDateAllowed: jest.fn() };
    return { service: new InventoryMovementAccountingService(prisma as never, numbers as never, fiscal as never), tx, movement, originalJournal, fiscal };
  }

  it("posts the exact returned issue cost to the original accounts even after mappings change", async () => {
    const { service, tx, fiscal } = harness();
    await service.post("tenant-a", "reviewer", "return-movement", {});
    expect(tx.journalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      totalDebit: "20.0000", totalCredit: "20.0000", currency: "SAR",
      lines: { create: [
        expect.objectContaining({ accountId: "original-asset", debit: "20.0000", credit: "0" }),
        expect.objectContaining({ accountId: "original-cogs", debit: "0", credit: "20.0000" }),
      ] },
    }) });
    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("tenant-a", new Date("2026-09-19"), tx);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("requires the original active financial posting before return accounting", async () => {
    const { service, tx, originalJournal } = harness();
    originalJournal.status = JournalEntryStatus.REVERSED;
    await expect(service.post("tenant-a", "reviewer", "return-movement", {})).rejects.toThrow("original active");
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("uses an explicitly reviewed equity account for opening inventory", async () => {
    const { service, tx, movement } = harness(StockMovementType.OPENING_BALANCE);
    movement.referenceType = "Opening";
    const result = await service.preview("tenant-a", movement.id, { openingEquityAccountId: "opening-equity" });
    expect(result).toMatchObject({ debitAccountId: "current-asset", creditAccountId: "opening-equity", amount: "20.0000" });
    expect(tx.account.findFirst).toHaveBeenCalledWith({ where: { id: "opening-equity", organizationId: "tenant-a", type: AccountType.EQUITY } });
    await expect(service.preview("tenant-a", movement.id)).rejects.toThrow("opening equity");
  });

  it("returns the durable review on retry without creating another journal or audit", async () => {
    const { service, tx } = harness();
    tx.inventoryMovementPosting.findFirst.mockResolvedValue({ id: "already-reviewed", movementId: "return-movement" });
    await expect(service.post("tenant-a", "reviewer", "return-movement", {})).resolves.toMatchObject({ id: "already-reviewed" });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.stockMovement.findFirst).not.toHaveBeenCalled();
  });

  it("does not allow an unknown or cross-tenant movement to produce journal entries", async () => {
    const { service, tx } = harness();
    tx.stockMovement.findFirst.mockResolvedValue(null);
    await expect(service.post("tenant-b", "reviewer", "return-movement", {})).rejects.toThrow("not found");
    expect(tx.stockMovement.findFirst).toHaveBeenCalledWith({ where: { id: "return-movement", organizationId: "tenant-b" } });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("records a zero-cost adjustment review without a meaningless zero-value journal", async () => {
    const { service, tx, movement } = harness(StockMovementType.ADJUSTMENT_IN);
    movement.totalCost = new Prisma.Decimal(0);
    const result = await service.post("tenant-a", "reviewer", "return-movement", {});
    expect(result).toMatchObject({ journalEntryId: null });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it("shows original purchase return credit separately from carrying cost and its reviewed variance", async () => {
    const { service, tx, movement } = harness(StockMovementType.PURCHASE_RETURN_OUT);
    movement.valuationSourceValue = new Prisma.Decimal(30);
    tx.purchaseReceiptLine.findFirst.mockResolvedValue({ receipt: { inventoryAssetJournalEntry: { status: JournalEntryStatus.POSTED, currency: "SAR", lines: [
      { accountId: "original-asset", debit: new Prisma.Decimal(100), credit: new Prisma.Decimal(0) },
      { accountId: "original-clearing", debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(100) },
    ] } } });
    tx.account.findFirst.mockResolvedValue({ id: "gain", type: AccountType.REVENUE });
    const preview = await service.preview("tenant-a", movement.id);
    expect(preview).toMatchObject({ originalSourceCost: "30.0000", inventoryCarryingCost: "20.0000", purchaseReturnVariance: "10.0000", amount: "30.0000", lines: [
      { accountId: "original-clearing", side: "DEBIT", amount: "30.0000" },
      { accountId: "original-asset", side: "CREDIT", amount: "20.0000" },
      { accountId: "gain", side: "CREDIT", amount: "10.0000" },
    ] });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    tx.account.findFirst.mockResolvedValue(null);
    await expect(service.post("tenant-a", "reviewer", movement.id, {})).rejects.toThrow("separate reviewed inventory gain/loss");
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("posts carrying loss on a return of reviewed free goods and rejects an incomplete source review", async () => {
    const { service, tx, movement } = harness(StockMovementType.PURCHASE_RETURN_OUT);
    movement.valuationSourceValue = new Prisma.Decimal(0);
    tx.purchaseReceiptLine.findFirst.mockResolvedValue({
      stockMovement: { valuationVersion: 1, totalCost: new Prisma.Decimal(0) },
      receipt: { id: "zero-source", status: "POSTED", inventoryAssetJournalEntry: null, inventoryAssetPostedAt: new Date("2026-09-01"), inventoryAssetPostedById: "reviewer", inventoryAssetReversalJournalEntryId: null },
    });
    tx.account.findFirst.mockResolvedValue({ id: "loss", type: AccountType.EXPENSE });
    expect(await service.preview("tenant-a", movement.id)).toMatchObject({ originalSourceCost: "0.0000", inventoryCarryingCost: "20.0000", purchaseReturnVariance: "-20.0000", amount: "20.0000", lines: [
      { accountId: "current-asset", side: "CREDIT", amount: "20.0000" },
      { accountId: "loss", side: "DEBIT", amount: "20.0000" },
    ] });
    tx.purchaseReceipt.count.mockResolvedValue(1);
    await expect(service.post("tenant-a", "reviewer", movement.id, {})).rejects.toThrow("zero-cost inventory review requires accountant reconciliation");
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });
});
