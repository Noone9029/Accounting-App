#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const RUNBOOK_PATH = "docs/production/PRODUCTION_SECURITY_CLEANUP_DRY_RUN_RUNBOOK.md";
const STATUS_PASSED = "PRODUCTION_CLEANUP_DRY_RUN_GUARD_PASSED";
const STATUS_BLOCKED = "PRODUCTION_CLEANUP_DRY_RUN_GUARD_BLOCKED";

const CLEANUP_SCRIPT_EXPECTATIONS = {
  "security:cleanup": "corepack pnpm --filter @ledgerbyte/api security:cleanup",
  "security:cleanup:dry-run": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --dry-run",
  "security:cleanup:execute": "corepack pnpm --filter @ledgerbyte/api security:cleanup -- --execute",
};

const REQUIRED_SECTIONS = [
  "Cleanup Scope",
  "Target Approval Gate",
  "Dry-Run Command Contract",
  "Environment And Credential Boundaries",
  "Aggregate Count Evidence",
  "Review Thresholds And Abort Conditions",
  "Execute Mode Boundary",
  "Forbidden Actions",
  "Evidence And Redaction",
  "Operational Handoff",
  "Remaining Gaps",
  "Next Recommended Prompt",
];

const REQUIRED_FORBIDDEN_BOUNDARIES = [
  "security:cleanup -- --execute",
  "security:cleanup:execute",
  "hosted mutations",
  "hosted migrations",
  "seed/reset/delete",
  "production data deletion",
  "database restore",
  "direct SQL",
  "provider console mutations",
  "secret values",
  "raw logs",
  "cookies",
  "JWTs",
  "access tokens",
  "refresh tokens",
  "database URLs",
  "private keys",
  "raw emails",
  "raw IPs",
  "jti values",
  "row identifiers",
  "email sends",
  "ZATCA network calls",
];

const REQUIRED_SAFE_METADATA = [
  "commit SHA",
  "deployment ID",
  "target URL class",
  "environment name",
  "start time",
  "end time",
  "decision owner",
  "security owner",
  "database owner",
  "operator",
  "run mode",
  "dry-run status",
  "AuthSession eligible count",
  "AuthSession eligibleByReason count",
  "LoginRateLimit eligible count",
  "deleted count",
  "retention settings status",
  "batch size",
  "artifact redaction status",
  "follow-up decision",
];

const REQUIRED_SAFETY_PHRASES = [
  "This runbook is planning and dry-run guidance only",
  "Do not run security:cleanup -- --execute, security:cleanup:execute, hosted mutations, hosted migrations, seed/reset/delete, or provider console mutations from a local worktree",
  "LedgerByte remains controlled beta/user-testing until launch gates are approved",
  "All evidence must be aggregate metadata only",
  "Production cleanup dry-run requires owner approval, target approval, and redacted count-only evidence",
  "Abort if secret values, raw logs, cookies, JWTs, database URLs, raw emails, raw IPs, jti values, or row identifiers would be exposed",
];

const REQUIRED_CLEANUP_COVERAGE = [
  "security:cleanup dry-run",
  "AuthSession expired eligible counts",
  "AuthSession revoked eligible counts",
  "LoginRateLimit eligible counts",
  "retention settings",
  "batch size",
  "deleted counts that must remain zero in dry-run mode",
  "approved operations environment",
  "future execute-mode approval lane",
];

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    json: false,
    help: false,
    runbook: RUNBOOK_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--runbook") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--runbook requires a path.");
      }
      parsed.runbook = value;
      index += 1;
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
    "  node scripts/production-cleanup-dry-run-guard.cjs --json",
    "  node scripts/production-cleanup-dry-run-guard.cjs --runbook <path> --json",
    "",
    "This guard validates committed production security-cleanup dry-run runbook text and root package script wiring only.",
    "It does not read env secrets, call provider APIs, open provider consoles, connect to databases, run hosted migrations, run cleanup dry-run, run cleanup execute, seed, reset, delete data, send email, or call ZATCA endpoints.",
  ].join("\n");
}

function buildProductionCleanupDryRunGuard(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const resolvedRunbook = resolveRunbookFilePath(repoRoot, options.runbook || RUNBOOK_PATH);
  const runbookPath = resolvedRunbook.runbookPath;
  const blockers = [];
  const warnings = [];

  let text = "";
  if (resolvedRunbook.blocker) {
    blockers.push(resolvedRunbook.blocker);
  } else if (!fs.existsSync(resolvedRunbook.fullRunbookPath)) {
    blockers.push(`BLOCKED_RUNBOOK_MISSING: ${runbookPath}`);
  } else {
    text = fs.readFileSync(resolvedRunbook.fullRunbookPath, "utf8");
  }

  const missingSections = REQUIRED_SECTIONS.filter((section) => !hasHeading(text, section));
  const missingForbiddenBoundaries = missingItems(text, REQUIRED_FORBIDDEN_BOUNDARIES);
  const missingSafeMetadata = missingItems(text, REQUIRED_SAFE_METADATA);
  const missingSafetyPhrases = missingItems(text, REQUIRED_SAFETY_PHRASES);
  const missingCleanupCoverage = missingItems(text, REQUIRED_CLEANUP_COVERAGE);
  const packageScriptChecks = inspectPackageScripts(repoRoot);

  if (missingSections.length > 0) {
    blockers.push(`BLOCKED_MISSING_RUNBOOK_SECTIONS: ${missingSections.join(", ")}`);
  }
  if (missingForbiddenBoundaries.length > 0) {
    blockers.push(`BLOCKED_MISSING_FORBIDDEN_BOUNDARIES: ${missingForbiddenBoundaries.join(", ")}`);
  }
  if (missingSafeMetadata.length > 0) {
    blockers.push(`BLOCKED_MISSING_SAFE_METADATA: ${missingSafeMetadata.join(", ")}`);
  }
  if (missingSafetyPhrases.length > 0) {
    blockers.push(`BLOCKED_MISSING_SAFETY_PHRASES: ${missingSafetyPhrases.join(", ")}`);
  }
  if (missingCleanupCoverage.length > 0) {
    blockers.push(`BLOCKED_MISSING_CLEANUP_COVERAGE: ${missingCleanupCoverage.join(", ")}`);
  }
  for (const check of packageScriptChecks.checks) {
    if (!check.passed) {
      blockers.push(`BLOCKED_PACKAGE_SCRIPT_INVALID: ${check.id}`);
    }
  }

  const status = blockers.length > 0 ? STATUS_BLOCKED : STATUS_PASSED;

  return {
    status,
    runbookPath,
    metadataOnly: true,
    runbookRead: text.length > 0,
    packageScriptsChecked: true,
    envSecretsRead: false,
    providerConsoleOpened: false,
    networkCallsMade: false,
    databaseCallsMade: false,
    hostedMutationsMade: false,
    hostedMigrationsRun: false,
    cleanupDryRunExecuted: false,
    cleanupExecuteRun: false,
    seedResetDeleteRun: false,
    emailSent: false,
    zatcaNetworkCallsMade: false,
    sections: {
      required: REQUIRED_SECTIONS,
      missing: missingSections,
    },
    forbiddenBoundaries: {
      required: REQUIRED_FORBIDDEN_BOUNDARIES,
      missing: missingForbiddenBoundaries,
    },
    safeMetadata: {
      required: REQUIRED_SAFE_METADATA,
      missing: missingSafeMetadata,
    },
    safetyPhrases: {
      required: REQUIRED_SAFETY_PHRASES,
      missing: missingSafetyPhrases,
    },
    cleanupCoverage: {
      required: REQUIRED_CLEANUP_COVERAGE,
      missing: missingCleanupCoverage,
    },
    packageScripts: packageScriptChecks,
    blockers: unique(blockers),
    warnings,
    remainingGaps: [
      "Owner approval is still required before running security cleanup dry-run against any hosted target.",
      "A passed guard does not prove provider-side environment, database target, or cleanup counts.",
      "Execute mode remains blocked until a separate approved execution lane reviews dry-run counts from the same target.",
      "Cleanup scheduling, monitoring, hosted backup/PITR, hosted restore proof, and launch approval remain separate gates.",
    ],
    recommendedNextPrompt: "Codex, review the production security cleanup dry-run guard PR for owner-review readiness only.",
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  const checks = [];

  if (!fs.existsSync(packagePath)) {
    return {
      checks: [
        {
          id: "PACKAGE_JSON_EXISTS",
          passed: false,
          expected: "package.json exists",
          actual: "missing",
        },
      ],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch {
    return {
      checks: [
        {
          id: "PACKAGE_JSON_PARSE",
          passed: false,
          expected: "valid JSON",
          actual: "parse failed",
        },
      ],
    };
  }

  const scripts = parsed.scripts && typeof parsed.scripts === "object" ? parsed.scripts : {};
  checks.push({
    id: "PACKAGE_JSON_PARSE",
    passed: true,
    expected: "valid JSON",
    actual: "valid JSON",
  });

  for (const [name, expected] of Object.entries(CLEANUP_SCRIPT_EXPECTATIONS)) {
    const actual = scripts[name];
    checks.push({
      id: `PACKAGE_SCRIPT:${name}`,
      passed: actual === expected,
      expected,
      actual: typeof actual === "string" ? actual : "missing",
      valuePrinted: false,
    });
  }

  return { checks };
}

function formatText(result) {
  return [
    `Production cleanup dry-run guard: ${result.status}`,
    `Runbook: ${result.runbookPath}`,
    `Metadata only: ${result.metadataOnly}`,
    `Network calls made: ${result.networkCallsMade}`,
    `Database calls made: ${result.databaseCallsMade}`,
    `Hosted mutations made: ${result.hostedMutationsMade}`,
    `Cleanup dry-run executed: ${result.cleanupDryRunExecuted}`,
    `Cleanup execute run: ${result.cleanupExecuteRun}`,
    "",
    "Blockers:",
    ...(result.blockers.length ? result.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "Remaining gaps:",
    ...result.remainingGaps.map((item) => `- ${item}`),
  ].join("\n");
}

function hasHeading(text, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im");
  return pattern.test(text);
}

function missingItems(text, required) {
  const lowerText = text.toLowerCase();
  return required.filter((item) => !lowerText.includes(item.toLowerCase()));
}

function normalizeRunbookPath(runbookPath) {
  return String(runbookPath || RUNBOOK_PATH).replace(/\\/g, "/").replace(/^\/+/, "");
}

function resolveRunbookFilePath(repoRoot, rawRunbookPath) {
  const rawPath = String(rawRunbookPath || RUNBOOK_PATH);
  const runbookPath = normalizeRunbookPath(rawPath);
  const fullRunbookPath = path.resolve(repoRoot, ...runbookPath.split("/").filter(Boolean));
  const resolvedRepoRoot = path.resolve(repoRoot);
  const relativeToRepo = path.relative(resolvedRepoRoot, fullRunbookPath);
  const escapesRepo = relativeToRepo.startsWith("..") || path.isAbsolute(relativeToRepo);

  if (path.isAbsolute(rawPath) || escapesRepo) {
    return {
      runbookPath,
      blocker: `BLOCKED_RUNBOOK_PATH_OUTSIDE_REPO: ${runbookPath}`,
    };
  }

  return {
    runbookPath,
    fullRunbookPath,
  };
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(values) {
  return [...new Set(values)];
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

  const result = buildProductionCleanupDryRunGuard({
    cwd: process.cwd(),
    runbook: parsed.runbook,
  });

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
  RUNBOOK_PATH,
  STATUS_BLOCKED,
  STATUS_PASSED,
  CLEANUP_SCRIPT_EXPECTATIONS,
  REQUIRED_FORBIDDEN_BOUNDARIES,
  REQUIRED_SAFE_METADATA,
  REQUIRED_SECTIONS,
  REQUIRED_SAFETY_PHRASES,
  REQUIRED_CLEANUP_COVERAGE,
  parseArgs,
  usage,
  buildProductionCleanupDryRunGuard,
  inspectPackageScripts,
  formatText,
  resolveRunbookFilePath,
};
