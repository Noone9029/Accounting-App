const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildAudit, formatMarkdown, runAudit } = require("./security-tenant-scope-audit.cjs");

test("classifies direct, indirect, global, auth, and risky models", () => {
  const audit = buildAudit(`
model Organization {
  id String @id
}

model SalesInvoice {
  id String @id
  organizationId String
  invoiceNumber String
  @@unique([organizationId, invoiceNumber])
}

model SalesInvoiceLine {
  id String @id
  salesInvoiceId String
  salesInvoice SalesInvoice @relation(fields: [salesInvoiceId], references: [id])
  amount Decimal
}

model OnboardingTemplateVersion {
  id String @id
  version String
}

model User {
  id String @id
  email String @unique
}

model ExternalCursor {
  id String @id
  cursor String
}
`);

  const byModel = new Map(audit.rows.map((row) => [row.model, row]));
  assert.equal(byModel.get("SalesInvoice").classification, "tenant-scoped-direct");
  assert.equal(byModel.get("SalesInvoiceLine").classification, "tenant-scoped-indirect");
  assert.equal(byModel.get("OnboardingTemplateVersion").classification, "global-reference");
  assert.equal(byModel.get("User").classification, "auth/session/user-scoped");
  assert.equal(byModel.get("ExternalCursor").classification, "risky-unclassified");
});

test("flags unique constraints on direct tenant models that do not include tenant scope", () => {
  const audit = buildAudit(`
model Organization {
  id String @id
}

model BankAccountProfile {
  id String @id
  organizationId String
  accountId String @unique
  accountNumber String
  @@unique([organizationId, accountNumber])
}
`);

  assert.equal(audit.tenantConstraintReview.length, 1);
  assert.equal(audit.tenantConstraintReview[0].model, "BankAccountProfile");
  assert.equal(audit.tenantConstraintReview[0].raw, "accountId @unique");
});

test("writes deterministic markdown without secret-shaped values", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-scope-audit-"));
  const schemaPath = path.join(tempDir, "schema.prisma");
  const secret = "LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER";
  fs.writeFileSync(
    schemaPath,
    `
model Organization {
  id String @id
}

model Contact {
  id String @id
  organizationId String
  email String
}
`,
  );

  const report = runAudit({ schemaPath });
  const markdown = formatMarkdown(report);

  assert.equal(report.noDatabaseConnection, true);
  assert.equal(report.noNetwork, true);
  assert.equal(report.noMutation, true);
  assert.doesNotMatch(markdown, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(JSON.stringify(report), /LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER/);
  assert.match(markdown, /Contact/);
});
