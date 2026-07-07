#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATUS_PASSED = "PRODUCTION_ENV_VERIFICATION_PROOF_PASSED";
const STATUS_BLOCKED = "PRODUCTION_ENV_VERIFICATION_PROOF_BLOCKED";

const REQUIRED_PACKAGE_SCRIPTS = {
  "production:env-preflight": "node scripts/production-env-preflight.cjs",
  "test:production-env-preflight": "node --test scripts/production-env-preflight.test.cjs",
  "production:env-verification-proof": "node scripts/production-env-verification-proof.cjs",
  "test:production-env-verification-proof": "node --test scripts/production-env-verification-proof.test.cjs",
  "production:smoke-readiness-guard": "node scripts/production-smoke-readiness-guard.cjs",
  "test:production-smoke-readiness-guard": "node --test scripts/production-smoke-readiness-guard.test.cjs",
  "production:rollback-runbook-guard": "node scripts/production-rollback-runbook-guard.cjs",
  "test:production-rollback-runbook-guard": "node --test scripts/production-rollback-runbook-guard.test.cjs",
  "production:cleanup-dry-run-guard": "node scripts/production-cleanup-dry-run-guard.cjs",
  "test:production-cleanup-dry-run-guard": "node --test scripts/production-cleanup-dry-run-guard.test.cjs",
  "backup:restore-proof": "node scripts/backup-restore-proof-harness.cjs",
  "test:backup-restore-proof": "node --test scripts/backup-restore-proof-harness.test.cjs",
  "monitoring:support-readiness": "node scripts/monitoring-support-readiness.cjs",
  "test:monitoring-support-readiness": "node --test scripts/monitoring-support-readiness.test.cjs",
};

const REQUIRED_SURFACES = [
  {
    id: "production-env-preflight-script",
    path: "scripts/production-env-preflight.cjs",
    requiredText: ["PRODUCTION_ENV_PREFLIGHT_PASSED", "noNetwork: true", "noDatabaseConnection: true", "noHostedMigration: true", "noCleanupExecute: true"],
  },
  {
    id: "production-env-preflight-doc",
    path: "docs/production/PRODUCTION_ENV_PREFLIGHT.md",
    requiredText: ["No network calls.", "No hosted mutations.", "No hosted migrations.", "No `security:cleanup -- --execute`."],
  },
  {
    id: "production-smoke-readiness-guard",
    path: "scripts/production-smoke-readiness-guard.cjs",
    requiredText: ["PRODUCTION_SMOKE_READINESS_GUARD_PASSED", "hostedMigrationsRun: false", "cleanupExecuteRun: false", "smokeExecuted: false"],
  },
  {
    id: "production-smoke-readiness-runbook",
    path: "docs/production/PRODUCTION_SMOKE_READINESS_RUNBOOK.md",
    requiredText: ["Manual browser smoke must use synthetic tenants only.", "This runbook does not complete a hosted smoke run", "hosted migrations", "hosted mutations"],
  },
  {
    id: "production-rollback-runbook-guard",
    path: "scripts/production-rollback-runbook-guard.cjs",
    requiredText: ["PRODUCTION_ROLLBACK_RUNBOOK_GUARD_PASSED", "hostedMigrationsRun: false", "cleanupExecuteRun: false", "providerConsoleOpened: false"],
  },
  {
    id: "production-rollback-runbook",
    path: "docs/production/PRODUCTION_ROLLBACK_RUNBOOK.md",
    requiredText: ["All evidence must be metadata-only.", "Hosted migrations must go through the approved deployment process.", "database restores", "`security:cleanup -- --execute`"],
  },
  {
    id: "production-cleanup-dry-run-guard",
    path: "scripts/production-cleanup-dry-run-guard.cjs",
    requiredText: ["PRODUCTION_CLEANUP_DRY_RUN_GUARD_PASSED", "cleanupDryRunExecuted: false", "cleanupExecuteRun: false", "hostedMigrationsRun: false"],
  },
  {
    id: "production-cleanup-dry-run-runbook",
    path: "docs/production/PRODUCTION_SECURITY_CLEANUP_DRY_RUN_RUNBOOK.md",
    requiredText: ["This runbook does not approve cleanup execution.", "All evidence must be aggregate metadata only.", "security:cleanup -- --execute", "hosted migrations"],
  },
  {
    id: "backup-restore-proof-harness",
    path: "scripts/backup-restore-proof-harness.cjs",
    requiredText: ["networkAccessAttempted: false", "databaseAccessAttempted: false", "envSecretReadsAttempted: false", "No real backup command execution."],
  },
  {
    id: "backup-restore-proof-harness-doc",
    path: "docs/production/BACKUP_RESTORE_PROOF_HARNESS.md",
    requiredText: ["synthetic metadata only", "No hosted restore drill.", "No real object-storage backup or restore behavior."],
  },
  {
    id: "monitoring-support-readiness-proof",
    path: "scripts/monitoring-support-readiness.cjs",
    requiredText: ["noDatabaseConnection: true", "noNetwork: true", "noMutation: true", "noProviderCall: true", "noStorageOperation: true"],
  },
  {
    id: "monitoring-support-readiness-summary",
    path: "PR_PRODUCTION_MONITORING_PROOF_SUMMARY.md",
    requiredText: ["No production runtime code changed.", "No alert provider, log drain, or status page was configured.", "No provider/storage APIs were called."],
  },
  {
    id: "object-storage-proof-validator",
    path: "scripts/object-storage-proof-validate.cjs",
    requiredText: ["OBJECT_STORAGE_PROOF_DRY_RUN_READY", "networkEnabled: false", "mutationEnabled: false", "hostedObjectStorageTouched: false"],
  },
  {
    id: "object-storage-proof-plan",
    path: "docs/production/OBJECT_STORAGE_PROOF_PLAN.md",
    requiredText: ["OBJECT_STORAGE_PROOF_DRY_RUN_READY", "No real object-storage provider connectivity.", "No production readiness or paid SaaS readiness."],
  },
];

const REMAINING_MANUAL_GATES = [
  "Production secret-store values must be verified only through the approved deployment/secret-store process.",
  "Hosted migrations must run only through the approved deployment process.",
  "security:cleanup -- --execute remains blocked until a separate owner-approved execution lane.",
  "Hosted smoke, hosted backup/PITR, hosted restore, provider monitoring, real object-storage, and signed URL proof remain separate approval lanes.",
  "This verifier does not prove production runtime state; it checks committed local proof coverage and script wiring only.",
];

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--") {
      continue;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/production-env-verification-proof.cjs --json",
    "",
    "This verifier checks committed production readiness proof scripts, docs, and root script wiring only.",
    "It does not read env secrets, call providers, open consoles, connect to databases, run hosted migrations, run hosted mutations, run cleanup dry-run, run cleanup execute, run smoke, create backups, restore data, send email, or call ZATCA/UAE ASP endpoints.",
  ].join("\n");
}

function buildProductionEnvVerificationProof(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const packageChecks = inspectPackageScripts(repoRoot);
  const surfaceChecks = inspectRequiredSurfaces(repoRoot);
  const blockers = [];

  for (const check of packageChecks.checks) {
    if (!check.passed) {
      blockers.push(`BLOCKED_PACKAGE_SCRIPT_INVALID: ${check.id}`);
    }
  }

  for (const check of surfaceChecks.checks) {
    if (!check.passed) {
      blockers.push(`BLOCKED_SURFACE_INVALID: ${check.id}`);
    }
  }

  const status = blockers.length > 0 ? STATUS_BLOCKED : STATUS_PASSED;

  return {
    status,
    repoRoot,
    metadataOnly: true,
    localStaticOnly: true,
    packageScriptsChecked: true,
    proofSurfacesChecked: true,
    envSecretsRead: false,
    secretsPrinted: false,
    customerDataUsed: false,
    networkCallsMade: false,
    databaseConnectionsMade: false,
    hostedMutationsMade: false,
    hostedMigrationsRun: false,
    cleanupDryRunExecuted: false,
    cleanupExecuteRun: false,
    smokeExecuted: false,
    backupCreated: false,
    restoreExecuted: false,
    providerConsoleOpened: false,
    providerCallsMade: false,
    storageProviderTouched: false,
    emailSent: false,
    zatcaNetworkCallsMade: false,
    uaeAspNetworkCallsMade: false,
    packageScripts: packageChecks,
    proofSurfaces: surfaceChecks,
    blockers,
    remainingManualGates: REMAINING_MANUAL_GATES,
    recommendedNextPrompt: "Codex, review the production environment verification proof PR for owner-review readiness only. Confirm it is local/static only, checks committed proof scripts/docs/package wiring, runs no hosted operations, exposes no secrets, and leaves runtime/accounting/schema/UI behavior unchanged.",
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  const checks = [];
  let scripts = {};

  try {
    scripts = JSON.parse(fs.readFileSync(packagePath, "utf8")).scripts || {};
  } catch (error) {
    return {
      checked: false,
      checks: Object.keys(REQUIRED_PACKAGE_SCRIPTS).map((id) => ({
        id,
        passed: false,
        reason: `Unable to read package.json: ${error.message}`,
        valuePrinted: false,
      })),
    };
  }

  for (const [id, expected] of Object.entries(REQUIRED_PACKAGE_SCRIPTS)) {
    const actual = scripts[id];
    checks.push({
      id,
      passed: actual === expected,
      reason: actual === expected ? "Package script matches expected command." : "Package script is missing or differs from the expected command.",
      valuePrinted: false,
    });
  }

  return {
    checked: true,
    checks,
  };
}

function inspectRequiredSurfaces(repoRoot) {
  return {
    checked: true,
    checks: REQUIRED_SURFACES.map((surface) => inspectSurface(repoRoot, surface)),
  };
}

function inspectSurface(repoRoot, surface) {
  const fullPath = path.join(repoRoot, ...surface.path.split("/"));
  if (!isWithinDirectory(repoRoot, fullPath)) {
    return {
      id: surface.id,
      path: surface.path,
      passed: false,
      exists: false,
      missingText: surface.requiredText,
      reason: "Surface path resolves outside the repository.",
      valuePrinted: false,
    };
  }

  if (!fs.existsSync(fullPath)) {
    return {
      id: surface.id,
      path: surface.path,
      passed: false,
      exists: false,
      missingText: surface.requiredText,
      reason: "Required proof surface is missing.",
      valuePrinted: false,
    };
  }

  const text = fs.readFileSync(fullPath, "utf8");
  const missingText = surface.requiredText.filter((required) => !text.includes(required));

  return {
    id: surface.id,
    path: surface.path,
    passed: missingText.length === 0,
    exists: true,
    missingText,
    reason: missingText.length === 0 ? "Required local proof boundary text is present." : "Required local proof boundary text is missing.",
    valuePrinted: false,
  };
}

function formatText(result) {
  return [
    `Production env verification proof: ${result.status}`,
    `Metadata only: ${result.metadataOnly}`,
    `Local/static only: ${result.localStaticOnly}`,
    `No network calls: ${!result.networkCallsMade}`,
    `No database connections: ${!result.databaseConnectionsMade}`,
    `No hosted mutations: ${!result.hostedMutationsMade}`,
    `No hosted migrations: ${!result.hostedMigrationsRun}`,
    `No cleanup execute: ${!result.cleanupExecuteRun}`,
    `No secrets printed: ${!result.secretsPrinted}`,
    "",
    "Package scripts:",
    ...result.packageScripts.checks.map((check) => `- ${check.passed ? "pass" : "block"}: ${check.id} - ${check.reason}`),
    "",
    "Proof surfaces:",
    ...result.proofSurfaces.checks.map((check) => `- ${check.passed ? "pass" : "block"}: ${check.id} - ${check.reason}`),
    "",
    "Blockers:",
    ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
    "Remaining manual gates:",
    ...result.remainingManualGates.map((gate) => `- ${gate}`),
  ].join("\n");
}

function resolveRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "package.json")) || fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(start);
    }
    current = parent;
  }
}

function isWithinDirectory(parentDir, candidatePath) {
  const parent = path.resolve(parentDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function main() {
  let parsed;
  try {
    parsed = parseArgs();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (parsed.help) {
    console.log(usage());
    return;
  }

  const result = buildProductionEnvVerificationProof({ cwd: process.cwd() });
  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatText(result));
  }

  if (result.status === STATUS_BLOCKED) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  STATUS_BLOCKED,
  STATUS_PASSED,
  REQUIRED_PACKAGE_SCRIPTS,
  REQUIRED_SURFACES,
  buildProductionEnvVerificationProof,
  formatText,
  inspectPackageScripts,
  inspectRequiredSurfaces,
  parseArgs,
  usage,
};
