const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { applyReviewedScriptFinding, buildAudit, classifyContent, formatMarkdown } = require("./security-safe-script-audit.cjs");

test("detects seed reset delete and deploy patterns", () => {
  const result = classifyContent(`
    await prisma.user.deleteMany();
    await prisma.$executeRawUnsafe("truncate table users");
    // seed demo data
    // vercel deploy
  `);

  assert.equal(result.dangerous, true);
  assert.ok(result.dangers.includes("seed"));
  assert.ok(result.dangers.includes("delete"));
  assert.ok(result.dangers.includes("deploy"));
  assert.equal(result.guardStatus, "review-required");
});

test("recognizes dry-run and approval guards", () => {
  const result = classifyContent(`
    if (!process.env.PRODUCTION_ALLOW) throw new Error("production refused");
    const dryRun = process.argv.includes("--dry-run");
    // prisma migrate deploy
  `);

  assert.equal(result.dangerous, true);
  assert.equal(result.guardStatus, "guarded-or-dry-run");
  assert.ok(result.guards.includes("dryRun"));
  assert.ok(result.guards.includes("productionRefusal"));
});

test("audits package scripts and files without executing them or leaking values", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-script-audit-"));
  const scriptsDir = path.join(tempDir, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.writeFileSync(path.join(scriptsDir, "seed-demo.cjs"), 'const password = "LEDGERBYTE_SECRET_PLACEHOLDER"; prisma.user.deleteMany();');
  fs.writeFileSync(
    path.join(tempDir, "package.json"),
    JSON.stringify({ scripts: { "db:migrate": "prisma migrate deploy", "safe:plan": "node scripts/plan.cjs --dry-run" } }),
  );

  const cwd = process.cwd();
  process.chdir(tempDir);
  try {
    const report = buildAudit({ roots: ["scripts"], packageJsonPath: path.join(tempDir, "package.json") });
    const markdown = formatMarkdown(report);

    assert.equal(report.noScriptsExecuted, true);
    assert.equal(report.noDatabaseConnection, true);
    assert.equal(report.noNetwork, true);
    assert.equal(report.noMutation, true);
    assert.ok(report.dangerous.length >= 2);
    assert.doesNotMatch(JSON.stringify(report), /LEDGERBYTE_SECRET_PLACEHOLDER/);
    assert.doesNotMatch(markdown, /LEDGERBYTE_SECRET_PLACEHOLDER/);
  } finally {
    process.chdir(cwd);
  }
});

test("reviewed safe script findings do not downgrade unrelated dangerous commands", () => {
  const reviewed = applyReviewedScriptFinding({
    source: "package-script",
    path: "pre-asp:diagnostics",
    dangerous: true,
    dangers: ["compliance"],
    guards: [],
    guardStatus: "review-required",
  });
  assert.equal(reviewed.guardStatus, "guarded-or-dry-run");
  assert.equal(reviewed.reviewStatus, "reviewed");

  const unreviewed = applyReviewedScriptFinding({
    source: "package-script",
    path: "dangerous:custom",
    dangerous: true,
    dangers: ["migrate"],
    guards: [],
    guardStatus: "review-required",
  });
  assert.equal(unreviewed.guardStatus, "review-required");
  assert.equal(unreviewed.reviewStatus, undefined);
});

test("retained safe-script review items are explicit owner-approval findings, not vague clearances", () => {
  const migrate = applyReviewedScriptFinding({
    source: "package-script",
    path: "db:migrate",
    dangerous: true,
    dangers: ["migrate"],
    guards: [],
    guardStatus: "review-required",
  });
  assert.equal(migrate.guardStatus, "owner-approval-required");
  assert.ok(migrate.guards.includes("ownerApprovalRequired"));

  const zatcaValidation = applyReviewedScriptFinding({
    source: "file",
    path: "scripts/validate-generated-zatca-invoice.cjs",
    dangerous: true,
    dangers: ["provider", "compliance"],
    guards: [],
    guardStatus: "review-required",
  });
  assert.equal(zatcaValidation.guardStatus, "owner-approval-required");
  assert.ok(zatcaValidation.guards.includes("productionRefusal"));
  assert.ok(zatcaValidation.guards.includes("approvalGate"));
});

test("real repository audit keeps dangerous owner-approval commands visible with no review-required queue", () => {
  const report = buildAudit();

  assert.equal(report.reviewRequired.length, 0);
  assert.equal(report.status, "OWNER_APPROVAL_REQUIRED");
  assert.ok(report.ownerApprovalRequired.length >= 10);
  for (const retained of [
    "scripts/debug-zatca-pih-chain.cjs",
    "scripts/validate-generated-zatca-invoice.cjs",
    "db:migrate",
    "db:seed",
    "demo:seed-workflows",
    "smoke:accounting:banking",
    "smoke:accounting:zatca-safe",
    "zatca:debug-pih-chain",
    "zatca:validate-generated",
    "zatca:validate-sdk-hash-mode",
  ]) {
    assert.ok(report.ownerApprovalRequired.some((row) => row.path === retained), `${retained} remains owner-approval-required`);
  }
});
