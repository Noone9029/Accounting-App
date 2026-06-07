const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-adapter-no-network-contract.cjs");

test("refuses without --no-network", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--contract"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.status, "NO_NETWORK_CONTRACT_BLOCKED_NO_NETWORK_REQUIRED");
  assert.equal(payload.networkCallsMade, false);
  assert.equal(payload.sandboxAdapterExecuted, false);
  assert.equal(payload.mockAdapterExecuted, false);
  assert.equal(payload.disabledAdapterExecuted, false);
  assert.equal(payload.requestBodyCreated, false);
  assert.equal(payload.responseBodyProcessed, false);
});

test("emits metadata-only JSON", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, json: true, contract: true },
    env: {},
  });

  assert.equal(result.status, "NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS");
  assert.equal(result.environment, "LOCAL_SANDBOX_ADAPTER_NO_NETWORK_CONTRACT");
  assert.equal(result.noNetworkOnly, true);
  assert.equal(result.contractMode, true);
  assert.equal(result.metadataOnlyEvidence, true);
  assert.equal(result.networkInterceptionInstalled, true);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.dbConnectionAttempted, false);
  assert.equal(result.otpRequested, false);
  assert.equal(result.complianceCsidRequested, false);
  assert.equal(result.productionCsidRequested, false);
});

test("contract mode returns expected status", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {},
  });

  assert.equal(result.status, "NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS");
  assert.equal(result.contractMode, true);
  assert.equal(result.fatalBlockers.length, 0);
  assert.equal(result.blockers.includes("NO_NETWORK_CONTRACT_BLOCKED_REAL_NETWORK_NOT_APPROVED"), true);
  assert.equal(result.blockers.includes("NO_NETWORK_CONTRACT_BLOCKED_SANDBOX_EXECUTION_NOT_APPROVED"), true);
});

test("network interception blocks accidental network attempts", () => {
  const { installNoNetworkContractInterception } = loadScriptWithModuleTrap();
  const trap = installNoNetworkContractInterception();

  assert.equal(trap.networkInterceptionInstalled, true);
  assert.equal(trap.getAttemptCount(), 0);
  assert.throws(() => trap.fetch("suppressed-network-target"), /NO_NETWORK_CONTRACT_INTERCEPTED/);
  assert.equal(trap.getAttemptCount(), 1);
  assert.throws(() => trap.httpRequest(), /NO_NETWORK_CONTRACT_INTERCEPTED/);
  assert.equal(trap.getAttemptCount(), 2);
});

test("detects sandbox, disabled, and mock adapter files", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {},
  });

  assert.equal(result.adapters.sandboxAdapterFound, true);
  assert.equal(result.adapters.disabledAdapterFound, true);
  assert.equal(result.adapters.mockAdapterFound, true);
  assert.equal(result.contracts.sandboxAdapterBlocked, true);
  assert.equal(result.contracts.mockAdapterMockOnly, true);
  assert.equal(result.contracts.disabledAdapterFailClosed, true);
});

test("never executes adapter, network, database, request, or response paths", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {},
  });

  assert.equal(result.sandboxAdapterExecuted, false);
  assert.equal(result.mockAdapterExecuted, false);
  assert.equal(result.disabledAdapterExecuted, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.dbConnectionAttempted, false);
  assert.equal(result.dbWriteAttempted, false);
  assert.equal(result.requestBodyCreated, false);
  assert.equal(result.responseBodyProcessed, false);
});

test("reports env presence by booleans only and detects env gate names", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const leakMarker = "NO_NETWORK_CONTRACT_ENV_VALUE_SHOULD_NOT_PRINT";
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {
      ZATCA_ADAPTER_MODE: `sandbox-${leakMarker}`,
      ZATCA_ENABLE_REAL_NETWORK: `true-${leakMarker}`,
      ZATCA_SANDBOX_BASE_URL: `base-${leakMarker}`,
      ZATCA_CSID_CUSTODY_PROVIDER: `provider-${leakMarker}`,
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: `otp-${leakMarker}`,
      DATABASE_URL: `database-${leakMarker}`,
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.envPresence.adapterModeConfigured, true);
  assert.equal(result.envPresence.realNetworkFlagConfigured, true);
  assert.equal(result.envPresence.sandboxBaseUrlConfigured, true);
  assert.equal(result.envPresence.csidCustodyProviderConfigured, true);
  assert.equal(result.envPresence.sandboxOtpConfigured, true);
  assert.equal(result.envPresence.databaseUrlConfigured, true);
  assert.equal(result.envValuesPrinted, false);
  assert.deepEqual(result.contracts.envGateReferencesDetected.sort(), [
    "ZATCA_ADAPTER_MODE",
    "ZATCA_ENABLE_REAL_NETWORK",
    "ZATCA_SANDBOX_BASE_URL",
  ].sort());
  assert.doesNotMatch(output, /NO_NETWORK_CONTRACT_ENV_VALUE_SHOULD_NOT_PRINT/);
});

test("detects disabled fail-closed behavior by static source inspection", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {},
  });

  assert.equal(result.contracts.disabledAdapterFailClosed, true);
  assert.equal(result.staticChecks.disabledAdapterErrorCount >= 2, true);
  assert.equal(result.staticChecks.disabledAdapterMethodCount >= 2, true);
});

test("detects mock-only boundary by static source inspection", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {},
  });

  assert.equal(result.contracts.mockAdapterMockOnly, true);
  assert.equal(result.staticChecks.mockAdapterFetchCount, 0);
  assert.equal(result.staticChecks.mockAdapterRequestComplianceCsidCount > 0, true);
});

test("detects sandbox risk surfaces by counts only", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {},
  });
  const output = JSON.stringify(result);

  assert.equal(result.contracts.sandboxAdapterBlocked, true);
  assert.equal(result.staticChecks.sandboxAdapterFetchCount, 1);
  assert.equal(result.staticChecks.sandboxAdapterRequestPlanCount, 1);
  assert.equal(result.staticChecks.sandboxAdapterResponseTextCount, 1);
  assert.equal(result.contracts.networkBlocked, true);
  assert.equal(result.contracts.bodyOutputBlocked, true);
  assert.doesNotMatch(output, /await fetch\(/);
  assert.doesNotMatch(output, /response\.text\(\)/);
});

test("no source snippets, tokens, headers, requests, responses, env values, certificates, or private keys are emitted", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {
      ZATCA_FAKE_TOKEN: "TOKEN_SHOULD_NOT_PRINT",
      ZATCA_FAKE_SECRET: "SECRET_SHOULD_NOT_PRINT",
      ZATCA_FAKE_HEADER: "HEADER_SHOULD_NOT_PRINT",
      ZATCA_FAKE_BODY: "BODY_SHOULD_NOT_PRINT",
      ZATCA_FAKE_CERTIFICATE: "CERTIFICATE_SHOULD_NOT_PRINT",
      ZATCA_FAKE_PRIVATE_KEY: "PRIVATE_KEY_SHOULD_NOT_PRINT",
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: "OTP_SHOULD_NOT_PRINT",
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.envValuesPrinted, false);
  assert.equal(result.secretBodyPrinted, false);
  assert.equal(result.requestResponseBodyPrinted, false);
  assert.equal(result.secretBodyExposed, false);
  assert.equal(result.tokenBodyExposed, false);
  assert.equal(result.certificateBodyExposed, false);
  assert.equal(result.privateKeyBodyExposed, false);
  assert.doesNotMatch(output, /TOKEN_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /SECRET_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /HEADER_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /BODY_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /CERTIFICATE_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /PRIVATE_KEY_SHOULD_NOT_PRINT/);
  assert.doesNotMatch(output, /OTP_SHOULD_NOT_PRINT/);
});

test("CLI supports no-network contract mode", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--plan", "--no-network", "--json", "--contract"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS");
  assert.equal(payload.contractMode, true);
  assert.equal(payload.networkInterceptionInstalled, true);
  assert.equal(payload.sandboxAdapterExecuted, false);
  assert.equal(payload.mockAdapterExecuted, false);
  assert.equal(payload.disabledAdapterExecuted, false);
  assert.equal(payload.networkCallsMade, false);
});

test("strict mode exits zero when only future execution blockers are present", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--plan", "--no-network", "--json", "--contract", "--strict"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS");
  assert.equal(payload.fatalBlockers.length, 0);
});

test("strict mode exits nonzero for fatal missing-adapter cases", () => {
  const repo = createRepo();
  fs.rmSync(path.join(repo, "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts"));
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--plan", "--no-network", "--json", "--contract", "--strict"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "NO_NETWORK_CONTRACT_BLOCKED_MISSING_ADAPTER");
  assert.ok(payload.fatalBlockers.some((blocker) => blocker.startsWith("NO_NETWORK_CONTRACT_BLOCKED_MISSING_ADAPTER")));
});

test("no network, database, adapter, or child-process modules are requested", () => {
  const { buildSandboxAdapterNoNetworkContract } = loadScriptWithModuleTrap();
  const result = buildSandboxAdapterNoNetworkContract({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, contract: true },
    env: {},
  });

  assert.equal(result.networkCallsMade, false);
  assert.equal(result.dbConnectionAttempted, false);
  assert.equal(result.sandboxAdapterExecuted, false);
  assert.equal(result.mockAdapterExecuted, false);
  assert.equal(result.disabledAdapterExecuted, false);
});

function loadScriptWithModuleTrap() {
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
    "../apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter",
    "../apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter",
  ]);
  Module._load = function patchedLoad(request, parent, isMain) {
    if (blockedModules.has(request)) {
      throw new Error(`Blocked module should not be loaded by no-network contract guard: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-adapter-contract-"));
  const files = {
    "package.json": JSON.stringify(
      {
        scripts: {
          "zatca:sandbox-adapter-no-network-contract": "node scripts/zatca-sandbox-adapter-no-network-contract.cjs",
          "test:zatca-sandbox-adapter-no-network-contract": "node --test scripts/zatca-sandbox-adapter-no-network-contract.test.cjs",
          "zatca:sandbox-adapter-boundary-check": "node scripts/zatca-sandbox-adapter-boundary-check.cjs",
          "test:zatca-sandbox-adapter-boundary-check": "node --test scripts/zatca-sandbox-adapter-boundary-check.test.cjs",
          "zatca:sandbox-adapter-execution-approval": "node scripts/zatca-sandbox-adapter-execution-approval.cjs",
          "test:zatca-sandbox-adapter-execution-approval": "node --test scripts/zatca-sandbox-adapter-execution-approval.test.cjs",
        },
      },
      null,
      2,
    ),
    "CODEX_HANDOFF.md": "sandbox adapter no-network contract handoff metadata-only",
    "docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md": "no-network contract tests",
    "docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md": "no-network contract results",
    "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md": "boundary test plan",
    "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md": "boundary results",
    "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md": "boundary runbook",
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
    "docs/zatca/ZATCA_KEY_CUSTODY_DECISION_DRAFT.md": "key custody draft",
    "docs/zatca/KEY_CUSTODY_AND_CSR_ONBOARDING_PLAN.md": "key custody CSR onboarding plan",
    "docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md": "official SDK validation readiness",
    "docs/zatca/PHASE_2_COMPLIANCE_MAP.md": "phase 2 compliance map",
    "docs/zatca/ZATCA_CODE_GAP_REPORT.md": "ZATCA code gap report",
    "docs/zatca/README.md": "ZATCA docs index",
    "docs/zatca/evidence/local-dummy-signing-execution-20260606.json": "{}",
    "reference/zatca-docs/compliance_csid.pdf": "official compliance CSID structural metadata",
    "reference/zatca-docs/onboarding.pdf": "official onboarding structural metadata",
    "reference/zatca-docs/renewal.pdf": "official renewal structural metadata",
    "reference/zatca-docs/clearance.pdf": "official clearance structural metadata",
    "reference/zatca-docs/reporting.pdf": "official reporting structural metadata",
    "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf": "official security implementation standards structural metadata",
    "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf": "official XML implementation standard structural metadata",
    "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx": "official data dictionary structural metadata",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md": "CSR and configuration structural metadata",
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt": "SDK usage structural metadata",
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
      "model ZatcaEgsUnit { id String privateKeyPem String? complianceCsidPem String? productionCsidPem String? } model ZatcaComplianceCsidCustodyRecord { id String requestId String? certificateRequestId String? hasBinarySecurityToken Boolean hasSecret Boolean hasCertificate Boolean tokenStorageMode String secretStorageMode String certificateStorageMode String expiryKnown Boolean expiresAt DateTime? renewalRequired Boolean productionCompliance Boolean }",
    "apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts":
      "ComplianceCsidSecretCustodyProvider providerEnabled: false bodyStorageAllowed: false productionCompliance: false realProviderImplementationReady: false",
    "apps/api/src/zatca/zatca.service.ts": "safeComplianceCsidCustodyRecordSelect assertSafeComplianceCsidCustodyMetadata requestComplianceCsid",
    "apps/api/src/zatca/zatca.controller.ts": "requestComplianceCsid provider-readiness",
    "apps/api/src/zatca/zatca.config.ts": "ZATCA_ADAPTER_MODE ZATCA_ENABLE_REAL_NETWORK ZATCA_SANDBOX_BASE_URL sandbox-disabled sandbox",
    "apps/api/scripts/zatca-compliance-csid-plan.ts": "planning only no CSID request",
    "scripts/zatca-sandbox-adapter-execution-approval.cjs": "ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED sandboxAdapterExecuted false",
    "scripts/zatca-sandbox-adapter-boundary-check.cjs": "BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS sandboxAdapterExecuted false mockAdapterExecuted false",
    "scripts/zatca-sandbox-csid-preflight.cjs": "EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED sandboxAdapterExecuted false",
    "scripts/zatca-csid-response-custody-guard.cjs": "CUSTODY_METADATA_SIMULATION_BLOCKED realResponseBodyProcessed false",
    "packages/shared/src/zatca-readiness.ts": "COMPLIANCE_CSID_CUSTODY readiness scope",
    "apps/api/src/zatca/adapters/zatca-onboarding.adapter.ts":
      "interface ZatcaOnboardingAdapter { requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult>; requestProductionCsid(input: RequestProductionCsidInput): Promise<ProductionCsidResult>; }",
    "apps/api/src/zatca/adapters/zatca-adapter.types.ts":
      "interface RequestComplianceCsidInput {} interface ComplianceCsidResult {} interface RequestProductionCsidInput {} interface ProductionCsidResult {}",
    "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts":
      "class HttpZatcaSandboxAdapter { async requestComplianceCsid() { const requestPlan = buildComplianceCsidHttpRequestPlan({}); throw new Error('Real sandbox compliance CSID HTTP adapter execution is not implemented. No ZATCA network call was made.'); } async requestProductionCsid() { throw new Error('production blocked'); } async safeZatcaRequest() { await fetch('blocked'); const text = await response.text(); } }",
    "apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts":
      "class SandboxDisabledZatcaOnboardingAdapter { requestComplianceCsid() { throw createRealNetworkDisabledError('requestComplianceCsid'); } requestProductionCsid() { throw createRealNetworkDisabledError('requestProductionCsid'); } }",
    "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts":
      "class MockZatcaOnboardingAdapter { requestComplianceCsid() { return { mode: 'mock-only', warnings: ['Local mock adapter only.'] }; } requestProductionCsid() { throw new Error('mock production blocked'); } }",
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
