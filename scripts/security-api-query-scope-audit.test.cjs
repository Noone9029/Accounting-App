const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildAudit, classifyFile, extractQueryCalls, formatMarkdown, sanitizeSnippet } = require("./security-api-query-scope-audit.cjs");

test("classifies tenant-scoped query files", () => {
  const row = classifyFile(
    path.join(process.cwd(), "apps/api/src/invoices/invoice.service.ts"),
    `
export class InvoiceService {
  list(organizationId) {
    return this.prisma.salesInvoice.findMany({ where: { organizationId } });
  }
}
`,
  );
  assert.equal(row.classification, "tenant-scoped");
  assert.equal(row.queryCallCount, 1);
});

test("flags unscoped query usage for review", () => {
  const row = classifyFile(
    path.join(process.cwd(), "apps/api/src/reports/report.service.ts"),
    `
export class ReportService {
  list() {
    return this.prisma.salesInvoice.findMany({ where: { status: "DRAFT" } });
  }
}
`,
  );
  assert.equal(row.classification, "review-needed");
  assert.equal(row.unscopedQueryCallCount, 1);
});

test("classifies system/admin and webhook sources", () => {
  const system = classifyFile(
    path.join(process.cwd(), "apps/api/src/system/system.service.ts"),
    `export class SystemService { run() { return this.prisma.auditLog.findMany({ take: 1 }); } }`,
  );
  const webhook = classifyFile(
    path.join(process.cwd(), "apps/api/src/provider/provider-webhook.service.ts"),
    `export class ProviderWebhookService { handle() { return this.prisma.complianceEventLog.create({ data: {} }); } }`,
  );
  assert.equal(system.classification, "system/admin");
  assert.equal(webhook.classification, "webhook");
});

test("redacts string literals from snippets and evidence", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-query-audit-"));
  const sourceDir = path.join(tempDir, "src");
  fs.mkdirSync(path.join(sourceDir, "reports"), { recursive: true });
  fs.writeFileSync(
    path.join(sourceDir, "reports", "reports.service.ts"),
    `
export class ReportsService {
  list() {
    const secret = "LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER";
    return this.prisma.salesInvoice.findMany({ where: { status: secret } });
  }
}
`,
  );
  const report = buildAudit(sourceDir);
  const markdown = formatMarkdown(report);
  assert.doesNotMatch(JSON.stringify(report), /LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER/);
  assert.doesNotMatch(markdown, /LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER/);
  assert.equal(report.noDatabaseConnection, true);
  assert.equal(report.noNetwork, true);
  assert.equal(report.noMutation, true);
});

test("detects all requested Prisma query methods", () => {
  const calls = extractQueryCalls(`
this.prisma.a.findMany()
this.prisma.b.findFirst()
this.prisma.c.findUnique()
this.prisma.d.update()
this.prisma.e.updateMany()
this.prisma.f.delete()
this.prisma.g.deleteMany()
this.prisma.h.create()
this.prisma.i.upsert()
this.prisma.j.aggregate()
this.prisma.k.groupBy()
`);
  assert.deepEqual(calls.map((call) => call.method), ["findMany", "findFirst", "findUnique", "update", "updateMany", "delete", "deleteMany", "create", "upsert", "aggregate", "groupBy"]);
  assert.match(sanitizeSnippet('secret: "abc"'), /redacted-literal/);
});
