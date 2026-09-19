import { PrismaClient, Prisma, AccountType, ItemType, StockMovementType } from "@prisma/client";
import { createValuedStockMovement, lockInventory } from "./valued-stock-movement";
import { completeInventoryCommand, inventoryCommandIdentity, readInventoryCommand } from "./inventory-command";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_EVENTS } from "../audit-log/audit-events";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { InventoryAccountingService } from "./inventory-accounting.service";
import { InventoryMovementAccountingService } from "./inventory-movement-accounting.service";
import { PurchaseReceiptService } from "../purchase-receipts/purchase-receipt.service";
import { SalesStockIssueService } from "../sales-stock-issues/sales-stock-issue.service";
import { SalesInventoryReturnService } from "../sales-inventory-returns/sales-inventory-return.service";
import { WarehouseTransferService } from "../warehouse-transfers/warehouse-transfer.service";
import { PurchaseReturnService } from "../purchase-returns/purchase-return.service";
import { FiscalPeriodService } from "../fiscal-periods/fiscal-period.service";
import { AccountingService } from "../accounting/accounting.service";
import { PurchaseBillService } from "../purchase-bills/purchase-bill.service";
import { SalesInvoiceService } from "../sales-invoices/sales-invoice.service";

// Run only against a disposable loopback database. Root runner owns schema deployment and database teardown.
const databaseUrl = process.env.INVENTORY_TEST_DATABASE_URL;
const localSuite = databaseUrl ? describe : describe.skip;
localSuite("inventory valuation disposable PostgreSQL proof", () => {
  let prisma: PrismaClient;
  beforeAll(() => {
    const url = new URL(databaseUrl!);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !/test|proof|inventory/i.test(url.pathname)) throw new Error("Inventory DB proof requires an explicitly named disposable loopback test database.");
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  });
  afterAll(async () => { await prisma?.$disconnect(); });

  async function fixture() {
    const organization = await prisma.organization.create({ data: { name: "Synthetic inventory proof" } });
    const account = await prisma.account.create({ data: { organizationId: organization.id, name: "Synthetic revenue", code: "400", type: AccountType.REVENUE } });
    const item = await prisma.item.create({ data: { organizationId: organization.id, name: "Synthetic stock", type: ItemType.PRODUCT, sellingPrice: "20", revenueAccountId: account.id, inventoryTracking: true } });
    const warehouse = await prisma.warehouse.create({ data: { organizationId: organization.id, code: "TEST", name: "Synthetic warehouse" } });
    return { organizationId: organization.id, itemId: item.id, warehouseId: warehouse.id };
  }
  async function movement(key: Awaited<ReturnType<typeof fixture>>, quantity: string, type: StockMovementType, day: number, totalCost?: string, source?: string) {
    return prisma.$transaction((tx) => createValuedStockMovement(tx, { data: { ...key, quantity, type, movementDate: new Date(Date.UTC(2026, 8, day)), totalCost, valuationSourceMovementId: source } }));
  }

  it("persists sequential costs, original-cost returns, and rejects updates to valued movements", async () => {
    const key = await fixture();
    await movement(key, "10", StockMovementType.OPENING_BALANCE, 1, "100");
    const issue = await movement(key, "8", StockMovementType.SALES_ISSUE_PLACEHOLDER, 2);
    await movement(key, "10", StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, 3, "200");
    const beforeReturn = await prisma.inventoryValuationBalance.findUniqueOrThrow({ where: { organizationId_itemId_warehouseId: key } });
    expect([beforeReturn.quantity.toFixed(4), beforeReturn.value.toFixed(4), beforeReturn.value.div(beforeReturn.quantity).toFixed(4)]).toEqual(["12.0000", "220.0000", "18.3333"]);
    const returned = await movement(key, "2", StockMovementType.SALES_RETURN_IN, 4, undefined, issue.id);
    expect(returned.totalCost?.toFixed(4)).toBe("20.0000");
    const balance = await prisma.inventoryValuationBalance.findUniqueOrThrow({ where: { organizationId_itemId_warehouseId: key } });
    expect([balance.quantity.toFixed(4), balance.value.toFixed(4), balance.sequence]).toEqual(["14.0000", "240.0000", 4]);
    await expect(prisma.stockMovement.update({ where: { id: issue.id }, data: { totalCost: "1" } })).rejects.toThrow();
    expect((await prisma.stockMovement.findUniqueOrThrow({ where: { id: issue.id } })).totalCost?.toFixed(4)).toBe("80.0000");
  });

  it("serializes competing issues and rolls the losing transaction back without a partial ledger entry", async () => {
    const key = await fixture();
    await movement(key, "10", StockMovementType.OPENING_BALANCE, 1, "100");
    const results = await Promise.allSettled([movement(key, "8", StockMovementType.SALES_ISSUE_PLACEHOLDER, 2), movement(key, "8", StockMovementType.SALES_ISSUE_PLACEHOLDER, 2)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.stockMovement.count({ where: key })).toBe(2);
    const balance = await prisma.inventoryValuationBalance.findUniqueOrThrow({ where: { organizationId_itemId_warehouseId: key } });
    expect(balance.quantity.toFixed(4)).toBe("2.0000");
  });

  it("rejects closed periods, backdating, source over-returns, and foreign-tenant source movements", async () => {
    const key = await fixture();
    await movement(key, "10", StockMovementType.OPENING_BALANCE, 3, "100");
    await expect(movement(key, "1", StockMovementType.SALES_ISSUE_PLACEHOLDER, 2)).rejects.toThrow("precede");
    const issue = await movement(key, "2", StockMovementType.SALES_ISSUE_PLACEHOLDER, 4);
    await movement(key, "2", StockMovementType.SALES_RETURN_IN, 5, undefined, issue.id);
    await expect(movement(key, "1", StockMovementType.SALES_RETURN_IN, 6, undefined, issue.id)).rejects.toThrow("exceeds");
    const other = await fixture();
    await expect(movement(other, "1", StockMovementType.SALES_RETURN_IN, 6, undefined, issue.id)).rejects.toThrow("original valued source");
    await prisma.fiscalPeriod.create({ data: { organizationId: key.organizationId, name: "Closed proof", startsOn: new Date("2026-09-01"), endsOn: new Date("2026-09-30"), status: "CLOSED" } });
    await expect(movement(key, "1", StockMovementType.SALES_ISSUE_PLACEHOLDER, 6)).rejects.toThrow("closed");
    expect(await prisma.stockMovement.count({ where: key })).toBe(3);
  });

  it("commits an idempotent result with its stock movement and replays concurrent retries once", async () => {
    const key = await fixture();
    const command = inventoryCommandIdentity(key.organizationId, "proof:opening", "same-command-001", { quantity: 1 });
    const run = () => prisma.$transaction(async (tx) => {
      await lockInventory(tx, key.organizationId);
      const replay = await readInventoryCommand(tx, command);
      if (replay) return replay;
      const created = await createValuedStockMovement(tx, { data: { ...key, quantity: "1", totalCost: "10", type: StockMovementType.OPENING_BALANCE, movementDate: new Date("2026-09-01") } });
      await completeInventoryCommand(tx, command, created.id);
      return created.id;
    });
    const results = await Promise.all([run(), run()]);
    expect(results[0]).toBe(results[1]);
    expect(await prisma.stockMovement.count({ where: key })).toBe(1);
  });

  it("does not silently reprice legacy balances", async () => {
    const key = await fixture();
    await prisma.stockMovement.create({ data: { ...key, quantity: "1", unitCost: "1", totalCost: "1", type: StockMovementType.OPENING_BALANCE, movementDate: new Date("2026-09-01") } });
    await expect(movement(key, "1", StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, 2, "2")).rejects.toThrow("cutover");
    expect(await prisma.inventoryValuationBalance.count({ where: key })).toBe(0);
  });

  it("preserves a committed fiscal lock when reopen already read CLOSED", async () => {
    const key = await fixture();
    const user = await prisma.user.create({ data: { email: `fiscal-race-${key.organizationId}@example.test`, name: "Synthetic reviewer", passwordHash: "synthetic-unusable-hash" } });
    const audit = new AuditLogService(prisma as never);
    const periods = new FiscalPeriodService(prisma as never, audit, { assertReadyForPeriodClose: jest.fn().mockResolvedValue(undefined) } as never);
    const period = await prisma.fiscalPeriod.create({ data: { organizationId: key.organizationId, name: "Concurrent close proof", startsOn: new Date("2026-09-01"), endsOn: new Date("2026-09-30"), status: "CLOSED" } });
    let observedClosed!: () => void;
    let releaseReopen!: () => void;
    const readComplete = new Promise<void>((resolve) => { observedClosed = resolve; });
    const continueReopen = new Promise<void>((resolve) => { releaseReopen = resolve; });
    const originalGet = periods.get.bind(periods);
    jest.spyOn(periods, "get").mockImplementationOnce(async (org, id) => {
      const snapshot = await originalGet(org, id);
      observedClosed();
      await continueReopen;
      return snapshot;
    });
    const reopenResult = periods.reopen(key.organizationId, user.id, period.id).then(() => null, (error: unknown) => error);
    await readComplete;
    try { expect((await periods.lock(key.organizationId, user.id, period.id)).status).toBe("LOCKED"); }
    finally { releaseReopen(); }
    expect(await reopenResult).toMatchObject({ message: "Fiscal period state changed while reopening. Reload and retry." });
    expect((await originalGet(key.organizationId, period.id)).status).toBe("LOCKED");
    expect(await prisma.auditLog.count({ where: { organizationId: key.organizationId, entityId: period.id, action: AUDIT_EVENTS.FISCAL_PERIOD_REOPENED } })).toBe(0);
  });

  it("reconciles actual receipt, issue, manual COGS, source return, and transfer service writes", async () => {
    const key = await fixture();
    const organizationId = key.organizationId;
    const user = await prisma.user.create({ data: { email: `inventory-${organizationId}@example.test`, name: "Synthetic reviewer", passwordHash: "synthetic-unusable-hash" } });
    const supplier = await prisma.contact.create({ data: { organizationId, name: "Synthetic supplier", type: "SUPPLIER" } });
    const customer = await prisma.contact.create({ data: { organizationId, name: "Synthetic customer", type: "CUSTOMER" } });
    const asset = await prisma.account.create({ data: { organizationId, name: "Inventory", code: "130", type: "ASSET" } });
    const clearing = await prisma.account.create({ data: { organizationId, name: "Inventory clearing", code: "240", type: "LIABILITY" } });
    const payable = await prisma.account.create({ data: { organizationId, name: "Accounts payable", code: "210", type: "LIABILITY" } });
    const cogs = await prisma.account.create({ data: { organizationId, name: "COGS", code: "510", type: "COST_OF_SALES" } });
    const gain = await prisma.account.create({ data: { organizationId, name: "Inventory gain", code: "490", type: "REVENUE" } });
    const loss = await prisma.account.create({ data: { organizationId, name: "Inventory loss", code: "690", type: "EXPENSE" } });
    await prisma.inventorySettings.create({ data: { organizationId, enableInventoryAccounting: true, inventoryAssetAccountId: asset.id,
      inventoryClearingAccountId: clearing.id, cogsAccountId: cogs.id, inventoryAdjustmentGainAccountId: gain.id, inventoryAdjustmentLossAccountId: loss.id, purchaseReceiptPostingMode: "PREVIEW_ONLY" } });
    const audit = new AuditLogService(prisma as never);
    const numbers = new NumberSequenceService(prisma as never);
    const fiscal = new FiscalPeriodGuardService(prisma as never);
    const accounting = new InventoryAccountingService(prisma as never);
    const receipts = new PurchaseReceiptService(prisma as never, audit, numbers, accounting, fiscal);
    const issues = new SalesStockIssueService(prisma as never, audit, numbers, accounting, fiscal);
    const returns = new SalesInventoryReturnService(prisma as never, audit, numbers);
    const purchaseReturns = new PurchaseReturnService(prisma as never, audit, numbers);
    const transfers = new WarehouseTransferService(prisma as never, audit, numbers);
    const movementAccounting = new InventoryMovementAccountingService(prisma as never, numbers, fiscal);
    const periods = new FiscalPeriodService(prisma as never, audit, { assertReadyForPeriodClose: jest.fn().mockResolvedValue(undefined) } as never);
    const journals = new AccountingService(prisma as never, audit, numbers, fiscal);
    const bills = new PurchaseBillService(prisma as never, audit, numbers, undefined, undefined, fiscal);
    const invoices = new SalesInvoiceService(prisma as never, audit, numbers, journals, undefined, undefined, fiscal);
    const period = await periods.create(organizationId, user.id, { name: "Synthetic September", startsOn: "2026-09-01", endsOn: "2026-09-30" });
    async function sourceBill(number: string, baseValue: string, currency: string, transactionValue: string, unitPrice: string) {
      const transactionGross = new Prisma.Decimal(unitPrice).mul(7);
      const transactionDiscount = transactionGross.minus(transactionValue);
      const fxRate = currency === "USD" ? new Prisma.Decimal("3.75") : new Prisma.Decimal(1);
      return prisma.$transaction(async (tx) => {
        const journal = await tx.journalEntry.create({ data: { organizationId, entryNumber: `SOURCE-${number}`, status: "POSTED", entryDate: new Date("2026-09-01"),
          description: "Synthetic finalized bill source", currency: "SAR", totalDebit: baseValue, totalCredit: baseValue,
          lines: { create: [
            { organizationId, accountId: clearing.id, lineNumber: 1, debit: baseValue, credit: "0", currency: "SAR" },
            { organizationId, accountId: payable.id, lineNumber: 2, debit: "0", credit: baseValue, currency: "SAR" },
          ] } } });
        return tx.purchaseBill.create({ data: { organizationId, supplierId: supplier.id, billNumber: number, billDate: new Date("2026-09-01"), status: "FINALIZED",
          inventoryPostingMode: "INVENTORY_CLEARING", journalEntryId: journal.id, currency, baseCurrency: "SAR", exchangeRate: currency === "USD" ? "3.75" : "1",
          rateDate: new Date("2026-09-01"), rateSource: currency === "USD" ? "MANUAL" : "SYSTEM_RATE_1",
          total: baseValue, taxableTotal: baseValue, balanceDue: baseValue, transactionTotal: transactionValue, transactionTaxableTotal: transactionValue,
          lines: { create: [{ organizationId, itemId: key.itemId, accountId: clearing.id, description: "Synthetic discounted goods", quantity: "7", unitPrice,
            lineGrossAmount: transactionGross.mul(fxRate), discountAmount: transactionDiscount.mul(fxRate),
            transactionLineGrossAmount: transactionGross, transactionDiscountAmount: transactionDiscount,
            taxableAmount: baseValue, lineTotal: baseValue, transactionTaxableAmount: transactionValue, transactionLineTotal: transactionValue }] } }, include: { lines: true } });
      });
    }
    // These finalized source fixtures match PurchaseBillService's storage contract: unitPrice remains transaction-currency,
    // while taxableAmount is the already converted, discounted base-currency net cost.
    const bill = await sourceBill("USD-DISCOUNT", "37.5000", "USD", "10.0000", "1.4300");
    // A stock document's financial source is protected even before any receipt/issue exists.
    await expect(journals.reverse(organizationId, user.id, bill.journalEntryId!)).rejects.toThrow("linked inventory accounting workflow");
    const canceledBill = await sourceBill("CANCELED-BEFORE-STOCK", "14", "SAR", "14", "2");
    const canceled = await bills.void(organizationId, user.id, canceledBill.id);
    await expect(journals.reverse(organizationId, user.id, canceled.reversalJournalEntryId!)).rejects.toThrow("linked inventory accounting workflow");
    const replacementClearing = await prisma.account.create({ data: { organizationId, name: "New clearing mapping", code: "241", type: "LIABILITY" } });
    await accounting.updateSettings(organizationId, { inventoryClearingAccountId: replacementClearing.id });
    const foreignOrder = await prisma.purchaseOrder.create({ data: { organizationId, supplierId: supplier.id, purchaseOrderNumber: "SYNTHETIC-USD-PO",
      orderDate: new Date("2026-09-01"), currency: "USD", status: "APPROVED", lines: { create: [{ organizationId, itemId: key.itemId, description: "USD source price", quantity: "1", unitPrice: "10" }] } }, include: { lines: true } });
    await expect(receipts.create(organizationId, user.id, { purchaseOrderId: foreignOrder.id, warehouseId: key.warehouseId, receiptDate: "2026-09-01",
      lines: [{ purchaseOrderLineId: foreignOrder.lines[0]!.id, quantity: "1" }] }, "foreign-order-reject")).rejects.toThrow("reviewed exchange-rate");
    const receiptCosts: string[] = [];
    let returnReceiptId = "";
    let returnReceiptLineId = "";
    for (const [index, quantity] of ["1", "1", "1", "4"].entries()) {
      const dto = { purchaseBillId: bill.id, warehouseId: key.warehouseId, receiptDate: "2026-09-01", lines: [{ purchaseBillLineId: bill.lines[0]!.id, quantity }] };
      const receipt = await receipts.create(organizationId, user.id, dto, `receipt-part-${index}`);
      returnReceiptId = receipt.id;
      returnReceiptLineId = receipt.lines[0]!.id;
      expect((await receipts.create(organizationId, user.id, dto, `receipt-part-${index}`)).id).toBe(receipt.id);
      expect(await prisma.auditLog.count({ where: { organizationId, entityType: "PurchaseReceipt", entityId: receipt.id, action: AUDIT_EVENTS.PURCHASE_RECEIPT_CREATED } })).toBe(1);
      const preview = await receipts.accountingPreview(organizationId, receipt.id);
      expect(preview.journal.lines).toContainEqual(expect.objectContaining({ side: "CREDIT", accountId: clearing.id }));
      expect(preview.journal.lines).not.toContainEqual(expect.objectContaining({ accountId: replacementClearing.id }));
      receiptCosts.push(preview.journal.totalDebit);
      expect(preview.journal.totalDebit).toBe(preview.lines[0]!.matchedBillValue);
      if (index === 0) {
        await expect(bills.void(organizationId, user.id, bill.id)).rejects.toThrow("active inventory");
        expect((await prisma.purchaseBill.findUniqueOrThrow({ where: { id: bill.id } })).status).toBe("FINALIZED");
        await expect(periods.close(organizationId, user.id, period.id)).rejects.toThrow("Inventory must be reconciled");
        await expect(periods.lock(organizationId, user.id, period.id)).rejects.toThrow("Inventory must be reconciled");
        expect((await periods.get(organizationId, period.id)).status).toBe("OPEN");
      }
      await receipts.postInventoryAsset(organizationId, user.id, receipt.id);
    }
    expect(receiptCosts).toEqual(["5.3571", "5.3572", "5.3571", "21.4286"]);
    const matching = await receipts.purchaseBillReceiptMatchingStatus(organizationId, bill.id);
    expect(matching.lines[0]).toMatchObject({ receivedValue: "37.5000", matchedBillValue: "37.5000", valueDifference: "0.0000" });
    expect((await movementAccounting.reconciliation(organizationId)).reconciled).toBe(true);
    const receivable = await prisma.account.create({ data: { organizationId, name: "Accounts receivable", code: "120", type: "ASSET" } });
    const revenue = await prisma.account.findFirstOrThrow({ where: { organizationId, code: "400" } });
    const invoiceJournal = await prisma.journalEntry.create({ data: { organizationId, entryNumber: "SOURCE-SYNTHETIC-SALE", status: "POSTED", entryDate: new Date("2026-09-02"),
      description: "Synthetic sale financial source", currency: "SAR", totalDebit: "60", totalCredit: "60", lines: { create: [
        { organizationId, accountId: receivable.id, lineNumber: 1, debit: "60", credit: "0", currency: "SAR" },
        { organizationId, accountId: revenue.id, lineNumber: 2, debit: "0", credit: "60", currency: "SAR" },
      ] } } });
    const invoice = await prisma.salesInvoice.create({ data: { organizationId, customerId: customer.id, invoiceNumber: "SYNTHETIC-SALE", issueDate: new Date("2026-09-02"), status: "FINALIZED",
      journalEntryId: invoiceJournal.id,
      currency: "SAR", baseCurrency: "SAR", exchangeRate: "1", rateDate: new Date("2026-09-02"), rateSource: "SYSTEM_RATE_1",
      lines: { create: [{ organizationId, itemId: key.itemId, accountId: cogs.id, description: "Synthetic inventory sale source", quantity: "3", unitPrice: "20" }] } }, include: { lines: true } });
    await expect(journals.reverse(organizationId, user.id, invoiceJournal.id)).rejects.toThrow("linked inventory accounting workflow");
    const issue = await issues.create(organizationId, user.id, { salesInvoiceId: invoice.id, warehouseId: key.warehouseId, issueDate: "2026-09-02",
      lines: [{ salesInvoiceLineId: invoice.lines[0]!.id, quantity: "3", unitCost: "999" }] }, "issue-original-001");
    expect(issue.lines[0]!.unitCost?.toFixed(4)).toBe("5.3571");
    await expect(invoices.void(organizationId, user.id, invoice.id)).rejects.toThrow("active inventory");
    expect((await prisma.salesInvoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe("FINALIZED");
    const secondBill = await sourceBill("SAR-NEW-PRICE", "70", "SAR", "70", "10");
    const nextReceipt = await receipts.create(organizationId, user.id, { purchaseBillId: secondBill.id, warehouseId: key.warehouseId, receiptDate: "2026-09-03",
      lines: [{ purchaseBillLineId: secondBill.lines[0]!.id, quantity: "7" }] }, "receipt-new-price");
    await receipts.postInventoryAsset(organizationId, user.id, nextReceipt.id);
    // COGS posted after a later price change must retain the cost recorded at issue time.
    const postedIssue = await issues.postCogs(organizationId, user.id, issue.id);
    const cogsJournal = await prisma.journalEntry.findUniqueOrThrow({ where: { id: postedIssue.cogsJournalEntryId! } });
    expect(cogsJournal.totalDebit.toFixed(4)).toBe("16.0714");
    await expect(journals.reverse(organizationId, user.id, cogsJournal.id)).rejects.toThrow("inventory");
    expect((await prisma.journalEntry.findUniqueOrThrow({ where: { id: cogsJournal.id } })).status).toBe("POSTED");
    const salesReturn = await returns.create(organizationId, user.id, { customerId: customer.id, returnDate: "2026-09-04", sourceSalesStockIssueId: issue.id,
      lines: [{ sourceSalesStockIssueLineId: issue.lines[0]!.id, itemId: key.itemId, warehouseId: key.warehouseId, quantity: "1" }] });
    await returns.submit(organizationId, user.id, salesReturn.id);
    await returns.approve(organizationId, user.id, salesReturn.id);
    const postedReturn = await returns.postInventoryReturnMovement(organizationId, user.id, salesReturn.id);
    const returnMovement = await prisma.stockMovement.findUniqueOrThrow({ where: { id: postedReturn.lines[0]!.stockMovementId! } });
    expect(returnMovement.totalCost?.toFixed(4)).toBe("5.3571");
    await movementAccounting.post(organizationId, user.id, returnMovement.id, {});
    await expect(issues.reverseCogs(organizationId, user.id, issue.id)).rejects.toThrow("Returned stock");
    const destination = await prisma.warehouse.create({ data: { organizationId, code: "DEST", name: "Synthetic destination" } });
    const transferDto = { itemId: key.itemId, fromWarehouseId: key.warehouseId, toWarehouseId: destination.id, quantity: "2", unitCost: "999", transferDate: "2026-09-05" };
    const transfer = await transfers.create(organizationId, user.id, transferDto, "transfer-original-001");
    expect((await transfers.create(organizationId, user.id, transferDto, "transfer-original-001")).id).toBe(transfer.id);
    expect(await prisma.stockMovement.count({ where: { organizationId, referenceType: "WarehouseTransfer", referenceId: transfer.id } })).toBe(2);
    const transferMovements = await prisma.stockMovement.findMany({ where: { id: { in: [transfer.fromStockMovementId!, transfer.toStockMovementId!] } } });
    expect(transferMovements[0]!.totalCost?.toFixed(4)).toBe(transferMovements[1]!.totalCost?.toFixed(4));
    const result = await movementAccounting.reconciliation(organizationId);
    expect(result).toMatchObject({ subledgerValue: "96.7857", inventoryAssetBalance: "96.7857", difference: "0.0000", reconciled: true });
    const purchaseReturn = await purchaseReturns.create(organizationId, user.id, { supplierId: supplier.id, returnDate: "2026-09-06", sourcePurchaseReceiptId: returnReceiptId,
      lines: [{ sourcePurchaseReceiptLineId: returnReceiptLineId, itemId: key.itemId, quantity: "2" }] });
    await purchaseReturns.submit(organizationId, user.id, purchaseReturn.id);
    await purchaseReturns.approve(organizationId, user.id, purchaseReturn.id);
    const returnedToSupplier = await purchaseReturns.postInventoryReturnMovement(organizationId, user.id, purchaseReturn.id);
    const purchaseReturnMovement = await prisma.stockMovement.findUniqueOrThrow({ where: { id: returnedToSupplier.lines[0]!.stockMovementId! } });
    expect(purchaseReturnMovement.valuationSourceValue?.toFixed(4)).toBe("10.7143");
    expect(purchaseReturnMovement.totalCost?.toFixed(4)).toBe("16.1309");
    const returnReview = await movementAccounting.preview(organizationId, purchaseReturnMovement.id);
    expect(returnReview).toMatchObject({ originalSourceCost: "10.7143", inventoryCarryingCost: "16.1309", purchaseReturnVariance: "-5.4166" });
    expect(returnReview.lines).toContainEqual({ accountId: loss.id, side: "DEBIT", amount: "5.4166" });
    await movementAccounting.post(organizationId, user.id, purchaseReturnMovement.id, {});
    expect(await movementAccounting.reconciliation(organizationId)).toMatchObject({ subledgerValue: "80.6548", inventoryAssetBalance: "80.6548", difference: "0.0000", reconciled: true });
    expect((await periods.close(organizationId, user.id, period.id)).status).toBe("CLOSED");
    expect((await periods.lock(organizationId, user.id, period.id)).status).toBe("LOCKED");
  }, 30000);
});
