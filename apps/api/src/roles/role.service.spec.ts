import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "@ledgerbyte/shared";
import { RoleService } from "./role.service";

describe("RoleService", () => {
  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      role: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      organizationMember: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      ...overrides,
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new RoleService(prisma as never, auditLogService as never), prisma, auditLogService };
  }

  const role = {
    id: "role-1",
    organizationId: "org-1",
    name: "Custom",
    permissions: [PERMISSIONS.reports.view],
    isSystem: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    _count: { members: 0 },
  };

  it("rejects unknown permissions on create", async () => {
    const { service } = makeService();

    await expect(service.create("org-1", "user-1", { name: "Bad", permissions: ["reports.view", "bad.permission"] })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("accepts granular accounting action permissions on custom roles", async () => {
    const granularPermissions = [
      PERMISSIONS.customerPayments.applyUnapplied,
      PERMISSIONS.customerPayments.reverseUnappliedAllocation,
      PERMISSIONS.customerPayments.receiptPdfGenerate,
      PERMISSIONS.currencies.manage,
      PERMISSIONS.fxRates.manage,
      PERMISSIONS.fxRevaluation.run,
      PERMISSIONS.zatca.submit,
      PERMISSIONS.zatca.signingDryRun,
      PERMISSIONS.reports.view,
      PERMISSIONS.reports.export,
    ];
    const { service, prisma } = makeService();
    prisma.role.create.mockResolvedValue({ ...role, name: "Accounting operator", permissions: granularPermissions });

    const created = await service.create("org-1", "user-1", { name: "Accounting operator", permissions: granularPermissions });

    expect(created.permissions).toEqual(granularPermissions);
    expect(prisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ permissions: granularPermissions }),
      }),
    );
  });

  it("keeps default roles explicit for payments, FX, reports, and compliance actions", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.Accountant).toEqual(
      expect.arrayContaining([
        PERMISSIONS.customerPayments.applyUnapplied,
        PERMISSIONS.customerPayments.reverseUnappliedAllocation,
        PERMISSIONS.customerPayments.void,
        PERMISSIONS.customerPayments.receiptPdfGenerate,
        PERMISSIONS.currencies.read,
        PERMISSIONS.currencies.manage,
        PERMISSIONS.fxRates.read,
        PERMISSIONS.fxRates.manage,
        PERMISSIONS.fxRevaluation.read,
        PERMISSIONS.fxRevaluation.run,
        PERMISSIONS.fxRevaluation.reverse,
        PERMISSIONS.reports.view,
        PERMISSIONS.reports.export,
        PERMISSIONS.zatca.generateXml,
        PERMISSIONS.zatca.runChecks,
        PERMISSIONS.accountingClose.read,
        PERMISSIONS.accountingClose.manage,
        PERMISSIONS.accountingClose.prepare,
        PERMISSIONS.accountingClose.review,
        PERMISSIONS.accountingClose.close,
      ]),
    );
    expect(DEFAULT_ROLE_PERMISSIONS.Sales).toEqual(
      expect.arrayContaining([
        PERMISSIONS.customerPayments.applyUnapplied,
        PERMISSIONS.customerPayments.receiptPdfGenerate,
        PERMISSIONS.currencies.read,
        PERMISSIONS.fxRates.read,
      ]),
    );
    expect(DEFAULT_ROLE_PERMISSIONS.Purchases).toEqual(
      expect.arrayContaining([PERMISSIONS.currencies.read, PERMISSIONS.fxRates.read]),
    );
    expect(DEFAULT_ROLE_PERMISSIONS.Sales).not.toContain(PERMISSIONS.customerPayments.reverseUnappliedAllocation);
    expect(DEFAULT_ROLE_PERMISSIONS.Sales).not.toContain(PERMISSIONS.customerPayments.void);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).toEqual(
      expect.arrayContaining([
        PERMISSIONS.reports.view,
        PERMISSIONS.currencies.read,
        PERMISSIONS.fxRates.read,
        PERMISSIONS.fxRevaluation.read,
      ]),
    );
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.reports.export);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.customerPayments.receiptPdfGenerate);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.zatca.submit);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.currencies.manage);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.fxRates.manage);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.fxRevaluation.run);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.fxRevaluation.reverse);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.accountingClose.manage);
  });

  it("rejects unknown permissions on update", async () => {
    const { service, prisma } = makeService();
    prisma.role.findFirst.mockResolvedValue(role);

    await expect(service.update("org-1", "user-1", "role-1", { permissions: ["unknown.permission"] })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects deleting an assigned role", async () => {
    const { service, prisma } = makeService();
    prisma.role.findFirst.mockResolvedValue(role);
    prisma.organizationMember.count.mockResolvedValue(1);

    await expect(service.remove("org-1", "user-1", "role-1")).rejects.toThrow(ConflictException);
  });

  it("rejects editing system roles", async () => {
    const { service, prisma } = makeService();
    prisma.role.findFirst.mockResolvedValue({ ...role, isSystem: true });

    await expect(service.update("org-1", "user-1", "role-1", { name: "Edited" })).rejects.toThrow(ForbiddenException);
  });

  it("rejects removing admin.fullAccess from the last active full-access role", async () => {
    const { service, prisma } = makeService();
    prisma.role.findFirst.mockResolvedValue({ ...role, permissions: [PERMISSIONS.admin.fullAccess] });
    prisma.organizationMember.findMany.mockResolvedValue([{ role: { permissions: [PERMISSIONS.users.manage] } }]);

    await expect(service.update("org-1", "user-1", "role-1", { permissions: [PERMISSIONS.users.manage] })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("keeps role reads tenant-scoped", async () => {
    const { service, prisma } = makeService();
    prisma.role.findFirst.mockResolvedValue(role);

    await service.get("org-1", "role-1");

    expect(prisma.role.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "role-1", organizationId: "org-1" } }));
  });
});
