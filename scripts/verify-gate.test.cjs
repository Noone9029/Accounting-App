"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GATES,
  assertSafePlan,
  buildGatePlan,
  isDocsStaticGuardPackageOnlyChange,
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
    changedFiles: ["apps/web/src/app/(app)/purchases/ap-dashboard/page.tsx"],
  }).commands.map(formatCommand);

  assert.ok(commands.includes("corepack pnpm db:generate"));
  assert.ok(commands.indexOf("corepack pnpm db:generate") < commands.indexOf("corepack pnpm typecheck"));
  assertSafePlan(
    buildGatePlan("verify:ci:local", [], { changedFiles: ["apps/web/src/app/(app)/purchases/ap-dashboard/page.tsx"] }),
  );
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
  const changedFiles = ["apps/web/src/app/(app)/purchases/ap-dashboard/page.tsx"];

  assert.equal(isDocsStaticGuardPackageOnlyChange(changedFiles), false);

  const commands = buildGatePlan("verify:ci:local", [], { changedFiles }).commands.map(formatCommand);
  assert.ok(commands.includes("corepack pnpm test"));
  assert.ok(commands.includes("corepack pnpm build"));
  assert.ok(commands.includes("corepack pnpm typecheck"));
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
