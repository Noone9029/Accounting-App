const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildEnvPresence, buildTenantScopeCatalog, formatText, runDiagnostics } = require("./pre-asp-readiness-diagnostics.cjs");

test("catalogs direct tenant scope, roots, child-scoped models, and unscoped review items", () => {
  const catalog = buildTenantScopeCatalog(`
model Organization {
  id String @id
}

model SalesInvoice {
  id String @id
  organizationId String
}

model SalesInvoiceLine {
  id String @id
  salesInvoiceId String
}

model ExternalAuditCursor {
  id String @id
  cursor String
}
`);

  assert.equal(catalog.totalModels, 4);
  assert.equal(catalog.rows.find((row) => row.model === "SalesInvoice").scope, "direct-tenant-scoped");
  assert.equal(catalog.rows.find((row) => row.model === "Organization").scope, "identity-or-tenant-root");
  assert.equal(catalog.rows.find((row) => row.model === "SalesInvoiceLine").scope, "child-scoped-review");
  assert.equal(catalog.rows.find((row) => row.model === "ExternalAuditCursor").scope, "unscoped-review-required");
});

test("reports only secret environment presence and never secret values", () => {
  const envPresence = buildEnvPresence({
    DATABASE_URL: "configured-test-database-url",
    UAE_ASP_API_KEY: "asp-secret",
  });
  const serialized = JSON.stringify(envPresence);

  assert.equal(envPresence.find((item) => item.name === "DATABASE_URL").configured, true);
  assert.equal(envPresence.find((item) => item.name === "UAE_ASP_API_KEY").configured, true);
  assert.doesNotMatch(serialized, /password|asp-secret|example\.test/);
  assert.match(serialized, /\[NOT_PRINTED\]/);
});

test("runs against a schema file without connecting to a database or network", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pre-asp-diagnostics-"));
  const schemaPath = path.join(tempDir, "schema.prisma");
  fs.writeFileSync(
    schemaPath,
    `
model Organization {
  id String @id
}

model Contact {
  id String @id
  organizationId String
}
`,
  );

  const report = runDiagnostics({
    schemaPath,
    env: { DATABASE_URL: "configured-test-database-url" },
  });
  const text = formatText(report);

  assert.equal(report.noDatabaseConnection, true);
  assert.equal(report.noNetwork, true);
  assert.equal(report.noMutation, true);
  assert.equal(report.tenantScopeCatalog.totalModels, 2);
  assert.doesNotMatch(JSON.stringify(report), /configured-test-database-url/);
  assert.match(text, /DATABASE_URL: configured/);
});
