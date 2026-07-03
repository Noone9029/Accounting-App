const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildGraph, formatMarkdown, runGraph } = require("./security-tenant-relationship-graph.cjs");

test("classifies direct, indirect, join table, and global-reference models", () => {
  const graph = buildGraph(`
model Organization {
  id String @id
}

model Customer {
  id String @id
  organizationId String
}

model CustomerContact {
  id String @id
  customerId String
  customer Customer @relation(fields: [customerId], references: [id])
}

model Tag {
  id String @id
  organizationId String
}

model CustomerTag {
  customerId String
  tagId String
  customer Customer @relation(fields: [customerId], references: [id])
  tag Tag @relation(fields: [tagId], references: [id])
  @@id([customerId, tagId])
}

model OnboardingTemplateVersion {
  id String @id
  version String
}
`);
  const byModel = new Map(graph.rows.map((row) => [row.model, row]));
  assert.equal(byModel.get("Customer").classification, "direct-tenant-key");
  assert.equal(byModel.get("CustomerContact").classification, "indirect-parent-tenant-key");
  assert.deepEqual(byModel.get("CustomerContact").parentTenantPath.map((item) => item.model), ["Customer"]);
  assert.equal(byModel.get("CustomerTag").classification, "join-table");
  assert.equal(byModel.get("OnboardingTemplateVersion").classification, "global-reference");
});

test("review-needed models include a reason", () => {
  const graph = buildGraph(`
model ExternalCursor {
  id String @id
  cursor String
}
`);
  assert.equal(graph.rows[0].classification, "review-needed");
  assert.match(graph.rows[0].reviewReason, /No direct tenant key/);
});

test("writes deterministic evidence without secret-shaped values", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-relationship-"));
  const schemaPath = path.join(tempDir, "schema.prisma");
  fs.writeFileSync(
    schemaPath,
    `
model Organization {
  id String @id
}

model Invoice {
  id String @id
  organizationId String
  databaseUrlLabel String
}
`,
  );

  const graph = runGraph({ schemaPath });
  const markdown = formatMarkdown(graph);
  assert.equal(graph.noDatabaseConnection, true);
  assert.equal(graph.noNetwork, true);
  assert.equal(graph.noMutation, true);
  assert.match(markdown, /Invoice/);
  assert.doesNotMatch(JSON.stringify(graph), /LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER/);
});
