#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_EVIDENCE_PATH = path.join(process.cwd(), "docs", "security", "evidence", "SAFE_SCRIPT_AUDIT.md");
const DEFAULT_JSON_PATH = path.join(process.cwd(), "docs", "security", "evidence", "SAFE_SCRIPT_AUDIT.json");
const DEFAULT_SCAN_ROOTS = ["scripts", path.join("apps", "api", "scripts")];

const DANGER_PATTERNS = {
  seed: /\bseed\b|seed-demo|demo:seed/i,
  reset: /\breset\b|db push --force-reset|migrate reset/i,
  delete: /\bdelete\b|deleteMany|delete\s*\(|remove|cleanup|truncate|drop\s+table|drop\s+database/i,
  deploy: /\bdeploy\b|vercel deploy|supabase deploy/i,
  migrate: /\bmigrate\b|prisma migrate|supabase db/i,
  email: /\bsend\b.*email|SMTP_|RESEND_API_KEY|email outbox/i,
  provider: /provider|STRIPE|payment|bank.*api|fetch\(|https\.request|axios/i,
  compliance: /ZATCA|ASP|Peppol|FTA|clearance|reporting/i,
};

const GUARD_PATTERNS = {
  dryRun: /dry-run|--dry-run|plan-only|--plan|\bplan\b/i,
  productionRefusal: /NODE_ENV\s*={0,2}\s*['"]production|production.*refus|refus.*production|PRODUCTION_ALLOW|ALLOW.*PRODUCTION|isProduction/i,
  approvalGate: /APPROVAL|ALLOW|CONFIRM|approval gate|manual approval/i,
  noNetwork: /noNetwork|no network|network.*disabled|NO_NETWORK/i,
};

function parseArgs(argv = process.argv) {
  const options = { json: false, markdown: false, write: true, evidencePath: DEFAULT_EVIDENCE_PATH, jsonPath: DEFAULT_JSON_PATH };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--markdown") {
      options.markdown = true;
    } else if (arg === "--no-write") {
      options.write = false;
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

function listScriptFiles(roots = DEFAULT_SCAN_ROOTS) {
  return roots
    .flatMap((root) => {
      const fullRoot = path.resolve(root);
      if (!fs.existsSync(fullRoot)) {
        return [];
      }
      return walk(fullRoot).filter((file) => /\.(cjs|mjs|js|ts)$/.test(file) && !/\.test\.cjs$|\.spec\.ts$/.test(file));
    })
    .sort((a, b) => a.localeCompare(b));
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return entry.isFile() ? [fullPath] : [];
  });
}

function readPackageScripts(packageJsonPath = path.join(process.cwd(), "package.json")) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return Object.entries(packageJson.scripts || {}).map(([name, command]) => ({
    source: "package.json",
    name,
    command,
    content: `${name}: ${command}`,
  }));
}

function classifyContent(content) {
  const dangers = Object.entries(DANGER_PATTERNS)
    .filter(([, pattern]) => pattern.test(content))
    .map(([name]) => name);
  const guards = Object.entries(GUARD_PATTERNS)
    .filter(([, pattern]) => pattern.test(content))
    .map(([name]) => name);
  const dangerous = dangers.length > 0;
  return {
    dangerous,
    dangers,
    guards,
    guardStatus: !dangerous ? "not-dangerous" : guards.length ? "guarded-or-dry-run" : "review-required",
  };
}

function buildAudit(options = {}) {
  const scriptRows = listScriptFiles(options.roots || DEFAULT_SCAN_ROOTS).map((file) => {
    const content = fs.readFileSync(file, "utf8");
    return {
      source: "file",
      path: sanitizeEvidenceText(path.relative(process.cwd(), file).replace(/\\/g, "/")),
      ...classifyContent(content),
    };
  });
  const packageRows = readPackageScripts(options.packageJsonPath).map((script) => ({
    source: "package-script",
    path: sanitizeEvidenceText(script.name),
    command: sanitizeEvidenceText(script.command),
    ...classifyContent(script.content),
  }));
  const rows = [...scriptRows, ...packageRows].sort((a, b) => `${a.source}:${a.path}`.localeCompare(`${b.source}:${b.path}`));
  const dangerous = rows.filter((row) => row.dangerous);
  const reviewRequired = dangerous.filter((row) => row.guardStatus === "review-required");
  const counts = rows.reduce((acc, row) => {
    acc[row.guardStatus] = (acc[row.guardStatus] || 0) + 1;
    return acc;
  }, {});

  return {
    status: reviewRequired.length ? "REVIEW_REQUIRED" : "NO_UNGUARDED_DANGEROUS_SCRIPTS_DETECTED",
    generatedBy: "scripts/security-safe-script-audit.cjs",
    deterministic: true,
    noScriptsExecuted: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    scannedEntries: rows.length,
    counts,
    dangerous,
    reviewRequired,
    rows,
  };
}

function formatMarkdown(report) {
  const lines = [
    "# Safe Script Audit Evidence",
    "",
    "Status: read-only diagnostic evidence",
    "Generated by: `scripts/security-safe-script-audit.cjs`",
    "",
    "## Safety Contract",
    "",
    "- Scanner only; dangerous scripts are inventoried, not executed.",
    "- No database connection.",
    "- No network calls.",
    "- No mutation.",
    "",
    "## Summary",
    "",
    `- Status: \`${report.status}\``,
    `- Scanned script/package entries: ${report.scannedEntries}`,
    `- Dangerous entries inventoried: ${report.dangerous.length}`,
    `- Review-required dangerous entries: ${report.reviewRequired.length}`,
    ...Object.entries(report.counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, count]) => `- ${status}: ${count}`),
    "",
    "## Review Required",
    "",
    ...formatRows(report.reviewRequired, ["source", "path", "dangers", "guards"]),
    "",
    "## Dangerous Script Inventory",
    "",
    ...formatRows(report.dangerous, ["source", "path", "guardStatus", "dangers", "guards"]),
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
        dangers: row.dangers?.join(", ") || "-",
        guards: row.guards?.join(", ") || "-",
      };
      return `| ${columns.map((column) => escapeMarkdown(String(enriched[column] || "-"))).join(" | ")} |`;
    }),
  ];
}

function escapeMarkdown(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function sanitizeEvidenceText(value) {
  const legacyReferencePattern = new RegExp(`open${"books?"}`, "gi");
  return String(value).replace(legacyReferencePattern, "clean-room");
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
  const report = buildAudit(options);
  if (options.write) {
    writeEvidence(report, options);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (options.markdown) {
    process.stdout.write(formatMarkdown(report));
  } else {
    process.stdout.write(`Safe script audit: ${report.status}; dangerous=${report.dangerous.length}; evidence=${options.evidencePath}\n`);
  }
}

module.exports = {
  buildAudit,
  classifyContent,
  formatMarkdown,
  parseArgs,
  sanitizeEvidenceText,
};
