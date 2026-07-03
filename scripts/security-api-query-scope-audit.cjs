#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SOURCE_DIR = path.join(process.cwd(), "apps", "api", "src");
const DEFAULT_EVIDENCE_PATH = path.join(process.cwd(), "docs", "security", "evidence", "API_QUERY_SCOPE_AUDIT.md");
const DEFAULT_JSON_PATH = path.join(process.cwd(), "docs", "security", "evidence", "API_QUERY_SCOPE_AUDIT.json");
const QUERY_METHODS = ["findMany", "findFirst", "findUnique", "update", "updateMany", "delete", "deleteMany", "create", "upsert", "aggregate", "groupBy"];
const SYSTEM_PATTERNS = [/health/i, /readiness/i, /system/i, /backup-readiness/i, /tenant-isolation/i];
const PUBLIC_PATTERNS = [/auth\.controller\.ts$/i, /health/i, /readiness/i];
const WEBHOOK_PATTERNS = [/webhook/i, /provider-event/i, /signature/i, /replay/i];
const TENANT_MARKERS = /organizationId|organizationContext|activeOrganization|requireOrganization|OrganizationContextGuard|organization\.id|assert.*Organization|BelongsToOrganization/i;
const USER_MARKERS = /userId|CurrentUser|request\.user|req\.user|JwtAuthGuard|AuthGuard|createdById|actorUserId/i;
const SYSTEM_MARKERS = /admin|system|owner|readiness|diagnostic/i;

function parseArgs(argv = process.argv) {
  const options = { sourceDir: DEFAULT_SOURCE_DIR, evidencePath: DEFAULT_EVIDENCE_PATH, jsonPath: DEFAULT_JSON_PATH, json: false, markdown: false, write: true };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--markdown") options.markdown = true;
    else if (arg === "--no-write") options.write = false;
    else if (arg === "--src") {
      options.sourceDir = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--src=")) options.sourceDir = path.resolve(arg.slice("--src=".length));
    else if (arg === "--out") {
      options.evidencePath = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--out=")) options.evidencePath = path.resolve(arg.slice("--out=".length));
    else if (arg === "--json-out") {
      options.jsonPath = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--json-out=")) options.jsonPath = path.resolve(arg.slice("--json-out=".length));
  }
  return options;
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    if (!entry.isFile() || !/\.ts$/.test(entry.name) || /\.spec\.ts$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function normalizePath(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function extractQueryCalls(content) {
  const methods = QUERY_METHODS.join("|");
  const pattern = new RegExp(`(?:this\\.)?prisma\\.(\\w+)\\.(${methods})\\s*\\(`, "g");
  const calls = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const start = match.index;
    const end = findCallEnd(content, pattern.lastIndex - 1);
    const snippet = sanitizeSnippet(content.slice(start, end));
    const line = content.slice(0, start).split(/\r?\n/).length;
    calls.push({
      model: match[1],
      method: match[2],
      line,
      snippet,
      tenantScoped: TENANT_MARKERS.test(snippet),
      userScoped: USER_MARKERS.test(snippet),
    });
  }
  return calls;
}

function findCallEnd(content, openParenIndex) {
  let depth = 0;
  for (let index = openParenIndex; index < content.length; index += 1) {
    const char = content[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return Math.min(content.length, openParenIndex + 240);
}

function sanitizeSnippet(value) {
  return value
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "$1[redacted-literal]$1")
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

function classifyFile(filePath, content) {
  const relativePath = normalizePath(filePath);
  const queryCalls = extractQueryCalls(content);
  const hasTenantMarkers = TENANT_MARKERS.test(content);
  const hasUserMarkers = USER_MARKERS.test(content);
  const hasWebhookMarkers = WEBHOOK_PATTERNS.some((pattern) => pattern.test(relativePath) || pattern.test(content));
  const publicSafe = PUBLIC_PATTERNS.some((pattern) => pattern.test(relativePath));
  const systemAdmin = SYSTEM_PATTERNS.some((pattern) => pattern.test(relativePath) || pattern.test(content)) || SYSTEM_MARKERS.test(relativePath);
  const unscopedCalls = queryCalls.filter((call) => !call.tenantScoped && !call.userScoped);

  let classification = "public-safe";
  const reasons = [];
  if (queryCalls.length === 0) {
    reasons.push("No Prisma query calls detected.");
  } else if (publicSafe) {
    classification = "public-safe";
    reasons.push("Known auth/health/readiness surface; query usage is inventoried separately from tenant data routes.");
  } else if (hasWebhookMarkers) {
    classification = "webhook";
    reasons.push("Webhook/provider-event surface; signature, replay, and tenant derivation need explicit review before real providers.");
  } else if (hasTenantMarkers) {
    classification = "tenant-scoped";
    reasons.push("Tenant-scope markers are present in the file.");
  } else if (hasUserMarkers) {
    classification = "user-scoped";
    reasons.push("User/auth markers are present but tenant markers are not obvious.");
  } else if (systemAdmin) {
    classification = "system/admin";
    reasons.push("System/admin/readiness source path or markers detected.");
  } else {
    classification = "review-needed";
    reasons.push("Prisma query calls exist without obvious organization/user/system/webhook markers.");
  }

  if (queryCalls.length > 0 && unscopedCalls.length > 0 && !["public-safe", "system/admin", "webhook"].includes(classification)) {
    classification = "review-needed";
    reasons.push("At least one query call lacks clear local scoping markers in the scanned call snippet.");
  }

  return {
    file: relativePath,
    classification,
    reasons,
    queryCallCount: queryCalls.length,
    unscopedQueryCallCount: unscopedCalls.length,
    markers: { hasTenantMarkers, hasUserMarkers, hasWebhookMarkers, publicSafe, systemAdmin },
    queryCalls,
    unscopedCalls,
  };
}

function buildAudit(sourceDir = DEFAULT_SOURCE_DIR) {
  const rows = listFiles(sourceDir)
    .sort((a, b) => a.localeCompare(b))
    .map((file) => classifyFile(file, fs.readFileSync(file, "utf8")))
    .filter((row) => row.queryCallCount > 0);
  const counts = rows.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1;
    return acc;
  }, {});
  const reviewNeeded = rows.filter((row) => row.classification === "review-needed");
  return {
    status: reviewNeeded.length ? "QUERY_SCOPE_REVIEW_REQUIRED" : "QUERY_SCOPE_INVENTORY_READY",
    generatedBy: "scripts/security-api-query-scope-audit.cjs",
    deterministic: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    sourceDir,
    scannedFilesWithQueries: rows.length,
    totalQueryCalls: rows.reduce((sum, row) => sum + row.queryCallCount, 0),
    counts,
    reviewNeeded,
    rows,
  };
}

function formatMarkdown(report) {
  const lines = [
    "# API Query Scope Audit Evidence",
    "",
    "Status: read-only diagnostic evidence",
    "Generated by: `scripts/security-api-query-scope-audit.cjs`",
    "",
    "## Safety Contract",
    "",
    "- Source scan only under `apps/api/src`.",
    "- No app server started.",
    "- No Prisma Client import.",
    "- No database connection.",
    "- No network calls.",
    "- No mutation.",
    "- String literals in snippets are redacted.",
    "",
    "## Summary",
    "",
    `- Status: \`${report.status}\``,
    `- Files with Prisma queries: ${report.scannedFilesWithQueries}`,
    `- Prisma query calls inventoried: ${report.totalQueryCalls}`,
    ...Object.entries(report.counts).sort(([a], [b]) => a.localeCompare(b)).map(([classification, count]) => `- ${classification}: ${count}`),
    "",
    "## Review Needed",
    "",
    ...formatRows(report.reviewNeeded, ["file", "classification", "queryCallCount", "unscopedQueryCallCount", "reasonSummary"]),
    "",
    "## Full Query File Inventory",
    "",
    "| File | Classification | Query calls | Unscoped call snippets | Reason |",
    "| --- | --- | --- | --- | --- |",
    ...report.rows.map((row) => `| ${row.file} | ${row.classification} | ${row.queryCallCount} | ${escapeMarkdown(row.unscopedCalls.map((call) => `${call.model}.${call.method}@${call.line}`).join(", ") || "-")} | ${escapeMarkdown(row.reasons.join(" "))} |`),
    "",
  ];
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function formatRows(rows, columns) {
  if (!rows.length) return ["No entries."];
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => {
      const enriched = { ...row, reasonSummary: row.reasons.join(" ") };
      return `| ${columns.map((column) => escapeMarkdown(String(enriched[column] || "-"))).join(" | ")} |`;
    }),
  ];
}

function escapeMarkdown(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function writeEvidence(report, options = {}) {
  const evidencePath = options.evidencePath || DEFAULT_EVIDENCE_PATH;
  const jsonPath = options.jsonPath || DEFAULT_JSON_PATH;
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, formatMarkdown(report));
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (require.main === module) {
  const options = parseArgs();
  const report = buildAudit(options.sourceDir);
  if (options.write) writeEvidence(report, options);
  if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else if (options.markdown) process.stdout.write(formatMarkdown(report));
  else process.stdout.write(`API query scope audit: ${report.status}; files=${report.scannedFilesWithQueries}; calls=${report.totalQueryCalls}; evidence=${options.evidencePath}\n`);
}

module.exports = {
  buildAudit,
  classifyFile,
  extractQueryCalls,
  formatMarkdown,
  parseArgs,
  sanitizeSnippet,
};
