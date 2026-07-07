#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATUS_PASSED = "SUPPORT_EMAIL_READINESS_PROOF_PASSED";
const STATUS_BLOCKED = "SUPPORT_EMAIL_READINESS_PROOF_BLOCKED";

const REQUIRED_PACKAGE_SCRIPTS = {
  "support:email-readiness-proof": "node scripts/support-email-readiness-proof.cjs",
  "test:support-email-readiness-proof": "node --test scripts/support-email-readiness-proof.test.cjs",
  "monitoring:support-readiness": "node scripts/monitoring-support-readiness.cjs",
  "test:monitoring-support-readiness": "node --test scripts/monitoring-support-readiness.test.cjs",
};

const REQUIRED_SURFACES = [
  {
    id: "email-controller-guards",
    path: "apps/api/src/email/email.controller.ts",
    requiredText: [
      "@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)",
      '@Get("readiness")',
      '@Get("diagnostics-plan")',
      '@Post("diagnostics")',
      '@Get("retry-worker/plan")',
      '@Get("monitoring-plan")',
      '@Get("provider-events/webhook-plan")',
      '@Post("provider-events/webhook")',
      '@Get("outbox")',
    ],
  },
  {
    id: "email-readiness-service",
    path: "apps/api/src/email/email.service.ts",
    requiredText: [
      "noCustomerEmailSent: true",
      "readOnly: true",
      "noMutation: true",
      "productionReady: productionBlockers.length === 0",
      "redactionGuarantees: EMAIL_REDACTION_GUARANTEES",
      "Email provider readiness blockers must be resolved before production delivery.",
    ],
  },
  {
    id: "email-safety-service-tests",
    path: "apps/api/src/email/email.service.spec.ts",
    requiredText: [
      "returns provider readiness without secrets",
      "returns production SMTP readiness blockers without sending email",
      "builds a diagnostics plan without sending email or mutating outbox",
      "skips diagnostics by default without sending or mutating",
      "builds a retry plan without sending email or mutating outbox",
      "builds a scheduled retry worker plan without sending email or mutating data",
      "stores monitoring evidence as metadata only and rejects secrets or customer recipients",
      "rejects sender-domain evidence that contains private keys or provider secrets",
    ],
  },
  {
    id: "email-delivery-architecture",
    path: "docs/email/EMAIL_DELIVERY_ARCHITECTURE.md",
    requiredText: [
      "Real provider delivery remains disabled by default.",
      "The endpoint is read-only/no-mutation and does not send email.",
      "Production readiness remains blocked until SMTP configuration",
      "Default `LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED=false`",
      "`GET /email/retry-worker/plan` is read-only/no-mutation and sends no email.",
      "`POST /email/retry-worker/run` is disabled by default",
      "`GET /email/provider-events/webhook-plan` returns a read-only/no-mutation signed-webhook plan.",
      "`POST /email/provider-events/webhook` is verification-gated.",
      "The evidence workflow sends no email, creates no outbox record, performs no external monitoring call",
    ],
  },
  {
    id: "email-api-catalog",
    path: "docs/API_CATALOG.md",
    requiredText: [
      "GET | `/email/readiness`",
      "GET | `/email/diagnostics-plan`",
      "POST | `/email/diagnostics`",
      "GET | `/email/retry-worker/plan`",
      "GET | `/email/provider-events/webhook-plan`",
      "POST | `/email/provider-events/webhook`",
      "POST | `/email/test-send`",
      "GET | `/email/outbox`",
      "tenant scoped",
    ],
  },
  {
    id: "support-triage-runbook",
    path: "docs/operations/SUPPORT_TRIAGE_RUNBOOK.md",
    requiredText: [
      "Cross-tenant exposure, secret leak, data loss, unsafe production/compliance/provider claim",
      "Ask for redacted screenshots only.",
      "Do not store passwords, tokens, cookies, auth headers",
      "Do not ask for passwords or secrets.",
      "Do not mutate customer data outside an approved remediation path.",
    ],
  },
  {
    id: "incident-response-runbook",
    path: "docs/operations/INCIDENT_RESPONSE_RUNBOOK.md",
    requiredText: [
      "Data loss, cross-tenant exposure, payment/compliance false claim, or total outage.",
      "Stop any risky mutation path if data integrity is uncertain.",
      "Do not promise compliance/production status.",
      "Do not run migrations, seed/reset/delete commands, provider calls, email sends",
      "Treat as SEV-1.",
    ],
  },
  {
    id: "controlled-beta-support-checklist",
    path: "docs/operations/CONTROLLED_BETA_SUPPORT_CHECKLIST.md",
    requiredText: [
      "Confirm support owner, engineering escalation owner, accounting escalation owner, security escalation owner, and compliance escalation owner.",
      "Review email/outbox complaints without sending email unless explicitly approved.",
      "Record incident evidence as sanitized metadata.",
      "Confirmed or suspected cross-tenant exposure.",
      "Support SLA tooling is not active; current response targets are controlled-beta drafts.",
    ],
  },
  {
    id: "support-response-templates",
    path: "docs/operations/SUPPORT_RESPONSE_TEMPLATES.md",
    requiredText: [
      "Please avoid sending passwords, tokens, API keys, private document bodies, raw bank files, or full customer data",
      "Can you send the route, approximate time, browser/device, expected behavior, actual behavior, and a redacted screenshot",
      "Email delivery appears delayed or blocked.",
      "We are checking readiness and outbox metadata only.",
      "We will not force-send or resend messages without explicit approval.",
    ],
  },
  {
    id: "monitoring-support-readiness-plan",
    path: "docs/operations/MONITORING_AND_SUPPORT_READINESS_PLAN.md",
    requiredText: [
      "No customer-support automation or real email sending enabled.",
      "Command: `corepack pnpm monitoring:support-readiness`",
      "Test: `corepack pnpm test:monitoring-support-readiness`",
      "The diagnostic is deterministic and source/docs-only.",
      "does not start the app server, connect to a database, call a network endpoint, send email, call providers",
      "No production alerts created.",
    ],
  },
  {
    id: "monitoring-support-readiness-evidence",
    path: "docs/operations/evidence/MONITORING_SUPPORT_READINESS.md",
    requiredText: [
      "No database connection.",
      "No network calls.",
      "No mutation.",
      "No email sent.",
      "No provider call.",
      "No object storage or signed URL operation.",
      "Payload body/secrets/provider responses/customer data: not included.",
    ],
  },
  {
    id: "monitoring-support-readiness-script",
    path: "scripts/monitoring-support-readiness.cjs",
    requiredText: [
      "noDatabaseConnection: true",
      "noNetwork: true",
      "noMutation: true",
      "noEmailSend: true",
      "noProviderCall: true",
      "noStorageOperation: true",
      "Email readiness diagnostics exist",
      "Support triage runbook exists",
      "Incident response runbook exists",
    ],
  },
];

const REMAINING_GAPS = [
  "No production support SLA tooling is active.",
  "No production monitoring provider, log drain, status page, or ticketing automation is configured by this proof.",
  "Real SMTP/provider delivery remains disabled unless separately configured and approved.",
  "Provider-specific production webhook adapters and external email alert integrations remain future work.",
  "Hosted staging support behavior and real provider behavior require separate owner-approved packets.",
];

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      parsed.json = true;
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
    "  node scripts/support-email-readiness-proof.cjs --json",
    "",
    "This verifier checks committed support/email readiness docs, tests, and root script wiring only.",
    "It does not read env secrets, connect to databases, call networks, run hosted migrations, run hosted mutations, send email, call providers, create support tickets, call storage APIs, or execute cleanup.",
  ].join("\n");
}

function buildSupportEmailReadinessProof(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const packageChecks = inspectPackageScripts(repoRoot);
  const surfaceChecks = inspectRequiredSurfaces(repoRoot);
  const blockers = [];

  for (const check of packageChecks.checks) {
    if (!check.passed) {
      blockers.push(`BLOCKED_PACKAGE_SCRIPT_INVALID: ${check.id}`);
    }
  }

  for (const check of surfaceChecks.checks) {
    if (!check.passed) {
      blockers.push(`BLOCKED_SURFACE_INVALID: ${check.id}`);
    }
  }

  const status = blockers.length > 0 ? STATUS_BLOCKED : STATUS_PASSED;

  return {
    status,
    repoRoot,
    metadataOnly: true,
    localStaticOnly: true,
    packageScriptsChecked: true,
    proofSurfacesChecked: true,
    envSecretsRead: false,
    secretsPrinted: false,
    customerDataUsed: false,
    networkCallsMade: false,
    databaseConnectionsMade: false,
    hostedMutationsMade: false,
    hostedMigrationsRun: false,
    cleanupExecuteRun: false,
    emailSent: false,
    providerCallsMade: false,
    supportTicketCreated: false,
    storageProviderTouched: false,
    zatcaNetworkCallsMade: false,
    uaeAspNetworkCallsMade: false,
    packageScripts: packageChecks,
    proofSurfaces: surfaceChecks,
    blockers,
    remainingGaps: REMAINING_GAPS,
    recommendedNextPrompt:
      "Codex, review the support/email readiness proof PR for owner-review readiness only. Confirm it is local/static only, checks committed support/email docs, tests, and package wiring, runs no hosted operations, sends no email, calls no providers, exposes no secrets, and leaves runtime/accounting/schema/UI behavior unchanged.",
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  const checks = [];
  let scripts = {};

  try {
    scripts = JSON.parse(fs.readFileSync(packagePath, "utf8")).scripts || {};
  } catch (error) {
    return {
      checked: false,
      checks: Object.keys(REQUIRED_PACKAGE_SCRIPTS).map((id) => ({
        id,
        passed: false,
        reason: `Unable to read package.json: ${error.message}`,
        valuePrinted: false,
      })),
    };
  }

  for (const [id, expected] of Object.entries(REQUIRED_PACKAGE_SCRIPTS)) {
    const actual = scripts[id];
    checks.push({
      id,
      passed: actual === expected,
      reason: actual === expected ? "Package script matches expected command." : "Package script is missing or differs from the expected command.",
      valuePrinted: false,
    });
  }

  return {
    checked: true,
    checks,
  };
}

function inspectRequiredSurfaces(repoRoot) {
  return {
    checked: true,
    checks: REQUIRED_SURFACES.map((surface) => inspectSurface(repoRoot, surface)),
  };
}

function inspectSurface(repoRoot, surface) {
  const fullPath = path.join(repoRoot, ...surface.path.split("/"));
  if (!isWithinDirectory(repoRoot, fullPath)) {
    return {
      id: surface.id,
      path: surface.path,
      passed: false,
      exists: false,
      missingText: surface.requiredText,
      reason: "Surface path resolves outside the repository.",
      valuePrinted: false,
    };
  }

  if (!fs.existsSync(fullPath)) {
    return {
      id: surface.id,
      path: surface.path,
      passed: false,
      exists: false,
      missingText: surface.requiredText,
      reason: "Required proof surface is missing.",
      valuePrinted: false,
    };
  }

  const text = fs.readFileSync(fullPath, "utf8");
  const missingText = surface.requiredText.filter((required) => !text.includes(required));

  return {
    id: surface.id,
    path: surface.path,
    passed: missingText.length === 0,
    exists: true,
    missingText,
    reason: missingText.length === 0 ? "Required support/email readiness text is present." : "Required support/email readiness text is missing.",
    valuePrinted: false,
  };
}

function formatText(result) {
  return [
    `Support/email readiness proof: ${result.status}`,
    `Metadata only: ${result.metadataOnly}`,
    `Local/static only: ${result.localStaticOnly}`,
    `No network calls: ${!result.networkCallsMade}`,
    `No database connections: ${!result.databaseConnectionsMade}`,
    `No hosted mutations: ${!result.hostedMutationsMade}`,
    `No hosted migrations: ${!result.hostedMigrationsRun}`,
    `No cleanup execute: ${!result.cleanupExecuteRun}`,
    `No email sent: ${!result.emailSent}`,
    `No provider calls: ${!result.providerCallsMade}`,
    `No support tickets created: ${!result.supportTicketCreated}`,
    `No secrets printed: ${!result.secretsPrinted}`,
    "",
    "Package scripts:",
    ...result.packageScripts.checks.map((check) => `- ${check.passed ? "pass" : "block"}: ${check.id} - ${check.reason}`),
    "",
    "Proof surfaces:",
    ...result.proofSurfaces.checks.map((check) => `- ${check.passed ? "pass" : "block"}: ${check.id} - ${check.reason}`),
    "",
    "Blockers:",
    ...(result.blockers.length ? result.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
    "Remaining gaps:",
    ...result.remainingGaps.map((gap) => `- ${gap}`),
  ].join("\n");
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

function isWithinDirectory(parentDir, candidatePath) {
  const parent = path.resolve(parentDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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

  const result = buildSupportEmailReadinessProof({ cwd: process.cwd() });
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
  STATUS_BLOCKED,
  STATUS_PASSED,
  REQUIRED_PACKAGE_SCRIPTS,
  REQUIRED_SURFACES,
  buildSupportEmailReadinessProof,
  formatText,
  inspectPackageScripts,
  inspectRequiredSurfaces,
  parseArgs,
  usage,
};
