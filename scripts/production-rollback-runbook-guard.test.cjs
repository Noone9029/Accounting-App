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
  buildProductionRollbackRunbookGuard,
} = require("./production-rollback-runbook-guard.cjs");

test("passes a rollback runbook that contains the required safety contract", () => {
  const repoRoot = createFixtureRepo();
  const result = buildProductionRollbackRunbookGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_PASSED);
  assert.equal(result.metadataOnly, true);
  assert.equal(result.envSecretsRead, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.databaseCallsMade, false);
  assert.equal(result.hostedMutationsMade, false);
  assert.equal(result.rollbackExecuted, false);
  assert.equal(result.blockers.length, 0);
});

test("blocks when the rollback runbook is missing", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-rollback-runbook-missing-"));
  const result = buildProductionRollbackRunbookGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_RUNBOOK_MISSING/);
});

test("blocks when required sections and boundaries are absent", () => {
  const repoRoot = createFixtureRepo({
    runbookText: [
      "# Production Rollback Runbook",
      "",
      "## Rollback Scope",
      "",
      "This incomplete runbook is intentionally missing the required safety contract.",
    ].join("\n"),
  });
  const result = buildProductionRollbackRunbookGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_RUNBOOK_SECTIONS/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_FORBIDDEN_BOUNDARIES/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_SAFE_METADATA/);
});

test("blocks runbook paths outside the repository before reading them", () => {
  const repoRoot = createFixtureRepo();
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-rollback-outside-"));
  const outsidePath = path.join(outsideDir, "secret-like-runbook.md");
  fs.writeFileSync(outsidePath, validRunbookText());

  const result = buildProductionRollbackRunbookGuard({
    cwd: repoRoot,
    runbook: path.relative(repoRoot, outsidePath),
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.equal(result.runbookRead, false);
  assert.match(result.blockers.join("\n"), /BLOCKED_RUNBOOK_PATH_OUTSIDE_REPO/);
});

test("json CLI output is parseable and reports non-mutating behavior", () => {
  const repoRoot = createFixtureRepo();
  const scriptPath = path.join(__dirname, "production-rollback-runbook-guard.cjs");
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
  assert.equal(parsed.rollbackExecuted, false);
});

function createFixtureRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-rollback-runbook-"));
  write(
    repoRoot,
    "docs/production/PRODUCTION_ROLLBACK_RUNBOOK.md",
    options.runbookText || validRunbookText(),
  );
  return repoRoot;
}

function validRunbookText() {
  return [
    "# Production Rollback Runbook",
    "",
    "This runbook is planning and execution guidance only. Do not run this runbook from a local worktree against hosted production without owner approval.",
    "LedgerByte remains controlled beta/user-testing until launch gates are approved.",
    "All evidence must be metadata-only.",
    "Hosted migrations must go through the approved deployment process.",
    "Rollback must stop if tenant data integrity is uncertain.",
    "",
    "## Rollback Scope",
    "Rollback scope covers application deploys, hosted migrations, environment variable rollback, queue and worker rollback, support communication, and post-rollback verification.",
    "## Owner Roles",
    "Decision owner, deploy owner, database owner, support owner, and security owner must be named before execution.",
    "## Pre-Rollback Decision Gate",
    "Record commit SHA, deployment ID, environment name, start time, decision owner, health endpoint status, readiness endpoint status, error-rate status, database migration status, and customer communication status.",
    "## Application Deploy Rollback",
    "Redeploy the last approved artifact only after owner approval and metadata capture.",
    "## Database Migration Decision Tree",
    "Hosted migrations and database restore require the approved deployment process, never an ad hoc local command.",
    "## Environment Variable Rollback",
    "Environment variable rollback must avoid secret values in chat, docs, logs, and screenshots.",
    "## Queue And Worker Rollback",
    "Queue pause, worker drain, and queue purge decisions require owner approval and metadata-only evidence.",
    "## Customer Communication",
    "Customer communication status and support message owner must be recorded without customer data.",
    "## Post-Rollback Verification",
    "Record end time, health endpoint status, readiness endpoint status, error-rate status, and deployment ID.",
    "## Abort Conditions",
    "Abort on uncertain tenant data integrity, missing owner approval, unknown migration status, or missing rollback artifact.",
    "## Forbidden Actions",
    "Forbidden actions include rollback execution from local worktrees, hosted migrations, database restore, production data deletion, security:cleanup -- --execute, provider console mutations, DNS changes, secret values, customer data, raw logs, queue purge, and destructive reset.",
    "## Evidence And Redaction",
    "Safe evidence includes commit SHA, deployment ID, environment name, start time, end time, decision owner, health endpoint status, readiness endpoint status, error-rate status, database migration status, and customer communication status.",
    "## Remaining Gaps",
    "Final production hosting, monitoring alerts, hosted backup/restore proof, and manual browser smoke remain separate gates.",
    "## Next Recommended Prompt",
    "Codex, review the production rollback runbook guard PR for owner-review readiness only.",
  ].join("\n\n");
}

function write(repoRoot, relativePath, contents) {
  const targetPath = path.join(repoRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
}
