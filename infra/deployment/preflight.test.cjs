"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { appSpec } = require("../../.do/app-spec.cjs");
const { inspectTemplate, inspectEvidence, gates } = require("./preflight.cjs");
const now = new Date("2026-09-19T12:00:00Z");
const revision = "a".repeat(40);
const evidence = () => ({ sourceRevision: revision, checks: Object.fromEntries(gates.map((gate) => [gate, { status: "PASS", scope: "hosted-non-production", reference: "evidence/run-001", verifiedAt: now.toISOString() }])) });
test("review template keeps secrets out of web and strips API prefix", () => assert.deepEqual(inspectTemplate(), []));
test("no evidence is blocked", () => assert.ok(inspectEvidence({}, revision, now).length > 0));
test("Next locale API is not shadowed by the backend route", () => {
  const spec = structuredClone(appSpec);
  spec.ingress.rules = spec.ingress.rules.filter((route) => route.match.path.prefix !== "/api/locale");
  assert.ok(inspectTemplate(spec).some((problem) => problem.includes("locale")));
  const misordered = structuredClone(appSpec);
  misordered.ingress.rules.push(misordered.ingress.rules.shift());
  assert.ok(inspectTemplate(misordered).some((problem) => problem.includes("locale")));
});
test("same-release hosted evidence references pass metadata validation only", () => assert.deepEqual(inspectEvidence(evidence(), revision, now), []));
test("local, stale and wrong-release evidence cannot pass", () => {
  const input = evidence(); input.checks.databaseRestore.scope = "local";
  input.checks.objectRestore.verifiedAt = "2026-01-01T00:00:00Z";
  assert.ok(inspectEvidence(input, "b".repeat(40), now).length >= 3);
});
test("migration credential, plaintext secret and automatic scaling are rejected", () => {
  const spec = structuredClone(appSpec);
  spec.services[1].envs.push({ key: "DIRECT_URL", value: "", type: "SECRET" });
  spec.services[0].envs.push({ key: "JWT_SECRET", value: "fixture-secret-only", type: "SECRET" });
  spec.workers[0].instance_count = 2;
  assert.ok(inspectTemplate(spec).length >= 3);
});
test("self-service cannot be enabled without billing enforcement", () => {
  const spec = structuredClone(appSpec);
  const api = spec.services.find((component) => component.name === "api");
  const flag = api.envs.find((item) => item.key === "LEDGERBYTE_SELF_SERVICE_ENABLED");
  const mode = api.envs.find((item) => item.key === "BILLING_ENFORCEMENT_MODE");
  flag.value = "true";
  for (const value of ["DISABLED", "OBSERVE", "", undefined]) {
    mode.value = value;
    assert.ok(inspectTemplate(spec).some((problem) => problem.includes("self-service requires billing enforcement")));
  }
  mode.value = "ENFORCE";
  assert.deepEqual(inspectTemplate(spec), []);
});
