import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  ContactType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
  PurchaseMatchingReviewStatus,
  PurchaseReceiptStatus,
  PurchaseReturnStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { PurchaseReturnService } from "./purchase-return.service";

describe("purchase return rules", () => {
  it("creates a draft operational return without journal, AP, inventory, debit note, or refund side effects", async () => {
    const tx = makeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const numberSequence = { next: jest.fn().mockResolvedValue("PRN-000001") };
    const service = new PurchaseReturnService(prisma as never, auditLog as never, numberSequence as never);

    const created = await service.create("org-1", "user-1", {
      supplierId: "supplier-1",
      returnDate: "2026-06-05",
      sourcePurchaseBillId: "bill-1",
      reason: "Damaged goods",
      lines: [{ sourcePurchaseBillLineId: "bill-line-1", quantity: "2.0000" }],
    });

    expect(created).toMatchObject({
      id: "return-1",
      purchaseReturnNumber: "PRN-000001",
      status: PurchaseReturnStatus.DRAFT,
    });
    expect(numberSequence.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.PURCHASE_RETURN, tx);
    expect(tx.purchaseReturn.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          purchaseReturnNumber: "PRN-000001",
          status: PurchaseReturnStatus.DRAFT,
          sourcePurchaseBillId: "bill-1",
          lines: {
            create: [
              expect.objectContaining({
                quantity: "2.0000",
                sourcePurchaseBillLine: { connect: { id: "bill-line-1" } },
              }),
            ],
          },
        }),
      }),
    );
    expect(tx.journalEntry?.create).not.toHaveBeenCalled();
    expect(tx.stockMovement?.create).not.toHaveBeenCalled();
    expect(tx.purchaseDebitNote?.create).not.toHaveBeenCalled();
    expect(tx.supplierRefund?.create).not.toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "PurchaseReturn" }));
  });

  it("rejects returned quantity above the safe source line quantity", async () => {
    const tx = makeTransactionMock({
      existingReturnedQuantity: "5.0000",
      sourceQuantity: "10.0000",
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        supplierId: "supplier-1",
        returnDate: "2026-06-05",
        sourcePurchaseBillId: "bill-1",
        lines: [{ sourcePurchaseBillLineId: "bill-line-1", quantity: "6.0000" }],
      }),
    ).rejects.toThrow("Returned quantity cannot exceed available quantity on source line 1.");
    expect(tx.purchaseReturn.create).not.toHaveBeenCalled();
  });

  it("allows linking only purchase matching reviews marked as needing return review", async () => {
    const tx = makeTransactionMock({
      matchingReviewStatus: PurchaseMatchingReviewStatus.NEEDS_VARIANCE_REVIEW,
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        supplierId: "supplier-1",
        returnDate: "2026-06-05",
        sourceMatchingReviewId: "review-1",
        lines: [{ description: "Manual return line", quantity: "1.0000" }],
      }),
    ).rejects.toThrow("Purchase returns can only link matching reviews marked as needing return review.");
  });

  it("prevents edits outside draft status", async () => {
    const service = new PurchaseReturnService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "return-1", status: PurchaseReturnStatus.APPROVED } as never);

    await expect(service.update("org-1", "user-1", "return-1", { reason: "Change" })).rejects.toThrow("Only draft purchase returns can be edited.");
  });

  it("requires approval before completion and does not create posting side effects", async () => {
    const prisma = {
      purchaseReturn: { update: jest.fn() },
      journalEntry: { create: jest.fn() },
      stockMovement: { create: jest.fn() },
    };
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "return-1", status: PurchaseReturnStatus.SUBMITTED } as never);

    await expect(service.complete("org-1", "user-1", "return-1")).rejects.toThrow("Only approved purchase returns can be completed.");
    expect(prisma.purchaseReturn.update).not.toHaveBeenCalled();
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it("previews purchase return inventory movement without posting", async () => {
    const prisma = makeInventoryReturnPrisma();
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    const preview = await service.inventoryReturnPreview("org-1", "return-1");

    expect(preview).toMatchObject({
      readOnly: true,
      previewOnly: true,
      noPostingEffect: true,
      noAccountingEffect: true,
      noApEffect: true,
      noVatEffect: true,
      noValuationPosting: true,
      canPost: true,
      inventoryMovementStatus: "NOT_POSTED",
      sourcePurchaseReturn: { id: "return-1", purchaseReturnNumber: "PRN-000001", status: PurchaseReturnStatus.APPROVED },
      lines: [
        expect.objectContaining({
          lineId: "return-line-1",
          returnQuantity: "2.0000",
          currentOnHand: "10.0000",
          projectedOnHandAfterReturn: "8.0000",
          movementType: StockMovementType.PURCHASE_RETURN_OUT,
          status: "POSTABLE",
        }),
      ],
    });
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(preview.safeHelperText).toContain("operational stock movement only");
  });

  it("posts purchase return inventory movement once with no accounting, AP, VAT, or valuation side effects", async () => {
    const tx = makeInventoryReturnPrisma();
    const root = makeInventoryReturnPrisma();
    const before = makeInventoryReturnRecord();
    const after = makeInventoryReturnRecord({
      inventoryReturnPostedAt: new Date("2026-06-05T12:00:00.000Z"),
      lines: [
        {
          ...makeInventoryReturnRecord().lines[0],
          stockMovementId: "movement-return-1",
          stockMovement: {
            id: "movement-return-1",
            type: StockMovementType.PURCHASE_RETURN_OUT,
            movementDate: new Date("2026-06-05T00:00:00.000Z"),
            quantity: new Prisma.Decimal("2.0000"),
            referenceType: "PurchaseReturn",
            referenceId: "return-1",
          },
        },
      ],
    });
    const prisma = {
      ...root,
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    prisma.purchaseReturn.findFirst = jest.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    tx.purchaseReturn.findFirst.mockResolvedValue(before);
    tx.purchaseReturn.updateMany.mockResolvedValue({ count: 1 });
    tx.stockMovement.create.mockResolvedValue({
      id: "movement-return-1",
      itemId: "item-1",
      warehouseId: "warehouse-1",
      quantity: new Prisma.Decimal("2.0000"),
    });
    const auditLog = { log: jest.fn() };
    const service = new PurchaseReturnService(prisma as never, auditLog as never, { next: jest.fn() } as never);

    const posted = await service.postInventoryReturnMovement("org-1", "user-1", "return-1");

    expect(posted).toMatchObject({ id: "return-1", inventoryReturnMovementStatus: "POSTED" });
    expect(tx.purchaseReturn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "return-1",
          organizationId: "org-1",
          inventoryReturnPostedAt: null,
          status: { in: [PurchaseReturnStatus.APPROVED, PurchaseReturnStatus.COMPLETED] },
        }),
      }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          itemId: "item-1",
          warehouseId: "warehouse-1",
          type: StockMovementType.PURCHASE_RETURN_OUT,
          quantity: "2.0000",
          referenceType: "PurchaseReturn",
          referenceId: "return-1",
          createdById: "user-1",
        }),
      }),
    );
    expect(tx.purchaseReturnLine.update).toHaveBeenCalledWith({
      where: { id: "return-line-1" },
      data: { stockMovementId: "movement-return-1" },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.purchaseDebitNote.create).not.toHaveBeenCalled();
    expect(tx.supplierRefund.create).not.toHaveBeenCalled();
    expect(tx.inventoryVarianceProposal.create).not.toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "POST_INVENTORY_RETURN_MOVEMENT",
        entityType: "PurchaseReturn",
        after: expect.objectContaining({
          movementIds: ["movement-return-1"],
          noAccountingEffect: true,
          noApEffect: true,
          noVatEffect: true,
          noValuationPosting: true,
        }),
      }),
    );
  });

  it("blocks duplicate purchase return inventory movement posting", async () => {
    const tx = makeInventoryReturnPrisma({
      inventoryReturnPostedAt: new Date("2026-06-05T12:00:00.000Z"),
      stockMovementId: "movement-return-1",
    });
    const prisma = {
      ...tx,
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.postInventoryReturnMovement("org-1", "user-1", "return-1")).rejects.toThrow("Purchase return inventory movement has already been posted.");
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("blocks inventory movement preview for invalid purchase return status", async () => {
    const prisma = makeInventoryReturnPrisma({ status: PurchaseReturnStatus.SUBMITTED });
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    const preview = await service.inventoryReturnPreview("org-1", "return-1");

    expect(preview.canPost).toBe(false);
    expect(preview.blockingReasons).toContain("Inventory return movement can be posted only for approved or completed purchase returns.");
    expect(preview.lines[0]?.status).toBe("BLOCKED");
  });

  it("blocks purchase return inventory movement when stock would go negative", async () => {
    const prisma = makeInventoryReturnPrisma({ quantityOnHand: "1.0000" });
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    const preview = await service.inventoryReturnPreview("org-1", "return-1");

    expect(preview.canPost).toBe(false);
    expect(preview.blockingReasons).toContain("Line 1 would make warehouse stock negative.");
    expect(preview.lines[0]?.projectedOnHandAfterReturn).toBe("-1.0000");
  });

  it("skips non-tracked purchase return lines and does not create movement when no tracked lines exist", async () => {
    const prisma = makeInventoryReturnPrisma({ inventoryTracking: false });
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    const preview = await service.inventoryReturnPreview("org-1", "return-1");

    expect(preview.canPost).toBe(false);
    expect(preview.blockingReasons).toContain("Purchase return has no inventory-tracked receipt-linked lines to move.");
    expect(preview.lines[0]).toMatchObject({ movementRequired: false, status: "SKIPPED_NON_TRACKED" });
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it("returns not found when a purchase return is outside the organization scope", async () => {
    const prisma = { purchaseReturn: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.get("org-1", "return-from-other-org")).rejects.toThrow(NotFoundException);
    expect(prisma.purchaseReturn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "return-from-other-org", organizationId: "org-1" } }),
    );
  });

  it("denies inventory movement preview across tenant scope", async () => {
    const prisma = { purchaseReturn: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new PurchaseReturnService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.inventoryReturnPreview("org-1", "return-from-other-org")).rejects.toThrow(NotFoundException);
    expect(prisma.purchaseReturn.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "return-from-other-org", organizationId: "org-1" } }),
    );
  });
});

function makeTransactionMock(
  options: {
    existingReturnedQuantity?: string;
    sourceQuantity?: string;
    matchingReviewStatus?: PurchaseMatchingReviewStatus;
  } = {},
) {
  return {
    contact: {
      findFirst: jest.fn().mockResolvedValue({ id: "supplier-1", type: ContactType.SUPPLIER }),
    },
    item: {
      findFirst: jest.fn().mockResolvedValue({ id: "item-1" }),
    },
    purchaseBill: {
      findFirst: jest.fn().mockResolvedValue({ id: "bill-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED }),
    },
    purchaseOrder: { findFirst: jest.fn() },
    purchaseReceipt: { findFirst: jest.fn() },
    purchaseMatchingReview: {
      findFirst: jest.fn().mockResolvedValue({
        id: "review-1",
        supplierId: "supplier-1",
        status: options.matchingReviewStatus ?? PurchaseMatchingReviewStatus.NEEDS_RETURN_REVIEW,
      }),
    },
    purchaseDebitNote: { findFirst: jest.fn(), create: jest.fn() },
    supplierRefund: { findFirst: jest.fn(), create: jest.fn() },
    purchaseBillLine: {
      findFirst: jest.fn().mockResolvedValue({
        id: "bill-line-1",
        organizationId: "org-1",
        billId: "bill-1",
        supplierId: "supplier-1",
        itemId: "item-1",
        description: "Inventory item",
        quantity: options.sourceQuantity ?? "10.0000",
        unitPrice: "5.0000",
        bill: { id: "bill-1", supplierId: "supplier-1", status: PurchaseBillStatus.FINALIZED },
        item: { id: "item-1", name: "Inventory item" },
      }),
    },
    purchaseReceiptLine: { findFirst: jest.fn() },
    purchaseOrderLine: { findFirst: jest.fn() },
    purchaseReturnLine: {
      findMany: jest.fn().mockResolvedValue(
        options.existingReturnedQuantity
          ? [{ quantity: options.existingReturnedQuantity, sourcePurchaseBillLineId: "bill-line-1", sourcePurchaseReceiptLineId: null, sourcePurchaseOrderLineId: null }]
          : [],
      ),
    },
    purchaseReturn: {
      create: jest.fn().mockResolvedValue({
        id: "return-1",
        purchaseReturnNumber: "PRN-000001",
        supplierId: "supplier-1",
        status: PurchaseReturnStatus.DRAFT,
        reason: "Damaged goods",
      }),
    },
    journalEntry: { create: jest.fn() },
    stockMovement: { create: jest.fn() },
  };
}

function makeInventoryReturnPrisma(
  options: {
    status?: PurchaseReturnStatus;
    quantityOnHand?: string;
    inventoryTracking?: boolean;
    inventoryReturnPostedAt?: Date | null;
    stockMovementId?: string | null;
  } = {},
) {
  const record = makeInventoryReturnRecord(options);
  return {
    purchaseReturn: {
      findFirst: jest.fn().mockResolvedValue(record),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    purchaseReturnLine: {
      update: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn().mockResolvedValue([
        {
          type: StockMovementType.OPENING_BALANCE,
          quantity: new Prisma.Decimal(options.quantityOnHand ?? "10.0000"),
        },
      ]),
      create: jest.fn(),
    },
    journalEntry: { create: jest.fn() },
    purchaseDebitNote: { create: jest.fn() },
    supplierRefund: { create: jest.fn() },
    inventoryVarianceProposal: { create: jest.fn() },
  };
}

function makeInventoryReturnRecord(
  options: {
    status?: PurchaseReturnStatus;
    inventoryTracking?: boolean;
    inventoryReturnPostedAt?: Date | null;
    stockMovementId?: string | null;
    lines?: any[];
  } = {},
) {
  const warehouse = {
    id: "warehouse-1",
    code: "MAIN",
    name: "Main warehouse",
    status: WarehouseStatus.ACTIVE,
    isDefault: true,
  };
  const postedStockMovement = options.stockMovementId
    ? {
        id: options.stockMovementId,
        type: StockMovementType.PURCHASE_RETURN_OUT,
        movementDate: new Date("2026-06-05T00:00:00.000Z"),
        quantity: new Prisma.Decimal("2.0000"),
        referenceType: "PurchaseReturn",
        referenceId: "return-1",
      }
    : null;
  const defaultLine = {
    id: "return-line-1",
    organizationId: "org-1",
    purchaseReturnId: "return-1",
    itemId: "item-1",
    description: "Inventory item",
    quantity: new Prisma.Decimal("2.0000"),
    unitCost: new Prisma.Decimal("5.0000"),
    sourcePurchaseBillLineId: null,
    sourcePurchaseReceiptLineId: "receipt-line-1",
    sourcePurchaseOrderLineId: null,
    stockMovementId: options.stockMovementId ?? null,
    reason: "Damaged",
    sortOrder: 0,
    item: {
      id: "item-1",
      name: "Inventory item",
      sku: "INV-1",
      status: ItemStatus.ACTIVE,
      inventoryTracking: options.inventoryTracking ?? true,
    },
    sourcePurchaseBillLine: null,
    sourcePurchaseReceiptLine: {
      id: "receipt-line-1",
      receiptId: "receipt-1",
      quantity: new Prisma.Decimal("10.0000"),
      unitCost: new Prisma.Decimal("5.0000"),
      stockMovementId: "receipt-movement-1",
      stockMovement: {
        id: "receipt-movement-1",
        type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
        movementDate: new Date("2026-06-04T00:00:00.000Z"),
        quantity: new Prisma.Decimal("10.0000"),
        unitCost: new Prisma.Decimal("5.0000"),
        totalCost: new Prisma.Decimal("50.0000"),
        warehouseId: warehouse.id,
        warehouse,
      },
      receipt: {
        id: "receipt-1",
        receiptNumber: "REC-000001",
        status: PurchaseReceiptStatus.POSTED,
        warehouseId: warehouse.id,
        warehouse,
      },
    },
    sourcePurchaseOrderLine: null,
    stockMovement: postedStockMovement,
  };

  return {
    id: "return-1",
    organizationId: "org-1",
    supplierId: "supplier-1",
    purchaseReturnNumber: "PRN-000001",
    status: options.status ?? PurchaseReturnStatus.APPROVED,
    returnDate: new Date("2026-06-05T00:00:00.000Z"),
    reason: "Damaged goods",
    reference: null,
    sourcePurchaseBillId: null,
    sourcePurchaseOrderId: null,
    sourcePurchaseReceiptId: "receipt-1",
    sourceMatchingReviewId: null,
    relatedPurchaseDebitNoteId: null,
    relatedSupplierRefundId: null,
    notes: null,
    inventoryReturnPostedAt: options.inventoryReturnPostedAt ?? null,
    inventoryReturnPostedByUserId: null,
    createdByUserId: "user-1",
    approvedByUserId: "user-1",
    approvedAt: new Date("2026-06-05T01:00:00.000Z"),
    completedAt: null,
    voidedAt: null,
    createdAt: new Date("2026-06-05T00:00:00.000Z"),
    updatedAt: new Date("2026-06-05T00:00:00.000Z"),
    supplier: { id: "supplier-1", name: "Supplier", displayName: null, type: ContactType.SUPPLIER, taxNumber: null },
    sourcePurchaseBill: null,
    sourcePurchaseOrder: null,
    sourcePurchaseReceipt: {
      id: "receipt-1",
      receiptNumber: "REC-000001",
      status: PurchaseReceiptStatus.POSTED,
      receiptDate: new Date("2026-06-04T00:00:00.000Z"),
      supplierId: "supplier-1",
      purchaseOrderId: null,
      purchaseBillId: null,
      warehouseId: warehouse.id,
      warehouse,
    },
    sourceMatchingReview: null,
    relatedPurchaseDebitNote: null,
    relatedSupplierRefund: null,
    createdBy: { id: "user-1", name: "User", email: "user@example.test" },
    approvedBy: { id: "user-1", name: "User", email: "user@example.test" },
    inventoryReturnPostedBy: null,
    lines: options.lines ?? [defaultLine],
  };
}
