import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  ContactType,
  CreditNoteStatus,
  DeliveryNoteStatus,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  SalesInventoryReturnStatus,
  SalesInvoiceStatus,
  SalesStockIssueStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { SalesInventoryReturnService } from "./sales-inventory-return.service";

describe("sales inventory return rules", () => {
  it("creates a draft operational customer stock return without credit note, refund, journal, VAT, email, or ZATCA side effects", async () => {
    const tx = makeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const numberSequence = { next: jest.fn().mockResolvedValue("SRN-000001"), preview: jest.fn() };
    const service = new SalesInventoryReturnService(prisma as never, auditLog as never, numberSequence as never);

    const created = await service.create("org-1", "user-1", makeCreateDto());

    expect(created).toMatchObject({
      id: "return-1",
      salesReturnNumber: "SRN-000001",
      status: SalesInventoryReturnStatus.DRAFT,
      noAccountingEffect: true,
      noArEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
    });
    expect(numberSequence.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.SALES_INVENTORY_RETURN, tx);
    expect(tx.salesInventoryReturn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          customerId: "customer-1",
          salesReturnNumber: "SRN-000001",
          sourceSalesStockIssueId: "issue-1",
          lines: { create: [expect.objectContaining({ quantity: "2.0000" })] },
        }),
      }),
    );
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.creditNote.create).not.toHaveBeenCalled();
    expect(tx.customerRefund.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(tx.emailOutbox.create).not.toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "SalesInventoryReturn" }));
  });

  it("keeps credit notes reference-only unless an explicit warehouse and return line are supplied", async () => {
    const tx = makeTransactionMock({
      salesStockIssue: { findFirst: jest.fn().mockResolvedValue(null) },
      salesStockIssueLine: { findMany: jest.fn().mockResolvedValue([]) },
      creditNote: { findFirst: jest.fn().mockResolvedValue({ id: "credit-1", customerId: "customer-1", status: CreditNoteStatus.FINALIZED }) },
      creditNoteLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "credit-line-1",
            creditNoteId: "credit-1",
            itemId: "item-1",
            description: "Returned goods credit context",
            quantity: new Prisma.Decimal("2.0000"),
            creditNote: { id: "credit-1", customerId: "customer-1", status: CreditNoteStatus.FINALIZED },
          },
        ]),
      },
      warehouse: { findMany: jest.fn().mockResolvedValue([{ id: "warehouse-1", status: WarehouseStatus.ACTIVE }]) },
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInventoryReturnService(prisma as never, { log: jest.fn() } as never, {
      next: jest.fn().mockResolvedValue("SRN-000001"),
      preview: jest.fn(),
    } as never);

    await service.create("org-1", "user-1", {
      customerId: "customer-1",
      returnDate: "2026-06-06",
      sourceCreditNoteId: "credit-1",
      lines: [{ sourceCreditNoteLineId: "credit-line-1", warehouseId: "warehouse-1", quantity: "1.0000" }],
    });

    expect(tx.salesInventoryReturn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceCreditNoteId: "credit-1",
          lines: {
            create: [
              expect.objectContaining({
                sourceCreditNoteLine: { connect: { id: "credit-line-1" } },
                warehouse: { connect: { id: "warehouse-1" } },
              }),
            ],
          },
        }),
      }),
    );
    expect(tx.creditNote.create).not.toHaveBeenCalled();
    expect(tx.customerRefund.create).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("rejects cross-customer source invoices", async () => {
    const tx = makeTransactionMock({
      salesStockIssue: { findFirst: jest.fn().mockResolvedValue(null) },
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1", customerId: "other-customer", status: SalesInvoiceStatus.FINALIZED }) },
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInventoryReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        customerId: "customer-1",
        returnDate: "2026-06-06",
        sourceSalesInvoiceId: "invoice-1",
        lines: [{ description: "Manual return", quantity: "1.0000" }],
      }),
    ).rejects.toThrow("Source sales invoice must belong");
    expect(tx.salesInventoryReturn.create).not.toHaveBeenCalled();
  });

  it("rejects returned quantity above remaining source issue quantity", async () => {
    const tx = makeTransactionMock({
      alreadyReturnedRows: [{ sourceSalesStockIssueLineId: "issue-line-1", quantity: new Prisma.Decimal("4.0000") }],
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInventoryReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", makeCreateDto({ lines: [{ sourceSalesStockIssueLineId: "issue-line-1", quantity: "2.0000" }] }))).rejects.toThrow(
      "Returned quantity cannot exceed available source quantity",
    );
    expect(tx.salesInventoryReturn.create).not.toHaveBeenCalled();
  });

  it("runs draft to submitted to approved to received lifecycle without stock, AR, or accounting mutation", async () => {
    const prisma = {
      salesInventoryReturn: { update: jest.fn() },
      stockMovement: { create: jest.fn() },
      journalEntry: { create: jest.fn() },
      creditNote: { create: jest.fn() },
      customerRefund: { create: jest.fn() },
    };
    const auditLog = { log: jest.fn() };
    const service = new SalesInventoryReturnService(prisma as never, auditLog as never, { next: jest.fn() } as never);
    jest
      .spyOn(service, "get")
      .mockResolvedValueOnce(makeSalesReturnRecord({ status: SalesInventoryReturnStatus.DRAFT }) as never)
      .mockResolvedValueOnce(makeSalesReturnRecord({ status: SalesInventoryReturnStatus.SUBMITTED }) as never)
      .mockResolvedValueOnce(makeSalesReturnRecord({ status: SalesInventoryReturnStatus.APPROVED }) as never);
    prisma.salesInventoryReturn.update
      .mockResolvedValueOnce(makeSalesReturnRecord({ status: SalesInventoryReturnStatus.SUBMITTED }))
      .mockResolvedValueOnce(makeSalesReturnRecord({ status: SalesInventoryReturnStatus.APPROVED, approvedAt: new Date("2026-06-06T10:00:00.000Z") }))
      .mockResolvedValueOnce(makeSalesReturnRecord({ status: SalesInventoryReturnStatus.RECEIVED, receivedAt: new Date("2026-06-06T11:00:00.000Z") }));

    await expect(service.submit("org-1", "user-1", "return-1")).resolves.toMatchObject({ status: SalesInventoryReturnStatus.SUBMITTED });
    await expect(service.approve("org-1", "user-1", "return-1")).resolves.toMatchObject({ status: SalesInventoryReturnStatus.APPROVED });
    await expect(service.receive("org-1", "user-1", "return-1")).resolves.toMatchObject({ status: SalesInventoryReturnStatus.RECEIVED });

    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.creditNote.create).not.toHaveBeenCalled();
    expect(prisma.customerRefund.create).not.toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "SUBMIT" }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "APPROVE" }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "RECEIVE" }));
  });

  it("previews sales return stock-in without mutating data", async () => {
    const prisma = makeInventoryReturnPrisma();
    const service = new SalesInventoryReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    const preview = await service.inventoryReturnPreview("org-1", "return-1");

    expect(preview).toMatchObject({
      readOnly: true,
      previewOnly: true,
      noAccountingEffect: true,
      noArEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      canPost: true,
      inventoryMovementStatus: "NOT_POSTED",
      sourceSalesInventoryReturn: { id: "return-1", salesReturnNumber: "SRN-000001", status: SalesInventoryReturnStatus.APPROVED },
      lines: [
        expect.objectContaining({
          lineId: "return-line-1",
          returnQuantity: "2.0000",
          currentOnHand: "5.0000",
          projectedOnHandAfterReturn: "7.0000",
          movementType: StockMovementType.SALES_RETURN_IN,
          status: "POSTABLE",
          sourceType: "salesStockIssue",
        }),
      ],
    });
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(preview.safeHelperText).toContain("do not create credit notes");
  });

  it("posts sales return stock-in once with no AR, VAT, ZATCA, credit-note, refund, or journal side effects", async () => {
    const tx = makeInventoryReturnPrisma();
    const root = makeInventoryReturnPrisma();
    const before = makeSalesReturnRecord();
    const after = makeSalesReturnRecord({
      inventoryReturnPostedAt: new Date("2026-06-06T12:00:00.000Z"),
      lines: [{ ...makeSalesReturnRecord().lines[0], stockMovementId: "movement-return-1", stockMovement: { id: "movement-return-1" } }],
    });
    const prisma = {
      ...root,
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    prisma.salesInventoryReturn.findFirst = jest.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    tx.salesInventoryReturn.findFirst.mockResolvedValue(before);
    tx.salesInventoryReturn.updateMany.mockResolvedValue({ count: 1 });
    tx.stockMovement.create.mockResolvedValue({
      id: "movement-return-1",
      itemId: "item-1",
      warehouseId: "warehouse-1",
      quantity: new Prisma.Decimal("2.0000"),
    });
    const auditLog = { log: jest.fn() };
    const service = new SalesInventoryReturnService(prisma as never, auditLog as never, { next: jest.fn() } as never);

    const posted = await service.postInventoryReturnMovement("org-1", "user-1", "return-1");

    expect(posted).toMatchObject({ id: "return-1", inventoryReturnMovementStatus: "POSTED" });
    expect(tx.salesInventoryReturn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "return-1",
          organizationId: "org-1",
          inventoryReturnPostedAt: null,
          status: { in: [SalesInventoryReturnStatus.APPROVED, SalesInventoryReturnStatus.RECEIVED] },
        }),
      }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          itemId: "item-1",
          warehouseId: "warehouse-1",
          type: StockMovementType.SALES_RETURN_IN,
          quantity: "2.0000",
          referenceType: "SalesInventoryReturn",
          referenceId: "return-1",
          createdById: "user-1",
        }),
      }),
    );
    expect(tx.salesInventoryReturnLine.update).toHaveBeenCalledWith({
      where: { id: "return-line-1" },
      data: { stockMovementId: "movement-return-1" },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.creditNote.create).not.toHaveBeenCalled();
    expect(tx.customerRefund.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(tx.emailOutbox.create).not.toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "POST_INVENTORY_RETURN_MOVEMENT",
        entityType: "SalesInventoryReturn",
        after: expect.objectContaining({
          movementIds: ["movement-return-1"],
          noAccountingEffect: true,
          noArEffect: true,
          noVatEffect: true,
          noZatcaEffect: true,
          noCreditNoteEffect: true,
          noRefundEffect: true,
        }),
      }),
    );
  });

  it("blocks duplicate sales return inventory movement posting", async () => {
    const tx = makeInventoryReturnPrisma({ inventoryReturnPostedAt: new Date("2026-06-06T12:00:00.000Z"), stockMovementId: "movement-return-1" });
    const prisma = { ...tx, $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInventoryReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.postInventoryReturnMovement("org-1", "user-1", "return-1")).rejects.toThrow("Sales inventory return movement has already been posted.");
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("blocks inventory movement from invalid statuses and missing warehouses", async () => {
    const submittedPrisma = makeInventoryReturnPrisma({ status: SalesInventoryReturnStatus.SUBMITTED });
    const submittedService = new SalesInventoryReturnService(submittedPrisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    const submittedPreview = await submittedService.inventoryReturnPreview("org-1", "return-1");
    expect(submittedPreview.canPost).toBe(false);
    expect(submittedPreview.blockingReasons).toContain("Inventory return movement can be posted only for approved or received sales inventory returns.");

    const missingWarehousePrisma = makeInventoryReturnPrisma({
      sourceSalesStockIssueId: null,
      sourceSalesStockIssue: null,
      sourceSalesStockIssueLineId: null,
      warehouse: null,
      sourceSalesStockIssueLine: null,
    });
    const missingWarehouseService = new SalesInventoryReturnService(missingWarehousePrisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    const missingWarehousePreview = await missingWarehouseService.inventoryReturnPreview("org-1", "return-1");
    expect(missingWarehousePreview.canPost).toBe(false);
    expect(missingWarehousePreview.blockingReasons.join(" ")).toContain("requires an active return warehouse");
  });

  it("tenant-scopes sales inventory return detail lookup", async () => {
    const prisma = { salesInventoryReturn: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new SalesInventoryReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.get("org-2", "return-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.salesInventoryReturn.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "return-1", organizationId: "org-2" } }));
  });
});

function makeCreateDto(overrides: Partial<Parameters<SalesInventoryReturnService["create"]>[2]> = {}) {
  return {
    customerId: "customer-1",
    returnDate: "2026-06-06",
    reason: "Customer returned damaged goods",
    sourceSalesStockIssueId: "issue-1",
    lines: [{ sourceSalesStockIssueLineId: "issue-line-1", quantity: "2.0000", reason: "Damaged" }],
    ...overrides,
  };
}

function makeTransactionMock(overrides: Record<string, unknown> = {}) {
  const tx: any = {
    contact: {
      findFirst: jest.fn().mockResolvedValue({ id: "customer-1", type: ContactType.CUSTOMER, isActive: true }),
    },
    salesInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
    creditNote: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    deliveryNote: { findFirst: jest.fn().mockResolvedValue(null) },
    salesStockIssue: {
      findFirst: jest.fn().mockResolvedValue({ id: "issue-1", customerId: "customer-1", status: SalesStockIssueStatus.POSTED }),
    },
    item: {
      findMany: jest.fn().mockResolvedValue([
        { id: "item-1", name: "Tracked Item", description: "Tracked inventory item", status: ItemStatus.ACTIVE, inventoryTracking: true },
      ]),
    },
    warehouse: { findMany: jest.fn().mockResolvedValue([]) },
    salesInvoiceLine: { findMany: jest.fn().mockResolvedValue([]) },
    creditNoteLine: { findMany: jest.fn().mockResolvedValue([]) },
    deliveryNoteLine: { findMany: jest.fn().mockResolvedValue([]) },
    salesStockIssueLine: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "issue-line-1",
          issueId: "issue-1",
          itemId: "item-1",
          quantity: new Prisma.Decimal("5.0000"),
          unitCost: new Prisma.Decimal("8.0000"),
          stockMovementId: "issue-movement-1",
          issue: { id: "issue-1", customerId: "customer-1", status: SalesStockIssueStatus.POSTED, warehouseId: "warehouse-1" },
        },
      ]),
    },
    salesInventoryReturn: {
      create: jest.fn().mockResolvedValue(makeSalesReturnRecord({ status: SalesInventoryReturnStatus.DRAFT })),
      findFirst: jest.fn().mockResolvedValue(makeSalesReturnRecord()),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    salesInventoryReturnLine: {
      findMany: jest.fn().mockImplementation(({ where }: { where: Record<string, unknown> }) => {
        const rows = (overrides.alreadyReturnedRows as unknown[]) ?? [];
        if (where.sourceSalesStockIssueLineId) return Promise.resolve(rows);
        return Promise.resolve([]);
      }),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    stockMovement: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    journalEntry: { create: jest.fn() },
    customerRefund: { create: jest.fn() },
    zatcaInvoiceMetadata: { upsert: jest.fn() },
    emailOutbox: { create: jest.fn() },
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value) && key in tx) {
      tx[key] = { ...tx[key], ...(value as Record<string, unknown>) };
    }
  }
  return tx;
}

function makeInventoryReturnPrisma(overrides: Record<string, any> = {}) {
  const baseRecord = makeSalesReturnRecord();
  const baseLine = baseRecord.lines[0]!;
  const record = makeSalesReturnRecord({
    status: overrides.status ?? SalesInventoryReturnStatus.APPROVED,
    sourceSalesStockIssueId: overrides.sourceSalesStockIssueId === undefined ? baseRecord.sourceSalesStockIssueId : overrides.sourceSalesStockIssueId,
    sourceSalesStockIssue: overrides.sourceSalesStockIssue === undefined ? baseRecord.sourceSalesStockIssue : overrides.sourceSalesStockIssue,
    inventoryReturnPostedAt: overrides.inventoryReturnPostedAt ?? null,
    lines: [
      {
        ...baseLine,
        stockMovementId: overrides.stockMovementId ?? baseLine.stockMovementId,
        warehouse: overrides.warehouse === undefined ? baseLine.warehouse : overrides.warehouse,
        warehouseId: overrides.warehouse === null ? null : baseLine.warehouseId,
        sourceSalesStockIssueLineId: overrides.sourceSalesStockIssueLineId === undefined ? baseLine.sourceSalesStockIssueLineId : overrides.sourceSalesStockIssueLineId,
        sourceSalesStockIssueLine: overrides.sourceSalesStockIssueLine === undefined ? baseLine.sourceSalesStockIssueLine : overrides.sourceSalesStockIssueLine,
      },
    ],
  });
  return {
    salesInventoryReturn: {
      findFirst: jest.fn().mockResolvedValue(record),
      updateMany: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn().mockResolvedValue([{ type: StockMovementType.OPENING_BALANCE, quantity: new Prisma.Decimal("5.0000") }]),
      create: jest.fn(),
    },
    salesInventoryReturnLine: { update: jest.fn() },
    journalEntry: { create: jest.fn() },
    creditNote: { create: jest.fn() },
    customerRefund: { create: jest.fn() },
    zatcaInvoiceMetadata: { upsert: jest.fn() },
    emailOutbox: { create: jest.fn() },
  };
}

function makeSalesReturnRecord(overrides: Record<string, any> = {}): any {
  const line = {
    id: "return-line-1",
    organizationId: "org-1",
    salesInventoryReturnId: "return-1",
    itemId: "item-1",
    description: "Returned inventory item",
    quantity: new Prisma.Decimal("2.0000"),
    sourceSalesInvoiceLineId: null,
    sourceCreditNoteLineId: null,
    sourceDeliveryNoteLineId: null,
    sourceSalesStockIssueLineId: "issue-line-1",
    warehouseId: "warehouse-1",
    stockMovementId: null,
    reason: "Damaged",
    sortOrder: 0,
    createdAt: new Date("2026-06-06T00:00:00.000Z"),
    updatedAt: new Date("2026-06-06T00:00:00.000Z"),
    item: { id: "item-1", name: "Tracked Item", sku: "TRK", status: ItemStatus.ACTIVE, inventoryTracking: true },
    warehouse: { id: "warehouse-1", code: "MAIN", name: "Main warehouse", status: WarehouseStatus.ACTIVE, isDefault: true },
    sourceSalesInvoiceLine: null,
    sourceCreditNoteLine: null,
    sourceDeliveryNoteLine: null,
    sourceSalesStockIssueLine: {
      id: "issue-line-1",
      issueId: "issue-1",
      itemId: "item-1",
      quantity: new Prisma.Decimal("5.0000"),
      unitCost: new Prisma.Decimal("8.0000"),
      stockMovementId: "issue-movement-1",
      issue: {
        id: "issue-1",
        issueNumber: "SSI-000001",
        customerId: "customer-1",
        status: SalesStockIssueStatus.POSTED,
        warehouseId: "warehouse-1",
        warehouse: { id: "warehouse-1", code: "MAIN", name: "Main warehouse", status: WarehouseStatus.ACTIVE, isDefault: true },
      },
      stockMovement: { id: "issue-movement-1", type: StockMovementType.SALES_ISSUE_PLACEHOLDER, warehouseId: "warehouse-1", unitCost: new Prisma.Decimal("8.0000") },
    },
    stockMovement: null,
  };
  return {
    id: "return-1",
    organizationId: "org-1",
    customerId: "customer-1",
    salesReturnNumber: "SRN-000001",
    status: SalesInventoryReturnStatus.APPROVED,
    returnDate: new Date("2026-06-06T00:00:00.000Z"),
    reason: "Customer returned damaged goods",
    reference: "RMA-1",
    sourceSalesInvoiceId: null,
    sourceCreditNoteId: null,
    sourceDeliveryNoteId: null,
    sourceSalesStockIssueId: "issue-1",
    notes: null,
    createdByUserId: "user-1",
    approvedByUserId: null,
    inventoryReturnPostedByUserId: null,
    approvedAt: null,
    receivedAt: null,
    cancelledAt: null,
    voidedAt: null,
    inventoryReturnPostedAt: null,
    createdAt: new Date("2026-06-06T00:00:00.000Z"),
    updatedAt: new Date("2026-06-06T00:00:00.000Z"),
    customer: { id: "customer-1", name: "Customer", displayName: "Customer", type: ContactType.CUSTOMER, taxNumber: null, isActive: true },
    sourceSalesInvoice: null,
    sourceCreditNote: null,
    sourceDeliveryNote: null,
    sourceSalesStockIssue: {
      id: "issue-1",
      issueNumber: "SSI-000001",
      status: SalesStockIssueStatus.POSTED,
      issueDate: new Date("2026-06-05T00:00:00.000Z"),
      customerId: "customer-1",
      warehouseId: "warehouse-1",
      warehouse: { id: "warehouse-1", code: "MAIN", name: "Main warehouse", status: WarehouseStatus.ACTIVE, isDefault: true },
    },
    createdBy: null,
    approvedBy: null,
    inventoryReturnPostedBy: null,
    lines: [line],
    ...overrides,
  };
}
