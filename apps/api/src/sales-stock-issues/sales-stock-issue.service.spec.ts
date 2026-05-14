import {
  AccountType,
  InventoryValuationMethod,
  ItemStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
  SalesStockIssueStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { SalesStockIssueService } from "./sales-stock-issue.service";

describe("SalesStockIssueService", () => {
  const item = { id: "item-1", inventoryTracking: true, status: ItemStatus.ACTIVE };
  const previewItem = { id: item.id, name: "Tracked Item", sku: "TRK", type: "PRODUCT", status: ItemStatus.ACTIVE, inventoryTracking: true };
  const warehouse = { id: "warehouse-1", status: WarehouseStatus.ACTIVE };
  const assetAccount = { id: "asset-1", code: "130", name: "Inventory", type: AccountType.ASSET, allowPosting: true, isActive: true };
  const cogsAccount = { id: "cogs-1", code: "611", name: "Cost of Goods Sold", type: AccountType.COST_OF_SALES, allowPosting: true, isActive: true };
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
    cogsJournalEntryId: null,
    cogsReversalJournalEntryId: null,
    cogsPostedAt: null,
    cogsPostedById: null,
    cogsReversedAt: null,
    cogsReversedById: null,
    cogsJournalEntry: null,
    cogsReversalJournalEntry: null,
    lines: [{ id: "issue-line-1", itemId: item.id, item: previewItem, salesInvoiceLineId: invoiceLine.id, quantity: new Prisma.Decimal("2.0000"), unitCost: null }],
  };
  const cogsJournalEntry = {
    id: "journal-1",
    entryNumber: "JE-000001",
    status: JournalEntryStatus.POSTED,
    entryDate: issue.issueDate,
    description: "COGS for sales stock issue SSI-000001",
    reference: issue.issueNumber,
    currency: "SAR",
    totalDebit: new Prisma.Decimal("10.5000"),
    totalCredit: new Prisma.Decimal("10.5000"),
    reversedBy: null,
    lines: [
      {
        accountId: cogsAccount.id,
        debit: new Prisma.Decimal("10.5000"),
        credit: new Prisma.Decimal("0.0000"),
        description: "Sales stock issue SSI-000001 COGS",
        currency: "SAR",
        exchangeRate: new Prisma.Decimal("1.00000000"),
      },
      {
        accountId: assetAccount.id,
        debit: new Prisma.Decimal("0.0000"),
        credit: new Prisma.Decimal("10.5000"),
        description: "Sales stock issue SSI-000001 inventory asset",
        currency: "SAR",
        exchangeRate: new Prisma.Decimal("1.00000000"),
      },
    ],
  };

  function makeService(tx: Record<string, unknown>, directOverrides: Record<string, unknown> = {}) {
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      salesStockIssue: { findMany: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
      salesInvoice: { findFirst: jest.fn() },
      salesStockIssueLine: { findMany: jest.fn() },
      journalEntry: { create: jest.fn() },
      ...directOverrides,
    };
    const audit = { log: jest.fn() };
    const numbers = {
      next: jest.fn((_organizationId: string, scope: NumberSequenceScope) =>
        Promise.resolve(scope === NumberSequenceScope.JOURNAL_ENTRY ? "JE-000001" : "SSI-000001"),
      ),
    };
    const inventoryAccounting = {
      previewReadiness: jest.fn().mockResolvedValue({
        settings: {
          valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
          enableInventoryAccounting: true,
          inventoryAssetAccount: assetAccount,
          cogsAccount,
        },
        blockingReasons: [],
        warnings: ["COGS posting requires an explicit manual post action after review."],
      }),
      movingAverageUnitCost: jest.fn().mockResolvedValue({
        averageUnitCost: new Prisma.Decimal("5.2500"),
        missingCostData: false,
      }),
    };
    const fiscal = { assertPostingDateAllowed: jest.fn() };
    return {
      service: new SalesStockIssueService(prisma as never, audit as never, numbers as never, inventoryAccounting as never, fiscal as never),
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
      journalEntry: {
        create: jest.fn().mockResolvedValue(cogsJournalEntry),
        update: jest.fn().mockResolvedValue(cogsJournalEntry),
      },
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

  it("returns moving-average COGS preview with Dr COGS and Cr inventory asset without creating a journal entry", async () => {
    const { service, prisma, inventoryAccounting } = makeService(makeTx(), {
      salesStockIssue: { findFirst: jest.fn().mockResolvedValue(issue) },
    });

    const preview = await service.accountingPreview("org-1", issue.id);

    expect(inventoryAccounting.movingAverageUnitCost).toHaveBeenCalledWith("org-1", item.id, warehouse.id, issue.issueDate, prisma);
    expect(preview).toEqual(
      expect.objectContaining({
        previewOnly: true,
        canPost: true,
        alreadyPosted: false,
        warnings: expect.arrayContaining([
          "This creates accounting journal entries and affects financial reports.",
          "Average cost is operational estimate and requires accountant review.",
        ]),
      }),
    );
    expect(preview.lines[0]).toEqual(expect.objectContaining({ estimatedUnitCost: "5.2500", estimatedCOGS: "10.5000" }));
    expect(preview.journal.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ side: "DEBIT", accountCode: "611", amount: "10.5000" }),
        expect.objectContaining({ side: "CREDIT", accountCode: "130", amount: "10.5000" }),
      ]),
    );
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("requires enabled inventory accounting and mapped accounts before COGS posting", async () => {
    const disabledTx = makeTx();
    const disabled = makeService(disabledTx);
    jest.spyOn(disabled.service, "get").mockResolvedValueOnce(issue as never);
    disabled.inventoryAccounting.previewReadiness.mockResolvedValueOnce({
      settings: {
        valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
        enableInventoryAccounting: false,
        inventoryAssetAccount: assetAccount,
        cogsAccount,
      },
      blockingReasons: [],
      warnings: [],
    });

    await expectBadRequestMessage(
      disabled.service.postCogs("org-1", "user-1", issue.id),
      "Inventory accounting must be enabled before COGS can be posted.",
    );

    const unmappedTx = makeTx();
    const unmapped = makeService(unmappedTx);
    jest.spyOn(unmapped.service, "get").mockResolvedValueOnce(issue as never);
    unmapped.inventoryAccounting.previewReadiness.mockResolvedValueOnce({
      settings: {
        valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
        enableInventoryAccounting: true,
        inventoryAssetAccount: null,
        cogsAccount,
      },
      blockingReasons: ["Inventory asset account mapping is required."],
      warnings: [],
    });

    await expectBadRequestMessage(
      unmapped.service.postCogs("org-1", "user-1", issue.id),
      "Inventory asset account mapping is required.",
    );
  });

  it("posts COGS as a balanced journal, links it, uses issue date, and does not mutate stock movements", async () => {
    const updatedIssue = { ...issue, cogsJournalEntryId: cogsJournalEntry.id, cogsJournalEntry };
    const tx = makeTx({
      salesStockIssue: {
        create: jest.fn().mockResolvedValue({ id: issue.id }),
        findFirst: jest.fn().mockResolvedValue(issue),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedIssue),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const { service, numbers, fiscal, audit } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(issue as never);

    await expect(service.postCogs("org-1", "user-1", issue.id)).resolves.toMatchObject({
      id: issue.id,
      cogsJournalEntryId: cogsJournalEntry.id,
    });

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", issue.issueDate, tx);
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.JOURNAL_ENTRY, tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          entryDate: issue.issueDate,
          description: "COGS for sales stock issue SSI-000001",
          totalDebit: "10.5000",
          totalCredit: "10.5000",
        }),
      }),
    );
    expect(tx.salesStockIssue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: issue.id, organizationId: "org-1", cogsJournalEntryId: null }),
        data: expect.objectContaining({ cogsJournalEntryId: cogsJournalEntry.id, cogsPostedById: "user-1" }),
      }),
    );
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "POST_COGS", entityType: "SalesStockIssue" }));
  });

  it("rejects double COGS posting and tenant-mismatched posting", async () => {
    const postedIssue = { ...issue, cogsJournalEntryId: cogsJournalEntry.id };
    const postedTx = makeTx({ salesStockIssue: { findFirst: jest.fn().mockResolvedValue(postedIssue) } });
    const posted = makeService(postedTx);
    jest.spyOn(posted.service, "get").mockResolvedValueOnce(postedIssue as never);

    await expect(posted.service.postCogs("org-1", "user-1", issue.id)).rejects.toThrow("COGS has already been posted for this stock issue.");

    const tenantTx = makeTx({ salesStockIssue: { findFirst: jest.fn().mockResolvedValue(null) } });
    const tenant = makeService(tenantTx);
    jest.spyOn(tenant.service, "get").mockResolvedValueOnce(issue as never);
    await expect(tenant.service.postCogs("other-org", "user-1", issue.id)).rejects.toThrow("Sales stock issue not found.");
  });

  it("reverses COGS with a reversal journal and rejects double reversal", async () => {
    const postedIssue = { ...issue, cogsJournalEntryId: cogsJournalEntry.id, cogsJournalEntry };
    const reversedIssue = {
      ...postedIssue,
      cogsReversalJournalEntryId: "journal-reversal-1",
      cogsReversalJournalEntry: { id: "journal-reversal-1", entryNumber: "JE-000002" },
    };
    const tx = makeTx({
      salesStockIssue: {
        findFirst: jest.fn().mockResolvedValue(postedIssue),
        findUniqueOrThrow: jest.fn().mockResolvedValue(reversedIssue),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      journalEntry: {
        create: jest.fn().mockResolvedValue({ id: "journal-reversal-1", entryNumber: "JE-000002" }),
        update: jest.fn().mockResolvedValue({ id: cogsJournalEntry.id }),
      },
    });
    const { service, fiscal, audit } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(postedIssue as never);

    await expect(service.reverseCogs("org-1", "user-1", issue.id, { reason: "Smoke reversal" })).resolves.toMatchObject({
      cogsReversalJournalEntryId: "journal-reversal-1",
    });

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", expect.any(Date), tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          reversalOfId: cogsJournalEntry.id,
          totalDebit: "10.5000",
          totalCredit: "10.5000",
        }),
      }),
    );
    expect(tx.journalEntry.update).toHaveBeenCalledWith({ where: { id: cogsJournalEntry.id }, data: { status: JournalEntryStatus.REVERSED } });
    expect(tx.salesStockIssue.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cogsReversalJournalEntryId: "journal-reversal-1", cogsReversedById: "user-1" }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVERSE_COGS", entityType: "SalesStockIssue" }));

    const twice = makeService(makeTx({ salesStockIssue: { findFirst: jest.fn().mockResolvedValue(reversedIssue) } }));
    jest.spyOn(twice.service, "get").mockResolvedValueOnce(reversedIssue as never);
    await expect(twice.service.reverseCogs("org-1", "user-1", issue.id, {})).rejects.toThrow(
      "COGS has already been reversed for this stock issue.",
    );
  });

  it("blocks stock issue void while COGS is active and allows void after COGS reversal", async () => {
    const activeCogsIssue = { ...issue, cogsJournalEntryId: cogsJournalEntry.id, cogsReversalJournalEntryId: null };
    const active = makeService(makeTx());
    jest.spyOn(active.service, "get").mockResolvedValueOnce(activeCogsIssue as never);
    await expect(active.service.void("org-1", "user-1", issue.id)).rejects.toThrow("Reverse COGS posting before voiding this stock issue.");

    const reversedCogsIssue = { ...issue, cogsJournalEntryId: cogsJournalEntry.id, cogsReversalJournalEntryId: "journal-reversal-1" };
    const tx = makeTx({ salesStockIssue: { findFirst: jest.fn().mockResolvedValue(reversedCogsIssue), findUniqueOrThrow: jest.fn().mockResolvedValue(reversedCogsIssue), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } });
    const reversed = makeService(tx);
    jest.spyOn(reversed.service, "get").mockResolvedValueOnce(reversedCogsIssue as never);

    await expect(reversed.service.void("org-1", "user-1", issue.id)).resolves.toMatchObject({ id: issue.id });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_IN, referenceType: "SalesStockIssueVoid" }) }),
    );
  });

  it("keeps sales stock issue accounting preview tenant-scoped", async () => {
    const { service, prisma } = makeService(makeTx(), {
      salesStockIssue: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.accountingPreview("other-org", issue.id)).rejects.toThrow("Sales stock issue not found.");
    expect(prisma.salesStockIssue.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: issue.id, organizationId: "other-org" } }));
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
