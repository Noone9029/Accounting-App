const test = require("node:test");
const assert = require("node:assert/strict");
const { isLocalTargetUrl, resolveTestCredentials } = require("./test-credential-env.cjs");

test("classifies local targets", () => {
  assert.equal(isLocalTargetUrl("http://localhost:4000"), true);
  assert.equal(isLocalTargetUrl("http://127.0.0.1:4000"), true);
  assert.equal(isLocalTargetUrl("https://ledgerbyte-api-test.vercel.app"), false);
});

test("allows local demo defaults for local targets", () => {
  const credentials = resolveTestCredentials({
    env: {},
    label: "Smoke",
    targetUrls: ["http://localhost:4000"],
    emailVar: "LEDGERBYTE_SMOKE_EMAIL",
    passwordVar: "LEDGERBYTE_SMOKE_PASSWORD",
  });

  assert.equal(credentials.email, "admin@example.com");
  assert.equal(credentials.password, "Password123!");
  assert.equal(credentials.source, "local-default");
  assert.equal(credentials.deployedTarget, false);
});

test("requires explicit credentials for deployed targets", () => {
  assert.throws(
    () =>
      resolveTestCredentials({
        env: {},
        label: "E2E",
        targetUrls: ["https://ledgerbyte-web-test.vercel.app", "https://ledgerbyte-api-test.vercel.app"],
        emailVar: "LEDGERBYTE_E2E_EMAIL",
        passwordVar: "LEDGERBYTE_E2E_PASSWORD",
      }),
    /E2E credentials must be provided explicitly/,
  );
});

test("uses explicit credentials for deployed targets without logging values in errors", () => {
  const credentials = resolveTestCredentials({
    env: {
      LEDGERBYTE_E2E_EMAIL: "test@example.test",
      LEDGERBYTE_E2E_PASSWORD: "never-print-this",
    },
    label: "E2E",
    targetUrls: ["https://ledgerbyte-web-test.vercel.app"],
    emailVar: "LEDGERBYTE_E2E_EMAIL",
    passwordVar: "LEDGERBYTE_E2E_PASSWORD",
  });

  assert.equal(credentials.email, "test@example.test");
  assert.equal(credentials.password, "never-print-this");
  assert.equal(credentials.source, "explicit");

  assert.throws(
    () =>
      resolveTestCredentials({
        env: {
          LEDGERBYTE_E2E_EMAIL: "test@example.test",
        },
        label: "E2E",
        targetUrls: ["https://ledgerbyte-web-test.vercel.app"],
        emailVar: "LEDGERBYTE_E2E_EMAIL",
        passwordVar: "LEDGERBYTE_E2E_PASSWORD",
      }),
    (error) => !String(error.message).includes("test@example.test"),
  );
});

test("requires an explicit override before deployed fallback credentials are allowed", () => {
  const credentials = resolveTestCredentials({
    env: {
      LEDGERBYTE_ALLOW_GENERATED_TEST_USER: "true",
    },
    label: "Smoke",
    targetUrls: ["https://ledgerbyte-api-test.vercel.app"],
    emailVar: "LEDGERBYTE_SMOKE_EMAIL",
    passwordVar: "LEDGERBYTE_SMOKE_PASSWORD",
  });

  assert.equal(credentials.source, "generated-override");
  assert.equal(credentials.deployedTarget, true);
});
