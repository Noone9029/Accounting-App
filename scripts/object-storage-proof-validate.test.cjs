"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  STATUS_BLOCKED_MISSING_CONFIG,
  STATUS_BLOCKED_UNSAFE_MODE,
  STATUS_DRY_RUN_READY,
  STATUS_MOCK_CYCLE_PASSED,
  STATUS_S3_CONFIG_VALIDATED_NO_NETWORK,
  buildAttachmentObjectKey,
  buildGeneratedDocumentObjectKey,
  buildObjectStorageProof,
  buildSignedUrlProofPlan,
  parseArgs,
  sanitizeFilename,
  validateObjectKeyPolicy,
} = require("./object-storage-proof-validate.cjs");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(__dirname, "object-storage-proof-validate.cjs");

test("default run stays dry-run, makes no writes, and reports path policy", () => {
  const result = buildObjectStorageProof({
    repoRoot,
    env: {},
    dryRun: true,
  });

  assert.equal(result.status, STATUS_DRY_RUN_READY);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.fileWritesAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.pathPolicy.attachment.objectKey, "org/00000000-0000-0000-0000-000000000001/attachments/attachment-proof/Quarterly-Attachment-proof-.txt");
  assert.equal(
    result.pathPolicy.generatedDocument.objectKey,
    "org/00000000-0000-0000-0000-000000000001/generated-documents/generated-document-proof/Sales-Invoice-1001-proof-.pdf",
  );
});

test("mock-cycle uses only a temp directory, verifies content, and cleans up", () => {
  const result = buildObjectStorageProof({
    repoRoot,
    env: {},
    mockCycle: true,
    provider: "local",
  });

  assert.equal(result.status, STATUS_MOCK_CYCLE_PASSED);
  assert.equal(result.fileWritesAttempted, true);
  assert.equal(result.writesScopedToTempDirectory, true);
  assert.equal(result.operations.uploaded, true);
  assert.equal(result.operations.downloaded, true);
  assert.equal(result.operations.deleted, true);
  assert.equal(result.operations.cleanupVerified, true);
  assert.equal(fs.existsSync(result.mockCycle.tempRoot), false);
  assert.equal(result.mockCycle.attachment.contentType, "text/plain");
  assert.equal(result.mockCycle.generatedDocument.contentType, "application/pdf");
});

test("s3-compatible dry-run validates config by key name only and never prints secret values", () => {
  const result = buildObjectStorageProof({
    repoRoot,
    dryRun: true,
    provider: "s3-compatible",
    env: {
      S3_ENDPOINT: "https://objects.example.test",
      S3_REGION: "us-east-1",
      S3_BUCKET: "ledgerbyte-test",
      S3_ACCESS_KEY_ID: "access-key",
      S3_SECRET_ACCESS_KEY: "secret-key",
    },
  });

  assert.equal(result.status, STATUS_S3_CONFIG_VALIDATED_NO_NETWORK);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("access-key"), false);
  assert.equal(serialized.includes("secret-key"), false);
  assert.equal(result.s3CompatibleConfig.missingKeys.length, 0);
  assert.equal(result.networkAccessAttempted, false);
});

test("missing s3-compatible config blocks proof without exposing secret values", () => {
  const result = buildObjectStorageProof({
    repoRoot,
    dryRun: true,
    provider: "s3-compatible",
    env: {
      S3_ENDPOINT: "https://objects.example.test",
      S3_REGION: "us-east-1",
      S3_ACCESS_KEY_ID: "access-key",
    },
  });

  assert.equal(result.status, STATUS_BLOCKED_MISSING_CONFIG);
  assert.deepEqual(result.s3CompatibleConfig.missingKeys, ["S3_BUCKET", "S3_SECRET_ACCESS_KEY"]);
  assert.equal(JSON.stringify(result).includes("access-key"), false);
});

test("unsafe provider and mode combinations fail closed", () => {
  const result = buildObjectStorageProof({
    repoRoot,
    mockCycle: true,
    provider: "s3-compatible",
    env: {},
  });

  assert.equal(result.status, STATUS_BLOCKED_UNSAFE_MODE);
  assert.match(result.blockers.join("\n"), /Mock-cycle mode is allowed only with --provider local/);
});

test("json cli output is parseable and strict blocked mode exits non-zero", () => {
  const success = spawnSync(process.execPath, [scriptPath, "--json", "--strict", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(success.status, 0, success.stderr);
  const parsed = JSON.parse(success.stdout);
  assert.equal(parsed.status, STATUS_DRY_RUN_READY);
  assert.equal(parsed.networkAccessAttempted, false);

  const blocked = spawnSync(process.execPath, [scriptPath, "--json", "--strict", "--provider", "s3-compatible", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, S3_ENDPOINT: "", S3_REGION: "", S3_BUCKET: "", S3_ACCESS_KEY_ID: "", S3_SECRET_ACCESS_KEY: "" },
  });
  assert.equal(blocked.status, 1);
  const blockedParsed = JSON.parse(blocked.stdout);
  assert.equal(blockedParsed.status, STATUS_BLOCKED_MISSING_CONFIG);
});

test("package script works for dry-run validation", () => {
  const result = spawnSync("corepack", ["pnpm", "storage:proof-validate", "--", "--json", "--strict", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
  assert.equal(parsed.status, STATUS_DRY_RUN_READY);
});

test("helpers keep tenant-scoped keys sanitized", () => {
  assert.equal(sanitizeFilename("Invoice Copy (proof).pdf"), "Invoice-Copy-proof-.pdf");
  assert.equal(sanitizeFilename("../../tenant-b/secret.pdf"), "tenant-b-secret.pdf");
  assert.equal(
    buildAttachmentObjectKey({
      organizationId: "org 1",
      attachmentId: "attachment 1",
      filename: "Invoice Copy (proof).pdf",
    }),
    "org/org-1/attachments/attachment-1/Invoice-Copy-proof-.pdf",
  );
  assert.equal(
    buildGeneratedDocumentObjectKey({
      organizationId: "org 1",
      generatedDocumentId: "generated document 1",
      sourceType: "sales invoice",
      sourceId: "source 1",
      documentType: "SALES INVOICE",
      filename: "Invoice Copy (proof).pdf",
    }),
    "org/org-1/generated-documents/generated-document-1/Invoice-Copy-proof-.pdf",
  );
});

test("object-key policy rejects traversal, flat keys, and wrong tenant prefixes", () => {
  assert.deepEqual(validateObjectKeyPolicy("org/org-1/attachments/attachment-1/invoice.pdf", "org-1"), {
    valid: true,
    reasons: [],
  });
  assert.deepEqual(validateObjectKeyPolicy("org/org-2/attachments/attachment-1/invoice.pdf", "org-1"), {
    valid: false,
    reasons: ["Object key does not start with the authorized tenant prefix."],
  });
  assert.deepEqual(validateObjectKeyPolicy("attachments/attachment-1/invoice.pdf", "org-1"), {
    valid: false,
    reasons: ["Object key does not start with the authorized tenant prefix.", "Object key is missing a supported object type prefix."],
  });
  assert.deepEqual(validateObjectKeyPolicy("org/org-1/attachments/../secret.pdf", "org-1"), {
    valid: false,
    reasons: ["Object key contains a path traversal segment."],
  });
});

test("signed URL proof plan is dry-run only and requires authorization before any URL shape", () => {
  const result = buildObjectStorageProof({
    repoRoot,
    env: {},
    dryRun: true,
  });

  assert.equal(result.signedUrlCapability.implemented, false);
  assert.equal(result.signedUrlCapability.realSignedUrlsGenerated, false);
  assert.equal(result.signedUrlProofPlan.networkEnabled, false);
  assert.equal(result.signedUrlProofPlan.mutationEnabled, false);
  assert.equal(result.signedUrlProofPlan.authorizationContract.authorizeBeforeUrl, true);
  assert.equal(result.signedUrlProofPlan.authorizationContract.acceptDirectObjectKeyInput, false);
  assert.equal(result.signedUrlProofPlan.proofScenarios.length >= 6, true);
});

test("generated-document object-storage contract is local-only and complete enough for implementation planning", () => {
  const result = buildObjectStorageProof({
    repoRoot,
    env: {},
    dryRun: true,
  });

  assert.equal(result.generatedDocumentObjectStorageContract.currentRuntimeStorage, "database");
  assert.equal(result.generatedDocumentObjectStorageContract.objectStorageEnabled, false);
  assert.equal(result.generatedDocumentObjectStorageContract.hostedObjectStorageTouched, false);
  assert.deepEqual(result.generatedDocumentObjectStorageContract.metadataRequired, [
    "organizationId",
    "generatedDocumentId",
    "sourceType",
    "sourceId",
    "documentType",
    "mimeType",
    "fileName",
    "storageBackend",
    "objectKey",
    "sha256",
    "contentLength",
  ]);
  assert.equal(result.generatedDocumentObjectStorageContract.objectKey.requiresTenantPrefix, true);
  assert.equal(result.generatedDocumentObjectStorageContract.objectKey.requiresGeneratedDocumentId, true);
  assert.equal(result.generatedDocumentObjectStorageContract.objectKey.acceptsUserControlledKey, false);
  assert.equal(result.generatedDocumentObjectStorageContract.authorization.authorizeBeforeObjectKeyResolution, true);
  assert.equal(result.generatedDocumentObjectStorageContract.hashIntegrity.sha256Required, true);
  assert.equal(result.generatedDocumentObjectStorageContract.migration.hashEquivalenceRequired, true);
  assert.equal(result.generatedDocumentObjectStorageContract.migration.rollbackToDatabaseContentRequired, true);
  assert.equal(result.generatedDocumentObjectStorageContract.editionSafety.futureKsaArtifactsEditionGated, true);
  assert.equal(result.generatedDocumentObjectStorageContract.editionSafety.futureUaeArtifactsEditionGated, true);
});

test("signed URL staging proof plan blocks without allow flags, proofRunId, or safe target classification", () => {
  const missingGates = buildSignedUrlProofPlan({
    environment: "staging",
    proofRunId: "",
    allow: undefined,
    stagingAllow: undefined,
    bucket: "ledgerbyte-proof",
    endpoint: "https://objects.staging.example.test",
  });

  assert.equal(missingGates.safety, "refused");
  assert.match(missingGates.refusedReasons.join("\n"), /LEDGERBYTE_STORAGE_PROOF_ALLOW=1/);
  assert.match(missingGates.refusedReasons.join("\n"), /proofRunId/);
  assert.equal(missingGates.networkEnabled, false);
  assert.equal(missingGates.mutationEnabled, false);

  const productionLooking = buildSignedUrlProofPlan({
    environment: "staging",
    proofRunId: "proof-20260619",
    allow: "1",
    stagingAllow: "1",
    bucket: "ledgerbyte-production",
    endpoint: "https://objects.ledgerbyte.com",
  });

  assert.equal(productionLooking.safety, "refused");
  assert.match(productionLooking.refusedReasons.join("\n"), /production-looking/);

  const readyPlan = buildSignedUrlProofPlan({
    environment: "staging",
    proofRunId: "proof-20260619",
    allow: "1",
    stagingAllow: "1",
    bucket: "ledgerbyte-staging-proof",
    endpoint: "https://objects.staging.example.test",
  });

  assert.equal(readyPlan.safety, "ready-for-plan");
  assert.equal(readyPlan.executionMode, "staging-plan");
  assert.equal(readyPlan.cleanupScope, "proofRunId-only");
  assert.equal(readyPlan.realSignedUrlsGenerated, false);
});

test("argument parsing supports the required proof flags", () => {
  assert.deepEqual(parseArgs(["--json", "--strict", "--provider", "local", "--mock-cycle"]), {
    json: true,
    strict: true,
    dryRun: false,
    mockCycle: true,
    provider: "local",
    help: false,
  });
});
