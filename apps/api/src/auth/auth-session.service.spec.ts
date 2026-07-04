import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthSessionService } from "./auth-session.service";

function config(values: Record<string, string | undefined> = {}) {
  return {
    get: jest.fn((key: string) => {
      if (key === "JWT_SECRET") {
        return "test-secret-with-enough-length";
      }
      if (key === "APP_ENV") {
        return "test";
      }
      return values[key];
    }),
  } as unknown as ConfigService;
}

function makePrisma() {
  const sessions: Array<{
    id: string;
    userId: string;
    jtiHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
    revokedReason: string | null;
    lastSeenAt: Date | null;
    userAgentHash: string | null;
    ipHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const authSession = {
    create: jest.fn(({ data }) => {
      const created = {
        id: `session-${sessions.length + 1}`,
        revokedAt: null,
        revokedReason: null,
        lastSeenAt: null,
        userAgentHash: null,
        ipHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      sessions.push(created);
      return Promise.resolve(created);
    }),
    findUnique: jest.fn(({ where }) => Promise.resolve(sessions.find((session) => session.jtiHash === where.jtiHash) ?? null)),
    update: jest.fn(({ where, data }) => {
      const session = sessions.find((item) => item.jtiHash === where.jtiHash);
      if (!session) {
        throw new Error("missing session");
      }
      Object.assign(session, data, { updatedAt: new Date() });
      return Promise.resolve(session);
    }),
  };

  return { prisma: { authSession }, sessions };
}

describe("AuthSessionService", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-04T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates a durable session using a hashed jti without storing raw identifiers", async () => {
    const { prisma, sessions } = makePrisma();
    const service = new AuthSessionService(prisma as never, config());
    const expiresAt = new Date("2026-07-05T12:00:00.000Z");

    const result = await service.createForJwt({ userId: "user-1", expiresAt });

    expect(result.jti).toEqual(expect.any(String));
    expect(result.expiresAt).toBe(expiresAt);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      userId: "user-1",
      expiresAt,
      revokedAt: null,
    });
    expect(JSON.stringify(sessions)).not.toContain(result.jti);
  });

  it("accepts active sessions for the matching user and jti", async () => {
    const { prisma } = makePrisma();
    const service = new AuthSessionService(prisma as never, config());
    const { jti } = await service.createForJwt({ userId: "user-1", expiresAt: new Date("2026-07-05T12:00:00.000Z") });

    await expect(service.assertActiveSession({ userId: "user-1", jti })).resolves.toMatchObject({
      id: "session-1",
      userId: "user-1",
    });
  });

  it("rejects revoked, missing, expired, or mismatched sessions", async () => {
    const { prisma, sessions } = makePrisma();
    const service = new AuthSessionService(prisma as never, config());
    const active = await service.createForJwt({ userId: "user-1", expiresAt: new Date("2026-07-05T12:00:00.000Z") });
    const revoked = await service.createForJwt({ userId: "user-1", expiresAt: new Date("2026-07-05T12:00:00.000Z") });
    const expired = await service.createForJwt({ userId: "user-1", expiresAt: new Date("2026-07-03T12:00:00.000Z") });
    sessions[1]!.revokedAt = new Date("2026-07-04T12:00:00.000Z");

    await expect(service.assertActiveSession({ userId: "user-1", jti: "missing-jti" })).rejects.toThrow(UnauthorizedException);
    await expect(service.assertActiveSession({ userId: "user-1", jti: revoked.jti })).rejects.toThrow(UnauthorizedException);
    await expect(service.assertActiveSession({ userId: "user-1", jti: expired.jti })).rejects.toThrow(UnauthorizedException);
    await expect(service.assertActiveSession({ userId: "other-user", jti: active.jti })).rejects.toThrow(UnauthorizedException);
  });

  it("revokes an active session by jti without exposing whether it existed", async () => {
    const { prisma, sessions } = makePrisma();
    const service = new AuthSessionService(prisma as never, config());
    const { jti } = await service.createForJwt({ userId: "user-1", expiresAt: new Date("2026-07-05T12:00:00.000Z") });

    await expect(service.revokeSession({ userId: "user-1", jti, reason: "logout" })).resolves.toEqual({ revoked: true });
    await expect(service.revokeSession({ userId: "user-1", jti: "missing-jti", reason: "logout" })).resolves.toEqual({ revoked: false });

    expect(sessions[0]).toMatchObject({
      revokedAt: new Date("2026-07-04T12:00:00.000Z"),
      revokedReason: "logout",
    });
  });
});
