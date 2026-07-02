#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_EVIDENCE_PATH = path.join(process.cwd(), "docs", "operations", "evidence", "MONITORING_SUPPORT_READINESS.md");
const DEFAULT_JSON_PATH = path.join(process.cwd(), "docs", "operations", "evidence", "MONITORING_SUPPORT_READINESS.json");
const DETERMINISTIC_GENERATED_AT = "2026-07-02T00:00:00.000Z";

const CHECKS = [
  {
    id: "api-health-endpoint",
    category: "api",
    label: "API health endpoint exists",
    availableStatus: "available",
    proof: "apps/api/src/health/health.controller.ts",
    files: ["apps/api/src/health/health.controller.ts"],
    patterns: [/@Get\(["']health["']\)/, /status:\s*["']ok["']/],
    response: "Use `/health` for basic API process availability checks.",
  },
  {
    id: "api-readiness-endpoint",
    category: "api",
    label: "API readiness endpoint exists",
    availableStatus: "available",
    proof: "apps/api/src/health/health.controller.ts",
    files: ["apps/api/src/health/health.controller.ts"],
    patterns: [/@Get\(["']readiness["']\)/, /\$queryRaw`SELECT 1`/, /database:\s*["']ok["']/],
    response: "Use `/readiness` for API plus database reachability in safe environments.",
  },
  {
    id: "web-health-documented",
    category: "web",
    label: "Web health/check routes documented",
    availableStatus: "partial",
    proof: "docs/deployment/DEPLOYED_E2E_RUNBOOK.md",
    files: ["docs/deployment/DEPLOYED_E2E_RUNBOOK.md", "docs/beta-testing/BETA_FIX_01_LIVE_ENVIRONMENT_CHECK.md"],
    anyPattern: /health|readiness|route|login/i,
    response: "Use documented route smoke checks until production uptime checks exist.",
  },
  {
    id: "database-readiness-signal",
    category: "database",
    label: "Database readiness signal documented",
    availableStatus: "available",
    proof: "apps/api/src/health/health.controller.ts",
    files: ["apps/api/src/health/health.controller.ts", "docs/deployment/CI_DATABASE_READINESS_CHECKLIST.md"],
    patterns: [/database:\s*["']ok["']|database:\s*ok/i],
    response: "Treat readiness database failure as SEV-2 or SEV-1 if data integrity is uncertain.",
  },
  {
    id: "email-readiness-diagnostics",
    category: "email",
    label: "Email readiness diagnostics exist",
    availableStatus: "available",
    proof: "apps/api/src/email/email.controller.ts",
    files: ["apps/api/src/email/email.controller.ts"],
    patterns: [/@Get\(["']readiness["']\)/, /diagnosticsPlan|diagnostics-plan/, /runDiagnostics/],
    response: "Use email readiness and diagnostics-plan endpoints; do not send test emails during this local diagnostic.",
  },
  {
    id: "email-outbox-monitoring",
    category: "email",
    label: "Email outbox monitoring exists or blocked",
    availableStatus: "partial",
    proof: "apps/api/src/email/email.controller.ts",
    files: ["apps/api/src/email/email.controller.ts", "docs/operations/ALERTING_MATRIX.md"],
    patterns: [/monitoring-plan/, /monitoring-evidence/, /outbox/i],
    response: "Monitor outbox backlog manually until a hosted alert provider is selected.",
  },
  {
    id: "queue-worker-readiness",
    category: "jobs",
    label: "Queue/worker readiness exists or blocked",
    availableStatus: "partial",
    proof: "apps/api/src/email/email.controller.ts",
    files: ["apps/api/src/email/email.controller.ts", "docs/operations/MONITORING_AND_SUPPORT_READINESS_PLAN.md"],
    patterns: [/retry-worker\/plan|retryWorkerPlan/, /queue|worker/i],
    response: "Only email retry-worker readiness is visible now; generic queues remain future/blocked until deployed.",
  },
  {
    id: "backup-readiness",
    category: "backup",
    label: "Backup readiness endpoint/docs exist",
    availableStatus: "available",
    proof: "apps/api/src/system/system.controller.ts",
    files: ["apps/api/src/system/system.controller.ts", "docs/operations/BACKUP_PITR_OBJECT_STORAGE_PRE_ASP_PLAN.md"],
    patterns: [/backup-readiness/, /backup/i],
    response: "Use backup readiness evidence; do not run destructive restore commands in support triage.",
  },
  {
    id: "restore-evidence",
    category: "backup",
    label: "Restore evidence docs exist",
    availableStatus: "available",
    proof: "docs/operations/RESTORE_DRILL_EVIDENCE_INDEX.md",
    files: ["docs/operations/RESTORE_DRILL_EVIDENCE_INDEX.md", "docs/production/BACKUP_RESTORE_PROOF_HARNESS.md"],
    anyPattern: /restore|drill|evidence/i,
    response: "Track restore evidence age and escalate when evidence is stale or missing.",
  },
  {
    id: "object-storage-proof",
    category: "storage",
    label: "Object storage proof exists or blocked",
    availableStatus: "partial",
    proof: "scripts/object-storage-proof-validate.cjs",
    files: ["scripts/object-storage-proof-validate.cjs", "docs/operations/OBJECT_STORAGE_VALIDATION_PLAN.md"],
    anyPattern: /object storage|storage proof|noNetwork|dry-run/i,
    response: "Storage proof remains local/dry-run until a non-production bucket is approved.",
  },
  {
    id: "storage-readiness",
    category: "storage",
    label: "Storage readiness UI/docs exist",
    availableStatus: "available",
    proof: "apps/api/src/storage/storage.controller.ts",
    files: ["apps/api/src/storage/storage.controller.ts", "docs/operations/DOCUMENT_ARCHIVE_RETENTION_PLAN.md"],
    patterns: [/@Get\(["']readiness["']\)/, /storage/i],
    response: "Use storage readiness state; do not run object operations or signed URL checks here.",
  },
  {
    id: "zatca-no-network",
    category: "compliance",
    label: "ZATCA disabled/no-network status exists",
    availableStatus: "available",
    proof: "scripts/zatca-sandbox-adapter-no-network-contract.cjs",
    files: ["scripts/zatca-sandbox-adapter-no-network-contract.cjs", "scripts/zatca-sdk-ci-readiness.cjs"],
    anyPattern: /noNetwork|no network|NO_NETWORK/i,
    response: "Any unexpected ZATCA network attempt is critical before explicit approval.",
  },
  {
    id: "uae-asp-no-network",
    category: "compliance",
    label: "UAE ASP disabled/no-network status exists",
    availableStatus: "partial",
    proof: "apps/api/src/compliance-core/compliance-core.controller.ts",
    files: ["apps/api/src/compliance-core/compliance-core.controller.ts", "docs/production/PRE_ASP_PRODUCTION_FOUNDATION_TRACKER.md"],
    anyPattern: /asp-provider\/readiness|ASP access|no network|No network|No real ASP/i,
    response: "Treat real ASP calls as blocked until provider access and approvals exist.",
  },
  {
    id: "support-triage-runbook",
    category: "support",
    label: "Support triage runbook exists",
    availableStatus: "available",
    proof: "docs/operations/SUPPORT_TRIAGE_RUNBOOK.md",
    files: ["docs/operations/SUPPORT_TRIAGE_RUNBOOK.md"],
    anyPattern: /Support Triage|Triage Buckets|Support Boundaries/i,
    response: "Use the support triage runbook for intake, severity, and escalation.",
  },
  {
    id: "incident-response-runbook",
    category: "support",
    label: "Incident response runbook exists",
    availableStatus: "available",
    proof: "docs/operations/INCIDENT_RESPONSE_RUNBOOK.md",
    files: ["docs/operations/INCIDENT_RESPONSE_RUNBOOK.md"],
    anyPattern: /Incident Response|Severity|First 15 Minutes/i,
    response: "Use the incident runbook for SEV classification and first-response discipline.",
  },
  {
    id: "alerting-matrix",
    category: "monitoring",
    label: "Alerting matrix exists",
    availableStatus: "available",
    proof: "docs/operations/ALERTING_MATRIX.md",
    files: ["docs/operations/ALERTING_MATRIX.md"],
    anyPattern: /Alerting Matrix|Signal|Critical/i,
    response: "Use the matrix as the source for future provider alert rules.",
  },
  {
    id: "operational-dashboard-requirements",
    category: "monitoring",
    label: "Operational dashboard requirements exist",
    availableStatus: "available",
    proof: "docs/operations/OPERATIONAL_DASHBOARD_REQUIREMENTS.md",
    files: ["docs/operations/OPERATIONAL_DASHBOARD_REQUIREMENTS.md"],
    anyPattern: /Operational Dashboard|Dashboard Panels|Data Safety/i,
    response: "Use requirements only; no live dashboard is claimed by this diagnostic.",
  },
  {
    id: "beta-support-process",
    category: "support",
    label: "Beta support process exists",
    availableStatus: "available",
    proof: "docs/beta-testing/CONTROLLED_BETA_SUPPORT_READY.md",
    files: ["docs/beta-testing/CONTROLLED_BETA_SUPPORT_READY.md", "docs/beta-testing/BETA_ISSUE_TRIAGE_RUNBOOK.md"],
    anyPattern: /support|triage|beta/i,
    response: "Use controlled-beta support docs and issue log for tester-facing support.",
  },
];

function parseArgs(argv = process.argv) {
  const options = {
    rootDir: process.cwd(),
    json: false,
    markdown: false,
    write: true,
    evidencePath: DEFAULT_EVIDENCE_PATH,
    jsonPath: DEFAULT_JSON_PATH,
  };
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
    } else if (arg === "--root") {
      options.rootDir = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--root=")) {
      options.rootDir = path.resolve(arg.slice("--root=".length));
    }
  }
  return options;
}

function fileExists(rootDir, relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function readIfExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function evaluateCheck(rootDir, definition) {
  const existingFiles = definition.files.filter((file) => fileExists(rootDir, file));
  const combinedText = existingFiles.map((file) => readIfExists(rootDir, file)).join("\n");
  const hasRequiredFiles = existingFiles.length === definition.files.length;
  const patternsPass = definition.patterns ? definition.patterns.every((pattern) => pattern.test(combinedText)) : true;
  const anyPatternPass = definition.anyPattern ? definition.anyPattern.test(combinedText) : true;
  const detected = hasRequiredFiles && patternsPass && anyPatternPass;
  const status = detected ? definition.availableStatus : "blocked";
  return {
    id: definition.id,
    category: definition.category,
    label: definition.label,
    status,
    detected,
    proof: definition.proof,
    response: definition.response,
    existingFiles,
    missingFiles: definition.files.filter((file) => !existingFiles.includes(file)),
  };
}

function buildReport(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const checks = CHECKS.map((check) => evaluateCheck(rootDir, check));
  const counts = checks.reduce((acc, check) => {
    acc[check.status] = (acc[check.status] || 0) + 1;
    return acc;
  }, {});
  const blocked = checks.filter((check) => check.status === "blocked");
  const partial = checks.filter((check) => check.status === "partial");
  const status = blocked.length ? "MONITORING_SUPPORT_REVIEW_REQUIRED" : partial.length ? "MONITORING_SUPPORT_PARTIAL_READY" : "MONITORING_SUPPORT_LOCAL_READY";

  return {
    status,
    generatedBy: "scripts/monitoring-support-readiness.cjs",
    generatedAt: DETERMINISTIC_GENERATED_AT,
    deterministic: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    noEmailSend: true,
    noProviderCall: true,
    noStorageOperation: true,
    noSecretsPrinted: true,
    noCustomerDataPrinted: true,
    counts,
    checks,
    blocked: blocked.map(summarizeCheck),
    partial: partial.map(summarizeCheck),
  };
}

function summarizeCheck(check) {
  return {
    id: check.id,
    label: check.label,
    status: check.status,
    proof: check.proof,
    missingFiles: check.missingFiles,
  };
}

function formatText(report) {
  const lines = [
    `Monitoring/support readiness: ${report.status}`,
    `Generated by: ${report.generatedBy}`,
    `No database connection: ${report.noDatabaseConnection}`,
    `No network: ${report.noNetwork}`,
    `No mutation: ${report.noMutation}`,
    `No email send: ${report.noEmailSend}`,
    `No provider call: ${report.noProviderCall}`,
    `No storage operation: ${report.noStorageOperation}`,
    "",
    "Summary:",
    ...Object.entries(report.counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, count]) => `- ${status}: ${count}`),
    "",
    "Checks:",
    ...report.checks.map((check) => `- ${check.status}: ${check.label} (${check.proof})`),
  ];
  return lines.join("\n");
}

function formatMarkdown(report) {
  const lines = [
    "# Monitoring Support Readiness Evidence",
    "",
    "Status: local/read-only diagnostic evidence",
    "Generated by: `scripts/monitoring-support-readiness.cjs`",
    "",
    "## Safety Contract",
    "",
    "- Source and documentation scan only.",
    "- No app server started.",
    "- No database connection.",
    "- No network calls.",
    "- No mutation.",
    "- No email sent.",
    "- No provider call.",
    "- No object storage or signed URL operation.",
    "- No secrets or customer data printed.",
    "",
    "## Summary",
    "",
    `- Status: \`${report.status}\``,
    `- Available: ${report.counts.available || 0}`,
    `- Partial: ${report.counts.partial || 0}`,
    `- Blocked: ${report.counts.blocked || 0}`,
    "",
    "## Readiness Checks",
    "",
    "| Category | Signal | Status | Proof | Support response |",
    "| --- | --- | --- | --- | --- |",
    ...report.checks.map(
      (check) =>
        `| ${escapeCell(check.category)} | ${escapeCell(check.label)} | \`${check.status}\` | \`${escapeCell(check.proof)}\` | ${escapeCell(check.response)} |`,
    ),
    "",
    "## Remaining Gaps",
    "",
    ...(report.partial.length || report.blocked.length
      ? [...report.partial, ...report.blocked].map((check) => `- \`${check.status}\` ${check.label}: ${check.proof}`)
      : ["- No blocked checks detected by this local diagnostic."]),
    "",
    "## Boundary",
    "",
    "This evidence does not claim production monitoring, production support SLA, live alerting, hosted log drains, ASP connectivity, live banking, object storage readiness, signed URL readiness, or production compliance readiness.",
  ];
  return lines.join("\n");
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function writeEvidence(report, options) {
  fs.mkdirSync(path.dirname(options.evidencePath), { recursive: true });
  fs.mkdirSync(path.dirname(options.jsonPath), { recursive: true });
  fs.writeFileSync(options.evidencePath, `${formatMarkdown(report)}\n`);
  fs.writeFileSync(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
}

function run(options = parseArgs(process.argv)) {
  const report = buildReport(options);
  if (options.write) {
    writeEvidence(report, options);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (options.markdown) {
    process.stdout.write(`${formatMarkdown(report)}\n`);
  } else {
    process.stdout.write(`${formatText(report)}\n`);
  }
  return report;
}

if (require.main === module) {
  run();
}

module.exports = {
  CHECKS,
  buildReport,
  evaluateCheck,
  formatMarkdown,
  formatText,
  parseArgs,
  run,
  writeEvidence,
};
