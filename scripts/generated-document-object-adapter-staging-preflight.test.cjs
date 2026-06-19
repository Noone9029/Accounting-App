"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  ENV_KEYS,
  buildGeneratedDocumentObjectAdapterStagingPreflight,
  classifyTargetValue,
  parseArgs,
  redactValue,
} = require("./generated-document-object-adapter-staging-preflight.cjs");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(__dirname, "generated-document-object-adapter-staging-preflight.cjs");

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

test("help output works and describes local-only preflight", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /generated-document-object-adapter-staging-preflight/);
  assert.match(result.stdout, /does not connect to hosted storage/);
});

test("argument parsing defaults to dry-run preflight", () => {
  assert.deepEqual(parseArgs([]), {
    json: false,
    strict: false,
    dryRun: true,
    help: false,
  });
  assert.deepEqual(parseArgs(["--json", "--strict", "--dry-run"]), {
    json: true,
    strict: true,
    dryRun: true,
    help: false,
  });
});

test("missing environment reports required gates and stays non-networked", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env: {},
  });

  assert.equal(result.mode, "generated-document-object-adapter-staging-preflight");
  assert.equal(result.dryRun, true);
  assert.equal(result.networkEnabled, false);
  assert.equal(result.mutationEnabled, false);
  assert.equal(result.executionAllowed, false);
  assert.equal(result.stagingProofReady, false);
  assert.equal(result.mutationAllowed, false);
  assert.equal(result.environmentClassification, "missing");
  assert.equal(result.targetClassification, "missing");
  assert.match(result.missingGates.join("\n"), /approval/);
  assert.match(result.missingGates.join("\n"), /proofRunId/);
  assert.match(result.missingGates.join("\n"), /tenant-a/);
});

test("strict missing-gate JSON exits non-zero and remains parseable", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--json", "--strict", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
  });

  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.stagingProofReady, false);
  assert.equal(parsed.networkEnabled, false);
  assert.equal(parsed.mutationEnabled, false);
});

test("JSON output redacts secret-like values", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env: safeStagingEnv({
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ACCESS_KEY_ID: "AKIA_FAKE_TEST_VALUE",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_SECRET_ACCESS_KEY: "super-secret-value",
    }),
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("AKIA_FAKE_TEST_VALUE"), false);
  assert.equal(serialized.includes("super-secret-value"), false);
  assert.equal(result.credentials.accessKeyId.configured, true);
  assert.equal(result.credentials.accessKeyId.value, "[REDACTED]");
  assert.equal(result.credentials.secretAccessKey.value, "[REDACTED]");
});

test("production-looking environment, bucket, base URL, and endpoint are rejected", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env: safeStagingEnv({
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENVIRONMENT: "production",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BASE_URL: "https://app.ledgerbyte.com",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET: "ledgerbyte-prod-documents",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT: "https://storage.customer.example.test",
    }),
  });

  assert.equal(result.executionAllowed, false);
  assert.equal(result.stagingProofReady, false);
  assert.equal(result.environmentClassification, "unsafe-production");
  assert.equal(result.targetClassification, "unsafe-production");
  assert.match(result.unsafeGates.join("\n"), /environment/);
  assert.match(result.unsafeGates.join("\n"), /bucket/);
  assert.match(result.unsafeGates.join("\n"), /base-url/);
  assert.match(result.unsafeGates.join("\n"), /endpoint/);
});

test("ambiguous values do not pass strict preflight", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env: safeStagingEnv({
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENVIRONMENT: "qa",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BASE_URL: "https://api.example.invalid",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET: "ledgerbyte-documents",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT: "https://objects.example.invalid",
    }),
  });

  assert.equal(result.executionAllowed, false);
  assert.equal(result.stagingProofReady, false);
  assert.equal(result.environmentClassification, "ambiguous");
  assert.equal(result.targetClassification, "ambiguous");
  assert.match(result.unsafeGates.join("\n"), /environment/);
  assert.match(result.unsafeGates.join("\n"), /bucket/);
});

test("staging values require proofRunId, distinct tenants, allow flags, rollback, evidence, and reviews", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env: safeStagingEnv({
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_RUN_ID: "",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ALLOW: "0",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_B_ID: "tenant-a-synthetic",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ROLLBACK_CONFIRMED: "",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_EVIDENCE_CAPTURE_CONFIRMED: "",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_BUCKET_POLICY_REVIEWED: "",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_CREDENTIAL_SCOPE_REVIEWED: "",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_NO_PRODUCTION_TARGET_CONFIRMED: "",
    }),
  });

  assert.equal(result.tenantAProvided, true);
  assert.equal(result.tenantBProvided, true);
  assert.equal(result.tenantIdsDistinct, false);
  assert.match(result.missingGates.join("\n"), /proofRunId/);
  assert.match(result.missingGates.join("\n"), /allow/);
  assert.match(result.missingGates.join("\n"), /rollback/);
  assert.match(result.missingGates.join("\n"), /evidence/);
  assert.match(result.missingGates.join("\n"), /bucket-policy/);
  assert.match(result.missingGates.join("\n"), /credential-scope/);
  assert.match(result.missingGates.join("\n"), /no-production-target/);
  assert.match(result.unsafeGates.join("\n"), /tenant-distinct/);
});

test("safe staging placeholders satisfy readiness while this helper still refuses mutation", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env: safeStagingEnv(),
  });

  assert.equal(result.environmentClassification, "safe-staging");
  assert.equal(result.targetClassification, "safe-staging");
  assert.equal(result.executionAllowed, true);
  assert.equal(result.stagingProofReady, true);
  assert.equal(result.mutationAllowed, false);
  assert.equal(result.networkEnabled, false);
  assert.equal(result.mutationEnabled, false);
  assert.equal(result.hostedObjectStorageTouched, false);
  assert.equal(result.signedUrlsGenerated, false);
  assert.equal(result.schemaMigrationRequired, false);
  assert.equal(result.missingGates.length, 0);
  assert.equal(result.unsafeGates.length, 0);
});

test("local proof-looking targets are classified without allowing staging execution", () => {
  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env: safeStagingEnv({
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENVIRONMENT: "local",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BASE_URL: "http://localhost:4000",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET: "ledgerbyte-local-proof",
      LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT: "http://127.0.0.1:9000",
    }),
  });

  assert.equal(result.environmentClassification, "safe-local");
  assert.equal(result.targetClassification, "safe-local");
  assert.equal(result.executionAllowed, false);
  assert.match(result.unsafeGates.join("\n"), /environment/);
});

test("source does not import hosted storage SDKs or network clients", () => {
  const source = fs.readFileSync(scriptPath, "utf8");

  assert.equal(source.includes("@aws-sdk/client-s3"), false);
  assert.equal(source.includes("S3Client"), false);
  assert.equal(source.includes("getSignedUrl"), false);
  assert.equal(source.includes("http.request"), false);
  assert.equal(source.includes("https.request"), false);
  assert.equal(source.includes("fetch("), false);
});

test("classification and redaction helpers are conservative", () => {
  assert.equal(classifyTargetValue("ledgerbyte-prod-documents", "bucket"), "unsafe-production");
  assert.equal(classifyTargetValue("ledgerbyte-staging-proof", "bucket"), "safe-staging");
  assert.equal(classifyTargetValue("http://localhost:4000", "url"), "safe-local");
  assert.equal(classifyTargetValue("ledgerbyte-documents", "bucket"), "ambiguous");
  assert.equal(redactValue("plain-value", "bucket"), "plain-value");
  assert.equal(redactValue("postgres://user:password@db.example.test/app", "databaseUrl"), "[REDACTED]");
  assert.equal(redactValue("fake-secret", "secretAccessKey"), "[REDACTED]");
});

test("required env keys are documented by the helper", () => {
  assert.equal(ENV_KEYS.proofRunId, "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_RUN_ID");
  assert.equal(ENV_KEYS.bucket, "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET");
  assert.equal(ENV_KEYS.tenantA, "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_A_ID");
  assert.equal(ENV_KEYS.tenantB, "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_B_ID");
});
