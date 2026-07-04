import { formatSecurityCleanupResult, parseSecurityCleanupArgs, runSecurityCleanupCli, securityCleanupHelpText } from "./security-cleanup";

describe("security cleanup CLI", () => {
  it("defaults to dry-run mode", () => {
    expect(parseSecurityCleanupArgs([])).toEqual({
      mode: "dry-run",
      batchSize: undefined,
    });
  });

  it("requires an explicit execute flag for deletion mode", () => {
    expect(parseSecurityCleanupArgs(["--execute"])).toEqual({
      mode: "execute",
      batchSize: undefined,
    });
  });

  it("parses an optional positive batch size", () => {
    expect(parseSecurityCleanupArgs(["--dry-run", "--batch-size=25"])).toEqual({
      mode: "dry-run",
      batchSize: 25,
    });
  });

  it("rejects invalid batch sizes and unknown flags", () => {
    expect(() => parseSecurityCleanupArgs(["--batch-size=0"])).toThrow("positive integer");
    expect(() => parseSecurityCleanupArgs(["--unknown"])).toThrow("Unknown security cleanup flag");
  });

  it("renders help without secret-bearing identifiers", () => {
    const output = securityCleanupHelpText();

    expect(output).toContain("security:cleanup -- --dry-run");
    expect(output).toContain("security:cleanup -- --execute");
    expect(output).not.toMatch(/token|jti|cookie|password|secret|database_url|direct_url/i);
  });

  it("returns non-zero for invalid flags without starting cleanup", async () => {
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    await expect(runSecurityCleanupCli(["--unknown"], logger)).resolves.toBe(1);

    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Unknown security cleanup flag"));
  });

  it("runs dry-run cleanup through the Nest context and renders aggregate output", async () => {
    const { NestFactory } = await import("@nestjs/core");
    const { SecurityMaintenanceService } = await import("../src/auth/security-maintenance.service");
    const cleanupSecurityRecords = jest.fn().mockResolvedValue({
      mode: "dry-run",
      dryRun: true,
      batchSize: 500,
      authSessions: {
        expiredRetentionDays: 30,
        revokedRetentionDays: 30,
        expiredEligible: 0,
        revokedEligible: 0,
        totalEligible: 0,
        deleted: 0,
      },
      loginRateLimits: {
        retentionDays: 7,
        activeWindowSeconds: 900,
        eligible: 0,
        deleted: 0,
      },
    });
    const app = {
      get: jest.fn().mockReturnValue({ cleanupSecurityRecords }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const createApplicationContext = jest.spyOn(NestFactory, "createApplicationContext").mockResolvedValue(app as never);
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    await expect(runSecurityCleanupCli(["--dry-run"], logger)).resolves.toBe(0);

    expect(createApplicationContext).toHaveBeenCalled();
    expect(app.get).toHaveBeenCalledWith(SecurityMaintenanceService);
    expect(cleanupSecurityRecords).toHaveBeenCalledWith({ mode: "dry-run", batchSize: undefined });
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("mode: dry-run"));
    expect(logger.error).not.toHaveBeenCalled();
    expect(app.close).toHaveBeenCalled();

    createApplicationContext.mockRestore();
  });

  it("renders count-only output without secret-bearing identifiers", () => {
    const output = formatSecurityCleanupResult({
      mode: "dry-run",
      dryRun: true,
      batchSize: 500,
      authSessions: {
        expiredRetentionDays: 30,
        revokedRetentionDays: 30,
        expiredEligible: 2,
        revokedEligible: 1,
        totalEligible: 3,
        deleted: 0,
      },
      loginRateLimits: {
        retentionDays: 7,
        activeWindowSeconds: 900,
        eligible: 4,
        deleted: 0,
      },
    });

    expect(output).toContain("mode: dry-run");
    expect(output).toContain("AuthSession eligible: 3");
    expect(output).toContain("LoginRateLimit eligible: 4");
    expect(output).not.toMatch(/token|jti|cookie|password|secret/i);
  });
});
