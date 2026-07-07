const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildReport, formatMarkdown, formatText, writeEvidence } = require("./monitoring-support-readiness.cjs");

function writeFile(rootDir, relativePath, content) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function createCompleteFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "monitoring-support-readiness-"));
  writeFile(rootDir, "apps/api/src/health/health.controller.ts", '@Get("health") status: "ok"\n@Get("readiness") await prisma.$queryRaw`SELECT 1`; database: "ok"');
  writeFile(rootDir, "docs/deployment/DEPLOYED_E2E_RUNBOOK.md", "Health, readiness, route, and login smoke checks.");
  writeFile(rootDir, "docs/beta-testing/BETA_FIX_01_LIVE_ENVIRONMENT_CHECK.md", "Readiness route evidence.");
  writeFile(rootDir, "docs/deployment/CI_DATABASE_READINESS_CHECKLIST.md", "database: ok");
  writeFile(rootDir, "apps/api/src/email/email.controller.ts", '@Get("readiness") diagnosticsPlan runDiagnostics monitoring-plan monitoring-evidence retry-worker/plan retryWorkerPlan outbox queue worker');
  writeFile(
    rootDir,
    "docs/operations/ALERTING_MATRIX.md",
    [
      "Alerting Matrix Signal Critical outbox",
      "API health failure",
      "Readiness database failure",
      "Email outbox stuck",
      "Backup readiness missing",
      "Restore evidence stale",
      "Storage readiness blocked",
      "Queue lag/failure",
      "Suspicious tenant boundary alert",
      "ZATCA network attempted unexpectedly",
      "UAE ASP network attempted unexpectedly",
    ].join("\n"),
  );
  writeFile(rootDir, "docs/operations/MONITORING_AND_SUPPORT_READINESS_PLAN.md", "queue worker");
  writeFile(rootDir, "apps/api/src/system/system.controller.ts", "backup-readiness backup");
  writeFile(rootDir, "docs/operations/BACKUP_PITR_OBJECT_STORAGE_PRE_ASP_PLAN.md", "backup");
  writeFile(rootDir, "docs/operations/RESTORE_DRILL_EVIDENCE_INDEX.md", "restore drill evidence");
  writeFile(rootDir, "docs/production/BACKUP_RESTORE_PROOF_HARNESS.md", "restore evidence");
  writeFile(rootDir, "scripts/object-storage-proof-validate.cjs", "noNetwork dry-run storage proof");
  writeFile(rootDir, "docs/operations/OBJECT_STORAGE_VALIDATION_PLAN.md", "object storage");
  writeFile(rootDir, "apps/api/src/storage/storage.controller.ts", '@Get("readiness") storage');
  writeFile(rootDir, "docs/operations/DOCUMENT_ARCHIVE_RETENTION_PLAN.md", "storage");
  writeFile(rootDir, "scripts/zatca-sandbox-adapter-no-network-contract.cjs", "noNetwork");
  writeFile(rootDir, "scripts/zatca-sdk-ci-readiness.cjs", "no network");
  writeFile(rootDir, "apps/api/src/compliance-core/compliance-core.controller.ts", "asp-provider/readiness");
  writeFile(rootDir, "docs/production/PRE_ASP_PRODUCTION_FOUNDATION_TRACKER.md", "ASP access No real ASP no network");
  writeFile(rootDir, "docs/operations/SUPPORT_TRIAGE_RUNBOOK.md", "Support Triage Triage Buckets Support Boundaries");
  writeFile(rootDir, "docs/operations/INCIDENT_RESPONSE_RUNBOOK.md", "Incident Response Severity First 15 Minutes");
  writeFile(rootDir, "docs/operations/OPERATIONAL_DASHBOARD_REQUIREMENTS.md", "Operational Dashboard Dashboard Panels Data Safety");
  writeFile(rootDir, "docs/beta-testing/CONTROLLED_BETA_SUPPORT_READY.md", "support triage beta");
  writeFile(rootDir, "docs/beta-testing/BETA_ISSUE_TRIAGE_RUNBOOK.md", "support triage beta");
  return rootDir;
}

test("builds deterministic local readiness report without DB network mutation flags", () => {
  const report = buildReport({ rootDir: createCompleteFixture() });

  assert.equal(report.deterministic, true);
  assert.equal(report.generatedAt, "2026-07-02T00:00:00.000Z");
  assert.equal(report.noDatabaseConnection, true);
  assert.equal(report.noNetwork, true);
  assert.equal(report.noMutation, true);
  assert.equal(report.noEmailSend, true);
  assert.equal(report.noProviderCall, true);
  assert.equal(report.noStorageOperation, true);
  assert.equal(report.blocked.length, 0);
  assert.ok(report.checks.some((check) => check.id === "api-readiness-endpoint" && check.status === "available"));
  assert.ok(report.checks.some((check) => check.id === "queue-worker-readiness" && check.status === "partial"));
});

test("exposes evidence output and alerting-matrix coverage without claiming live monitoring", () => {
  const report = buildReport({ rootDir: createCompleteFixture() });

  assert.deepEqual(report.evidenceOutputFormat, {
    format: "markdown+json",
    markdownFile: "docs/operations/evidence/MONITORING_SUPPORT_READINESS.md",
    jsonFile: "docs/operations/evidence/MONITORING_SUPPORT_READINESS.json",
    includesSecretValues: false,
    includesCustomerData: false,
    includesProviderCredentials: false,
    includesProviderResponses: false,
  });
  assert.equal(report.alertingMatrixCoverage.allRequiredSignalsPresent, true);
  assert.deepEqual(report.alertingMatrixCoverage.missingSignals, []);
  assert.equal(report.alertingMatrixCoverage.providerAlertRulesCreated, false);
  assert.equal(report.alertingMatrixCoverage.hostedLogDrainConfigured, false);
  assert.ok(report.alertingMatrixCoverage.presentSignals.includes("API health failure"));
  assert.ok(report.alertingMatrixCoverage.presentSignals.includes("Suspicious tenant boundary alert"));
});

test("reports blocked checks when source evidence is absent", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "monitoring-support-empty-"));
  const report = buildReport({ rootDir });

  assert.equal(report.status, "MONITORING_SUPPORT_REVIEW_REQUIRED");
  assert.ok(report.blocked.length > 0);
  assert.ok(report.blocked.some((check) => check.id === "api-health-endpoint"));
});

test("formats evidence without printing secret values or customer data", () => {
  const report = buildReport({ rootDir: createCompleteFixture() });
  const serialized = `${JSON.stringify(report)}\n${formatText(report)}\n${formatMarkdown(report)}`;

  assert.doesNotMatch(serialized, /postgres:\/\/|smtp-password|api[_-]?key-value|customer invoice body/i);
  assert.doesNotMatch(serialized, /DATABASE_URL=.*|SMTP_PASSWORD=.*|TOKEN=.*/i);
});

test("script source stays local/read-only and does not import network or process mutation APIs", () => {
  const source = fs.readFileSync(path.join(__dirname, "monitoring-support-readiness.cjs"), "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https\.request|http\.request|net\.connect|createConnection/);
  assert.doesNotMatch(source, /PrismaClient|nodemailer|sendMail/);
  assert.doesNotMatch(source, /execSync|spawnSync|child_process/);
});

test("writes markdown and json evidence to the requested paths", () => {
  const rootDir = createCompleteFixture();
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "monitoring-support-evidence-"));
  const evidencePath = path.join(outDir, "MONITORING_SUPPORT_READINESS.md");
  const jsonPath = path.join(outDir, "MONITORING_SUPPORT_READINESS.json");
  const report = buildReport({ rootDir });

  writeEvidence(report, { evidencePath, jsonPath });

  assert.match(fs.readFileSync(evidencePath, "utf8"), /Monitoring Support Readiness Evidence/);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).status, report.status);
});
