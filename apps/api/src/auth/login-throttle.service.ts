import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoginRateLimitKeyType } from "@prisma/client";
import { createHash } from "crypto";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { readJwtSecret } from "./jwt-secret";

const DEFAULT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_LOCKOUT_SECONDS = 15 * 60;
const DEFAULT_MAX_BY_IP = 30;
const DEFAULT_MAX_BY_EMAIL = 10;
const DEFAULT_MAX_BY_EMAIL_IP = 5;

type LoginThrottleKey = {
  keyType: LoginRateLimitKeyType;
  keyHash: string;
  limit: number;
};

export type LoginThrottleInput = {
  email: string;
  ipAddress?: string | null;
};

export type LoginThrottleDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; reason: "rate_limited" };

@Injectable()
export class LoginThrottleService {
  private readonly logger = new Logger(LoginThrottleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async assertLoginAllowed(input: LoginThrottleInput): Promise<LoginThrottleDecision> {
    const keys = this.buildKeys(input);
    if (keys.length === 0) {
      return { allowed: true };
    }

    const now = new Date();
    const records = await this.prisma.loginRateLimit.findMany({
      where: { OR: keys.map(({ keyType, keyHash }) => ({ keyType, keyHash })) },
    });
    const lockedRecords = records.filter((record) => record.lockedUntil && record.lockedUntil.getTime() > now.getTime());

    if (lockedRecords.length === 0) {
      return { allowed: true };
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((Math.max(...lockedRecords.map((record) => record.lockedUntil?.getTime() ?? now.getTime())) - now.getTime()) / 1000),
    );
    this.logger.warn(
      `Login throttled for key types ${lockedRecords.map((record) => record.keyType).sort().join(",")} retryAfterSeconds=${retryAfterSeconds}`,
    );

    return { allowed: false, retryAfterSeconds, reason: "rate_limited" };
  }

  async recordFailedLogin(input: LoginThrottleInput): Promise<void> {
    const settings = readLoginThrottleSettings(this.config);
    const keys = this.buildKeys(input);
    if (keys.length === 0) {
      return;
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const existingRecords = await tx.loginRateLimit.findMany({
        where: { OR: keys.map(({ keyType, keyHash }) => ({ keyType, keyHash })) },
      });

      await Promise.all(
        keys.map((key) => {
          const existing = existingRecords.find((record) => record.keyType === key.keyType && record.keyHash === key.keyHash);
          const insideWindow = existing ? now.getTime() - existing.windowStartedAt.getTime() < settings.windowSeconds * 1000 : false;
          const attempts = insideWindow ? (existing?.attempts ?? 0) + 1 : 1;
          const windowStartedAt = insideWindow && existing ? existing.windowStartedAt : now;
          const lockedUntil = attempts >= key.limit ? new Date(now.getTime() + settings.lockoutSeconds * 1000) : null;

          return tx.loginRateLimit.upsert({
            where: { keyType_keyHash: { keyType: key.keyType, keyHash: key.keyHash } },
            create: {
              keyType: key.keyType,
              keyHash: key.keyHash,
              attempts,
              windowStartedAt,
              lockedUntil,
            },
            update: {
              attempts,
              windowStartedAt,
              lockedUntil,
            },
          });
        }),
      );
    });
  }

  async resetSuccessfulLogin(input: LoginThrottleInput): Promise<void> {
    const resetKeyTypes: LoginRateLimitKeyType[] = [LoginRateLimitKeyType.EMAIL, LoginRateLimitKeyType.EMAIL_IP];
    const keys = this.buildKeys(input).filter((key) => resetKeyTypes.includes(key.keyType));
    if (keys.length === 0) {
      return;
    }

    await this.prisma.loginRateLimit.deleteMany({
      where: { OR: keys.map(({ keyType, keyHash }) => ({ keyType, keyHash })) },
    });
  }

  private buildKeys(input: LoginThrottleInput): LoginThrottleKey[] {
    const settings = readLoginThrottleSettings(this.config);
    const email = normalizeEmail(input.email);
    const ipAddress = normalizeIp(input.ipAddress);
    const keys: LoginThrottleKey[] = [
      {
        keyType: LoginRateLimitKeyType.EMAIL,
        keyHash: this.hashKey(LoginRateLimitKeyType.EMAIL, email),
        limit: settings.maxByEmail,
      },
    ];

    if (ipAddress) {
      keys.push(
        {
          keyType: LoginRateLimitKeyType.IP,
          keyHash: this.hashKey(LoginRateLimitKeyType.IP, ipAddress),
          limit: settings.maxByIp,
        },
        {
          keyType: LoginRateLimitKeyType.EMAIL_IP,
          keyHash: this.hashKey(LoginRateLimitKeyType.EMAIL_IP, `${email}|${ipAddress}`),
          limit: settings.maxByEmailIp,
        },
      );
    }

    return keys;
  }

  private hashKey(keyType: LoginRateLimitKeyType, normalizedValue: string): string {
    const pepper = this.config.get<string>("LOGIN_THROTTLE_PEPPER")?.trim() || readJwtSecret(this.config);
    return createHash("sha256").update(`${pepper}:${keyType}:${normalizedValue}`).digest("hex");
  }
}

export function readLoginThrottleSettings(config: ConfigService) {
  return {
    windowSeconds: readPositiveInt(config.get<string>("LOGIN_THROTTLE_WINDOW_SECONDS"), DEFAULT_WINDOW_SECONDS),
    maxByIp: readPositiveInt(config.get<string>("LOGIN_THROTTLE_MAX_BY_IP"), DEFAULT_MAX_BY_IP),
    maxByEmail: readPositiveInt(config.get<string>("LOGIN_THROTTLE_MAX_BY_EMAIL"), DEFAULT_MAX_BY_EMAIL),
    maxByEmailIp: readPositiveInt(config.get<string>("LOGIN_THROTTLE_MAX_BY_EMAIL_IP"), DEFAULT_MAX_BY_EMAIL_IP),
    lockoutSeconds: readPositiveInt(config.get<string>("LOGIN_THROTTLE_LOCKOUT_SECONDS"), DEFAULT_LOCKOUT_SECONDS),
  };
}

export function getLoginClientIp(request: Request, trustProxyHeaders: boolean): string | null {
  const proxyIp = trustProxyHeaders
    ? readHeaderIp(request.headers["cf-connecting-ip"]) ??
      readHeaderIp(request.headers["x-real-ip"]) ??
      readHeaderIp(request.headers["x-forwarded-for"])
    : null;

  return normalizeIp(proxyIp ?? request.ip ?? request.socket.remoteAddress ?? null);
}

function readHeaderIp(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const first = raw?.split(",")[0]?.trim();
  return first ? first : null;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function normalizeIp(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^::ffff:/, "");
  return normalized ? normalized : null;
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
