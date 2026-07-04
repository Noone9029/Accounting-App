import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { readLoginThrottleSettings } from "./login-throttle.service";

export const DEFAULT_AUTH_SESSION_CLEANUP_EXPIRED_RETENTION_DAYS = 30;
export const DEFAULT_AUTH_SESSION_CLEANUP_REVOKED_RETENTION_DAYS = 30;
export const DEFAULT_LOGIN_RATE_LIMIT_CLEANUP_RETENTION_DAYS = 7;
export const DEFAULT_SECURITY_CLEANUP_BATCH_SIZE = 500;

export type SecurityCleanupMode = "dry-run" | "execute";

export type SecurityCleanupOptions = {
  mode?: SecurityCleanupMode;
  now?: Date;
  batchSize?: number;
};

export type SecurityCleanupResult = {
  mode: SecurityCleanupMode;
  dryRun: boolean;
  batchSize: number;
  authSessions: {
    expiredRetentionDays: number;
    revokedRetentionDays: number;
    expiredEligible: number;
    revokedEligible: number;
    totalEligible: number;
    deleted: number;
  };
  loginRateLimits: {
    retentionDays: number;
    activeWindowSeconds: number;
    eligible: number;
    deleted: number;
  };
};

type SecurityCleanupSettings = {
  authSessionExpiredRetentionDays: number;
  authSessionRevokedRetentionDays: number;
  loginRateLimitRetentionDays: number;
  batchSize: number;
};

@Injectable()
export class SecurityMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async cleanupSecurityRecords(options: SecurityCleanupOptions = {}): Promise<SecurityCleanupResult> {
    const mode = options.mode ?? "dry-run";
    const dryRun = mode !== "execute";
    const now = options.now ?? new Date();
    const settings = readSecurityCleanupSettings(this.config, options.batchSize);
    const loginThrottleSettings = readLoginThrottleSettings(this.config);

    const authSessionExpiredCutoff = subtractDays(now, settings.authSessionExpiredRetentionDays);
    const authSessionRevokedCutoff = subtractDays(now, settings.authSessionRevokedRetentionDays);
    const expiredAuthSessionWhere: Prisma.AuthSessionWhereInput = {
      expiresAt: { lt: authSessionExpiredCutoff },
    };
    const revokedAuthSessionWhere: Prisma.AuthSessionWhereInput = {
      revokedAt: { lt: authSessionRevokedCutoff },
    };
    const staleAuthSessionWhere: Prisma.AuthSessionWhereInput = {
      OR: [expiredAuthSessionWhere, revokedAuthSessionWhere],
    };

    const expiredEligible = await this.prisma.authSession.count({ where: expiredAuthSessionWhere });
    const revokedEligible = await this.prisma.authSession.count({ where: revokedAuthSessionWhere });
    const totalAuthSessionEligible = await this.prisma.authSession.count({ where: staleAuthSessionWhere });
    const authSessionsDeleted = dryRun ? 0 : await this.deleteAuthSessionsInBatches(staleAuthSessionWhere, settings.batchSize);

    const loginRateLimitRetentionCutoff = subtractDays(now, settings.loginRateLimitRetentionDays);
    const loginRateLimitActiveWindowCutoff = new Date(now.getTime() - loginThrottleSettings.windowSeconds * 1000);
    const staleLoginRateLimitWhere: Prisma.LoginRateLimitWhereInput = {
      AND: [
        { updatedAt: { lt: loginRateLimitRetentionCutoff } },
        { windowStartedAt: { lt: loginRateLimitActiveWindowCutoff } },
        {
          OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
        },
      ],
    };
    const loginRateLimitEligible = await this.prisma.loginRateLimit.count({ where: staleLoginRateLimitWhere });
    const loginRateLimitsDeleted = dryRun ? 0 : await this.deleteLoginRateLimitsInBatches(staleLoginRateLimitWhere, settings.batchSize);

    return {
      mode,
      dryRun,
      batchSize: settings.batchSize,
      authSessions: {
        expiredRetentionDays: settings.authSessionExpiredRetentionDays,
        revokedRetentionDays: settings.authSessionRevokedRetentionDays,
        expiredEligible,
        revokedEligible,
        totalEligible: totalAuthSessionEligible,
        deleted: authSessionsDeleted,
      },
      loginRateLimits: {
        retentionDays: settings.loginRateLimitRetentionDays,
        activeWindowSeconds: loginThrottleSettings.windowSeconds,
        eligible: loginRateLimitEligible,
        deleted: loginRateLimitsDeleted,
      },
    };
  }

  private async deleteAuthSessionsInBatches(where: Prisma.AuthSessionWhereInput, batchSize: number): Promise<number> {
    let deleted = 0;

    for (;;) {
      const rows = await this.prisma.authSession.findMany({
        where,
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: batchSize,
      });
      if (rows.length === 0) {
        return deleted;
      }

      const result = await this.prisma.authSession.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } },
      });
      deleted += result.count;

      if (result.count === 0) {
        return deleted;
      }
    }
  }

  private async deleteLoginRateLimitsInBatches(where: Prisma.LoginRateLimitWhereInput, batchSize: number): Promise<number> {
    let deleted = 0;

    for (;;) {
      const rows = await this.prisma.loginRateLimit.findMany({
        where,
        select: { id: true },
        orderBy: { updatedAt: "asc" },
        take: batchSize,
      });
      if (rows.length === 0) {
        return deleted;
      }

      const result = await this.prisma.loginRateLimit.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } },
      });
      deleted += result.count;

      if (result.count === 0) {
        return deleted;
      }
    }
  }
}

export function readSecurityCleanupSettings(config: ConfigService, batchSizeOverride?: number): SecurityCleanupSettings {
  return {
    authSessionExpiredRetentionDays: readPositiveInteger(
      config.get<string>("AUTH_SESSION_CLEANUP_EXPIRED_RETENTION_DAYS"),
      DEFAULT_AUTH_SESSION_CLEANUP_EXPIRED_RETENTION_DAYS,
    ),
    authSessionRevokedRetentionDays: readPositiveInteger(
      config.get<string>("AUTH_SESSION_CLEANUP_REVOKED_RETENTION_DAYS"),
      DEFAULT_AUTH_SESSION_CLEANUP_REVOKED_RETENTION_DAYS,
    ),
    loginRateLimitRetentionDays: readPositiveInteger(
      config.get<string>("LOGIN_RATE_LIMIT_CLEANUP_RETENTION_DAYS"),
      DEFAULT_LOGIN_RATE_LIMIT_CLEANUP_RETENTION_DAYS,
    ),
    batchSize: sanitizePositiveInteger(batchSizeOverride) ?? readPositiveInteger(config.get<string>("SECURITY_CLEANUP_BATCH_SIZE"), DEFAULT_SECURITY_CLEANUP_BATCH_SIZE),
  };
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  return sanitizePositiveInteger(Number(value)) ?? fallback;
}

function sanitizePositiveInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}
