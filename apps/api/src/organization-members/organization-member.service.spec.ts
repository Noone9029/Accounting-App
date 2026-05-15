import { ConflictException, ForbiddenException } from "@nestjs/common";
import { MembershipStatus } from "@prisma/client";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { OrganizationMemberService } from "./organization-member.service";

describe("OrganizationMemberService", () => {
  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma: {
      $transaction: jest.Mock;
      organizationMember: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      role: { findFirst: jest.Mock };
      user: { findUnique: jest.Mock; create: jest.Mock };
      organization: { findUnique: jest.Mock };
    } & Record<string, unknown> = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
      organizationMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: "org-1", name: "Demo Org" }),
      },
      ...overrides,
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const authTokenService = { create: jest.fn().mockResolvedValue({ rawToken: "invite-token", authToken: { id: "token-1" } }) };
    const authTokenRateLimitService = { assertInviteAllowed: jest.fn().mockResolvedValue(undefined) };
    const emailService = {
      isMockProvider: true,
      sendOrganizationInvite: jest.fn().mockResolvedValue({ id: "email-1" }),
    };
    const config = { get: jest.fn((key: string) => (key === "APP_WEB_URL" ? "http://web.test" : undefined)) };
    return {
      service: new OrganizationMemberService(
        prisma as never,
        auditLogService as never,
        authTokenService as never,
        authTokenRateLimitService as never,
        emailService as never,
        config as never,
      ),
      prisma,
      auditLogService,
      authTokenService,
      authTokenRateLimitService,
      emailService,
      config,
    };
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

  it("creates an invited user, token, and mock email for new users", async () => {
    const { service, prisma, authTokenService, authTokenRateLimitService, emailService } = makeService();
    const invited = { ...member, id: "member-2", userId: "user-2", status: MembershipStatus.INVITED };
    prisma.role.findFirst.mockResolvedValue({ id: "role-2", name: "Viewer", permissions: [PERMISSIONS.reports.view] });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "user-2", email: "new@example.com", name: "New" });
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    prisma.organizationMember.create.mockResolvedValue(invited);

    await expect(service.invite("org-1", "user-1", { email: "new@example.com", name: "New", roleId: "role-2" })).resolves.toEqual(
      expect.objectContaining({
        member: invited,
        emailOutboxId: "email-1",
        invitePreviewUrl: "http://web.test/invite/accept?token=invite-token",
      }),
    );
    expect(authTokenService.create).toHaveBeenCalledWith(expect.objectContaining({ purpose: "ORGANIZATION_INVITE" }), prisma);
    expect(authTokenRateLimitService.assertInviteAllowed).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", email: "new@example.com" }));
    expect(emailService.sendOrganizationInvite).toHaveBeenCalledWith(expect.objectContaining({ toEmail: "new@example.com" }));
  });

  it("creates an invited membership for existing users", async () => {
    const { service, prisma } = makeService();
    const invited = { ...member, id: "member-2", userId: "user-2", status: MembershipStatus.INVITED };
    prisma.role.findFirst.mockResolvedValue({ id: "role-2", name: "Viewer", permissions: [PERMISSIONS.reports.view] });
    prisma.user.findUnique.mockResolvedValue({ id: "user-2", email: "viewer@example.com", name: "Viewer" });
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    prisma.organizationMember.create.mockResolvedValue(invited);

    await expect(service.invite("org-1", "user-1", { email: "viewer@example.com", roleId: "role-2" })).resolves.toEqual(
      expect.objectContaining({ member: invited, emailOutboxId: "email-1" }),
    );
  });

  it("rejects inviting an already active organization member", async () => {
    const { service, prisma } = makeService();
    prisma.role.findFirst.mockResolvedValue({ id: "role-2", name: "Viewer", permissions: [PERMISSIONS.reports.view] });
    prisma.user.findUnique.mockResolvedValue({ id: "user-2", email: "viewer@example.com", name: "Viewer" });
    prisma.organizationMember.findUnique.mockResolvedValue({ id: "member-2", status: MembershipStatus.ACTIVE });

    await expect(service.invite("org-1", "user-1", { email: "viewer@example.com", roleId: "role-2" })).rejects.toThrow(
      ConflictException,
    );
  });

  it("blocks invite delivery when the rate limiter rejects the request", async () => {
    const { service, prisma, authTokenRateLimitService, authTokenService, emailService } = makeService();
    prisma.role.findFirst.mockResolvedValue({ id: "role-2", name: "Viewer", permissions: [PERMISSIONS.reports.view] });
    prisma.user.findUnique.mockResolvedValue(null);
    authTokenRateLimitService.assertInviteAllowed.mockRejectedValue(new Error("rate limited"));

    await expect(service.invite("org-1", "user-1", { email: "new@example.com", roleId: "role-2" })).rejects.toThrow("rate limited");
    expect(authTokenService.create).not.toHaveBeenCalled();
    expect(emailService.sendOrganizationInvite).not.toHaveBeenCalled();
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
