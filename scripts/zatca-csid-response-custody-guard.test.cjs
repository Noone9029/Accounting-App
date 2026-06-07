const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-csid-response-custody-guard.cjs");
const APPROVAL_PHRASE =
  "I approve ZATCA CSID response custody metadata-only planning. No real OTP, no real CSID, no real ZATCA network, no real response body, no secret storage, no body exposure, and metadata-only evidence.";

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
  assert.equal(payload.dbConnectionAttempted, false);
  assert.equal(payload.realResponseBodyProcessed, false);
});

test("missing approval phrase blocks", () => {
  const { buildCsidResponseCustodyGuard } = loadScriptWithNetworkTrap();
  const result = buildCsidResponseCustodyGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true },
    env: {},
  });

  assert.equal(result.status, "CUSTODY_GUARD_BLOCKED_APPROVAL_REQUIRED");
  assert.equal(result.approvalPhraseMatched, false);
  assert.equal(result.custodyGuardRecognized, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.dbConnectionAttempted, false);
});

test("invalid approval phrase blocks without echoing phrase", () => {
  const { buildCsidResponseCustodyGuard } = loadScriptWithNetworkTrap();
  const invalidPhrase = "INVALID_CUSTODY_PHRASE_SHOULD_NOT_ECHO";
  const result = buildCsidResponseCustodyGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: invalidPhrase, simulateMetadataOnlyResponse: true },
    env: {},
  });
  const output = JSON.stringify(result);

  assert.equal(result.status, "BLOCKED_INVALID_APPROVAL_PHRASE");
  assert.equal(result.approvalPhraseMatched, false);
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_INVALID_APPROVAL_PHRASE")));
  assert.doesNotMatch(output, /INVALID_CUSTODY_PHRASE_SHOULD_NOT_ECHO/);
});

test("exact approval phrase with metadata-only simulation remains blocked by custody findings", () => {
  const { buildCsidResponseCustodyGuard } = loadScriptWithNetworkTrap();
  const result = buildCsidResponseCustodyGuard({
    cwd: createRepo(),
    args: {
      plan: true,
      noNetwork: true,
      approvalPhrase: APPROVAL_PHRASE,
      simulateMetadataOnlyResponse: true,
    },
    env: {},
  });

  assert.equal(result.status, "CUSTODY_METADATA_SIMULATION_BLOCKED");
  assert.equal(result.approvalPhraseMatched, true);
  assert.equal(result.custodyGuardRecognized, true);
  assert.equal(result.simulationModeUsed, true);
  assert.equal(result.metadataOnlyEvidence, true);
  assert.equal(result.realResponseBodyProcessed, false);
  assert.equal(result.simulatedResponseBodyProcessed, false);
  assert.equal(result.dbConnectionAttempted, false);
  assert.equal(result.dbWriteAttempted, false);
  assert.equal(result.networkCallsMade, false);
  assert.equal(result.otpRequested, false);
  assert.equal(result.complianceCsidRequested, false);
  assert.equal(result.productionCsidRequested, false);
  assert.equal(result.secretBodyPersisted, false);
  assert.equal(result.certificateBodyPersisted, false);
  assert.equal(result.tokenBodyPersisted, false);
  assert.equal(result.requestResponseBodyPrinted, false);
  assert.equal(result.productionComplianceEnabled, false);
  assert.equal(result.clearanceReportingEnabled, false);
  assert.equal(result.pdfA3Enabled, false);
});

test("detects custody provider, metadata model, and legacy PEM blockers", () => {
  const { buildCsidResponseCustodyGuard } = loadScriptWithNetworkTrap();
  const result = buildCsidResponseCustodyGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, simulateMetadataOnlyResponse: true },
    env: {},
  });

  assert.equal(result.custodyProviderFound, true);
  assert.equal(result.metadataCustodyModelFound, true);
  assert.equal(result.legacyPemFieldsFound, true);
  assert.deepEqual(result.legacyPemFields.sort(), ["complianceCsidPem", "privateKeyPem", "productionCsidPem"].sort());
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_LEGACY_RAW_PEM_FIELDS_PRESENT")));
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_CSID_RESPONSE_CUSTODY_PROVIDER_DISABLED")));
});

test("env vars are reported by presence only and no bodies are printed", () => {
  const { buildCsidResponseCustodyGuard } = loadScriptWithNetworkTrap();
  const leakMarker = "CUSTODY_GUARD_LEAK_MARKER";
  const result = buildCsidResponseCustodyGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, simulateMetadataOnlyResponse: true },
    env: {
      ZATCA_CSID_CUSTODY_PROVIDER: `provider-${leakMarker}`,
      ZATCA_CSID_CUSTODY_KMS_KEY_ID: `kms-${leakMarker}`,
      ZATCA_CSID_CUSTODY_SECRET_PREFIX: `prefix-${leakMarker}`,
      ZATCA_CSID_CUSTODY_REGION: `region-${leakMarker}`,
      ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE: "true",
      ZATCA_SIMULATED_CSID_RESPONSE_BODY: `body-${leakMarker}`,
      ZATCA_SANDBOX_COMPLIANCE_CSID_OTP: "123456",
    },
  });
  const output = JSON.stringify(result);

  assert.equal(result.envPresence.csidCustodyProviderConfigured, true);
  assert.equal(result.envPresence.csidCustodyKmsKeyIdConfigured, true);
  assert.equal(result.envPresence.csidCustodySecretPrefixConfigured, true);
  assert.equal(result.envPresence.csidCustodyRegionConfigured, true);
  assert.equal(result.envPresence.csidCustodyAllowBodyStorageConfigured, true);
  assert.equal(result.envValuesPrinted, false);
  assert.equal(result.requestResponseBodyPrinted, false);
  assert.doesNotMatch(output, /CUSTODY_GUARD_LEAK_MARKER/);
  assert.doesNotMatch(output, /123456/);
  assert.doesNotMatch(output, /body-CUSTODY_GUARD_LEAK_MARKER/);
});

test("strict mode exits nonzero on blocked statuses", () => {
  const repo = createRepo();
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--plan", "--no-network", "--json", "--strict", "--approval-phrase", APPROVAL_PHRASE, "--simulate-metadata-only-response"],
    { cwd: repo, encoding: "utf8", windowsHide: true },
  );

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "CUSTODY_METADATA_SIMULATION_BLOCKED");
  assert.equal(payload.networkCallsMade, false);
  assert.equal(payload.dbWriteAttempted, false);
});

test("CLI supports metadata-only simulation flags", () => {
  const repo = createRepo();
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--plan", "--no-network", "--json", "--approval-phrase", APPROVAL_PHRASE, "--simulate-metadata-only-response"],
    { cwd: repo, encoding: "utf8", windowsHide: true },
  );

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "CUSTODY_METADATA_SIMULATION_BLOCKED");
  assert.equal(payload.approvalPhraseMatched, true);
  assert.equal(payload.realResponseBodyProcessed, false);
  assert.equal(payload.secretBodyPersisted, false);
  assert.equal(payload.certificateBodyPersisted, false);
  assert.equal(payload.tokenBodyPersisted, false);
});

test("no network modules are requested", () => {
  const { buildCsidResponseCustodyGuard } = loadScriptWithNetworkTrap();
  const result = buildCsidResponseCustodyGuard({
    cwd: createRepo(),
    args: { plan: true, noNetwork: true, approvalPhrase: APPROVAL_PHRASE, simulateMetadataOnlyResponse: true },
    env: {},
  });

  assert.equal(result.networkCallsMade, false);
  assert.equal(result.dbConnectionAttempted, false);
});

function loadScriptWithNetworkTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function patchedLoad(request, parent, isMain) {
    if (networkModules.has(request)) {
      throw new Error(`Network module should not be loaded by custody guard: ${request}`);
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
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-csid-custody-guard-"));
  const files = {
    "package.json": JSON.stringify(
      {
        scripts: {
          "zatca:csid-response-custody-guard": "node scripts/zatca-csid-response-custody-guard.cjs",
          "test:zatca-csid-response-custody-guard": "node --test scripts/zatca-csid-response-custody-guard.test.cjs",
          "zatca:sandbox-csid-preflight": "node scripts/zatca-sandbox-csid-preflight.cjs",
        },
      },
      null,
      2,
    ),
    "CODEX_HANDOFF.md": "metadata-only ZATCA handoff",
    "docs/zatca/CSID_RESPONSE_CUSTODY_PLAN.md": "CSID response custody plan metadata-only",
    "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md": "execution guard blocks until CSID response custody approved",
    "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md": "execution guard results metadata-only",
    "docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md": "key custody lifecycle design",
    "docs/zatca/CSID_LIFECYCLE_CHECKLIST.md": "CSID lifecycle checklist",
    "docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md": "key custody decision matrix",
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
    "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md": "CSR generation and certificate handling structural metadata",
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
      "providerEnabled: false bodyStorageAllowed: false productionCompliance: false tokenStorageReady: false secretStorageReady: false certificateStorageReady: false DisabledComplianceCsidSecretCustodyProvider createComplianceCsidSecretCustodyProvider",
    "apps/api/src/zatca/zatca.service.ts":
      "safeComplianceCsidCustodyRecordSelect assertSafeComplianceCsidCustodyMetadata tokenStorageMode NOT_STORED secretStorageMode NOT_STORED certificateStorageMode NOT_STORED responsePayloadBase64 legacy complianceCsidPem requestComplianceCsid",
    "apps/api/src/zatca/zatca.controller.ts": "compliance-csid-custody-plan compliance-csid-custody-records provider-readiness",
    "apps/api/src/zatca/zatca.config.ts": "ZATCA_ADAPTER_MODE ZATCA_ENABLE_REAL_NETWORK sandbox-disabled",
    "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts":
      "Real sandbox compliance CSID HTTP adapter execution is not implemented in this phase. No ZATCA network call was made.",
    "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts":
      "Local mock adapter only. No real ZATCA request, token, secret, certificate, or CSID was issued.",
    "apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts": "Real ZATCA network calls are disabled.",
    "packages/shared/src/zatca-readiness.ts": "COMPLIANCE_CSID_CUSTODY readiness scope",
  };

  for (const [file, contents] of Object.entries(files)) {
    const fullPath = path.join(repo, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, contents);
  }
  return repo;
}
