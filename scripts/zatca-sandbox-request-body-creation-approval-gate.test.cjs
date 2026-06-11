const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-request-body-creation-approval-gate.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox request body creation planning only. No real OTP, no CSID request, no CSR body, no private key, no certificate, no token or secret, no taxpayer/customer/vendor data, no invoice body, no ZATCA network call, no response processing, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.";

test("blocked by default", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "REQUEST_BODY_CREATION_APPROVAL_BLOCKED");
  assert.equal(payload.docsPolicyPassed, true);
  assert.equal(payload.approvalPhraseProvided, false);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.realOtpIncluded, false);
  assert.equal(payload.csidRequested, false);
  assert.equal(payload.zatcaNetworkCallMade, false);
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
  assert.equal(payload.status, "REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.metadataOnlyFlagProvided, true);
  assert.equal(payload.executionAuthorizedNow, false);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.responseBodyProcessed, false);
});

test("exact phrase without metadata-only flag is rejected", () => {
  const { buildSandboxRequestBodyCreationApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxRequestBodyCreationApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: false,
  });

  assert.equal(result.status, "REQUEST_BODY_CREATION_APPROVAL_METADATA_ONLY_FLAG_REQUIRED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.metadataOnlyFlagProvided, false);
  assert.equal(result.executionAuthorizedNow, false);
});

test("strict docs check passes when required forbidden-boundary wording exists", () => {
  const { buildSandboxRequestBodyCreationApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxRequestBodyCreationApprovalGate({
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

test("guard rejects dangerous sample text that allows request body creation, OTP inclusion, CSID request, signing, or response processing", () => {
  const { buildSandboxRequestBodyCreationApprovalGate } = loadScriptWithNetworkTrap();
  const repo = createRepo(
    `${completeGateDoc()}\nReal request bodies may be created.\nReal OTP may be included.\nCSID may be requested.\nSigning may be enabled.\nResponse bodies may be processed.\n`,
  );
  const result = buildSandboxRequestBodyCreationApprovalGate({ cwd: repo });

  assert.equal(result.status, "REQUEST_BODY_CREATION_APPROVAL_POLICY_BLOCKED");
  assert.equal(result.docsPolicyPassed, false);
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_REQUEST_BODY_CREATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_OTP_INCLUSION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CSID_REQUEST"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_BODY"));
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
  assert.doesNotMatch(output, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /CSID_SHOULD_NOT_ECHO/);
});

test("no network, DB, env secret, or command execution behavior exists", () => {
  const { buildSandboxRequestBodyCreationApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildSandboxRequestBodyCreationApprovalGate({ cwd: createRepo(completeGateDoc()) });
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.envSecretsRead, false);
  assert.equal(result.dbAccessAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.fileWritesAttempted, false);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/);
  assert.doesNotMatch(source, /require\(["'](?:node:)?(?:http|https|net|tls|dns)["']\)/);
});

test("package script command works", () => {
  const command =
    process.platform === "win32"
      ? {
          file: "cmd.exe",
          args: ["/d", "/s", "/c", "corepack pnpm zatca:sandbox-request-body-creation-approval-gate -- --json --strict"],
        }
      : {
          file: "corepack",
          args: ["pnpm", "zatca:sandbox-request-body-creation-approval-gate", "--", "--json", "--strict"],
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
  assert.equal(payload.status, "REQUEST_BODY_CREATION_APPROVAL_BLOCKED");
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.zatcaNetworkCallMade, false);
});

function loadScriptWithNetworkTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) {
      throw new Error(`Network module should not be loaded by request body approval gate: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-request-body-gate-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE.md", gateDocText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeGateDoc() {
  return [
    "# ZATCA Sandbox Request Body Creation Approval Gate",
    "",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Purpose",
    "Metadata only.",
    "",
    "## Request Body Creation Boundary",
    "No actual request body creation is authorized in this lane.",
    "",
    "## Exact Approval Phrase",
    "This phrase does not authorize execution.",
    "",
    "## Metadata-Only Evidence Format",
    "- sandbox access confirmed: yes/no",
    "- manual OTP capture approval metadata recognized: yes/no",
    "- request body creation approval phrase recognized: yes/no",
    "- request body created: no",
    "- real OTP included: no",
    "- CSID requested: no",
    "- ZATCA network call made: no",
    "- response body processed: no",
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
    "- signed XML",
    "- QR payload",
    "- auth header",
    "- cookie",
    "- portal session data",
    "- taxpayer/customer/vendor data",
    "- invoice payload/body",
    "- production credential",
    "",
    "## Safety Assertions",
    "- Request body creation remains blocked pending a separate future execution lane.",
    "- Real sandbox network request execution remains blocked.",
    "- signing enabled: no",
    "- clearance/reporting enabled: no",
    "- PDF-A3 enabled: no",
    "- production compliance claimed: no",
    "",
    "## Explicit Blocker Statuses",
    "- REQUEST_BODY_CREATION_APPROVAL_BLOCKED",
    "- REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
    "- REQUEST_BODY_CREATION_APPROVAL_POLICY_BLOCKED",
    "Even when the exact approval phrase is recognized, execution remains blocked.",
    "",
    "## Approval Ladder",
    "1. sandbox access confirmation",
    "2. manual OTP capture approval metadata",
    "3. request body creation approval metadata",
    "4. real sandbox network request approval",
    "5. response processing approval",
    "6. response custody approval",
    "7. sandbox CSID storage by approved custody provider",
    "",
    "## Abort Conditions",
    "Abort if unsafe.",
    "",
    "## Current Blockers",
    "- Blocked.",
    "",
    "## Recommended Next Prompt",
    "`ZATCA sandbox network request approval gate`",
    "",
  ].join("\n");
}
