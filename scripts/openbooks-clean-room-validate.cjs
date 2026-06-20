#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "playwright-report",
  "playwright-reports",
  "test-results",
  ".turbo",
]);

const IGNORED_FILE_NAMES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "npm-shrinkwrap.json",
]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const ALLOWED_OPENBOOKS_PATHS = [
  /^docs\/product\//,
  /^docs\/legal\//,
  /^docs\/development\//,
  /^CODEX_HANDOFF\.md$/,
  /^package\.json$/,
  /^scripts\/openbooks-clean-room-validate\.cjs$/,
  /^scripts\/openbooks-clean-room-validate\.test\.cjs$/,
  /^docs\/IMPLEMENTATION_STATUS\.md$/,
  /^docs\/REMAINING_ROADMAP\.md$/,
  /^docs\/PROJECT_AUDIT\.md$/,
  /^docs\/PRODUCT_READINESS_SCORECARD\.md$/,
];

const MIT_REUSE_POLICY_PATHS = [
  /^docs\/legal\/OPENBOOKS_CLEAN_ROOM_POLICY\.md$/,
  /^docs\/legal\/OPENBOOK_MIT_ATTRIBUTION\.md$/,
  /^docs\/development\/openbooks-adoption\/OPENBOOK_MIT_SOURCE_INTAKE\.md$/,
  /^scripts\/openbooks-clean-room-validate\.cjs$/,
  /^scripts\/openbooks-clean-room-validate\.test\.cjs$/,
];

const PRODUCTION_SOURCE_PATHS = [
  /^apps\/api\/src\//,
  /^apps\/web\/src\//,
  /^packages\/[^/]+\/src\//,
  /^apps\/api\/prisma\/migrations\//,
  /^prisma\/migrations\//,
  /^vercel(?:\.[^/]+)?\.json$/,
  /^\.env(?:\..*)?$/,
];

const DIRECT_REUSE_PATTERNS = [
  /\b(?:copied|copying|copy|ported|porting|port|vendored|vendoring|vendor|imported|importing|import|translated|translating|translate|reused|reusing|reuse)\b.{0,80}\bOpenBooks?\b/i,
  /\bOpenBooks?\b.{0,80}\b(?:copied|copying|copy|ported|porting|port|vendored|vendoring|vendor|imported|importing|import|translated|translating|translate|reused|reusing|reuse)\b/i,
];

const PRODUCTION_READY_PATTERNS = [
  /\bOpenBooks?\b.{0,120}\b(?:production[- ]ready|production readiness|ready for production|WORKING)\b/i,
  /\b(?:production[- ]ready|production readiness|ready for production|WORKING)\b.{0,120}\bOpenBooks?\b/i,
];

const COMPLIANCE_READY_PATTERNS = [
  /\b(?:UAE|ZATCA|Peppol|object[- ]storage|signed[- ]URL|ASP)\b.{0,120}\b(?:production[- ]ready|ready for production|production readiness|compliant|certified|approved|enabled|implemented|proven)\b/i,
  /\b(?:production[- ]ready|ready for production|production readiness|compliant|certified|approved|enabled|implemented|proven)\b.{0,120}\b(?:UAE|ZATCA|Peppol|object[- ]storage|signed[- ]URL|ASP)\b/i,
];

const NEGATION_PATTERN =
  /\b(?:no|not|never|without|must not|do not|does not|did not|cannot|blocked|unproven|unimplemented|disabled|prohibited|forbidden|future|planning only|not applicable|remains false|remains blocked)\b/i;

function parseArgs(argv) {
  return {
    strict: argv.includes("--strict"),
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function usage() {
  return [
    "Usage:",
    "  node scripts/openbooks-clean-room-validate.cjs --strict",
    "  node scripts/openbooks-clean-room-validate.cjs --strict --json",
    "",
    "Scans repository text files for OpenBooks clean-room guardrails.",
  ].join("\n");
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function shouldIgnoreDir(name) {
  return IGNORED_DIRS.has(name);
}

function isTextFile(filePath) {
  const name = path.basename(filePath);
  if (IGNORED_FILE_NAMES.has(name)) {
    return false;
  }
  const ext = path.extname(name);
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }
  return name === ".gitignore" || name === ".npmrc";
}

function walkFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!shouldIgnoreDir(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }
      if (entry.isFile() && isTextFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  return files.sort();
}

function isAllowedOpenBooksPath(relativePath) {
  return ALLOWED_OPENBOOKS_PATHS.some((pattern) => pattern.test(relativePath));
}

function isMitReusePolicyPath(relativePath) {
  return MIT_REUSE_POLICY_PATHS.some((pattern) => pattern.test(relativePath));
}

function isProductionSourcePath(relativePath) {
  return PRODUCTION_SOURCE_PATHS.some((pattern) => pattern.test(relativePath));
}

function isOpenBooksCleanRoomDoc(relativePath) {
  return /^docs\/(?:product|legal|development)\/OPENBOOKS?_/.test(relativePath);
}

function hasPositiveClaim(line, patterns) {
  if (!patterns.some((pattern) => pattern.test(line))) {
    return false;
  }
  return !NEGATION_PATTERN.test(line);
}

function isAllowedTemplateWorkingLine(relativePath, line) {
  return (
    relativePath === "docs/development/OPENBOOKS_ADOPTION_EVIDENCE_TEMPLATE.md" &&
    /PLANNED \/ PARTIAL \/ BLOCKED \/ WORKING|Use `WORKING` only/.test(line)
  );
}

function validateRepo(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const files = walkFiles(repoRoot);
  const result = {
    checkedFilesCount: 0,
    allowedReferencesCount: 0,
    blockedReferencesCount: 0,
    forbiddenClaimCount: 0,
    blockedReferences: [],
    forbiddenClaims: [],
    status: "PASS",
  };

  for (const filePath of files) {
    const relativePath = normalizePath(path.relative(repoRoot, filePath));
    let text;
    try {
      text = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    result.checkedFilesCount += 1;

    const fileMentionsOpenBooks = /\bOpenBooks?\b/i.test(text);
    if (!fileMentionsOpenBooks && !/[Uu][Aa][Ee]|ZATCA|Peppol|object[- ]storage|signed[- ]URL|ASP/.test(text)) {
      continue;
    }

    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      if (/\bOpenBooks?\b/i.test(line)) {
        const allowed = isAllowedOpenBooksPath(relativePath);
        if (allowed && !isProductionSourcePath(relativePath)) {
          result.allowedReferencesCount += 1;
        } else {
          result.blockedReferencesCount += 1;
          result.blockedReferences.push({
            file: relativePath,
            line: lineNumber,
            reason: isProductionSourcePath(relativePath)
              ? "OpenBooks reference in production/runtime source location"
              : "OpenBooks reference outside allowed clean-room docs",
          });
        }
      }

      if (hasPositiveClaim(line, DIRECT_REUSE_PATTERNS) && !isMitReusePolicyPath(relativePath)) {
        result.forbiddenClaimCount += 1;
        result.forbiddenClaims.push({
          file: relativePath,
          line: lineNumber,
          reason: "Unattributed or unapproved OpenBook direct reuse/copying claim",
        });
      }

      if (!isAllowedTemplateWorkingLine(relativePath, line) && hasPositiveClaim(line, PRODUCTION_READY_PATTERNS)) {
        result.forbiddenClaimCount += 1;
        result.forbiddenClaims.push({
          file: relativePath,
          line: lineNumber,
          reason: "OpenBooks adoption feature claimed production-ready or WORKING without evidence",
        });
      }

      if ((/\bOpenBooks?\b/i.test(line) || isOpenBooksCleanRoomDoc(relativePath)) && hasPositiveClaim(line, COMPLIANCE_READY_PATTERNS)) {
        result.forbiddenClaimCount += 1;
        result.forbiddenClaims.push({
          file: relativePath,
          line: lineNumber,
          reason: "Forbidden compliance/storage/provider readiness claim",
        });
      }
    });
  }

  if (result.blockedReferencesCount > 0 || result.forbiddenClaimCount > 0) {
    result.status = "FAIL";
  }

  return result;
}

function formatResult(result) {
  const lines = [
    `checkedFilesCount: ${result.checkedFilesCount}`,
    `allowedReferencesCount: ${result.allowedReferencesCount}`,
    `blockedReferencesCount: ${result.blockedReferencesCount}`,
    `forbiddenClaimCount: ${result.forbiddenClaimCount}`,
    `status: ${result.status}`,
  ];

  if (result.blockedReferences.length > 0) {
    lines.push("", "Blocked references:");
    for (const item of result.blockedReferences.slice(0, 20)) {
      lines.push(`- ${item.file}:${item.line} ${item.reason}`);
    }
  }

  if (result.forbiddenClaims.length > 0) {
    lines.push("", "Forbidden claims:");
    for (const item of result.forbiddenClaims.slice(0, 20)) {
      lines.push(`- ${item.file}:${item.line} ${item.reason}`);
    }
  }

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const result = validateRepo();
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResult(result));
  }

  if (args.strict && result.status !== "PASS") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  usage,
  validateRepo,
  formatResult,
  isAllowedOpenBooksPath,
  isMitReusePolicyPath,
  isProductionSourcePath,
};
