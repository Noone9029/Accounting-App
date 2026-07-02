#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SCHEMA_PATH = path.join(process.cwd(), "apps", "api", "prisma", "schema.prisma");
const SECRET_ENV_NAMES = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "SMTP_PASSWORD",
  "RESEND_API_KEY",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "ZATCA_PRIVATE_KEY",
  "UAE_ASP_API_KEY",
  "UAE_ASP_WEBHOOK_SECRET",
];

const ROOT_MODELS = new Set(["User", "Organization"]);
const GLOBAL_CONFIG_MODELS = new Set(["OnboardingTemplateVersion"]);
const CHILD_SCOPE_FIELD_PATTERNS = [
  /accountId$/,
  /bankAccountId$/,
  /checklistId$/,
  /contactId$/,
  /creditNoteId$/,
  /customerId$/,
  /documentId$/,
  /importId$/,
  /invoiceId$/,
  /itemId$/,
  /journalEntryId$/,
  /lineId$/,
  /memberId$/,
  /onboardingProfileId$/,
  /paymentId$/,
  /purchaseBillId$/,
  /receiptId$/,
  /reconciliationId$/,
  /refundId$/,
  /returnId$/,
  /salesInvoiceId$/,
  /supplierId$/,
  /transferId$/,
  /warehouseId$/,
];

function parseArgs(argv) {
  const options = { schemaPath: DEFAULT_SCHEMA_PATH, json: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--schema") {
      options.schemaPath = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--schema=")) {
      options.schemaPath = path.resolve(arg.slice("--schema=".length));
    }
  }
  return options;
}

function parsePrismaModels(schemaText) {
  const models = [];
  const modelPattern = /^model\s+(\w+)\s+\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = modelPattern.exec(schemaText)) !== null) {
    const [, name, body] = match;
    const fields = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
      .map((line) => {
        const [fieldName, fieldType = ""] = line.split(/\s+/);
        return { name: fieldName, type: fieldType, raw: line };
      });
    models.push({ name, fields });
  }
  return models;
}

function classifyModel(model) {
  const fieldNames = model.fields.map((field) => field.name);
  if (fieldNames.includes("organizationId")) {
    return { scope: "direct-tenant-scoped", reason: "Has organizationId field." };
  }
  if (ROOT_MODELS.has(model.name)) {
    return { scope: "identity-or-tenant-root", reason: "Root identity or organization model; not scoped by organizationId." };
  }
  if (GLOBAL_CONFIG_MODELS.has(model.name)) {
    return { scope: "global-configuration", reason: "Shared template/configuration model; review write access separately." };
  }
  const childScopeFields = fieldNames.filter((fieldName) => CHILD_SCOPE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName)));
  if (childScopeFields.length) {
    return { scope: "child-scoped-review", reason: `No organizationId field; likely scoped through ${childScopeFields.join(", ")}.` };
  }
  return { scope: "unscoped-review-required", reason: "No direct organizationId or recognized parent-scope field found." };
}

function buildTenantScopeCatalog(schemaText) {
  const models = parsePrismaModels(schemaText);
  const rows = models.map((model) => ({ model: model.name, ...classifyModel(model) }));
  const counts = rows.reduce((acc, row) => {
    acc[row.scope] = (acc[row.scope] || 0) + 1;
    return acc;
  }, {});
  return { totalModels: models.length, counts, rows };
}

function buildEnvPresence(env = process.env) {
  return SECRET_ENV_NAMES.map((name) => ({
    name,
    configured: Boolean(env[name]),
    value: "[NOT_PRINTED]",
  }));
}

function runDiagnostics(options = {}) {
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const schemaText = fs.readFileSync(schemaPath, "utf8");
  const tenantScopeCatalog = buildTenantScopeCatalog(schemaText);
  const envPresence = buildEnvPresence(options.env || process.env);
  const reviewRequired = tenantScopeCatalog.rows.filter((row) => row.scope === "unscoped-review-required" || row.scope === "child-scoped-review");

  return {
    status: reviewRequired.length ? "PRE_ASP_REVIEW_REQUIRED" : "PRE_ASP_NO_SCOPE_GAPS_DETECTED",
    generatedAt: new Date().toISOString(),
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    schemaPath,
    tenantScopeCatalog,
    envPresence,
    reviewRequired: reviewRequired.map((row) => ({ model: row.model, scope: row.scope, reason: row.reason })),
  };
}

function formatText(report) {
  const lines = [
    `Pre-ASP diagnostics: ${report.status}`,
    `Schema: ${report.schemaPath}`,
    `No database connection: ${report.noDatabaseConnection}`,
    `No network: ${report.noNetwork}`,
    `No mutation: ${report.noMutation}`,
    "",
    "Tenant scope counts:",
    ...Object.entries(report.tenantScopeCatalog.counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([scope, count]) => `- ${scope}: ${count}`),
    "",
    "Environment presence by name only:",
    ...report.envPresence.map((item) => `- ${item.name}: ${item.configured ? "configured" : "not configured"}`),
    "",
    "Review required:",
    ...report.reviewRequired.map((item) => `- ${item.model}: ${item.scope} (${item.reason})`),
  ];
  return lines.join("\n");
}

if (require.main === module) {
  const options = parseArgs(process.argv);
  const report = runDiagnostics(options);
  process.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : `${formatText(report)}\n`);
}

module.exports = {
  buildEnvPresence,
  buildTenantScopeCatalog,
  formatText,
  parsePrismaModels,
  runDiagnostics,
};
