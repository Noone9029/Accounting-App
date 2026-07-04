import type { INestApplicationContext, LoggerService } from "@nestjs/common";
import type { SecurityCleanupMode, SecurityCleanupResult } from "../src/auth/security-maintenance.service";

type ParsedSecurityCleanupArgs = {
  mode: SecurityCleanupMode;
  batchSize?: number;
  help?: boolean;
};

type CliLogger = Pick<LoggerService, "log" | "error">;

export function parseSecurityCleanupArgs(argv: string[]): ParsedSecurityCleanupArgs {
  const parsed: ParsedSecurityCleanupArgs = {
    mode: "dry-run",
    batchSize: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg || arg === "--") {
      continue;
    }

    const { flag, value } = splitFlag(arg);
    switch (flag) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--dry-run":
        parsed.mode = "dry-run";
        break;
      case "--execute":
        parsed.mode = "execute";
        break;
      case "--batch-size": {
        const rawValue = value ?? argv[++index];
        parsed.batchSize = parsePositiveIntegerFlag(flag, rawValue);
        break;
      }
      default:
        if (flag.startsWith("-")) {
          throw new Error(`Unknown security cleanup flag: ${flag}`);
        }
        throw new Error(`Unexpected security cleanup argument: ${flag}`);
    }
  }

  return parsed;
}

export function formatSecurityCleanupResult(result: SecurityCleanupResult): string {
  return [
    "LedgerByte security cleanup",
    `mode: ${result.mode}`,
    `dryRun: ${result.dryRun}`,
    `batchSize: ${result.batchSize}`,
    `AuthSession retentionDays: expired=${result.authSessions.expiredRetentionDays} revoked=${result.authSessions.revokedRetentionDays}`,
    `AuthSession eligible: ${result.authSessions.totalEligible}`,
    `AuthSession eligibleByReason: expired=${result.authSessions.expiredEligible} revoked=${result.authSessions.revokedEligible}`,
    `AuthSession deleted: ${result.authSessions.deleted}`,
    `LoginRateLimit retentionDays: ${result.loginRateLimits.retentionDays}`,
    `LoginRateLimit activeWindowSeconds: ${result.loginRateLimits.activeWindowSeconds}`,
    `LoginRateLimit eligible: ${result.loginRateLimits.eligible}`,
    `LoginRateLimit deleted: ${result.loginRateLimits.deleted}`,
  ].join("\n");
}

export function securityCleanupHelpText(): string {
  return [
    "LedgerByte security cleanup",
    "",
    "Usage:",
    "  corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run",
    "  corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute",
    "  corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run --batch-size=500",
    "",
    "The command defaults to dry-run. Execute mode requires the explicit --execute flag.",
  ].join("\n");
}

export async function runSecurityCleanupCli(
  argv: string[] = process.argv.slice(2),
  logger: CliLogger = console,
): Promise<number> {
  let app: INestApplicationContext | undefined;

  try {
    const parsed = parseSecurityCleanupArgs(argv);
    if (parsed.help) {
      logger.log(securityCleanupHelpText());
      return 0;
    }

    const [{ Module }, { ConfigModule, ConfigService }, { NestFactory }, { PrismaModule }, { PrismaService }, { SecurityMaintenanceService }] = await Promise.all([
      import("@nestjs/common"),
      import("@nestjs/config"),
      import("@nestjs/core"),
      import("../src/prisma/prisma.module"),
      import("../src/prisma/prisma.service"),
      import("../src/auth/security-maintenance.service"),
    ]);

    @Module({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
      providers: [
        {
          provide: SecurityMaintenanceService,
          useFactory: (prisma: InstanceType<typeof PrismaService>, config: InstanceType<typeof ConfigService>) =>
            new SecurityMaintenanceService(prisma, config),
          inject: [PrismaService, ConfigService],
        },
      ],
    })
    class SecurityCleanupCliModule {}

    app = await NestFactory.createApplicationContext(SecurityCleanupCliModule, {
      logger: ["error", "warn", "log"],
    });

    const result = await app.get(SecurityMaintenanceService).cleanupSecurityRecords({
      mode: parsed.mode,
      batchSize: parsed.batchSize,
    });
    logger.log(formatSecurityCleanupResult(result));
    return 0;
  } catch (error) {
    logger.error(`Security cleanup failed: ${sanitizeError(error)}`);
    return 1;
  } finally {
    await app?.close();
  }
}

function splitFlag(arg: string): { flag: string; value?: string } {
  const equalsIndex = arg.indexOf("=");
  if (equalsIndex === -1) {
    return { flag: arg };
  }
  return { flag: arg.slice(0, equalsIndex), value: arg.slice(equalsIndex + 1) };
}

function parsePositiveIntegerFlag(flag: string, value: string | undefined): number {
  if (!value || value.startsWith("--")) {
    throw new Error(`Security cleanup flag ${flag} requires a positive integer value.`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Security cleanup flag ${flag} requires a positive integer value.`);
  }

  return parsed;
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://[REDACTED]@")
    .replace(/password["']?\s*:\s*["'][^"']+["']/gi, "password:[REDACTED]")
    .replace(/token["']?\s*:\s*["'][^"']+["']/gi, "token:[REDACTED]")
    .replace(/secret["']?\s*:\s*["'][^"']+["']/gi, "secret:[REDACTED]");
}

if (require.main === module) {
  runSecurityCleanupCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
