import { AuthTokenPurpose, MembershipStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";

describe("AuthService invite and password reset flows", () => {
  function makeService() {
    const prisma: {
      $transaction: jest.Mock;
      user: { findUnique: jest.Mock; update: jest.Mock };
      organizationMember: { findFirst: jest.Mock; update: jest.Mock };
    } = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue("jwt-token") };
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
    return {
      service: new AuthService(prisma as never, jwt as never, config as never, authTokenService as never, rateLimitService as never, emailService as never),
      prisma,
      jwt,
      authTokenService,
      rateLimitService,
      emailService,
    };
  }

  it("accepts a valid invitation, activates membership, consumes token, and signs in", async () => {
    const { service, prisma, authTokenService } = makeService();
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
      accessToken: "jwt-token",
      organization: { id: "org-1" },
    });
    expect(prisma.organizationMember.update).toHaveBeenCalledWith({ where: { id: "member-1" }, data: { status: MembershipStatus.ACTIVE } });
    expect(authTokenService.consume).toHaveBeenCalledWith("token-1", prisma);
  });

  it("returns generic password reset response for missing users", async () => {
    const { service, prisma, authTokenService, emailService } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.requestPasswordReset({ email: "missing@example.com" })).resolves.toEqual({
      message: "If an account exists, password reset instructions have been sent.",
    });
    expect(authTokenService.create).not.toHaveBeenCalled();
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("creates a reset token and mock email for existing users", async () => {
    const { service, prisma, authTokenService, emailService } = makeService();
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
    const { service, prisma, authTokenService } = makeService();
    authTokenService.getTokenForUse.mockResolvedValue({ id: "token-1", userId: "user-1" });

    await expect(service.confirmPasswordReset({ token: "raw-token", password: "NewPassword123!" })).resolves.toEqual({ message: "Password has been reset." });
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" } }));
    const passwordHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    await expect(bcrypt.compare("NewPassword123!", passwordHash)).resolves.toBe(true);
    expect(authTokenService.consume).toHaveBeenCalledWith("token-1", prisma);
  });

  it("cleans up expired organization tokens", async () => {
    const { service, authTokenService } = makeService();

    await expect(service.cleanupExpiredTokens("org-1")).resolves.toMatchObject({ deletedCount: 1 });
    expect(authTokenService.cleanupExpiredUnconsumed).toHaveBeenCalledWith("org-1", 30);
  });
});
