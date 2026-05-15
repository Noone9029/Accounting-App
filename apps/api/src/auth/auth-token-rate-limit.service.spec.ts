import { HttpException } from "@nestjs/common";
import { AuthTokenPurpose } from "@prisma/client";
import { AuthTokenRateLimitService } from "./auth-token-rate-limit.service";

describe("AuthTokenRateLimitService", () => {
  function makeService(counts: number[] = []) {
    const countMock = jest.fn(() => Promise.resolve(counts.shift() ?? 0));
    const prisma = {
      authTokenRateLimitEvent: {
        count: countMock,
        create: jest.fn().mockResolvedValue({ id: "event-1" }),
      },
    };

    return { service: new AuthTokenRateLimitService(prisma as never), prisma };
  }

  it("creates password reset rate-limit events when allowed", async () => {
    const { service, prisma } = makeService([0, 0]);

    await expect(
      service.registerPasswordResetAttempt({
        email: "User@Example.com",
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      }),
    ).resolves.toEqual({ allowed: true, blockingReasons: [] });

    expect(prisma.authTokenRateLimitEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "user@example.com",
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          ipAddress: "127.0.0.1",
        }),
      }),
    );
  });

  it("suppresses password reset delivery after email rate limit", async () => {
    const { service, prisma } = makeService([3, 0]);

    await expect(service.registerPasswordResetAttempt({ email: "user@example.com" })).resolves.toMatchObject({
      allowed: false,
      blockingReasons: ["Password reset rate limit reached for this email."],
    });
    expect(prisma.authTokenRateLimitEvent.create).not.toHaveBeenCalled();
  });

  it("blocks organization invites after repeated invites to the same email", async () => {
    const { service, prisma } = makeService([5, 0]);

    await expect(service.assertInviteAllowed({ organizationId: "org-1", email: "user@example.com" })).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(prisma.authTokenRateLimitEvent.create).not.toHaveBeenCalled();
  });

  it("blocks organization invites after daily organization limit", async () => {
    const { service, prisma } = makeService([0, 50]);

    await expect(service.assertInviteAllowed({ organizationId: "org-1", email: "user@example.com" })).rejects.toThrow(
      "Daily organization invite rate limit",
    );
    expect(prisma.authTokenRateLimitEvent.create).not.toHaveBeenCalled();
  });
});
