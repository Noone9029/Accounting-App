import { ConfigService } from "@nestjs/config";
import { LoginRateLimitKeyType } from "@prisma/client";
import { getLoginClientIp, LoginThrottleService } from "./login-throttle.service";

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
  const records: StoredLoginRateLimit[] = [];
  const table = {
    findMany: jest.fn(({ where }: { where: { OR?: Array<{ keyType: LoginRateLimitKeyType; keyHash: string }> } }) => {
      const keys = where.OR ?? [];
      return Promise.resolve(records.filter((record) => keys.some((key) => key.keyType === record.keyType && key.keyHash === record.keyHash)));
    }),
    upsert: jest.fn(
      ({
        where,
        create,
        update,
      }: {
        where: { keyType_keyHash: { keyType: LoginRateLimitKeyType; keyHash: string } };
        create: Omit<StoredLoginRateLimit, "id" | "createdAt" | "updatedAt">;
        update: Pick<StoredLoginRateLimit, "attempts" | "windowStartedAt" | "lockedUntil">;
      }) => {
        const existing = records.find(
          (record) => record.keyType === where.keyType_keyHash.keyType && record.keyHash === where.keyType_keyHash.keyHash,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return Promise.resolve(existing);
        }

        const created: StoredLoginRateLimit = {
          id: `rate-${records.length + 1}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        records.push(created);
        return Promise.resolve(created);
      },
    ),
    deleteMany: jest.fn(({ where }: { where: { OR?: Array<{ keyType: LoginRateLimitKeyType; keyHash: string }> } }) => {
      const keys = where.OR ?? [];
      let deleted = 0;
      for (let index = records.length - 1; index >= 0; index -= 1) {
        const record = records[index];
        if (record && keys.some((key) => key.keyType === record.keyType && key.keyHash === record.keyHash)) {
          records.splice(index, 1);
          deleted += 1;
        }
      }
      return Promise.resolve({ count: deleted });
    }),
  };

  return {
    records,
    prisma: {
      $transaction: jest.fn((callback: (tx: { loginRateLimit: typeof table }) => unknown) => callback({ loginRateLimit: table })),
      loginRateLimit: table,
    },
  };
}

describe("LoginThrottleService", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-04T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("records failed attempts using hashed normalized email/IP keys without storing raw identifiers", async () => {
    const { prisma, records } = makePrisma();
    const service = new LoginThrottleService(prisma as never, config());

    await expect(service.recordFailedLogin({ email: " User@Example.COM ", ipAddress: " 203.0.113.10 " })).resolves.toBeUndefined();

    expect(records).toHaveLength(3);
    expect(records.map((record) => record.keyType).sort()).toEqual([
      LoginRateLimitKeyType.EMAIL,
      LoginRateLimitKeyType.EMAIL_IP,
      LoginRateLimitKeyType.IP,
    ]);
    expect(JSON.stringify(records)).not.toContain("User@Example.COM");
    expect(JSON.stringify(records)).not.toContain("user@example.com");
    expect(JSON.stringify(records)).not.toContain("203.0.113.10");
  });

  it("throttles repeated failures for the same email and IP combination", async () => {
    const { prisma } = makePrisma();
    const service = new LoginThrottleService(
      prisma as never,
      config({
        LOGIN_THROTTLE_MAX_BY_IP: "100",
        LOGIN_THROTTLE_MAX_BY_EMAIL: "100",
        LOGIN_THROTTLE_MAX_BY_EMAIL_IP: "2",
        LOGIN_THROTTLE_LOCKOUT_SECONDS: "600",
      }),
    );
    const input = { email: "user@example.com", ipAddress: "203.0.113.10" };

    await service.recordFailedLogin(input);
    await expect(service.assertLoginAllowed(input)).resolves.toEqual({ allowed: true });

    await service.recordFailedLogin(input);

    await expect(service.assertLoginAllowed(input)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 600,
      reason: "rate_limited",
    });
  });

  it("throttles repeated failures for the same email across IP addresses", async () => {
    const { prisma } = makePrisma();
    const service = new LoginThrottleService(
      prisma as never,
      config({
        LOGIN_THROTTLE_MAX_BY_IP: "100",
        LOGIN_THROTTLE_MAX_BY_EMAIL: "2",
        LOGIN_THROTTLE_MAX_BY_EMAIL_IP: "100",
      }),
    );

    await service.recordFailedLogin({ email: "user@example.com", ipAddress: "203.0.113.10" });
    await service.recordFailedLogin({ email: "user@example.com", ipAddress: "203.0.113.11" });

    await expect(service.assertLoginAllowed({ email: "USER@example.com", ipAddress: "203.0.113.12" })).resolves.toMatchObject({
      allowed: false,
      reason: "rate_limited",
    });
  });

  it("throttles repeated failures from the same IP across email addresses", async () => {
    const { prisma } = makePrisma();
    const service = new LoginThrottleService(
      prisma as never,
      config({
        LOGIN_THROTTLE_MAX_BY_IP: "2",
        LOGIN_THROTTLE_MAX_BY_EMAIL: "100",
        LOGIN_THROTTLE_MAX_BY_EMAIL_IP: "100",
      }),
    );

    await service.recordFailedLogin({ email: "one@example.com", ipAddress: "203.0.113.10" });
    await service.recordFailedLogin({ email: "two@example.com", ipAddress: "203.0.113.10" });

    await expect(service.assertLoginAllowed({ email: "three@example.com", ipAddress: "203.0.113.10" })).resolves.toMatchObject({
      allowed: false,
      reason: "rate_limited",
    });
  });

  it("successful login resets email and email+IP throttle state but keeps the broader IP signal", async () => {
    const { prisma, records } = makePrisma();
    const service = new LoginThrottleService(prisma as never, config());
    const input = { email: "user@example.com", ipAddress: "203.0.113.10" };

    await service.recordFailedLogin(input);
    await service.resetSuccessfulLogin(input);

    expect(records.map((record) => record.keyType)).toEqual([LoginRateLimitKeyType.IP]);
  });
});

describe("getLoginClientIp", () => {
  it("uses the direct request IP unless proxy headers are explicitly trusted", () => {
    const request = {
      headers: {
        "x-forwarded-for": "198.51.100.20, 198.51.100.21",
        "x-real-ip": "198.51.100.22",
        "cf-connecting-ip": "198.51.100.23",
      },
      ip: "::ffff:203.0.113.10",
      socket: { remoteAddress: "203.0.113.11" },
    };

    expect(getLoginClientIp(request as never, false)).toBe("203.0.113.10");
    expect(getLoginClientIp(request as never, true)).toBe("198.51.100.23");
  });
});
