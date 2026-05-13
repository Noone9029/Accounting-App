import { InventoryAdjustmentStatus, InventoryAdjustmentType, ItemStatus, Prisma, StockMovementType, WarehouseStatus } from "@prisma/client";
import { InventoryAdjustmentService } from "./inventory-adjustment.service";

describe("InventoryAdjustmentService", () => {
  const item = { id: "item-1", inventoryTracking: true, status: ItemStatus.ACTIVE };
  const warehouse = { id: "warehouse-1", status: WarehouseStatus.ACTIVE };
  type InventoryAdjustmentFixture = {
    id: string;
    organizationId: string;
    adjustmentNumber: string;
    itemId: string;
    warehouseId: string;
    type: InventoryAdjustmentType;
    status: InventoryAdjustmentStatus;
    adjustmentDate: Date;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    totalCost: Prisma.Decimal;
  };

  const draftAdjustment: InventoryAdjustmentFixture = {
    id: "adjustment-1",
    organizationId: "org-1",
    adjustmentNumber: "ADJ-000001",
    itemId: item.id,
    warehouseId: warehouse.id,
    type: InventoryAdjustmentType.INCREASE,
    status: InventoryAdjustmentStatus.DRAFT,
    adjustmentDate: new Date("2026-05-14T00:00:00.000Z"),
    quantity: new Prisma.Decimal("2.0000"),
    unitCost: new Prisma.Decimal("5.0000"),
    totalCost: new Prisma.Decimal("10.0000"),
  };

  function makeService(tx: Record<string, unknown>, directOverrides: Record<string, unknown> = {}) {
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      inventoryAdjustment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        delete: jest.fn(),
      },
      ...directOverrides,
    };
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValue("ADJ-000001") };
    return { service: new InventoryAdjustmentService(prisma as never, audit as never, numbers as never), prisma, audit, numbers };
  }

  function makeTx(adjustment = draftAdjustment, movements: Array<{ type: StockMovementType; quantity: Prisma.Decimal }> = []) {
    return {
      item: { findFirst: jest.fn().mockResolvedValue(item) },
      warehouse: { findFirst: jest.fn().mockResolvedValue(warehouse) },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue(movements),
        create: jest.fn().mockResolvedValue({ id: "movement-1" }),
      },
      inventoryAdjustment: {
        create: jest.fn().mockResolvedValue({ id: adjustment.id }),
        findFirst: jest.fn().mockResolvedValue(adjustment),
        findUniqueOrThrow: jest.fn().mockResolvedValue(adjustment),
        update: jest.fn().mockResolvedValue(adjustment),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
  }

  it("creates a draft adjustment", async () => {
    const tx = makeTx();
    const { service, numbers, audit } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        warehouseId: warehouse.id,
        type: InventoryAdjustmentType.INCREASE,
        adjustmentDate: "2026-05-14",
        quantity: "2.0000",
        unitCost: "5.0000",
      }),
    ).resolves.toMatchObject({ id: "adjustment-1" });

    expect(numbers.next).toHaveBeenCalledWith("org-1", "INVENTORY_ADJUSTMENT", tx);
    expect(tx.inventoryAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: "2.0000",
          unitCost: "5.0000",
          totalCost: "10.0000",
          createdById: "user-1",
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "InventoryAdjustment" }));
  });

  it("approves an increase by creating an adjustment-in stock movement", async () => {
    const tx = makeTx(draftAdjustment);
    const { service } = makeService(tx);

    await expect(service.approve("org-1", "user-1", "adjustment-1")).resolves.toMatchObject({ id: "adjustment-1" });

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: StockMovementType.ADJUSTMENT_IN,
          referenceType: "InventoryAdjustment",
          referenceId: "adjustment-1",
        }),
      }),
    );
  });

  it("approves a decrease by creating an adjustment-out stock movement", async () => {
    const decrease = { ...draftAdjustment, type: InventoryAdjustmentType.DECREASE };
    const tx = makeTx(decrease, [{ type: StockMovementType.OPENING_BALANCE, quantity: new Prisma.Decimal("3.0000") }]);
    const { service } = makeService(tx);

    await expect(service.approve("org-1", "user-1", "adjustment-1")).resolves.toMatchObject({ id: "adjustment-1" });

    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_OUT }) }),
    );
  });

  it("rejects decrease approval that would make stock negative", async () => {
    const decrease = { ...draftAdjustment, type: InventoryAdjustmentType.DECREASE, quantity: new Prisma.Decimal("5.0000") };
    const tx = makeTx(decrease, [{ type: StockMovementType.OPENING_BALANCE, quantity: new Prisma.Decimal("3.0000") }]);
    const { service } = makeService(tx);

    await expect(service.approve("org-1", "user-1", "adjustment-1")).rejects.toThrow(
      "Decrease adjustment cannot make stock negative.",
    );
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("rejects approving an already approved adjustment", async () => {
    const tx = makeTx({ ...draftAdjustment, status: InventoryAdjustmentStatus.APPROVED });
    const { service } = makeService(tx);

    await expect(service.approve("org-1", "user-1", "adjustment-1")).rejects.toThrow(
      "Inventory adjustment is already approved.",
    );
  });

  it("voids approved increases and decreases with reversing stock movements", async () => {
    const approvedIncrease = { ...draftAdjustment, status: InventoryAdjustmentStatus.APPROVED };
    const txIncrease = makeTx(approvedIncrease, [{ type: StockMovementType.ADJUSTMENT_IN, quantity: new Prisma.Decimal("2.0000") }]);
    const increase = makeService(txIncrease);
    jest.spyOn(increase.service, "get").mockResolvedValueOnce(approvedIncrease as never);

    await expect(increase.service.void("org-1", "user-1", "adjustment-1")).resolves.toMatchObject({ id: "adjustment-1" });
    expect(txIncrease.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_OUT, referenceType: "InventoryAdjustmentVoid" }) }),
    );

    const approvedDecrease = { ...draftAdjustment, type: InventoryAdjustmentType.DECREASE, status: InventoryAdjustmentStatus.APPROVED };
    const txDecrease = makeTx(approvedDecrease);
    const decrease = makeService(txDecrease);
    jest.spyOn(decrease.service, "get").mockResolvedValueOnce(approvedDecrease as never);

    await expect(decrease.service.void("org-1", "user-1", "adjustment-1")).resolves.toMatchObject({ id: "adjustment-1" });
    expect(txDecrease.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.ADJUSTMENT_IN }) }),
    );
  });

  it("allows draft delete and blocks approved edit/delete", async () => {
    const { service, prisma } = makeService(makeTx(), {
      inventoryAdjustment: { delete: jest.fn().mockResolvedValue({}), findMany: jest.fn(), findFirst: jest.fn(), findUniqueOrThrow: jest.fn() },
    });
    jest.spyOn(service, "get").mockResolvedValueOnce(draftAdjustment as never);
    await expect(service.remove("org-1", "user-1", "adjustment-1")).resolves.toEqual({ deleted: true });
    expect(prisma.inventoryAdjustment.delete).toHaveBeenCalledWith({ where: { id: "adjustment-1" } });

    const approved = { ...draftAdjustment, status: InventoryAdjustmentStatus.APPROVED };
    jest.spyOn(service, "get").mockResolvedValueOnce(approved as never);
    await expect(service.update("org-1", "user-1", "adjustment-1", { quantity: "1.0000" })).rejects.toThrow(
      "Only draft inventory adjustments can be edited.",
    );

    jest.spyOn(service, "get").mockResolvedValueOnce(approved as never);
    await expect(service.remove("org-1", "user-1", "adjustment-1")).rejects.toThrow(
      "Only draft inventory adjustments can be deleted.",
    );
  });

  it("keeps tenant isolation by rejecting missing adjustment details", async () => {
    const { service, prisma } = makeService(makeTx(), {
      inventoryAdjustment: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.get("other-org", "adjustment-1")).rejects.toThrow("Inventory adjustment not found.");
    expect(prisma.inventoryAdjustment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "adjustment-1", organizationId: "other-org" } }),
    );
  });
});
