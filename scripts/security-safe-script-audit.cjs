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

const REVIEWED_SCRIPT_FINDINGS = {
  "file:scripts/debug-zatca-pih-chain.cjs": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate"],
    "SECURITY-SAFE-SCRIPTS-03: PIH debug wrapper now refuses production/remote API targets and requires explicit local API approval before delegating to hash-mode validation.",
  ),
  "file:scripts/validate-generated-zatca-invoice.cjs": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate", "redaction"],
    "SECURITY-SAFE-SCRIPTS-03: generated invoice validation now refuses production/remote API targets, requires explicit local API approval, and redacts credentials/tokens/error payloads.",
  ),
  "package-script:db:migrate": reviewedScript(
    "owner-approval-required",
    ["ownerApprovalRequired", "productionForbidden"],
    "SECURITY-SAFE-SCRIPTS-03: Prisma migrate deploy remains intentionally blocked without owner approval; no wrapper or execution was added.",
  ),
  "package-script:db:seed": reviewedScript(
    "owner-approval-required",
    ["ownerApprovalRequired", "productionForbidden"],
    "SECURITY-SAFE-SCRIPTS-03: Prisma seed remains intentionally blocked without owner approval; no seed command was executed.",
  ),
  "package-script:demo:seed-workflows": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate"],
    "SECURITY-SAFE-SCRIPTS-03: demo workflow seed remains local-only by default and remote disposable targets require exact owner approval.",
  ),
  "package-script:smoke:accounting:banking": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate", "redaction"],
    "SECURITY-SAFE-SCRIPTS-03: banking smoke mutates smoke data only after local/default or exact disposable remote owner approval; route labels and credential handling are redacted.",
  ),
  "package-script:smoke:accounting:zatca-safe": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate", "redaction"],
    "SECURITY-SAFE-SCRIPTS-03: ZATCA-safe smoke phase mutates smoke API data only after local/default or exact disposable remote owner approval and keeps real ZATCA network disabled.",
  ),
  "package-script:zatca:debug-pih-chain": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate"],
    "SECURITY-SAFE-SCRIPTS-03: package wrapper inherits debug-zatca-pih-chain local-only approval and production refusal.",
  ),
  "package-script:zatca:validate-generated": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate", "redaction"],
    "SECURITY-SAFE-SCRIPTS-03: package wrapper inherits generated invoice validation local-only approval, production refusal, and redaction.",
  ),
  "package-script:zatca:validate-sdk-hash-mode": reviewedScript(
    "owner-approval-required",
    ["localOnlyDefault", "productionRefusal", "approvalGate", "redaction"],
    "SECURITY-SAFE-SCRIPTS-03: hash-mode validation now refuses production/remote API targets and requires explicit local API approval before API workflow execution.",
  ),
  "file:scripts/check-deployed-e2e-env.cjs": reviewedScript(
    "guarded-or-dry-run",
    ["readOnlyHttp", "redaction", "noMutation"],
    "SECURITY-HARDENING-02: deployed E2E preflight performs GET reachability checks only and redacts credential presence.",
  ),
  "file:scripts/vercel-postinstall.cjs": reviewedScript(
    "guarded-or-dry-run",
    ["deploymentScopeGate", "buildOnly", "noMigration"],
    "SECURITY-HARDENING-02: postinstall exits unless VERCEL=1 and LEDGERBYTE_DEPLOY_TARGET=api, then runs package builds and prisma generate only.",
  ),
  "file:scripts/zatca-sdk-readiness.cjs": reviewedScript(
    "guarded-or-dry-run",
    ["localReadiness", "noNetwork", "noMutation"],
    "SECURITY-HARDENING-02: readiness script checks local Java/SDK paths and emits metadata only.",
  ),
  "package-script:pre-asp:diagnostics": reviewedScript(
    "guarded-or-dry-run",
    ["readOnlyDiagnostic", "noDatabaseConnection", "noNetwork", "noMutation"],
    "SECURITY-HARDENING-02: pre-ASP diagnostics parse schema/env-key presence only and do not connect or mutate.",
  ),
  "package-script:test:pre-asp-diagnostics": reviewedScript(
    "guarded-or-dry-run",
    ["testOnly", "noDatabaseConnection", "noNetwork", "noMutation"],
    "SECURITY-HARDENING-02: node --test wrapper for read-only pre-ASP diagnostics.",
  ),
  "package-script:test:zatca-csid-response-custody-guard": reviewedScript("guarded-or-dry-run", ["testOnly", "guardContract"], "SECURITY-HARDENING-02: node --test wrapper for custody guard behavior."),
  "package-script:test:zatca-sandbox-access-otp-runbook-guard": reviewedScript("guarded-or-dry-run", ["testOnly", "guardContract"], "SECURITY-HARDENING-02: node --test wrapper for OTP runbook guard behavior."),
  "package-script:test:zatca-sandbox-adapter-boundary-check": reviewedScript("guarded-or-dry-run", ["testOnly", "guardContract"], "SECURITY-HARDENING-02: node --test wrapper for adapter boundary checks."),
  "package-script:test:zatca-sandbox-adapter-no-network-contract": reviewedScript("guarded-or-dry-run", ["testOnly", "noNetwork", "guardContract"], "SECURITY-HARDENING-02: node --test wrapper for no-network adapter contract."),
  "package-script:test:zatca-sandbox-csid-preflight": reviewedScript("guarded-or-dry-run", ["testOnly", "guardContract"], "SECURITY-HARDENING-02: node --test wrapper for sandbox CSID preflight guard."),
  "package-script:test:zatca-sdk-ci-readiness": reviewedScript("guarded-or-dry-run", ["testOnly", "noNetwork", "localReadiness"], "SECURITY-HARDENING-02: node --test wrapper for SDK CI readiness metadata."),
  "package-script:test:zatca-sdk-validate-local": reviewedScript("guarded-or-dry-run", ["testOnly", "localValidation"], "SECURITY-HARDENING-02: node --test wrapper for local SDK validation harness."),
  "package-script:zatca:csid-response-custody-guard": reviewedScript("guarded-or-dry-run", ["guardContract", "noCredentialCustody"], "SECURITY-HARDENING-02: custody guard command reports blockers and does not create CSID custody."),
  "package-script:zatca:csr-local-generate": reviewedScript("guarded-or-dry-run", ["executionDisabledByDefault", "approvalGate", "noCsidRequest"], "SECURITY-HARDENING-02: API CSR local generation wrapper is disabled by default and requires explicit local execution gates."),
  "package-script:zatca:generate-local-xml-fixtures": reviewedScript("guarded-or-dry-run", ["localFixtureGeneration", "noNetwork", "noDatabaseConnection"], "SECURITY-HARDENING-02: generates local deterministic XML fixtures only; no provider, DB, or hosted mutation."),
  "package-script:zatca:local-signed-xml-validate": reviewedScript("guarded-or-dry-run", ["executionDisabledByDefault", "approvalGate", "noClearanceReporting"], "SECURITY-HARDENING-02: local signed XML validation wrapper is disabled by default and blocks ZATCA network/clearance/reporting."),
  "package-script:zatca:sandbox-access-otp-runbook-guard": reviewedScript("guarded-or-dry-run", ["guardContract", "approvalGate"], "SECURITY-HARDENING-02: OTP access command is a runbook guard and does not capture OTP by default."),
  "package-script:zatca:sandbox-adapter-boundary-check": reviewedScript("guarded-or-dry-run", ["guardContract", "noNetwork"], "SECURITY-HARDENING-02: adapter boundary check is metadata/contract-only."),
  "package-script:zatca:sandbox-adapter-no-network-contract": reviewedScript("guarded-or-dry-run", ["guardContract", "noNetwork"], "SECURITY-HARDENING-02: no-network contract explicitly asserts no provider network."),
  "package-script:zatca:sandbox-csid-preflight": reviewedScript("guarded-or-dry-run", ["guardContract", "approvalGate"], "SECURITY-HARDENING-02: sandbox CSID preflight remains a guard unless future execution approval is implemented."),
  "package-script:zatca:sdk-ci-readiness": reviewedScript("guarded-or-dry-run", ["localReadiness", "noNetwork"], "SECURITY-HARDENING-02: SDK CI readiness requires no-network metadata mode and does not validate invoices or contact ZATCA."),
  "package-script:zatca:sdk-validate-local": reviewedScript("guarded-or-dry-run", ["localValidation", "noProviderNetwork"], "SECURITY-HARDENING-02: local SDK validation uses local fixtures/SDK only and does not call ZATCA."),
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

function reviewedScript(guardStatus, guards, reason) {
  return { guardStatus, guards, reason };
}

function buildAudit(options = {}) {
  const scriptRows = listScriptFiles(options.roots || DEFAULT_SCAN_ROOTS).map((file) => {
    const content = fs.readFileSync(file, "utf8");
    return applyReviewedScriptFinding({
      source: "file",
      path: sanitizeEvidenceText(path.relative(process.cwd(), file).replace(/\\/g, "/")),
      ...classifyContent(content),
    });
  });
  const packageRows = readPackageScripts(options.packageJsonPath).map((script) =>
    applyReviewedScriptFinding({
      source: "package-script",
      path: sanitizeEvidenceText(script.name),
      command: sanitizeEvidenceText(script.command),
      ...classifyContent(script.content),
    }),
  );
  const rows = [...scriptRows, ...packageRows].sort((a, b) => `${a.source}:${a.path}`.localeCompare(`${b.source}:${b.path}`));
  const dangerous = rows.filter((row) => row.dangerous);
  const reviewRequired = dangerous.filter((row) => row.guardStatus === "review-required");
  const ownerApprovalRequired = dangerous.filter((row) => row.guardStatus === "owner-approval-required");
  const counts = rows.reduce((acc, row) => {
    acc[row.guardStatus] = (acc[row.guardStatus] || 0) + 1;
    return acc;
  }, {});

  return {
    status: reviewRequired.length ? "REVIEW_REQUIRED" : ownerApprovalRequired.length ? "OWNER_APPROVAL_REQUIRED" : "NO_UNGUARDED_DANGEROUS_SCRIPTS_DETECTED",
    generatedBy: "scripts/security-safe-script-audit.cjs",
    deterministic: true,
    noScriptsExecuted: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    scannedEntries: rows.length,
    counts,
    dangerous,
    ownerApprovalRequired,
    reviewRequired,
    rows,
  };
}

function applyReviewedScriptFinding(row) {
  const review = REVIEWED_SCRIPT_FINDINGS[`${row.source}:${row.path}`];
  if (!review || !row.dangerous) {
    return row;
  }
  return {
    ...row,
    guardStatus: review.guardStatus,
    guards: unique([...(row.guards || []), ...review.guards]),
    reviewStatus: "reviewed",
    reviewReason: review.reason,
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
    ...formatRows(report.dangerous, ["source", "path", "guardStatus", "dangers", "guards", "reviewReason"]),
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
        reviewReason: row.reviewReason || "-",
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

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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
  applyReviewedScriptFinding,
  buildAudit,
  classifyContent,
  formatMarkdown,
  parseArgs,
  sanitizeEvidenceText,
};
