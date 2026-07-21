const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT = path.join(__dirname, "zatca-official-sandbox-contracts.cjs");

test("fails closed when the official contract evidence has unresolved endpoint fields", () => {
  const { validateOfficialSandboxContracts } = require(SCRIPT);
  const result = validateOfficialSandboxContracts({ cwd: createRepo() });

  assert.equal(result.officialContractComplete, false);
  assert.equal(result.sandboxHostConfirmed, false);
  assert.equal(result.allRequiredPathsConfirmed, false);
  assert.equal(result.authenticationConfirmed, false);
  assert.ok(result.blockers.includes("ZATCA_OFFICIAL_CONTRACT_UNCONFIRMED"));
});

test("rejects non-official source domains and checksum mismatches without reading document bodies", () => {
  const { validateOfficialSandboxContracts } = require(SCRIPT);
  const result = validateOfficialSandboxContracts({
    cwd: createRepo({ sources: [{ title: "bad", url: "https://example.test/spec", sha256: "0".repeat(64) }] }),
  });

  assert.equal(result.officialContractComplete, false);
  assert.ok(result.blockers.includes("ZATCA_OFFICIAL_SOURCE_DOMAIN_REJECTED"));
  assert.ok(result.blockers.includes("ZATCA_OFFICIAL_SOURCE_CHECKSUM_UNVERIFIED"));
  assert.doesNotMatch(JSON.stringify(result), /example\.test/);
});

function createRepo(options = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-contracts-"));
  const sources = options.sources || [{ title: "Official", url: "https://zatca.gov.sa/spec", sha256: "a".repeat(64) }];
  write(cwd, "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json", JSON.stringify({ sources, fields: {
    sandboxHost: "BLOCKED_OFFICIAL_CONTRACT_EVIDENCE",
    complianceCsidPath: "BLOCKED_OFFICIAL_CONTRACT_EVIDENCE",
    clearancePath: "BLOCKED_OFFICIAL_CONTRACT_EVIDENCE",
    reportingPath: "BLOCKED_OFFICIAL_CONTRACT_EVIDENCE",
    authentication: "BLOCKED_OFFICIAL_CONTRACT_EVIDENCE",
    apiVersion: "BLOCKED_OFFICIAL_CONTRACT_EVIDENCE",
    complianceMatrix: "BLOCKED_OFFICIAL_CONTRACT_EVIDENCE",
  } }, null, 2));
  return cwd;
}

function write(cwd, relative, content) {
  const target = path.join(cwd, ...relative.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${content}\n`);
}
