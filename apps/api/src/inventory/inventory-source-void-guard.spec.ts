import { PurchaseBillService } from "../purchase-bills/purchase-bill.service";
import { SalesInvoiceService } from "../sales-invoices/sales-invoice.service";

describe("financial source void inventory dependency guard", () => {
  it.each(["receipt", "purchase return", "issue", "sales return"])("rejects a void with an active %s before changing financial state", async (kind) => {
    const billSource = kind === "receipt" || kind === "purchase return";
    const document = { id: "source", organizationId: "org", status: "FINALIZED", journalEntryId: "original-journal" };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      purchaseBill: { findFirst: jest.fn().mockResolvedValue(document), updateMany: jest.fn() },
      salesInvoice: { findFirst: jest.fn().mockResolvedValue(document), updateMany: jest.fn() },
      purchaseReceipt: { count: jest.fn().mockResolvedValue(kind === "receipt" ? 1 : 0) },
      purchaseReturn: { count: jest.fn().mockResolvedValue(kind === "purchase return" ? 1 : 0) },
      salesStockIssue: { count: jest.fn().mockResolvedValue(kind === "issue" ? 1 : 0) },
      salesInventoryReturn: { count: jest.fn().mockResolvedValue(kind === "sales return" ? 1 : 0) },
      journalEntry: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((fn: (value: typeof tx) => unknown) => fn(tx)) };
    const service = billSource ? new PurchaseBillService(prisma as never, {} as never, {} as never)
      : new SalesInvoiceService(prisma as never, {} as never, {} as never, {} as never);
    jest.spyOn(service, "get").mockResolvedValue(document as never);
    await expect(service.void("org", "reviewer", "source")).rejects.toThrow("active inventory");
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.purchaseBill.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    const returns = billSource ? tx.purchaseReturn : tx.salesInventoryReturn;
    expect(returns.count).toHaveBeenCalledWith({ where: expect.objectContaining({ organizationId: "org", inventoryReturnPostedAt: { not: null } }) });
  });
});
