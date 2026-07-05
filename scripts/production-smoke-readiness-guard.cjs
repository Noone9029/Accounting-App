#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const RUNBOOK_PATH = "docs/production/PRODUCTION_SMOKE_READINESS_RUNBOOK.md";
const STATUS_PASSED = "PRODUCTION_SMOKE_READINESS_GUARD_PASSED";
const STATUS_BLOCKED = "PRODUCTION_SMOKE_READINESS_GUARD_BLOCKED";

const REQUIRED_SECTIONS = [
  "Smoke Scope",
  "Target Approval Gate",
  "Environment And Credential Boundaries",
  "Synthetic Tenant Data",
  "Browser And API Smoke Matrix",
  "Tenant Isolation Smoke Matrix",
  "Export And Download Smoke Matrix",
  "Artifact Redaction",
  "Abort Conditions",
  "Forbidden Actions",
  "Evidence Template",
  "Remaining Gaps",
  "Next Recommended Prompt",
];

const REQUIRED_FORBIDDEN_BOUNDARIES = [
  "production URLs without explicit approval",
  "hosted migrations",
  "hosted mutations",
  "seed/reset/delete",
  "security:cleanup -- --execute",
  "real customer data",
  "provider console mutations",
  "secret values",
  "raw logs",
  "cookies",
  "JWTs",
  "access tokens",
  "refresh tokens",
  "database URLs",
  "private keys",
  "object bodies",
  "email sends",
  "ZATCA network calls",
];

const REQUIRED_SAFE_METADATA = [
  "commit SHA",
  "deployment ID",
  "target URL class",
  "environment name",
  "synthetic organization IDs",
  "synthetic user IDs",
  "start time",
  "end time",
  "decision owner",
  "credential owner",
  "data reset policy",
  "health endpoint status",
  "readiness endpoint status",
  "dashboard aggregate status",
  "search scope status",
  "settings scope status",
  "export/download status",
  "direct URL probe status",
  "artifact redaction status",
  "cleanup status",
];

const REQUIRED_SAFETY_PHRASES = [
  "This runbook is planning and readiness guidance only",
  "Do not run browser smoke, hosted smoke, hosted mutations, hosted migrations, or cleanup execute from a local worktree without owner approval",
  "LedgerByte remains controlled beta/user-testing until launch gates are approved",
  "All evidence must be metadata-only and redacted",
  "Manual browser smoke must use synthetic tenants only",
  "Abort if production URLs, real customer data, secret values, cookies, JWTs, or database URLs would be exposed",
];

const REQUIRED_SMOKE_COVERAGE = [
  "browser smoke",
  "deployed API smoke",
  "organization switching",
  "dashboard totals",
  "global search",
  "settings",
  "exports",
  "downloads",
  "refresh invalid org context",
  "direct URL navigation",
  "health endpoint",
  "readiness endpoint",
  "cookie auth",
  "CSRF",
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
    "  node scripts/production-smoke-readiness-guard.cjs --json",
    "  node scripts/production-smoke-readiness-guard.cjs --runbook <path> --json",
    "",
    "This guard validates committed smoke readiness runbook text only.",
    "It does not read env secrets, call provider APIs, open provider consoles, connect to databases, run hosted migrations, run cleanup execute, execute smoke tests, seed, reset, delete data, export files, download files, send email, or call ZATCA endpoints.",
  ].join("\n");
}

function buildProductionSmokeReadinessGuard(options = {}) {
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
  const missingSmokeCoverage = missingItems(text, REQUIRED_SMOKE_COVERAGE);

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
  if (missingSmokeCoverage.length > 0) {
    blockers.push(`BLOCKED_MISSING_SMOKE_COVERAGE: ${missingSmokeCoverage.join(", ")}`);
  }

  const status = blockers.length > 0 ? STATUS_BLOCKED : STATUS_PASSED;

  return {
    status,
    runbookPath,
    metadataOnly: true,
    runbookRead: text.length > 0,
    envSecretsRead: false,
    providerConsoleOpened: false,
    networkCallsMade: false,
    databaseCallsMade: false,
    hostedMutationsMade: false,
    hostedMigrationsRun: false,
    cleanupExecuteRun: false,
    smokeExecuted: false,
    seedResetDeleteRun: false,
    exportsDownloaded: false,
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
    smokeCoverage: {
      required: REQUIRED_SMOKE_COVERAGE,
      missing: missingSmokeCoverage,
    },
    blockers,
    warnings,
    remainingGaps: [
      "Owner approval is still required before any deployed browser smoke or hosted smoke run.",
      "Approved non-production target URL, credentials, and synthetic tenant data must exist before execution.",
      "Production smoke remains blocked until a separate production approval gate exists.",
      "This guard does not prove monitoring, hosted backup/PITR, hosted restore, support, or final launch readiness.",
    ],
    recommendedNextPrompt: "Codex, review the production smoke readiness guard PR for owner-review readiness only.",
  };
}

function formatText(result) {
  return [
    `Production smoke readiness guard: ${result.status}`,
    `Runbook: ${result.runbookPath}`,
    `Metadata only: ${result.metadataOnly}`,
    `Network calls made: ${result.networkCallsMade}`,
    `Database calls made: ${result.databaseCallsMade}`,
    `Hosted mutations made: ${result.hostedMutationsMade}`,
    `Smoke executed: ${result.smokeExecuted}`,
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

  const result = buildProductionSmokeReadinessGuard({
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
  REQUIRED_FORBIDDEN_BOUNDARIES,
  REQUIRED_SAFE_METADATA,
  REQUIRED_SECTIONS,
  REQUIRED_SAFETY_PHRASES,
  REQUIRED_SMOKE_COVERAGE,
  parseArgs,
  usage,
  buildProductionSmokeReadinessGuard,
  formatText,
  resolveRunbookFilePath,
};
