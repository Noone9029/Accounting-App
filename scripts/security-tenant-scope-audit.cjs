#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SCHEMA_PATH = path.join(process.cwd(), "apps", "api", "prisma", "schema.prisma");
const DEFAULT_EVIDENCE_PATH = path.join(process.cwd(), "docs", "security", "evidence", "TENANT_SCOPE_AUDIT.md");
const DEFAULT_JSON_PATH = path.join(process.cwd(), "docs", "security", "evidence", "TENANT_SCOPE_AUDIT.json");

const DIRECT_SCOPE_FIELDS = new Set(["organizationId", "tenantId", "workspaceId", "companyId"]);
const AUTH_MODELS = new Set(["User", "Organization", "AuthToken", "AuthTokenRateLimitEvent", "OrganizationMember"]);
const GLOBAL_REFERENCE_MODELS = new Set(["OnboardingTemplateVersion"]);
const SYSTEM_AUDIT_MODEL_PATTERNS = [/Audit/i, /Evidence$/i, /EventLog$/i, /RetentionSettings$/i];
const BUSINESS_FIELD_PATTERNS = [
  /amount/i,
  /balance/i,
  /number$/i,
  /status$/i,
  /date$/i,
  /source/i,
  /invoice/i,
  /bill/i,
  /payment/i,
  /account/i,
  /bank/i,
  /warehouse/i,
  /item/i,
  /journal/i,
  /document/i,
  /compliance/i,
];

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
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--markdown") {
      options.markdown = true;
    } else if (arg === "--no-write") {
      options.write = false;
    } else if (arg === "--schema") {
      options.schemaPath = path.resolve(argv[index + 1] || "");
      index += 1;
    } else if (arg.startsWith("--schema=")) {
      options.schemaPath = path.resolve(arg.slice("--schema=".length));
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

function parseModelBody(body) {
  const fields = [];
  const blockAttributes = [];

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) {
      continue;
    }
    if (line.startsWith("@@")) {
      blockAttributes.push(line);
      continue;
    }
    if (line.startsWith("@")) {
      continue;
    }
    const [name, type = ""] = line.split(/\s+/);
    fields.push({
      name,
      type: type.replace(/[?\[\]]/g, ""),
      raw: line,
      unique: /(^|\s)@unique(\s|$|\()/.test(line),
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
    const { fields, blockAttributes } = parseModelBody(body);
    models.push({ name, fields, blockAttributes });
  }

  return models;
}

function extractConstraintFields(raw) {
  const bracketMatch = raw.match(/\[([^\]]+)\]/);
  if (!bracketMatch) {
    return [];
  }
  return bracketMatch[1]
    .split(",")
    .map((item) => item.trim().replace(/:.+$/, ""))
    .filter(Boolean);
}

function buildRelationMap(models) {
  const modelNames = new Set(models.map((model) => model.name));
  const relationMap = new Map();

  for (const model of models) {
    const relations = new Set();
    for (const field of model.fields) {
      if (modelNames.has(field.type)) {
        relations.add(field.type);
      }
      if (field.name.endsWith("Id")) {
        const baseName = field.name.slice(0, -"Id".length);
        const matchingModel = models.find((candidate) => candidate.name.toLowerCase() === baseName.toLowerCase());
        if (matchingModel) {
          relations.add(matchingModel.name);
        }
      }
    }
    relationMap.set(model.name, [...relations].sort());
  }

  return relationMap;
}

function classifyModels(models) {
  const relationMap = buildRelationMap(models);
  const directScoped = new Set();
  const classifications = new Map();

  for (const model of models) {
    const scopeFields = model.fields.filter((field) => DIRECT_SCOPE_FIELDS.has(field.name)).map((field) => field.name);
    if (scopeFields.length > 0) {
      directScoped.add(model.name);
      classifications.set(model.name, {
        classification: "tenant-scoped-direct",
        reason: `Direct scope field: ${scopeFields.join(", ")}.`,
        scopeFields,
      });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const model of models) {
      if (classifications.has(model.name)) {
        continue;
      }
      const scopedParents = (relationMap.get(model.name) || []).filter(
        (parentName) =>
          directScoped.has(parentName) ||
          classifications.get(parentName)?.classification === "tenant-scoped-indirect",
      );
      if (scopedParents.length > 0) {
        classifications.set(model.name, {
          classification: "tenant-scoped-indirect",
          reason: `Indirectly scoped through parent relation: ${scopedParents.join(", ")}.`,
          scopeFields: [],
          scopedParents,
        });
        changed = true;
      }
    }
  }

  return models.map((model) => {
    const existing = classifications.get(model.name);
    if (existing) {
      return { ...model, ...existing };
    }
    if (AUTH_MODELS.has(model.name) || model.fields.some((field) => field.name === "userId")) {
      return {
        ...model,
        classification: "auth/session/user-scoped",
        reason: "Identity, membership, token, or user-scoped model; review access separately from tenant tables.",
        scopeFields: [],
      };
    }
    if (GLOBAL_REFERENCE_MODELS.has(model.name)) {
      return {
        ...model,
        classification: "global-reference",
        reason: "Shared reference/configuration model; write access requires separate review.",
        scopeFields: [],
      };
    }
    if (SYSTEM_AUDIT_MODEL_PATTERNS.some((pattern) => pattern.test(model.name))) {
      return {
        ...model,
        classification: "system/audit",
        reason: "System, audit, evidence, or retention model without direct tenant field.",
        scopeFields: [],
      };
    }
    return {
      ...model,
      classification: "risky-unclassified",
      reason: "No direct scope field, indirect scoped parent, global-reference classification, or auth/system exception found.",
      scopeFields: [],
    };
  });
}

function summarizeConstraints(model) {
  const constraints = [];

  for (const field of model.fields) {
    if (field.unique) {
      constraints.push({
        kind: "@unique",
        raw: `${field.name} @unique`,
        fields: [field.name],
        tenantScoped: DIRECT_SCOPE_FIELDS.has(field.name),
      });
    }
  }

  for (const raw of model.blockAttributes) {
    if (!/^@@(unique|index|id)/.test(raw)) {
      continue;
    }
    const fields = extractConstraintFields(raw);
    constraints.push({
      kind: raw.match(/^@@\w+/)?.[0] || "@@unknown",
      raw,
      fields,
      tenantScoped: fields.some((field) => DIRECT_SCOPE_FIELDS.has(field)),
    });
  }

  return constraints;
}

function looksBusinessDataLike(model) {
  if (AUTH_MODELS.has(model.name) || GLOBAL_REFERENCE_MODELS.has(model.name)) {
    return false;
  }
  return BUSINESS_FIELD_PATTERNS.some((pattern) => pattern.test(model.name) || model.fields.some((field) => pattern.test(field.name)));
}

function buildAudit(schemaText, options = {}) {
  const models = parsePrismaModels(schemaText);
  const rows = classifyModels(models)
    .map((model) => {
      const constraints = summarizeConstraints(model);
      const reviewConstraints = constraints.filter(
        (constraint) =>
          model.classification === "tenant-scoped-direct" &&
          (constraint.kind === "@unique" || constraint.kind === "@@unique") &&
          !constraint.tenantScoped,
      );
      return {
        model: model.name,
        classification: model.classification,
        reason: model.reason,
        fieldCount: model.fields.length,
        scopeFields: model.scopeFields || [],
        parentRelations: buildRelationMap(models).get(model.name) || [],
        constraints,
        tenantConstraintReview: reviewConstraints,
        businessDataReview:
          looksBusinessDataLike(model) &&
          (model.classification === "risky-unclassified" || model.classification === "auth/session/user-scoped"),
      };
    })
    .sort((a, b) => a.model.localeCompare(b.model));

  const counts = rows.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1;
    return acc;
  }, {});

  const riskyUnclassified = rows.filter((row) => row.classification === "risky-unclassified");
  const businessDataReview = rows.filter((row) => row.businessDataReview);
  const tenantConstraintReview = rows.flatMap((row) =>
    row.tenantConstraintReview.map((constraint) => ({ model: row.model, ...constraint })),
  );

  return {
    status: riskyUnclassified.length ? "REVIEW_REQUIRED" : "NO_UNCLASSIFIED_MODELS",
    generatedBy: "scripts/security-tenant-scope-audit.cjs",
    deterministic: true,
    noDatabaseConnection: true,
    noNetwork: true,
    noMutation: true,
    schemaPath: options.schemaPath || DEFAULT_SCHEMA_PATH,
    totalModels: rows.length,
    counts,
    riskyUnclassified,
    businessDataReview,
    tenantConstraintReview,
    rows,
  };
}

function formatMarkdown(report) {
  const lines = [
    "# Tenant Scope Audit Evidence",
    "",
    "Status: read-only diagnostic evidence",
    "Generated by: `scripts/security-tenant-scope-audit.cjs`",
    "",
    "## Safety Contract",
    "",
    "- No database connection.",
    "- No network calls.",
    "- No mutation.",
    "- Schema is parsed as text from `apps/api/prisma/schema.prisma`.",
    "- Secret values are not read or printed.",
    "",
    "## Summary",
    "",
    `- Status: \`${report.status}\``,
    `- Total Prisma models: ${report.totalModels}`,
    ...Object.entries(report.counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([classification, count]) => `- ${classification}: ${count}`),
    "",
    "## Risk Summary",
    "",
    `- Risky unclassified models: ${report.riskyUnclassified.length}`,
    `- Business-data-like models requiring review: ${report.businessDataReview.length}`,
    `- Unique constraints/indexes to review for tenant scoping: ${report.tenantConstraintReview.length}`,
    "",
    "## Risky Unclassified Models",
    "",
    ...formatRows(report.riskyUnclassified, ["model", "reason"]),
    "",
    "## Business Data Review",
    "",
    ...formatRows(report.businessDataReview, ["model", "classification", "reason"]),
    "",
    "## Tenant Constraint Review",
    "",
    ...formatRows(report.tenantConstraintReview, ["model", "kind", "raw"]),
    "",
    "## Full Model Catalog",
    "",
    "| Model | Classification | Scope fields | Parent relations | Reason |",
    "| --- | --- | --- | --- | --- |",
    ...report.rows.map(
      (row) =>
        `| ${row.model} | ${row.classification} | ${row.scopeFields.join(", ") || "-"} | ${row.parentRelations.join(", ") || "-"} | ${escapeMarkdown(row.reason)} |`,
    ),
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
    ...rows.map((row) => `| ${columns.map((column) => escapeMarkdown(String(row[column] || "-"))).join(" | ")} |`),
  ];
}

function escapeMarkdown(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function runAudit(options = {}) {
  const schemaPath = options.schemaPath || DEFAULT_SCHEMA_PATH;
  const schemaText = fs.readFileSync(schemaPath, "utf8");
  return buildAudit(schemaText, { schemaPath });
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
  const report = runAudit(options);
  const markdown = formatMarkdown(report);
  if (options.write) {
    writeEvidence(report, options);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (options.markdown) {
    process.stdout.write(markdown);
  } else {
    process.stdout.write(`Tenant scope audit: ${report.status}; models=${report.totalModels}; evidence=${options.evidencePath}\n`);
  }
}

module.exports = {
  buildAudit,
  classifyModels,
  formatMarkdown,
  parseArgs,
  parsePrismaModels,
  runAudit,
  summarizeConstraints,
};
