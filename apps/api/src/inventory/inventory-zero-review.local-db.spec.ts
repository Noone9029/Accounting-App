import { PrismaClient } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_EVENTS } from "../audit-log/audit-events";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { FiscalPeriodService } from "../fiscal-periods/fiscal-period.service";
import { PurchaseReceiptService } from "../purchase-receipts/purchase-receipt.service";
import { SalesStockIssueService } from "../sales-stock-issues/sales-stock-issue.service";
import { InventoryAccountingService } from "./inventory-accounting.service";
import { InventoryMovementAccountingService } from "./inventory-movement-accounting.service";
import { createValuedStockMovement } from "./valued-stock-movement";

const databaseUrl = process.env.INVENTORY_TEST_DATABASE_URL;
const localSuite = databaseUrl ? describe : describe.skip;
localSuite("zero-cost inventory review disposable PostgreSQL proof", () => {
  let prisma: PrismaClient;
  beforeAll(() => {
    const url = new URL(databaseUrl!);
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !/^\/ledgerbyte_[a-z0-9_]*(proof|test)[a-z0-9_]*$/.test(url.pathname)) throw new Error("Disposable loopback proof database required.");
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  });
  afterAll(async () => { await prisma?.$disconnect(); });

  async function fixture() {
    const org = await prisma.organization.create({ data: { name: "Synthetic zero cost review" } });
    const organizationId = org.id;
    const user = await prisma.user.create({ data: { email: `zero-${org.id}@example.test`, name: "Synthetic reviewer", passwordHash: "synthetic-unusable-hash" } });
    const asset = await prisma.account.create({ data: { organizationId, code: "130", name: "Inventory", type: "ASSET" } });
    const clearing = await prisma.account.create({ data: { organizationId, code: "240", name: "Inventory clearing", type: "LIABILITY" } });
    const payable = await prisma.account.create({ data: { organizationId, code: "210", name: "Payable", type: "LIABILITY" } });
    const receivable = await prisma.account.create({ data: { organizationId, code: "120", name: "Receivable", type: "ASSET" } });
    const revenue = await prisma.account.create({ data: { organizationId, code: "400", name: "Revenue", type: "REVENUE" } });
    const expense = await prisma.account.create({ data: { organizationId, code: "610", name: "Expense", type: "EXPENSE" } });
    const cogs = await prisma.account.create({ data: { organizationId, code: "510", name: "COGS", type: "COST_OF_SALES" } });
    const supplier = await prisma.contact.create({ data: { organizationId, name: "Synthetic supplier", type: "SUPPLIER" } });
    const customer = await prisma.contact.create({ data: { organizationId, name: "Synthetic customer", type: "CUSTOMER" } });
    const item = await prisma.item.create({ data: { organizationId, name: "Free stock", type: "PRODUCT", sellingPrice: "20", revenueAccountId: revenue.id, inventoryTracking: true } });
    const warehouse = await prisma.warehouse.create({ data: { organizationId, code: "ZERO", name: "Synthetic warehouse" } });
    await prisma.inventorySettings.create({ data: { organizationId, enableInventoryAccounting: true, inventoryAssetAccountId: asset.id, inventoryClearingAccountId: clearing.id, cogsAccountId: cogs.id, purchaseReceiptPostingMode: "PREVIEW_ONLY" } });
    // Source financial journals are positive: a bill with free goods plus a service,
    // and a sale with positive revenue but zero historical stock cost.
    const sourceJournal = async (entryNumber: string, debitAccountId: string, creditAccountId: string, value: string, date: string) => prisma.journalEntry.create({ data: {
      organizationId, entryNumber, description: "Synthetic positive source journal", status: "POSTED", entryDate: new Date(date), currency: "SAR", totalDebit: value, totalCredit: value,
      postedAt: new Date(date), postedById: user.id, createdById: user.id,
      lines: { create: [
        { organizationId, accountId: debitAccountId, lineNumber: 1, debit: value, credit: "0", transactionDebit: value, transactionCredit: "0", currency: "SAR", exchangeRate: "1" },
        { organizationId, accountId: creditAccountId, lineNumber: 2, debit: "0", credit: value, transactionDebit: "0", transactionCredit: value, currency: "SAR", exchangeRate: "1" },
      ] },
    } });
    const billJournal = await sourceJournal("BILL-SOURCE", expense.id, payable.id, "5", "2026-09-01");
    const invoiceJournal = await sourceJournal("SALE-SOURCE", receivable.id, revenue.id, "20", "2026-09-02");
    // Match finalized document FX constraints and persisted base/transaction totals.
    // These are synthetic sources, not proof of bill/invoice finalization itself.
    const bill = await prisma.purchaseBill.create({ data: { organizationId, supplierId: supplier.id, billNumber: "ZERO-BILL", billDate: new Date("2026-09-01"), status: "FINALIZED", inventoryPostingMode: "INVENTORY_CLEARING", journalEntryId: billJournal.id,
      currency: "SAR", baseCurrency: "SAR", exchangeRate: "1", rateDate: new Date("2026-09-01"), rateSource: "SYSTEM_RATE_1", rateSnapshotId: null,
      finalizedAt: new Date("2026-09-01"), createdById: user.id,
      subtotal: "5", discountTotal: "0", taxableTotal: "5", taxTotal: "0", total: "5", balanceDue: "5",
      transactionSubtotal: "5", transactionDiscountTotal: "0", transactionTaxableTotal: "5", transactionTaxTotal: "0", transactionTotal: "5", transactionBalanceDue: "5",
      lines: { create: [
        { organizationId, itemId: item.id, accountId: expense.id, description: "Free stock", quantity: "2", unitPrice: "0", lineGrossAmount: "0", discountAmount: "0", taxableAmount: "0", taxAmount: "0", lineTotal: "0",
          transactionLineGrossAmount: "0", transactionDiscountAmount: "0", transactionTaxableAmount: "0", transactionTaxAmount: "0", transactionLineTotal: "0" },
        { organizationId, accountId: expense.id, description: "Separate service", quantity: "1", unitPrice: "5", lineGrossAmount: "5", discountAmount: "0", taxableAmount: "5", taxAmount: "0", lineTotal: "5",
          transactionLineGrossAmount: "5", transactionDiscountAmount: "0", transactionTaxableAmount: "5", transactionTaxAmount: "0", transactionLineTotal: "5" },
      ] },
    }, include: { lines: true } });
    const invoice = await prisma.salesInvoice.create({ data: { organizationId, customerId: customer.id, invoiceNumber: "ZERO-COST-SALE", issueDate: new Date("2026-09-02"), status: "FINALIZED", journalEntryId: invoiceJournal.id,
      currency: "SAR", baseCurrency: "SAR", exchangeRate: "1", rateDate: new Date("2026-09-02"), rateSource: "SYSTEM_RATE_1", rateSnapshotId: null,
      finalizedAt: new Date("2026-09-02"), createdById: user.id,
      subtotal: "20", discountTotal: "0", taxableTotal: "20", taxTotal: "0", total: "20", balanceDue: "20",
      transactionSubtotal: "20", transactionDiscountTotal: "0", transactionTaxableTotal: "20", transactionTaxTotal: "0", transactionTotal: "20", transactionBalanceDue: "20",
      lines: { create: [{ organizationId, itemId: item.id, accountId: revenue.id, description: "Zero cost sale", quantity: "1", unitPrice: "20", lineGrossAmount: "20", discountAmount: "0", taxableAmount: "20", taxAmount: "0", lineSubtotal: "20", lineTotal: "20",
        transactionLineGrossAmount: "20", transactionDiscountAmount: "0", transactionTaxableAmount: "20", transactionTaxAmount: "0", transactionLineTotal: "20" }] },
    }, include: { lines: true } });
    const audit = new AuditLogService(prisma as never);
    const numbers = new NumberSequenceService(prisma as never);
    const fiscal = new FiscalPeriodGuardService(prisma as never);
    const accounting = new InventoryAccountingService(prisma as never);
    const receipts = new PurchaseReceiptService(prisma as never, audit, numbers, accounting, fiscal);
    const issues = new SalesStockIssueService(prisma as never, audit, numbers, accounting, fiscal);
    const reviews = new InventoryMovementAccountingService(prisma as never, numbers, fiscal);
    const periods = new FiscalPeriodService(prisma as never, audit, { assertReadyForPeriodClose: jest.fn().mockResolvedValue(undefined) } as never);
    const period = await periods.create(organizationId, user.id, { name: "Synthetic September", startsOn: "2026-09-01", endsOn: "2026-09-30" });
    const receipt = await receipts.create(organizationId, user.id, { purchaseBillId: bill.id, warehouseId: warehouse.id, receiptDate: "2026-09-01",
      lines: [{ purchaseBillLineId: bill.lines.find((line) => line.itemId === item.id)!.id, quantity: "2" }] }, "zero-receipt-proof");
    const issue = await issues.create(organizationId, user.id, { salesInvoiceId: invoice.id, warehouseId: warehouse.id, issueDate: "2026-09-02",
      lines: [{ salesInvoiceLineId: invoice.lines[0]!.id, quantity: "1" }] }, "zero-issue-proof");
    return { organizationId, user, item, warehouse, audit, receipts, issues, reviews, periods, period, receipt, issue };
  }

  it("requires each explicit zero-cost review before close, preserves reviewer, and never creates a journal", async () => {
    const f = await fixture();
    const { organizationId, user, receipt, issue } = f;
    expect(await f.receipts.accountingPreview(organizationId, receipt.id)).toMatchObject({ canPost: true, alreadyPosted: false, journal: { totalDebit: "0.0000" } });
    expect(await f.issues.accountingPreview(organizationId, issue.id)).toMatchObject({ canPost: true, alreadyPosted: false, journal: { totalDebit: "0.0000" } });
    expect(await f.reviews.reconciliation(organizationId)).toMatchObject({ pendingReceipts: 1, pendingIssues: 1, reconciled: false });
    await expect(f.periods.close(organizationId, user.id, f.period.id)).rejects.toThrow("Inventory must be reconciled");
    const salesReturn = await prisma.$transaction((tx) => createValuedStockMovement(tx, { data: { organizationId, itemId: f.item.id, warehouseId: f.warehouse.id,
      type: "SALES_RETURN_IN", quantity: "1", movementDate: new Date("2026-09-03"), valuationSourceMovementId: issue.lines[0]!.stockMovementId! } }));
    const purchaseReturn = await prisma.$transaction((tx) => createValuedStockMovement(tx, { data: { organizationId, itemId: f.item.id, warehouseId: f.warehouse.id,
      type: "PURCHASE_RETURN_OUT", quantity: "1", movementDate: new Date("2026-09-04"), valuationSourceMovementId: receipt.lines[0]!.stockMovementId! } }));
    await expect(f.reviews.post(organizationId, user.id, salesReturn.id, {})).rejects.toThrow("original active");
    await expect(f.reviews.post(organizationId, user.id, purchaseReturn.id, {})).rejects.toThrow("original active");
    const journalCount = await prisma.journalEntry.count({ where: { organizationId } });
    const receiptPosted = await f.receipts.postInventoryAsset(organizationId, user.id, receipt.id);
    expect(receiptPosted).toMatchObject({ inventoryAssetJournalEntryId: null, inventoryAssetPostedById: user.id, inventoryAssetPostedAt: expect.any(Date) });
    expect(await f.reviews.reconciliation(organizationId)).toMatchObject({ pendingReceipts: 0, pendingIssues: 1, reconciled: false });
    await expect(f.periods.lock(organizationId, user.id, f.period.id)).rejects.toThrow("Inventory must be reconciled");
    const issuePosted = await f.issues.postCogs(organizationId, user.id, issue.id);
    expect(issuePosted).toMatchObject({ cogsJournalEntryId: null, cogsPostedById: user.id, cogsPostedAt: expect.any(Date) });
    expect(await f.receipts.accountingPreview(organizationId, receipt.id)).toMatchObject({ alreadyPosted: true, journalEntryId: null });
    expect(await f.issues.accountingPreview(organizationId, issue.id)).toMatchObject({ alreadyPosted: true, journalEntryId: null });
    await expect(f.receipts.postInventoryAsset(organizationId, user.id, receipt.id)).rejects.toThrow("already been posted");
    await expect(f.issues.postCogs(organizationId, user.id, issue.id)).rejects.toThrow("already been posted");
    await expect(f.periods.close(organizationId, user.id, f.period.id)).rejects.toThrow("Inventory must be reconciled");
    await expect(f.reviews.post(organizationId, user.id, salesReturn.id, {})).resolves.toMatchObject({ journalEntryId: null, reviewedById: user.id });
    await expect(f.reviews.post(organizationId, user.id, purchaseReturn.id, {})).resolves.toMatchObject({ journalEntryId: null, reviewedById: user.id });
    expect(await prisma.journalEntry.count({ where: { organizationId } })).toBe(journalCount);
    expect(await prisma.auditLog.count({ where: { organizationId, action: { in: [AUDIT_EVENTS.PURCHASE_RECEIPT_ASSET_POSTED, AUDIT_EVENTS.COGS_POSTED] } } })).toBe(2);
    expect(await f.reviews.reconciliation(organizationId)).toMatchObject({ pendingReceipts: 0, pendingIssues: 0, reconciled: true });
    await expect(f.periods.close(organizationId, user.id, f.period.id)).resolves.toMatchObject({ status: "CLOSED" });
  }, 30000);

  it("rolls review back on audit failure, rejects negative valuation and voids reviewed zero stock without a financial reversal", async () => {
    const f = await fixture();
    const { organizationId, user, receipt, issue } = f;
    const auditFailure = jest.spyOn(f.audit, "log").mockRejectedValueOnce(new Error("Synthetic audit failure"));
    await expect(f.receipts.postInventoryAsset(organizationId, user.id, receipt.id)).rejects.toThrow("Synthetic audit failure");
    auditFailure.mockRestore();
    expect(await prisma.purchaseReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).toMatchObject({ inventoryAssetPostedAt: null, inventoryAssetPostedById: null, inventoryAssetJournalEntryId: null });
    await expect(prisma.$transaction((tx) => createValuedStockMovement(tx, { data: { organizationId, itemId: f.item.id, warehouseId: f.warehouse.id, type: "ADJUSTMENT_IN", quantity: "1", totalCost: "-1", movementDate: new Date("2026-09-03") } }))).rejects.toThrow("finite non-negative");
    await f.receipts.postInventoryAsset(organizationId, user.id, receipt.id);
    await f.issues.postCogs(organizationId, user.id, issue.id);
    await expect(f.issues.reverseCogs(organizationId, user.id, issue.id)).rejects.toThrow("has not been posted");
    await expect(f.receipts.reverseInventoryAsset(organizationId, user.id, receipt.id)).rejects.toThrow("has not been posted");
    await expect(f.issues.void(organizationId, user.id, issue.id)).resolves.toMatchObject({ status: "VOIDED", cogsJournalEntryId: null, cogsReversalJournalEntryId: null });
    await expect(f.receipts.void(organizationId, user.id, receipt.id)).resolves.toMatchObject({ status: "VOIDED", inventoryAssetJournalEntryId: null, inventoryAssetReversalJournalEntryId: null });
    expect(await prisma.journalEntry.count({ where: { organizationId } })).toBe(2);
    expect(await f.reviews.reconciliation(organizationId)).toMatchObject({ subledgerValue: "0.0000", pendingReceipts: 0, pendingIssues: 0, reconciled: true });
  }, 30000);
});
