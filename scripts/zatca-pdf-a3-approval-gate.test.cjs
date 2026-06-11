const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-pdf-a3-approval-gate.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA PDF-A3 planning only. No PDF-A3 generation, no XML generation, no XML attachment, no signed XML embedding, no invoice archive creation, no invoice PDF body handling, no XML body handling, no PDF library invocation, no file persistence, no object-storage write, no database or document-store write, no signing, no QR generation, no ZATCA network call, no clearance, no reporting, no invoice or accounting mutation, no customer-data read, and no production compliance are authorized.";

test("blocked by default", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "PDF_A3_APPROVAL_BLOCKED");
  assert.equal(payload.docsPolicyPassed, true);
  assert.equal(payload.approvalPhraseProvided, false);
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.pdfA3Generated, false);
  assert.equal(payload.xmlEmbedded, false);
  assert.equal(payload.signedXmlEmbedded, false);
  assert.equal(payload.filePersisted, false);
  assert.equal(payload.objectStorageWriteExecuted, false);
  assert.equal(payload.dbDocumentWriteExecuted, false);
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
  assert.equal(payload.status, "PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.metadataOnlyFlagProvided, true);
  assert.equal(payload.executionAuthorizedNow, false);
  assert.equal(payload.pdfA3ApprovalPhraseRecognized, true);
  assert.equal(payload.pdfLibraryInvocationAttempted, false);
});

test("exact phrase without metadata-only flag is rejected", () => {
  const { buildPdfA3ApprovalGate } = loadScriptWithTrap();
  const result = buildPdfA3ApprovalGate({
    cwd: createRepo(completeGateDoc()),
    approvalPhrase: APPROVAL_PHRASE,
    metadataOnly: false,
  });

  assert.equal(result.status, "PDF_A3_APPROVAL_METADATA_ONLY_FLAG_REQUIRED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.metadataOnlyFlagProvided, false);
  assert.equal(result.executionAuthorizedNow, false);
});

test("strict docs check passes when required forbidden-boundary wording exists", () => {
  const { buildPdfA3ApprovalGate } = loadScriptWithTrap();
  const result = buildPdfA3ApprovalGate({
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

test("guard rejects dangerous sample text that allows PDF-A3 generation, embedding, persistence, storage writes, or compliance claims", () => {
  const { buildPdfA3ApprovalGate } = loadScriptWithTrap();
  const repo = createRepo(
    `${completeGateDoc()}\nPDF-A3 may be generated.\nXML may be embedded.\nSigned XML may be embedded.\nInvoice archive files may be created.\nInvoice PDF bodies may be read.\nXML bodies may be written.\nPDF libraries may be called.\nFiles may be persisted.\nObject-storage writes may be executed.\nDatabase writes may be executed.\nSigning may be executed.\nQR may be generated.\nZATCA network calls may be executed.\nClearance/reporting may be enabled.\nProduction compliance may be claimed.\n`,
  );
  const result = buildPdfA3ApprovalGate({ cwd: repo });

  assert.equal(result.status, "PDF_A3_APPROVAL_POLICY_BLOCKED");
  assert.equal(result.docsPolicyPassed, false);
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PDFA3_GENERATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_XML_EMBEDDING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNED_XML_EMBEDDING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_ARCHIVE_CREATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PDF_BODY_HANDLING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_XML_BODY_HANDLING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_PDF_LIBRARY_INVOCATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_FILE_PERSISTENCE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_OBJECT_STORAGE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_DB_DOCUMENT_WRITE"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_SIGNING"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_QR_GENERATION"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_ZATCA_NETWORK"));
  assert.ok(result.dangerousAllowances.includes("DANGEROUS_ALLOWANCE_CLEARANCE_REPORTING"));
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
  assert.equal(payload.pdfLibraryInvocationAttempted, false);
  assert.equal(payload.objectStorageAccessAttempted, false);
  assert.equal(payload.documentStoreAccessAttempted, false);
  assert.doesNotMatch(output, /OTP_SECRET_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /CSID_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /API_KEY_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /Authorization:/i);
  assert.doesNotMatch(output, /BEGIN CERTIFICATE/i);
  assert.doesNotMatch(output, /BEGIN PRIVATE KEY/i);
  assert.doesNotMatch(output, /pdfBody"\s*:/i);
  assert.doesNotMatch(output, /xmlBody"\s*:/i);
});

test("no network, DB, env secret, PDF, file, object-storage, or document-store behavior exists", () => {
  const { buildPdfA3ApprovalGate } = loadScriptWithTrap();
  const result = buildPdfA3ApprovalGate({ cwd: createRepo(completeGateDoc()) });
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.envSecretsRead, false);
  assert.equal(result.dbAccessAttempted, false);
  assert.equal(result.networkAccessAttempted, false);
  assert.equal(result.fileWritesAttempted, false);
  assert.equal(result.pdfLibraryInvocationAttempted, false);
  assert.equal(result.objectStorageAccessAttempted, false);
  assert.equal(result.documentStoreAccessAttempted, false);
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
          args: ["/d", "/s", "/c", "corepack pnpm zatca:pdf-a3-approval-gate -- --json --strict"],
        }
      : {
          file: "corepack",
          args: ["pnpm", "zatca:pdf-a3-approval-gate", "--", "--json", "--strict"],
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
  assert.equal(payload.status, "PDF_A3_APPROVAL_BLOCKED");
  assert.equal(payload.pdfA3Generated, false);
  assert.equal(payload.xmlEmbedded, false);
  assert.equal(payload.filePersisted, false);
});

function loadScriptWithTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const blockedModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (blockedModules.has(request)) {
      throw new Error(`Blocked module should not be loaded by PDF-A3 approval gate: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-pdf-a3-approval-gate-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/PDF_A3_APPROVAL_GATE.md", gateDocText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeGateDoc() {
  return [
    "# ZATCA PDF-A3 Approval Gate",
    "",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Purpose",
    "Metadata only.",
    "",
    "## PDF-A3 Boundary",
    "No PDF-A3 generation is authorized in this lane.",
    "No XML embedding or signed XML embedding is authorized in this lane.",
    "No invoice archive file creation or file persistence is authorized in this lane.",
    "No invoice PDF or XML body handling is authorized in this lane.",
    "No PDF library invocation, object-storage write, database write, or document-store write is authorized in this lane.",
    "",
    "## Exact Approval Phrase",
    "This phrase does not authorize execution.",
    "",
    "## Metadata-Only Evidence Format",
    "- PDF-A3 approval phrase recognized: yes/no",
    "- PDF-A3 generated: no",
    "- XML embedded: no",
    "- signed XML embedded: no",
    "- file persisted: no",
    "- object storage write: no",
    "- DB/document write: no",
    "- invoice/customer data read: no",
    "- ZATCA network call: no",
    "- clearance/reporting: no",
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
    "- invoice PDF body",
    "- XML body",
    "- signed XML",
    "- QR payload",
    "- auth header",
    "- cookie",
    "- portal session data",
    "- taxpayer/customer/vendor data",
    "- invoice payload/body",
    "- object-storage payload",
    "- database payload",
    "- document-store payload",
    "- archive payload",
    "- backup payload",
    "- production credential",
    "- endpoint credential or API key",
    "",
    "## Safety Assertions",
    "- PDF-A3 approval phrase recognized: yes/no",
    "- PDF-A3 generated: no",
    "- XML embedded: no",
    "- signed XML embedded: no",
    "- file persisted: no",
    "- object storage write: no",
    "- DB/document write: no",
    "- invoice/customer data read: no",
    "- ZATCA network call: no",
    "- clearance/reporting: no",
    "- production compliance: no",
    "No PDF-A3 generation is authorized in this lane.",
    "No XML embedding or signed XML embedding is authorized in this lane.",
    "No invoice archive file creation or file persistence is authorized in this lane.",
    "No invoice PDF or XML body handling is authorized in this lane.",
    "No PDF library invocation, object-storage write, database write, or document-store write is authorized in this lane.",
    "No signing, QR generation, ZATCA network call, or clearance/reporting is authorized in this lane.",
    "No invoice, accounting, or customer data is mutated or read in this lane.",
    "Production compliance remains disabled and not claimed.",
    "",
    "## Explicit Blocker Statuses",
    "- PDF_A3_APPROVAL_BLOCKED",
    "- PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
    "- PDF_A3_APPROVAL_POLICY_BLOCKED",
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
    "11. production compliance launch gate",
    "",
    "## Abort Conditions",
    "Abort if unsafe.",
    "",
    "## Current Blockers",
    "- Blocked.",
    "",
    "## Recommended Next Prompt",
    "`ZATCA production compliance launch gate`",
    "",
  ].join("\n");
}
