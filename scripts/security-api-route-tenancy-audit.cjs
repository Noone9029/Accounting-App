#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SOURCE_DIR = path.join(process.cwd(), "apps", "api", "src");
const DEFAULT_EVIDENCE_PATH = path.join(process.cwd(), "docs", "security", "evidence", "API_TENANCY_AUDIT.md");
const DEFAULT_JSON_PATH = path.join(process.cwd(), "docs", "security", "evidence", "API_TENANCY_AUDIT.json");

const PUBLIC_SAFE_PATTERNS = [/health/i, /readiness/i, /auth\.controller\.ts$/i];
const SYSTEM_PATTERNS = [/system/i, /backup-readiness/i];
const WEBHOOK_PATTERNS = [/webhook/i, /provider-event/i, /signature/i, /replay/i];
const BUSINESS_PATH_PATTERNS = [
  /account/i,
  /bank/i,
  /bill/i,
  /cash/i,
  /collection/i,
  /compliance/i,
  /contact/i,
  /credit/i,
  /customer/i,
  /document/i,
  /invoice/i,
  /inventory/i,
  /journal/i,
  /payment/i,
  /purchase/i,
  /refund/i,
  /report/i,
  /sales/i,
  /supplier/i,
  /tax/i,
  /warehouse/i,
  /zatca/i,
];

function parseArgs(argv = process.argv) {
  const options = {
    sourceDir: DEFAULT_SOURCE_DIR,
    evidencePath: DEFAULT_EVIDENCE_PATH,
    jsonPath: DEFAULT_JSON_PATH,
    json: false,
    markdown: false,
    write: true,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--markdown") {
      options.markdown = true;
    } else if (arg === "--no-write") {
      options.write = false;
    } else if (arg === "--src") {
      options.sourceDir = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--src=")) {
      options.sourceDir = path.resolve(arg.slice("--src=".length));
    } else if (arg === "--out") {
      options.evidencePath = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--out=")) {
      options.evidencePath = path.resolve(arg.slice("--out=".length));
    } else if (arg === "--json-out") {
      options.jsonPath = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--json-out=")) {
      options.jsonPath = path.resolve(arg.slice("--json-out=".length));
    }
  }

  return options;
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    if (!entry.isFile() || !/\.ts$/.test(entry.name) || /\.spec\.ts$/.test(entry.name)) {
      return [];
    }
    return [fullPath];
  });
}

function normalizePath(filePath, sourceDir = DEFAULT_SOURCE_DIR) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/") || path.relative(sourceDir, filePath).replace(/\\/g, "/");
}

function extractControllerEndpoints(content) {
  const endpoints = [];
  const controllerMatch = content.match(/@Controller\(([^)]*)\)/);
  const controllerBase = controllerMatch ? controllerMatch[1].replace(/['"`]/g, "").trim() : "";
  const methodPattern = /@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/g;
  let match;
  while ((match = methodPattern.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: `${controllerBase}/${match[2].replace(/['"`]/g, "").trim()}`.replace(/\/+/g, "/"),
    });
  }
  return endpoints;
}

function classifySourceFile(filePath, content, sourceDir = DEFAULT_SOURCE_DIR) {
  const relativePath = normalizePath(filePath, sourceDir);
  const isController = /\.controller\.ts$/.test(filePath);
  const isService = /\.service\.ts$/.test(filePath);
  const endpoints = isController ? extractControllerEndpoints(content) : [];
  const hasGuards = /UseGuards\(|JwtAuthGuard|OrganizationContextGuard|PermissionGuard|Permissions\(/.test(content);
  const hasTenantMarkers = /organizationId|organizationContext|activeOrganization|requireOrganization|OrganizationContextGuard|organization\.id/.test(content);
  const hasAuthMarkers = /JwtAuthGuard|CurrentUser|req\.user|request\.user|AuthGuard|UseGuards/.test(content);
  const hasRoleMarkers = /Permissions\(|RequirePermission|roles?|permission/i.test(content);
  const hasWebhookMarkers = WEBHOOK_PATTERNS.some((pattern) => pattern.test(relativePath) || pattern.test(content));
  const directPrismaInController = isController && /prisma\.\w+/.test(content);
  const findManyCalls = [...content.matchAll(/prisma\.(\w+)\.findMany\s*\(([\s\S]*?)\)/g)].map((match) => ({
    model: match[1],
    snippet: sanitizeSnippet(match[0]),
    scoped: /organizationId|tenantId|workspaceId|companyId|userId/.test(match[2]),
  }));
  const unscopedFindMany = findManyCalls.filter((call) => !call.scoped && BUSINESS_PATH_PATTERNS.some((pattern) => pattern.test(relativePath)));
  const knownPublic = PUBLIC_SAFE_PATTERNS.some((pattern) => pattern.test(relativePath));
  const systemAdmin = SYSTEM_PATTERNS.some((pattern) => pattern.test(relativePath));
  const businessLike = BUSINESS_PATH_PATTERNS.some((pattern) => pattern.test(relativePath));

  let classification = "risky-review-needed";
  const reasons = [];

  if (knownPublic) {
    classification = "public-safe";
    reasons.push("Known public/auth/health surface; still review auth flows separately.");
  } else if (hasWebhookMarkers) {
    classification = "webhook";
    reasons.push("Webhook or provider-event surface; signature and replay handling require explicit review.");
  } else if (systemAdmin) {
    classification = "system/admin";
    reasons.push("System/admin-readiness surface; should stay owner/admin gated.");
  } else if ((hasGuards || isService) && hasTenantMarkers) {
    classification = "tenant-guarded";
    reasons.push(isService ? "Tenant-scope markers found in service source." : "Guard and tenant markers found in source.");
  } else if (hasAuthMarkers) {
    classification = "auth-only";
    reasons.push("Authentication markers found, but tenant markers are not obvious in this file.");
  } else if (!businessLike && !isController) {
    classification = "public-safe";
    reasons.push("Non-controller support file without business-route path markers.");
  } else {
    reasons.push("No obvious guard/auth/tenant marker found by static source scan.");
  }

  const suspicious = [];
  if (directPrismaInController) {
    suspicious.push("direct-prisma-query-in-controller");
  }
  if (unscopedFindMany.length) {
    suspicious.push("findMany-without-obvious-tenant-scope");
  }
  if (isController && !hasAuthMarkers && !knownPublic && !hasWebhookMarkers) {
    suspicious.push("controller-without-obvious-auth-marker");
  }
  if (hasWebhookMarkers && !/signature|verify|replay|idempotency/i.test(content)) {
    suspicious.push("webhook-without-obvious-signature-or-replay-wording");
  }

  if (suspicious.length && classification !== "public-safe") {
    classification = "risky-review-needed";
  }

  return {
    file: relativePath,
    kind: isController ? "controller" : isService ? "service" : "source",
    classification,
    reasons,
    endpoints,
    markers: {
      hasGuards,
      hasTenantMarkers,
      hasAuthMarkers,
      hasRoleMarkers,
      hasWebhookMarkers,
    },
    suspicious,
    unscopedFindMany,
  };
}

function sanitizeSnippet(snippet) {
  return snippet.replace(/\s+/g, " ").slice(0, 160);
}

function buildAudit(sourceDir = DEFAULT_SOURCE_DIR) {
  const files = listFiles(sourceDir)
    .filter((file) => /\.(controller|service)\.ts$/.test(file))
    .sort((a, b) => a.localeCompare(b));
  const rows = files.map((file) => classifySourceFile(file, fs.readFileSync(file, "utf8"), sourceDir));
  const counts = rows.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1;
    return acc;
  }, {});
  const riskyReviewNeeded = rows.filter((row) => row.classification === "risky-review-needed");
  const suspiciousPatterns = rows.filter((row) => row.suspicious.length > 0);

  return {
    status: riskyReviewNeeded.length ? "REVIEW_REQUIRED" : "NO_RISKY_ROUTES_DETECTED",
    generatedBy: "scripts/security-api-route-tenancy-audit.cjs",
    deterministic: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    sourceDir,
    scannedFiles: rows.length,
    counts,
    riskyReviewNeeded,
    suspiciousPatterns,
    rows,
  };
}

function formatMarkdown(report) {
  const lines = [
    "# API Tenancy Audit Evidence",
    "",
    "Status: read-only diagnostic evidence",
    "Generated by: `scripts/security-api-route-tenancy-audit.cjs`",
    "",
    "## Safety Contract",
    "",
    "- Source scan only.",
    "- No app server started.",
    "- No database connection.",
    "- No network calls.",
    "- No mutation.",
    "",
    "## Summary",
    "",
    `- Status: \`${report.status}\``,
    `- Scanned controller/service files: ${report.scannedFiles}`,
    ...Object.entries(report.counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([classification, count]) => `- ${classification}: ${count}`),
    "",
    "## Highest-Risk Review Items",
    "",
    ...formatRows(report.riskyReviewNeeded.slice(0, 60), ["file", "kind", "classification", "suspiciousSummary", "reasonSummary"]),
    "",
    "## Suspicious Pattern Summary",
    "",
    ...formatRows(report.suspiciousPatterns.slice(0, 80), ["file", "suspiciousSummary"]),
    "",
    "## Full File Catalog",
    "",
    "| File | Kind | Classification | Suspicious markers | Endpoints |",
    "| --- | --- | --- | --- | --- |",
    ...report.rows.map((row) => {
      const endpoints = row.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`).join("<br>") || "-";
      return `| ${row.file} | ${row.kind} | ${row.classification} | ${row.suspicious.join(", ") || "-"} | ${escapeMarkdown(endpoints)} |`;
    }),
    "",
  ];
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function formatRows(rows, columns) {
  if (!rows.length) {
    return ["No entries."];
  }
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => {
      const enriched = {
        ...row,
        suspiciousSummary: row.suspicious?.join(", ") || "-",
        reasonSummary: row.reasons?.join(" ") || "-",
      };
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
  if (options.write) {
    writeEvidence(report, options);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (options.markdown) {
    process.stdout.write(formatMarkdown(report));
  } else {
    process.stdout.write(`API route tenancy audit: ${report.status}; files=${report.scannedFiles}; evidence=${options.evidencePath}\n`);
  }
}

module.exports = {
  buildAudit,
  classifySourceFile,
  extractControllerEndpoints,
  formatMarkdown,
  parseArgs,
};
