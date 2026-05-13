import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { MembershipStatus } from "@prisma/client";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { OrganizationMemberService } from "./organization-member.service";

describe("OrganizationMemberService", () => {
  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      organizationMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      ...overrides,
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new OrganizationMemberService(prisma as never, auditLogService as never), prisma, auditLogService };
  }

  const member = {
    id: "member-1",
    organizationId: "org-1",
    userId: "user-1",
    roleId: "role-1",
    status: MembershipStatus.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    user: { id: "user-1", email: "owner@example.com", name: "Owner", createdAt: new Date("2026-01-01T00:00:00.000Z") },
    role: { id: "role-1", name: "Owner", permissions: [PERMISSIONS.admin.fullAccess], isSystem: true },
  };

  it("rejects suspending the last active full-access member", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findFirst.mockResolvedValue(member);
    prisma.organizationMember.findMany.mockResolvedValue([]);

    await expect(service.updateStatus("org-1", "user-1", "member-1", { status: MembershipStatus.SUSPENDED })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("rejects demoting the last full-access member", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findFirst.mockResolvedValue(member);
    prisma.role.findFirst.mockResolvedValue({ id: "role-2", permissions: [PERMISSIONS.reports.view] });
    prisma.organizationMember.findMany.mockResolvedValue([]);

    await expect(service.updateRole("org-1", "user-1", "member-1", { roleId: "role-2" })).rejects.toThrow(ForbiddenException);
  });

  it("rejects invite placeholders for unknown users", async () => {
    const { service, prisma } = makeService();
    prisma.role.findFirst.mockResolvedValue({ id: "role-2", permissions: [PERMISSIONS.reports.view] });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.invite("org-1", "user-1", { email: "missing@example.com", roleId: "role-2" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("creates an invited membership for existing users", async () => {
    const { service, prisma } = makeService();
    const invited = { ...member, id: "member-2", userId: "user-2", status: MembershipStatus.INVITED };
    prisma.role.findFirst.mockResolvedValue({ id: "role-2", permissions: [PERMISSIONS.reports.view] });
    prisma.user.findUnique.mockResolvedValue({ id: "user-2", email: "viewer@example.com", name: "Viewer" });
    prisma.organizationMember.create.mockResolvedValue(invited);

    await expect(service.invite("org-1", "user-1", { email: "viewer@example.com", roleId: "role-2" })).resolves.toEqual(
      expect.objectContaining({ member: invited }),
    );
  });

  it("keeps member reads tenant-scoped", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findFirst.mockResolvedValue(member);

    await service.get("org-1", "member-1");

    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "member-1", organizationId: "org-1" } }),
    );
  });
});
