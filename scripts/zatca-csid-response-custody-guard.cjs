#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ENVIRONMENT = "LOCAL_CSID_RESPONSE_CUSTODY_GUARD_NO_NETWORK";
const APPROVAL_PHRASE =
  "I approve ZATCA CSID response custody metadata-only planning. No real OTP, no real CSID, no real ZATCA network, no real response body, no secret storage, no body exposure, and metadata-only evidence.";

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
  "docs/zatca/CSID_RESPONSE_CUSTODY_PLAN.md",
  "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md",
  "docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md",
  "docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md",
  "docs/zatca/CSID_LIFECYCLE_CHECKLIST.md",
  "docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md",
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
  prismaSchema: "apps/api/prisma/schema.prisma",
  custodyProvider: "apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts",
  zatcaService: "apps/api/src/zatca/zatca.service.ts",
  zatcaController: "apps/api/src/zatca/zatca.controller.ts",
  zatcaConfig: "apps/api/src/zatca/zatca.config.ts",
  sandboxAdapter: "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts",
  mockAdapter: "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts",
  sandboxDisabledAdapter: "apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts",
  sharedReadiness: "packages/shared/src/zatca-readiness.ts",
};

const REQUIRED_PACKAGE_SCRIPTS = [
  "zatca:csid-response-custody-guard",
  "test:zatca-csid-response-custody-guard",
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
    simulateMetadataOnlyResponse: false,
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
    } else if (arg === "--simulate-metadata-only-response") {
      parsed.simulateMetadataOnlyResponse = true;
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
    "  node scripts/zatca-csid-response-custody-guard.cjs --plan --no-network --json",
    "  node scripts/zatca-csid-response-custody-guard.cjs --plan --no-network --json --strict",
    "  node scripts/zatca-csid-response-custody-guard.cjs --plan --no-network --json --approval-phrase <text> --simulate-metadata-only-response",
    "",
    "This guard models CSID response custody metadata only.",
    "It does not request OTPs, request CSIDs, call ZATCA, execute adapters, process real response bodies, connect to a database, write custody records, store secrets, sign, generate QR, clear/report, create PDF/A-3, mutate env, migrate, seed, reset, deploy, or send email.",
  ].join("\n");
}

function buildCsidResponseCustodyGuard(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const env = options.env || process.env;
  const args = options.args || {};
  const officialReferences = inspectFiles(repoRoot, REQUIRED_OFFICIAL_REFERENCE_FILES, OPTIONAL_OFFICIAL_REFERENCE_FILES);
  const policyDocs = inspectFiles(repoRoot, POLICY_DOCS, []);
  const packageScripts = inspectPackageScripts(repoRoot);
  const sourceSurfaces = inspectSourceSurfaces(repoRoot);
  const envPresence = inspectEnvPresence(env);
  const approvalPhraseProvided = typeof args.approvalPhrase === "string" && args.approvalPhrase.length > 0;
  const approvalPhraseMatched = args.approvalPhrase === APPROVAL_PHRASE;
  const simulationModeUsed = Boolean(args.simulateMetadataOnlyResponse);
  const blockers = [];
  const warnings = [
    "Guard output is metadata-only; no CSID request body, response body, OTP, token, secret, certificate, or private-key body is accepted, processed, stored, or printed.",
    "Official references were inspected structurally from the repository reference/ folder only.",
  ];

  if (officialReferences.missingRequired.length > 0) {
    blockers.push(`BLOCKED_MISSING_OFFICIAL_REFERENCES: ${officialReferences.missingRequired.join(", ")}`);
  }
  if (policyDocs.missingRequired.length > 0) {
    blockers.push(`BLOCKED_MISSING_CUSTODY_POLICY_DOCS: ${policyDocs.missingRequired.join(", ")}`);
  }
  if (!packageScripts.allRequiredFound) {
    blockers.push(`BLOCKED_MISSING_PACKAGE_SCRIPT: ${packageScripts.missing.join(", ")}`);
  }
  if (!sourceSurfaces.allRequiredFound) {
    blockers.push(`BLOCKED_MISSING_CODE_SURFACES: ${sourceSurfaces.missing.join(", ")}`);
  }
  if (!sourceSurfaces.custodyProviderFound) {
    blockers.push("BLOCKED_CSID_RESPONSE_CUSTODY_PROVIDER_MISSING: custody provider source was not found.");
  }
  if (sourceSurfaces.custodyProviderDisabled || !sourceSurfaces.realProviderImplementationReady || sourceSurfaces.bodyStorageAllowed !== true) {
    blockers.push("BLOCKED_CSID_RESPONSE_CUSTODY_PROVIDER_DISABLED: real token, secret, and certificate body custody is disabled or unapproved.");
  }
  if (!sourceSurfaces.metadataCustodyModelFound) {
    blockers.push("BLOCKED_METADATA_CUSTODY_MODEL_MISSING: metadata-only CSID custody record model was not found.");
  }
  if (sourceSurfaces.legacyPemFieldsFound) {
    blockers.push(`BLOCKED_LEGACY_RAW_PEM_FIELDS_PRESENT: ${sourceSurfaces.legacyPemFields.join(", ")} remain raw PEM-capable and must not receive real CSID response material.`);
  }
  if (envPresence.csidCustodyAllowBodyStorageConfigured) {
    blockers.push("BLOCKED_BODY_STORAGE_ENV_REQUEST_IGNORED: body storage env flag is present but custody body storage remains blocked.");
  }
  blockers.push("BLOCKED_REAL_RESPONSE_BODY_PROCESSING_NOT_APPROVED: no real CSID response body may be processed in this guard.");
  blockers.push("BLOCKED_DB_WRITES_NOT_APPROVED: no database connection or metadata/body write may be attempted in this guard.");
  blockers.push("BLOCKED_CSID_REQUEST_NOT_APPROVED: no sandbox or production CSID request may be attempted in this guard.");

  let status = "CUSTODY_GUARD_BLOCKED_APPROVAL_REQUIRED";
  if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "BLOCKED_INVALID_APPROVAL_PHRASE";
    blockers.unshift("BLOCKED_INVALID_APPROVAL_PHRASE: provided approval phrase did not match the custody planning phrase.");
  } else if (approvalPhraseMatched && !simulationModeUsed) {
    status = "CUSTODY_GUARD_BLOCKED_SIMULATION_FLAG_REQUIRED";
    blockers.unshift("BLOCKED_SIMULATION_FLAG_REQUIRED: --simulate-metadata-only-response is required for custody metadata simulation.");
  } else if (approvalPhraseMatched && simulationModeUsed) {
    status = blockers.length > 0 ? "CUSTODY_METADATA_SIMULATION_BLOCKED" : "CUSTODY_METADATA_SIMULATION_PASSED";
  } else if (!approvalPhraseProvided) {
    blockers.unshift("CUSTODY_GUARD_BLOCKED_APPROVAL_REQUIRED: exact metadata-only custody planning approval phrase is required.");
  }

  const safeBlockers = [...new Set(blockers)];
  const safeWarnings = [...new Set(warnings)];

  return {
    status,
    environment: ENVIRONMENT,
    noNetworkOnly: true,
    networkCallsMade: false,
    dbConnectionAttempted: false,
    dbWriteAttempted: false,
    otpRequested: false,
    otpAccepted: false,
    otpStored: false,
    complianceCsidRequested: false,
    productionCsidRequested: false,
    sandboxAdapterExecuted: false,
    adapterExecuted: false,
    realResponseBodyProcessed: false,
    simulatedResponseBodyProcessed: false,
    secretBodyPersisted: false,
    certificateBodyPersisted: false,
    tokenBodyPersisted: false,
    csidResponsePersisted: false,
    requestResponseBodyPrinted: false,
    envValuesPrinted: false,
    privateKeyBodyPrinted: false,
    certificateBodyPrinted: false,
    tokenBodyPrinted: false,
    secretBodyPrinted: false,
    requestBodyCreated: false,
    responseBodyParsed: false,
    responseBodyReturned: false,
    productionSigningEnabled: false,
    productionComplianceEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    metadataOnlyEvidence: true,
    approvalPhraseProvided,
    approvalPhraseMatched,
    custodyGuardRecognized: approvalPhraseMatched && simulationModeUsed,
    simulationModeUsed,
    officialReferencesInspected: [...officialReferences.found, ...officialReferences.optionalFound],
    officialReferenceFilesFound: officialReferences.found,
    optionalOfficialReferenceFilesFound: officialReferences.optionalFound,
    policyDocsFound: policyDocs.found,
    envPresence,
    codeSurfaces: sourceSurfaces,
    custodyProviderFound: sourceSurfaces.custodyProviderFound,
    custodyProviderDisabled: sourceSurfaces.custodyProviderDisabled,
    realProviderImplementationReady: sourceSurfaces.realProviderImplementationReady,
    bodyStorageAllowed: false,
    metadataCustodyModelFound: sourceSurfaces.metadataCustodyModelFound,
    metadataCustodyFieldsFound: sourceSurfaces.metadataCustodyFieldsFound,
    legacyPemFieldsFound: sourceSurfaces.legacyPemFieldsFound,
    legacyPemFields: sourceSurfaces.legacyPemFields,
    rawCsrFieldFound: sourceSurfaces.rawCsrFieldFound,
    redaction: {
      requestBodyPrinted: false,
      responseBodyPrinted: false,
      envValuesPrinted: false,
      secretBodyPersisted: false,
      certificateBodyPersisted: false,
      tokenBodyPersisted: false,
      realResponseBodyProcessed: false,
      simulatedResponseBodyProcessed: false,
    },
    blockers: safeBlockers,
    warnings: safeWarnings,
    nextApprovalGate: "ZATCA sandbox adapter execution approval plan",
    recommendedNextPrompt: "ZATCA sandbox adapter execution approval plan",
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

function inspectSourceSurfaces(repoRoot) {
  const entries = Object.entries(SOURCE_SURFACES);
  const missing = entries.filter(([, file]) => !exists(repoRoot, file)).map(([, file]) => file);
  const schema = readText(repoRoot, SOURCE_SURFACES.prismaSchema);
  const custodyProvider = readText(repoRoot, SOURCE_SURFACES.custodyProvider);
  const service = readText(repoRoot, SOURCE_SURFACES.zatcaService);
  const controller = readText(repoRoot, SOURCE_SURFACES.zatcaController);
  const sandboxAdapter = readText(repoRoot, SOURCE_SURFACES.sandboxAdapter);
  const mockAdapter = readText(repoRoot, SOURCE_SURFACES.mockAdapter);
  const sandboxDisabledAdapter = readText(repoRoot, SOURCE_SURFACES.sandboxDisabledAdapter);
  const sharedReadiness = readText(repoRoot, SOURCE_SURFACES.sharedReadiness);
  const metadataCustodyFieldsFound = METADATA_CUSTODY_FIELDS.filter((field) => schema.includes(field));
  const legacyPemFields = LEGACY_PEM_FIELD_NAMES.filter((field) => schema.includes(field));
  const custodyProviderFound = exists(repoRoot, SOURCE_SURFACES.custodyProvider);
  const custodyProviderDisabled = /DisabledComplianceCsidSecretCustodyProvider|providerEnabled:\s*false|bodyStorageAllowed:\s*false|DISABLED/i.test(custodyProvider);
  const realProviderImplementationReady = /realProviderImplementationReady:\s*true|providerEnabled:\s*true/i.test(custodyProvider) && !custodyProviderDisabled;
  const metadataCustodyModelFound =
    /model\s+ZatcaComplianceCsidCustodyRecord\b/i.test(schema) &&
    metadataCustodyFieldsFound.includes("requestId") &&
    metadataCustodyFieldsFound.includes("certificateRequestId") &&
    /NOT_STORED/i.test(schema);
  return {
    allRequiredFound: missing.length === 0,
    missing,
    custodyProviderFound,
    custodyProviderDisabled,
    realProviderImplementationReady,
    bodyStorageAllowed: false,
    metadataCustodyModelFound,
    metadataCustodyFieldsFound,
    metadataOnlySelectFound: /safeComplianceCsidCustodyRecordSelect/i.test(service),
    metadataSafetyAssertionFound: /assertSafeComplianceCsidCustodyMetadata/i.test(service),
    custodyPlanEndpointFound: /compliance-csid-custody-plan/i.test(controller),
    custodyProviderReadinessEndpointFound: /provider-readiness/i.test(controller),
    sandboxAdapterFound: exists(repoRoot, SOURCE_SURFACES.sandboxAdapter),
    sandboxAdapterExecutionBlocked: /not implemented|No ZATCA network call|network calls are disabled|createRealNetworkDisabledError/i.test(sandboxAdapter),
    mockAdapterOnly: /mock|local mock|No real ZATCA request/i.test(mockAdapter),
    sandboxDisabledAdapterFound: /network calls are disabled|Real ZATCA network calls are disabled|createRealNetworkDisabledError/i.test(sandboxDisabledAdapter),
    sharedCustodyReadinessFound: /COMPLIANCE_CSID_CUSTODY/i.test(sharedReadiness),
    legacyPemFieldsFound: legacyPemFields.length > 0,
    legacyPemFields,
    rawCsrFieldFound: /\bcsrPem\b/i.test(schema),
    legacyRuntimeCsidPersistencePathFound: /complianceCsidPem|responsePayloadBase64/i.test(service),
  };
}

function inspectEnvPresence(env) {
  const has = (key) => typeof env[key] === "string" && env[key].trim().length > 0;
  return {
    csidCustodyProviderConfigured: has("ZATCA_CSID_CUSTODY_PROVIDER"),
    csidCustodyKmsKeyIdConfigured: has("ZATCA_CSID_CUSTODY_KMS_KEY_ID"),
    csidCustodySecretPrefixConfigured: has("ZATCA_CSID_CUSTODY_SECRET_PREFIX"),
    csidCustodyRegionConfigured: has("ZATCA_CSID_CUSTODY_REGION"),
    csidCustodyEncryptedDbApprovalConfigured: has("ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED"),
    csidCustodyAllowBodyStorageConfigured: has("ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE"),
    simulatedResponseBodyConfigured: has("ZATCA_SIMULATED_CSID_RESPONSE_BODY"),
    sandboxOtpConfigured: has("ZATCA_SANDBOX_COMPLIANCE_CSID_OTP") || has("ZATCA_COMPLIANCE_CSID_OTP") || has("ZATCA_OTP"),
    sandboxBaseUrlConfigured: has("ZATCA_SANDBOX_BASE_URL"),
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

function renderText(result) {
  return [
    `ZATCA CSID response custody guard: ${result.status}`,
    `Network calls made: ${result.networkCallsMade ? "true" : "false"}`,
    `DB connection attempted: ${result.dbConnectionAttempted ? "true" : "false"}`,
    `DB write attempted: ${result.dbWriteAttempted ? "true" : "false"}`,
    `Real response body processed: ${result.realResponseBodyProcessed ? "true" : "false"}`,
    `Custody provider found: ${result.custodyProviderFound ? "true" : "false"}`,
    `Metadata custody model found: ${result.metadataCustodyModelFound ? "true" : "false"}`,
    `Legacy PEM fields found: ${result.legacyPemFieldsFound ? "true" : "false"}`,
    `Next approval gate: ${result.nextApprovalGate}`,
  ].join("\n");
}

function shouldExitNonZero(status) {
  return status.includes("BLOCKED") || status === "BLOCKED_INVALID_APPROVAL_PHRASE";
}

function safeNoNetworkRequiredPayload() {
  return {
    status: "BLOCKED_NO_NETWORK_REQUIRED",
    environment: ENVIRONMENT,
    noNetworkOnly: true,
    networkCallsMade: false,
    dbConnectionAttempted: false,
    dbWriteAttempted: false,
    otpRequested: false,
    complianceCsidRequested: false,
    productionCsidRequested: false,
    realResponseBodyProcessed: false,
    simulatedResponseBodyProcessed: false,
    secretBodyPersisted: false,
    certificateBodyPersisted: false,
    tokenBodyPersisted: false,
    requestResponseBodyPrinted: false,
    envValuesPrinted: false,
    metadataOnlyEvidence: true,
    blockers: ["BLOCKED_NO_NETWORK_REQUIRED: --no-network is required for CSID response custody guard."],
  };
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

  const result = buildCsidResponseCustodyGuard({ cwd: process.cwd(), args, env: process.env });
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
  buildCsidResponseCustodyGuard,
  parseArgs,
};
