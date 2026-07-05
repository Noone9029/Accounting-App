#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const STATUS_READY = "HOSTED_STAGING_TENANT_PACKET_READY";
const STATUS_BLOCKED = "HOSTED_STAGING_TENANT_PACKET_BLOCKED";

const REQUIRED_PACKET_PATH = "HOSTED_STAGING_TENANT_PROOF_PACKET.md";
const REQUIRED_CHECKLIST_PATH = "HOSTED_STAGING_TENANT_PROOF_EXECUTION_CHECKLIST.md";

const REQUIRED_PACKET_PATTERNS = [
  ["staging URL field", /Staging URL/i],
  ["proof-run ID field", /Proof-run ID/i],
  ["synthetic tenant A ID field", /Synthetic tenant A ID/i],
  ["synthetic tenant B ID field", /Synthetic tenant B ID/i],
  ["synthetic user auth method field", /Synthetic user\/auth method/i],
  ["bearer token env var name", /LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN/],
  ["approved GET-only endpoint list", /Approved GET-Only Endpoint List/],
  ["forbidden endpoints and methods", /Forbidden Endpoints And Methods/],
  ["redaction rules", /Redaction Rules/],
  ["evidence owner field", /Evidence owner/i],
  ["stop conditions", /Stop Conditions/],
  ["rollback contact owner field", /Rollback\/contact owner/i],
  ["exact execution command", /--mode staging-read-only-probe/],
  ["evidence output format", /Evidence Output Format/],
  ["no hosted migrations closeout", /No hosted migrations were run/i],
  ["no hosted mutations closeout", /No hosted mutations were run/i],
  ["no cleanup execute closeout", /No cleanup execute was run/i],
  ["no provider storage API closeout", /No provider or storage API was called/i],
  ["no customer data closeout", /No real customer data was used/i],
];

const REQUIRED_CHECKLIST_PATTERNS = [
  ["packet values present check", /all previous check is complete|Packet Completeness/i],
  ["staging beta URL check", /staging, beta, sandbox, test, or dedicated proof/i],
  ["token out-of-band check", /supplied out of band/i],
  ["GET-only endpoints check", /approved endpoint list contains only `GET`/i],
  ["no mutation methods check", /No `POST`, `PATCH`, `PUT`, or `DELETE`/i],
  ["no hosted migrations check", /No hosted migrations are allowed/i],
  ["no cleanup execute check", /No `security:cleanup -- --execute`/i],
  ["sanitized evidence check", /Evidence Sanitization/i],
  ["missing input stop check", /Any packet value is missing/i],
  ["unsafe URL stop check", /URL is unsafe/i],
  ["missing token stop check", /bearer token is missing/i],
  ["cross-tenant success stop check", /Tenant B dashboard returns `2xx`/i],
];

const FORBIDDEN_PATTERNS = [
  ["raw bearer token assignment", /LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN\s*=\s*['"][^<'"][^'"]{12,}['"]/i],
  ["database URL", /\b(?:DATABASE_URL|DIRECT_URL)=postgres(?:ql)?:\/\//i],
  ["private key", /BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY/i],
  ["service role", /SUPABASE_SERVICE_ROLE|service_role/i],
  ["cleanup execute invocation", /\b(?:corepack\s+pnpm|pnpm|npm|yarn)\s+security:cleanup\s+--\s+--execute/i],
];

function parseArgs(argv) {
  const options = {
    json: false,
    strict: false,
    repoRoot: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    if (arg === "--repo-root") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--repo-root requires a value.");
      }
      options.repoRoot = value;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--") {
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/hosted-staging-tenant-proof-packet-validate.cjs --json --strict",
    "",
    "Validates committed hosted staging tenant proof packet/checklist text only.",
    "It performs no network calls, hosted proof execution, hosted mutations, hosted migrations, or cleanup.",
  ].join("\n");
}

function validateHostedStagingTenantProofPacket(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const files = [
    { path: REQUIRED_PACKET_PATH, requiredPatterns: REQUIRED_PACKET_PATTERNS },
    { path: REQUIRED_CHECKLIST_PATH, requiredPatterns: REQUIRED_CHECKLIST_PATTERNS },
  ];
  const missing = [];
  const forbidden = [];
  const presentFiles = [];

  for (const file of files) {
    const absolutePath = path.join(repoRoot, file.path);
    if (!fs.existsSync(absolutePath)) {
      missing.push(`${file.path}: file is missing`);
      continue;
    }

    const content = fs.readFileSync(absolutePath, "utf8");
    presentFiles.push(file.path);

    for (const [label, pattern] of file.requiredPatterns) {
      if (!pattern.test(content)) {
        missing.push(`${file.path}: missing ${label}`);
      }
    }

    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        forbidden.push(`${file.path}: forbidden ${label}`);
      }
    }
  }

  return {
    status: missing.length === 0 && forbidden.length === 0 ? STATUS_READY : STATUS_BLOCKED,
    files: presentFiles,
    requiredFiles: [REQUIRED_PACKET_PATH, REQUIRED_CHECKLIST_PATH],
    missing,
    forbidden,
    networkAttempted: false,
    hostedProofExecuted: false,
    hostedMutationAttempted: false,
    hostedMigrationAttempted: false,
    cleanupExecuteAttempted: false,
    providerStorageApiAttempted: false,
  };
}

function printResult(result, options) {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${result.status}\n`);
  if (result.missing.length > 0) {
    process.stdout.write(`Missing:\n${result.missing.map((item) => `- ${item}`).join("\n")}\n`);
  }
  if (result.forbidden.length > 0) {
    process.stdout.write(`Forbidden:\n${result.forbidden.map((item) => `- ${item}`).join("\n")}\n`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const result = validateHostedStagingTenantProofPacket(options);
  printResult(result, options);
  if (options.strict && result.status !== STATUS_READY) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  STATUS_BLOCKED,
  STATUS_READY,
  validateHostedStagingTenantProofPacket,
  parseArgs,
};
