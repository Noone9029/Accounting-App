import { WarehouseStatus } from "@prisma/client";
import { WarehouseService } from "./warehouse.service";

describe("WarehouseService", () => {
  const warehouse = {
    id: "warehouse-1",
    organizationId: "org-1",
    code: "MAIN",
    name: "Main Warehouse",
    status: WarehouseStatus.ACTIVE,
    isDefault: true,
  };

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      warehouse: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      ...overrides,
    };
    const audit = { log: jest.fn() };
    return { service: new WarehouseService(prisma as never, audit as never), prisma, audit };
  }

  it("creates a warehouse with normalized code", async () => {
    const { service, prisma, audit } = makeService();
    prisma.warehouse.findFirst.mockResolvedValue(null);
    prisma.warehouse.create.mockResolvedValue({ ...warehouse, code: "SEC" });

    await expect(service.create("org-1", "user-1", { code: " sec ", name: "Secondary" })).resolves.toMatchObject({ code: "SEC" });
    expect(prisma.warehouse.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1", code: "SEC", name: "Secondary" }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "Warehouse" }));
  });

  it("rejects duplicate warehouse codes per tenant", async () => {
    const { service, prisma } = makeService();
    prisma.warehouse.findFirst.mockResolvedValue({ id: "existing" });

    await expect(service.create("org-1", "user-1", { code: "MAIN", name: "Duplicate" })).rejects.toThrow(
      "Warehouse code must be unique for this organization.",
    );
    expect(prisma.warehouse.create).not.toHaveBeenCalled();
  });

  it("prevents archiving the only active default warehouse", async () => {
    const { service, prisma } = makeService();
    prisma.warehouse.findFirst.mockResolvedValue(warehouse);
    prisma.warehouse.count.mockResolvedValue(1);

    await expect(service.archive("org-1", "user-1", "warehouse-1")).rejects.toThrow(
      "Cannot archive the only active default warehouse.",
    );
    expect(prisma.warehouse.update).not.toHaveBeenCalled();
  });

  it("archives and reactivates warehouses", async () => {
    const { service, prisma, audit } = makeService();
    prisma.warehouse.findFirst.mockResolvedValueOnce({ ...warehouse, isDefault: false }).mockResolvedValueOnce({
      ...warehouse,
      status: WarehouseStatus.ARCHIVED,
      isDefault: false,
    });
    prisma.warehouse.update
      .mockResolvedValueOnce({ ...warehouse, status: WarehouseStatus.ARCHIVED, isDefault: false })
      .mockResolvedValueOnce({ ...warehouse, status: WarehouseStatus.ACTIVE, isDefault: false });

    await expect(service.archive("org-1", "user-1", "warehouse-1")).resolves.toMatchObject({ status: WarehouseStatus.ARCHIVED });
    await expect(service.reactivate("org-1", "user-1", "warehouse-1")).resolves.toMatchObject({ status: WarehouseStatus.ACTIVE });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ARCHIVE", entityType: "Warehouse" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REACTIVATE", entityType: "Warehouse" }));
  });

  it("keeps tenant isolation on detail lookup", async () => {
    const { service, prisma } = makeService();
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(service.get("org-2", "warehouse-1")).rejects.toThrow("Warehouse not found.");
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({ where: { id: "warehouse-1", organizationId: "org-2" } });
  });
});
