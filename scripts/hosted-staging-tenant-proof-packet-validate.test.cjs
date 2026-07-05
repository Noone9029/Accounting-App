"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const {
  STATUS_BLOCKED,
  STATUS_READY,
  validateHostedStagingTenantProofPacket,
} = require("./hosted-staging-tenant-proof-packet-validate.cjs");

const repoRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(__dirname, "hosted-staging-tenant-proof-packet-validate.cjs");

test("validates the committed packet and checklist without network or hosted execution", () => {
  const result = validateHostedStagingTenantProofPacket({ repoRoot });

  assert.equal(result.status, STATUS_READY);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.forbidden, []);
  assert.equal(result.networkAttempted, false);
  assert.equal(result.hostedProofExecuted, false);
  assert.equal(result.hostedMutationAttempted, false);
  assert.equal(result.hostedMigrationAttempted, false);
  assert.equal(result.cleanupExecuteAttempted, false);
  assert.equal(result.providerStorageApiAttempted, false);
});

test("strict CLI emits JSON and exits successfully for committed docs", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--json", "--strict"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, STATUS_READY);
  assert.equal(payload.hostedProofExecuted, false);
});

test("blocks incomplete packet/checklist files", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-hosted-proof-packet-"));
  fs.writeFileSync(path.join(tempRoot, "HOSTED_STAGING_TENANT_PROOF_PACKET.md"), "# Packet\nStaging URL\n", "utf8");
  fs.writeFileSync(path.join(tempRoot, "HOSTED_STAGING_TENANT_PROOF_EXECUTION_CHECKLIST.md"), "# Checklist\n", "utf8");

  const result = validateHostedStagingTenantProofPacket({ repoRoot: tempRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.equal(result.missing.length > 5, true);
});

test("blocks committed secret-looking packet content", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-hosted-proof-secret-"));
  const packet = fs.readFileSync(path.join(repoRoot, "HOSTED_STAGING_TENANT_PROOF_PACKET.md"), "utf8");
  const checklist = fs.readFileSync(path.join(repoRoot, "HOSTED_STAGING_TENANT_PROOF_EXECUTION_CHECKLIST.md"), "utf8");
  fs.writeFileSync(
    path.join(tempRoot, "HOSTED_STAGING_TENANT_PROOF_PACKET.md"),
    `${packet}\n$env:LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN = 'real-token-looking-value'\n`,
    "utf8",
  );
  fs.writeFileSync(path.join(tempRoot, "HOSTED_STAGING_TENANT_PROOF_EXECUTION_CHECKLIST.md"), checklist, "utf8");

  const result = validateHostedStagingTenantProofPacket({ repoRoot: tempRoot });

  assert.equal(result.status, STATUS_BLOCKED);
  assert.match(result.forbidden.join("\n"), /raw bearer token assignment/);
});
