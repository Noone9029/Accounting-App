const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-adapter-execution-approval.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox adapter execution planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no request/response body exposure, no secret exposure, and metadata-only evidence.";

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
  assert.equal(payload.sandboxAdapterExecuted, false);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.responseBodyProcessed, false);
});

test("missing approval phrase blocks adapter approval", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, adapterExecutionApproval: true },
    env: {},
  });

  assert.equal(result.status, "ADAPTER_EXECUTION_APPROVAL_BLOCKED_PHRASE_REQUIRED");
  assert.equal(result.approvalPhraseMatched, false);
  assert.equal(result.adapterExecutionApprovalRecognized, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.sandboxAdapterExecuted, false);
});

test("invalid approval phrase blocks without echoing input", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const invalidPhrase = "INVALID_ADAPTER_APPROVAL_PHRASE_SHOULD_NOT_ECHO";
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: invalidPhrase, adapterExecutionApproval: true },
    env: {},
  });
  const output = JSON.stringify(result);

  assert.equal(result.status, "BLOCKED_INVALID_APPROVAL_PHRASE");
  assert.equal(result.approvalPhraseMatched, false);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_INVALID_APPROVAL_PHRASE")));
  assert.doesNotMatch(output, /INVALID_ADAPTER_APPROVAL_PHRASE_SHOULD_NOT_ECHO/);
});

test("exact approval phrase with adapter approval is recognized but blocked", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: {
      plan: true,
      noNetwork: true,
      approvalPhrase: APPROVAL_PHRASE,
      adapterExecutionApproval: true,
    },
    env: {},
  });

  assert.equal(result.status, "ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.adapterExecutionApprovalRecognized, true);
  assert.equal(result.adapterExecutionAuthorizedNow, false);
  assert.equal(result.sandboxAdapterExecuted, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.requestBodyCreated, false);
  assert.equal(result.responseBodyProcessed, false);
  assert.equal(result.complianceCsidRequested, false);
  assert.equal(result.productionCsidRequested, false);
  assert.equal(result.productionComplianceEnabled, false);
  assert.equal(result.productionSigningEnabled, false);
  assert.equal(result.clearanceReportingEnabled, false);
  assert.equal(result.pdfA3Enabled, false);
});

test("exact approval phrase with --execute-adapter remains not implemented or approved", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: {
      plan: true,
      noNetwork: true,
      approvalPhrase: APPROVAL_PHRASE,
      executeAdapter: true,
    },
    env: {},
  });

  assert.equal(result.status, "BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.adapterExecutionApprovalRecognized, true);
  assert.equal(result.adapterExecutionAuthorizedNow, false);
  assert.equal(result.sandboxAdapterExecuted, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.requestBodyCreated, false);
  assert.equal(result.responseBodyProcessed, false);
});

test("detects sandbox, disabled, and mock-only adapter boundaries", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, adapterExecutionApproval: true },
    env: {},
  });

  assert.equal(result.sandboxAdapterFound, true);
  assert.equal(result.disabledAdapterFound, true);
  assert.equal(result.mockAdapterFound, true);
  assert.equal(result.mockAdapterUsed, false);
  assert.equal(result.mockAdapterOnly, true);
  assert.equal(result.codeSurfaces.sandboxAdapterBuildsRequestPlanBeforeThrow, true);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED")));
});

test("detects custody prerequisites and keeps custody blockers closed", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, adapterExecutionApproval: true },
    env: {},
  });

  assert.equal(result.custodyPrerequisites.csidResponseCustodyPlanFound, true);
  assert.equal(result.custodyPrerequisites.csidResponseCustodyGuardFound, true);
  assert.equal(result.custodyPrerequisites.csidResponseCustodyResultsFound, true);
  assert.equal(result.custodyPrerequisites.custodyProviderFound, true);
  assert.equal(result.custodyPrerequisites.metadataCustodyModelFound, true);
  assert.equal(result.custodyPrerequisites.custodyProviderApproved, false);
  assert.equal(result.custodyPrerequisites.legacyPemFieldsFound, true);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_CSID_RESPONSE_CUSTODY_PROVIDER_DISABLED")));
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_LEGACY_RAW_PEM_FIELDS_PRESENT")));
});

test("env vars are reported by presence only and sensitive values are not printed", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const leakMarker = "ADAPTER_APPROVAL_LEAK_MARKER";
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, adapterExecutionApproval: true },
    env: {
      ZATCA_ADAPTER_MODE: `sandbox-${leakMarker}`,
      ZATCA_ENABLE_REAL_NETWORK: `true-${leakMarker}`,
      ZATCA_SANDBOX_BASE_URL: `url-${leakMarker}`,
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: `otp-${leakMarker}`,
      ZATCA_CSID_CUSTODY_PROVIDER: `provider-${leakMarker}`,
      ZATCA_PRODUCTION_PRIVATE_KEY: `prod-key-${leakMarker}`,
      DATABASE_URL: `db-${leakMarker}`,
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.envPresence.adapterModeConfigured, true);
  assert.equal(result.envPresence.realNetworkFlagConfigured, true);
  assert.equal(result.envPresence.sandboxBaseUrlConfigured, true);
  assert.equal(result.envPresence.sandboxOtpConfigured, true);
  assert.equal(result.envPresence.productionCredentialConfigured, true);
  assert.equal(result.envPresence.databaseUrlConfigured, true);
  assert.equal(result.envValuesPrinted, false);
  assert.equal(result.otpValuePrinted, false);
  assert.equal(result.requestResponseBodyPrinted, false);
  assert.doesNotMatch(output, /ADAPTER_APPROVAL_LEAK_MARKER/);
  assert.doesNotMatch(output, /otp-ADAPTER_APPROVAL_LEAK_MARKER/);
  assert.doesNotMatch(output, /prod-key-ADAPTER_APPROVAL_LEAK_MARKER/);
});

test("no token, secret, body, header, or OTP markers appear in output", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, adapterExecutionApproval: true },
    env: {
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: "OTP_SHOULD_NOT_PRINT",
      ZATCA_PRODUCTION_BINARY_SECURITY_TOKEN: "TOKEN_SHOULD_NOT_PRINT",
      ZATCA_PRODUCTION_SECRET: "SECRET_SHOULD_NOT_PRINT",
      ZATCA_FAKE_REQUEST_BODY: "BODY_SHOULD_NOT_PRINT",
      ZATCA_FAKE_AUTH_HEADER: "HEADER_SHOULD_NOT_PRINT",
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.secretBodyExposed, false);
  assert.equal(result.privateKeyBodyExposed, false);
  assert.equal(result.certificateBodyExposed, false);
  assert.equal(result.tokenBodyExposed, false);
  assert.doesNotMatch(output, /OTP_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /TOKEN_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /SECRET_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /BODY_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /HEADER_SHOULD_NOT_PRINT/);
});

test("strict mode exits nonzero for blocked statuses", () => {
  const repo = createRepo();
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--plan", "--no-network", "--json", "--strict", "--approval-phrase", APPROVAL_PHRASE, "--adapter-execution-approval"],
    { cwd: repo, encoding: "utf8", windowsHide: true },
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED");
  assert.equal(payload.sandboxAdapterExecuted, false);
  assert.equal(payload.networkCallsMade, false);
});

test("CLI supports execute-adapter blocked path", () => {
  const repo = createRepo();
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--plan", "--no-network", "--json", "--approval-phrase", APPROVAL_PHRASE, "--execute-adapter"],
    { cwd: repo, encoding: "utf8", windowsHide: true },
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED");
  assert.equal(payload.sandboxAdapterExecuted, false);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.responseBodyProcessed, false);
});

test("no network, database, or adapter modules are requested", () => {
  const { buildSandboxAdapterExecutionApprovalGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAdapterExecutionApprovalGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, adapterExecutionApproval: true },
    env: {},
  });

  assert.equal(result.networkCallsMade, false);
  assert.equal(result.dbConnectionAttempted, false);
  assert.equal(result.sandboxAdapterExecuted, false);
});

function loadScriptWithNetworkTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const blockedModules = new Set([
    "node:http",
    "node:https",
    "node:net",
    "node:tls",
    "node:dns",
    "node:child_process",
    "http",
    "https",
    "net",
    "tls",
    "dns",
    "child_process",
    "@prisma/client",
    "../apps/api/src/zatca/adapters/http-zatca-sandbox.adapter",
  ]);
  Module._load = function patchedLoad(request, parent, isMain) {
    if (blockedModules.has(request)) {
      throw new Error(`Blocked module should not be loaded by adapter approval guard: ${request}`);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(SCRIPT_PATH);
  } finally {
    Module._load = originalLoad;
  }
}

function createRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-adapter-approval-guard-"));
  const files = {
    "package.json": JSON.stringify(
      {
        scripts: {
          "zatca:sandbox-adapter-execution-approval": "node scripts/zatca-sandbox-adapter-execution-approval.cjs",
          "test:zatca-sandbox-adapter-execution-approval": "node --test scripts/zatca-sandbox-adapter-execution-approval.test.cjs",
          "zatca:csid-response-custody-guard": "node scripts/zatca-csid-response-custody-guard.cjs",
          "test:zatca-csid-response-custody-guard": "node --test scripts/zatca-csid-response-custody-guard.test.cjs",
          "zatca:sandbox-csid-preflight": "node scripts/zatca-sandbox-csid-preflight.cjs",
        },
      },
      null,
      2,
    ),
    "CODEX_HANDOFF.md": "sandbox adapter execution approval handoff metadata-only",
    "docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md": "sandbox adapter approval plan",
    "docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md": "sandbox adapter approval runbook",
    "docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md": "sandbox adapter approval results",
    "docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md": "CSID response custody implementation plan",
    "docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md": "CSID response custody guard",
    "docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md": "CSID response custody results",
    "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md": "sandbox CSID execution guard",
    "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md": "sandbox CSID execution results",
    "docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md": "sandbox OTP CSID plan",
    "docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md": "sandbox OTP CSID runbook",
    "docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md": "sandbox OTP CSID results",
    "docs/zatca/SANDBOX_CSID_PREFLIGHT_GUARD.md": "sandbox preflight guard",
    "docs/zatca/SANDBOX_CSID_PREFLIGHT_RESULTS.md": "sandbox preflight results",
    "docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md": "key custody and CSID lifecycle",
    "docs/zatca/CSID_LIFECYCLE_CHECKLIST.md": "CSID lifecycle checklist",
    "docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md": "key custody decision matrix",
    "docs/zatca/CSID_RESPONSE_CUSTODY_PLAN.md": "CSID response custody plan",
    "docs/zatca/CSR_CSID_ONBOARDING_CHECKLIST.md": "CSR CSID onboarding checklist",
    "docs/zatca/SANDBOX_CSID_ONBOARDING_PLAN.md": "sandbox CSID onboarding plan",
    "docs/zatca/SECURITY_KEY_MANAGEMENT_CHECKLIST.md": "security key management checklist",
    "docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md": "official SDK validation readiness",
    "docs/zatca/PHASE_2_COMPLIANCE_MAP.md": "phase 2 compliance map",
    "docs/zatca/ZATCA_CODE_GAP_REPORT.md": "ZATCA code gap report",
    "docs/zatca/README.md": "ZATCA docs index",
    "reference/zatca-docs/compliance_csid.pdf": "official compliance CSID structural metadata",
    "reference/zatca-docs/onboarding.pdf": "official onboarding structural metadata",
    "reference/zatca-docs/renewal.pdf": "official renewal structural metadata",
    "reference/zatca-docs/clearance.pdf": "official clearance structural metadata",
    "reference/zatca-docs/reporting.pdf": "official reporting structural metadata",
    "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf": "official security implementation standards structural metadata",
    "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf": "official XML implementation standard structural metadata",
    "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx": "official data dictionary structural metadata",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md": "CSR, private key, certificate, QR, signing, validation, nonprod, and simulation structural metadata",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt": "SDK command usage structural metadata",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json": JSON.stringify({
      certPath: "Data/Certificates/cert.pem",
      privateKeyPath: "Data/Certificates/key.pem",
      xsdPath: "Data/Schemas",
    }),
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties":
      "csr.common.name=\ncsr.serial.number=\ncsr.organization.identifier=\ncsr.organization.unit.name=\ncsr.organization.name=\ncsr.country.name=\ncsr.invoice.type=\ncsr.location.address=\ncsr.industry.business.category=\n",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties":
      "csr.common.name=\ncsr.serial.number=\ncsr.organization.identifier=\ncsr.organization.unit.name=\ncsr.organization.name=\ncsr.country.name=\ncsr.invoice.type=\ncsr.location.address=\ncsr.industry.business.category=\n",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties":
      "csr.common.name=\ncsr.serial.number=\ncsr.organization.identifier=\ncsr.organization.unit.name=\ncsr.organization.name=\ncsr.country.name=\ncsr.invoice.type=\ncsr.location.address=\ncsr.industry.business.category=\n",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties":
      "csr.common.name=\ncsr.serial.number=\ncsr.organization.identifier=\ncsr.organization.unit.name=\ncsr.organization.name=\ncsr.country.name=\ncsr.invoice.type=\ncsr.location.address=\ncsr.industry.business.category=\n",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties":
      "csr.common.name=\ncsr.serial.number=\ncsr.organization.identifier=\ncsr.organization.unit.name=\ncsr.organization.name=\ncsr.country.name=\ncsr.invoice.type=\ncsr.location.address=\ncsr.industry.business.category=\n",
    "apps/api/prisma/schema.prisma":
      "model ZatcaEgsUnit { id String privateKeyPem String? complianceCsidPem String? productionCsidPem String? certificateRequestId String? } model ZatcaComplianceCsidCustodyRecord { id String requestId String? certificateRequestId String? hasBinarySecurityToken Boolean hasSecret Boolean hasCertificate Boolean tokenStorageMode ZatcaComplianceCsidTokenStorageMode secretStorageMode ZatcaComplianceCsidSecretStorageMode certificateStorageMode ZatcaComplianceCsidCertificateStorageMode expiryKnown Boolean expiresAt DateTime? renewalRequired Boolean productionCompliance Boolean } enum ZatcaComplianceCsidTokenStorageMode { NOT_STORED FUTURE_SECRETS_MANAGER FUTURE_ENCRYPTED_DB FUTURE_KMS } enum ZatcaComplianceCsidSecretStorageMode { NOT_STORED FUTURE_SECRETS_MANAGER FUTURE_ENCRYPTED_DB FUTURE_KMS } enum ZatcaComplianceCsidCertificateStorageMode { NOT_STORED FUTURE_SECRETS_MANAGER FUTURE_ENCRYPTED_DB FUTURE_OBJECT_STORAGE }",
    "apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts":
      "providerEnabled: false bodyStorageAllowed: false productionCompliance: false realProviderImplementationReady: false DisabledComplianceCsidSecretCustodyProvider",
    "apps/api/src/zatca/zatca.service.ts":
      "safeComplianceCsidCustodyRecordSelect assertSafeComplianceCsidCustodyMetadata responsePayloadBase64 complianceCsidPem requestComplianceCsid",
    "apps/api/src/zatca/zatca.controller.ts": "requestComplianceCsid compliance-csid-custody-plan provider-readiness",
    "apps/api/src/zatca/zatca.config.ts": "ZATCA_ADAPTER_MODE ZATCA_ENABLE_REAL_NETWORK ZATCA_SANDBOX_BASE_URL sandbox-disabled sandbox",
    "apps/api/scripts/zatca-compliance-csid-plan.ts": "planning only no CSID request",
    "scripts/zatca-sandbox-csid-preflight.cjs": "EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED sandboxAdapterExecuted false",
    "scripts/zatca-csid-response-custody-guard.cjs": "CUSTODY_METADATA_SIMULATION_BLOCKED realResponseBodyProcessed false",
    "packages/shared/src/zatca-readiness.ts": "COMPLIANCE_CSID_CUSTODY readiness scope",
    "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts":
      "class HttpZatcaSandboxAdapter { async requestComplianceCsid() { const requestPlan = buildComplianceCsidHttpRequestPlan({}); throw new Error('Real sandbox compliance CSID HTTP adapter execution is not implemented. No ZATCA network call was made.'); } async safeZatcaRequest() { await fetch('blocked'); const text = await response.text(); } }",
    "apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts":
      "class SandboxDisabledZatcaOnboardingAdapter { requestComplianceCsid() { throw createRealNetworkDisabledError('requestComplianceCsid'); } }",
    "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts":
      "class MockZatcaOnboardingAdapter { requestComplianceCsid() { return { warnings: ['Local mock adapter only. No real ZATCA request, token, secret, certificate, or CSID was issued.'] }; } }",
    "apps/api/src/zatca/adapters/compliance-csid-http.mapper.ts":
      "buildComplianceCsidHttpRequestPlan mapComplianceCsidHttpResponse redactComplianceCsidSensitiveText sensitiveFieldNames",
  };

  for (const [file, contents] of Object.entries(files)) {
    const fullPath = path.join(repo, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
  return repo;
}
