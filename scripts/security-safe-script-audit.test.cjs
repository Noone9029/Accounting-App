const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildAudit, classifyContent, formatMarkdown } = require("./security-safe-script-audit.cjs");

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
