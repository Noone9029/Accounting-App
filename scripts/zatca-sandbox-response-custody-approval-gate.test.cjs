const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-response-custody-approval-gate.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox response custody planning only. No real OTP, no CSID request, no request body creation, no sandbox network request execution, no adapter execution, no response body receipt, no response body parsing, no response body transformation, no response body validation, no response body sanitization, no response body hashing, no response body redaction, no response body storage, no response custody, no response summarization, no custody provider execution, no secret manager write, no database write, no object storage write, no backup payload, no CSR body, no private key, no certificate, no token or secret, no taxpayer/customer/vendor data, no invoice body, no signed XML, no QR payload, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.";

test("blocked by default", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED");
  assert.equal(payload.docsPolicyPassed, true);
  assert.equal(payload.approvalPhraseProvided, false);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.networkRequestExecuted, false);
  assert.equal(payload.adapterExecuted, false);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.responseBodyReceived, false);
  assert.equal(payload.responseBodyProcessed, false);
  assert.equal(payload.responseCustodyStored, false);
  assert.equal(payload.custodyProviderExecuted, false);
  assert.equal(payload.secretManagerWriteExecuted, false);
  assert.equal(payload.databaseWriteExecuted, false);
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
  assert.equal(payload.status, "SANDBOX_RESPONSE_CUSTODY_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.metadataOnlyFlagProvided, true);
  assert.equal(payload.executionAuthorizedNow, false);
  assert.equal(payload.responseCustodyAuthorizedNow, false);
  assert.equal(payload.responseBodyReceived, false);
  assert.equal(payload.responseBodyProcessed, false);
  assert.equal(payload.responseCustodyStored, false);
  assert.equal(payload.custodyProviderExecuted, false);
});

test("exact phrase without metadata-only flag is rejected", () => {
  const { buildSandboxResponseCustodyApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxResponseCustodyApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: false,
  });

  assert.equal(result.status, "SANDBOX_RESPONSE_CUSTODY_APPROVAL_METADATA_ONLY_FLAG_REQUIRED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.metadataOnlyFlagProvided, false);
  assert.equal(result.executionAuthorizedNow, false);
});

test("strict docs check passes when required forbidden-boundary wording exists", () => {
  const { buildSandboxResponseCustodyApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxResponseCustodyApprovalGate({
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

test("guard rejects dangerous sample text that allows custody, storage, persistence, processing, hashing, summarization, network execution, adapter execution, request body creation, OTP inclusion, CSID request, signing, or production compliance", () => {
  const { buildSandboxResponseCustodyApprovalGate } = loadScriptWithNetworkTrap();
  const repo = createRepo(
    `${completeGateDoc()}\nReal sandbox network requests may be executed.\nAdapter execution may be enabled.\nReal request bodies may be created.\nResponse bodies may be stored.\nResponse bodies may be processed.\nResponse bodies may be hashed.\nResponse storage may be enabled.\nReal OTP may be included.\nCSID may be requested.\nSigning may be enabled.\nProduction compliance may be claimed.\n`,
  );
  const result = buildSandboxResponseCustodyApprovalGate({ cwd: repo });

  assert.equal(result.status, "SANDBOX_RESPONSE_CUSTODY_APPROVAL_POLICY_BLOCKED");
  assert.equal(result.docsPolicyPassed, false);
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_NETWORK_REQUEST_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_ADAPTER_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_REQUEST_BODY_CREATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_BODY_CUSTODY"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_BODY_PROCESSING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_BODY_HASHING_OR_SUMMARIZATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_PERSISTENCE"));
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
  assert.equal(payload.objectStorageAccessAttempted, false);
  assert.doesNotMatch(output, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /CSID_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /API_KEY_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /binarySecurityToken/i);
});

test("no network, DB, env secret, or object-storage behavior exists", () => {
  const { buildSandboxResponseCustodyApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxResponseCustodyApprovalGate({ cwd: createRepo(completeGateDoc()) });
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.envSecretsRead, false);
  assert.equal(result.dbAccessAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.fileWritesAttempted, false);
  assert.equal(result.secretManagerAccessAttempted, false);
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
          args: ["/d", "/s", "/c", "corepack pnpm zatca:sandbox-response-custody-approval-gate -- --json --strict"],
        }
      : {
          file: "corepack",
          args: ["pnpm", "zatca:sandbox-response-custody-approval-gate", "--", "--json", "--strict"],
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
  assert.equal(payload.status, "SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED");
  assert.equal(payload.responseBodyReceived, false);
  assert.equal(payload.responseBodyProcessed, false);
  assert.equal(payload.responseCustodyStored, false);
  assert.equal(payload.custodyProviderExecuted, false);
  assert.equal(payload.secretManagerWriteExecuted, false);
  assert.equal(payload.objectStorageWriteExecuted, false);
});

function loadScriptWithNetworkTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) {
      throw new Error(`Network module should not be loaded by sandbox response custody approval gate: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-response-custody-gate-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_GATE.md", gateDocText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeGateDoc() {
  return [
    "# ZATCA Sandbox Response Custody Approval Gate",
    "",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Purpose",
    "Metadata only.",
    "",
    "## Sandbox Response Custody Boundary",
    "No response body custody is authorized in this lane.",
    "No response body storage or persistence is authorized in this lane.",
    "No response body processing is authorized in this lane.",
    "No response body hashing or summarization is authorized in this lane.",
    "Sandbox network request execution remains blocked in this lane.",
    "Adapter execution remains blocked in this lane.",
    "Request body creation remains blocked in this lane.",
    "Custody provider execution remains blocked in this lane.",
    "Secret manager writes remain blocked in this lane.",
    "Database writes remain blocked in this lane.",
    "Object storage writes remain blocked in this lane.",
    "",
    "## Exact Approval Phrase",
    "This phrase does not authorize execution.",
    "",
    "## Metadata-Only Evidence Format",
    "- sandbox access confirmed: yes/no",
    "- manual OTP capture approval metadata recognized: yes/no",
    "- request body creation approval metadata recognized: yes/no",
    "- sandbox network request approval metadata recognized: yes/no",
    "- response processing approval metadata recognized: yes/no",
    "- response custody approval phrase recognized: yes/no",
    "- network request executed: no",
    "- adapter executed: no",
    "- request body created: no",
    "- response body received: no",
    "- response body processed: no",
    "- response custody stored: no",
    "- custody provider approved: yes/no",
    "- custody provider executed: no",
    "- secret manager write executed: no",
    "- database write executed: no",
    "- object storage write executed: no",
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
    "- secret",
    "- private key",
    "- certificate body",
    "- CSR body",
    "- request body",
    "- response body",
    "- response body hash derived from real body",
    "- response summary derived from real body",
    "- signed XML",
    "- QR payload",
    "- auth header",
    "- cookie",
    "- portal session data",
    "- taxpayer/customer/vendor data",
    "- invoice payload/body",
    "- production credential",
    "- endpoint credential or API key",
    "- secret-manager payload",
    "- database payload",
    "- object-storage payload",
    "- backup payload",
    "",
    "## Safety Assertions",
    "- Response custody remains blocked pending a separate future sandbox CSID storage lane.",
    "- network request executed: no",
    "- adapter executed: no",
    "- request body created: no",
    "- response body received: no",
    "- response body processed: no",
    "- response custody stored: no",
    "- custody provider approved: yes/no",
    "- custody provider executed: no",
    "- secret manager write executed: no",
    "- database write executed: no",
    "- object storage write executed: no",
    "- real OTP included: no",
    "- CSID requested: no",
    "- signing enabled: no",
    "- clearance/reporting enabled: no",
    "- PDF-A3 enabled: no",
    "- production compliance claimed: no",
    "",
    "## Explicit Blocker Statuses",
    "- SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED",
    "- SANDBOX_RESPONSE_CUSTODY_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
    "- SANDBOX_RESPONSE_CUSTODY_APPROVAL_POLICY_BLOCKED",
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
    "`ZATCA sandbox CSID storage approval gate`",
    "",
  ].join("\n");
}
