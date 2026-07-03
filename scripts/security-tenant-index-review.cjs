#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { buildGraph, parsePrismaModels, summarizeConstraints } = require("./security-tenant-relationship-graph.cjs");

const DEFAULT_SCHEMA_PATH = path.join(process.cwd(), "apps", "api", "prisma", "schema.prisma");
const DEFAULT_EVIDENCE_PATH = path.join(process.cwd(), "docs", "security", "evidence", "TENANT_INDEX_REVIEW.md");
const DEFAULT_JSON_PATH = path.join(process.cwd(), "docs", "security", "evidence", "TENANT_INDEX_REVIEW.json");
const GLOBAL_CLASSIFICATIONS = new Set(["global-reference", "tenant-root", "user-scoped", "system/audit"]);
const SAFE_PARENT_FIELD_PATTERNS = [/Id$/];
const BUSINESS_FIELD_PATTERNS = [/number$/i, /code$/i, /email/i, /name$/i, /reference/i, /source/i, /invoice/i, /bill/i, /payment/i, /account/i, /warehouse/i, /item/i, /journal/i, /document/i, /status/i, /date/i];

function parseArgs(argv = process.argv) {
  const options = { schemaPath: DEFAULT_SCHEMA_PATH, evidencePath: DEFAULT_EVIDENCE_PATH, jsonPath: DEFAULT_JSON_PATH, json: false, markdown: false, write: true };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--markdown") options.markdown = true;
    else if (arg === "--no-write") options.write = false;
    else if (arg === "--schema") {
      options.schemaPath = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--schema=")) options.schemaPath = path.resolve(arg.slice("--schema=".length));
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

function looksBusinessLike(model, constraint) {
  return BUSINESS_FIELD_PATTERNS.some((pattern) => pattern.test(model.name) || constraint.fields.some((field) => pattern.test(field)));
}

function isSafeScopedParentConstraint(row, constraint) {
  return !row.directTenantKey && row.parentTenantPath.length > 0 && constraint.fields.some((field) => SAFE_PARENT_FIELD_PATTERNS.some((pattern) => pattern.test(field)));
}

function classifyConstraint(model, row, constraint) {
  const isBusinessUnique = constraint.kind === "@unique" || constraint.kind === "@@unique";
  const isPrimaryKey = constraint.kind === "@id" || constraint.kind === "@@id";
  const hasTenant = constraint.tenantScoped || constraint.fields.includes(row.directTenantKey);
  if (hasTenant) return { scope: "tenant-scoped", review: false, reason: "Constraint includes the direct tenant key." };
  if (isPrimaryKey) return { scope: "primary-key", review: false, reason: "Primary keys are inventoried but are not treated as tenant-sensitive business uniqueness by this scanner." };
  if (GLOBAL_CLASSIFICATIONS.has(row.classification)) return { scope: "global-or-system", review: false, reason: `Model classification is ${row.classification}; review through global/system access controls.` };
  if (isSafeScopedParentConstraint(row, constraint)) return { scope: "parent-scoped", review: false, reason: `Model inherits tenant path through ${row.parentTenantPath.map((item) => item.model).join(" -> ")}; parent foreign key is in the constraint.` };
  if (isBusinessUnique && looksBusinessLike(model, constraint)) return { scope: "tenant-sensitive-review", review: true, reason: "Business-data-like uniqueness does not include organizationId or an explainable scoped parent key." };
  if (constraint.kind === "@@index" && row.classification === "direct-tenant-key" && !hasTenant) return { scope: "index-review", review: true, reason: "Index on tenant-scoped model does not include organizationId; review query patterns and cardinality." };
  return { scope: "inventory-only", review: false, reason: "Inventoried for completeness; not classified as tenant-sensitive by static rules." };
}

function buildReview(schemaText, options = {}) {
  const models = parsePrismaModels(schemaText);
  const graph = buildGraph(schemaText, options);
  const graphByModel = new Map(graph.rows.map((row) => [row.model, row]));
  const constraints = [];
  for (const model of models) {
    const row = graphByModel.get(model.name);
    for (const constraint of summarizeConstraints(model)) {
      const classification = classifyConstraint(model, row, constraint);
      constraints.push({
        model: model.name,
        modelClassification: row.classification,
        kind: constraint.kind,
        fields: constraint.fields,
        raw: constraint.raw,
        scope: classification.scope,
        reviewNeeded: classification.review,
        reason: classification.reason,
      });
    }
  }
  constraints.sort((a, b) => a.model.localeCompare(b.model) || a.kind.localeCompare(b.kind) || a.raw.localeCompare(b.raw));
  const counts = constraints.reduce((acc, item) => {
    acc[item.scope] = (acc[item.scope] || 0) + 1;
    return acc;
  }, {});
  const reviewNeeded = constraints.filter((item) => item.reviewNeeded);
  return {
    status: reviewNeeded.length ? "TENANT_INDEX_REVIEW_ITEMS" : "TENANT_INDEX_REVIEW_CLEAR",
    generatedBy: "scripts/security-tenant-index-review.cjs",
    deterministic: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    schemaPath: options.schemaPath || DEFAULT_SCHEMA_PATH,
    totalConstraints: constraints.length,
    reviewNeededCount: reviewNeeded.length,
    counts,
    reviewNeeded,
    constraints,
  };
}

function formatMarkdown(report) {
  const lines = [
    "# Tenant Index Review Evidence",
    "",
    "Status: read-only diagnostic evidence",
    "Generated by: `scripts/security-tenant-index-review.cjs`",
    "",
    "## Safety Contract",
    "",
    "- Prisma schema is parsed as text only.",
    "- No Prisma Client import.",
    "- No database connection.",
    "- No network calls.",
    "- No mutation.",
    "- No schema changes or migrations.",
    "",
    "## Summary",
    "",
    `- Status: \`${report.status}\``,
    `- Constraints inventoried: ${report.totalConstraints}`,
    `- Tenant-sensitive review items: ${report.reviewNeededCount}`,
    ...Object.entries(report.counts).sort(([a], [b]) => a.localeCompare(b)).map(([scope, count]) => `- ${scope}: ${count}`),
    "",
    "## Tenant-Sensitive Review Items",
    "",
    ...formatRows(report.reviewNeeded, ["model", "kind", "fieldsText", "scope", "reason"]),
    "",
    "## Full Constraint Inventory",
    "",
    "| Model | Kind | Fields | Scope | Review needed | Reason |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.constraints.map((item) => `| ${item.model} | ${item.kind} | ${escapeMarkdown(item.fields.join(", ") || "-")} | ${item.scope} | ${item.reviewNeeded ? "yes" : "no"} | ${escapeMarkdown(item.reason)} |`),
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
      const enriched = { ...row, fieldsText: row.fields.join(", ") || "-" };
      return `| ${columns.map((column) => escapeMarkdown(String(enriched[column] || "-"))).join(" | ")} |`;
    }),
  ];
}

function escapeMarkdown(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function runReview(options = {}) {
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  return buildReview(fs.readFileSync(schemaPath, "utf8"), { schemaPath });
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
  const report = runReview(options);
  if (options.write) writeEvidence(report, options);
  if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else if (options.markdown) process.stdout.write(formatMarkdown(report));
  else process.stdout.write(`Tenant index review: ${report.status}; constraints=${report.totalConstraints}; review=${report.reviewNeededCount}; evidence=${options.evidencePath}\n`);
}

module.exports = {
  buildReview,
  classifyConstraint,
  formatMarkdown,
  parseArgs,
  runReview,
};
