#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ENVIRONMENT = "LOCAL_SANDBOX_ADAPTER_BOUNDARY_NO_NETWORK";

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

const REQUIRED_POLICY_DOCS = [
  "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md",
  "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md",
  "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md",
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
  "docs/zatca/ZATCA_KEY_CUSTODY_DECISION_DRAFT.md",
  "docs/zatca/KEY_CUSTODY_AND_CSR_ONBOARDING_PLAN.md",
  "docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md",
  "docs/zatca/PHASE_2_COMPLIANCE_MAP.md",
  "docs/zatca/ZATCA_CODE_GAP_REPORT.md",
  "docs/zatca/README.md",
  "package.json",
  "CODEX_HANDOFF.md",
];

const SOURCE_SURFACES = {
  onboardingInterface: "apps/api/src/zatca/adapters/zatca-onboarding.adapter.ts",
  adapterTypes: "apps/api/src/zatca/adapters/zatca-adapter.types.ts",
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
  adapterApprovalGuard: "scripts/zatca-sandbox-adapter-execution-approval.cjs",
  sandboxCsidPreflightGuard: "scripts/zatca-sandbox-csid-preflight.cjs",
  csidResponseCustodyGuard: "scripts/zatca-csid-response-custody-guard.cjs",
  sharedReadiness: "packages/shared/src/zatca-readiness.ts",
};

const REQUIRED_PACKAGE_SCRIPTS = [
  "zatca:sandbox-adapter-boundary-check",
  "test:zatca-sandbox-adapter-boundary-check",
];

const ENV_GATE_NAMES = [
  "ZATCA_ADAPTER_MODE",
  "ZATCA_ENABLE_REAL_NETWORK",
  "ZATCA_SANDBOX_BASE_URL",
];

const LEGACY_PEM_FIELD_NAMES = ["privateKeyPem", "complianceCsidPem", "productionCsidPem"];
const CONTRACT_METHOD_NAMES = [
  "requestComplianceCsid",
  "requestProductionCsid",
  "submitComplianceCheck",
  "submitClearance",
  "submitReporting",
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    plan: false,
    strict: false,
    noNetwork: false,
    staticOnly: false,
    help: false,
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
    } else if (arg === "--static-only") {
      parsed.staticOnly = true;
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
    "  node scripts/zatca-sandbox-adapter-boundary-check.cjs --plan --no-network --json --static-only",
    "  node scripts/zatca-sandbox-adapter-boundary-check.cjs --plan --no-network --json --static-only --strict",
    "",
    "This boundary check is static-only metadata planning.",
    "It does not request OTPs, request CSIDs, call ZATCA, execute sandbox or mock adapters, create request bodies, process response bodies, connect to a database, write records, store secrets, sign, generate QR, validate signed XML, clear/report, create PDF-A3, mutate env, migrate, seed, reset, deploy, or send email.",
  ].join("\n");
}

function buildSandboxAdapterBoundaryCheck(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const args = options.args || {};
  const env = options.env || process.env;
  const officialReferences = inspectFiles(repoRoot, REQUIRED_OFFICIAL_REFERENCE_FILES, OPTIONAL_OFFICIAL_REFERENCE_FILES);
  const policyDocs = inspectFiles(repoRoot, REQUIRED_POLICY_DOCS, []);
  const packageScripts = inspectPackageScripts(repoRoot);
  const surfaces = inspectSourceSurfaces(repoRoot);
  const envPresence = inspectEnvPresence(env);
  const fatalBlockers = [];
  const blockers = [];
  const warnings = [
    "Static-only boundary check: source files are inspected by booleans and keyword counts only.",
    "Mock adapter success does not prove real ZATCA sandbox readiness.",
    "Disabled adapter refusal is expected and confirms the fail-closed path.",
    "Sandbox adapter remains unexecuted; no request or response body is created, processed, printed, or persisted.",
  ];

  if (officialReferences.missingRequired.length > 0) {
    fatalBlockers.push(`BOUNDARY_BLOCKED_MISSING_OFFICIAL_REFERENCES: ${officialReferences.missingRequired.join(", ")}`);
  }
  if (policyDocs.missingRequired.length > 0) {
    fatalBlockers.push(`BOUNDARY_BLOCKED_MISSING_POLICY_DOCS: ${policyDocs.missingRequired.join(", ")}`);
  }
  if (!packageScripts.allRequiredFound) {
    fatalBlockers.push(`BOUNDARY_BLOCKED_MISSING_PACKAGE_SCRIPT: ${packageScripts.missing.join(", ")}`);
  }
  if (!surfaces.adapters.sandboxAdapterFound) {
    fatalBlockers.push("BOUNDARY_BLOCKED_MISSING_SANDBOX_ADAPTER: sandbox adapter source was not found.");
  }
  if (!surfaces.adapters.disabledAdapterFound) {
    fatalBlockers.push("BOUNDARY_BLOCKED_MISSING_DISABLED_ADAPTER: disabled adapter source was not found.");
  }
  if (!surfaces.adapters.mockAdapterFound) {
    fatalBlockers.push("BOUNDARY_BLOCKED_MISSING_MOCK_ADAPTER: mock adapter source was not found.");
  }

  if (!args.staticOnly) {
    blockers.push("BOUNDARY_BLOCKED_STATIC_ONLY_FLAG_RECOMMENDED: --static-only should be used for mock-to-real boundary evidence.");
  }
  if (surfaces.boundaries.sandboxRiskPathDetected) {
    blockers.push("BOUNDARY_BLOCKED_REAL_NETWORK_NOT_APPROVED: sandbox adapter source contains real network or response handling paths that remain blocked.");
  }
  if (surfaces.boundaries.requestBodyCreationPointDetected) {
    blockers.push("BOUNDARY_BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED: request body creation points are detected by keyword count only and remain out of scope.");
  }
  if (surfaces.boundaries.responseBodyProcessingPointDetected) {
    blockers.push("BOUNDARY_BLOCKED_RESPONSE_BODY_PROCESSING_NOT_APPROVED: response body processing points are detected by keyword count only and remain out of scope.");
  }
  if (!surfaces.boundaries.disabledFailClosedDetected) {
    blockers.push("BOUNDARY_BLOCKED_DISABLED_ADAPTER_FAIL_CLOSED_UNPROVEN: disabled adapter refusal pattern was not detected.");
  }
  if (!surfaces.boundaries.mockOnlyBoundaryDetected) {
    blockers.push("BOUNDARY_BLOCKED_MOCK_ONLY_BOUNDARY_UNPROVEN: mock adapter boundary was not detected as mock-only.");
  }
  if (!surfaces.boundaries.envGateReferencesDetected) {
    blockers.push("BOUNDARY_BLOCKED_ENV_GATES_UNPROVEN: required adapter env gate names were not all found in source.");
  }
  if (!surfaces.boundaries.custodyDependencyDetected || !surfaces.custody.custodyProviderApproved) {
    blockers.push("BOUNDARY_BLOCKED_CUSTODY_DEPENDENCY: CSID response custody dependency is present but not approved for real response bodies.");
  }
  if (surfaces.custody.legacyPemFieldsFound) {
    blockers.push(`BOUNDARY_BLOCKED_LEGACY_RAW_PEM_FIELDS_PRESENT: ${surfaces.custody.legacyPemFields.join(", ")} remain raw PEM-capable and must not receive real CSID material.`);
  }
  if (!envPresence.adapterModeConfigured) {
    blockers.push("BOUNDARY_BLOCKED_ENV_ZATCA_ADAPTER_MODE_MISSING: adapter mode env presence is absent in this shell.");
  }
  if (!envPresence.realNetworkFlagConfigured) {
    blockers.push("BOUNDARY_BLOCKED_ENV_ZATCA_ENABLE_REAL_NETWORK_MISSING: real network gate env presence is absent in this shell.");
  }
  if (!envPresence.sandboxBaseUrlConfigured) {
    blockers.push("BOUNDARY_BLOCKED_ENV_ZATCA_SANDBOX_BASE_URL_MISSING: sandbox base URL env presence is absent in this shell.");
  }
  if (!envPresence.csidCustodyProviderConfigured) {
    blockers.push("BOUNDARY_BLOCKED_ENV_ZATCA_CSID_CUSTODY_PROVIDER_MISSING: custody provider env presence is absent in this shell.");
  }
  blockers.push("BOUNDARY_BLOCKED_OTP_CAPTURE_NOT_APPROVED: no OTP may be requested, accepted, logged, stored, or passed to an adapter.");
  blockers.push("BOUNDARY_BLOCKED_CSID_REQUEST_NOT_APPROVED: no sandbox or production CSID request may be attempted.");
  blockers.push("BOUNDARY_BLOCKED_ADAPTER_EXECUTION_NOT_APPROVED: sandbox adapter execution requires a separate future approval.");
  blockers.push("BOUNDARY_BLOCKED_DB_WRITES_NOT_APPROVED: no DB connection or write may be attempted.");
  blockers.push("BOUNDARY_BLOCKED_PRODUCTION_SIGNING_DISABLED: signing remains disabled.");
  blockers.push("BOUNDARY_BLOCKED_CLEARANCE_REPORTING_DISABLED: clearance and reporting remain disabled.");
  blockers.push("BOUNDARY_BLOCKED_PDF_A3_DISABLED: PDF-A3 remains disabled.");

  let status = "BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS";
  if (fatalBlockers.some((blocker) => blocker.startsWith("BOUNDARY_BLOCKED_MISSING_SANDBOX_ADAPTER"))) {
    status = "BOUNDARY_BLOCKED_MISSING_SANDBOX_ADAPTER";
  } else if (fatalBlockers.some((blocker) => blocker.startsWith("BOUNDARY_BLOCKED_MISSING_DISABLED_ADAPTER"))) {
    status = "BOUNDARY_BLOCKED_MISSING_DISABLED_ADAPTER";
  } else if (fatalBlockers.some((blocker) => blocker.startsWith("BOUNDARY_BLOCKED_MISSING_MOCK_ADAPTER"))) {
    status = "BOUNDARY_BLOCKED_MISSING_MOCK_ADAPTER";
  } else if (fatalBlockers.length > 0) {
    status = "BOUNDARY_BLOCKED_STATIC_CHECK_INCOMPLETE";
  }

  const safeBlockers = [...new Set(blockers)];
  const safeFatalBlockers = [...new Set(fatalBlockers)];
  const safeWarnings = [...new Set(warnings)];

  return {
    status,
    environment: ENVIRONMENT,
    noNetworkOnly: true,
    planMode: Boolean(args.plan),
    staticOnly: Boolean(args.staticOnly),
    metadataOnlyEvidence: true,
    networkCallsMade: false,
    dbConnectionAttempted: false,
    dbWriteAttempted: false,
    otpRequested: false,
    otpAccepted: false,
    otpStored: false,
    complianceCsidRequested: false,
    productionCsidRequested: false,
    sandboxAdapterExecuted: false,
    mockAdapterExecuted: false,
    disabledAdapterExecuted: false,
    adapterMethodCalled: false,
    requestBodyCreated: false,
    responseBodyProcessed: false,
    requestResponseBodyPrinted: false,
    requestBodyPersisted: false,
    responseBodyPersisted: false,
    secretsPrinted: false,
    envValuesPrinted: false,
    authHeaderPrinted: false,
    secretBodyExposed: false,
    privateKeyBodyExposed: false,
    certificateBodyExposed: false,
    tokenBodyExposed: false,
    signedXmlGenerated: false,
    qrPayloadGenerated: false,
    productionSigningEnabled: false,
    productionComplianceEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    officialReferencesInspected: officialReferences.foundRequired.concat(officialReferences.foundOptional),
    officialReferenceFilesFound: officialReferences.foundRequired,
    optionalOfficialReferenceFilesFound: officialReferences.foundOptional,
    policyDocsFound: policyDocs.foundRequired,
    packageScripts,
    envPresence,
    adapters: surfaces.adapters,
    boundaries: surfaces.boundaries,
    custody: surfaces.custody,
    contract: surfaces.contract,
    sourceKeywordCounts: surfaces.sourceKeywordCounts,
    blockers: safeBlockers,
    fatalBlockers: safeFatalBlockers,
    warnings: safeWarnings,
    nextApprovalGate: "ZATCA sandbox adapter no-network contract tests",
    recommendedNextPrompt: "ZATCA sandbox adapter no-network contract tests",
  };
}

function inspectSourceSurfaces(repoRoot) {
  const text = {};
  for (const [key, relPath] of Object.entries(SOURCE_SURFACES)) {
    text[key] = readText(repoRoot, relPath);
  }

  const found = Object.fromEntries(
    Object.entries(SOURCE_SURFACES).map(([key, relPath]) => [`${key}Found`, exists(repoRoot, relPath)]),
  );

  const sandboxCounts = {
    fetch: countText(text.sandboxAdapter, "fetch"),
    safeZatcaRequest: countText(text.sandboxAdapter, "safeZatcaRequest"),
    responseText: countText(text.sandboxAdapter, "response.text"),
    requestPlanBuilder: countText(text.sandboxAdapter, "buildComplianceCsidHttpRequestPlan"),
    stringifyBody: countText(text.sandboxAdapter, "JSON.stringify"),
    requestComplianceCsid: countText(text.sandboxAdapter, "requestComplianceCsid"),
    requestProductionCsid: countText(text.sandboxAdapter, "requestProductionCsid"),
  };
  const mockCounts = {
    fetch: countText(text.mockAdapter, "fetch"),
    localMock: countText(text.mockAdapter, "mock"),
    requestPlanBuilder: countText(text.mockAdapter, "buildComplianceCsidHttpRequestPlan"),
    mapResponse: countText(text.mockAdapter, "mapComplianceCsidHttpResponse"),
    requestComplianceCsid: countText(text.mockAdapter, "requestComplianceCsid"),
    requestProductionCsid: countText(text.mockAdapter, "requestProductionCsid"),
  };
  const disabledCounts = {
    disabledError: countText(text.disabledAdapter, "createRealNetworkDisabledError"),
    requestComplianceCsid: countText(text.disabledAdapter, "requestComplianceCsid"),
    requestProductionCsid: countText(text.disabledAdapter, "requestProductionCsid"),
    submitComplianceCheck: countText(text.disabledAdapter, "submitComplianceCheck"),
    submitClearance: countText(text.disabledAdapter, "submitClearance"),
    submitReporting: countText(text.disabledAdapter, "submitReporting"),
  };
  const mapperCounts = {
    requestPlanBuilder: countText(text.complianceCsidMapper, "buildComplianceCsidHttpRequestPlan"),
    responseMapper: countText(text.complianceCsidMapper, "mapComplianceCsidHttpResponse"),
    redaction: countText(text.complianceCsidMapper, "redact"),
  };
  const configCounts = Object.fromEntries(ENV_GATE_NAMES.map((name) => [name, countText(text.zatcaConfig, name)]));

  const envGateNamesDetected = ENV_GATE_NAMES.filter((name) => configCounts[name] > 0);
  const contractMethodsDetected = CONTRACT_METHOD_NAMES.filter((methodName) => countText(text.onboardingInterface, methodName) > 0);
  const legacyPemFields = LEGACY_PEM_FIELD_NAMES.filter((fieldName) => countText(text.prismaSchema, fieldName) > 0 || countText(text.zatcaService, fieldName) > 0);
  const metadataCustodyFields = [
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
  ].filter((fieldName) => countText(text.prismaSchema, fieldName) > 0);

  const sandboxRiskPathDetected =
    sandboxCounts.fetch > 0 ||
    sandboxCounts.safeZatcaRequest > 0 ||
    sandboxCounts.responseText > 0 ||
    sandboxCounts.stringifyBody > 0;
  const requestBodyCreationPointDetected =
    sandboxCounts.requestPlanBuilder > 0 ||
    mapperCounts.requestPlanBuilder > 0 ||
    mockCounts.requestPlanBuilder > 0 ||
    sandboxCounts.stringifyBody > 0;
  const responseBodyProcessingPointDetected =
    sandboxCounts.responseText > 0 ||
    mapperCounts.responseMapper > 0 ||
    mockCounts.mapResponse > 0;
  const mockOnlyBoundaryDetected =
    found.mockAdapterFound &&
    mockCounts.localMock > 0 &&
    mockCounts.requestComplianceCsid > 0 &&
    mockCounts.fetch === 0 &&
    countText(text.mockAdapter, "safeZatcaRequest") === 0;
  const disabledAdapterMethodCount = CONTRACT_METHOD_NAMES.filter((methodName) => countText(text.disabledAdapter, methodName) > 0).length;
  const disabledFailClosedDetected =
    found.disabledAdapterFound &&
    disabledCounts.disabledError >= 2 &&
    disabledAdapterMethodCount >= 2;
  const envGateReferencesDetected = envGateNamesDetected.length === ENV_GATE_NAMES.length;
  const custodyProviderApproved =
    countText(text.custodyProvider, "realProviderImplementationReady: true") > 0 ||
    countText(text.custodyProvider, "providerEnabled: true") > 0;
  const custodyDependencyDetected =
    found.custodyProviderFound ||
    countText(text.zatcaService, "ComplianceCsidSecretCustody") > 0 ||
    countText(text.zatcaService, "safeComplianceCsidCustodyRecordSelect") > 0 ||
    countText(text.csidResponseCustodyGuard, "CUSTODY_METADATA_SIMULATION") > 0;

  return {
    adapters: {
      sandboxAdapterFound: found.sandboxAdapterFound,
      disabledAdapterFound: found.disabledAdapterFound,
      mockAdapterFound: found.mockAdapterFound,
      onboardingInterfaceFound: found.onboardingInterfaceFound,
      adapterTypesFound: found.adapterTypesFound,
      complianceCsidMapperFound: found.complianceCsidMapperFound,
      sandboxAdapterHasNetworkRiskMarkers: sandboxRiskPathDetected,
      sandboxAdapterHasRequestPlanBuilder: sandboxCounts.requestPlanBuilder > 0,
      sandboxAdapterHasResponseTextParser: sandboxCounts.responseText > 0,
      sandboxAdapterHasFetchMarker: sandboxCounts.fetch > 0,
      disabledAdapterThrows: disabledCounts.disabledError >= 2,
      disabledAdapterMethodCount,
      mockAdapterOnly: mockOnlyBoundaryDetected,
      mockAdapterHasFetchMarker: mockCounts.fetch > 0,
    },
    boundaries: {
      mockOnlyBoundaryDetected,
      disabledFailClosedDetected,
      sandboxRiskPathDetected,
      envGateReferencesDetected,
      envGateNamesDetected,
      custodyDependencyDetected,
      requestBodyCreationPointDetected,
      responseBodyProcessingPointDetected,
      requestBodyMarkersPresent: requestBodyCreationPointDetected,
      responseBodyMarkersPresent: responseBodyProcessingPointDetected,
      noNetworkInterceptionRequired: true,
      staticAstOrStringInspectionOnly: true,
      mockedDependencyInjectionAllowedOnlyAfterNoNetworkTrap: true,
      realAdapterExecutionForbidden: true,
    },
    custody: {
      custodyProviderFound: found.custodyProviderFound,
      custodyProviderApproved,
      custodyProviderDisabled: found.custodyProviderFound && !custodyProviderApproved,
      metadataCustodyModelFound: countText(text.prismaSchema, "ZatcaComplianceCsidCustodyRecord") > 0,
      metadataCustodyFieldsFound: metadataCustodyFields,
      legacyPemFieldsFound: legacyPemFields.length > 0,
      legacyPemFields,
    },
    contract: {
      adapterInterfaceFound: found.onboardingInterfaceFound,
      contractMethodsDetected,
      contractMethodCount: contractMethodsDetected.length,
      mockImplementsComplianceCsidMethod: mockCounts.requestComplianceCsid > 0,
      disabledImplementsComplianceCsidMethod: disabledCounts.requestComplianceCsid > 0,
      sandboxImplementsComplianceCsidMethod: sandboxCounts.requestComplianceCsid > 0,
      mockPassMeansLocalContractOnly: true,
      mockPassDoesNotMeanRealSandboxReady: true,
    },
    sourceKeywordCounts: {
      sandboxAdapter: sandboxCounts,
      mockAdapter: mockCounts,
      disabledAdapter: disabledCounts,
      mapper: mapperCounts,
      config: configCounts,
    },
  };
}

function inspectEnvPresence(env) {
  return {
    adapterModeConfigured: hasEnv(env, "ZATCA_ADAPTER_MODE"),
    realNetworkFlagConfigured: hasEnv(env, "ZATCA_ENABLE_REAL_NETWORK"),
    sandboxBaseUrlConfigured: hasEnv(env, "ZATCA_SANDBOX_BASE_URL"),
    simulationBaseUrlConfigured: hasEnv(env, "ZATCA_SIMULATION_BASE_URL"),
    productionBaseUrlConfigured: hasEnv(env, "ZATCA_PRODUCTION_BASE_URL"),
    csidCustodyProviderConfigured: hasEnv(env, "ZATCA_CSID_CUSTODY_PROVIDER"),
    sandboxOtpConfigured: hasEnv(env, "ZATCA_SANDBOX_COMPLIANCE_CSID_OTP"),
    databaseUrlConfigured: hasEnv(env, "DATABASE_URL"),
    directUrlConfigured: hasEnv(env, "DIRECT_URL"),
    productionCredentialConfigured:
      hasEnv(env, "ZATCA_PRODUCTION_PRIVATE_KEY") ||
      hasEnv(env, "ZATCA_PRODUCTION_CSID") ||
      hasEnv(env, "ZATCA_PRODUCTION_BINARY_SECURITY_TOKEN") ||
      hasEnv(env, "ZATCA_PRODUCTION_SECRET"),
  };
}

function inspectFiles(repoRoot, required, optional) {
  const foundRequired = required.filter((relPath) => exists(repoRoot, relPath));
  const missingRequired = required.filter((relPath) => !exists(repoRoot, relPath));
  const foundOptional = optional.filter((relPath) => exists(repoRoot, relPath));
  const missingOptional = optional.filter((relPath) => !exists(repoRoot, relPath));
  return { foundRequired, missingRequired, foundOptional, missingOptional };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    return { allRequiredFound: false, found: [], missing: REQUIRED_PACKAGE_SCRIPTS.slice() };
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch {
    return { allRequiredFound: false, found: [], missing: REQUIRED_PACKAGE_SCRIPTS.slice() };
  }
  const scripts = parsed && typeof parsed.scripts === "object" && parsed.scripts ? parsed.scripts : {};
  const found = REQUIRED_PACKAGE_SCRIPTS.filter((scriptName) => Object.prototype.hasOwnProperty.call(scripts, scriptName));
  const missing = REQUIRED_PACKAGE_SCRIPTS.filter((scriptName) => !Object.prototype.hasOwnProperty.call(scripts, scriptName));
  return { allRequiredFound: missing.length === 0, found, missing };
}

function exists(repoRoot, relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function readText(repoRoot, relPath) {
  const filePath = path.join(repoRoot, relPath);
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function countText(text, token) {
  if (!text || !token) {
    return 0;
  }
  let count = 0;
  let index = 0;
  while (true) {
    const foundAt = text.indexOf(token, index);
    if (foundAt === -1) {
      return count;
    }
    count += 1;
    index = foundAt + token.length;
  }
}

function hasEnv(env, name) {
  return Object.prototype.hasOwnProperty.call(env, name) && String(env[name] ?? "").length > 0;
}

function resolveRepoRoot(cwd) {
  return path.resolve(cwd);
}

function writeOutput(payload, json) {
  if (json) {
    return JSON.stringify(payload, null, 2);
  }
  return [
    `status: ${payload.status}`,
    `environment: ${payload.environment}`,
    `staticOnly: ${payload.staticOnly}`,
    `networkCallsMade: ${payload.networkCallsMade}`,
    `sandboxAdapterExecuted: ${payload.sandboxAdapterExecuted}`,
    `mockAdapterExecuted: ${payload.mockAdapterExecuted}`,
    `nextApprovalGate: ${payload.nextApprovalGate}`,
  ].join("\n");
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    const payload = {
      status: "BOUNDARY_BLOCKED_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      noNetworkOnly: true,
      networkCallsMade: false,
      sandboxAdapterExecuted: false,
      mockAdapterExecuted: false,
      requestBodyCreated: false,
      responseBodyProcessed: false,
      envValuesPrinted: false,
      secretsPrinted: false,
      error: error.message,
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
    const payload = {
      status: "BOUNDARY_BLOCKED_NO_NETWORK_REQUIRED",
      environment: ENVIRONMENT,
      noNetworkOnly: true,
      staticOnly: Boolean(args.staticOnly),
      networkCallsMade: false,
      dbConnectionAttempted: false,
      otpRequested: false,
      complianceCsidRequested: false,
      productionCsidRequested: false,
      sandboxAdapterExecuted: false,
      mockAdapterExecuted: false,
      requestBodyCreated: false,
      responseBodyProcessed: false,
      envValuesPrinted: false,
      secretsPrinted: false,
      secretBodyExposed: false,
      tokenBodyExposed: false,
      requestResponseBodyPrinted: false,
      blockers: ["BOUNDARY_BLOCKED_NO_NETWORK_REQUIRED: --no-network is required before static boundary planning can run."],
      fatalBlockers: ["BOUNDARY_BLOCKED_NO_NETWORK_REQUIRED: --no-network is required before static boundary planning can run."],
      warnings: ["No inspection was performed because --no-network was absent."],
      nextApprovalGate: "ZATCA sandbox adapter no-network contract tests",
    };
    process.stderr.write(`${writeOutput(payload, args.json)}\n`);
    process.exitCode = 2;
    return;
  }

  const payload = buildSandboxAdapterBoundaryCheck({ args, env: process.env });
  process.stdout.write(`${writeOutput(payload, args.json)}\n`);
  if (args.strict && payload.fatalBlockers.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildSandboxAdapterBoundaryCheck,
  parseArgs,
};
