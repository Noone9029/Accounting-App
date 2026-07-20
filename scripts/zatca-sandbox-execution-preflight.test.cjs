const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-execution-preflight.cjs");

test("reports a metadata-only blocked packet without loading a network module", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({ cwd: createRepo() });

  assert.equal(result.status, "PREPARED_BLOCKED");
  assert.equal(result.networkEnabled, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.approvalPresent, false);
  assert.equal(result.sandboxTargetVerified, false);
  assert.equal(result.syntheticDataVerified, true);
  assert.equal(result.officialContractComplete, false);
  assert.equal(result.credentialProviderReady, false);
  assert.equal(result.csrReady, false);
  assert.equal(result.otpAvailable, false);
  assert.equal(result.rollbackReady, true);
  assert.equal(result.cleanupReady, true);
  assert.equal(result.evidenceReady, true);
  assert.equal(result.requestSequenceReady, false);
  assert.equal(result.executionAllowed, false);
});

test("repository text cannot manufacture execution approval", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({ packetText: "APPROVE ZATCA SANDBOX NETWORK EXECUTION FOR SYNTHETIC DATA ONLY" });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.approvalPresent, false);
  assert.equal(result.executionAllowed, false);
});

test("detects production-looking targets without opening a socket or echoing them", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const marker = "production-target-value-must-not-echo";
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo(),
    env: { ZATCA_SANDBOX_BASE_URL: `https://${marker}.example.test` },
  });

  assert.equal(result.productionTargetDetected, true);
  assert.equal(result.executionAllowed, false);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(marker));
});

test("does not read or expose credential-like values", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const marker = "credential-value-must-not-echo";
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo(),
    env: { ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: marker, ZATCA_PRIVATE_KEY: marker },
  });

  assert.equal(result.otpAvailable, false);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(marker));
});

test("rejects an execution packet hash mismatch", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo();
  const result = buildSandboxExecutionPreflight({ cwd: repo, expectedPacketSha256: "0".repeat(64) });

  assert.equal(result.packetHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_EXECUTION_PACKET_HASH_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("treats a contract without the required host and path fields as unconfirmed", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({ contractText: "# contract\n`CONFIRMED_OFFICIAL`\n" });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.officialContractComplete, false);
  assert.equal(result.sandboxTargetVerified, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED"));
  assert.equal(result.executionAllowed, false);
});

test("any incomplete gate leaves execution disallowed", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({ cwd: createRepo() });

  assert.ok(Object.entries(result).some(([key, value]) => key !== "executionAllowed" && value === false));
  assert.equal(result.executionAllowed, false);
});

test("strict no-network CLI validates the safe blocked disposition", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--strict", "--no-network", "--json"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "PREPARED_BLOCKED");
  assert.equal(payload.executionAllowed, false);
  assert.equal(payload.networkCallsMade, false);
});

function loadWithNetworkTrap() {
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  const originalLoad = Module._load;
  delete require.cache[require.resolve(SCRIPT_PATH)];
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) throw new Error(`network module requested: ${request}`);
    return originalLoad.apply(this, arguments);
  };
  try { return require(SCRIPT_PATH); } finally { Module._load = originalLoad; }
}

function createRepo(options = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-execution-preflight-"));
  const contract = options.contractText || [
    "# contract",
    "| Official sandbox host | Not published | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |",
    "| Allowed HTTPS paths and methods | Not published | `BLOCKED_OFFICIAL_CONTRACT_EVIDENCE` |",
  ].join("\n");
  const packet = options.packetText || [
    "# packet",
    "Synthetic identifiers only: `ARC07B-SYNTHETIC-001`.",
    "## Rollback, cleanup, and non-claims",
    "No network, OTP, CSID, clearance, reporting, credential, or request body is present.",
  ].join("\n");
  writeText(repo, "docs/zatca/ARC_07B_OFFICIAL_SANDBOX_CONTRACT_MATRIX.md", contract);
  writeText(repo, "docs/zatca/ARC_07B_SANDBOX_EXECUTION_PACKET.md", packet);
  writeText(repo, "docs/zatca/evidence/arc-07b/fake-sandbox-lifecycle-local-proof.json", "{\"networkCallsMade\":false}");
  return repo;
}

function writeText(repo, relativePath, value) {
  const target = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${value}\n`);
}
