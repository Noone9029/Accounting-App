import {
  LOCAL_DRILL_APPROVAL_ENV,
  OWNER_APPROVAL_PHRASE,
  STATUS_PLAN_READY,
  STATUS_RESTORE_VERIFIED,
  assertBackupAllowed,
  assertRestoreAllowed,
  buildEvidenceReport,
  buildLocalDrillSeedSql,
  classifyDatabaseTarget,
  formatRestoreVerificationResult,
  getRestoreVerificationChecks,
  prepareLocalDrillDatabases,
  redactEvidenceText,
  renderEvidenceMarkdown,
} from "./local-postgres-drill";

describe("local PostgreSQL disaster recovery drill", () => {
  it("classifies local database targets and separates backup-safe from restore-disposable", () => {
    const backupTarget = classifyDatabaseTarget("postgresql://accounting:secret@localhost:5432/accounting?schema=public");
    const restoreTarget = classifyDatabaseTarget("postgresql://accounting:secret@127.0.0.1:5432/ledgerbyte_restore_drill?schema=public");

    expect(backupTarget).toMatchObject({
      validUrl: true,
      hostClass: "local",
      databaseName: "accounting",
      safeForBackup: true,
      safeForRestore: false,
      sanitizedTarget: "postgresql://[REDACTED]@localhost:5432/accounting",
    });
    expect(backupTarget.sanitizedTarget).not.toContain("secret");
    expect(restoreTarget).toMatchObject({
      validUrl: true,
      hostClass: "local",
      databaseName: "ledgerbyte_restore_drill",
      safeForBackup: true,
      safeForRestore: true,
    });
  });

  it("blocks hosted, production, beta, and staging-looking database targets", () => {
    const hosted = classifyDatabaseTarget("postgresql://user:secret@db.supabase.co:5432/postgres");
    const productionLocal = classifyDatabaseTarget("postgresql://user:secret@localhost:5432/ledgerbyte_production");
    const betaLocal = classifyDatabaseTarget("postgresql://user:secret@localhost:5432/ledgerbyte_beta");
    const stagingLocal = classifyDatabaseTarget("postgresql://user:secret@localhost:5432/ledgerbyte_staging");

    for (const target of [hosted, productionLocal, betaLocal, stagingLocal]) {
      expect(target.safeForBackup).toBe(false);
      expect(target.safeForRestore).toBe(false);
      expect(target.blockers.length).toBeGreaterThan(0);
    }
  });

  it("requires explicit local owner approval before backup or restore execution", () => {
    const backupTarget = classifyDatabaseTarget("postgresql://user:secret@localhost:5432/accounting");
    const restoreTarget = classifyDatabaseTarget("postgresql://user:secret@localhost:5432/accounting_restore_drill");

    expect(() => assertBackupAllowed(backupTarget, {})).toThrow(LOCAL_DRILL_APPROVAL_ENV);
    expect(() => assertRestoreAllowed(restoreTarget, {})).toThrow(LOCAL_DRILL_APPROVAL_ENV);
    expect(() => assertBackupAllowed(backupTarget, { [LOCAL_DRILL_APPROVAL_ENV]: OWNER_APPROVAL_PHRASE })).not.toThrow();
    expect(() => assertRestoreAllowed(restoreTarget, { [LOCAL_DRILL_APPROVAL_ENV]: OWNER_APPROVAL_PHRASE })).not.toThrow();
  });

  it("blocks restore into an active local development database even with approval", () => {
    const activeDevelopmentTarget = classifyDatabaseTarget("postgresql://user:secret@localhost:5432/accounting");

    expect(() =>
      assertRestoreAllowed(activeDevelopmentTarget, {
        [LOCAL_DRILL_APPROVAL_ENV]: OWNER_APPROVAL_PHRASE,
      }),
    ).toThrow("disposable local PostgreSQL database");
  });

  it("requires disposable local source and restore databases before fixture preparation", () => {
    expect(() =>
      prepareLocalDrillDatabases(
        {
          mode: "drill",
          sourceDatabaseUrl: "postgresql://user:secret@localhost:5432/accounting",
          restoreDatabaseUrl: "postgresql://user:secret@localhost:5432/accounting_restore_drill",
          env: { [LOCAL_DRILL_APPROVAL_ENV]: OWNER_APPROVAL_PHRASE },
        },
        { run: jest.fn() },
      ),
    ).toThrow("Restore target must be a disposable local PostgreSQL database name");
  });

  it("keeps unsafe execution blocked even when fixture preparation is requested", () => {
    expect(() =>
      prepareLocalDrillDatabases(
        {
          mode: "drill",
          sourceDatabaseUrl: "postgresql://user:secret@db.supabase.co:5432/ledgerbyte_dr_source_local",
          restoreDatabaseUrl: "postgresql://user:secret@localhost:5432/ledgerbyte_dr_restore_local",
          env: { [LOCAL_DRILL_APPROVAL_ENV]: OWNER_APPROVAL_PHRASE },
        },
        { run: jest.fn() },
      ),
    ).toThrow("Hosted or remote database targets are blocked");
  });

  it("redacts evidence and markdown so secrets and URLs are not exposed", () => {
    const evidence = buildEvidenceReport({
      mode: "plan",
      gitCommit: "abc1234",
      sourceDatabaseUrl: "postgresql://user:super-secret@localhost:5432/accounting",
      restoreDatabaseUrl: "postgresql://user:super-secret@localhost:5432/accounting_restore_drill",
      now: new Date("2026-07-08T12:00:00.000Z"),
      status: STATUS_PLAN_READY,
      warnings: ["No real backup executed."],
    });
    const json = JSON.stringify(evidence);
    const markdown = renderEvidenceMarkdown(evidence);

    expect(json).not.toContain("super-secret");
    expect(json).not.toContain("postgresql://user");
    expect(evidence.noSecretsReturned).toBe(true);
    expect(markdown).not.toContain("super-secret");
    expect(markdown).toContain("Hosted production recovery proven: false");
  });

  it("formats restore verification results and reports failed required checks", () => {
    const checks = getRestoreVerificationChecks().slice(0, 2).map((check, index) => ({
      ...check,
      passed: index === 0,
      observedValue: index === 0 ? 1 : null,
      message: index === 0 ? "counted" : "missing",
    }));

    expect(formatRestoreVerificationResult(checks)).toMatchObject({
      passed: false,
      invoicePaymentLinkCoverage: false,
      checks: [
        expect.objectContaining({ id: "organization-table", passed: true }),
        expect.objectContaining({ id: "user-table", passed: false }),
      ],
    });
  });

  it("includes requestId-bearing models and invoice payment-link coverage in restore verification", () => {
    const checks = getRestoreVerificationChecks();
    const requestIdTables = checks.filter((check) => check.requestIdCoverage).map((check) => check.table).sort();

    expect(requestIdTables).toEqual([
      "AuditLog",
      "DocumentExtractionResult",
      "DocumentReviewDecision",
      "GeneratedDocument",
      "PaymentProviderEvent",
    ]);
    expect(checks.map((check) => check.table)).toContain("InvoicePaymentLink");
    expect(checks.map((check) => check.table)).toContain("_prisma_migrations");
    expect(checks.find((check) => check.id === "tenant-scope-no-cross-org-journal-lines")).toMatchObject({
      expected: "true",
    });
  });

  it("seeds production-shaped local data for requestId-bearing model verification", () => {
    const seedSql = buildLocalDrillSeedSql();

    for (const table of ["AuditLog", "GeneratedDocument", "DocumentExtractionResult", "DocumentReviewDecision", "PaymentProviderEvent", "InvoicePaymentLink"]) {
      expect(seedSql).toContain(`"${table}"`);
    }
    expect(seedSql).toContain("req_local_drill_");
    expect(seedSql).toContain("NULL");
    expect(seedSql).toContain("Local DR Tenant B");
    expect(seedSql).not.toContain("postgresql://");
    expect(seedSql).not.toContain("super-secret");
  });

  it("redacts evidence after executed local drill verification succeeds", () => {
    const verification = formatRestoreVerificationResult(
      getRestoreVerificationChecks().map((check) => ({
        ...check,
        passed: true,
        observedValue: check.expected === "true" ? "t" : "1",
        message: "Verification passed against local disposable restore database.",
      })),
    );
    const evidence = buildEvidenceReport({
      mode: "drill",
      gitCommit: "abc1234",
      sourceDatabaseUrl: "postgresql://user:super-secret@localhost:5432/ledgerbyte_dr_source_local",
      restoreDatabaseUrl: "postgresql://user:super-secret@localhost:5432/ledgerbyte_dr_restore_local",
      now: new Date("2026-07-08T12:00:00.000Z"),
      status: STATUS_RESTORE_VERIFIED,
      backup: {
        filename: "ledgerbyte-local-backup.dump",
        absolutePath: "E:/tmp/ledgerbyte-local-backup.dump",
        checksumSha256: "a".repeat(64),
        sizeBytes: 1024,
      },
      verification,
      warnings: ["Hosted/prod mutation was blocked/not attempted."],
    });

    const json = JSON.stringify(evidence);
    expect(evidence.restoreVerification.passed).toBe(true);
    expect(evidence.status).toBe(STATUS_RESTORE_VERIFIED);
    expect(json).not.toContain("super-secret");
    expect(json).not.toContain("postgresql://user");
    expect(json).not.toContain("E:/tmp");
    expect(evidence.productionRecoveryProven).toBe(false);
    expect(evidence.hostedProductionRecoveryProven).toBe(false);
    expect(evidence.hostedProdMutationAttempted).toBe(false);
    expect(evidence.warnings).toContain("Hosted/prod/beta/staging database mutation was blocked/not attempted.");
  });

  it("redacts sensitive text from command failures", () => {
    expect(redactEvidenceText("failed postgresql://user:secret@localhost:5432/db with token=abc")).not.toContain("secret");
  });
});
