import { ItemStatus, Prisma, StockMovementType, WarehouseStatus, WarehouseTransferStatus } from "@prisma/client";
import { WarehouseTransferService } from "./warehouse-transfer.service";

describe("WarehouseTransferService", () => {
  const item = { id: "item-1", inventoryTracking: true, status: ItemStatus.ACTIVE };
  const fromWarehouse = { id: "from-warehouse", status: WarehouseStatus.ACTIVE };
  const toWarehouse = { id: "to-warehouse", status: WarehouseStatus.ACTIVE };
  const transfer = {
    id: "transfer-1",
    organizationId: "org-1",
    transferNumber: "WTR-000001",
    itemId: item.id,
    fromWarehouseId: fromWarehouse.id,
    toWarehouseId: toWarehouse.id,
    status: WarehouseTransferStatus.POSTED,
    transferDate: new Date("2026-05-14T00:00:00.000Z"),
    quantity: new Prisma.Decimal("2.0000"),
    unitCost: new Prisma.Decimal("5.0000"),
    totalCost: new Prisma.Decimal("10.0000"),
  };

  function makeService(tx: Record<string, unknown>, directOverrides: Record<string, unknown> = {}) {
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      warehouseTransfer: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      ...directOverrides,
    };
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValue("WTR-000001") };
    return { service: new WarehouseTransferService(prisma as never, audit as never, numbers as never), prisma, audit, numbers };
  }

  function makeTx(
    stockByWarehouse: Record<string, Array<{ type: StockMovementType; quantity: Prisma.Decimal }>> = {
      [fromWarehouse.id]: [{ type: StockMovementType.OPENING_BALANCE, quantity: new Prisma.Decimal("5.0000") }],
      [toWarehouse.id]: [],
    },
    transferRecord = transfer,
  ) {
    return {
      item: { findFirst: jest.fn().mockResolvedValue(item) },
      warehouse: { findFirst: jest.fn().mockResolvedValueOnce(fromWarehouse).mockResolvedValueOnce(toWarehouse) },
      stockMovement: {
        findMany: jest.fn((args: { where: { warehouseId: string } }) => Promise.resolve(stockByWarehouse[args.where.warehouseId] ?? [])),
        create: jest.fn().mockResolvedValueOnce({ id: "from-movement" }).mockResolvedValueOnce({ id: "to-movement" }),
      },
      warehouseTransfer: {
        create: jest.fn().mockResolvedValue({ id: transferRecord.id }),
        findFirst: jest.fn().mockResolvedValue(transferRecord),
        findUniqueOrThrow: jest.fn().mockResolvedValue(transferRecord),
        update: jest.fn().mockResolvedValue(transferRecord),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
  }

  it("creates a posted transfer with transfer-out and transfer-in movements", async () => {
    const tx = makeTx();
    const { service, numbers, audit } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: toWarehouse.id,
        transferDate: "2026-05-14",
        quantity: "2.0000",
        unitCost: "5.0000",
      }),
    ).resolves.toMatchObject({ id: "transfer-1" });

    expect(numbers.next).toHaveBeenCalledWith("org-1", "WAREHOUSE_TRANSFER", tx);
    expect(tx.stockMovement.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.TRANSFER_OUT, warehouseId: fromWarehouse.id }) }),
    );
    expect(tx.stockMovement.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.TRANSFER_IN, warehouseId: toWarehouse.id }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "WarehouseTransfer" }));
  });

  it("rejects same warehouse and insufficient source stock", async () => {
    const tx = makeTx();
    const { service, prisma } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        itemId: item.id,
        fromWarehouseId: "same",
        toWarehouseId: "same",
        transferDate: "2026-05-14",
        quantity: "1.0000",
      }),
    ).rejects.toThrow("Transfer source and destination warehouses must be different.");
    expect(prisma.$transaction).not.toHaveBeenCalled();

    const insufficientTx = makeTx({ [fromWarehouse.id]: [{ type: StockMovementType.OPENING_BALANCE, quantity: new Prisma.Decimal("1.0000") }] });
    await expect(
      makeService(insufficientTx).service.create("org-1", "user-1", {
        itemId: item.id,
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: toWarehouse.id,
        transferDate: "2026-05-14",
        quantity: "2.0000",
      }),
    ).rejects.toThrow("Warehouse transfer cannot make source warehouse stock negative.");
  });

  it("voids a transfer with reversing movements and rejects double void", async () => {
    const tx = makeTx({
      [toWarehouse.id]: [{ type: StockMovementType.TRANSFER_IN, quantity: new Prisma.Decimal("2.0000") }],
    });
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(transfer as never);

    await expect(service.void("org-1", "user-1", "transfer-1")).resolves.toMatchObject({ id: "transfer-1" });

    expect(tx.stockMovement.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.TRANSFER_IN, warehouseId: fromWarehouse.id }) }),
    );
    expect(tx.stockMovement.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ type: StockMovementType.TRANSFER_OUT, warehouseId: toWarehouse.id }) }),
    );

    const voided = { ...transfer, status: WarehouseTransferStatus.VOIDED };
    jest.spyOn(service, "get").mockResolvedValueOnce(voided as never);
    await expect(service.void("org-1", "user-1", "transfer-1")).rejects.toThrow("Warehouse transfer is already voided.");
  });

  it("rejects voids that would make destination stock negative", async () => {
    const tx = makeTx({ [toWarehouse.id]: [] });
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce(transfer as never);

    await expect(service.void("org-1", "user-1", "transfer-1")).rejects.toThrow(
      "Voiding this warehouse transfer cannot make destination warehouse stock negative.",
    );
  });

  it("keeps tenant isolation by rejecting missing transfer details", async () => {
    const { service, prisma } = makeService(makeTx(), {
      warehouseTransfer: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.get("other-org", "transfer-1")).rejects.toThrow("Warehouse transfer not found.");
    expect(prisma.warehouseTransfer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "transfer-1", organizationId: "other-org" } }),
    );
  });
});
