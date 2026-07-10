import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DimensionStatus } from "@prisma/client";
import { CostCenterService } from "./cost-center.service";

describe("CostCenterService", () => {
  const costCenter = {
    id: "cost-center-1",
    organizationId: "org-1",
    code: "OPS",
    name: "Operations",
    description: "Operating costs",
    status: DimensionStatus.ACTIVE,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
  };

  function makeService() {
    const prisma = {
      costCenter: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const audit = { log: jest.fn() };
    return { service: new CostCenterService(prisma as never, audit as never), prisma, audit };
  }

  it("lists tenant records by code with an optional status filter", async () => {
    const { service, prisma } = makeService();
    prisma.costCenter.findMany.mockResolvedValue([]);

    await service.list("org-1");
    await service.list("org-1", DimensionStatus.ARCHIVED);

    expect(prisma.costCenter.findMany).toHaveBeenNthCalledWith(1, {
      where: { organizationId: "org-1" },
      orderBy: { code: "asc" },
    });
    expect(prisma.costCenter.findMany).toHaveBeenNthCalledWith(2, {
      where: { organizationId: "org-1", status: DimensionStatus.ARCHIVED },
      orderBy: { code: "asc" },
    });
  });

  it("creates normalized tenant data and writes an audit log", async () => {
    const { service, prisma, audit } = makeService();
    prisma.costCenter.findFirst.mockResolvedValue(null);
    prisma.costCenter.create.mockResolvedValue(costCenter);

    await expect(
      service.create("org-1", "user-1", {
        code: " ops ",
        name: " Operations ",
        description: " Operating costs ",
      }),
    ).resolves.toEqual(costCenter);

    expect(prisma.costCenter.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", code: "OPS" },
      select: { id: true },
    });
    expect(prisma.costCenter.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        code: "OPS",
        name: "Operations",
        description: "Operating costs",
      },
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "CREATE",
      entityType: "CostCenter",
      entityId: "cost-center-1",
      after: costCenter,
    });
  });

  it("rejects blank normalized codes and names", async () => {
    const { service, prisma } = makeService();

    await expect(service.create("org-1", "user-1", { code: "   ", name: "Operations" })).rejects.toThrow(
      "Cost center code is required.",
    );
    await expect(service.create("org-1", "user-1", { code: "OPS", name: "   " })).rejects.toThrow(
      "Cost center name is required.",
    );
    expect(prisma.costCenter.create).not.toHaveBeenCalled();
  });

  it("rejects a same-tenant duplicate code with the stable message", async () => {
    const { service, prisma } = makeService();
    prisma.costCenter.findFirst.mockResolvedValue({ id: "existing" });

    await expect(service.create("org-1", "user-1", { code: " ops ", name: "Duplicate" })).rejects.toEqual(
      new BadRequestException("Cost center code already exists."),
    );
    expect(prisma.costCenter.create).not.toHaveBeenCalled();
  });

  it("allows another tenant to reuse the same normalized code", async () => {
    const { service, prisma } = makeService();
    prisma.costCenter.findFirst.mockImplementation(({ where }: { where: { organizationId: string } }) =>
      Promise.resolve(where.organizationId === "org-1" ? { id: "cost-center-1" } : null),
    );
    prisma.costCenter.create.mockResolvedValue({ ...costCenter, id: "cost-center-2", organizationId: "org-2" });

    await expect(service.create("org-2", "user-2", { code: "ops", name: "Operations" })).resolves.toMatchObject({
      id: "cost-center-2",
      organizationId: "org-2",
      code: "OPS",
    });
    expect(prisma.costCenter.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-2", code: "OPS" },
      select: { id: true },
    });
  });

  it("returns the same not-found result for missing and cross-tenant detail IDs", async () => {
    const { service, prisma } = makeService();
    prisma.costCenter.findFirst.mockResolvedValue(null);

    await expect(service.get("org-2", "cost-center-1")).rejects.toEqual(new NotFoundException("Cost center not found."));
    await expect(service.get("org-2", "missing")).rejects.toEqual(new NotFoundException("Cost center not found."));
    expect(prisma.costCenter.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "cost-center-1", organizationId: "org-2" },
    });
    expect(prisma.costCenter.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: "missing", organizationId: "org-2" },
    });
  });

  it("does not update a record outside the tenant", async () => {
    const { service, prisma, audit } = makeService();
    prisma.costCenter.findFirst.mockResolvedValue(null);

    await expect(service.update("org-2", "user-2", "cost-center-1", { name: "Nope" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.costCenter.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("rejects a duplicate code on a code-changing update", async () => {
    const { service, prisma } = makeService();
    prisma.costCenter.findFirst.mockResolvedValueOnce(costCenter).mockResolvedValueOnce({ id: "cost-center-2" });

    await expect(service.update("org-1", "user-1", "cost-center-1", { code: " fin " })).rejects.toThrow(
      "Cost center code already exists.",
    );
    expect(prisma.costCenter.findFirst).toHaveBeenNthCalledWith(2, {
      where: { organizationId: "org-1", code: "FIN", id: { not: "cost-center-1" } },
      select: { id: true },
    });
    expect(prisma.costCenter.update).not.toHaveBeenCalled();
  });

  it("archives through update with tenant scope and before/after audit values", async () => {
    const { service, prisma, audit } = makeService();
    const archived = { ...costCenter, status: DimensionStatus.ARCHIVED };
    prisma.costCenter.findFirst.mockResolvedValue(costCenter);
    prisma.costCenter.update.mockResolvedValue(archived);

    await expect(
      service.update("org-1", "user-1", "cost-center-1", { status: DimensionStatus.ARCHIVED }),
    ).resolves.toEqual(archived);
    expect(prisma.costCenter.update).toHaveBeenCalledWith({
      where: { id: "cost-center-1", organizationId: "org-1" },
      data: { code: undefined, name: undefined, description: undefined, status: DimensionStatus.ARCHIVED },
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "UPDATE",
      entityType: "CostCenter",
      entityId: "cost-center-1",
      before: costCenter,
      after: archived,
    });
  });
});
