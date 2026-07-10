import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DimensionStatus } from "@prisma/client";
import { ProjectService } from "./project.service";

describe("ProjectService", () => {
  const project = {
    id: "project-1",
    organizationId: "org-1",
    code: "ERP",
    name: "ERP rollout",
    description: "Implementation project",
    status: DimensionStatus.ACTIVE,
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    updatedAt: new Date("2026-07-10T00:00:00.000Z"),
  };

  function makeService() {
    const prisma = {
      project: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const audit = { log: jest.fn() };
    return { service: new ProjectService(prisma as never, audit as never), prisma, audit };
  }

  it("lists tenant records by code with an optional status filter", async () => {
    const { service, prisma } = makeService();
    prisma.project.findMany.mockResolvedValue([]);

    await service.list("org-1");
    await service.list("org-1", DimensionStatus.ARCHIVED);

    expect(prisma.project.findMany).toHaveBeenNthCalledWith(1, {
      where: { organizationId: "org-1" },
      orderBy: { code: "asc" },
    });
    expect(prisma.project.findMany).toHaveBeenNthCalledWith(2, {
      where: { organizationId: "org-1", status: DimensionStatus.ARCHIVED },
      orderBy: { code: "asc" },
    });
  });

  it("creates normalized tenant data and writes an audit log", async () => {
    const { service, prisma, audit } = makeService();
    prisma.project.findFirst.mockResolvedValue(null);
    prisma.project.create.mockResolvedValue(project);

    await expect(
      service.create("org-1", "user-1", {
        code: " erp ",
        name: " ERP rollout ",
        description: " Implementation project ",
      }),
    ).resolves.toEqual(project);

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", code: "ERP" },
      select: { id: true },
    });
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        code: "ERP",
        name: "ERP rollout",
        description: "Implementation project",
      },
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "CREATE",
      entityType: "Project",
      entityId: "project-1",
      after: project,
    });
  });

  it("rejects blank normalized codes and names", async () => {
    const { service, prisma } = makeService();

    await expect(service.create("org-1", "user-1", { code: "   ", name: "ERP rollout" })).rejects.toThrow(
      "Project code is required.",
    );
    await expect(service.create("org-1", "user-1", { code: "ERP", name: "   " })).rejects.toThrow(
      "Project name is required.",
    );
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it("rejects a same-tenant duplicate code with the stable message", async () => {
    const { service, prisma } = makeService();
    prisma.project.findFirst.mockResolvedValue({ id: "existing" });

    await expect(service.create("org-1", "user-1", { code: " erp ", name: "Duplicate" })).rejects.toEqual(
      new BadRequestException("Project code already exists."),
    );
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  it("allows another tenant to reuse the same normalized code", async () => {
    const { service, prisma } = makeService();
    prisma.project.findFirst.mockImplementation(({ where }: { where: { organizationId: string } }) =>
      Promise.resolve(where.organizationId === "org-1" ? { id: "project-1" } : null),
    );
    prisma.project.create.mockResolvedValue({ ...project, id: "project-2", organizationId: "org-2" });

    await expect(service.create("org-2", "user-2", { code: "erp", name: "ERP rollout" })).resolves.toMatchObject({
      id: "project-2",
      organizationId: "org-2",
      code: "ERP",
    });
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-2", code: "ERP" },
      select: { id: true },
    });
  });

  it("returns the same not-found result for missing and cross-tenant detail IDs", async () => {
    const { service, prisma } = makeService();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(service.get("org-2", "project-1")).rejects.toEqual(new NotFoundException("Project not found."));
    await expect(service.get("org-2", "missing")).rejects.toEqual(new NotFoundException("Project not found."));
    expect(prisma.project.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "project-1", organizationId: "org-2" },
    });
    expect(prisma.project.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: "missing", organizationId: "org-2" },
    });
  });

  it("does not update a record outside the tenant", async () => {
    const { service, prisma, audit } = makeService();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(service.update("org-2", "user-2", "project-1", { name: "Nope" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.project.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("rejects a duplicate code on a code-changing update", async () => {
    const { service, prisma } = makeService();
    prisma.project.findFirst.mockResolvedValueOnce(project).mockResolvedValueOnce({ id: "project-2" });

    await expect(service.update("org-1", "user-1", "project-1", { code: " crm " })).rejects.toThrow(
      "Project code already exists.",
    );
    expect(prisma.project.findFirst).toHaveBeenNthCalledWith(2, {
      where: { organizationId: "org-1", code: "CRM", id: { not: "project-1" } },
      select: { id: true },
    });
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("archives through update with tenant scope and before/after audit values", async () => {
    const { service, prisma, audit } = makeService();
    const archived = { ...project, status: DimensionStatus.ARCHIVED };
    prisma.project.findFirst.mockResolvedValue(project);
    prisma.project.update.mockResolvedValue(archived);

    await expect(service.update("org-1", "user-1", "project-1", { status: DimensionStatus.ARCHIVED })).resolves.toEqual(archived);
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: "project-1", organizationId: "org-1" },
      data: { code: undefined, name: undefined, description: undefined, status: DimensionStatus.ARCHIVED },
    });
    expect(audit.log).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "UPDATE",
      entityType: "Project",
      entityId: "project-1",
      before: project,
      after: archived,
    });
  });
});
