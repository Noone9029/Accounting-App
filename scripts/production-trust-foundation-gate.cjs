#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATUS_PLANNING_ONLY = "PRODUCTION_TRUST_FOUNDATION_PLANNING_ONLY";
const STATUS_STRICT_PASSED = "PRODUCTION_TRUST_FOUNDATION_GATE_PASSED_WITH_BLOCKERS";
const STATUS_BLOCKED = "PRODUCTION_TRUST_FOUNDATION_GATE_BLOCKED";

const REQUIRED_DOCS = [
  { path: "README.md", label: "README posture" },
  { path: "docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md", label: "production trust audit" },
  { path: "docs/production/LAUNCH_GATE_CHECKLIST.md", label: "launch gate checklist" },
  { path: "docs/BACKUP_AND_RESTORE_READINESS_PLAN.md", label: "backup and restore plan" },
  { path: "docs/production/PRODUCTION_FOUNDATION_ROADMAP.md", label: "production foundation roadmap" },
  { path: "docs/production/PAID_SAAS_V1_GAP_MATRIX.md", label: "paid SaaS v1 gap matrix" },
  { path: "docs/deployment/SUPABASE_SECURITY_REVIEW.md", label: "Supabase security review" },
  { path: "docs/deployment/SUPABASE_RLS_REVIEW_20260519.md", label: "Supabase RLS review" },
  { path: "docs/deployment/SUPABASE_RLS_DATA_API_HARDENING_20260521.md", label: "Supabase RLS/Data API hardening review" },
  { path: "docs/deployment/VERCEL_USER_TESTING_DEPLOYMENT_RUNBOOK.md", label: "Vercel user-testing deployment runbook" },
];

const OPTIONAL_CLAIM_SCAN_DOCS = [
  "CODEX_HANDOFF.md",
  "BUG_AUDIT.md",
  "docs/PRODUCT_READINESS_SCORECARD.md",
  "docs/IMPLEMENTATION_STATUS.md",
  "docs/REMAINING_ROADMAP.md",
  "docs/product/FEATURE_PARITY_COMMAND_CENTER.md",
];

const AUDIT_DOMAIN_HEADINGS = [
  "## 1. Storage/object storage",
  "## 2. Generated document storage",
  "## 3. Attachment storage",
  "## 4. Backup/PITR",
  "## 5. Restore proof",
  "## 6. Monitoring/alerting",
  "## 7. Runtime logs/error visibility",
  "## 8. Health/readiness endpoints",
  "## 9. Email provider readiness",
  "## 10. Tenant isolation/RLS/runtime DB role",
  "## 11. Auth/session/MFA posture",
  "## 12. Audit immutability/export",
  "## 13. Billing/legal/support ownership",
  "## 14. Launch gate status",
];

const README_REQUIRED_PATTERNS = [
  { id: "README_CONTROLLED_BETA", pattern: /controlled-beta|controlled beta/i, message: "README must keep controlled beta wording." },
  { id: "README_USER_TESTING_ONLY", pattern: /beta\/user-testing only|user-testing only/i, message: "README must say the current deployment is beta/user-testing only." },
  {
    id: "README_FINAL_HOSTING_SEPARATE",
    pattern: /final production hosting is (?:a )?separate|not final production hosting/i,
    message: "README must distinguish beta/user-testing deployment from final production hosting.",
  },
];

const AUDIT_REQUIRED_PATTERNS = [
  { id: "AUDIT_CONTROLLED_BETA_ONLY", pattern: /controlled beta\/user-testing only/i, message: "Audit must restate controlled beta posture." },
  { id: "AUDIT_NOT_PRODUCTION_READY", pattern: /not production-ready/i, message: "Audit must state not production-ready." },
  { id: "AUDIT_NOT_PAID_SAAS_READY", pattern: /not paid SaaS ready/i, message: "Audit must state not paid SaaS ready." },
  { id: "AUDIT_NOT_VAT_READY", pattern: /not official VAT filing ready/i, message: "Audit must state not official VAT filing ready." },
  { id: "AUDIT_NOT_ZATCA_COMPLIANT", pattern: /not ZATCA compliant/i, message: "Audit must state not ZATCA compliant." },
  {
    id: "AUDIT_FINAL_HOSTING_SEPARATE",
    pattern: /Vercel remains beta\/user-testing only; final production hosting remains separate/i,
    message: "Audit must distinguish Vercel beta/user-testing from final production hosting.",
  },
  { id: "AUDIT_RESTORE_PROOF_MISSING", pattern: /restore proof remains missing/i, message: "Audit must say restore proof remains missing." },
  {
    id: "AUDIT_OBJECT_STORAGE_RESTORE_PROOF_MISSING",
    pattern: /object-storage restore proof remains missing/i,
    message: "Audit must say object-storage restore proof remains missing.",
  },
  {
    id: "AUDIT_MONITORING_MISSING",
    pattern: /monitoring\/alerting remains missing/i,
    message: "Audit must say monitoring/alerting remains missing.",
  },
  {
    id: "AUDIT_MFA_MISSING",
    pattern: /MFA\/session hardening remains missing/i,
    message: "Audit must say MFA/session hardening remains missing.",
  },
  {
    id: "AUDIT_BILLING_SUPPORT_MISSING",
    pattern: /billing\/legal\/support ownership remains missing/i,
    message: "Audit must say billing/legal/support ownership remains missing.",
  },
];

const LAUNCH_GATE_REQUIRED_PATTERNS = [
  { id: "LAUNCH_HOSTED_BACKUP_BLOCKED", pattern: /Hosted backup\/PITR proof\s*\|\s*blocked/i, message: "Launch gate must show hosted backup/PITR proof blocked." },
  { id: "LAUNCH_OBJECT_STORAGE_BLOCKED", pattern: /Object storage proof\s*\|\s*blocked/i, message: "Launch gate must show object storage proof blocked." },
  { id: "LAUNCH_MONITORING_NOT_STARTED", pattern: /Monitoring and alerting\s*\|\s*not started/i, message: "Launch gate must show monitoring and alerting not started." },
  { id: "LAUNCH_SECURITY_BLOCKED", pattern: /Security review\s*\|\s*blocked/i, message: "Launch gate must show security review blocked." },
  { id: "LAUNCH_BILLING_NOT_STARTED", pattern: /Billing\/legal\s*\|\s*not started/i, message: "Launch gate must show billing/legal not started." },
];

const HOSTING_DISTINCTION_PATTERNS = [
  {
    id: "ROADMAP_FINAL_HOSTING_SEPARATE",
    path: "docs/production/PRODUCTION_FOUNDATION_ROADMAP.md",
    pattern: /beta\/user-testing environment only, not final production hosting/i,
    message: "Production roadmap must keep beta/user-testing and final hosting separate.",
  },
  {
    id: "GAP_MATRIX_FINAL_HOSTING_SEPARATE",
    path: "docs/production/PAID_SAAS_V1_GAP_MATRIX.md",
    pattern: /deployment surface only, not final production hosting/i,
    message: "Gap matrix must keep beta/user-testing and final hosting separate.",
  },
];

const REMAINING_TRUST_BLOCKERS = [
  "Hosted restore proof remains missing.",
  "Object-storage restore proof remains missing.",
  "Monitoring/alerting remains missing.",
  "MFA/session hardening remains missing.",
  "Billing/legal/support ownership remains missing.",
];

const FORBIDDEN_CLAIM_RULES = [
  {
    id: "FORBIDDEN_PRODUCTION_READY",
    label: "production-ready claim",
    pattern: /\bproduction-ready\b/i,
    allow: [/\bnot production-ready\b/i, /\bdoes not mean\b.*\bproduction-ready\b/i, /\bforbidden claims such as\b.*\bproduction-ready\b/i],
  },
  {
    id: "FORBIDDEN_PAID_SAAS_READY",
    label: "paid SaaS ready claim",
    pattern: /\bpaid SaaS ready\b/i,
    allow: [/\bnot paid SaaS ready\b/i, /\bdoes not mean\b.*\bpaid SaaS ready\b/i, /\bforbidden claims such as\b.*\bpaid SaaS ready\b/i],
  },
  {
    id: "FORBIDDEN_OFFICIAL_VAT_READY",
    label: "official VAT filing ready claim",
    pattern: /\bofficial VAT filing ready\b/i,
    allow: [/\bnot official VAT filing ready\b/i, /\bdoes not mean\b.*\bofficial VAT filing ready\b/i, /\bforbidden claims such as\b.*\bofficial VAT filing ready\b/i],
  },
  {
    id: "FORBIDDEN_ZATCA_COMPLIANT",
    label: "ZATCA compliant claim",
    pattern: /\bZATCA compliant\b/i,
    allow: [/\bnot ZATCA compliant\b/i, /\bdoes not mean\b.*\bZATCA compliant\b/i, /\bforbidden claims such as\b.*\bZATCA compliant\b/i],
  },
  {
    id: "FORBIDDEN_PRODUCTION_HOSTING_COMPLETE",
    label: "production hosting complete claim",
    pattern: /\bproduction hosting complete\b/i,
    allow: [/\bforbidden claims such as\b.*\bproduction hosting complete\b/i],
  },
  {
    id: "FORBIDDEN_RESTORE_PROOF_COMPLETE",
    label: "restore proof complete claim",
    pattern: /\brestore proof complete\b/i,
    allow: [/\bforbidden claims such as\b.*\brestore proof complete\b/i],
  },
  {
    id: "FORBIDDEN_OBJECT_STORAGE_PROOF_COMPLETE",
    label: "object storage proof complete claim",
    pattern: /\bobject[- ]storage (?:restore )?proof complete\b/i,
    allow: [/\bforbidden claims such as\b.*\bobject storage proof complete\b/i],
  },
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    strict: false,
    plan: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--plan") {
      parsed.plan = true;
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
    "  node scripts/production-trust-foundation-gate.cjs --json",
    "  node scripts/production-trust-foundation-gate.cjs --json --strict",
    "  node scripts/production-trust-foundation-gate.cjs --plan",
    "",
    "This gate reads repository docs only.",
    "It makes no network calls, no database calls, no provider API calls, no env-secret reads, no storage operations, no email sends, and no ZATCA execution.",
  ].join("\n");
}

function buildProductionTrustFoundationGate(options = {}) {
  const repoRoot = resolveRepoRoot(options.repoRoot || options.cwd || process.cwd());
  const blockers = [];
  const warnings = [];
  const checks = [];
  const texts = new Map();

  for (const doc of REQUIRED_DOCS) {
    const exists = fileExists(repoRoot, doc.path);
    checks.push({
      id: `DOC_EXISTS:${doc.path}`,
      label: `Required doc exists: ${doc.label}`,
      passed: exists,
      path: doc.path,
    });
    if (!exists) {
      blockers.push(`BLOCKED_REQUIRED_DOC_MISSING: ${doc.path}`);
      continue;
    }
    texts.set(doc.path, readFile(repoRoot, doc.path));
  }

  const auditText = texts.get("docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md") || "";
  for (const heading of AUDIT_DOMAIN_HEADINGS) {
    const passed = auditText.includes(heading);
    checks.push({
      id: `AUDIT_HEADING:${heading}`,
      label: `Audit includes heading ${heading.replace(/^##\s*/, "")}`,
      passed,
      path: "docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md",
    });
    if (!passed) {
      blockers.push(`BLOCKED_AUDIT_HEADING_MISSING: ${heading}`);
    }
  }

  runPatternChecks({
    blockers,
    checks,
    text: texts.get("README.md") || "",
    path: "README.md",
    patterns: README_REQUIRED_PATTERNS,
  });

  runPatternChecks({
    blockers,
    checks,
    text: auditText,
    path: "docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md",
    patterns: AUDIT_REQUIRED_PATTERNS,
  });

  runPatternChecks({
    blockers,
    checks,
    text: texts.get("docs/production/LAUNCH_GATE_CHECKLIST.md") || "",
    path: "docs/production/LAUNCH_GATE_CHECKLIST.md",
    patterns: LAUNCH_GATE_REQUIRED_PATTERNS,
  });

  for (const item of HOSTING_DISTINCTION_PATTERNS) {
    const text = texts.get(item.path) || "";
    const passed = item.pattern.test(text);
    checks.push({
      id: item.id,
      label: item.message,
      passed,
      path: item.path,
    });
    if (!passed) {
      blockers.push(`BLOCKED_REQUIRED_PHRASE_MISSING: ${item.path}: ${item.id}`);
    }
  }

  const forbiddenClaims = scanForbiddenClaims(repoRoot, texts);
  for (const claim of forbiddenClaims) {
    blockers.push(`BLOCKED_FORBIDDEN_CLAIM: ${claim.id}: ${claim.path}:${claim.line}`);
  }

  const packageScriptChecks = inspectPackageScripts(repoRoot);
  for (const item of packageScriptChecks.checks) {
    checks.push(item);
    if (!item.passed) {
      blockers.push(`BLOCKED_PACKAGE_SCRIPT_INVALID: ${item.id}`);
    }
  }

  if (packageScriptChecks.foundAny && packageScriptChecks.valid) {
    warnings.push("Package scripts are present and point at the production trust gate/test files.");
  }

  const status =
    blockers.length > 0 ? STATUS_BLOCKED : options.strict ? STATUS_STRICT_PASSED : STATUS_PLANNING_ONLY;

  return {
    status,
    strictMode: Boolean(options.strict),
    planMode: Boolean(options.plan),
    repoRoot,
    readOnly: true,
    noMutation: true,
    networkAccessAttempted: false,
    databaseAccessAttempted: false,
    envSecretReadsAttempted: false,
    fileWritesAttempted: false,
    storageAccessAttempted: false,
    emailSendsAttempted: false,
    zatcaExecutionAttempted: false,
    requiredDocs: REQUIRED_DOCS.map((doc) => ({
      path: doc.path,
      label: doc.label,
      exists: fileExists(repoRoot, doc.path),
    })),
    checks,
    blockers: unique(blockers),
    warnings: unique(warnings),
    remainingTrustBlockers: [...REMAINING_TRUST_BLOCKERS],
    forbiddenClaims,
    packageScripts: packageScriptChecks.summary,
    plannedChecks: plannedChecks(),
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    return {
      foundAny: false,
      valid: true,
      checks: [],
      summary: {
        foundAny: false,
        valid: true,
      },
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch (error) {
    return {
      foundAny: false,
      valid: false,
      checks: [
        {
          id: "PACKAGE_JSON_PARSE",
          label: "package.json parses",
          passed: false,
          path: "package.json",
        },
      ],
      summary: {
        foundAny: false,
        valid: false,
      },
    };
  }

  const scripts = parsed.scripts && typeof parsed.scripts === "object" ? parsed.scripts : {};
  const expected = {
    "production:trust-foundation-gate": "node scripts/production-trust-foundation-gate.cjs",
    "test:production-trust-foundation-gate": "node --test scripts/production-trust-foundation-gate.test.cjs",
  };

  const checks = [
    {
      id: "PACKAGE_JSON_PARSE",
      label: "package.json parses",
      passed: true,
      path: "package.json",
    },
  ];

  let foundAny = false;
  let valid = true;
  for (const [name, command] of Object.entries(expected)) {
    if (Object.prototype.hasOwnProperty.call(scripts, name)) {
      foundAny = true;
      const passed = scripts[name] === command;
      checks.push({
        id: `PACKAGE_SCRIPT:${name}`,
        label: `package script ${name} points at the expected command`,
        passed,
        path: "package.json",
      });
      if (!passed) {
        valid = false;
      }
    }
  }

  if (foundAny) {
    for (const name of Object.keys(expected)) {
      if (!Object.prototype.hasOwnProperty.call(scripts, name)) {
        checks.push({
          id: `PACKAGE_SCRIPT:${name}`,
          label: `package script ${name} is present when the production-trust scripts are added`,
          passed: false,
          path: "package.json",
        });
        valid = false;
      }
    }
  }

  return {
    foundAny,
    valid,
    checks,
    summary: {
      foundAny,
      valid,
    },
  };
}

function runPatternChecks({ blockers, checks, text, path: docPath, patterns }) {
  for (const item of patterns) {
    const passed = item.pattern.test(text);
    checks.push({
      id: item.id,
      label: item.message,
      passed,
      path: docPath,
    });
    if (!passed) {
      blockers.push(`BLOCKED_REQUIRED_PHRASE_MISSING: ${docPath}: ${item.id}`);
    }
  }
}

function scanForbiddenClaims(repoRoot, requiredTexts) {
  const findings = [];
  const scanPaths = [...REQUIRED_DOCS.map((item) => item.path), ...OPTIONAL_CLAIM_SCAN_DOCS].filter((value, index, all) => all.indexOf(value) === index);
  for (const relativePath of scanPaths) {
    if (!fileExists(repoRoot, relativePath)) {
      continue;
    }
    const text = requiredTexts.get(relativePath) || readFile(repoRoot, relativePath);
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const rule of FORBIDDEN_CLAIM_RULES) {
        if (!rule.pattern.test(line)) {
          continue;
        }
        if (rule.allow.some((pattern) => pattern.test(line))) {
          continue;
        }
        findings.push({
          id: rule.id,
          label: rule.label,
          path: relativePath,
          line: index + 1,
          excerpt: line.trim(),
        });
      }
    }
  }
  return findings;
}

function plannedChecks() {
  return [
    "Verify required production trust docs exist.",
    "Verify README still states controlled beta/user-testing only.",
    "Verify the audit doc preserves the non-production verdict and missing trust blockers.",
    "Verify launch-gate and roadmap docs still keep Vercel beta/user-testing separate from final production hosting.",
    "Scan core posture docs for forbidden positive claims such as production-ready, paid SaaS ready, official VAT filing ready, ZATCA compliant, production hosting complete, restore proof complete, and object-storage proof complete.",
    "If package scripts are present, verify they point at the production trust gate files.",
  ];
}

function formatGateReport(result) {
  const lines = [
    `status: ${result.status}`,
    `strictMode: ${result.strictMode}`,
    `planMode: ${result.planMode}`,
    `readOnly: ${result.readOnly}`,
    `noMutation: ${result.noMutation}`,
    "",
    "Remaining trust blockers:",
    ...result.remainingTrustBlockers.map((item) => `- ${item}`),
  ];

  if (result.blockers.length > 0) {
    lines.push("", "Static gate blockers:", ...result.blockers.map((item) => `- ${item}`));
  } else {
    lines.push("", "Static gate blockers:", "- none");
  }

  if (result.planMode) {
    lines.push("", "Planned checks:", ...result.plannedChecks.map((item) => `- ${item}`));
  }

  return lines.join("\n");
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

function fileExists(repoRoot, relativePath) {
  return fs.existsSync(path.join(repoRoot, ...normalizeRelativePath(relativePath).split("/")));
}

function readFile(repoRoot, relativePath) {
  return fs.readFileSync(path.join(repoRoot, ...normalizeRelativePath(relativePath).split("/")), "utf8");
}

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function unique(values) {
  return [...new Set(values)];
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (parsed.help) {
    console.log(usage());
    return;
  }

  const result = buildProductionTrustFoundationGate({
    cwd: process.cwd(),
    strict: parsed.strict,
    plan: parsed.plan,
  });

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatGateReport(result));
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
  STATUS_PLANNING_ONLY,
  STATUS_STRICT_PASSED,
  REQUIRED_DOCS,
  AUDIT_DOMAIN_HEADINGS,
  README_REQUIRED_PATTERNS,
  AUDIT_REQUIRED_PATTERNS,
  LAUNCH_GATE_REQUIRED_PATTERNS,
  HOSTING_DISTINCTION_PATTERNS,
  REMAINING_TRUST_BLOCKERS,
  FORBIDDEN_CLAIM_RULES,
  parseArgs,
  usage,
  buildProductionTrustFoundationGate,
  inspectPackageScripts,
  scanForbiddenClaims,
  formatGateReport,
  resolveRepoRoot,
  plannedChecks,
};
