const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-signing-phase2-qr-approval-gate.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA signing and Phase 2 QR planning only. No signing execution, no Phase 2 QR generation, no signed XML generation, no signature generation, no private key use, no certificate use, no CSID use, no token or secret use, no SDK signing command execution, no ZATCA network call, no clearance, no reporting, no PDF-A3, no invoice or accounting mutation, no customer-data mutation, and no production compliance are authorized.";

test("blocked by default", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "SIGNING_PHASE2_QR_APPROVAL_BLOCKED");
  assert.equal(payload.docsPolicyPassed, true);
  assert.equal(payload.approvalPhraseProvided, false);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.signingExecuted, false);
  assert.equal(payload.qrGenerated, false);
  assert.equal(payload.signedXmlGenerated, false);
  assert.equal(payload.signatureGenerated, false);
  assert.equal(payload.privateKeyUsed, false);
  assert.equal(payload.certificateUsed, false);
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
  assert.equal(payload.status, "SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.metadataOnlyFlagProvided, true);
  assert.equal(payload.executionAuthorizedNow, false);
  assert.equal(payload.signingApprovalPhraseRecognized, true);
  assert.equal(payload.phase2QrApprovalPhraseRecognized, true);
  assert.equal(payload.sdkSigningCommandExecuted, false);
});

test("exact phrase without metadata-only flag is rejected", () => {
  const { buildSigningPhase2QrApprovalGate } = loadScriptWithTrap();
  const result = buildSigningPhase2QrApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: false,
  });

  assert.equal(result.status, "SIGNING_PHASE2_QR_APPROVAL_METADATA_ONLY_FLAG_REQUIRED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.metadataOnlyFlagProvided, false);
  assert.equal(result.executionAuthorizedNow, false);
});

test("strict docs check passes when required forbidden-boundary wording exists", () => {
  const { buildSigningPhase2QrApprovalGate } = loadScriptWithTrap();
  const result = buildSigningPhase2QrApprovalGate({
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

test("guard rejects dangerous sample text that allows signing execution, QR generation, private key or certificate or CSID use, SDK signing, signed XML, clearance/reporting, PDF-A3, network calls, or production compliance", () => {
  const { buildSigningPhase2QrApprovalGate } = loadScriptWithTrap();
  const repo = createRepo(
    `${completeGateDoc()}\nSigning may be executed.\nPhase 2 QR may be generated.\nSigned XML may be generated.\nSignature may be generated.\nPrivate key may be used.\nCertificate may be used.\nCSID may be used.\nToken may be used.\nSDK signing commands may be executed.\nZATCA network calls may be executed.\nClearance/reporting may be enabled.\nPDF-A3 may be generated.\nInvoice data may be mutated.\nProduction compliance may be claimed.\n`,
  );
  const result = buildSigningPhase2QrApprovalGate({ cwd: repo });

  assert.equal(result.status, "SIGNING_PHASE2_QR_APPROVAL_POLICY_BLOCKED");
  assert.equal(result.docsPolicyPassed, false);
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNING_EXECUTION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_QR_GENERATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNED_XML_GENERATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNATURE_GENERATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PRIVATE_KEY_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CERTIFICATE_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CSID_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_TOKEN_OR_SECRET_USE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SDK_SIGNING_INVOCATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_ZATCA_NETWORK_CALL"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CLEARANCE_REPORTING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PDFA3"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_DATA_MUTATION"));
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
  assert.equal(payload.privateKeyReadAttempted, false);
  assert.equal(payload.certificateReadAttempted, false);
  assert.equal(payload.sdkSigningInvocationAttempted, false);
  assert.doesNotMatch(output, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /CSID_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /API_KEY_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /Authorization:/i);
  assert.doesNotMatch(output, /BEGIN CERTIFICATE/i);
  assert.doesNotMatch(output, /BEGIN PRIVATE KEY/i);
  assert.doesNotMatch(output, /signedXml"\s*:/i);
  assert.doesNotMatch(output, /qrPayload"\s*:/i);
});

test("no network, DB, env secret, private-key, certificate, or SDK signing behavior exists", () => {
  const { buildSigningPhase2QrApprovalGate } = loadScriptWithTrap();
  const result = buildSigningPhase2QrApprovalGate({ cwd: createRepo(completeGateDoc()) });
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.envSecretsRead, false);
  assert.equal(result.dbAccessAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.fileWritesAttempted, false);
  assert.equal(result.privateKeyReadAttempted, false);
  assert.equal(result.certificateReadAttempted, false);
  assert.equal(result.sdkSigningInvocationAttempted, false);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/);
  assert.doesNotMatch(source, /require\(["'](?:node:)?(?:http|https|net|tls|dns)["']\)/);
});

test("package script command works", () => {
  const command =
    process.platform === "win32"
      ? {
          file: "cmd.exe",
          args: ["/d", "/s", "/c", "corepack pnpm zatca:signing-phase2-qr-approval-gate -- --json --strict"],
        }
      : {
          file: "corepack",
          args: ["pnpm", "zatca:signing-phase2-qr-approval-gate", "--", "--json", "--strict"],
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
  assert.equal(payload.status, "SIGNING_PHASE2_QR_APPROVAL_BLOCKED");
  assert.equal(payload.signingExecuted, false);
  assert.equal(payload.qrGenerated, false);
  assert.equal(payload.sdkSigningCommandExecuted, false);
});

function loadScriptWithTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const blockedModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (blockedModules.has(request)) {
      throw new Error(`Blocked module should not be loaded by signing approval gate: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-signing-approval-gate-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_GATE.md", gateDocText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeGateDoc() {
  return [
    "# ZATCA Signing And Phase 2 QR Approval Gate",
    "",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Purpose",
    "Metadata only.",
    "",
    "## Signing And Phase 2 QR Boundary",
    "No signing execution is authorized in this lane.",
    "No Phase 2 QR generation is authorized in this lane.",
    "No signed XML or signature generation is authorized in this lane.",
    "No private key, certificate, CSID, token, or secret use is authorized in this lane.",
    "No SDK signing command execution is authorized in this lane.",
    "No ZATCA network call is authorized in this lane.",
    "",
    "## Exact Approval Phrase",
    "This phrase does not authorize execution.",
    "",
    "## Metadata-Only Evidence Format",
    "- signing approval phrase recognized: yes/no",
    "- Phase 2 QR approval phrase recognized: yes/no",
    "- signing executed: no",
    "- QR generated: no",
    "- signed XML generated: no",
    "- signature generated: no",
    "- private key used: no",
    "- certificate used: no",
    "- CSID used: no",
    "- ZATCA network call: no",
    "- clearance/reporting: no",
    "- PDF-A3: no",
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
    "- signature value",
    "- QR payload",
    "- auth header",
    "- cookie",
    "- portal session data",
    "- taxpayer/customer/vendor data",
    "- invoice payload/body",
    "- production credential",
    "- endpoint credential or API key",
    "",
    "## Safety Assertions",
    "- signing approval phrase recognized: yes/no",
    "- Phase 2 QR approval phrase recognized: yes/no",
    "- signing executed: no",
    "- QR generated: no",
    "- signed XML generated: no",
    "- signature generated: no",
    "- private key used: no",
    "- certificate used: no",
    "- CSID used: no",
    "- ZATCA network call: no",
    "- clearance/reporting: no",
    "- PDF-A3: no",
    "- production compliance: no",
    "No signing execution is authorized in this lane.",
    "No Phase 2 QR generation is authorized in this lane.",
    "No signed XML or signature generation is authorized in this lane.",
    "No private key, certificate, CSID, token, or secret use is authorized in this lane.",
    "No SDK signing command execution is authorized in this lane.",
    "No ZATCA network call is authorized in this lane.",
    "No clearance/reporting is authorized in this lane.",
    "No PDF-A3 generation is authorized in this lane.",
    "No invoice, accounting, or customer data is mutated in this lane.",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Explicit Blocker Statuses",
    "- SIGNING_PHASE2_QR_APPROVAL_BLOCKED",
    "- SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
    "- SIGNING_PHASE2_QR_APPROVAL_POLICY_BLOCKED",
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
    "",
    "## Abort Conditions",
    "Abort if unsafe.",
    "",
    "## Current Blockers",
    "- Blocked.",
    "",
    "## Recommended Next Prompt",
    "`ZATCA clearance reporting approval gate`",
    "",
  ].join("\n");
}
