"use strict";

const fs = require("node:fs");
const path = require("node:path");

const EVIDENCE_PATH = "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json";
const REQUIRED_FIELDS = ["sandboxHost", "complianceCsidPath", "clearancePath", "reportingPath", "authentication", "apiVersion", "complianceMatrix"];

function validateOfficialSandboxContracts(options = {}) {
  const evidence = readEvidence(options.cwd || process.cwd());
  const blockers = [];
  const sources = Array.isArray(evidence.sources) ? evidence.sources : [];
  const sourceDomainValid = sources.length > 0 && sources.every((source) => isOfficialZatcaUrl(source.url));
  const checksumsVerified = sources.length > 0 && sources.every((source) => typeof source.sha256 === "string" && /^[a-f0-9]{64}$/iu.test(source.sha256) && !/^0{64}$/u.test(source.sha256));
  const fields = evidence.fields && typeof evidence.fields === "object" ? evidence.fields : {};
  const confirmed = (name) => fields[name] === "CONFIRMED_OFFICIAL";
  const allRequiredPathsConfirmed = confirmed("complianceCsidPath") && confirmed("clearancePath") && confirmed("reportingPath");
  const sandboxHostConfirmed = confirmed("sandboxHost");
  const authenticationConfirmed = confirmed("authentication");
  const apiVersionConfirmed = confirmed("apiVersion");
  const complianceMatrixConfirmed = confirmed("complianceMatrix");
  const officialContractComplete = sourceDomainValid && checksumsVerified && sandboxHostConfirmed && allRequiredPathsConfirmed && authenticationConfirmed && apiVersionConfirmed && complianceMatrixConfirmed;

  if (!sourceDomainValid) blockers.push("ZATCA_OFFICIAL_SOURCE_DOMAIN_REJECTED");
  if (!checksumsVerified) blockers.push("ZATCA_OFFICIAL_SOURCE_CHECKSUM_UNVERIFIED");
  if (!officialContractComplete) blockers.push("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED");

  return { officialContractComplete, sandboxHostConfirmed, allRequiredPathsConfirmed, authenticationConfirmed, apiVersionConfirmed, complianceMatrixConfirmed, blockers };
}

function readEvidence(cwd) {
  try { return JSON.parse(fs.readFileSync(path.join(cwd, EVIDENCE_PATH), "utf8")); } catch { return {}; }
}

function isOfficialZatcaUrl(value) {
  try { const hostname = new URL(value).hostname.toLowerCase(); return hostname === "zatca.gov.sa" || hostname.endsWith(".zatca.gov.sa"); } catch { return false; }
}

function runCli(argv = process.argv.slice(2), io = console) {
  const result = validateOfficialSandboxContracts();
  io.log(JSON.stringify(result));
  return result.officialContractComplete ? 0 : 1;
}

if (require.main === module) process.exitCode = runCli();

module.exports = { validateOfficialSandboxContracts };
