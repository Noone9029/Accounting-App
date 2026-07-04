import { AuthTokenPurpose, MembershipStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";

describe("AuthService invite and password reset flows", () => {
  function makeService() {
    const prisma: {
      $transaction: jest.Mock;
      user: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
      organizationMember: { findFirst: jest.Mock; update: jest.Mock };
    } = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const jwt = {
      signAsync: jest.fn((payload: { jti: string }) => Promise.resolve(`jwt-${payload.jti}`)),
      verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1", email: "user@example.com", jti: "jti-1" }),
    };
    const config = { get: jest.fn((key: string) => (key === "APP_WEB_URL" ? "http://web.test" : undefined)) };
    const authTokenService = {
      preview: jest.fn(),
      create: jest.fn().mockResolvedValue({ rawToken: "reset-token", authToken: { id: "token-1" } }),
      getTokenForUse: jest.fn(),
      consume: jest.fn().mockResolvedValue({ id: "token-1" }),
      cleanupExpiredUnconsumed: jest.fn().mockResolvedValue({ deletedCount: 1, olderThanDays: 30 }),
    };
    const rateLimitService = {
      registerPasswordResetAttempt: jest.fn().mockResolvedValue({ allowed: true, blockingReasons: [] }),
    };
    const emailService = { sendPasswordReset: jest.fn().mockResolvedValue({ id: "email-1" }) };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const authSessionService = {
      createForJwt: jest.fn().mockResolvedValue({ jti: "jti-1", expiresAt: new Date("2026-07-11T12:00:00.000Z") }),
      revokeSession: jest.fn().mockResolvedValue({ revoked: true }),
    };
    return {
      service: new AuthService(
        prisma as never,
        jwt as never,
        config as never,
        authTokenService as never,
        rateLimitService as never,
        emailService as never,
        auditLogService as never,
        authSessionService as never,
      ),
      prisma,
      jwt,
      authTokenService,
      rateLimitService,
      emailService,
      auditLogService,
      authSessionService,
    };
  }

  it("registers a user, creates a durable auth session, and signs a JWT with jti", async () => {
    const { service, prisma, jwt, authSessionService } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: "user-1", email: "new@example.com", name: "New User", createdAt: new Date() });

    await expect(service.register({ email: "NEW@example.com", name: " New User ", password: "Password123!" })).resolves.toMatchObject({
      user: { id: "user-1", email: "new@example.com", name: "New User" },
      accessToken: "jwt-jti-1",
    });

    expect(authSessionService.createForJwt).toHaveBeenCalledWith({ userId: "user-1", expiresAt: expect.any(Date) });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: "user-1", email: "new@example.com", jti: "jti-1" },
      expect.objectContaining({ expiresIn: "7d" }),
    );
  });

  it("logs in, creates a durable auth session, and signs a JWT with jti", async () => {
    const { service, prisma, jwt, authSessionService } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "User",
      passwordHash: await bcrypt.hash("Password123!", 12),
      memberships: [{ organizationId: "org-1" }],
    });

    await expect(service.login({ email: "USER@example.com", password: "Password123!" })).resolves.toMatchObject({
      user: { id: "user-1", email: "user@example.com", name: "User" },
      accessToken: "jwt-jti-1",
    });

    expect(authSessionService.createForJwt).toHaveBeenCalledWith({ userId: "user-1", expiresAt: expect.any(Date) });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: "user-1", email: "user@example.com", jti: "jti-1" },
      expect.objectContaining({ expiresIn: "7d" }),
    );
  });

  it("accepts a valid invitation, activates membership, consumes token, and signs in", async () => {
    const { service, prisma, authTokenService, auditLogService, authSessionService, jwt } = makeService();
    authTokenService.getTokenForUse.mockResolvedValue({
      id: "token-1",
      userId: "user-1",
      organizationId: "org-1",
    });
    prisma.organizationMember.findFirst.mockResolvedValue({
      id: "member-1",
      status: MembershipStatus.INVITED,
      organization: { id: "org-1", name: "Demo", legalName: null, taxNumber: null, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
      user: { id: "user-1", email: "invite@example.com", name: "Invited" },
    });
    prisma.user.update.mockResolvedValue({ id: "user-1", email: "invite@example.com", name: "Accepted" });

    await expect(service.acceptInvitation("raw-token", { name: "Accepted", password: "Password123!" })).resolves.toMatchObject({
      user: { id: "user-1", email: "invite@example.com", name: "Accepted" },
      accessToken: "jwt-jti-1",
      organization: { id: "org-1" },
    });
    expect(authSessionService.createForJwt).toHaveBeenCalledWith({ userId: "user-1", expiresAt: expect.any(Date) });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: "user-1", email: "invite@example.com", jti: "jti-1" },
      expect.objectContaining({ expiresIn: "7d" }),
    );
    expect(prisma.organizationMember.update).toHaveBeenCalledWith({ where: { id: "member-1" }, data: { status: MembershipStatus.ACTIVE } });
    expect(authTokenService.consume).toHaveBeenCalledWith("token-1", prisma);
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "AUTH_INVITE_ACCEPTED", entityType: "OrganizationMember" }));
  });

  it("returns generic password reset response for missing users", async () => {
    const { service, prisma, authTokenService, emailService, auditLogService } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.requestPasswordReset({ email: "missing@example.com" })).resolves.toEqual({
      message: "If an account exists, password reset instructions have been sent.",
    });
    expect(authTokenService.create).not.toHaveBeenCalled();
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
    expect(auditLogService.log).not.toHaveBeenCalled();
  });

  it("creates a reset token and mock email for existing users", async () => {
    const { service, prisma, authTokenService, emailService, auditLogService } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      memberships: [{ organizationId: "org-1" }],
    });

    await service.requestPasswordReset({ email: "USER@example.com" });

    expect(authTokenService.create).toHaveBeenCalledWith(expect.objectContaining({ purpose: AuthTokenPurpose.PASSWORD_RESET, consumeExistingForUser: true }));
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", toEmail: "user@example.com", resetUrl: "http://web.test/password-reset/confirm?token=reset-token" }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "AUTH_PASSWORD_RESET_REQUESTED", entityType: "User" }));
  });

  it("suppresses password reset email when the rate limit is reached but keeps the response generic", async () => {
    const { service, prisma, authTokenService, rateLimitService, emailService } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      memberships: [{ organizationId: "org-1" }],
    });
    rateLimitService.registerPasswordResetAttempt.mockResolvedValue({ allowed: false, blockingReasons: ["rate-limited"] });

    await expect(service.requestPasswordReset({ email: "user@example.com" })).resolves.toEqual({
      message: "If an account exists, password reset instructions have been sent.",
    });
    expect(authTokenService.create).not.toHaveBeenCalled();
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("confirms password reset and consumes token", async () => {
    const { service, prisma, authTokenService, auditLogService } = makeService();
    authTokenService.getTokenForUse.mockResolvedValue({ id: "token-1", userId: "user-1", organizationId: "org-1" });

    await expect(service.confirmPasswordReset({ token: "raw-token", password: "NewPassword123!" })).resolves.toEqual({ message: "Password has been reset." });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" } }));
    const passwordHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    await expect(bcrypt.compare("NewPassword123!", passwordHash)).resolves.toBe(true);
    expect(authTokenService.consume).toHaveBeenCalledWith("token-1", prisma);
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "AUTH_PASSWORD_RESET_COMPLETED", entityType: "User" }));
  });

  it("cleans up expired organization tokens", async () => {
    const { service, authTokenService } = makeService();

    await expect(service.cleanupExpiredTokens("org-1")).resolves.toMatchObject({ deletedCount: 1 });
    expect(authTokenService.cleanupExpiredUnconsumed).toHaveBeenCalledWith("org-1", 30);
  });

  it("revokes the current jti-bearing token on logout", async () => {
    const { service, jwt, authSessionService } = makeService();

    await expect(service.logout("jwt-token")).resolves.toEqual({ revoked: true });

    expect(jwt.verifyAsync).toHaveBeenCalledWith("jwt-token", expect.any(Object));
    expect(authSessionService.revokeSession).toHaveBeenCalledWith({
      userId: "user-1",
      jti: "jti-1",
      reason: "logout",
    });
  });

  it("keeps logout idempotent for invalid or legacy tokens", async () => {
    const { service, jwt, authSessionService } = makeService();
    jwt.verifyAsync.mockRejectedValueOnce(new Error("bad token"));

    await expect(service.logout("bad-token")).resolves.toEqual({ revoked: false });

    expect(authSessionService.revokeSession).not.toHaveBeenCalled();
  });
});
