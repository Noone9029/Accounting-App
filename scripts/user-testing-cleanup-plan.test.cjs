"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertSafeConfiguration,
  boolEnv,
  isAllowedUserTestingHost,
  normalizeApiUrl,
  redactUrl,
  summarizeCount,
} = require("./user-testing-cleanup-plan.cjs");

const knownOrgId = "00000000-0000-0000-0000-000000000001";

test("normalizes and redacts API URLs without query strings", () => {
  assert.equal(normalizeApiUrl("https://ledgerbyte-api-test.vercel.app///"), "https://ledgerbyte-api-test.vercel.app");
  assert.equal(redactUrl("https://ledgerbyte-api-test.vercel.app/path?token=secret"), "https://ledgerbyte-api-test.vercel.app");
});

test("allows only localhost and LedgerByte API test hosts by default", () => {
  assert.equal(isAllowedUserTestingHost("http://localhost:4000"), true);
  assert.equal(isAllowedUserTestingHost("https://ledgerbyte-api-test.vercel.app"), true);
  assert.equal(isAllowedUserTestingHost("https://ledgerbyte-api-test-abc123-ahmad-khalid-s-projects.vercel.app"), true);
  assert.equal(isAllowedUserTestingHost("https://api.ledgerbyte.co"), false);
  assert.equal(isAllowedUserTestingHost("https://ledgerbyte-web-test.vercel.app"), false);
});

test("refuses missing or unknown organization ids unless explicitly allowed", () => {
  assert.throws(
    () => assertSafeConfiguration({ apiUrl: "https://ledgerbyte-api-test.vercel.app", organizationId: "" }),
    /ORG_ID is required/,
  );
  assert.throws(
    () =>
      assertSafeConfiguration({
        apiUrl: "https://ledgerbyte-api-test.vercel.app",
        organizationId: "11111111-1111-1111-1111-111111111111",
      }),
    /refuses unknown organization ids/,
  );
  assert.doesNotThrow(() =>
    assertSafeConfiguration({
      apiUrl: "https://ledgerbyte-api-test.vercel.app",
      organizationId: "11111111-1111-1111-1111-111111111111",
      allowUnknownOrg: true,
    }),
  );
});

test("refuses unsafe hosts unless explicitly allowed", () => {
  assert.throws(
    () => assertSafeConfiguration({ apiUrl: "https://api.ledgerbyte.co", organizationId: knownOrgId }),
    /refuses this API host/,
  );
  assert.doesNotThrow(() =>
    assertSafeConfiguration({
      apiUrl: "https://api.ledgerbyte.co",
      organizationId: knownOrgId,
      allowUnsafeHost: true,
    }),
  );
});

test("summarizes counts without requiring record contents", () => {
  assert.equal(summarizeCount([{ id: "one" }, { id: "two" }]), 2);
  assert.equal(summarizeCount({ items: [{ id: "one" }] }), 1);
  assert.equal(summarizeCount({ count: 7 }), 7);
  assert.equal(summarizeCount({ status: "ok" }), null);
});

test("parses true env flags narrowly", () => {
  assert.equal(boolEnv("true"), true);
  assert.equal(boolEnv("TRUE"), true);
  assert.equal(boolEnv("1"), false);
  assert.equal(boolEnv(undefined), false);
});
