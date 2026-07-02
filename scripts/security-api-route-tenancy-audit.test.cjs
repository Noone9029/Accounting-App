const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildAudit, classifySourceFile, formatMarkdown } = require("./security-api-route-tenancy-audit.cjs");

test("classifies tenant guarded controllers", () => {
  const row = classifySourceFile(
    path.join(process.cwd(), "apps/api/src/sales/sales.controller.ts"),
    `
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
@Controller("sales")
export class SalesController {
  @Get()
  list(@Req() request) {
    return this.service.list(request.organizationId);
  }
}
`,
  );

  assert.equal(row.classification, "tenant-guarded");
  assert.equal(row.endpoints[0].method, "GET");
});

test("flags business controllers without obvious auth markers", () => {
  const row = classifySourceFile(
    path.join(process.cwd(), "apps/api/src/bank-accounts/bank-account.controller.ts"),
    `
@Controller("bank-accounts")
export class BankAccountController {
  @Get()
  list() {
    return [];
  }
}
`,
  );

  assert.equal(row.classification, "risky-review-needed");
  assert.ok(row.suspicious.includes("controller-without-obvious-auth-marker"));
});

test("detects unscoped findMany in business services without printing secrets", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-route-audit-"));
  const sourceDir = path.join(tempDir, "src");
  fs.mkdirSync(path.join(sourceDir, "reports"), { recursive: true });
  fs.writeFileSync(
    path.join(sourceDir, "reports", "reports.service.ts"),
    `
export class ReportsService {
  list() {
    const secret = "LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER";
    return this.prisma.salesInvoice.findMany({ where: { status: "DRAFT" } });
  }
}
`,
  );

  const report = buildAudit(sourceDir);
  const markdown = formatMarkdown(report);

  assert.equal(report.noDatabaseConnection, true);
  assert.equal(report.noNetwork, true);
  assert.equal(report.noMutation, true);
  assert.equal(report.suspiciousPatterns.length, 1);
  assert.match(markdown, /findMany-without-obvious-tenant-scope/);
  assert.doesNotMatch(JSON.stringify(report), /LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER/);
});
