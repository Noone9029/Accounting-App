const assert = require("node:assert/strict");
const test = require("node:test");

const {
  OWNER_APPROVAL_PHRASE,
  assertLocalOnlyApiTarget,
  assertOwnerApprovedDisposableTarget,
  isLocalTargetUrl,
  redactSensitiveText,
} = require("./safe-script-guards.cjs");

test("classifies local and remote script targets", () => {
  assert.equal(isLocalTargetUrl("http://localhost:4000"), true);
  assert.equal(isLocalTargetUrl("http://127.0.0.1:4000"), true);
  assert.equal(isLocalTargetUrl("https://ledgerbyte-api-test.example"), false);
  assert.equal(isLocalTargetUrl("not-a-url"), false);
});

test("requires explicit local approval before ZATCA helper scripts can run", () => {
  assert.throws(
    () =>
      assertLocalOnlyApiTarget({
        scriptName: "validate-generated-zatca-invoice",
        apiUrl: "http://localhost:4000",
        argv: ["node", "script"],
        env: {},
      }),
    /requires --allow-local-api/,
  );

  assert.doesNotThrow(() =>
    assertLocalOnlyApiTarget({
      scriptName: "validate-generated-zatca-invoice",
      apiUrl: "http://localhost:4000",
      argv: ["node", "script", "--allow-local-api"],
      env: {},
    }),
  );
});

test("refuses production and remote ZATCA helper targets", () => {
  assert.throws(
    () =>
      assertLocalOnlyApiTarget({
        scriptName: "validate-generated-zatca-invoice",
        apiUrl: "http://localhost:4000",
        argv: ["node", "script", "--allow-local-api"],
        env: { NODE_ENV: "production" },
      }),
    /refuses production-like environments/,
  );

  assert.throws(
    () =>
      assertLocalOnlyApiTarget({
        scriptName: "validate-generated-zatca-invoice",
        apiUrl: "https://ledgerbyte-api-test.example",
        argv: ["node", "script", "--allow-local-api"],
        env: {},
      }),
    /local API targets only/,
  );
});

test("requires exact owner approval for remote disposable mutation targets", () => {
  assert.doesNotThrow(() =>
    assertOwnerApprovedDisposableTarget({
      scriptName: "smoke-accounting",
      apiUrl: "http://localhost:4000",
      env: {},
      allowRemoteVar: "LEDGERBYTE_SMOKE_ALLOW_REMOTE_MUTATION",
      targetClassVar: "LEDGERBYTE_SMOKE_TARGET_CLASS",
      approvalVar: "LEDGERBYTE_SMOKE_OWNER_APPROVAL",
    }),
  );

  assert.throws(
    () =>
      assertOwnerApprovedDisposableTarget({
        scriptName: "smoke-accounting",
        apiUrl: "https://ledgerbyte-api-test.example",
        env: {},
        allowRemoteVar: "LEDGERBYTE_SMOKE_ALLOW_REMOTE_MUTATION",
        targetClassVar: "LEDGERBYTE_SMOKE_TARGET_CLASS",
        approvalVar: "LEDGERBYTE_SMOKE_OWNER_APPROVAL",
      }),
    /requires explicit owner approval/,
  );

  assert.doesNotThrow(() =>
    assertOwnerApprovedDisposableTarget({
      scriptName: "smoke-accounting",
      apiUrl: "https://ledgerbyte-api-test.example",
      env: {
        LEDGERBYTE_SMOKE_ALLOW_REMOTE_MUTATION: "true",
        LEDGERBYTE_SMOKE_TARGET_CLASS: "disposable-non-production",
        LEDGERBYTE_SMOKE_OWNER_APPROVAL: OWNER_APPROVAL_PHRASE,
      },
      allowRemoteVar: "LEDGERBYTE_SMOKE_ALLOW_REMOTE_MUTATION",
      targetClassVar: "LEDGERBYTE_SMOKE_TARGET_CLASS",
      approvalVar: "LEDGERBYTE_SMOKE_OWNER_APPROVAL",
    }),
  );
});

test("redacts common secret shapes without exposing values", () => {
  const redacted = redactSensitiveText(
    "DATABASE_URL=postgres://user:pass@example/db token=abc Authorization: Bearer secret -----BEGIN PRIVATE KEY-----x-----END PRIVATE KEY-----",
    ["abc", "secret"],
  );

  assert.doesNotMatch(redacted, /postgres:\/\/user:pass/);
  assert.doesNotMatch(redacted, /abc/);
  assert.doesNotMatch(redacted, /secret/);
  assert.doesNotMatch(redacted, /BEGIN PRIVATE KEY/);
});
