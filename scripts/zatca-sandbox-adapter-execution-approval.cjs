#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ENVIRONMENT = "LOCAL_SANDBOX_ADAPTER_EXECUTION_APPROVAL_NO_NETWORK";
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox adapter execution planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no request/response body exposure, no secret exposure, and metadata-only evidence.";

const REQUIRED_OFFICIAL_REFERENCE_FILES = [
  "reference/zatca-docs/compliance_csid.pdf",
  "reference/zatca-docs/onboarding.pdf",
  "reference/zatca-docs/renewal.pdf",
  "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf",
  "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf",
  "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties",
];

const OPTIONAL_OFFICIAL_REFERENCE_FILES = [
  "reference/zatca-docs/clearance.pdf",
  "reference/zatca-docs/reporting.pdf",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR.properties",
  "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-AR-VAT-Group.properties",
];

const POLICY_DOCS = [
  "docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md",
  "docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md",
  "docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md",
  "docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md",
  "docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md",
  "docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md",
  "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md",
  "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md",
  "docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md",
  "docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md",
  "docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md",
  "docs/zatca/SANDBOX_CSID_PREFLIGHT_GUARD.md",
  "docs/zatca/SANDBOX_CSID_PREFLIGHT_RESULTS.md",
  "docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md",
  "docs/zatca/CSID_LIFECYCLE_CHECKLIST.md",
  "docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md",
  "docs/zatca/CSID_RESPONSE_CUSTODY_PLAN.md",
  "docs/zatca/CSR_CSID_ONBOARDING_CHECKLIST.md",
  "docs/zatca/SANDBOX_CSID_ONBOARDING_PLAN.md",
  "docs/zatca/SECURITY_KEY_MANAGEMENT_CHECKLIST.md",
  "docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md",
  "docs/zatca/PHASE_2_COMPLIANCE_MAP.md",
  "docs/zatca/ZATCA_CODE_GAP_REPORT.md",
  "docs/zatca/README.md",
  "package.json",
  "CODEX_HANDOFF.md",
];

const SOURCE_SURFACES = {
  sandboxAdapter: "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts",
  disabledAdapter: "apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts",
  mockAdapter: "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts",
  complianceCsidMapper: "apps/api/src/zatca/adapters/compliance-csid-http.mapper.ts",
  zatcaConfig: "apps/api/src/zatca/zatca.config.ts",
  zatcaService: "apps/api/src/zatca/zatca.service.ts",
  zatcaController: "apps/api/src/zatca/zatca.controller.ts",
  custodyProvider: "apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts",
  prismaSchema: "apps/api/prisma/schema.prisma",
  complianceCsidPlanScript: "apps/api/scripts/zatca-compliance-csid-plan.ts",
  sandboxCsidPreflightGuard: "scripts/zatca-sandbox-csid-preflight.cjs",
  csidResponseCustodyGuard: "scripts/zatca-csid-response-custody-guard.cjs",
  sharedReadiness: "packages/shared/src/zatca-readiness.ts",
};

const REQUIRED_PACKAGE_SCRIPTS = [
  "zatca:sandbox-adapter-execution-approval",
  "test:zatca-sandbox-adapter-execution-approval",
];

const LEGACY_PEM_FIELD_NAMES = ["privateKeyPem", "complianceCsidPem", "productionCsidPem"];
const METADATA_CUSTODY_FIELDS = [
  "requestId",
  "certificateRequestId",
  "hasBinarySecurityToken",
  "hasSecret",
  "hasCertificate",
  "tokenStorageMode",
  "secretStorageMode",
  "certificateStorageMode",
  "expiryKnown",
  "expiresAt",
  "renewalRequired",
  "productionCompliance",
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    plan: false,
    strict: false,
    noNetwork: false,
    help: false,
    adapterExecutionApproval: false,
    executeAdapter: false,
    approvalPhrase: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--plan") {
      parsed.plan = true;
    } else if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--no-network") {
      parsed.noNetwork = true;
    } else if (arg === "--adapter-execution-approval") {
      parsed.adapterExecutionApproval = true;
    } else if (arg === "--execute-adapter") {
      parsed.executeAdapter = true;
    } else if (arg === "--approval-phrase") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--approval-phrase requires a value.");
      }
      parsed.approvalPhrase = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--") {
      continue;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/zatca-sandbox-adapter-execution-approval.cjs --plan --no-network --json",
    "  node scripts/zatca-sandbox-adapter-execution-approval.cjs --plan --no-network --json --strict",
    "  node scripts/zatca-sandbox-adapter-execution-approval.cjs --plan --no-network --json --approval-phrase <text> --adapter-execution-approval",
    "  node scripts/zatca-sandbox-adapter-execution-approval.cjs --plan --no-network --json --approval-phrase <text> --execute-adapter",
    "",
    "This guard recognizes metadata-only sandbox adapter execution approval planning.",
    "It does not request OTPs, request CSIDs, call ZATCA, execute adapters, create request bodies, process response bodies, connect to a database, write records, store secrets, sign, generate QR, validate signed XML, clear/report, create PDF/A-3, mutate env, migrate, seed, reset, deploy, or send email.",
  ].join("\n");
}

function buildSandboxAdapterExecutionApprovalGuard(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const args = options.args || {};
  const env = options.env || process.env;
  const officialReferences = inspectFiles(repoRoot, REQUIRED_OFFICIAL_REFERENCE_FILES, OPTIONAL_OFFICIAL_REFERENCE_FILES);
  const policyDocs = inspectFiles(repoRoot, POLICY_DOCS, []);
  const packageScripts = inspectPackageScripts(repoRoot);
  const codeSurfaces = inspectCodeSurfaces(repoRoot);
  const envPresence = inspectEnvPresence(env);
  const approvalPhraseProvided = typeof args.approvalPhrase === "string" && args.approvalPhrase.length > 0;
  const approvalPhraseMatched = args.approvalPhrase === APPROVAL_PHRASE;
  const approvalFlagProvided = Boolean(args.adapterExecutionApproval);
  const executeAdapterRequested = Boolean(args.executeAdapter);
  const adapterExecutionApprovalRecognized = approvalPhraseMatched && (approvalFlagProvided || executeAdapterRequested);
  const blockers = [];
  const warnings = [
    "Guard output is metadata-only; no OTP, CSID, token, secret, certificate, private key, auth header, request body, or response body is accepted, created, processed, stored, or printed.",
    "Official references were inspected structurally from the repository reference/ folder only.",
    "Mock adapter detection is informational only and does not execute the mock adapter.",
  ];

  if (officialReferences.missingRequired.length > 0) {
    blockers.push(`BLOCKED_MISSING_OFFICIAL_REFERENCES: ${officialReferences.missingRequired.join(", ")}`);
  }
  if (policyDocs.missingRequired.length > 0) {
    blockers.push(`BLOCKED_MISSING_ADAPTER_APPROVAL_POLICY_DOCS: ${policyDocs.missingRequired.join(", ")}`);
  }
  if (!packageScripts.allRequiredFound) {
    blockers.push(`BLOCKED_MISSING_PACKAGE_SCRIPT: ${packageScripts.missing.join(", ")}`);
  }
  if (!codeSurfaces.allRequiredFound) {
    blockers.push(`BLOCKED_MISSING_CODE_SURFACES: ${codeSurfaces.missing.join(", ")}`);
  }
  if (!codeSurfaces.sandboxAdapterFound) {
    blockers.push("BLOCKED_SANDBOX_ADAPTER_MISSING: sandbox adapter source was not found.");
  }
  if (codeSurfaces.sandboxAdapterBuildsRequestPlanBeforeThrow || codeSurfaces.complianceCsidMapperFound) {
    blockers.push("BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED: existing mapper/adapter surfaces can build compliance CSID request contracts, but this approval guard must not create request bodies.");
  }
  if (codeSurfaces.sandboxAdapterContainsFetch || codeSurfaces.sandboxAdapterParsesResponseText) {
    blockers.push("BLOCKED_RESPONSE_BODY_PROCESSING_NOT_APPROVED: sandbox adapter contains network/response handling paths that remain out of scope.");
  }
  if (!codeSurfaces.sandboxAdapterExecutionBlocked) {
    blockers.push("BLOCKED_SANDBOX_ADAPTER_NOT_PROVEN_DISABLED: source did not prove adapter execution is blocked by default.");
  }
  if (!codeSurfaces.disabledAdapterFound) {
    blockers.push("BLOCKED_DISABLED_ADAPTER_MISSING: disabled sandbox adapter source was not found.");
  }
  if (!codeSurfaces.mockAdapterFound || !codeSurfaces.mockAdapterOnly) {
    blockers.push("BLOCKED_MOCK_ADAPTER_BOUNDARY_UNCLEAR: mock-only adapter boundary was not detected.");
  }
  if (!codeSurfaces.custodyProviderFound || codeSurfaces.custodyProviderDisabled || !codeSurfaces.custodyProviderApproved) {
    blockers.push("BLOCKED_CSID_RESPONSE_CUSTODY_PROVIDER_DISABLED: CSID response body custody provider is disabled or unapproved.");
  }
  if (!codeSurfaces.metadataCustodyModelFound) {
    blockers.push("BLOCKED_METADATA_CUSTODY_MODEL_MISSING: metadata-only CSID custody model was not found.");
  }
  if (codeSurfaces.legacyPemFieldsFound) {
    blockers.push(`BLOCKED_LEGACY_RAW_PEM_FIELDS_PRESENT: ${codeSurfaces.legacyPemFields.join(", ")} remain raw PEM-capable and must not receive real CSID response material.`);
  }
  if (!envPresence.adapterModeConfigured) {
    blockers.push("BLOCKED_ENV_ZATCA_ADAPTER_MODE_REQUIRED: adapter mode presence must be reviewed before future execution.");
  }
  if (!envPresence.realNetworkFlagConfigured) {
    blockers.push("BLOCKED_ENV_ZATCA_ENABLE_REAL_NETWORK_REQUIRED: real network gate presence must be reviewed before future execution.");
  }
  if (!envPresence.sandboxBaseUrlConfigured) {
    blockers.push("BLOCKED_ENV_ZATCA_SANDBOX_BASE_URL_REQUIRED: sandbox base URL presence must be reviewed before future execution.");
  }
  if (!envPresence.csidCustodyProviderConfigured) {
    blockers.push("BLOCKED_ENV_ZATCA_CSID_CUSTODY_PROVIDER_REQUIRED: custody provider presence must be reviewed before future execution.");
  }
  if (envPresence.productionCredentialConfigured) {
    blockers.push("BLOCKED_PRODUCTION_CREDENTIAL_ENV_PRESENT: production credential presence was detected; production material must not be used for sandbox adapter approval.");
  }
  blockers.push("BLOCKED_OTP_CAPTURE_NOT_APPROVED: no OTP input may be requested, accepted, logged, stored, or passed to an adapter in this sprint.");
  blockers.push("BLOCKED_CSID_REQUEST_NOT_APPROVED: no sandbox or production CSID request may be attempted in this sprint.");
  blockers.push("BLOCKED_REAL_NETWORK_NOT_APPROVED: no ZATCA network call may be attempted in this sprint.");
  blockers.push("BLOCKED_ADAPTER_EXECUTION_NOT_APPROVED: sandbox adapter execution requires a separate future execution prompt and approvals.");
  blockers.push("BLOCKED_DB_WRITES_NOT_APPROVED: no database connection or write may be attempted in this sprint.");
  blockers.push("BLOCKED_PRODUCTION_SIGNING_DISABLED: signing enablement remains false.");
  blockers.push("BLOCKED_CLEARANCE_REPORTING_DISABLED: clearance and reporting remain false.");
  blockers.push("BLOCKED_PDF_A3_DISABLED: PDF-A3 remains false.");

  let status = "ADAPTER_EXECUTION_APPROVAL_BLOCKED_PHRASE_REQUIRED";
  if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "BLOCKED_INVALID_APPROVAL_PHRASE";
    blockers.unshift("BLOCKED_INVALID_APPROVAL_PHRASE: provided approval phrase did not match the sandbox adapter execution planning phrase.");
  } else if (approvalPhraseMatched && executeAdapterRequested) {
    status = "BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED";
    blockers.unshift("BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED: --execute-adapter is recognized as a blocked future command shape only.");
  } else if (approvalPhraseMatched && approvalFlagProvided) {
    status = "ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED";
  } else if (approvalPhraseMatched && !approvalFlagProvided) {
    status = "ADAPTER_EXECUTION_APPROVAL_BLOCKED_FLAG_REQUIRED";
    blockers.unshift("BLOCKED_ADAPTER_EXECUTION_APPROVAL_FLAG_REQUIRED: --adapter-execution-approval is required for approval recognition.");
  } else if (!approvalPhraseProvided) {
    blockers.unshift("ADAPTER_EXECUTION_APPROVAL_BLOCKED_PHRASE_REQUIRED: exact sandbox adapter execution planning approval phrase is required.");
  }

  const safeBlockers = [...new Set(blockers)];
  const safeWarnings = [...new Set(warnings)];
  const custodyPrerequisites = {
    csidResponseCustodyPlanFound: exists(repoRoot, "docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md"),
    csidResponseCustodyGuardFound: exists(repoRoot, "docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md"),
    csidResponseCustodyResultsFound: exists(repoRoot, "docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md"),
    csidResponseCustodyGuardScriptFound: exists(repoRoot, "scripts/zatca-csid-response-custody-guard.cjs"),
    custodyProviderFound: codeSurfaces.custodyProviderFound,
    custodyProviderApproved: codeSurfaces.custodyProviderApproved,
    metadataCustodyModelFound: codeSurfaces.metadataCustodyModelFound,
    legacyPemFieldsFound: codeSurfaces.legacyPemFieldsFound,
    legacyPemFieldsCleared: !codeSurfaces.legacyPemFieldsFound,
    responseBodyCustodyApproved: false,
  };

  return {
    status,
    environment: ENVIRONMENT,
    noNetworkOnly: true,
    planMode: Boolean(args.plan),
    approvalPhraseProvided,
    approvalPhraseMatched,
    adapterExecutionApprovalRecognized,
    adapterExecutionAuthorizedNow: false,
    executeAdapterRequested,
    networkCallsMade: false,
    sandboxAdapterExecuted: false,
    adapterExecuted: false,
    mockAdapterUsed: false,
    requestBodyCreated: false,
    responseBodyProcessed: false,
    requestResponseBodyPrinted: false,
    dbConnectionAttempted: false,
    dbWriteAttempted: false,
    otpRequested: false,
    otpAccepted: false,
    otpStored: false,
    otpValuePrinted: false,
    complianceCsidRequested: false,
    productionCsidRequested: false,
    csidRequestBodyCreated: false,
    csidResponseBodyProcessed: false,
    csidResponsePersisted: false,
    productionSigningEnabled: false,
    productionComplianceEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    signedXmlGenerated: false,
    qrPayloadGenerated: false,
    envValuesPrinted: false,
    envMutated: false,
    secretBodyExposed: false,
    privateKeyBodyExposed: false,
    certificateBodyExposed: false,
    tokenBodyExposed: false,
    metadataOnlyEvidence: true,
    officialReferencesInspected: [...officialReferences.found, ...officialReferences.optionalFound],
    officialReferenceFilesFound: officialReferences.found,
    optionalOfficialReferenceFilesFound: officialReferences.optionalFound,
    policyDocsFound: policyDocs.found,
    packageScripts,
    envPresence,
    codeSurfaces,
    sandboxAdapterFound: codeSurfaces.sandboxAdapterFound,
    disabledAdapterFound: codeSurfaces.disabledAdapterFound,
    mockAdapterFound: codeSurfaces.mockAdapterFound,
    mockAdapterOnly: codeSurfaces.mockAdapterOnly,
    custodyPrerequisites,
    redaction: {
      envValuesPrinted: false,
      otpValuePrinted: false,
      authHeaderPrinted: false,
      requestBodyPrinted: false,
      responseBodyPrinted: false,
      secretBodyExposed: false,
      privateKeyBodyExposed: false,
      certificateBodyExposed: false,
      tokenBodyExposed: false,
    },
    blockers: safeBlockers,
    warnings: safeWarnings,
    nextApprovalGate: "ZATCA sandbox adapter mock-to-real boundary test plan",
    recommendedNextPrompt: "ZATCA sandbox adapter mock-to-real boundary test plan",
  };
}

function inspectFiles(repoRoot, required, optional) {
  const found = required.filter((file) => exists(repoRoot, file));
  const missingRequired = required.filter((file) => !exists(repoRoot, file));
  const optionalFound = optional.filter((file) => exists(repoRoot, file));
  const optionalMissing = optional.filter((file) => !exists(repoRoot, file));
  return {
    found,
    missingRequired,
    optionalFound,
    optionalMissing,
    allRequiredFound: missingRequired.length === 0,
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    return { allRequiredFound: false, found: [], missing: REQUIRED_PACKAGE_SCRIPTS };
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const scripts = pkg && typeof pkg === "object" && pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
    const found = REQUIRED_PACKAGE_SCRIPTS.filter((script) => Object.prototype.hasOwnProperty.call(scripts, script));
    const missing = REQUIRED_PACKAGE_SCRIPTS.filter((script) => !Object.prototype.hasOwnProperty.call(scripts, script));
    return { allRequiredFound: missing.length === 0, found, missing };
  } catch {
    return { allRequiredFound: false, found: [], missing: REQUIRED_PACKAGE_SCRIPTS };
  }
}

function inspectCodeSurfaces(repoRoot) {
  const entries = Object.entries(SOURCE_SURFACES);
  const missing = entries.filter(([, file]) => !exists(repoRoot, file)).map(([, file]) => file);
  const sandboxAdapter = readText(repoRoot, SOURCE_SURFACES.sandboxAdapter);
  const disabledAdapter = readText(repoRoot, SOURCE_SURFACES.disabledAdapter);
  const mockAdapter = readText(repoRoot, SOURCE_SURFACES.mockAdapter);
  const mapper = readText(repoRoot, SOURCE_SURFACES.complianceCsidMapper);
  const config = readText(repoRoot, SOURCE_SURFACES.zatcaConfig);
  const service = readText(repoRoot, SOURCE_SURFACES.zatcaService);
  const controller = readText(repoRoot, SOURCE_SURFACES.zatcaController);
  const custodyProvider = readText(repoRoot, SOURCE_SURFACES.custodyProvider);
  const schema = readText(repoRoot, SOURCE_SURFACES.prismaSchema);
  const preflightGuard = readText(repoRoot, SOURCE_SURFACES.sandboxCsidPreflightGuard);
  const custodyGuard = readText(repoRoot, SOURCE_SURFACES.csidResponseCustodyGuard);
  const sharedReadiness = readText(repoRoot, SOURCE_SURFACES.sharedReadiness);
  const legacyPemFields = LEGACY_PEM_FIELD_NAMES.filter((field) => schema.includes(field));
  const metadataCustodyFieldsFound = METADATA_CUSTODY_FIELDS.filter((field) => schema.includes(field));
  const custodyProviderFound = exists(repoRoot, SOURCE_SURFACES.custodyProvider);
  const custodyProviderDisabled = /DisabledComplianceCsidSecretCustodyProvider|providerEnabled:\s*false|bodyStorageAllowed:\s*false|DISABLED|realProviderImplementationReady:\s*false/i.test(custodyProvider);
  const custodyProviderApproved = /providerEnabled:\s*true|realProviderImplementationReady:\s*true/i.test(custodyProvider) && !custodyProviderDisabled;
  const metadataCustodyModelFound =
    /model\s+ZatcaComplianceCsidCustodyRecord\b/i.test(schema) &&
    metadataCustodyFieldsFound.includes("requestId") &&
    metadataCustodyFieldsFound.includes("certificateRequestId") &&
    /NOT_STORED/i.test(schema);

  return {
    allRequiredFound: missing.length === 0,
    missing,
    sandboxAdapterFound: exists(repoRoot, SOURCE_SURFACES.sandboxAdapter),
    sandboxAdapterExecutionBlocked: /not implemented|No ZATCA network call|network calls are disabled|createRealNetworkDisabledError/i.test(sandboxAdapter),
    sandboxAdapterBuildsRequestPlanBeforeThrow: /buildComplianceCsidHttpRequestPlan|requestPlan/i.test(sandboxAdapter),
    sandboxAdapterContainsFetch: /\bfetch\s*\(/i.test(sandboxAdapter),
    sandboxAdapterParsesResponseText: /response\.text\s*\(|parseJsonObject|responsePayload/i.test(sandboxAdapter),
    disabledAdapterFound: exists(repoRoot, SOURCE_SURFACES.disabledAdapter) && /createRealNetworkDisabledError|Real ZATCA network calls are disabled/i.test(disabledAdapter),
    disabledAdapterThrowsForComplianceCsid: /requestComplianceCsid[\s\S]*createRealNetworkDisabledError/i.test(disabledAdapter),
    mockAdapterFound: exists(repoRoot, SOURCE_SURFACES.mockAdapter),
    mockAdapterOnly: /mock|local mock|No real ZATCA request|isSandboxMock/i.test(mockAdapter),
    complianceCsidMapperFound: exists(repoRoot, SOURCE_SURFACES.complianceCsidMapper) && /buildComplianceCsidHttpRequestPlan|mapComplianceCsidHttpResponse/i.test(mapper),
    mapperRedactionFound: /redactComplianceCsidSensitiveText|\[REDACTED/i.test(mapper),
    adapterConfigFound: exists(repoRoot, SOURCE_SURFACES.zatcaConfig),
    adapterModeConfigFound: /ZATCA_ADAPTER_MODE|ZatcaAdapterMode/i.test(config),
    realNetworkConfigFound: /ZATCA_ENABLE_REAL_NETWORK|isZatcaRealNetworkAllowed/i.test(config),
    sandboxBaseUrlConfigFound: /ZATCA_SANDBOX_BASE_URL|sandboxBaseUrl/i.test(config),
    serviceRequestComplianceCsidFound: /requestComplianceCsid/i.test(service),
    serviceCanPersistLegacyCsidMaterial: /complianceCsidPem|responsePayloadBase64/i.test(service),
    controllerRequestComplianceCsidFound: /requestComplianceCsid/i.test(controller),
    custodyProviderFound,
    custodyProviderDisabled,
    custodyProviderApproved,
    metadataCustodyModelFound,
    metadataCustodyFieldsFound,
    metadataOnlySelectFound: /safeComplianceCsidCustodyRecordSelect/i.test(service),
    metadataSafetyAssertionFound: /assertSafeComplianceCsidCustodyMetadata/i.test(service),
    legacyPemFieldsFound: legacyPemFields.length > 0,
    legacyPemFields,
    sandboxCsidPreflightGuardFound: exists(repoRoot, SOURCE_SURFACES.sandboxCsidPreflightGuard),
    sandboxCsidExecutionGuardBlocksAdapter: /sandboxAdapterExecuted:\s*false|EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED|BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED/i.test(preflightGuard),
    csidResponseCustodyGuardFound: exists(repoRoot, SOURCE_SURFACES.csidResponseCustodyGuard),
    csidResponseCustodyGuardBlocksBodies: /realResponseBodyProcessed:\s*false|CUSTODY_METADATA_SIMULATION_BLOCKED|BLOCKED_REAL_RESPONSE_BODY_PROCESSING_NOT_APPROVED/i.test(custodyGuard),
    sharedCustodyReadinessFound: /COMPLIANCE_CSID_CUSTODY/i.test(sharedReadiness),
  };
}

function inspectEnvPresence(env) {
  const has = (key) => typeof env[key] === "string" && env[key].trim().length > 0;
  return {
    adapterModeConfigured: has("ZATCA_ADAPTER_MODE"),
    realNetworkFlagConfigured: has("ZATCA_ENABLE_REAL_NETWORK"),
    sandboxBaseUrlConfigured: has("ZATCA_SANDBOX_BASE_URL"),
    simulationBaseUrlConfigured: has("ZATCA_SIMULATION_BASE_URL"),
    productionBaseUrlConfigured: has("ZATCA_PRODUCTION_BASE_URL"),
    sandboxAdapterExecutionApprovalConfigured: has("ZATCA_SANDBOX_ADAPTER_EXECUTION_APPROVAL"),
    sandboxCsidRequestGateConfigured: has("ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED"),
    sandboxOtpConfigured: has("ZATCA_SANDBOX_COMPLIANCE_CSID_OTP") || has("ZATCA_COMPLIANCE_CSID_OTP") || has("ZATCA_OTP"),
    csrConfigured: has("ZATCA_SANDBOX_CSR") || has("ZATCA_COMPLIANCE_CSID_CSR") || has("ZATCA_CSR"),
    csidCustodyProviderConfigured: has("ZATCA_CSID_CUSTODY_PROVIDER"),
    csidCustodyKmsKeyIdConfigured: has("ZATCA_CSID_CUSTODY_KMS_KEY_ID"),
    csidCustodySecretPrefixConfigured: has("ZATCA_CSID_CUSTODY_SECRET_PREFIX"),
    csidCustodyRegionConfigured: has("ZATCA_CSID_CUSTODY_REGION"),
    csidCustodyEncryptedDbApprovalConfigured: has("ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED"),
    csidCustodyAllowBodyStorageConfigured: has("ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE"),
    databaseUrlConfigured: has("DATABASE_URL"),
    directUrlConfigured: has("DIRECT_URL"),
    productionCredentialConfigured: [
      "ZATCA_PRODUCTION_CSID",
      "ZATCA_PRODUCTION_CERTIFICATE",
      "ZATCA_PRODUCTION_PRIVATE_KEY",
      "ZATCA_PRODUCTION_BINARY_SECURITY_TOKEN",
      "ZATCA_PRODUCTION_SECRET",
    ].some(has),
  };
}

function safeNoNetworkRequiredPayload() {
  return {
    status: "BLOCKED_NO_NETWORK_REQUIRED",
    environment: ENVIRONMENT,
    noNetworkOnly: true,
    networkCallsMade: false,
    sandboxAdapterExecuted: false,
    mockAdapterUsed: false,
    requestBodyCreated: false,
    responseBodyProcessed: false,
    dbConnectionAttempted: false,
    dbWriteAttempted: false,
    otpRequested: false,
    complianceCsidRequested: false,
    productionCsidRequested: false,
    productionSigningEnabled: false,
    productionComplianceEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    envValuesPrinted: false,
    requestResponseBodyPrinted: false,
    metadataOnlyEvidence: true,
    blockers: ["BLOCKED_NO_NETWORK_REQUIRED: --no-network is required for sandbox adapter execution approval guard."],
  };
}

function renderText(result) {
  return [
    `ZATCA sandbox adapter execution approval guard: ${result.status}`,
    `Approval phrase matched: ${result.approvalPhraseMatched ? "true" : "false"}`,
    `Adapter approval recognized: ${result.adapterExecutionApprovalRecognized ? "true" : "false"}`,
    `Sandbox adapter executed: ${result.sandboxAdapterExecuted ? "true" : "false"}`,
    `Network calls made: ${result.networkCallsMade ? "true" : "false"}`,
    `Request body created: ${result.requestBodyCreated ? "true" : "false"}`,
    `Response body processed: ${result.responseBodyProcessed ? "true" : "false"}`,
    `Next approval gate: ${result.nextApprovalGate}`,
  ].join("\n");
}

function shouldExitNonZero(status) {
  return status.includes("BLOCKED") || status.startsWith("BLOCKED_");
}

function resolveRepoRoot(cwd) {
  return path.resolve(cwd);
}

function exists(repoRoot, file) {
  return fs.existsSync(path.join(repoRoot, file));
}

function readText(repoRoot, file) {
  try {
    return fs.readFileSync(path.join(repoRoot, file), "utf8");
  } catch {
    return "";
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    const payload = {
      ...safeNoNetworkRequiredPayload(),
      status: "BLOCKED_INVALID_ARGUMENT",
      blockers: [error instanceof Error ? error.message : "Invalid argument."],
    };
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!args.noNetwork) {
    process.stderr.write(`${JSON.stringify(safeNoNetworkRequiredPayload(), null, 2)}\n`);
    process.exitCode = 2;
    return;
  }

  const result = buildSandboxAdapterExecutionApprovalGuard({ cwd: process.cwd(), args, env: process.env });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderText(result)}\n`);
  }
  if (args.strict && shouldExitNonZero(result.status)) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  APPROVAL_PHRASE,
  buildSandboxAdapterExecutionApprovalGuard,
  parseArgs,
};
