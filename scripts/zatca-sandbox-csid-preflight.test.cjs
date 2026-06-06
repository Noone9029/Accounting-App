const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-csid-preflight.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox OTP and compliance CSID request planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no secret/body exposure, and metadata-only evidence.";

test("refuses without --no-network", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.status, "BLOCKED_NO_NETWORK_REQUIRED");
  assert.equal(payload.networkCallsMade, false);
  assert.equal(payload.otpRequested, false);
  assert.equal(payload.complianceCsidRequested, false);
});

test("emits metadata-only JSON", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const leakMarker = "LEAK_MARKER_ONE";
  const repo = createRepo({
    sandboxAdapterText: `${leakMarker} request-body-hidden Real sandbox compliance CSID HTTP adapter execution is not implemented. No ZATCA network call was made.`,
  });
  const result = buildSandboxCsidPreflight({
    cwd: repo,
    args: { plan: true },
    env: {
      ZATCA_SANDBOX_BASE_URL: `https://${leakMarker}.example.test`,
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: "123456",
      ZATCA_CSID_CUSTODY_SECRET_PREFIX: `${leakMarker}_PREFIX`,
      ZATCA_PRODUCTION_PRIVATE_KEY: `private-key-${leakMarker}`,
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.noNetworkOnly, true);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.privateKeyBodyExposed, false);
  assert.equal(result.certificateBodyExposed, false);
  assert.equal(result.tokenBodyExposed, false);
  assert.equal(result.requestResponseBodyPrinted, false);
  assert.doesNotMatch(output, /LEAK_MARKER_ONE/);
  assert.doesNotMatch(output, /request-body-hidden/);
});

test("default status is blocked and all execution flags remain false", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo(), args: { plan: true }, env: {} });

  assert.equal(result.status, "PREFLIGHT_BLOCKED");
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.otpRequested, false);
  assert.equal(result.complianceCsidRequested, false);
  assert.equal(result.productionCsidRequested, false);
  assert.equal(result.productionSigningEnabled, false);
  assert.equal(result.productionComplianceEnabled, false);
  assert.equal(result.sandboxCsidRequestEnabled, false);
});

test("missing approval phrase keeps preflight blocked", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo(), args: { plan: true }, env: {} });

  assert.equal(result.status, "PREFLIGHT_BLOCKED");
  assert.equal(result.approval.approvalPhraseProvided, false);
  assert.equal(result.approval.approvalPhraseMatched, false);
  assert.equal(result.otpApprovalRecognized, false);
  assert.equal(result.complianceCsidApprovalRecognized, false);
});

test("invalid approval phrase returns invalid phrase blocker without echoing input", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const invalidPhrase = "INVALID_APPROVAL_PHRASE_VALUE_SHOULD_NOT_ECHO";
  const result = buildSandboxCsidPreflight({
    cwd: createRepo(),
    args: { plan: true, approvalPhrase: invalidPhrase, approvalPlan: true },
    env: {},
  });
  const output = JSON.stringify(result);

  assert.equal(result.status, "BLOCKED_INVALID_APPROVAL_PHRASE");
  assert.equal(result.approval.approvalPhraseProvided, true);
  assert.equal(result.approval.approvalPhraseMatched, false);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_INVALID_APPROVAL_PHRASE")));
  assert.equal(result.otpApprovalRecognized, false);
  assert.equal(result.complianceCsidApprovalRecognized, false);
  assert.doesNotMatch(output, /INVALID_APPROVAL_PHRASE_VALUE_SHOULD_NOT_ECHO/);
});

test("exact approval phrase without --approval-plan returns plan flag required", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({
    cwd: createRepo(),
    args: { plan: true, approvalPhrase: APPROVAL_PHRASE },
    env: {},
  });

  assert.equal(result.status, "APPROVAL_PHRASE_RECOGNIZED_PLAN_FLAG_REQUIRED");
  assert.equal(result.approval.approvalPhraseMatched, true);
  assert.equal(result.approval.approvalPlanFlagProvided, false);
  assert.equal(result.otpApprovalRecognized, false);
  assert.equal(result.complianceCsidApprovalRecognized, false);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_APPROVAL_PLAN_FLAG_REQUIRED")));
});

test("exact approval phrase with --approval-plan recognizes approval but blocks execution", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({
    cwd: createRepo(),
    args: { plan: true, approvalPhrase: APPROVAL_PHRASE, approvalPlan: true },
    env: {
      ZATCA_SANDBOX_BASE_URL: "https://SANDBOX_BASE_URL_VALUE_SHOULD_NOT_ECHO.example.test",
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: "OTP_VALUE_SHOULD_NOT_ECHO",
      ZATCA_PRODUCTION_BINARY_SECURITY_TOKEN: "TOKEN_VALUE_SHOULD_NOT_ECHO",
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.status, "APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(result.approval.approvalPhraseMatched, true);
  assert.equal(result.approval.approvalPlanFlagProvided, true);
  assert.equal(result.otpApprovalRecognized, true);
  assert.equal(result.complianceCsidApprovalRecognized, true);
  assert.equal(result.otpRequested, false);
  assert.equal(result.complianceCsidRequested, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.productionComplianceEnabled, false);
  assert.equal(result.sandboxAdapterExecuted, false);
  assert.equal(result.productionSigningEnabled, false);
  assert.equal(result.clearanceReportingEnabled, false);
  assert.equal(result.pdfA3Enabled, false);
  assert.equal(result.approval.executionAuthorizedNow, false);
  assert.doesNotMatch(output, /SANDBOX_BASE_URL_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /OTP_VALUE_SHOULD_NOT_ECHO/);
  assert.doesNotMatch(output, /TOKEN_VALUE_SHOULD_NOT_ECHO/);
});

test("env vars are detected by presence only, not value", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const leakMarker = "LEAK_MARKER_TWO";
  const result = buildSandboxCsidPreflight({
    cwd: createRepo(),
    env: {
      ZATCA_SANDBOX_BASE_URL: `https://${leakMarker}.example.test`,
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: "654321",
      ZATCA_PRODUCTION_BINARY_SECURITY_TOKEN: leakMarker,
      ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED: "true",
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.envPresence.sandboxBaseUrlConfigured, true);
  assert.equal(result.envPresence.otpConfigured, true);
  assert.equal(result.envPresence.productionCredentialsConfigured, true);
  assert.equal(result.envPresence.sandboxComplianceCsidRequestGateConfigured, true);
  assert.equal(result.envPresence.sandboxComplianceCsidRequestGateEnabled, true);
  assert.doesNotMatch(output, /LEAK_MARKER_TWO/);
  assert.doesNotMatch(output, /654321/);
});

test("missing CSR reference produces blocker", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo({ includeCsrTemplate: false }), env: {} });

  assert.equal(result.references.csrTemplateFound, false);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_CSR_REFERENCES")));
});

test("missing compliance CSID docs produce blocker", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo({ includeComplianceDoc: false }), env: {} });

  assert.equal(result.references.complianceCsidDocFound, false);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_REFERENCE_DOCS")));
});

test("sandbox adapter found but execution blocked is reflected", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo(), env: {} });

  assert.equal(result.codeSurfaces.sandboxAdapterFound, true);
  assert.equal(result.codeSurfaces.sandboxAdapterExecutionBlocked, true);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_SANDBOX_ADAPTER_DISABLED")));
});

test("mock adapter is labeled mock-only", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo(), env: {} });

  assert.equal(result.codeSurfaces.mockAdapterFound, true);
  assert.equal(result.codeSurfaces.mockAdapterOnly, true);
  assert.equal(result.mockAdapterOnly, true);
});

test("strict mode exits nonzero when blocked", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--plan", "--no-network", "--json", "--strict"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "PREFLIGHT_BLOCKED");
});

test("strict mode exits nonzero for approval-recognized blocked status", () => {
  const repo = createRepo();
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--plan", "--no-network", "--json", "--strict", "--approval-phrase", APPROVAL_PHRASE, "--approval-plan"],
    {
      cwd: repo,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED");
  assert.equal(payload.otpRequested, false);
  assert.equal(payload.complianceCsidRequested, false);
  assert.equal(payload.networkCallsMade, false);
  assert.equal(payload.sandboxAdapterExecuted, false);
});

test("no command execution occurs", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo(), env: {} });
  const scriptSource = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.equal(result.commandExecutionAttempted, false);
  assert.doesNotMatch(scriptSource, /child_process|spawnSync|execFile|execSync/);
});

test("no network module request is made", () => {
  const { buildSandboxCsidPreflight } = loadScriptWithNetworkTrap();
  const result = buildSandboxCsidPreflight({ cwd: createRepo(), env: {} });

  assert.equal(result.networkCallsMade, false);
});

function loadScriptWithNetworkTrap() {
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  const originalLoad = Module._load;
  delete require.cache[require.resolve(SCRIPT_PATH)];
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) {
      throw new Error(`Network module requested: ${request}`);
    }
    return originalLoad.apply(this, [request, parent, isMain]);
  };
  try {
    return require(SCRIPT_PATH);
  } finally {
    Module._load = originalLoad;
  }
}

function createRepo(options = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-csid-preflight-"));

  writeJson(repo, "package.json", {
    scripts: {
      "zatca:sandbox-csid-preflight": "node scripts/zatca-sandbox-csid-preflight.cjs",
      "test:zatca-sandbox-csid-preflight": "node --test scripts/zatca-sandbox-csid-preflight.test.cjs",
      "zatca:compliance-csid-plan": "corepack pnpm --filter @ledgerbyte/api zatca:compliance-csid-plan",
    },
  });

  for (const doc of [
    "docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md",
    "docs/zatca/CSID_LIFECYCLE_CHECKLIST.md",
    "docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md",
    "docs/zatca/CSID_RESPONSE_CUSTODY_PLAN.md",
    "docs/zatca/CSR_CSID_ONBOARDING_CHECKLIST.md",
    "docs/zatca/SANDBOX_CSID_ONBOARDING_PLAN.md",
    "docs/zatca/SECURITY_KEY_MANAGEMENT_CHECKLIST.md",
    "docs/zatca/ZATCA_KEY_CUSTODY_DECISION_DRAFT.md",
    "docs/zatca/KEY_CUSTODY_AND_CSR_ONBOARDING_PLAN.md",
    "docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md",
    "docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md",
    "docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md",
    "docs/zatca/PHASE_2_COMPLIANCE_MAP.md",
    "docs/zatca/ZATCA_CODE_GAP_REPORT.md",
    "docs/zatca/README.md",
    "CODEX_HANDOFF.md",
  ]) {
    writeText(repo, doc, "metadata-only ZATCA planning doc");
  }
  writeJson(repo, "docs/zatca/evidence/local-dummy-signing-execution-20260606.json", { productionCompliance: false });

  writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md", "CSR generation, signing, validation, and certificate material are documented by the local SDK.");
  writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt", "[-csr] [-csrConfig] [-sign] [-validate]");
  writeJson(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json", {});
  if (options.includeCsrTemplate !== false) {
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties", csrTemplateBody());
  }
  writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties", csrTemplateBody());
  writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties", csrTemplateBody());
  writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties", csrTemplateBody());
  writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties", csrTemplateBody());

  if (options.includeComplianceDoc !== false) {
    writeText(repo, "reference/zatca-docs/compliance_csid.pdf", "official compliance csid metadata");
  }
  writeText(repo, "reference/zatca-docs/onboarding.pdf", "official onboarding metadata");
  writeText(repo, "reference/zatca-docs/renewal.pdf", "official renewal metadata");
  writeText(repo, "reference/zatca-docs/clearance.pdf", "official clearance metadata");
  writeText(repo, "reference/zatca-docs/reporting.pdf", "official reporting metadata");
  writeText(repo, "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf", "official security metadata");
  writeText(repo, "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf", "official XML metadata");
  writeText(repo, "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx", "official dictionary metadata");

  writeText(repo, "apps/api/prisma/schema.prisma", "model ZatcaEgsUnit { csrPem String? privateKeyPem String? complianceCsidPem String? productionCsidPem String? } model ZatcaComplianceCsidCustodyRecord { id String } model ZatcaOrganizationProfile { sellerName String? vatNumber String? }");
  writeText(repo, "apps/api/src/zatca/zatca.service.ts", "productionCompliance: false ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED compliance CSID custody provider disabled");
  writeText(repo, "apps/api/src/zatca/zatca.controller.ts", "compliance-csid-request-plan compliance-csid-request-dry-run request-compliance-csid");
  writeText(repo, "apps/api/src/zatca/zatca.config.ts", "ZATCA_ADAPTER_MODE sandbox-disabled ZATCA_ENABLE_REAL_NETWORK isZatcaRealNetworkAllowed false");
  writeText(repo, "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts", options.sandboxAdapterText || "Real sandbox compliance CSID HTTP adapter execution is not implemented in this phase. No ZATCA network call was made.");
  writeText(repo, "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts", "Local mock adapter only. No real ZATCA request, token, secret, certificate, or CSID was issued.");
  writeText(repo, "apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts", "Real ZATCA network calls are disabled.");
  writeText(repo, "apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts", "providerEnabled: false bodyStorageAllowed: false productionCompliance: false tokenStorageReady: false");
  writeText(repo, "apps/api/scripts/zatca-csr-dry-run.ts", "productionCompliance: false");
  writeText(repo, "apps/api/scripts/zatca-csr-local-generate.ts", "productionCompliance: false");
  writeText(repo, "apps/api/scripts/zatca-compliance-csid-plan.ts", "sanitized local-only sandbox compliance CSID request or custody plan");
  writeText(repo, "packages/shared/src/zatca-readiness.ts", "productionComplianceEnabled false");
  writeText(repo, "apps/web/src/lib/zatca.ts", "sandbox-disabled compliance-csid-custody");
  writeText(repo, "apps/web/src/app/(app)/settings/zatca/page.tsx", "CSID custody plan loaded. No token, secret, certificate, OTP, CSR, or ZATCA network call was used.");

  return repo;
}

function csrTemplateBody() {
  return [
    "csr.common.name=",
    "csr.serial.number=",
    "csr.organization.identifier=",
    "csr.organization.unit.name=",
    "csr.organization.name=",
    "csr.country.name=",
    "csr.invoice.type=",
    "csr.location.address=",
    "csr.industry.business.category=",
  ].join("\n");
}

function writeJson(repo, relativePath, value) {
  writeText(repo, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(repo, relativePath, value) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${value}\n`);
}
