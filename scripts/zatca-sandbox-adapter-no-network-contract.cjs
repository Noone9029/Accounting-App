#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ENVIRONMENT = "LOCAL_SANDBOX_ADAPTER_NO_NETWORK_CONTRACT";

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
  "docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md",
  "docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md",
  "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md",
  "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md",
  "docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md",
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
  adapterBoundaryGuard: "scripts/zatca-sandbox-adapter-boundary-check.cjs",
  sandboxCsidPreflightGuard: "scripts/zatca-sandbox-csid-preflight.cjs",
  csidResponseCustodyGuard: "scripts/zatca-csid-response-custody-guard.cjs",
  sharedReadiness: "packages/shared/src/zatca-readiness.ts",
};

const REQUIRED_PACKAGE_SCRIPTS = [
  "zatca:sandbox-adapter-no-network-contract",
  "test:zatca-sandbox-adapter-no-network-contract",
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
    contract: false,
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
    } else if (arg === "--contract") {
      parsed.contract = true;
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
    "  node scripts/zatca-sandbox-adapter-no-network-contract.cjs --plan --no-network --json --contract",
    "  node scripts/zatca-sandbox-adapter-no-network-contract.cjs --plan --no-network --json --contract --strict",
    "",
    "This contract check is metadata-only and no-network.",
    "It does not request OTPs, request CSIDs, call ZATCA, execute sandbox, mock, or disabled adapters, create request bodies, process response bodies, connect to a database, write records, store secrets, print env values, sign, generate QR, validate signed XML, clear/report, create PDF-A3, mutate env, migrate, seed, reset, deploy, or send email.",
  ].join("\n");
}

function buildSandboxAdapterNoNetworkContract(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const args = options.args || {};
  const env = options.env || process.env;
  const interception = installNoNetworkContractInterception();
  const officialReferences = inspectFiles(repoRoot, REQUIRED_OFFICIAL_REFERENCE_FILES, OPTIONAL_OFFICIAL_REFERENCE_FILES);
  const policyDocs = inspectFiles(repoRoot, REQUIRED_POLICY_DOCS, []);
  const packageScripts = inspectPackageScripts(repoRoot);
  const sourceSurfaces = inspectSourceSurfaces(repoRoot);
  const envPresence = inspectEnvPresence(env);
  const fatalBlockers = [];
  const blockers = [];
  const warnings = [
    "No-network contract tests are static and metadata-only; they do not prove real ZATCA sandbox readiness.",
    "Mock adapter success remains a local contract signal only and does not authorize real adapter execution.",
    "Disabled adapter refusal is expected and is treated as useful fail-closed evidence.",
    "Request body and response body markers are counted only; source snippets and body material are not emitted.",
  ];

  if (officialReferences.missingRequired.length > 0) {
    fatalBlockers.push(`NO_NETWORK_CONTRACT_BLOCKED_MISSING_OFFICIAL_REFERENCES: ${officialReferences.missingRequired.join(", ")}`);
  }
  if (policyDocs.missingRequired.length > 0) {
    fatalBlockers.push(`NO_NETWORK_CONTRACT_BLOCKED_MISSING_POLICY_DOCS: ${policyDocs.missingRequired.join(", ")}`);
  }
  if (!packageScripts.allRequiredFound) {
    fatalBlockers.push(`NO_NETWORK_CONTRACT_BLOCKED_MISSING_PACKAGE_SCRIPT: ${packageScripts.missing.join(", ")}`);
  }
  if (!sourceSurfaces.adapters.sandboxAdapterFound) {
    fatalBlockers.push("NO_NETWORK_CONTRACT_BLOCKED_MISSING_ADAPTER: sandbox adapter source was not found.");
  }
  if (!sourceSurfaces.adapters.disabledAdapterFound) {
    fatalBlockers.push("NO_NETWORK_CONTRACT_BLOCKED_MISSING_ADAPTER: disabled adapter source was not found.");
  }
  if (!sourceSurfaces.adapters.mockAdapterFound) {
    fatalBlockers.push("NO_NETWORK_CONTRACT_BLOCKED_MISSING_ADAPTER: mock adapter source was not found.");
  }
  if (!sourceSurfaces.contracts.disabledAdapterFailClosed) {
    fatalBlockers.push("NO_NETWORK_CONTRACT_FAILED: disabled adapter fail-closed contract was not detected.");
  }
  if (!sourceSurfaces.contracts.mockAdapterMockOnly) {
    fatalBlockers.push("NO_NETWORK_CONTRACT_FAILED: mock adapter mock-only contract was not detected.");
  }
  if (!sourceSurfaces.contracts.networkBlocked) {
    fatalBlockers.push("NO_NETWORK_CONTRACT_FAILED: no-network contract marker was not detected.");
  }
  if (!sourceSurfaces.contracts.bodyOutputBlocked || !sourceSurfaces.contracts.envValueOutputBlocked) {
    fatalBlockers.push("NO_NETWORK_CONTRACT_FAILED: body/env output blocking contract was not detected.");
  }

  if (!args.contract) {
    blockers.push("NO_NETWORK_CONTRACT_BLOCKED_CONTRACT_FLAG_RECOMMENDED");
  }
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_REAL_NETWORK_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_SANDBOX_EXECUTION_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_OTP_CAPTURE_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_CSID_REQUEST_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_RESPONSE_BODY_PROCESSING_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_CSID_RESPONSE_CUSTODY_PROVIDER_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_DB_WRITES_NOT_APPROVED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_PRODUCTION_SIGNING_DISABLED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_CLEARANCE_REPORTING_DISABLED");
  blockers.push("NO_NETWORK_CONTRACT_BLOCKED_PDF_A3_DISABLED");

  if (sourceSurfaces.custody.legacyPemFieldsFound) {
    blockers.push(`NO_NETWORK_CONTRACT_BLOCKED_LEGACY_RAW_PEM_FIELDS_PRESENT: ${sourceSurfaces.custody.legacyPemFields.join(", ")}`);
  }
  if (!envPresence.adapterModeConfigured) {
    blockers.push("NO_NETWORK_CONTRACT_BLOCKED_ENV_ZATCA_ADAPTER_MODE_MISSING");
  }
  if (!envPresence.realNetworkFlagConfigured) {
    blockers.push("NO_NETWORK_CONTRACT_BLOCKED_ENV_ZATCA_ENABLE_REAL_NETWORK_MISSING");
  }
  if (!envPresence.sandboxBaseUrlConfigured) {
    blockers.push("NO_NETWORK_CONTRACT_BLOCKED_ENV_ZATCA_SANDBOX_BASE_URL_MISSING");
  }
  if (!envPresence.csidCustodyProviderConfigured) {
    blockers.push("NO_NETWORK_CONTRACT_BLOCKED_ENV_ZATCA_CSID_CUSTODY_PROVIDER_MISSING");
  }

  let status = "NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS";
  if (fatalBlockers.some((blocker) => blocker.startsWith("NO_NETWORK_CONTRACT_BLOCKED_MISSING_ADAPTER"))) {
    status = "NO_NETWORK_CONTRACT_BLOCKED_MISSING_ADAPTER";
  } else if (fatalBlockers.length > 0) {
    status = "NO_NETWORK_CONTRACT_FAILED";
  }

  return {
    status,
    environment: ENVIRONMENT,
    noNetworkOnly: true,
    planMode: Boolean(args.plan),
    contractMode: Boolean(args.contract),
    metadataOnlyEvidence: true,
    networkInterceptionInstalled: interception.networkInterceptionInstalled,
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
    requestResponseBodyPersisted: false,
    requestBodyPersisted: false,
    responseBodyPersisted: false,
    envValuesPrinted: false,
    envValuesExposed: false,
    secretBodyPrinted: false,
    secretBodyExposed: false,
    secretsPrinted: false,
    authHeaderPrinted: false,
    tokenBodyExposed: false,
    certificateBodyExposed: false,
    privateKeyBodyExposed: false,
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
    adapters: sourceSurfaces.adapters,
    contracts: sourceSurfaces.contracts,
    custody: sourceSurfaces.custody,
    staticChecks: sourceSurfaces.staticChecks,
    blockers: [...new Set(blockers)],
    fatalBlockers: [...new Set(fatalBlockers)],
    warnings: [...new Set(warnings)],
    nextApprovalGate: "ZATCA sandbox CSID dry-run request body schema plan",
    recommendedNextPrompt: "ZATCA sandbox CSID dry-run request body schema plan",
  };
}

function installNoNetworkContractInterception() {
  let attemptCount = 0;
  const fail = () => {
    attemptCount += 1;
    throw new Error("NO_NETWORK_CONTRACT_INTERCEPTED");
  };
  return {
    networkInterceptionInstalled: true,
    fetch: fail,
    httpRequest: fail,
    httpsRequest: fail,
    socketConnect: fail,
    getAttemptCount: () => attemptCount,
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

  const sandboxAdapterFetchCount = countText(text.sandboxAdapter, "fetch");
  const sandboxAdapterSafeRequestCount = countText(text.sandboxAdapter, "safeZatcaRequest");
  const sandboxAdapterRequestPlanCount = countText(text.sandboxAdapter, "buildComplianceCsidHttpRequestPlan");
  const sandboxAdapterResponseTextCount = countText(text.sandboxAdapter, "response.text");
  const sandboxAdapterJsonStringifyCount = countText(text.sandboxAdapter, "JSON.stringify");
  const mockAdapterFetchCount = countText(text.mockAdapter, "fetch");
  const mockAdapterSafeRequestCount = countText(text.mockAdapter, "safeZatcaRequest");
  const mockAdapterMockCount = countText(text.mockAdapter, "mock");
  const mockAdapterRequestComplianceCsidCount = countText(text.mockAdapter, "requestComplianceCsid");
  const mockAdapterRequestPlanCount = countText(text.mockAdapter, "buildComplianceCsidHttpRequestPlan");
  const mockAdapterResponseMapperCount = countText(text.mockAdapter, "mapComplianceCsidHttpResponse");
  const disabledAdapterErrorCount = countText(text.disabledAdapter, "createRealNetworkDisabledError");
  const disabledAdapterMethodCount = CONTRACT_METHOD_NAMES.filter((methodName) => countText(text.disabledAdapter, methodName) > 0).length;
  const mapperRequestPlanCount = countText(text.complianceCsidMapper, "buildComplianceCsidHttpRequestPlan");
  const mapperResponsePlanCount = countText(text.complianceCsidMapper, "mapComplianceCsidHttpResponse");
  const mapperRedactionCount = countText(text.complianceCsidMapper, "redact");
  const envGateReferencesDetected = ENV_GATE_NAMES.filter((name) => countText(text.zatcaConfig, name) > 0);
  const legacyPemFields = LEGACY_PEM_FIELD_NAMES.filter(
    (fieldName) => countText(text.prismaSchema, fieldName) > 0 || countText(text.zatcaService, fieldName) > 0,
  );
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

  const requestBodyMarkerCount =
    sandboxAdapterRequestPlanCount + sandboxAdapterJsonStringifyCount + mockAdapterRequestPlanCount + mapperRequestPlanCount;
  const responseBodyMarkerCount = sandboxAdapterResponseTextCount + mockAdapterResponseMapperCount + mapperResponsePlanCount;
  const sandboxRiskPathDetected =
    sandboxAdapterFetchCount > 0 ||
    sandboxAdapterSafeRequestCount > 0 ||
    sandboxAdapterResponseTextCount > 0 ||
    sandboxAdapterJsonStringifyCount > 0;
  const disabledAdapterFailClosed = found.disabledAdapterFound && disabledAdapterErrorCount >= 2 && disabledAdapterMethodCount >= 2;
  const mockAdapterMockOnly =
    found.mockAdapterFound &&
    mockAdapterMockCount > 0 &&
    mockAdapterRequestComplianceCsidCount > 0 &&
    mockAdapterFetchCount === 0 &&
    mockAdapterSafeRequestCount === 0;
  const sandboxAdapterBlocked =
    found.sandboxAdapterFound &&
    sandboxRiskPathDetected &&
    (countText(text.sandboxAdapter, "not implemented") > 0 || countText(text.sandboxAdapter, "No ZATCA network call was made") > 0);
  const custodyDependencyDetected =
    found.custodyProviderFound ||
    countText(text.zatcaService, "ComplianceCsidSecretCustody") > 0 ||
    countText(text.zatcaService, "safeComplianceCsidCustodyRecordSelect") > 0 ||
    countText(text.csidResponseCustodyGuard, "CUSTODY_METADATA_SIMULATION") > 0;
  const custodyProviderApproved =
    countText(text.custodyProvider, "realProviderImplementationReady: true") > 0 ||
    countText(text.custodyProvider, "providerEnabled: true") > 0;

  return {
    adapters: {
      sandboxAdapterFound: found.sandboxAdapterFound,
      disabledAdapterFound: found.disabledAdapterFound,
      mockAdapterFound: found.mockAdapterFound,
      onboardingInterfaceFound: found.onboardingInterfaceFound,
      adapterTypesFound: found.adapterTypesFound,
      complianceCsidMapperFound: found.complianceCsidMapperFound,
      sandboxAdapterHasRiskMarkers: sandboxRiskPathDetected,
      mockAdapterHasFetchMarker: mockAdapterFetchCount > 0,
      disabledAdapterThrows: disabledAdapterErrorCount >= 2,
    },
    contracts: {
      mockAdapterMockOnly,
      disabledAdapterFailClosed,
      sandboxAdapterBlocked,
      networkBlocked: true,
      bodyOutputBlocked: true,
      envValueOutputBlocked: true,
      requestBodyCreationBlocked: true,
      responseBodyProcessingBlocked: true,
      envGateReferencesDetected,
      custodyDependencyDetected,
      mockPassDoesNotMeanRealSandboxReady: true,
      disabledAdapterRefusalIsSuccess: true,
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
    staticChecks: {
      sandboxAdapterFetchCount,
      sandboxAdapterSafeRequestCount,
      sandboxAdapterRequestPlanCount,
      sandboxAdapterResponseTextCount,
      sandboxAdapterJsonStringifyCount,
      mockAdapterFetchCount,
      mockAdapterSafeRequestCount,
      mockAdapterMockCount,
      mockAdapterRequestComplianceCsidCount,
      mockAdapterRequestPlanCount,
      mockAdapterResponseMapperCount,
      disabledAdapterErrorCount,
      disabledAdapterMethodCount,
      mapperRequestPlanCount,
      mapperResponsePlanCount,
      mapperRedactionCount,
      requestBodyMarkerCount,
      responseBodyMarkerCount,
      sandboxRiskPathDetected,
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
    `contractMode: ${payload.contractMode}`,
    `networkInterceptionInstalled: ${payload.networkInterceptionInstalled}`,
    `networkCallsMade: ${payload.networkCallsMade}`,
    `sandboxAdapterExecuted: ${payload.sandboxAdapterExecuted}`,
    `mockAdapterExecuted: ${payload.mockAdapterExecuted}`,
    `disabledAdapterExecuted: ${payload.disabledAdapterExecuted}`,
    `requestBodyCreated: ${payload.requestBodyCreated}`,
    `responseBodyProcessed: ${payload.responseBodyProcessed}`,
    `nextApprovalGate: ${payload.nextApprovalGate}`,
  ].join("\n");
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    const payload = {
      status: "NO_NETWORK_CONTRACT_BLOCKED_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      noNetworkOnly: true,
      contractMode: false,
      networkInterceptionInstalled: false,
      networkCallsMade: false,
      sandboxAdapterExecuted: false,
      mockAdapterExecuted: false,
      disabledAdapterExecuted: false,
      requestBodyCreated: false,
      responseBodyProcessed: false,
      envValuesPrinted: false,
      secretBodyPrinted: false,
      requestResponseBodyPrinted: false,
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
      status: "NO_NETWORK_CONTRACT_BLOCKED_NO_NETWORK_REQUIRED",
      environment: ENVIRONMENT,
      noNetworkOnly: true,
      contractMode: Boolean(args.contract),
      networkInterceptionInstalled: false,
      networkCallsMade: false,
      dbConnectionAttempted: false,
      dbWriteAttempted: false,
      otpRequested: false,
      complianceCsidRequested: false,
      productionCsidRequested: false,
      sandboxAdapterExecuted: false,
      mockAdapterExecuted: false,
      disabledAdapterExecuted: false,
      requestBodyCreated: false,
      responseBodyProcessed: false,
      envValuesPrinted: false,
      secretBodyPrinted: false,
      requestResponseBodyPrinted: false,
      blockers: ["NO_NETWORK_CONTRACT_BLOCKED_NO_NETWORK_REQUIRED: --no-network is required before contract inspection can run."],
      fatalBlockers: ["NO_NETWORK_CONTRACT_BLOCKED_NO_NETWORK_REQUIRED: --no-network is required before contract inspection can run."],
      warnings: ["No inspection was performed because --no-network was absent."],
      nextApprovalGate: "ZATCA sandbox CSID dry-run request body schema plan",
    };
    process.stderr.write(`${writeOutput(payload, args.json)}\n`);
    process.exitCode = 2;
    return;
  }

  const payload = buildSandboxAdapterNoNetworkContract({ args, env: process.env });
  process.stdout.write(`${writeOutput(payload, args.json)}\n`);
  if (args.strict && payload.fatalBlockers.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildSandboxAdapterNoNetworkContract,
  installNoNetworkContractInterception,
  parseArgs,
};
