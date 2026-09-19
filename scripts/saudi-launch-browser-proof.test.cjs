"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { backendRoute, validateDatabase, startupCapture, safeTrialScreenshot } = require("./saudi-launch-browser-proof.cjs");
test("failure screenshots are restricted to local trial pages without URL credentials", () => {
  const origin = "http://127.0.0.1:1234";
  assert.equal(safeTrialScreenshot(`${origin}/plans`, origin), true);
  assert.equal(safeTrialScreenshot(`${origin}/dashboard`, origin), true);
  for (const url of [`${origin}/register`, `${origin}/plans?token=secret`, `${origin}/plans#secret`, "https://example.test/plans", "invalid"]) assert.equal(safeTrialScreenshot(url, origin), false);
});
test("same-origin proxy preserves Next locale and strips only backend prefix", () => {
  assert.equal(backendRoute("/api/locale"), false);
  assert.equal(backendRoute("/api/locale?lang=ar"), false);
  assert.equal(backendRoute("/api/auth/login"), true);
  assert.equal(backendRoute("/dashboard"), false);
  assert.equal(backendRoute("/api-not-backend"), false);
});
test("browser mutations are confined to named local disposable proof databases", () => {
  assert.ok(validateDatabase("postgresql://fixture:fixture@127.0.0.1:5432/ledgerbyte_local_proof"));
  for (const value of ["postgresql://fixture:fixture@db.example.com/ledgerbyte_local_proof", "postgresql://fixture:fixture@127.0.0.1/ledgerbyte_production", "https://127.0.0.1/ledgerbyte_test", ""]) assert.throws(() => validateDatabase(value));
});
test("startup diagnostics classify failures without retaining arbitrary output or credentials", () => {
  const capture = startupCapture("api");
  const secrets = ["postgresql://fixture:private-password@127.0.0.1/test", "private-jwt-secret", "ledgerbyte_auth=private-cookie", "https://example.test/verify-email?token=private-token"];
  capture.append(Buffer.from(`Nest can't resolve dependencies of DocumentDeliveryService. ${secrets.join("\n")}`));
  const result = capture.summarize({ exitCode: 1, signalCode: null });
  assert.deepEqual(result.categories, ["NEST_DEPENDENCY_UNRESOLVED"]);
  assert.equal(result.exitCode, 1);
  for (const secret of secrets) assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(result).includes("DocumentDeliveryService"), false);
  capture.clear();
  assert.deepEqual(capture.summarize({}).categories, ["UNCLASSIFIED"]);
});
test("startup capture bounds output and retains only allowed spawn codes", () => {
  const capture = startupCapture("web");
  capture.append(Buffer.alloc(32 * 1024, 120));
  capture.append("Cannot find module secret-module-name");
  capture.spawnError({ code: "SECRET_CODE", message: "private spawn body" });
  const result = capture.summarize({ exitCode: null, signalCode: "PRIVATE_SIGNAL" });
  assert.deepEqual(result.categories, ["PROCESS_SPAWN_FAILED", "MODULE_NOT_FOUND"]);
  assert.equal(result.spawnCode, "OTHER");
  assert.equal(result.signal, null);
  assert.equal(result.outputTruncated, true);
  assert.equal(capture.failed, true);
  assert.equal(JSON.stringify(result).includes("secret-module-name"), false);
  assert.throws(() => startupCapture("arbitrary-secret-role"));
});
