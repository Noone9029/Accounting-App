"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readRecoveryTargets } = require("./recovery-guards.cjs");
const fixture = () => ({ LEDGERBYTE_DR_SOURCE_QUIESCED: "true", LEDGERBYTE_DR_SYNTHETIC_SCOPE: "true",
  LEDGERBYTE_DR_SOURCE_HOST: "source.example.test", LEDGERBYTE_DR_RESTORE_HOST: "restore.example.test",
  LEDGERBYTE_DR_SOURCE_DATABASE_URL: "postgresql://fixture:never-real@source.example.test/proof?sslmode=require",
  LEDGERBYTE_DR_RESTORE_DATABASE_URL: "postgresql://fixture:never-real@restore.example.test/proof?sslmode=require" });
test("distinct reviewed TLS endpoints accepted without connections", () => assert.equal(readRecoveryTargets(fixture()).source, fixture().LEDGERBYTE_DR_SOURCE_DATABASE_URL));
test("default and explicit port cannot disguise the same database", () => {
  const env = fixture(); env.LEDGERBYTE_DR_RESTORE_HOST = env.LEDGERBYTE_DR_SOURCE_HOST;
  env.LEDGERBYTE_DR_RESTORE_DATABASE_URL = env.LEDGERBYTE_DR_SOURCE_DATABASE_URL.replace(".test/", ".test:5432/");
  assert.throws(() => readRecoveryTargets(env), /must differ/);
});
test("TLS downgrade, wrong host and missing quiescence rejected without leaking credentials", () => {
  for (const change of [
    { LEDGERBYTE_DR_SOURCE_DATABASE_URL: fixture().LEDGERBYTE_DR_SOURCE_DATABASE_URL.replace("require", "disable") },
    { LEDGERBYTE_DR_SOURCE_HOST: "unexpected.example.test" }, { LEDGERBYTE_DR_SOURCE_QUIESCED: "false" },
  ]) {
    assert.throws(() => readRecoveryTargets({ ...fixture(), ...change }), (error) => !error.message.includes("never-real"));
  }
});
