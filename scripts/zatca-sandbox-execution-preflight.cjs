"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  computeContractSha256,
  validateOfficialSandboxContracts,
} = require("./zatca-official-sandbox-contracts.cjs");

const CONTRACT_EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json";
const PACKET_PATH = "docs/zatca/ARC_07B_SANDBOX_EXECUTION_PACKET.md";
const EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/fake-sandbox-lifecycle-local-proof.json";
const CUSTODY_EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/sandbox-local-dpapi-custody.json";
const CSR_EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/sandbox-csr-readiness.json";
const OTP_EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/secure-ephemeral-otp-input.json";
const PREFLIGHT_EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/sandbox-execution-preflight-local.json";

function buildSandboxExecutionPreflight(options = {}) {
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;
  const contractEvidence = readJsonMetadata(cwd, CONTRACT_EVIDENCE_PATH, 1024 * 1024);
  const contractValidation = validateOfficialSandboxContracts({ cwd });
  const computedContractSha256 = contractEvidence.ok
    ? computeContractSha256(contractEvidence.value)
    : "";
  const validatorContractHashMatches = timingSafeEqual(
    computedContractSha256,
    contractValidation.contractSha256,
  );
  const contractSha256 = validatorContractHashMatches
    ? computedContractSha256
    : "";
  const packet = readText(cwd, PACKET_PATH);
  const custodyEvidence = readJsonMetadata(cwd, CUSTODY_EVIDENCE_PATH);
  const csrEvidence = readJsonMetadata(cwd, CSR_EVIDENCE_PATH);
  const otpEvidence = readJsonMetadata(cwd, OTP_EVIDENCE_PATH);
  const preflightEvidence = readJsonMetadata(cwd, PREFLIGHT_EVIDENCE_PATH);
  const evidencePresent = fileExists(cwd, EVIDENCE_PATH);
  const packetSha256 = sha256(packet.value || "");
  const expectedPacketSha256 = options.expectedPacketSha256 ?? preflightEvidence.value.packetSha256;
  const packetHashMatches = timingSafeEqual(packetSha256, expectedPacketSha256);
  const packetContractSha256 = packet.ok
    ? extractPacketContractSha256(packet.value)
    : "";
  const evidenceContractSha256 = preflightEvidence.value.contractSha256;
  const packetContractHashMatches = timingSafeEqual(
    contractSha256,
    packetContractSha256,
  );
  const evidenceContractHashMatches = timingSafeEqual(
    contractSha256,
    evidenceContractSha256,
  );
  const contractHashMatches =
    validatorContractHashMatches &&
    packetContractHashMatches &&
    evidenceContractHashMatches;
  const productionTargetDetected = isProductionLookingTarget(env.ZATCA_SANDBOX_BASE_URL);
  const officialContractComplete =
    contractValidation.officialContractComplete === true &&
    validatorContractHashMatches;
  const syntheticDataVerified = packet.ok && /Synthetic identifiers only/u.test(packet.value);
  const networkEnabled = options.noNetwork === false;
  const approvalPresent = options.standaloneApproval === true;
  const credentialProviderReady = custodyEvidence.ok && custodyEvidence.value.status === "LOCAL_PROVEN_NOT_NETWORK_READY" && custodyEvidence.value.provider === "SANDBOX_LOCAL_DPAPI" && custodyEvidence.value.runtimeDefault === "DISABLED" && custodyEvidence.value.syntheticMaterialOnly === true && custodyEvidence.value.sensitiveBodiesRetained === false;
  const signingKeyReady = csrEvidence.ok && csrEvidence.value.csrSignatureVerified === true && csrEvidence.value.csrPublicKeyMatchesCustody === true;
  const certificateCustodyReady = custodyEvidence.ok && custodyEvidence.value.certificateCustodyReady === true;
  const csrLocalProofReady = signingKeyReady && typeof csrEvidence.value.status === "string" && csrEvidence.value.status.startsWith("LOCAL_CRYPTOGRAPHIC_PROOF");
  const csrReady = csrLocalProofReady && csrEvidence.value.officialSdkTier2Executed === true;
  const secureOtpInputReady = otpEvidence.ok && otpEvidence.value.secureOtpInputReady === true && otpEvidence.value.officialOtpFormatConfirmed === true && otpEvidence.value.otpPersisted === false;
  const otpAvailable = approvalPresent && options.safeOtpEntryAvailable === true;
  const rollbackReady = packet.ok && /Rollback, cleanup/u.test(packet.value);
  const evidenceReady = evidencePresent && preflightEvidence.ok;
  const cleanupReady = evidenceReady && rollbackReady;
  const requestSequenceReady =
    officialContractComplete &&
    !productionTargetDetected &&
    syntheticDataVerified &&
    credentialProviderReady &&
    signingKeyReady &&
    certificateCustodyReady &&
    csrReady &&
    secureOtpInputReady &&
    otpAvailable &&
    approvalPresent;
  const executionAllowed =
    networkEnabled &&
    requestSequenceReady &&
    cleanupReady &&
    packetHashMatches &&
    contractHashMatches;
  const safeErrorCodes = [];
  const addSafeErrorCode = (code) => {
    if (!safeErrorCodes.includes(code)) safeErrorCodes.push(code);
  };

  for (const blocker of contractValidation.blockers || []) {
    if (typeof blocker === "string" && /^ZATCA_[A-Z0-9_]+$/u.test(blocker)) {
      addSafeErrorCode(blocker);
    }
  }
  if (!contractEvidence.ok) addSafeErrorCode("ZATCA_EXECUTION_CONTRACT_EVIDENCE_MISSING");
  if (!packet.ok) addSafeErrorCode("ZATCA_EXECUTION_PACKET_MISSING");
  if (!officialContractComplete) addSafeErrorCode("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED");
  if (!officialContractComplete) addSafeErrorCode("ZATCA_SANDBOX_TARGET_UNCONFIRMED");
  if (!isSha256(packetContractSha256)) addSafeErrorCode("ZATCA_CONTRACT_PACKET_DIGEST_MISSING");
  else if (!packetContractHashMatches) addSafeErrorCode("ZATCA_CONTRACT_PACKET_DIGEST_MISMATCH");
  if (!isSha256(evidenceContractSha256)) addSafeErrorCode("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISSING");
  else if (!evidenceContractHashMatches) addSafeErrorCode("ZATCA_CONTRACT_EVIDENCE_DIGEST_MISMATCH");
  if (!syntheticDataVerified) addSafeErrorCode("ZATCA_SYNTHETIC_DATA_UNVERIFIED");
  if (!credentialProviderReady) addSafeErrorCode("ZATCA_CREDENTIAL_PROVIDER_NOT_READY");
  if (!signingKeyReady) addSafeErrorCode("ZATCA_SIGNING_KEY_NOT_READY");
  if (!certificateCustodyReady) addSafeErrorCode("ZATCA_CERTIFICATE_CUSTODY_NOT_READY");
  if (!csrReady) addSafeErrorCode("ZATCA_CSR_NOT_READY");
  if (!secureOtpInputReady) addSafeErrorCode("ZATCA_SECURE_OTP_INPUT_NOT_READY");
  if (!otpAvailable) addSafeErrorCode("ZATCA_OTP_UNAVAILABLE");
  if (!requestSequenceReady) addSafeErrorCode("ZATCA_REQUEST_SEQUENCE_NOT_READY");
  if (!isSha256(expectedPacketSha256)) addSafeErrorCode("ZATCA_EXECUTION_PACKET_HASH_MISSING");
  else if (!packetHashMatches) addSafeErrorCode("ZATCA_EXECUTION_PACKET_HASH_MISMATCH");
  if (productionTargetDetected) addSafeErrorCode("ZATCA_PRODUCTION_TARGET_DETECTED");

  return {
    status: "PREPARED_BLOCKED",
    safeErrorCodes,
    contractSha256,
    contractHashMatches,
    packetSha256,
    packetHashMatches,
    networkEnabled,
    networkCallsMade: false,
    approvalPresent,
    sandboxTargetVerified: officialContractComplete && !productionTargetDetected,
    productionTargetDetected,
    syntheticDataVerified,
    officialContractComplete,
    credentialProviderReady,
    signingKeyReady,
    certificateCustodyReady,
    csrLocalProofReady,
    csrReady,
    secureOtpInputReady,
    otpAvailable,
    rollbackReady,
    cleanupReady,
    evidenceReady,
    requestSequenceReady,
    executionAllowed,
  };
}

function readJsonMetadata(cwd, relativePath, maxBytes = 65536) {
  const text = readText(cwd, relativePath);
  if (!text.ok || Buffer.byteLength(text.value, "utf8") > maxBytes) {
    return { ok: false, value: {} };
  }
  try {
    const value = JSON.parse(text.value);
    return value && typeof value === "object" && !Array.isArray(value) ? { ok: true, value } : { ok: false, value: {} };
  } catch {
    return { ok: false, value: {} };
  }
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
  return crypto.createHash("sha256").update(value.replace(/\r\n?/gu, "\n"), "utf8").digest("hex");
}

function timingSafeEqual(actual, expected) {
  if (!isSha256(actual) || !isSha256(expected)) return false;
  return crypto.timingSafeEqual(
    Buffer.from(actual.toLowerCase(), "hex"),
    Buffer.from(expected.toLowerCase(), "hex"),
  );
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/iu.test(value);
}

function extractPacketContractSha256(value) {
  const matchingLines = value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .filter((line) => /^(?:- )?Contract SHA-256:/u.test(line));
  if (matchingLines.length !== 1) return "";
  const match = /^(?:- )?Contract SHA-256: `([a-f0-9]{64})`\.?$/iu.exec(
    matchingLines[0],
  );
  return match ? match[1].toLowerCase() : "";
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
