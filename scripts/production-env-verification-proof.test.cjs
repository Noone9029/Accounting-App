"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  REQUIRED_PACKAGE_SCRIPTS,
  REQUIRED_SURFACES,
  STATUS_BLOCKED,
  STATUS_PASSED,
  buildProductionEnvVerificationProof,
  formatText,
} = require("./production-env-verification-proof.cjs");

test("passes when required local proof surfaces and package scripts are present", () => {
  const repoRoot = createFixtureRepo();
  const result = buildProductionEnvVerificationProof({ cwd: repoRoot });

  assert.equal(result.status, STATUS_PASSED);
  assert.equal(result.metadataOnly, true);
  assert.equal(result.localStaticOnly, true);
  assert.equal(result.envSecretsRead, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.databaseConnectionsMade, false);
  assert.equal(result.hostedMutationsMade, false);
  assert.equal(result.hostedMigrationsRun, false);
  assert.equal(result.cleanupDryRunExecuted, false);
  assert.equal(result.cleanupExecuteRun, false);
  assert.equal(result.smokeExecuted, false);
  assert.equal(result.providerCallsMade, false);
  assert.equal(result.blockers.length, 0);
});

test("blocks when required proof surfaces are missing", () => {
  const repoRoot = createFixtureRepo({ omitSurfaceId: "production-smoke-readiness-runbook" });
  const result = buildProductionEnvVerificationProof({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_SURFACE_INVALID: production-smoke-readiness-runbook/);
});

test("blocks when required proof surface boundary text is missing", () => {
  const repoRoot = createFixtureRepo({
    overrideSurfaceText: {
      "docs/production/PRODUCTION_SECURITY_CLEANUP_DRY_RUN_RUNBOOK.md": "# Cleanup\n\nThis is incomplete.\n",
    },
  });
  const result = buildProductionEnvVerificationProof({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /production-cleanup-dry-run-runbook/);
  const cleanupCheck = result.proofSurfaces.checks.find((check) => check.id === "production-cleanup-dry-run-runbook");
  assert.ok(cleanupCheck.missingText.includes("This runbook does not approve cleanup execution."));
});

test("blocks when package scripts drift from expected local proof commands", () => {
  const repoRoot = createFixtureRepo({
    packageScripts: {
      ...REQUIRED_PACKAGE_SCRIPTS,
      "production:env-preflight": "node unsafe.js",
    },
  });
  const result = buildProductionEnvVerificationProof({ cwd: repoRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.blockers.join("\n"), /BLOCKED_PACKAGE_SCRIPT_INVALID: production:env-preflight/);
});

test("json CLI output is parseable and does not claim hosted operations", () => {
  const repoRoot = createFixtureRepo();
  const scriptPath = path.join(__dirname, "production-env-verification-proof.cjs");
  const result = spawnSync(process.execPath, [scriptPath, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, STATUS_PASSED);
  assert.equal(parsed.networkCallsMade, false);
  assert.equal(parsed.databaseConnectionsMade, false);
  assert.equal(parsed.hostedMutationsMade, false);
  assert.equal(parsed.hostedMigrationsRun, false);
  assert.equal(parsed.cleanupExecuteRun, false);
  assert.equal(parsed.providerCallsMade, false);
  assert.equal(parsed.storageProviderTouched, false);
});

test("formatted output excludes secret values and customer data", () => {
  const result = buildProductionEnvVerificationProof({ cwd: createFixtureRepo() });
  const serialized = `${JSON.stringify(result)}\n${formatText(result)}`;

  assert.doesNotMatch(serialized, /postgres:\/\/|postgresql:\/\/|DATABASE_URL=.*|JWT_SECRET=.*|TOKEN=.*|PRIVATE KEY/i);
  assert.doesNotMatch(serialized, /real customer|customer@example\.com|invoice body/i);
});

test("script source stays static and does not import execution, network, database, or provider APIs", () => {
  const source = fs.readFileSync(path.join(__dirname, "production-env-verification-proof.cjs"), "utf8");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /https\.request|http\.request|net\.connect|createConnection/);
  assert.doesNotMatch(source, /PrismaClient|NestFactory|nodemailer|sendMail/);
  assert.doesNotMatch(source, /execSync|spawnSync|child_process/);
});

function createFixtureRepo(options = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-prod-env-verification-"));
  write(
    repoRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: "fixture-ledgerbyte",
        private: true,
        scripts: options.packageScripts || REQUIRED_PACKAGE_SCRIPTS,
      },
      null,
      2,
    )}\n`,
  );

  for (const surface of REQUIRED_SURFACES) {
    if (surface.id === options.omitSurfaceId) {
      continue;
    }
    const text = options.overrideSurfaceText?.[surface.path] || buildSurfaceText(surface);
    write(repoRoot, surface.path, text);
  }

  return repoRoot;
}

function buildSurfaceText(surface) {
  return [`# ${surface.id}`, "", ...surface.requiredText].join("\n");
}

function write(repoRoot, relativePath, contents) {
  const targetPath = path.join(repoRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
}
