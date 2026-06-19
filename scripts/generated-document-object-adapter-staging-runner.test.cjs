"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  ACTIVE_MODES,
  FUTURE_GATED_MODES,
  RUNNER_STATES,
  buildGeneratedDocumentObjectAdapterStagingRunner,
  parseArgs,
} = require("./generated-document-object-adapter-staging-runner.cjs");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(__dirname, "generated-document-object-adapter-staging-runner.cjs");

function safeStagingEnv(overrides = {}) {
  return {
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_OWNER_APPROVED: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENVIRONMENT: "staging",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BASE_URL: "https://api.staging.example.test",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET: "ledgerbyte-staging-proof",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT: "https://objects.staging.example.test",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_RUN_ID: "proof-20260619",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ALLOW: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_ALLOW: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_OBJECT_STORAGE_ALLOW: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_A_ID: "tenant-a-synthetic",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_B_ID: "tenant-b-synthetic",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ROLLBACK_CONFIRMED: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_EVIDENCE_CAPTURE_CONFIRMED: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_BUCKET_POLICY_REVIEWED: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_CREDENTIAL_SCOPE_REVIEWED: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_NO_PRODUCTION_TARGET_CONFIRMED: "1",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ACCESS_KEY_ID: "fake-access-key",
    LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_SECRET_ACCESS_KEY: "fake-secret-key",
    ...overrides,
  };
}

test("help output works and states hosted proof is not executed", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /generated-document-object-adapter-staging-runner/);
  assert.match(result.stdout, /does not connect to hosted storage/);
});

test("argument parsing defaults to plan mode and supports dry-run alias", () => {
  assert.deepEqual(parseArgs([]), {
    mode: "plan",
    json: false,
    strict: false,
    help: false,
  });
  assert.deepEqual(parseArgs(["--mode", "dry-run", "--json", "--strict"]), {
    mode: "dry-run",
    json: true,
    strict: true,
    help: false,
  });
  assert.equal(parseArgs(["--dry-run"]).mode, "dry-run");
  assert.throws(() => parseArgs(["--mode", "execute"]), /Unsupported runner mode/);
});

test("plan mode is local-only and does not execute proof", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingRunner({
    repoRoot,
    env: {},
    mode: "plan",
  });

  assert.equal(result.status, "PLAN_READY");
  assert.equal(result.currentState, "PLAN_READY");
  assert.equal(result.networkEnabled, false);
  assert.equal(result.mutationEnabled, false);
  assert.equal(result.mutationAllowed, false);
  assert.equal(result.proofExecuted, false);
  assert.equal(result.hostedStorageTouched, false);
  assert.equal(result.signedUrlsGenerated, false);
  assert.equal(result.databaseTouched, false);
  assert.equal(result.runtimeDefaultStorage, "database");
  assert.equal(result.realObjectAdapterImplemented, false);
  assert.deepEqual(result.activeModes.sort(), [...ACTIVE_MODES].sort());
  assert.deepEqual(result.futureGatedModes.sort(), [...FUTURE_GATED_MODES].sort());
});

test("dry-run mode prints planned sequence without enabling network or mutation", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingRunner({
    repoRoot,
    env: {},
    mode: "dry-run",
    strict: true,
  });

  assert.equal(result.status, "DRY_RUN_ONLY");
  assert.equal(result.currentState, "PLAN_READY");
  assert.equal(result.dryRun, true);
  assert.equal(result.wouldRun.includes("synthetic-write-proof after real adapter and mutation approval"), true);
  assert.equal(result.wouldNotRun.includes("No object list/read/write/delete."), true);
  assert.equal(result.networkEnabled, false);
  assert.equal(result.mutationEnabled, false);
  assert.equal(result.proofExecuted, false);
});

test("preflight mode delegates safely and remains not ready with missing gates", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingRunner({
    repoRoot,
    env: {},
    mode: "preflight",
  });

  assert.equal(result.status, "PREFLIGHT_FAILED");
  assert.equal(result.currentState, "NOT_READY");
  assert.equal(result.preflightState, "PREFLIGHT_FAILED");
  assert.equal(result.runnerProofExecutionReady, false);
  assert.equal(result.preflight.stagingProofReady, false);
  assert.equal(result.networkEnabled, false);
  assert.equal(result.mutationAllowed, false);
  assert.match(result.preflight.missingGates.join("\n"), /proofRunId/);
});

test("safe fake staging placeholders only pass preflight, not runner proof execution", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingRunner({
    repoRoot,
    env: safeStagingEnv(),
    mode: "preflight",
  });

  assert.equal(result.status, "PREFLIGHT_PASSED_RUNNER_STILL_NOT_READY");
  assert.equal(result.currentState, "NOT_READY");
  assert.equal(result.preflightState, "PREFLIGHT_PASSED");
  assert.equal(result.preflight.stagingProofReady, true);
  assert.equal(result.preflightExecutionAllowed, true);
  assert.equal(result.runnerProofExecutionReady, false);
  assert.equal(result.proofExecuted, false);
  assert.equal(result.hostedStorageTouched, false);
  assert.equal(result.signedUrlsGenerated, false);
});

test("production-looking values are rejected through delegated preflight", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingRunner({
    repoRoot,
    env: safeStagingEnv({
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET: "ledgerbyte-prod-documents",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT: "https://objects.customer.example.test",
    }),
    mode: "preflight",
  });

  assert.equal(result.status, "PREFLIGHT_FAILED");
  assert.equal(result.preflight.targetClassification, "unsafe-production");
  assert.equal(result.preflight.stagingProofReady, false);
  assert.match(result.preflight.unsafeGates.join("\n"), /bucket/);
});

test("future hosted modes are blocked placeholders", () => {
  for (const mode of FUTURE_GATED_MODES) {
    const result = buildGeneratedDocumentObjectAdapterStagingRunner({
      repoRoot,
      env: safeStagingEnv(),
      mode,
    });

    assert.equal(result.status, "FUTURE_GATED_NOT_IMPLEMENTED", mode);
    assert.equal(result.currentState, "NOT_READY", mode);
    assert.equal(result.blockedMode, mode);
    assert.match(result.blockedReason, /intentionally not implemented/);
    assert.equal(result.networkEnabled, false);
    assert.equal(result.mutationEnabled, false);
    assert.equal(result.proofExecuted, false);
  }
});

test("proofRunId and tenant distinction are enforced by preflight", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingRunner({
    repoRoot,
    env: safeStagingEnv({
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_RUN_ID: "",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_B_ID: "tenant-a-synthetic",
    }),
    mode: "preflight",
  });

  assert.equal(result.preflight.tenantIdsDistinct, false);
  assert.match(result.preflight.missingGates.join("\n"), /proofRunId/);
  assert.match(result.preflight.unsafeGates.join("\n"), /tenant-distinct/);
});

test("JSON output is parseable and redacts secrets", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--mode", "preflight", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...safeStagingEnv({
        LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ACCESS_KEY_ID: "AKIA_FAKE_TEST_VALUE",
        LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_SECRET_ACCESS_KEY: "super-secret-value",
      }),
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  const serialized = JSON.stringify(parsed);
  assert.equal(serialized.includes("AKIA_FAKE_TEST_VALUE"), false);
  assert.equal(serialized.includes("super-secret-value"), false);
  assert.equal(parsed.preflight.credentials.accessKeyId.value, "[REDACTED]");
});

test("strict dry-run exits successfully because it is non-mutating", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--mode", "dry-run", "--json", "--strict"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, "DRY_RUN_ONLY");
  assert.equal(parsed.networkEnabled, false);
});

test("strict preflight exits non-zero when gates are missing", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--mode", "preflight", "--json", "--strict"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
  });

  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, "PREFLIGHT_FAILED");
});

test("runner state machine documents future proof lifecycle", () => {
  assert.deepEqual(RUNNER_STATES, [
    "NOT_READY",
    "PREFLIGHT_FAILED",
    "PREFLIGHT_PASSED",
    "PLAN_READY",
    "READ_ONLY_APPROVED",
    "SYNTHETIC_WRITE_APPROVED",
    "PROOF_RUNNING",
    "PROOF_FAILED",
    "PROOF_CLEANUP_REQUIRED",
    "PROOF_CLEANED_UP",
    "PROOF_EVIDENCE_READY",
  ]);
});

test("runner source avoids hosted storage SDKs, database clients, and network call APIs", () => {
  const source = fs.readFileSync(scriptPath, "utf8");

  assert.equal(source.includes("@aws-sdk/client-s3"), false);
  assert.equal(source.includes("S3Client"), false);
  assert.equal(source.includes("getSignedUrl"), false);
  assert.equal(source.includes("@prisma/client"), false);
  assert.equal(source.includes("PrismaClient"), false);
  assert.equal(source.includes("http.request"), false);
  assert.equal(source.includes("https.request"), false);
  assert.equal(source.includes("fetch("), false);
});
