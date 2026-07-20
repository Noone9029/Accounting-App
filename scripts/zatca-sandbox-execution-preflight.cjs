"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CONTRACT_PATH = "docs/zatca/ARC_07B_OFFICIAL_SANDBOX_CONTRACT_MATRIX.md";
const PACKET_PATH = "docs/zatca/ARC_07B_SANDBOX_EXECUTION_PACKET.md";
const EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/fake-sandbox-lifecycle-local-proof.json";
const CUSTODY_PROVIDER_PATH = "apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts";
const CSR_REFERENCE_PATH = "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties";

function buildSandboxExecutionPreflight(options = {}) {
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;
  const contract = readText(cwd, CONTRACT_PATH);
  const packet = readText(cwd, PACKET_PATH);
  const custodyProvider = readText(cwd, CUSTODY_PROVIDER_PATH);
  const evidencePresent = fileExists(cwd, EVIDENCE_PATH);
  const packetSha256 = sha256(packet.value || "");
  const expectedPacketSha256 = options.expectedPacketSha256;
  const packetHashMatches = !expectedPacketSha256 || timingSafeEqual(packetSha256, expectedPacketSha256);
  const productionTargetDetected = isProductionLookingTarget(env.ZATCA_SANDBOX_BASE_URL);
  const officialContractComplete = contract.ok && requiredContractFieldsConfirmed(contract.value);
  const syntheticDataVerified = packet.ok && /Synthetic identifiers only/u.test(packet.value);
  const networkEnabled = options.noNetwork === false;
  const approvalPresent = options.standaloneApproval === true;
  const credentialProviderReady = custodyProvider.ok && /providerEnabled:\s*true/u.test(custodyProvider.value) && /realProviderImplementationReady:\s*true/u.test(custodyProvider.value);
  const csrReady = fileExists(cwd, CSR_REFERENCE_PATH) && options.approvedCsrReview === true;
  const otpAvailable = approvalPresent && options.safeOtpEntryAvailable === true;
  const rollbackReady = packet.ok && /Rollback, cleanup/u.test(packet.value);
  const cleanupReady = evidencePresent && rollbackReady;
  const requestSequenceReady =
    officialContractComplete &&
    syntheticDataVerified &&
    credentialProviderReady &&
    csrReady &&
    otpAvailable &&
    approvalPresent &&
    !productionTargetDetected;
  const executionAllowed = networkEnabled && requestSequenceReady && cleanupReady && packetHashMatches;
  const safeErrorCodes = [];

  if (!contract.ok) safeErrorCodes.push("ZATCA_EXECUTION_CONTRACT_MATRIX_MISSING");
  if (!packet.ok) safeErrorCodes.push("ZATCA_EXECUTION_PACKET_MISSING");
  if (!officialContractComplete) safeErrorCodes.push("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED");
  if (!syntheticDataVerified) safeErrorCodes.push("ZATCA_SYNTHETIC_DATA_UNVERIFIED");
  if (!packetHashMatches) safeErrorCodes.push("ZATCA_EXECUTION_PACKET_HASH_MISMATCH");
  if (productionTargetDetected) safeErrorCodes.push("ZATCA_PRODUCTION_TARGET_DETECTED");

  return {
    status: "PREPARED_BLOCKED",
    safeErrorCodes,
    packetSha256,
    packetHashMatches,
    networkEnabled,
    networkCallsMade: false,
    approvalPresent,
    sandboxTargetVerified: false,
    productionTargetDetected,
    syntheticDataVerified,
    officialContractComplete,
    credentialProviderReady,
    csrReady,
    otpAvailable,
    rollbackReady,
    cleanupReady,
    evidenceReady: evidencePresent,
    requestSequenceReady,
    executionAllowed,
  };
}

function readText(cwd, relativePath) {
  try {
    return { ok: true, value: fs.readFileSync(path.join(cwd, relativePath), "utf8") };
  } catch {
    return { ok: false, value: "" };
  }
}

function fileExists(cwd, relativePath) {
  try {
    return fs.statSync(path.join(cwd, relativePath)).isFile();
  } catch {
    return false;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function timingSafeEqual(actual, expected) {
  if (typeof expected !== "string" || !/^[a-f0-9]{64}$/iu.test(expected)) return false;
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected.toLowerCase(), "hex"));
}

function isProductionLookingTarget(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const hostname = new URL(value).hostname;
    return /(^|[.-])(prod|production)([.-]|$)/iu.test(hostname);
  } catch {
    return true;
  }
}

function requiredContractFieldsConfirmed(contract) {
  const required = [
    "Official sandbox host",
    "Allowed HTTPS paths and methods",
    "API-version headers",
    "Authentication construction",
    "Compliance CSID sequence",
    "Standard clearance routing",
    "Simplified reporting routing",
  ];
  return required.every((field) => {
    const row = contract.split(/\r?\n/u).find((line) => line.includes(field));
    return row && row.includes("CONFIRMED_OFFICIAL") && !row.includes("BLOCKED_OFFICIAL");
  });
}

function parseArgs(argv) {
  const args = { json: false, noNetwork: false, strict: false, expectedPacketSha256: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") args.json = true;
    else if (token === "--no-network") args.noNetwork = true;
    else if (token === "--strict") args.strict = true;
    else if (token === "--expected-packet-sha256") args.expectedPacketSha256 = argv[index + 1];
  }
  return args;
}

function runCli(argv = process.argv.slice(2), io = console) {
  const args = parseArgs(argv);
  if (!args.noNetwork) {
    const refusal = { status: "BLOCKED_NO_NETWORK_REQUIRED", networkCallsMade: false, executionAllowed: false };
    (args.json ? io.error : io.log)(JSON.stringify(refusal));
    return 2;
  }
  const result = buildSandboxExecutionPreflight({ expectedPacketSha256: args.expectedPacketSha256, noNetwork: true });
  (args.json ? io.log : io.log)(JSON.stringify(result));
  return 0;
}

if (require.main === module) process.exitCode = runCli();

module.exports = { buildSandboxExecutionPreflight, parseArgs, runCli };
