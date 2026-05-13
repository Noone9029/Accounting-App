import { ItemStatus, Prisma, SalesInvoiceStatus, SalesStockIssueStatus, StockMovementType, WarehouseStatus } from "@prisma/client";
import { SalesStockIssueService } from "./sales-stock-issue.service";

describe("SalesStockIssueService", () => {
  const item = { id: "item-1", inventoryTracking: true, status: ItemStatus.ACTIVE };
  const warehouse = { id: "warehouse-1", status: WarehouseStatus.ACTIVE };
  const invoiceLine = { id: "invoice-line-1", itemId: item.id, quantity: new Prisma.Decimal("5.0000"), item };
  const issue = {
    id: "issue-1",
    organizationId: "org-1",
    issueNumber: "SSI-000001",
    salesInvoiceId: "invoice-1",
    customerId: "customer-1",
    warehouseId: warehouse.id,
    status: SalesStockIssueStatus.POSTED,
    issueDate: new Date("2026-05-14T00:00:00.000Z"),
    lines: [{ id: "issue-line-1", itemId: item.id, salesInvoiceLineId: invoiceLine.id, quantity: new Prisma.Decimal("2.0000"), unitCost: null }],
  };

  function makeService(tx: Record<string, unknown>, directOverrides: Record<string, unknown> = {}) {
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      salesStockIssue: { findMany: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      salesInvoice: { findFirst: jest.fn() },
      salesStockIssueLine: { findMany: jest.fn() },
      ...directOverrides,
    };
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValue("SSI-000001") };
    return { service: new SalesStockIssueService(prisma as never, audit as never, numbers as never), prisma, audit, numbers };
  }

  function makeTx(overrides: Record<string, unknown> = {}) {
    return {
      warehouse: { findFirst: jest.fn().mockResolvedValue(warehouse) },
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          customerId: "customer-1",
          status: SalesInvoiceStatus.FINALIZED,
          lines: [invoiceLine],
        }),
      },
      salesInvoiceLine: { findMany: jest.fn().mockResolvedValue([{ id: invoiceLine.id, quantity: invoiceLine.quantity }]) },
      salesStockIssue: {
        create: jest.fn().mockResolvedValue({ id: issue.id }),
        findFirst: jest.fn().mockResolvedValue(issue),
        findUniqueOrThrow: jest.fn().mockResolvedValue(issue),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      salesStockIssueLine: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "issue-line-1" }),
        update: jest.fn().mockResolvedValue({ id: "issue-line-1" }),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([{ type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER, quantity: new Prisma.Decimal("5.0000") }]),
        create: jest.fn().mockResolvedValue({ id: "movement-1" }),
      },
      journalEntry: { create: jest.fn() },
      ...overrides,
    };
  }

  it("creates a sales stock issue from a finalized invoice with a stock movement and no journal entry", async () => {
    const tx = makeTx();
    const { service, numbers, audit } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        salesInvoiceId: "invoice-1",
        warehouseId: warehouse.id,
        issueDate: "2026-05-14",
        lines: [{ salesInvoiceLineId: invoiceLine.id, quantity: "2.0000" }],
      }),
    ).resolves.toMatchObject({ id: issue.id });

    expect(numbers.next).toHaveBeenCalledWith("org-1", "SALES_STOCK_ISSUE", tx);
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.SALES_ISSUE_PLACEHOLDER,
          referenceType: "SalesStockIssue",
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "SalesStockIssue" }));
  });

  it("rejects issue above remaining invoice quantity and insufficient stock", async () => {
    const remainingTx = makeTx({
      salesStockIssueLine: {
        findMany: jest.fn().mockResolvedValue([{ salesInvoiceLineId: invoiceLine.id, quantity: new Prisma.Decimal("4.0000") }]),
        create: jest.fn(),
        update: jest.fn(),
      },
    });
    await expect(
      makeService(remainingTx).service.create("org-1", "user-1", {
        salesInvoiceId: "invoice-1",
        warehouseId: warehouse.id,
        issueDate: "2026-05-14",
        lines: [{ salesInvoiceLineId: invoiceLine.id, quantity: "2.0000" }],
      }),
    ).rejects.toThrow("Issue quantity cannot exceed the remaining sales invoice quantity.");

    const stockTx = makeTx({ stockMovement: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() } });
    await expect(
      makeService(stockTx).service.create("org-1", "user-1", {
        salesInvoiceId: "invoice-1",
        warehouseId: warehouse.id,
        issueDate: "2026-05-14",
        lines: [{ salesInvoiceLineId: invoiceLine.id, quantity: "2.0000" }],
      }),
    ).rejects.toThrow("Sales stock issue cannot make warehouse stock negative.");
  });

  it("rejects draft or voided invoices", async () => {
    const tx = makeTx({
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          customerId: "customer-1",
          status: SalesInvoiceStatus.DRAFT,
          lines: [invoiceLine],
        }),
      },
    });

    await expect(
      makeService(tx).service.create("org-1", "user-1", {
        salesInvoiceId: "invoice-1",
        warehouseId: warehouse.id,
        issueDate: "2026-05-14",
        lines: [{ salesInvoiceLineId: invoiceLine.id, quantity: "1.0000" }],
      }),
    ).rejects.toThrow("Sales stock issue requires a finalized sales invoice.");
  });

  it("voids a sales stock issue with reversing stock movement and rejects double void", async () => {
    const tx = makeTx();
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(issue as never);

    await expect(service.void("org-1", "user-1", issue.id)).resolves.toMatchObject({ id: issue.id });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_IN, referenceType: "SalesStockIssueVoid" }) }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();

    jest.spyOn(service, "get").mockResolvedValueOnce({ ...issue, status: SalesStockIssueStatus.VOIDED } as never);
    await expect(service.void("org-1", "user-1", issue.id)).rejects.toThrow("Sales stock issue is already voided.");
  });

  it("returns invoice issue status and tenant-scoped get", async () => {
    const { service, prisma } = makeService(makeTx(), {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1", lines: [{ id: invoiceLine.id, item, quantity: invoiceLine.quantity }] }) },
      salesStockIssueLine: { findMany: jest.fn().mockResolvedValue([{ salesInvoiceLineId: invoiceLine.id, quantity: new Prisma.Decimal("2.0000") }]) },
      salesStockIssue: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.salesInvoiceIssueStatus("org-1", "invoice-1")).resolves.toMatchObject({
      status: "PARTIAL",
      lines: [expect.objectContaining({ issuedQuantity: "2.0000", remainingQuantity: "3.0000" })],
    });
    await expect(service.get("other-org", issue.id)).rejects.toThrow("Sales stock issue not found.");
    expect(prisma.salesStockIssue.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: issue.id, organizationId: "other-org" } }));
  });
});
