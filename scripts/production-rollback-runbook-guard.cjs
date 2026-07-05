#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const RUNBOOK_PATH = "docs/production/PRODUCTION_ROLLBACK_RUNBOOK.md";
const STATUS_PASSED = "PRODUCTION_ROLLBACK_RUNBOOK_GUARD_PASSED";
const STATUS_BLOCKED = "PRODUCTION_ROLLBACK_RUNBOOK_GUARD_BLOCKED";

const REQUIRED_SECTIONS = [
  "Rollback Scope",
  "Owner Roles",
  "Pre-Rollback Decision Gate",
  "Application Deploy Rollback",
  "Database Migration Decision Tree",
  "Environment Variable Rollback",
  "Queue And Worker Rollback",
  "Customer Communication",
  "Post-Rollback Verification",
  "Abort Conditions",
  "Forbidden Actions",
  "Evidence And Redaction",
  "Remaining Gaps",
  "Next Recommended Prompt",
];

const REQUIRED_FORBIDDEN_BOUNDARIES = [
  "rollback execution from local worktrees",
  "hosted migrations",
  "database restore",
  "production data deletion",
  "security:cleanup -- --execute",
  "provider console mutations",
  "DNS changes",
  "secret values",
  "customer data",
  "raw logs",
  "queue purge",
  "destructive reset",
];

const REQUIRED_SAFE_METADATA = [
  "commit SHA",
  "deployment ID",
  "environment name",
  "start time",
  "end time",
  "decision owner",
  "health endpoint status",
  "readiness endpoint status",
  "error-rate status",
  "database migration status",
  "customer communication status",
];

const REQUIRED_SAFETY_PHRASES = [
  "This runbook is planning and execution guidance only",
  "Do not run this runbook from a local worktree against hosted production without owner approval",
  "LedgerByte remains controlled beta/user-testing until launch gates are approved",
  "All evidence must be metadata-only",
  "Hosted migrations must go through the approved deployment process",
  "Rollback must stop if tenant data integrity is uncertain",
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
    "  node scripts/production-rollback-runbook-guard.cjs --json",
    "  node scripts/production-rollback-runbook-guard.cjs --runbook <path> --json",
    "",
    "This guard validates committed rollback runbook text only.",
    "It does not read env secrets, call provider APIs, open provider consoles, connect to databases, run hosted migrations, run cleanup execute, deploy, change DNS, purge queues, restore databases, delete data, or execute rollback steps.",
  ].join("\n");
}

function buildProductionRollbackRunbookGuard(options = {}) {
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
    dnsChanged: false,
    queuePurged: false,
    databaseRestored: false,
    dataDeleted: false,
    rollbackExecuted: false,
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
    blockers,
    warnings,
    remainingGaps: [
      "Owner approval is still required before any hosted rollback execution.",
      "Final production hosting and monitoring provider choices remain separate gates.",
      "Hosted backup/PITR and restore proof remain separate gates.",
      "Manual browser smoke and staging smoke still require approved targets and credentials.",
    ],
    recommendedNextPrompt: "Codex, review the production rollback runbook guard PR for owner-review readiness only.",
  };
}

function formatText(result) {
  return [
    `Production rollback runbook guard: ${result.status}`,
    `Runbook: ${result.runbookPath}`,
    `Metadata only: ${result.metadataOnly}`,
    `Network calls made: ${result.networkCallsMade}`,
    `Database calls made: ${result.databaseCallsMade}`,
    `Hosted mutations made: ${result.hostedMutationsMade}`,
    `Rollback executed: ${result.rollbackExecuted}`,
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

  const result = buildProductionRollbackRunbookGuard({
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
  parseArgs,
  usage,
  buildProductionRollbackRunbookGuard,
  formatText,
  resolveRunbookFilePath,
};
