import { ConfigService } from "@nestjs/config";
import { LoginRateLimitKeyType } from "@prisma/client";
import { SecurityMaintenanceService } from "./security-maintenance.service";

type StoredAuthSession = {
  id: string;
  userId: string;
  jtiHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoredLoginRateLimit = {
  id: string;
  keyType: LoginRateLimitKeyType;
  keyHash: string;
  attempts: number;
  windowStartedAt: Date;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type DateFilter = {
  lt?: Date;
  lte?: Date;
};

function config(values: Record<string, string | undefined> = {}) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function authSession(overrides: Partial<StoredAuthSession>): StoredAuthSession {
  return {
    id: overrides.id ?? "session",
    userId: "user-1",
    jtiHash: `hash-${overrides.id ?? "session"}`,
    expiresAt: new Date("2026-07-05T12:00:00.000Z"),
    revokedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function loginRateLimit(overrides: Partial<StoredLoginRateLimit>): StoredLoginRateLimit {
  return {
    id: overrides.id ?? "rate",
    keyType: LoginRateLimitKeyType.EMAIL,
    keyHash: `hash-${overrides.id ?? "rate"}`,
    attempts: 1,
    windowStartedAt: new Date("2026-06-01T00:00:00.000Z"),
    lockedUntil: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makePrisma(authSessions: StoredAuthSession[] = [], loginRateLimits: StoredLoginRateLimit[] = []) {
  const authSessionTable = {
    count: jest.fn(({ where }: { where: Record<string, unknown> }) => Promise.resolve(authSessions.filter((row) => matchesWhere(row, where)).length)),
    findMany: jest.fn(({ where, take }: { where: Record<string, unknown>; take?: number }) =>
      Promise.resolve(authSessions.filter((row) => matchesWhere(row, where)).slice(0, take).map(({ id }) => ({ id }))),
    ),
    deleteMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) => {
      const ids = new Set(where.id.in);
      let deleted = 0;
      for (let index = authSessions.length - 1; index >= 0; index -= 1) {
        if (ids.has(authSessions[index]!.id)) {
          authSessions.splice(index, 1);
          deleted += 1;
        }
      }
      return Promise.resolve({ count: deleted });
    }),
  };

  const loginRateLimitTable = {
    count: jest.fn(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(loginRateLimits.filter((row) => matchesWhere(row, where)).length),
    ),
    findMany: jest.fn(({ where, take }: { where: Record<string, unknown>; take?: number }) =>
      Promise.resolve(loginRateLimits.filter((row) => matchesWhere(row, where)).slice(0, take).map(({ id }) => ({ id }))),
    ),
    deleteMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) => {
      const ids = new Set(where.id.in);
      let deleted = 0;
      for (let index = loginRateLimits.length - 1; index >= 0; index -= 1) {
        if (ids.has(loginRateLimits[index]!.id)) {
          loginRateLimits.splice(index, 1);
          deleted += 1;
        }
      }
      return Promise.resolve({ count: deleted });
    }),
  };

  return {
    prisma: {
      authSession: authSessionTable,
      loginRateLimit: loginRateLimitTable,
    },
    authSessions,
    loginRateLimits,
  };
}

function matchesWhere(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  const orConditions = where.OR as Record<string, unknown>[] | undefined;
  if (orConditions && !orConditions.some((condition) => matchesWhere(row, condition))) {
    return false;
  }

  const andConditions = where.AND as Record<string, unknown>[] | undefined;
  if (andConditions && !andConditions.every((condition) => matchesWhere(row, condition))) {
    return false;
  }

  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR" || key === "AND") {
      return true;
    }
    if (key === "id" && isIdInCondition(condition)) {
      return condition.in.includes(row.id as string);
    }
    if (condition === null) {
      return row[key] === null;
    }
    if (condition instanceof Date) {
      return row[key] instanceof Date && row[key].getTime() === condition.getTime();
    }
    if (isDateFilter(condition)) {
      return matchesDateFilter(row[key] as Date | null, condition);
    }
    return row[key] === condition;
  });
}

function isIdInCondition(value: unknown): value is { in: string[] } {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { in?: unknown }).in));
}

function isDateFilter(value: unknown): value is DateFilter {
  return Boolean(value && typeof value === "object" && ("lt" in value || "lte" in value));
}

function matchesDateFilter(value: Date | null, filter: DateFilter): boolean {
  if (!value) {
    return false;
  }
  if (filter.lt && value.getTime() >= filter.lt.getTime()) {
    return false;
  }
  if (filter.lte && value.getTime() > filter.lte.getTime()) {
    return false;
  }
  return true;
}

describe("SecurityMaintenanceService", () => {
  const now = new Date("2026-07-04T12:00:00.000Z");

  it("dry-runs AuthSession cleanup without deleting eligible expired or revoked rows", async () => {
    const { prisma, authSessions } = makePrisma([
      authSession({ id: "active", expiresAt: new Date("2026-07-05T12:00:00.000Z") }),
      authSession({ id: "expired-old", expiresAt: new Date("2026-05-01T00:00:00.000Z") }),
      authSession({ id: "revoked-old", revokedAt: new Date("2026-05-01T00:00:00.000Z") }),
    ]);
    const service = new SecurityMaintenanceService(prisma as never, config());

    const result = await service.cleanupSecurityRecords({ mode: "dry-run", now, batchSize: 1 });

    expect(result.authSessions).toMatchObject({
      expiredEligible: 1,
      revokedEligible: 1,
      totalEligible: 2,
      deleted: 0,
    });
    expect(authSessions.map((row) => row.id).sort()).toEqual(["active", "expired-old", "revoked-old"]);
    expect(prisma.authSession.deleteMany).not.toHaveBeenCalled();
  });

  it("executes AuthSession cleanup only for stale expired or revoked rows", async () => {
    const { prisma, authSessions } = makePrisma([
      authSession({ id: "active", expiresAt: new Date("2026-07-05T12:00:00.000Z") }),
      authSession({ id: "expired-old", expiresAt: new Date("2026-05-01T00:00:00.000Z") }),
      authSession({ id: "expired-recent", expiresAt: new Date("2026-06-20T00:00:00.000Z") }),
      authSession({ id: "revoked-old", revokedAt: new Date("2026-05-01T00:00:00.000Z") }),
      authSession({ id: "revoked-recent", revokedAt: new Date("2026-06-20T00:00:00.000Z") }),
    ]);
    const service = new SecurityMaintenanceService(prisma as never, config());

    const result = await service.cleanupSecurityRecords({ mode: "execute", now, batchSize: 1 });

    expect(result.authSessions).toMatchObject({
      expiredEligible: 1,
      revokedEligible: 1,
      totalEligible: 2,
      deleted: 2,
    });
    expect(authSessions.map((row) => row.id).sort()).toEqual(["active", "expired-recent", "revoked-recent"]);
  });

  it("dry-runs LoginRateLimit cleanup without deleting stale unlocked rows", async () => {
    const { prisma, loginRateLimits } = makePrisma([], [
      loginRateLimit({ id: "old-unlocked", windowStartedAt: new Date("2026-06-01T00:00:00.000Z"), updatedAt: new Date("2026-06-01T00:00:00.000Z") }),
    ]);
    const service = new SecurityMaintenanceService(prisma as never, config());

    const result = await service.cleanupSecurityRecords({ mode: "dry-run", now });

    expect(result.loginRateLimits).toMatchObject({
      eligible: 1,
      deleted: 0,
    });
    expect(loginRateLimits.map((row) => row.id)).toEqual(["old-unlocked"]);
    expect(prisma.loginRateLimit.deleteMany).not.toHaveBeenCalled();
  });

  it("executes LoginRateLimit cleanup while preserving locked, active-window, and recent rows", async () => {
    const { loginRateLimits } = makePrisma([], [
      loginRateLimit({
        id: "locked-future",
        lockedUntil: new Date("2026-07-04T12:30:00.000Z"),
        windowStartedAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
      loginRateLimit({
        id: "inside-window",
        windowStartedAt: new Date("2026-07-04T11:50:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
      loginRateLimit({
        id: "recent-updated",
        windowStartedAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-04T11:00:00.000Z"),
      }),
      loginRateLimit({
        id: "old-unlocked",
        lockedUntil: null,
        windowStartedAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ]);
    const service = new SecurityMaintenanceService(makePrisma([], loginRateLimits).prisma as never, config());

    const result = await service.cleanupSecurityRecords({ mode: "execute", now, batchSize: 1 });

    expect(result.loginRateLimits).toMatchObject({
      eligible: 1,
      deleted: 1,
    });
    expect(loginRateLimits.map((row) => row.id).sort()).toEqual(["inside-window", "locked-future", "recent-updated"]);
  });

  it("uses conservative cleanup defaults", async () => {
    const { prisma } = makePrisma();
    const service = new SecurityMaintenanceService(prisma as never, config());

    const result = await service.cleanupSecurityRecords({ now });

    expect(result).toMatchObject({
      mode: "dry-run",
      dryRun: true,
      batchSize: 500,
      authSessions: {
        expiredRetentionDays: 30,
        revokedRetentionDays: 30,
      },
      loginRateLimits: {
        retentionDays: 7,
        activeWindowSeconds: 900,
      },
    });
  });
});
