const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-clearance-reporting-approval-gate.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA clearance and reporting planning only. No clearance execution, no reporting execution, no invoice submission, no credit note submission, no debit note submission, no ZATCA API call, no request body creation, no response body processing, no CSID use, no token or secret use, no certificate or private key use, no signed XML use, no QR use, no PDF-A3, no invoice or accounting mutation, no customer-data mutation, no payload storage, and no production compliance are authorized.";

test("blocked by default", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "CLEARANCE_REPORTING_APPROVAL_BLOCKED");
  assert.equal(payload.docsPolicyPassed, true);
  assert.equal(payload.approvalPhraseProvided, false);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.clearanceExecuted, false);
  assert.equal(payload.reportingExecuted, false);
  assert.equal(payload.invoiceSubmitted, false);
  assert.equal(payload.noteSubmitted, false);
  assert.equal(payload.zatcaNetworkCallExecuted, false);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.responseBodyProcessed, false);
  assert.equal(payload.csidUsed, false);
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
  assert.equal(payload.status, "CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.metadataOnlyFlagProvided, true);
  assert.equal(payload.executionAuthorizedNow, false);
  assert.equal(payload.clearanceApprovalPhraseRecognized, true);
  assert.equal(payload.reportingApprovalPhraseRecognized, true);
  assert.equal(payload.apiCallAttempted, false);
});

test("exact phrase without metadata-only flag is rejected", () => {
  const { buildClearanceReportingApprovalGate } = loadScriptWithTrap();
  const result = buildClearanceReportingApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: false,
  });

  assert.equal(result.status, "CLEARANCE_REPORTING_APPROVAL_METADATA_ONLY_FLAG_REQUIRED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.metadataOnlyFlagProvided, false);
  assert.equal(result.executionAuthorizedNow, false);
});

test("strict docs check passes when required forbidden-boundary wording exists", () => {
  const { buildClearanceReportingApprovalGate } = loadScriptWithTrap();
  const result = buildClearanceReportingApprovalGate({
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

test("guard rejects dangerous sample text that allows blocked execution or payload handling", () => {
  const { buildClearanceReportingApprovalGate } = loadScriptWithTrap();
  const repo = createRepo(
    `${completeGateDoc()}\nClearance may be executed.\nReporting may be executed.\nInvoices may be submitted.\nCredit notes may be submitted.\nZATCA API calls may be executed.\nRequest bodies may be created.\nResponse bodies may be processed.\nCSID may be used.\nToken may be used.\nCertificate may be used.\nPrivate key may be used.\nSigned XML may be used.\nQR payload may be used.\nPDF-A3 may be generated.\nClearance payloads may be stored.\nProduction compliance may be claimed.\n`,
  );
  const result = buildClearanceReportingApprovalGate({ cwd: repo });

  assert.equal(result.status, "CLEARANCE_REPORTING_APPROVAL_POLICY_BLOCKED");
  assert.equal(result.docsPolicyPassed, false);
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CLEARANCE_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_REPORTING_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_INVOICE_SUBMISSION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_NOTE_SUBMISSION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_ZATCA_API_CALL"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_REQUEST_BODY"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_RESPONSE_BODY"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CSID_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_TOKEN_OR_SECRET_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CERTIFICATE_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PRIVATE_KEY_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNED_XML_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_QR_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PDFA3"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PAYLOAD_STORAGE"));
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
  assert.equal(payload.apiCallAttempted, false);
  assert.equal(payload.sdkInvocationAttempted, false);
  assert.doesNotMatch(output, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /CSID_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /API_KEY_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /Authorization:/i);
  assert.doesNotMatch(output, /BEGIN CERTIFICATE/i);
  assert.doesNotMatch(output, /BEGIN PRIVATE KEY/i);
  assert.doesNotMatch(output, /requestBody"\s*:/i);
  assert.doesNotMatch(output, /responseBody"\s*:/i);
});

test("no network, DB, env secret, API, or SDK behavior exists", () => {
  const { buildClearanceReportingApprovalGate } = loadScriptWithTrap();
  const result = buildClearanceReportingApprovalGate({ cwd: createRepo(completeGateDoc()) });
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.envSecretsRead, false);
  assert.equal(result.dbAccessAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.fileWritesAttempted, false);
  assert.equal(result.apiCallAttempted, false);
  assert.equal(result.sdkInvocationAttempted, false);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/);
  assert.doesNotMatch(source, /require\(["'](?:node:)?(?:http|https|net|tls|dns)["']\)/);
});

test("package script command works", () => {
  const command =
    process.platform === "win32"
      ? {
          file: "cmd.exe",
          args: ["/d", "/s", "/c", "corepack pnpm zatca:clearance-reporting-approval-gate -- --json --strict"],
        }
      : {
          file: "corepack",
          args: ["pnpm", "zatca:clearance-reporting-approval-gate", "--", "--json", "--strict"],
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
  assert.equal(payload.status, "CLEARANCE_REPORTING_APPROVAL_BLOCKED");
  assert.equal(payload.clearanceExecuted, false);
  assert.equal(payload.reportingExecuted, false);
  assert.equal(payload.zatcaNetworkCallExecuted, false);
});

function loadScriptWithTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const blockedModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (blockedModules.has(request)) {
      throw new Error(`Blocked module should not be loaded by clearance/reporting approval gate: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-clearance-reporting-approval-gate-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/CLEARANCE_REPORTING_APPROVAL_GATE.md", gateDocText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeGateDoc() {
  return [
    "# ZATCA Clearance Reporting Approval Gate",
    "",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Purpose",
    "Metadata only.",
    "",
    "## Clearance Reporting Boundary",
    "No clearance execution is authorized in this lane.",
    "No reporting execution is authorized in this lane.",
    "No invoice or note submission is authorized in this lane.",
    "No ZATCA API call is authorized in this lane.",
    "No request body creation or response body processing is authorized in this lane.",
    "No CSID, token, secret, certificate, or private-key use is authorized in this lane.",
    "No signed XML use, QR use, or PDF-A3 generation is authorized in this lane.",
    "",
    "## Exact Approval Phrase",
    "This phrase does not authorize execution.",
    "",
    "## Metadata-Only Evidence Format",
    "- clearance approval phrase recognized: yes/no",
    "- reporting approval phrase recognized: yes/no",
    "- clearance executed: no",
    "- reporting executed: no",
    "- invoice submitted: no",
    "- note submitted: no",
    "- ZATCA network call: no",
    "- request body created: no",
    "- response body processed: no",
    "- CSID used: no",
    "- token/secret/certificate/private key used: no",
    "- signed XML used: no",
    "- QR used: no",
    "- PDF-A3 created: no",
    "- production compliance: no",
    "- next boundary",
    "",
    "## Forbidden Evidence And Body Fields",
    "- OTP value",
    "- CSID",
    "- binary security token",
    "- token",
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
    "- clearance payload",
    "- reporting payload",
    "- production credential",
    "- endpoint credential or API key",
    "",
    "## Safety Assertions",
    "- clearance approval phrase recognized: yes/no",
    "- reporting approval phrase recognized: yes/no",
    "- clearance executed: no",
    "- reporting executed: no",
    "- invoice submitted: no",
    "- note submitted: no",
    "- ZATCA network call: no",
    "- request body created: no",
    "- response body processed: no",
    "- CSID used: no",
    "- token/secret/certificate/private key used: no",
    "- signed XML used: no",
    "- QR used: no",
    "- PDF-A3 created: no",
    "- production compliance: no",
    "No clearance execution is authorized in this lane.",
    "No reporting execution is authorized in this lane.",
    "No invoice or note submission is authorized in this lane.",
    "No ZATCA API call is authorized in this lane.",
    "No request body creation or response body processing is authorized in this lane.",
    "No CSID, token, secret, certificate, or private-key use is authorized in this lane.",
    "No signed XML use, QR use, or PDF-A3 generation is authorized in this lane.",
    "No clearance/reporting payload is stored in this lane.",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Explicit Blocker Statuses",
    "- CLEARANCE_REPORTING_APPROVAL_BLOCKED",
    "- CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
    "- CLEARANCE_REPORTING_APPROVAL_POLICY_BLOCKED",
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
    "8. signing and Phase 2 QR approval metadata",
    "9. clearance reporting approval metadata",
    "10. PDF-A3 approval metadata",
    "",
    "## Abort Conditions",
    "Abort if unsafe.",
    "",
    "## Current Blockers",
    "- Blocked.",
    "",
    "## Recommended Next Prompt",
    "`ZATCA PDF-A3 approval gate`",
    "",
  ].join("\n");
}
