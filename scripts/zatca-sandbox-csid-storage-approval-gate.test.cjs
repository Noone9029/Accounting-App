const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-csid-storage-approval-gate.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox CSID storage planning only. No real OTP, no CSID request, no request body creation, no sandbox network request execution, no adapter execution, no response body processing, no response custody, no custody provider execution, no CSID storage, no binary security token storage, no CSID secret storage, no certificate storage, no private key storage, no CSR storage, no database write, no secret manager write, no KMS write, no HSM write, no object storage write, no backup write, no log write, no docs write, no screenshots, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.";

test("blocked by default", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED");
  assert.equal(payload.docsPolicyPassed, true);
  assert.equal(payload.approvalPhraseProvided, false);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.csidStored, false);
  assert.equal(payload.binarySecurityTokenStored, false);
  assert.equal(payload.csidSecretStored, false);
  assert.equal(payload.certificateStored, false);
  assert.equal(payload.privateKeyStored, false);
  assert.equal(payload.csrStored, false);
  assert.equal(payload.custodyProviderExecuted, false);
  assert.equal(payload.databaseWriteExecuted, false);
  assert.equal(payload.secretManagerWriteExecuted, false);
  assert.equal(payload.kmsWriteExecuted, false);
  assert.equal(payload.hsmWriteExecuted, false);
  assert.equal(payload.objectStorageWriteExecuted, false);
});

test("recognizes exact phrase only as metadata approval and keeps execution blocked", () => {
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--json", "--strict", "--approval-phrase", APPROVAL_PHRASE, "--metadata-only"],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.metadataOnlyFlagProvided, true);
  assert.equal(payload.executionAuthorizedNow, false);
  assert.equal(payload.csidStorageAuthorizedNow, false);
  assert.equal(payload.csidStored, false);
  assert.equal(payload.custodyProviderExecuted, false);
  assert.equal(payload.kmsWriteExecuted, false);
});

test("exact phrase without metadata-only flag is rejected", () => {
  const { buildSandboxCsidStorageApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidStorageApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: false,
  });

  assert.equal(result.status, "SANDBOX_CSID_STORAGE_APPROVAL_METADATA_ONLY_FLAG_REQUIRED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.metadataOnlyFlagProvided, false);
  assert.equal(result.executionAuthorizedNow, false);
});

test("strict docs check passes when required forbidden-boundary wording exists", () => {
  const { buildSandboxCsidStorageApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidStorageApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: true,
  });

  assert.equal(result.docsPolicyPassed, true);
  assert.deepEqual(result.requiredSections.missing, []);
  assert.deepEqual(result.safeEvidenceFields.missing, []);
  assert.deepEqual(result.forbiddenFields.missing, []);
  assert.deepEqual(result.approvalLadder.missing, []);
  assert.deepEqual(result.safetyPhrases.missing, []);
});

test("guard rejects dangerous sample text that allows CSID storage, token or secret storage, certificate or key storage, custody provider execution, response custody, response processing, network execution, adapter execution, request body creation, OTP inclusion, CSID request, signing, or production compliance", () => {
  const { buildSandboxCsidStorageApprovalGate } = loadScriptWithNetworkTrap();
  const repo = createRepo(
    `${completeGateDoc()}\nCSID may be stored.\nBinary security token may be stored.\nCSID secret may be stored.\nCertificate may be stored.\nPrivate key may be stored.\nCSR may be stored.\nCustody provider may be executed.\nResponse custody may be enabled.\nResponse bodies may be processed.\nReal sandbox network requests may be executed.\nAdapter execution may be enabled.\nReal request bodies may be created.\nReal OTP may be included.\nCSID may be requested.\nSigning may be enabled.\nProduction compliance may be claimed.\n`,
  );
  const result = buildSandboxCsidStorageApprovalGate({ cwd: repo });

  assert.equal(result.status, "SANDBOX_CSID_STORAGE_APPROVAL_POLICY_BLOCKED");
  assert.equal(result.docsPolicyPassed, false);
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CSID_STORAGE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_BINARY_SECURITY_TOKEN_STORAGE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CSID_SECRET_STORAGE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CERTIFICATE_STORAGE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PRIVATE_KEY_STORAGE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CSR_STORAGE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CUSTODY_PROVIDER_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_CUSTODY"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_PROCESSING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_NETWORK_REQUEST_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_ADAPTER_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_REQUEST_BODY_CREATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_OTP_INCLUSION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CSID_REQUEST"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PRODUCTION_COMPLIANCE"));
});

test("JSON output is metadata-only and never echoes secret-like values", () => {
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--json", "--approval-phrase", APPROVAL_PHRASE, "--metadata-only"],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  const output = JSON.stringify(payload);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.envSecretsRead, false);
  assert.equal(payload.dbAccessAttempted, false);
  assert.equal(payload.networkAccessAttempted, false);
  assert.equal(payload.secretManagerAccessAttempted, false);
  assert.equal(payload.kmsAccessAttempted, false);
  assert.equal(payload.hsmAccessAttempted, false);
  assert.equal(payload.objectStorageAccessAttempted, false);
  assert.equal(payload.csidStored, false);
  assert.equal(payload.binarySecurityTokenStored, false);
  assert.equal(payload.csidSecretStored, false);
  assert.equal(payload.certificateStored, false);
  assert.equal(payload.privateKeyStored, false);
  assert.equal(payload.csrStored, false);
  assert.doesNotMatch(output, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /CSID_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /API_KEY_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /Authorization:/i);
  assert.doesNotMatch(output, /BEGIN CERTIFICATE/i);
  assert.doesNotMatch(output, /BEGIN PRIVATE KEY/i);
  assert.doesNotMatch(output, /binarySecurityToken"\s*:/i);
  assert.doesNotMatch(output, /csidSecret"\s*:/i);
});

test("no network, DB, env secret, KMS, HSM, or object-storage behavior exists", () => {
  const { buildSandboxCsidStorageApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidStorageApprovalGate({ cwd: createRepo(completeGateDoc()) });
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.envSecretsRead, false);
  assert.equal(result.dbAccessAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.fileWritesAttempted, false);
  assert.equal(result.secretManagerAccessAttempted, false);
  assert.equal(result.kmsAccessAttempted, false);
  assert.equal(result.hsmAccessAttempted, false);
  assert.equal(result.objectStorageAccessAttempted, false);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/);
  assert.doesNotMatch(source, /require\(["'](?:node:)?(?:http|https|net|tls|dns)["']\)/);
});

test("package script command works", () => {
  const command =
    process.platform === "win32"
      ? {
          file: "cmd.exe",
          args: ["/d", "/s", "/c", "corepack pnpm zatca:sandbox-csid-storage-approval-gate -- --json --strict"],
        }
      : {
          file: "corepack",
          args: ["pnpm", "zatca:sandbox-csid-storage-approval-gate", "--", "--json", "--strict"],
        };
  const result = spawnSync(command.file, command.args, {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const jsonStart = result.stdout.indexOf("{");
  const jsonEnd = result.stdout.lastIndexOf("}");
  assert.notEqual(jsonStart, -1);
  assert.notEqual(jsonEnd, -1);
  const payload = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 1));
  assert.equal(payload.status, "SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED");
  assert.equal(payload.csidStored, false);
  assert.equal(payload.custodyProviderExecuted, false);
  assert.equal(payload.kmsWriteExecuted, false);
  assert.equal(payload.hsmWriteExecuted, false);
});

function loadScriptWithNetworkTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) {
      throw new Error(`Network module should not be loaded by sandbox CSID storage approval gate: ${request}`);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(SCRIPT_PATH);
  } finally {
    Module._load = originalLoad;
  }
}

function createRepo(gateDocText) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-csid-storage-gate-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_GATE.md", gateDocText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeGateDoc() {
  return [
    "# ZATCA Sandbox CSID Storage Approval Gate",
    "",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Purpose",
    "Metadata only.",
    "",
    "## Sandbox CSID Storage Boundary",
    "No CSID storage is authorized in this lane.",
    "No binary security token, CSID secret, certificate, private key, or CSR storage is authorized in this lane.",
    "No custody provider execution is authorized in this lane.",
    "No database, secret-manager, KMS, HSM, object-storage, backup, log, docs, or screenshot writes are authorized in this lane.",
    "No response body processing or response custody is authorized in this lane.",
    "Sandbox network request execution remains blocked in this lane.",
    "Adapter execution remains blocked in this lane.",
    "Request body creation remains blocked in this lane.",
    "",
    "## Exact Approval Phrase",
    "This phrase does not authorize execution.",
    "",
    "## Metadata-Only Evidence Format",
    "- approval phrase recognized: yes/no",
    "- custody provider selected: yes/no",
    "- custody provider approved: yes/no",
    "- custody provider executed: no",
    "- CSID stored: no",
    "- binary security token stored: no",
    "- CSID secret stored: no",
    "- certificate stored: no",
    "- private key stored: no",
    "- CSR stored: no",
    "- database write executed: no",
    "- secret manager write executed: no",
    "- KMS write executed: no",
    "- HSM write executed: no",
    "- object storage write executed: no",
    "- backup write executed: no",
    "- network request executed: no",
    "- adapter executed: no",
    "- request body created: no",
    "- response body processed: no",
    "- response custody stored: no",
    "- real OTP included: no",
    "- CSID requested: no",
    "- signing enabled: no",
    "- clearance/reporting enabled: no",
    "- PDF-A3 enabled: no",
    "- production compliance claimed: no",
    "- next approval boundary",
    "",
    "## Forbidden Evidence And Body Fields",
    "- OTP value",
    "- CSID",
    "- binary security token",
    "- CSID secret",
    "- secret",
    "- private key",
    "- certificate body",
    "- CSR body",
    "- request body",
    "- response body",
    "- signed XML",
    "- QR payload",
    "- auth header",
    "- cookie",
    "- portal session data",
    "- taxpayer/customer/vendor data",
    "- invoice payload/body",
    "- production credential",
    "- provider credential",
    "- endpoint credential or API key",
    "- secret-manager payload",
    "- database payload",
    "- KMS payload",
    "- HSM payload",
    "- object-storage payload",
    "- backup payload",
    "",
    "## Safety Assertions",
    "- approval phrase recognized: yes/no",
    "- custody provider selected: yes/no",
    "- custody provider approved: yes/no",
    "- custody provider executed: no",
    "- CSID stored: no",
    "- binary security token stored: no",
    "- CSID secret stored: no",
    "- certificate stored: no",
    "- private key stored: no",
    "- CSR stored: no",
    "- database write executed: no",
    "- secret manager write executed: no",
    "- KMS write executed: no",
    "- HSM write executed: no",
    "- object storage write executed: no",
    "- backup write executed: no",
    "- network request executed: no",
    "- adapter executed: no",
    "- request body created: no",
    "- response body processed: no",
    "- response custody stored: no",
    "- real OTP included: no",
    "- CSID requested: no",
    "- signing enabled: no",
    "- clearance/reporting enabled: no",
    "- PDF-A3 enabled: no",
    "- production compliance claimed: no",
    "",
    "## Explicit Blocker Statuses",
    "- SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED",
    "- SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
    "- SANDBOX_CSID_STORAGE_APPROVAL_POLICY_BLOCKED",
    "Even when the exact approval phrase is recognized, execution remains blocked.",
    "",
    "## Approval Ladder",
    "1. sandbox access confirmation",
    "2. manual OTP capture approval metadata",
    "3. request body creation approval metadata",
    "4. real sandbox network request approval metadata",
    "5. response processing approval metadata",
    "6. response custody approval metadata",
    "7. sandbox CSID storage by approved custody provider",
    "",
    "## Abort Conditions",
    "Abort if unsafe.",
    "",
    "## Current Blockers",
    "- Blocked.",
    "",
    "## Recommended Next Prompt",
    "`ZATCA signing and Phase 2 QR approval gate`",
    "",
  ].join("\n");
}
