const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-execution-preflight.cjs");
const CONTRACT_VALIDATOR_PATH = path.join(__dirname, "zatca-official-sandbox-contracts.cjs");
const CONTRACT_FIXTURE_PATH = path.join(
  __dirname,
  "..",
  "docs",
  "zatca",
  "evidence",
  "arc-07b",
  "official-sandbox-contracts.json",
);
const { computeContractSha256 } = require(CONTRACT_VALIDATOR_PATH);

test("reports a metadata-only blocked packet without loading a network module", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({ cwd: createRepo() });

  assert.equal(result.status, "PREPARED_BLOCKED");
  assert.equal(result.networkEnabled, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.approvalPresent, false);
  assert.equal(result.sandboxTargetVerified, true);
  assert.equal(result.syntheticDataVerified, true);
  assert.equal(result.officialContractComplete, true);
  assert.match(result.contractSha256, /^[a-f0-9]{64}$/u);
  assert.equal(result.contractHashMatches, true);
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

test("fails closed when the structured contract drifts from its canonical digest", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({
    mutateContractEvidence: (evidence) => {
      evidence.contract.operations.clearance.value.path = "/drifted-clearance-path";
    },
  });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.officialContractComplete, false);
  assert.equal(result.contractHashMatches, false);
  assert.equal(result.sandboxTargetVerified, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_DIGEST_MISMATCH"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED"));
  assert.equal(result.executionAllowed, false);
});

test("rejects a re-signed but invalid schema-v2 contract", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({
    mutateContractEvidence: (evidence) => {
      evidence.contract.operations.clearance.value.method = "GET";
    },
    resignContractEvidence: true,
  });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.contractHashMatches, true);
  assert.equal(result.officialContractComplete, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_SCHEMA_INVALID"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED"));
  assert.equal(result.executionAllowed, false);
});

test("rejects a packet contract digest mismatch", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo({ packetContractSha256: "0".repeat(64) }),
  });

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.packetHashMatches, true);
  assert.equal(result.contractHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_CONTRACT_PACKET_DIGEST_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("rejects a preflight evidence contract digest mismatch", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo({ evidenceContractSha256: "0".repeat(64) }),
  });

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.packetHashMatches, true);
  assert.equal(result.contractHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("fails closed when packet and preflight evidence contract digests are missing", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const result = buildSandboxExecutionPreflight({
    cwd: createRepo({
      omitPacketContractDigest: true,
      omitEvidenceContractDigest: true,
    }),
  });

  assert.equal(result.officialContractComplete, true);
  assert.equal(result.contractHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_CONTRACT_PACKET_DIGEST_MISSING"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISSING"));
  assert.equal(result.executionAllowed, false);
});

test("uses the recorded metadata packet hash when a caller does not supply one", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({ evidencePacketHash: "0".repeat(64) });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.packetHashMatches, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_EXECUTION_PACKET_HASH_MISMATCH"));
  assert.equal(result.executionAllowed, false);
});

test("normalizes packet line endings before comparing the recorded hash", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({ packetLineEnding: "\r\n" });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.packetHashMatches, true);
  assert.equal(result.contractHashMatches, true);
});

test("derives all local readiness fields from metadata-only evidence and fails closed for unresolved execution gates", () => {
  const { buildSandboxExecutionPreflight } = loadWithNetworkTrap();
  const repo = createRepo({
    custodyEvidence: {
      status: "LOCAL_PROVEN_NOT_NETWORK_READY",
      provider: "SANDBOX_LOCAL_DPAPI",
      runtimeDefault: "DISABLED",
      syntheticMaterialOnly: true,
      sensitiveBodiesRetained: false,
    },
    csrEvidence: {
      status: "LOCAL_CRYPTOGRAPHIC_PROOF_SDK_ORACLE_UNAVAILABLE",
      csrSignatureVerified: true,
      csrPublicKeyMatchesCustody: true,
      officialSdkTier2Executed: false,
    },
    otpEvidence: {
      status: "LOCAL_BOUNDARY_IMPLEMENTED_OFFICIAL_FORMAT_UNCONFIRMED",
      secureOtpInputReady: false,
      officialOtpFormatConfirmed: false,
      otpAvailable: false,
      otpPersisted: false,
    },
  });
  const result = buildSandboxExecutionPreflight({ cwd: repo });

  assert.equal(result.credentialProviderReady, true);
  assert.equal(result.signingKeyReady, true);
  assert.equal(result.certificateCustodyReady, false);
  assert.equal(result.csrLocalProofReady, true);
  assert.equal(result.csrReady, false);
  assert.equal(result.secureOtpInputReady, false);
  assert.equal(result.otpAvailable, false);
  assert.ok(result.safeErrorCodes.includes("ZATCA_CERTIFICATE_CUSTODY_NOT_READY"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_CSR_NOT_READY"));
  assert.ok(result.safeErrorCodes.includes("ZATCA_SECURE_OTP_INPUT_NOT_READY"));
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
  delete require.cache[require.resolve(CONTRACT_VALIDATOR_PATH)];
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) throw new Error(`network module requested: ${request}`);
    return originalLoad.apply(this, arguments);
  };
  try { return require(SCRIPT_PATH); } finally { Module._load = originalLoad; }
}

function createRepo(options = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-execution-preflight-"));
  const contractEvidence = createContractFixture();
  if (options.mutateContractEvidence) {
    options.mutateContractEvidence(contractEvidence);
  }
  if (options.resignContractEvidence) {
    contractEvidence.contractSha256 = computeContractSha256(contractEvidence);
  }
  const packetContractSha256 =
    options.packetContractSha256 ?? contractEvidence.contractSha256;
  const packet = Object.hasOwn(options, "packetText")
    ? options.packetText
    : buildPacket(
      packetContractSha256,
      options.packetLineEnding || "\n",
      options.omitPacketContractDigest !== true,
    );
  const preflightEvidence = {
    packetSha256:
      options.evidencePacketHash ??
      crypto
        .createHash("sha256")
        .update(`${packet}\n`.replace(/\r\n?/g, "\n"), "utf8")
        .digest("hex"),
  };
  if (!options.omitEvidenceContractDigest) {
    preflightEvidence.contractSha256 =
      options.evidenceContractSha256 ?? contractEvidence.contractSha256;
  }

  writeText(
    repo,
    "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json",
    JSON.stringify(contractEvidence),
  );
  writeText(repo, "docs/zatca/ARC_07B_SANDBOX_EXECUTION_PACKET.md", packet);
  writeText(
    repo,
    "docs/zatca/evidence/arc-07b/sandbox-execution-preflight-local.json",
    JSON.stringify(preflightEvidence),
  );
  writeText(repo, "docs/zatca/evidence/arc-07b/fake-sandbox-lifecycle-local-proof.json", "{\"networkCallsMade\":false}");
  if (options.custodyEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/sandbox-local-dpapi-custody.json", JSON.stringify(options.custodyEvidence));
  if (options.csrEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/sandbox-csr-readiness.json", JSON.stringify(options.csrEvidence));
  if (options.otpEvidence) writeText(repo, "docs/zatca/evidence/arc-07b/secure-ephemeral-otp-input.json", JSON.stringify(options.otpEvidence));
  return repo;
}

function createContractFixture() {
  const evidence = JSON.parse(fs.readFileSync(CONTRACT_FIXTURE_PATH, "utf8"));
  evidence.contractSha256 = computeContractSha256(evidence);
  return evidence;
}

function buildPacket(contractSha256, lineEnding, includeContractDigest) {
  return [
    "# packet",
    ...(includeContractDigest
      ? [`- Contract SHA-256: \`${contractSha256}\`.`]
      : []),
    "Synthetic identifiers only: `ARC07B-SYNTHETIC-001`.",
    "## Rollback, cleanup, and non-claims",
    "No network, OTP, CSID, clearance, reporting, credential, or request body is present.",
  ].join(lineEnding);
}

function writeText(repo, relativePath, value) {
  const target = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${value}\n`);
}
