#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SCHEMA_PATH = path.join(process.cwd(), "apps", "api", "prisma", "schema.prisma");
const DEFAULT_EVIDENCE_PATH = path.join(process.cwd(), "docs", "security", "evidence", "TENANT_RELATIONSHIP_GRAPH.md");
const DEFAULT_JSON_PATH = path.join(process.cwd(), "docs", "security", "evidence", "TENANT_RELATIONSHIP_GRAPH.json");

const TENANT_FIELD_NAMES = new Set(["organizationId", "tenantId", "workspaceId", "companyId"]);
const USER_SCOPED_MODELS = new Set(["User", "OrganizationMember", "AuthToken", "AuthTokenRateLimitEvent"]);
const TENANT_ROOT_MODELS = new Set(["Organization"]);
const GLOBAL_REFERENCE_MODELS = new Set(["OnboardingTemplateVersion"]);
const SYSTEM_AUDIT_PATTERNS = [/Audit/i, /Evidence$/i, /EventLog$/i, /RetentionSettings$/i];
const REVIEW_PARENT_FIELD_PATTERNS = [/createdBy/i, /updatedBy/i, /approvedBy/i, /postedBy/i, /reversedBy/i, /voidedBy/i, /revokedBy/i, /verifiedBy/i, /actorUser/i, /generatedBy/i];

function parseArgs(argv = process.argv) {
  const options = {
    schemaPath: DEFAULT_SCHEMA_PATH,
    evidencePath: DEFAULT_EVIDENCE_PATH,
    jsonPath: DEFAULT_JSON_PATH,
    json: false,
    markdown: false,
    write: true,
  };

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

function parseModelBody(body) {
  const fields = [];
  const blockAttributes = [];

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("@@")) {
      blockAttributes.push(line);
      continue;
    }
    if (line.startsWith("@")) continue;
    const [name, type = ""] = line.split(/\s+/);
    fields.push({
      name,
      type: type.replace(/[?\[\]]/g, ""),
      isList: /\[\]/.test(type),
      raw: line,
      unique: /(^|\s)@unique(\s|$|\()/.test(line),
      id: /(^|\s)@id(\s|$|\()/.test(line),
    });
  }

  return { fields, blockAttributes };
}

function parsePrismaModels(schemaText) {
  const models = [];
  const modelPattern = /^model\s+(\w+)\s+\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = modelPattern.exec(schemaText)) !== null) {
    const [, name, body] = match;
    const parsed = parseModelBody(body);
    models.push({ name, ...parsed });
  }
  return models;
}

function extractConstraintFields(raw) {
  const match = raw.match(/\[([^\]]+)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((item) => item.trim().replace(/:.+$/, ""))
    .filter(Boolean);
}

function summarizeConstraints(model) {
  const constraints = [];
  for (const field of model.fields) {
    if (field.id) constraints.push({ kind: "@id", raw: `${field.name} @id`, fields: [field.name], tenantScoped: TENANT_FIELD_NAMES.has(field.name) });
    if (field.unique) constraints.push({ kind: "@unique", raw: `${field.name} @unique`, fields: [field.name], tenantScoped: TENANT_FIELD_NAMES.has(field.name) });
  }
  for (const raw of model.blockAttributes) {
    const kind = raw.match(/^@@\w+/)?.[0];
    if (!["@@unique", "@@index", "@@id"].includes(kind)) continue;
    const fields = extractConstraintFields(raw);
    constraints.push({ kind, raw, fields, tenantScoped: fields.some((field) => TENANT_FIELD_NAMES.has(field)) });
  }
  return constraints;
}

function buildRelations(models) {
  const modelNames = new Set(models.map((model) => model.name));
  const relationByModel = new Map();
  const childrenByParent = new Map(models.map((model) => [model.name, []]));

  for (const model of models) {
    const relations = [];
    for (const field of model.fields) {
      if (modelNames.has(field.type)) {
        relations.push({ field: field.name, model: field.type, isList: field.isList, reason: "relation field" });
      } else if (field.name.endsWith("Id")) {
        const base = field.name.slice(0, -"Id".length);
        const parent = models.find((candidate) => candidate.name.toLowerCase() === base.toLowerCase());
        if (parent) relations.push({ field: field.name, model: parent.name, isList: false, reason: "foreign-key-name inference" });
      }
    }
    const uniqueRelations = [...new Map(relations.map((relation) => [`${relation.field}:${relation.model}`, relation])).values()].sort((a, b) => a.model.localeCompare(b.model) || a.field.localeCompare(b.field));
    relationByModel.set(model.name, uniqueRelations);
    for (const relation of uniqueRelations) {
      if (!relation.isList && childrenByParent.has(relation.model)) childrenByParent.get(relation.model).push(model.name);
    }
  }

  for (const [parent, children] of childrenByParent) {
    childrenByParent.set(parent, [...new Set(children)].sort());
  }

  return { relationByModel, childrenByParent };
}

function isJoinTable(model, modelNames) {
  const relationIds = model.fields.filter((field) => field.name.endsWith("Id") && !TENANT_FIELD_NAMES.has(field.name));
  const relationModelFields = model.fields.filter((field) => modelNames.has(field.type) && !field.isList);
  const uniqueJoin = model.blockAttributes.some((raw) => /^@@(unique|id)/.test(raw) && extractConstraintFields(raw).filter((field) => field.endsWith("Id")).length >= 2);
  return relationIds.length >= 2 && relationModelFields.length >= 2 && uniqueJoin;
}

function findTenantPath(modelName, relationByModel, classifications, maxDepth = 4) {
  const queue = [{ modelName, path: [] }];
  const visited = new Set([modelName]);
  while (queue.length) {
    const current = queue.shift();
    if (current.path.length >= maxDepth) continue;
    for (const relation of relationByModel.get(current.modelName) || []) {
      if (relation.isList || visited.has(relation.model)) continue;
      const parentClassification = classifications.get(relation.model);
      const nextPath = [...current.path, { viaField: relation.field, model: relation.model }];
      if (parentClassification?.directTenantKey || parentClassification?.classification === "tenant-root") {
        return nextPath;
      }
      if (parentClassification?.parentTenantPath?.length) {
        return [...nextPath, ...parentClassification.parentTenantPath];
      }
      visited.add(relation.model);
      queue.push({ modelName: relation.model, path: nextPath });
    }
  }
  return [];
}

function classifyModel(model, relationByModel, classifications, modelNames) {
  const tenantFields = model.fields.filter((field) => TENANT_FIELD_NAMES.has(field.name)).map((field) => field.name).sort();
  if (tenantFields.length) {
    return {
      classification: isJoinTable(model, modelNames) ? "join-table" : "direct-tenant-key",
      directTenantKey: tenantFields[0],
      parentTenantPath: [],
      reviewReason: null,
    };
  }
  if (TENANT_ROOT_MODELS.has(model.name)) return { classification: "tenant-root", directTenantKey: null, parentTenantPath: [], reviewReason: "Tenant root table; policies must use membership claims rather than an organizationId column." };
  if (GLOBAL_REFERENCE_MODELS.has(model.name)) return { classification: "global-reference", directTenantKey: null, parentTenantPath: [], reviewReason: null };
  if (USER_SCOPED_MODELS.has(model.name) || model.fields.some((field) => field.name === "userId")) return { classification: "user-scoped", directTenantKey: null, parentTenantPath: [], reviewReason: "Identity/session/user-scoped data; tenant access depends on membership or token context." };
  if (SYSTEM_AUDIT_PATTERNS.some((pattern) => pattern.test(model.name))) return { classification: "system/audit", directTenantKey: null, parentTenantPath: [], reviewReason: "System/audit/evidence table without a direct tenant key; review service/admin access." };

  const pathToTenant = findTenantPath(model.name, relationByModel, classifications);
  if (pathToTenant.length) {
    return {
      classification: isJoinTable(model, modelNames) ? "join-table" : "indirect-parent-tenant-key",
      directTenantKey: null,
      parentTenantPath: pathToTenant,
      reviewReason: null,
    };
  }

  return {
    classification: "review-needed",
    directTenantKey: null,
    parentTenantPath: [],
    reviewReason: "No direct tenant key, explainable parent tenant path, user-scope, global-reference, tenant-root, or system/audit classification found.",
  };
}

function buildGraph(schemaText, options = {}) {
  const models = parsePrismaModels(schemaText);
  const modelNames = new Set(models.map((model) => model.name));
  const { relationByModel, childrenByParent } = buildRelations(models);
  const classifications = new Map();

  let changed = true;
  while (changed) {
    changed = false;
    for (const model of models) {
      if (classifications.has(model.name)) continue;
      const classified = classifyModel(model, relationByModel, classifications, modelNames);
      if (classified.classification !== "review-needed" || models.every((candidate) => candidate.name === model.name || classifications.has(candidate.name))) {
        classifications.set(model.name, classified);
        changed = true;
      }
    }
  }

  for (const model of models) {
    if (!classifications.has(model.name)) classifications.set(model.name, classifyModel(model, relationByModel, classifications, modelNames));
  }

  const rows = models
    .map((model) => {
      const classification = classifications.get(model.name);
      const constraints = summarizeConstraints(model);
      const relationModels = (relationByModel.get(model.name) || []).filter((relation) => !relation.isList).map((relation) => relation.model);
      const potentiallyCrossTenantJoins = relationModels.filter((parent) => {
        if (parent === "User" || parent === "Organization") return false;
        const parentClassification = classifications.get(parent);
        return classification.directTenantKey && parentClassification?.directTenantKey && parent !== "Organization";
      });
      return {
        model: model.name,
        classification: classification.classification,
        directTenantKey: classification.directTenantKey,
        parentTenantPath: classification.parentTenantPath,
        childModels: childrenByParent.get(model.name) || [],
        relationModels,
        potentiallyCrossTenantJoins,
        uniqueConstraintsNeedingTenantReview: constraints.filter((constraint) => (constraint.kind === "@unique" || constraint.kind === "@@unique") && !constraint.tenantScoped && classification.classification === "direct-tenant-key"),
        indexesNeedingTenantReview: constraints.filter((constraint) => constraint.kind === "@@index" && !constraint.tenantScoped && classification.classification === "direct-tenant-key" && constraint.fields.some((field) => !REVIEW_PARENT_FIELD_PATTERNS.some((pattern) => pattern.test(field)))),
        constraints,
        reviewReason: classification.reviewReason,
      };
    })
    .sort((a, b) => a.model.localeCompare(b.model));

  const counts = rows.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1;
    return acc;
  }, {});
  const reviewNeeded = rows.filter((row) => row.classification === "review-needed" || row.reviewReason);

  return {
    status: rows.some((row) => row.classification === "review-needed") ? "REVIEW_REQUIRED" : "RELATIONSHIP_GRAPH_READY",
    generatedBy: "scripts/security-tenant-relationship-graph.cjs",
    deterministic: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    schemaPath: options.schemaPath || DEFAULT_SCHEMA_PATH,
    totalModels: rows.length,
    counts,
    reviewNeeded,
    rows,
  };
}

function formatTenantPath(pathItems) {
  if (!pathItems?.length) return "-";
  return pathItems.map((item) => `${item.viaField}->${item.model}`).join(" / ");
}

function formatMarkdown(report) {
  const lines = [
    "# Tenant Relationship Graph Evidence",
    "",
    "Status: read-only diagnostic evidence",
    "Generated by: `scripts/security-tenant-relationship-graph.cjs`",
    "",
    "## Safety Contract",
    "",
    "- Prisma schema is parsed as text only.",
    "- No Prisma Client import.",
    "- No database connection.",
    "- No network calls.",
    "- No mutation.",
    "- Secret values are not read or printed.",
    "",
    "## Summary",
    "",
    `- Status: \`${report.status}\``,
    `- Total Prisma models: ${report.totalModels}`,
    ...Object.entries(report.counts).sort(([a], [b]) => a.localeCompare(b)).map(([classification, count]) => `- ${classification}: ${count}`),
    "",
    "## Review Needed",
    "",
    ...formatRows(report.reviewNeeded, ["model", "classification", "directTenantKey", "parentTenantPathText", "reviewReason"]),
    "",
    "## Full Relationship Graph",
    "",
    "| Model | Classification | Direct tenant key | Parent tenant path | Child models | Potential cross-tenant joins | Unique review | Index review |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...report.rows.map((row) => `| ${row.model} | ${row.classification} | ${row.directTenantKey || "-"} | ${escapeMarkdown(formatTenantPath(row.parentTenantPath))} | ${escapeMarkdown(row.childModels.join(", ") || "-")} | ${escapeMarkdown(row.potentiallyCrossTenantJoins.join(", ") || "-")} | ${row.uniqueConstraintsNeedingTenantReview.length} | ${row.indexesNeedingTenantReview.length} |`),
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
      const enriched = { ...row, parentTenantPathText: formatTenantPath(row.parentTenantPath) };
      return `| ${columns.map((column) => escapeMarkdown(String(enriched[column] || "-"))).join(" | ")} |`;
    }),
  ];
}

function escapeMarkdown(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function runGraph(options = {}) {
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  return buildGraph(fs.readFileSync(schemaPath, "utf8"), { schemaPath });
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
  const report = runGraph(options);
  if (options.write) writeEvidence(report, options);
  if (options.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else if (options.markdown) process.stdout.write(formatMarkdown(report));
  else process.stdout.write(`Tenant relationship graph: ${report.status}; models=${report.totalModels}; evidence=${options.evidencePath}\n`);
}

module.exports = {
  buildGraph,
  buildRelations,
  extractConstraintFields,
  formatMarkdown,
  parseArgs,
  parsePrismaModels,
  runGraph,
  summarizeConstraints,
};
