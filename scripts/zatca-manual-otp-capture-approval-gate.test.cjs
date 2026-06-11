const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-manual-otp-capture-approval-gate.cjs");
const APPROVAL_PHRASE =
  "I confirm that an authorized human operator handled ZATCA sandbox OTP capture manually, no OTP value was shared with Codex, and this approval is metadata only. No request body creation, no ZATCA network call, no response processing, no response custody, no CSID request, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.";

test("blocked by default", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED");
  assert.equal(payload.docsPolicyPassed, true);
  assert.equal(payload.approvalPhraseProvided, false);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.otpCapturedByCodex, false);
  assert.equal(payload.otpValueStored, false);
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
  assert.equal(payload.status, "MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.metadataOnlyFlagProvided, true);
  assert.equal(payload.executionAuthorizedNow, false);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.responseBodyProcessed, false);
});

test("exact phrase without metadata-only flag is rejected", () => {
  const { buildManualOtpCaptureApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildManualOtpCaptureApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: false,
  });

  assert.equal(result.status, "MANUAL_OTP_CAPTURE_APPROVAL_METADATA_ONLY_FLAG_REQUIRED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.metadataOnlyFlagProvided, false);
  assert.equal(result.executionAuthorizedNow, false);
});

test("strict docs check passes when required forbidden-boundary wording exists", () => {
  const { buildManualOtpCaptureApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildManualOtpCaptureApprovalGate({
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

test("guard rejects dangerous sample text that allows OTP storage or Codex capture", () => {
  const { buildManualOtpCaptureApprovalGate } = loadScriptWithNetworkTrap();
  const repo = createRepo(
    `${completeGateDoc()}\nCodex may capture OTP values.\nOTP values may be stored for retries.\n`,
  );
  const result = buildManualOtpCaptureApprovalGate({ cwd: repo });

  assert.equal(result.status, "MANUAL_OTP_CAPTURE_APPROVAL_POLICY_BLOCKED");
  assert.equal(result.docsPolicyPassed, false);
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CODEX_OTP_CAPTURE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_OTP_STORAGE"));
});

test("JSON output is metadata-only and never echoes secret-like values", () => {
  const leakMarker = "OTP_SECRET_VALUE_SHOULD_NOT_ECHO";
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
  assert.doesNotMatch(result.stdout, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
  const payload = JSON.parse(result.stdout);
  const output = JSON.stringify(payload);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.envSecretsRead, false);
  assert.equal(payload.dbAccessAttempted, false);
  assert.equal(payload.networkAccessAttempted, false);
  assert.doesNotMatch(output, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
});

test("no network, DB, env secret, or command execution behavior exists", () => {
  const { buildManualOtpCaptureApprovalGate } = loadScriptWithNetworkTrap();
  const result = buildManualOtpCaptureApprovalGate({ cwd: createRepo(completeGateDoc()) });
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.envSecretsRead, false);
  assert.equal(result.dbAccessAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.fileWritesAttempted, false);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/);
  assert.doesNotMatch(source, /require\(["'](?:node:)?(?:http|https|net|tls|dns)["']\)/);
});

function loadScriptWithNetworkTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) {
      throw new Error(`Network module should not be loaded by manual OTP gate: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-manual-otp-gate-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_GATE.md", gateDocText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeGateDoc() {
  return [
    "# ZATCA Manual OTP Capture Approval Gate",
    "",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Purpose",
    "Metadata only.",
    "",
    "## Human-Only OTP Capture Boundary",
    "Codex must never capture, view, store, paste, transform, validate, screenshot, log, or transmit OTP values.",
    "",
    "## Exact Approval Phrase",
    "This phrase does not authorize execution.",
    "",
    "## Metadata-Only Evidence Format",
    "- sandbox access confirmed: yes/no",
    "- human operator role confirmed: yes/no",
    "- OTP flow visible: yes/no",
    "- OTP obtained manually: yes/no",
    "- OTP value stored: no",
    "- OTP value shared with Codex: no",
    "- CSID requested: no",
    "- ZATCA network call made: no",
    "- request body created: no",
    "- response body processed: no",
    "",
    "## Forbidden Fields",
    "- OTP value",
    "- credentials",
    "- cookies",
    "- session data",
    "- auth headers",
    "- CSID",
    "- tokens",
    "- certificates",
    "- private keys",
    "- CSR body",
    "- request body",
    "- response body",
    "- signed XML",
    "- QR payload",
    "- customer/vendor data",
    "",
    "## Safety Assertions",
    "- Request body creation remains blocked.",
    "- Real sandbox network request execution remains blocked.",
    "- signing enabled: no",
    "- clearance/reporting enabled: no",
    "- PDF-A3 enabled: no",
    "- production compliance claimed: no",
    "",
    "## Explicit Blocker Statuses",
    "- MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED",
    "- MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
    "- MANUAL_OTP_CAPTURE_APPROVAL_POLICY_BLOCKED",
    "Even when the exact approval phrase is recognized, execution remains blocked.",
    "",
    "## Approval Ladder",
    "1. sandbox access confirmation",
    "2. manual OTP capture approval metadata",
    "3. request body creation approval",
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
    "`ZATCA sandbox request body creation approval gate`",
    "",
  ].join("\n");
}
