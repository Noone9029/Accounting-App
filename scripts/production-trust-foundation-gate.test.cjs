"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  STATUS_BLOCKED,
  STATUS_PLANNING_ONLY,
  STATUS_STRICT_PASSED,
  buildProductionTrustFoundationGate,
  plannedChecks,
} = require("./production-trust-foundation-gate.cjs");

test("default run returns planning-only status with remaining blockers but no static failures", () => {
  const repoRoot = createFixtureRepo();
  const result = buildProductionTrustFoundationGate({ repoRoot });

  assert.equal(result.status, STATUS_PLANNING_ONLY);
  assert.equal(result.blockers.length, 0);
  assert.deepEqual(result.remainingTrustBlockers, [
    "Hosted restore proof remains missing.",
    "Object-storage restore proof remains missing.",
    "Monitoring/alerting remains missing.",
    "MFA/session hardening remains missing.",
    "Billing/legal/support ownership remains missing.",
  ]);
});

test("strict run returns passed-with-blockers when static checks pass", () => {
  const repoRoot = createFixtureRepo({ includePackageScripts: true });
  const result = buildProductionTrustFoundationGate({ repoRoot, strict: true });

  assert.equal(result.status, STATUS_STRICT_PASSED);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.packageScripts.valid, true);
});

test("json cli output is parseable and stays non-mutating", () => {
  const repoRoot = createFixtureRepo({ includePackageScripts: true });
  const scriptPath = path.join(__dirname, "production-trust-foundation-gate.cjs");
  const result = spawnSync(process.execPath, [scriptPath, "--json", "--strict"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, STATUS_STRICT_PASSED);
  assert.equal(parsed.networkAccessAttempted, false);
  assert.equal(parsed.databaseAccessAttempted, false);
  assert.equal(parsed.envSecretReadsAttempted, false);
  assert.equal(parsed.storageAccessAttempted, false);
  assert.equal(parsed.emailSendsAttempted, false);
  assert.equal(parsed.zatcaExecutionAttempted, false);
  assert.equal(parsed.fileWritesAttempted, false);
});

test("plan mode exposes the planned checks", () => {
  const repoRoot = createFixtureRepo();
  const result = buildProductionTrustFoundationGate({ repoRoot, plan: true });

  assert.equal(result.planMode, true);
  assert.deepEqual(result.plannedChecks, plannedChecks());
});

test("forbidden positive claims block the gate", () => {
  const repoRoot = createFixtureRepo({
    auditOverrides: [
      "",
      "LedgerByte is production-ready.",
      "Production hosting complete.",
    ].join("\n"),
  });
  const result = buildProductionTrustFoundationGate({ repoRoot, strict: true });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_FORBIDDEN_CLAIM/);
});

test("required docs missing block the gate", () => {
  const repoRoot = createFixtureRepo();
  fs.rmSync(path.join(repoRoot, "docs", "production", "LAUNCH_GATE_CHECKLIST.md"));
  const result = buildProductionTrustFoundationGate({ repoRoot, strict: true });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /LAUNCH_GATE_CHECKLIST\.md/);
});

test("package scripts are validated when present", () => {
  const repoRoot = createFixtureRepo({ includePackageScripts: true });
  const result = buildProductionTrustFoundationGate({ repoRoot, strict: true });

  assert.equal(result.packageScripts.foundAny, true);
  assert.equal(result.packageScripts.valid, true);
  const packageChecks = result.checks.filter((item) => item.id.startsWith("PACKAGE_SCRIPT:"));
  assert.equal(packageChecks.length, 2);
  assert.ok(packageChecks.every((item) => item.passed));
});

function createFixtureRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-prod-trust-"));
  write(repoRoot, "package.json", JSON.stringify(packageJsonFixture(options.includePackageScripts), null, 2));
  write(
    repoRoot,
    "README.md",
    [
      "# LedgerByte",
      "LedgerByte remains controlled beta/user-testing only.",
      "The current Vercel deployment is beta/user-testing only; final production hosting is a separate decision.",
      "LedgerByte is not production-ready.",
      "LedgerByte is not paid SaaS ready.",
      "LedgerByte is not official VAT filing ready.",
      "LedgerByte is not ZATCA compliant.",
    ].join("\n"),
  );

  write(
    repoRoot,
    "docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md",
    [
      "# Production Trust Foundation Audit",
      "LedgerByte remains controlled beta/user-testing only.",
      "LedgerByte is not production-ready.",
      "LedgerByte is not paid SaaS ready.",
      "LedgerByte is not official VAT filing ready.",
      "LedgerByte is not ZATCA compliant.",
      "Vercel remains beta/user-testing only; final production hosting remains separate.",
      "Restore proof remains missing at the hosted-provider level.",
      "Object-storage restore proof remains missing.",
      "Monitoring/alerting remains missing beyond planning docs and metadata-only readiness surfaces.",
      "MFA/session hardening remains missing.",
      "Billing/legal/support ownership remains missing.",
      ...auditHeadingsAndFields(),
      options.auditOverrides || "",
    ].join("\n"),
  );

  write(
    repoRoot,
    "docs/production/LAUNCH_GATE_CHECKLIST.md",
    [
      "# Launch Gate",
      "| Hosted backup/PITR proof | blocked |",
      "| Object storage proof | blocked |",
      "| Monitoring and alerting | not started |",
      "| Security review | blocked |",
      "| Billing/legal | not started |",
    ].join("\n"),
  );

  write(repoRoot, "docs/BACKUP_AND_RESTORE_READINESS_PLAN.md", "# Backup plan\nRestore proof remains missing until hosted drills exist.\nObject-storage restore proof remains missing.");
  write(
    repoRoot,
    "docs/production/PRODUCTION_FOUNDATION_ROADMAP.md",
    "The current Vercel/Supabase deployment is a beta/user-testing environment only, not final production hosting.",
  );
  write(
    repoRoot,
    "docs/production/PAID_SAAS_V1_GAP_MATRIX.md",
    "Vercel is the current beta/user-testing deployment surface only, not final production hosting.",
  );
  write(repoRoot, "docs/deployment/SUPABASE_SECURITY_REVIEW.md", "# Supabase security review");
  write(repoRoot, "docs/deployment/SUPABASE_RLS_REVIEW_20260519.md", "# Supabase RLS review");
  write(repoRoot, "docs/deployment/SUPABASE_RLS_DATA_API_HARDENING_20260521.md", "# Supabase hardening review");
  write(repoRoot, "docs/deployment/VERCEL_USER_TESTING_DEPLOYMENT_RUNBOOK.md", "# Vercel user-testing deployment runbook");
  write(repoRoot, "CODEX_HANDOFF.md", "Current branch remains controlled beta/user-testing only.");
  write(repoRoot, "BUG_AUDIT.md", "Production trust blockers remain documented; LedgerByte is not production-ready.");
  write(repoRoot, "docs/PRODUCT_READINESS_SCORECARD.md", "LedgerByte is not paid SaaS ready.");
  write(repoRoot, "docs/IMPLEMENTATION_STATUS.md", "Real ZATCA production compliance is not enabled.");
  write(repoRoot, "docs/REMAINING_ROADMAP.md", "The current deployment is beta/user-testing only.");
  write(repoRoot, "docs/product/FEATURE_PARITY_COMMAND_CENTER.md", "Current route is production trust foundation only.");
  return repoRoot;
}

function auditHeadingsAndFields() {
  return [
    "## 1. Storage/object storage",
    "- Current repo evidence:",
    "- Status: Partial.",
    "- Safe for controlled beta:",
    "- Missing for paid SaaS:",
    "- Next concrete implementation ticket:",
    "- Current commands/evidence:",
    "- Commands still forbidden:",
    "## 2. Generated document storage",
    "## 3. Attachment storage",
    "## 4. Backup/PITR",
    "## 5. Restore proof",
    "## 6. Monitoring/alerting",
    "## 7. Runtime logs/error visibility",
    "## 8. Health/readiness endpoints",
    "## 9. Email provider readiness",
    "## 10. Tenant isolation/RLS/runtime DB role",
    "## 11. Auth/session/MFA posture",
    "## 12. Audit immutability/export",
    "## 13. Billing/legal/support ownership",
    "## 14. Launch gate status",
  ];
}

function packageJsonFixture(includeScripts) {
  const base = { name: "fixture-ledgerbyte", private: true, scripts: {} };
  if (includeScripts) {
    base.scripts["production:trust-foundation-gate"] = "node scripts/production-trust-foundation-gate.cjs";
    base.scripts["test:production-trust-foundation-gate"] = "node --test scripts/production-trust-foundation-gate.test.cjs";
  }
  return base;
}

function write(repoRoot, relativePath, contents) {
  const targetPath = path.join(repoRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
}
