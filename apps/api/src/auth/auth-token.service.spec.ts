import { AuthTokenPurpose } from "@prisma/client";
import { AuthTokenService } from "./auth-token.service";

describe("AuthTokenService", () => {
  function makeService() {
    const prisma = {
      authToken: {
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ id: "token-1", ...args.data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: "token-1", consumedAt: new Date() }),
      },
    };
    return { service: new AuthTokenService(prisma as never), prisma };
  }

  it("stores only a hash for new tokens", async () => {
    const { service, prisma } = makeService();

    const result = await service.create({
      email: "User@Example.com",
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 1000),
    });

    expect(result.rawToken).toBeTruthy();
    expect(prisma.authToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "user@example.com",
          tokenHash: service.hashToken(result.rawToken),
        }),
      }),
    );
    const createCall = prisma.authToken.create.mock.calls[0]?.[0];
    expect(createCall).toBeDefined();
    expect(JSON.stringify(createCall?.data)).not.toContain(result.rawToken);
  });

  it("rejects consumed tokens", async () => {
    const { service, prisma } = makeService();
    prisma.authToken.findUnique.mockResolvedValue({
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
    });

    await expect(service.getTokenForUse("raw", AuthTokenPurpose.PASSWORD_RESET)).rejects.toThrow("already been used");
  });

  it("rejects expired tokens", async () => {
    const { service, prisma } = makeService();
    prisma.authToken.findUnique.mockResolvedValue({
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.getTokenForUse("raw", AuthTokenPurpose.PASSWORD_RESET)).rejects.toThrow("expired");
  });
});
