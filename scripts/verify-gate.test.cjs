"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GATES,
  assertSafePlan,
  buildApiDocsAndCiScopedCommands,
  buildGatePlan,
  getChangedApiTestPaths,
  getChangedPackageTestWorkspaces,
  getChangedWebTestPaths,
  isApiDocsAndCiScopedChange,
  isDocsStaticGuardPackageOnlyChange,
  isWebDocsAndCiScopedChange,
  formatCommand,
} = require("./verify-gate.cjs");

test("verify:diff plans only git diff safety commands", () => {
  const plan = buildGatePlan("verify:diff");

  assert.deepEqual(
    plan.commands.map(formatCommand),
    ["git status --short", "git diff --check", "git diff --cached --check"],
  );
  assertSafePlan(plan);
});

test("verify:local:web adds a targeted web test only when extra args are passed", () => {
  const plan = buildGatePlan("verify:local:web", ["settings", "roles"]);

  assert.deepEqual(
    plan.commands.map(formatCommand),
    [
      "git diff --check",
      "corepack pnpm --filter @ledgerbyte/web typecheck",
      "corepack pnpm --filter @ledgerbyte/web test -- settings roles",
    ],
  );
  assertSafePlan(plan);
});

test("verify:local:api omits targeted tests when no extra args are passed", () => {
  const plan = buildGatePlan("verify:local:api");

  assert.deepEqual(
    plan.commands.map(formatCommand),
    ["git diff --check", "corepack pnpm --filter @ledgerbyte/api typecheck"],
  );
  assertSafePlan(plan);
});

test("repo and CI local gates stay inside non-destructive verification commands", () => {
  for (const gateName of ["verify:repo", "verify:ci:local"]) {
    const plan =
      gateName === "verify:ci:local"
        ? buildGatePlan(gateName, [], { changedFiles: ["apps/web/src/app/(app)/purchases/ap-dashboard/page.tsx"] })
        : buildGatePlan(gateName);

    assert.ok(plan.commands.length >= 4, `${gateName} should have a substantive command plan`);
    assertSafePlan(plan);
  }
});

test("CI local gate generates Prisma client before workspace typecheck", () => {
  const commands = buildGatePlan("verify:ci:local", [], {
    changedFiles: ["packages/zatca-core/src/xml.ts"],
  }).commands.map(formatCommand);

  assert.ok(commands.includes("corepack pnpm db:generate"));
  assert.ok(commands.indexOf("corepack pnpm db:generate") < commands.indexOf("corepack pnpm typecheck"));
  assertSafePlan(buildGatePlan("verify:ci:local", [], { changedFiles: ["packages/zatca-core/src/xml.ts"] }));
});

test("CI local gate narrows to static-guard verification for docs/static-guard/package-script-only changes", () => {
  const changedFiles = [
    "BUG_AUDIT.md",
    "CODEX_HANDOFF.md",
    "docs/IMPLEMENTATION_STATUS.md",
    "docs/PRODUCT_READINESS_SCORECARD.md",
    "docs/REMAINING_ROADMAP.md",
    "docs/development/ZATCA_SANDBOX_CSID_STORAGE_APPROVAL_GATE_SPRINT_CLOSURE.md",
    "docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_GATE.md",
    "docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_RESULTS.md",
    "package.json",
    "scripts/zatca-sandbox-csid-storage-approval-gate.cjs",
    "scripts/zatca-sandbox-csid-storage-approval-gate.test.cjs",
  ];

  assert.equal(isDocsStaticGuardPackageOnlyChange(changedFiles), true);

  const commands = buildGatePlan("verify:ci:local", [], { changedFiles }).commands.map(formatCommand);

  assert.deepEqual(commands, [
    "git diff --check",
    "node --test scripts/zatca-sandbox-csid-storage-approval-gate.test.cjs",
    `node -e ${JSON.stringify("JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')")}`,
  ]);
  assert.ok(!commands.includes("corepack pnpm test"));
  assert.ok(!commands.includes("corepack pnpm build"));
  assert.ok(!commands.includes("corepack pnpm typecheck"));
  assertSafePlan(buildGatePlan("verify:ci:local", [], { changedFiles }));
});

test("CI local gate keeps broader repo verification when changes leave the docs/static-guard lane", () => {
  const changedFiles = ["packages/zatca-core/src/xml.ts"];

  assert.equal(isDocsStaticGuardPackageOnlyChange(changedFiles), false);
  assert.equal(isWebDocsAndCiScopedChange(changedFiles), false);

  const commands = buildGatePlan("verify:ci:local", [], { changedFiles }).commands.map(formatCommand);
  assert.ok(commands.includes("corepack pnpm test"));
  assert.ok(commands.includes("corepack pnpm build"));
  assert.ok(commands.includes("corepack pnpm typecheck"));
});

test("CI local gate narrows web-and-docs route hardening diffs to web verification", () => {
  const changedFiles = [
    "BUG_AUDIT.md",
    "CODEX_HANDOFF.md",
    "apps/web/src/app/(app)/contacts/page.tsx",
    "apps/web/src/app/(app)/contacts/page.test.tsx",
    "apps/web/src/lib/storage.ts",
  ];

  assert.equal(isDocsStaticGuardPackageOnlyChange(changedFiles), false);
  assert.equal(isWebDocsAndCiScopedChange(changedFiles), true);

  const plan = buildGatePlan("verify:ci:local", [], { changedFiles });
  const commands = plan.commands.map(formatCommand);

  assert.deepEqual(commands.slice(0, 2), [
    "git diff --check",
    "corepack pnpm --filter @ledgerbyte/web typecheck",
  ]);
  assert.match(commands[2], /^node scripts\/run-web-jest-by-paths\.cjs /);
  assert.match(commands[2], /src\/app\/\(app\)\/contacts\/page\.test\.tsx/);
  assert.equal(commands[3], "corepack pnpm --filter @ledgerbyte/web build");
});

test("CI local gate narrows api/docs/test-only support diffs to api verification", () => {
  const changedFiles = [
    "BUG_AUDIT.md",
    "CODEX_HANDOFF.md",
    "apps/api/src/bank-statements/bank-statement-import-parser.spec.ts",
    "apps/api/src/bank-statements/bank-statement-import-parser.ts",
    "apps/api/src/bank-statements/bank-statement-match-suggestions.spec.ts",
    "apps/api/src/bank-statements/bank-statement-match-suggestions.ts",
    "packages/zatca-core/test/xml-mapping.test.ts",
  ];

  assert.equal(isDocsStaticGuardPackageOnlyChange(changedFiles), false);
  assert.equal(isWebDocsAndCiScopedChange(changedFiles), false);
  assert.equal(isApiDocsAndCiScopedChange(changedFiles), true);

  const commands = buildApiDocsAndCiScopedCommands(changedFiles).map(formatCommand);

  assert.deepEqual(commands, [
    "git diff --check",
    "corepack pnpm --filter @ledgerbyte/zatca-core test",
    "corepack pnpm db:generate",
    "corepack pnpm --filter @ledgerbyte/api typecheck",
    "corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/bank-statements/bank-statement-import-parser.spec.ts src/bank-statements/bank-statement-match-suggestions.spec.ts",
    "corepack pnpm --filter @ledgerbyte/api build",
  ]);
  assert.deepEqual(getChangedPackageTestWorkspaces(changedFiles), ["@ledgerbyte/zatca-core"]);
});

test("CI local gate adds verify-gate tests when scoped CI files change with web surfaces", () => {
  const changedFiles = [
    ".github/workflows/pr-verification.yml",
    "scripts/verify-gate.cjs",
    "scripts/verify-gate.test.cjs",
    "apps/web/src/app/(app)/documents/page.tsx",
    "apps/web/src/app/(app)/documents/page.test.tsx",
  ];

  assert.equal(isWebDocsAndCiScopedChange(changedFiles), true);

  const plan = buildGatePlan("verify:ci:local", [], { changedFiles });
  const commands = plan.commands.map(formatCommand);

  assert.deepEqual(commands.slice(0, 3), [
    "git diff --check",
    "node --test scripts/verify-gate.test.cjs",
    "corepack pnpm --filter @ledgerbyte/web typecheck",
  ]);
  assert.match(commands[3], /^node scripts\/run-web-jest-by-paths\.cjs /);
  assert.match(commands[3], /src\/app\/\(app\)\/documents\/page\.test\.tsx/);
  assert.equal(commands[4], "corepack pnpm --filter @ledgerbyte/web build");
});

test("CI local gate keeps docs-only changes lightweight in the scoped route", () => {
  const changedFiles = ["BUG_AUDIT.md", "docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md"];

  assert.equal(isWebDocsAndCiScopedChange(changedFiles), true);

  const commands = buildGatePlan("verify:ci:local", [], { changedFiles }).commands.map(formatCommand);
  assert.deepEqual(commands, ["git diff --check"]);
});

test("changed web test path extraction keeps repo-relative Jest paths stable", () => {
  const paths = getChangedWebTestPaths([
    "apps/web/src/app/(app)/documents/page.tsx",
    "apps/web/src/app/(app)/documents/page.test.tsx",
    "apps/web/src/lib/storage.test.ts",
    "apps/web/src/lib/storage.test.ts",
    "CODEX_HANDOFF.md",
  ]);

  assert.deepEqual(paths, [
    "src/app/(app)/documents/page.test.tsx",
    "src/lib/storage.test.ts",
  ]);
});

test("changed api test path extraction keeps repo-relative Jest paths stable", () => {
  const paths = getChangedApiTestPaths([
    "apps/api/src/bank-statements/bank-statement-import-parser.spec.ts",
    "apps/api/src/bank-statements/bank-statement.service.spec.ts",
    "apps/api/src/bank-statements/bank-statement.service.spec.ts",
    "CODEX_HANDOFF.md",
  ]);

  assert.deepEqual(paths, [
    "src/bank-statements/bank-statement-import-parser.spec.ts",
    "src/bank-statements/bank-statement.service.spec.ts",
  ]);
});

test("unsafe extra args are rejected before command execution", () => {
  assert.throws(() => buildGatePlan("verify:local:web", ["smoke:accounting"]), /forbidden/i);
  assert.throws(() => buildGatePlan("verify:local:api", ["email"]), /forbidden/i);
  assert.throws(() => buildGatePlan("verify:local:api", ["https://ledgerbyte-api-test.vercel.app"]), /URL/i);
});

test("unknown gates fail clearly", () => {
  assert.throws(() => buildGatePlan("verify:missing"), /Unknown verification gate/);
});

test("all public gates are documented in the registry", () => {
  assert.deepEqual(Object.keys(GATES), [
    "verify:diff",
    "verify:local:web",
    "verify:local:api",
    "verify:local:guards",
    "verify:repo",
    "verify:ci:local",
  ]);
});
