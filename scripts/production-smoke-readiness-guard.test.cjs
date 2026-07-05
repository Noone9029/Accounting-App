"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  STATUS_BLOCKED,
  STATUS_PASSED,
  buildProductionSmokeReadinessGuard,
} = require("./production-smoke-readiness-guard.cjs");

test("passes a smoke readiness runbook that contains the required safety contract", () => {
  const repoRoot = createFixtureRepo();
  const result = buildProductionSmokeReadinessGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_PASSED);
  assert.equal(result.metadataOnly, true);
  assert.equal(result.envSecretsRead, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.databaseCallsMade, false);
  assert.equal(result.hostedMutationsMade, false);
  assert.equal(result.hostedMigrationsRun, false);
  assert.equal(result.cleanupExecuteRun, false);
  assert.equal(result.smokeExecuted, false);
  assert.equal(result.blockers.length, 0);
});

test("blocks when the smoke readiness runbook is missing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-smoke-readiness-missing-"));
  const result = buildProductionSmokeReadinessGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_RUNBOOK_MISSING/);
});

test("blocks when required sections and safety boundaries are absent", () => {
  const repoRoot = createFixtureRepo({
    runbookText: [
      "# Production Smoke Readiness Runbook",
      "",
      "## Smoke Scope",
      "",
      "This incomplete runbook is intentionally missing the required smoke safety contract.",
    ].join("\n"),
  });
  const result = buildProductionSmokeReadinessGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_RUNBOOK_SECTIONS/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_FORBIDDEN_BOUNDARIES/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_SAFE_METADATA/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_SMOKE_COVERAGE/);
});

test("blocks runbook paths outside the repository before reading them", () => {
  const repoRoot = createFixtureRepo();
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-smoke-readiness-outside-"));
  const outsidePath = path.join(outsideDir, "secret-like-smoke-runbook.md");
  fs.writeFileSync(outsidePath, validRunbookText());

  const result = buildProductionSmokeReadinessGuard({
    cwd: repoRoot,
    runbook: path.relative(repoRoot, outsidePath),
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.equal(result.runbookRead, false);
  assert.match(result.blockers.join("\n"), /BLOCKED_RUNBOOK_PATH_OUTSIDE_REPO/);
});

test("json CLI output is parseable and reports non-mutating behavior", () => {
  const repoRoot = createFixtureRepo();
  const scriptPath = path.join(__dirname, "production-smoke-readiness-guard.cjs");
  const result = spawnSync(process.execPath, [scriptPath, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, STATUS_PASSED);
  assert.equal(parsed.metadataOnly, true);
  assert.equal(parsed.envSecretsRead, false);
  assert.equal(parsed.providerConsoleOpened, false);
  assert.equal(parsed.networkCallsMade, false);
  assert.equal(parsed.databaseCallsMade, false);
  assert.equal(parsed.hostedMutationsMade, false);
  assert.equal(parsed.hostedMigrationsRun, false);
  assert.equal(parsed.cleanupExecuteRun, false);
  assert.equal(parsed.smokeExecuted, false);
});

test("script source stays static and does not import execution or network APIs", () => {
  const source = fs.readFileSync(path.join(__dirname, "production-smoke-readiness-guard.cjs"), "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https\.request|http\.request|net\.connect|createConnection/);
  assert.doesNotMatch(source, /PrismaClient|nodemailer|sendMail/);
  assert.doesNotMatch(source, /execSync|spawnSync|child_process/);
});

function createFixtureRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-smoke-readiness-"));
  write(
    repoRoot,
    "docs/production/PRODUCTION_SMOKE_READINESS_RUNBOOK.md",
    options.runbookText || validRunbookText(),
  );
  return repoRoot;
}

function validRunbookText() {
  return [
    "# Production Smoke Readiness Runbook",
    "",
    "This runbook is planning and readiness guidance only. Do not run browser smoke, hosted smoke, hosted mutations, hosted migrations, or cleanup execute from a local worktree without owner approval.",
    "LedgerByte remains controlled beta/user-testing until launch gates are approved.",
    "All evidence must be metadata-only and redacted.",
    "Manual browser smoke must use synthetic tenants only.",
    "Abort if production URLs, real customer data, secret values, cookies, JWTs, or database URLs would be exposed.",
    "",
    "## Smoke Scope",
    "The smoke scope covers browser smoke, deployed API smoke, organization switching, dashboard totals, global search, settings, exports, downloads, refresh invalid org context, direct URL navigation, health endpoint, readiness endpoint, cookie auth, and CSRF boundaries.",
    "## Target Approval Gate",
    "Record target URL class, environment name, decision owner, credential owner, data reset policy, approved command, start time, and target approval status before any run.",
    "## Environment And Credential Boundaries",
    "Approved targets must be non-production unless a separate production approval exists. Evidence must not include secret values, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, provider payloads, or screenshots containing credentials.",
    "## Synthetic Tenant Data",
    "Use synthetic organization IDs, synthetic user IDs, synthetic customers, synthetic invoices, synthetic bills, synthetic payments, synthetic documents, and synthetic settings only.",
    "## Browser And API Smoke Matrix",
    "Check health endpoint status, readiness endpoint status, cookie auth status, CSRF status, login status, logout status, refresh status, dashboard aggregate status, search scope status, and settings scope status.",
    "## Tenant Isolation Smoke Matrix",
    "Check organization switching, dashboard totals, global search, settings scope, exports scope, downloads scope, refresh invalid org context, and direct URL navigation.",
    "## Export And Download Smoke Matrix",
    "Check export/download status, report export status, PDF download status, attachment download status, and generated document download status without printing file bodies or object bodies.",
    "## Artifact Redaction",
    "Safe evidence includes commit SHA, deployment ID, target URL class, environment name, synthetic organization IDs, synthetic user IDs, start time, end time, health endpoint status, readiness endpoint status, dashboard aggregate status, search scope status, settings scope status, export/download status, direct URL probe status, artifact redaction status, and cleanup status.",
    "## Abort Conditions",
    "Abort on missing target approval, production URLs without explicit approval, real customer data, secret values, raw logs, cookies, JWTs, database URLs, provider console mutations, hosted migrations, hosted mutations, seed/reset/delete, security:cleanup -- --execute, email sends, ZATCA network calls, object bodies, or unknown tenant data integrity.",
    "## Forbidden Actions",
    "Forbidden actions include production URLs without explicit approval, hosted migrations, hosted mutations, seed/reset/delete, security:cleanup -- --execute, real customer data, provider console mutations, secret values, raw logs, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, object bodies, email sends, and ZATCA network calls.",
    "## Evidence Template",
    "Record commit SHA, deployment ID, target URL class, environment name, synthetic organization IDs, synthetic user IDs, start time, end time, decision owner, credential owner, data reset policy, health endpoint status, readiness endpoint status, dashboard aggregate status, search scope status, settings scope status, export/download status, direct URL probe status, artifact redaction status, and cleanup status.",
    "## Remaining Gaps",
    "This runbook does not complete a hosted smoke run, production smoke run, monitoring setup, hosted backup/PITR proof, restore proof, or final launch approval.",
    "## Next Recommended Prompt",
    "Codex, review the production smoke readiness guard PR for owner-review readiness only.",
  ].join("\n\n");
}

function write(repoRoot, relativePath, contents) {
  const targetPath = path.join(repoRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
}
