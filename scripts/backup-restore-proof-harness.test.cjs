"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  ARTIFACT_TYPE,
  MANIFEST_VERSION,
  PAYLOAD_FILENAME,
  STATUS_BLOCKED_MISSING_DOCS,
  STATUS_BLOCKED_REAL_DATA_REQUESTED,
  STATUS_BLOCKED_UNSAFE_PATH,
  STATUS_DRY_RUN_READY,
  STATUS_MOCK_CYCLE_PASSED,
  buildBackupRestoreProof,
  buildSyntheticFixture,
  parseArgs,
  runMockCycle,
  verifyMockArtifact,
} = require("./backup-restore-proof-harness.cjs");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(__dirname, "backup-restore-proof-harness.cjs");

test("default run stays dry-run and makes no artifact writes", () => {
  const result = buildBackupRestoreProof({
    repoRoot,
    dryRun: true,
  });

  assert.equal(result.status, STATUS_DRY_RUN_READY);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.fileWritesAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.databaseAccessAttempted, false);
  assert.equal(result.requiredSurfaceSummary.allPresent, true);
});

test("mock-cycle writes only inside temp, validates manifest and counts, and cleans up by default", () => {
  const result = buildBackupRestoreProof({
    repoRoot,
    mockCycle: true,
  });

  assert.equal(result.status, STATUS_MOCK_CYCLE_PASSED);
  assert.equal(result.fileWritesAttempted, true);
  assert.equal(result.writesScopedToTempDirectory, true);
  assert.equal(result.mockCycle.restoreVerification.manifestVersionValid, true);
  assert.equal(result.mockCycle.restoreVerification.artifactTypeValid, true);
  assert.equal(result.mockCycle.restoreVerification.checksumVerified, true);
  assert.equal(result.mockCycle.restoreVerification.recordCountsVerified, true);
  assert.equal(result.mockCycle.restoreVerification.payloadPathInsideArtifactRoot, true);
  assert.equal(result.mockCycle.artifactRootRemoved, true);
  assert.equal(fs.existsSync(result.mockCycle.artifactRoot), false);
});

test("proof result exposes evidence output and tenant-boundary summaries without artifact bodies", () => {
  const result = buildBackupRestoreProof({
    repoRoot,
    mockCycle: true,
  });

  assert.deepEqual(result.evidenceOutputFormat, {
    format: "json",
    manifestFile: "backup-manifest.json",
    payloadFile: "synthetic-backup.payload.json",
    checksumAlgorithm: "sha256",
    includesPayloadBody: false,
    includesSecretValues: false,
    includesProviderCredentials: false,
    includesCustomerData: false,
  });
  assert.deepEqual(result.tenantBoundaryProof, {
    sourceMode: "synthetic-local",
    syntheticOrganizationIds: ["org-synth-001"],
    organizationScopedObjectKeys: true,
    crossTenantMarkersPresent: false,
    customerDocumentBodiesPresent: false,
    attachmentBodiesPresent: false,
  });
});

test("mock-cycle can keep artifacts for debugging inside a safe temp directory", () => {
  const keptRoot = path.join(os.tmpdir(), `ledgerbyte-backup-proof-test-${Date.now()}`);
  const result = buildBackupRestoreProof({
    repoRoot,
    mockCycle: true,
    artifactDir: keptRoot,
    keepArtifacts: true,
  });

  assert.equal(result.status, STATUS_MOCK_CYCLE_PASSED);
  assert.equal(result.mockCycle.keepArtifacts, true);
  assert.equal(fs.existsSync(result.mockCycle.manifestPath), true);
  assert.equal(fs.existsSync(result.mockCycle.payloadPath), true);

  fs.rmSync(keptRoot, { recursive: true, force: true });
});

test("unsafe artifact paths are blocked", () => {
  const unsafeRoot = path.join(path.parse(os.tmpdir()).root, "ledgerbyte-unsafe-proof");
  const result = buildBackupRestoreProof({
    repoRoot,
    mockCycle: true,
    artifactDir: unsafeRoot,
  });

  assert.equal(result.status, STATUS_BLOCKED_UNSAFE_PATH);
  assert.match(result.blockers.join("\n"), /inside the temp root/);
});

test("real-data mode is blocked", () => {
  const result = buildBackupRestoreProof({
    repoRoot,
    dryRun: true,
    realData: true,
  });

  assert.equal(result.status, STATUS_BLOCKED_REAL_DATA_REQUESTED);
});

test("missing required docs block the harness", () => {
  const fixtureRoot = createFixtureRepo();
  fs.rmSync(path.join(fixtureRoot, "docs", "production", "OBJECT_STORAGE_PROOF_PLAN.md"));
  const result = buildBackupRestoreProof({
    repoRoot: fixtureRoot,
    dryRun: true,
  });

  assert.equal(result.status, STATUS_BLOCKED_MISSING_DOCS);
  assert.match(result.blockers.join("\n"), /OBJECT_STORAGE_PROOF_PLAN/);
});

test("checksum verification fails if the payload is tampered", () => {
  const artifactRoot = path.join(os.tmpdir(), `ledgerbyte-backup-proof-tamper-${Date.now()}`);
  const cycle = runMockCycle({ requestedArtifactDir: artifactRoot, keepArtifacts: true });

  try {
    fs.writeFileSync(cycle.payloadPath, JSON.stringify({ tampered: true }, null, 2), "utf8");
    assert.throws(
      () =>
        verifyMockArtifact({
          artifactRoot,
          manifestPath: cycle.manifestPath,
          payloadPath: cycle.payloadPath,
        }),
      /checksum verification failed/i,
    );
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
});

test("restore count verification fails if manifest counts do not match", () => {
  const artifactRoot = path.join(os.tmpdir(), `ledgerbyte-backup-proof-count-${Date.now()}`);
  const cycle = runMockCycle({ requestedArtifactDir: artifactRoot, keepArtifacts: true });

  try {
    const manifest = JSON.parse(fs.readFileSync(cycle.manifestPath, "utf8"));
    manifest.recordCounts.documentMetadata += 1;
    fs.writeFileSync(cycle.manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    assert.throws(
      () =>
        verifyMockArtifact({
          artifactRoot,
          manifestPath: cycle.manifestPath,
          payloadPath: cycle.payloadPath,
        }),
      /Record count verification failed/i,
    );
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
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
  assert.equal(parsed.databaseAccessAttempted, false);

  const blocked = spawnSync(process.execPath, [scriptPath, "--json", "--strict", "--real-data"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(blocked.status, 1);
  const blockedParsed = JSON.parse(blocked.stdout);
  assert.equal(blockedParsed.status, STATUS_BLOCKED_REAL_DATA_REQUESTED);
});

test("package script works for dry-run validation", () => {
  const result = spawnSync("corepack", ["pnpm", "backup:restore-proof", "--", "--json", "--strict", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
  assert.equal(parsed.status, STATUS_DRY_RUN_READY);
});

test("no env secret values are printed and forbidden claims are absent", () => {
  const fakeEnvFixtures = {
    LEDGERBYTE_TEST_PASSWORD_PLACEHOLDER: "FAKE_TEST_PASSWORD_PLACEHOLDER",
    LEDGERBYTE_TEST_TOKEN_PLACEHOLDER: "FAKE_TEST_TOKEN_PLACEHOLDER",
    LEDGERBYTE_TEST_SECRET_PLACEHOLDER: "not-a-real-secret-for-redaction-test",
    LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER: "FAKE_TEST_DATABASE_URL_PLACEHOLDER",
  };
  const result = spawnSync(process.execPath, [scriptPath, "--json", "--strict", "--dry-run"], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...fakeEnvFixtures,
    },
  });

  assert.equal(result.status, 0, result.stderr);
  for (const [key, value] of Object.entries(fakeEnvFixtures)) {
    assert.equal(result.stdout.includes(key), false);
    assert.equal(result.stdout.includes(value), false);
  }
  assert.equal(result.stdout.includes("production-ready backup"), false);
  assert.equal(result.stdout.includes("production restore proof complete"), false);
  assert.equal(result.stdout.includes("disaster recovery ready"), false);
  assert.equal(result.stdout.includes("customer-data restore proven"), false);
});

test("argument parsing supports the required flags", () => {
  assert.deepEqual(parseArgs(["--json", "--strict", "--mock-cycle", "--artifact-dir", "C:\\temp\\ledgerbyte-proof", "--keep-artifacts"]), {
    json: true,
    strict: true,
    dryRun: false,
    mockCycle: true,
    artifactDir: "C:\\temp\\ledgerbyte-proof",
    keepArtifacts: true,
    realData: false,
    help: false,
  });
});

test("synthetic fixture uses the expected artifact shape", () => {
  const fixture = buildSyntheticFixture();
  assert.equal(fixture.organizationMetadata.length, 1);
  assert.equal(fixture.documentMetadata.length, 3);
  assert.equal(fixture.attachmentMetadata.length, 2);
  assert.equal(fixture.generatedDocumentMetadata.length, 2);
  assert.equal(fixture.auditEventMetadata.length, 3);
});

test("manifest fields remain stable", () => {
  const artifactRoot = path.join(os.tmpdir(), `ledgerbyte-backup-proof-manifest-${Date.now()}`);
  const cycle = runMockCycle({ requestedArtifactDir: artifactRoot, keepArtifacts: true });

  try {
    const manifest = JSON.parse(fs.readFileSync(cycle.manifestPath, "utf8"));
    assert.equal(manifest.manifestVersion, MANIFEST_VERSION);
    assert.equal(manifest.artifactType, ARTIFACT_TYPE);
    assert.equal(manifest.payloadFile, PAYLOAD_FILENAME);
  } finally {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }
});

function createFixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-backup-proof-fixture-"));
  write(root, "package.json", JSON.stringify({ name: "fixture-ledgerbyte", private: true }, null, 2));
  write(root, "README.md", "# LedgerByte\nControlled beta only.\n");
  write(root, "docs/BACKUP_AND_RESTORE_READINESS_PLAN.md", "# Backup readiness\n");
  write(root, "docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md", "# Audit\n");
  write(root, "docs/production/OBJECT_STORAGE_PROOF_PLAN.md", "# Object storage proof\n");
  write(root, "scripts/production-trust-foundation-gate.cjs", "module.exports = {};\n");
  write(root, "scripts/object-storage-proof-validate.cjs", "module.exports = {};\n");
  return root;
}

function write(root, relativePath, contents) {
  const targetPath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents, "utf8");
}
