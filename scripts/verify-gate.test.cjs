"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GATES,
  assertSafePlan,
  buildGatePlan,
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
    const plan = buildGatePlan(gateName);

    assert.ok(plan.commands.length >= 4, `${gateName} should have a substantive command plan`);
    assertSafePlan(plan);
  }
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
