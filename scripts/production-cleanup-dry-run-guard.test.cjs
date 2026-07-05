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
  buildProductionCleanupDryRunGuard,
} = require("./production-cleanup-dry-run-guard.cjs");

test("passes a cleanup dry-run runbook that contains the required safety contract", () => {
  const repoRoot = createFixtureRepo();
  const result = buildProductionCleanupDryRunGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_PASSED);
  assert.equal(result.metadataOnly, true);
  assert.equal(result.envSecretsRead, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.databaseCallsMade, false);
  assert.equal(result.hostedMutationsMade, false);
  assert.equal(result.hostedMigrationsRun, false);
  assert.equal(result.cleanupDryRunExecuted, false);
  assert.equal(result.cleanupExecuteRun, false);
  assert.equal(result.blockers.length, 0);
});

test("blocks when the cleanup dry-run runbook is missing", () => {
  const repoRoot = createFixtureRepo({ omitRunbook: true });
  const result = buildProductionCleanupDryRunGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_RUNBOOK_MISSING/);
});

test("blocks when required sections and dry-run safety boundaries are absent", () => {
  const repoRoot = createFixtureRepo({
    runbookText: [
      "# Production Security Cleanup Dry-Run Runbook",
      "",
      "## Cleanup Scope",
      "",
      "This incomplete runbook is intentionally missing the required cleanup safety contract.",
    ].join("\n"),
  });
  const result = buildProductionCleanupDryRunGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_RUNBOOK_SECTIONS/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_FORBIDDEN_BOUNDARIES/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_SAFE_METADATA/);
  assert.match(result.blockers.join("\n"), /BLOCKED_MISSING_CLEANUP_COVERAGE/);
});

test("blocks when package cleanup scripts are missing or drift from the expected commands", () => {
  const repoRoot = createFixtureRepo({
    packageJson: {
      name: "fixture-ledgerbyte",
      private: true,
      scripts: {
        "security:cleanup": "node unsafe-cleanup.js",
        "security:cleanup:dry-run": "node unsafe-cleanup.js --dry-run",
      },
    },
  });
  const result = buildProductionCleanupDryRunGuard({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_PACKAGE_SCRIPT_INVALID/);
});

test("blocks runbook paths outside the repository before reading them", () => {
  const repoRoot = createFixtureRepo();
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-cleanup-dry-run-outside-"));
  const outsidePath = path.join(outsideDir, "secret-like-cleanup-runbook.md");
  fs.writeFileSync(outsidePath, validRunbookText());

  const result = buildProductionCleanupDryRunGuard({
    cwd: repoRoot,
    runbook: path.relative(repoRoot, outsidePath),
  });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.equal(result.runbookRead, false);
  assert.match(result.blockers.join("\n"), /BLOCKED_RUNBOOK_PATH_OUTSIDE_REPO/);
});

test("json CLI output is parseable and reports non-mutating behavior", () => {
  const repoRoot = createFixtureRepo();
  const scriptPath = path.join(__dirname, "production-cleanup-dry-run-guard.cjs");
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
  assert.equal(parsed.cleanupDryRunExecuted, false);
  assert.equal(parsed.cleanupExecuteRun, false);
});

test("script source stays static and does not import cleanup execution or network APIs", () => {
  const source = fs.readFileSync(path.join(__dirname, "production-cleanup-dry-run-guard.cjs"), "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https\.request|http\.request|net\.connect|createConnection/);
  assert.doesNotMatch(source, /PrismaClient|NestFactory|SecurityMaintenanceService/);
  assert.doesNotMatch(source, /execSync|spawnSync|child_process/);
});

function createFixtureRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-cleanup-dry-run-"));
  const packageJson =
    options.packageJson ||
    {
      name: "fixture-ledgerbyte",
      private: true,
      scripts: {
        "security:cleanup": "corepack pnpm --filter @ledgerbyte/api security:cleanup",
        "security:cleanup:dry-run": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run",
        "security:cleanup:execute": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute",
      },
    };
  write(repoRoot, "package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  if (!options.omitRunbook) {
    write(
      repoRoot,
      "docs/production/PRODUCTION_SECURITY_CLEANUP_DRY_RUN_RUNBOOK.md",
      options.runbookText || validRunbookText(),
    );
  }
  return repoRoot;
}

function validRunbookText() {
  return [
    "# Production Security Cleanup Dry-Run Runbook",
    "",
    "This runbook is planning and dry-run guidance only. Do not run security:cleanup -- --execute, security:cleanup:execute, hosted mutations, hosted migrations, seed/reset/delete, or provider console mutations from a local worktree.",
    "LedgerByte remains controlled beta/user-testing until launch gates are approved.",
    "All evidence must be aggregate metadata only.",
    "Production cleanup dry-run requires owner approval, target approval, and redacted count-only evidence.",
    "Abort if secret values, raw logs, cookies, JWTs, database URLs, raw emails, raw IPs, jti values, or row identifiers would be exposed.",
    "",
    "## Cleanup Scope",
    "The cleanup scope covers security:cleanup dry-run planning for AuthSession expired eligible counts, AuthSession revoked eligible counts, LoginRateLimit eligible counts, retention settings, batch size, and deleted counts that must remain zero in dry-run mode.",
    "## Target Approval Gate",
    "Record target URL class, environment name, decision owner, security owner, database owner, operator, start time, target approval status, and run mode before dry-run.",
    "## Dry-Run Command Contract",
    "The only allowed command in this runbook is corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run or corepack pnpm security:cleanup:dry-run from the approved operations environment.",
    "## Environment And Credential Boundaries",
    "The command must not print secret values, raw logs, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, raw emails, raw IPs, jti values, row identifiers, or provider payloads.",
    "## Aggregate Count Evidence",
    "Safe evidence includes commit SHA, deployment ID, target URL class, environment name, start time, end time, decision owner, security owner, database owner, operator, run mode, dry-run status, AuthSession eligible count, AuthSession eligibleByReason count, LoginRateLimit eligible count, deleted count, retention settings status, batch size, artifact redaction status, and follow-up decision.",
    "## Review Thresholds And Abort Conditions",
    "Abort on missing owner approval, wrong target, production URLs without explicit approval, unexpected eligible counts, non-zero deleted count in dry-run, secret values, raw logs, database URLs, hosted mutations, hosted migrations, seed/reset/delete, security:cleanup -- --execute, security:cleanup:execute, direct SQL, production data deletion, database restore, provider console mutations, email sends, ZATCA network calls, or unknown tenant data integrity.",
    "## Execute Mode Boundary",
    "Execute mode is out of scope. Any future security:cleanup -- --execute or security:cleanup:execute run requires a separate approved execution lane, reviewed dry-run counts from the same target, backup/PITR posture, rollback owner, and incident/support handoff.",
    "## Forbidden Actions",
    "Forbidden actions include security:cleanup -- --execute, security:cleanup:execute, hosted mutations, hosted migrations, seed/reset/delete, production data deletion, database restore, direct SQL, provider console mutations, secret values, raw logs, cookies, JWTs, access tokens, refresh tokens, database URLs, private keys, raw emails, raw IPs, jti values, row identifiers, email sends, and ZATCA network calls.",
    "## Evidence And Redaction",
    "Evidence must be aggregate metadata only and must not include connection strings, tokens, cookies, passwords, secret values, raw emails, raw IPs, jti values, row identifiers, database rows, request bodies, response bodies, raw logs, screenshots containing secrets, or provider payloads.",
    "## Operational Handoff",
    "Record whether the dry-run is approved for review only, requires investigation, or should open a future execute-mode approval lane. Do not schedule execute mode from this runbook.",
    "## Remaining Gaps",
    "This runbook does not complete cleanup execute approval, cleanup scheduling, hosted backup/PITR proof, restore proof, monitoring setup, incident response rehearsal, or final launch approval.",
    "## Next Recommended Prompt",
    "Codex, review the production security cleanup dry-run guard PR for owner-review readiness only.",
  ].join("\n\n");
}

function write(repoRoot, relativePath, contents) {
  const targetPath = path.join(repoRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
}
