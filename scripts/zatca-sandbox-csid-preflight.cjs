#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const SDK_ROOT = "reference/zatca-einvoicing-sdk-Java-238-R3.4.8";
const PREFLIGHT_ENVIRONMENT = "LOCAL_SANDBOX_CSID_PREFLIGHT_NO_NETWORK";
const EXECUTION_GUARD_ENVIRONMENT = "LOCAL_SANDBOX_CSID_EXECUTION_GUARD_NO_NETWORK";
const SANDBOX_REQUEST_GATE_ENV = "ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED";
const SANDBOX_OTP_CSID_APPROVAL_PHRASE =
  "I approve ZATCA sandbox OTP and compliance CSID request planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no secret/body exposure, and metadata-only evidence.";
const SANDBOX_CSID_REQUEST_EXECUTION_GUARD_APPROVAL_PHRASE =
  "I approve ZATCA sandbox compliance CSID request execution guard only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no secret/body exposure, no adapter execution, and metadata-only evidence.";

const REQUIRED_BASELINE_FILES = [
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
  "docs/zatca/evidence/local-dummy-signing-execution-20260606.json",
  "docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md",
  "docs/zatca/PHASE_2_COMPLIANCE_MAP.md",
  "docs/zatca/ZATCA_CODE_GAP_REPORT.md",
  "docs/zatca/README.md",
  "package.json",
  "CODEX_HANDOFF.md",
];

const REQUIRED_OFFICIAL_REFERENCE_FILES = [
  `${SDK_ROOT}/Readme/readme.md`,
  `${SDK_ROOT}/Configuration/usage.txt`,
  `${SDK_ROOT}/Configuration/config.json`,
  "reference/zatca-docs/compliance_csid.pdf",
  "reference/zatca-docs/onboarding.pdf",
  "reference/zatca-docs/renewal.pdf",
  "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf",
  "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf",
  "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx",
];

const OPTIONAL_OFFICIAL_REFERENCE_FILES = [
  "reference/zatca-docs/clearance.pdf",
  "reference/zatca-docs/reporting.pdf",
];

const CSR_REFERENCE_FILES = [
  `${SDK_ROOT}/Data/Input/csr-config-template.properties`,
  `${SDK_ROOT}/Data/Input/csr-config-example-EN.properties`,
  `${SDK_ROOT}/Data/Input/csr-config-example-EN-VAT-group.properties`,
  `${SDK_ROOT}/Data/Input/csr-config-example-AR.properties`,
  `${SDK_ROOT}/Data/Input/csr-config-example-AR-VAT-Group.properties`,
];

const SOURCE_SURFACE_FILES = {
  prismaSchema: "apps/api/prisma/schema.prisma",
  zatcaService: "apps/api/src/zatca/zatca.service.ts",
  zatcaController: "apps/api/src/zatca/zatca.controller.ts",
  zatcaConfig: "apps/api/src/zatca/zatca.config.ts",
  sandboxAdapter: "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts",
  sandboxDisabledAdapter: "apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts",
  mockAdapter: "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts",
  custodyProvider: "apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts",
  csrDryRunScript: "apps/api/scripts/zatca-csr-dry-run.ts",
  csrLocalGenerateScript: "apps/api/scripts/zatca-csr-local-generate.ts",
  complianceCsidPlanScript: "apps/api/scripts/zatca-compliance-csid-plan.ts",
  sharedReadiness: "packages/shared/src/zatca-readiness.ts",
  webZatcaLib: "apps/web/src/lib/zatca.ts",
  webSettingsPage: "apps/web/src/app/(app)/settings/zatca/page.tsx",
};

const REQUIRED_PACKAGE_SCRIPTS = [
  "zatca:sandbox-csid-preflight",
  "test:zatca-sandbox-csid-preflight",
  "zatca:compliance-csid-plan",
  "zatca:compliance-csid-custody-plan",
];

const REQUIRED_CSR_KEYS = [
  "csr.common.name",
  "csr.serial.number",
  "csr.organization.identifier",
  "csr.organization.unit.name",
  "csr.organization.name",
  "csr.country.name",
  "csr.invoice.type",
  "csr.location.address",
  "csr.industry.business.category",
];

const SELLER_PROFILE_FIELDS = [
  "sellerName",
  "vatNumber",
  "companyIdType",
  "companyIdNumber",
  "buildingNumber",
  "streetName",
  "district",
  "city",
  "postalCode",
  "countryCode",
  "businessCategory",
];

const EGS_FIELDS = [
  "deviceSerialNumber",
  "solutionName",
  "csrCommonName",
  "csrSerialNumber",
  "csrOrganizationUnitName",
  "csrInvoiceType",
  "csrLocationAddress",
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    plan: false,
    strict: false,
    noNetwork: false,
    help: false,
    approvalPhrase: null,
    approvalPlan: false,
    executionGuard: false,
    executeCsidRequest: false,
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
    } else if (arg === "--approval-phrase") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--approval-phrase requires a value.");
      }
      parsed.approvalPhrase = value;
      index += 1;
    } else if (arg === "--approval-plan") {
      parsed.approvalPlan = true;
    } else if (arg === "--execution-guard") {
      parsed.executionGuard = true;
    } else if (arg === "--execute-csid-request") {
      parsed.executeCsidRequest = true;
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
    "  node scripts/zatca-sandbox-csid-preflight.cjs --plan --no-network --json",
    "  node scripts/zatca-sandbox-csid-preflight.cjs --plan --no-network --json --strict",
    "  node scripts/zatca-sandbox-csid-preflight.cjs --plan --no-network --json --approval-phrase <text> --approval-plan",
    "  node scripts/zatca-sandbox-csid-preflight.cjs --plan --no-network --json --approval-phrase <text> --execution-guard",
    "  node scripts/zatca-sandbox-csid-preflight.cjs --plan --no-network --json --approval-phrase <text> --execute-csid-request",
    "",
    "This guard inspects metadata-only readiness for a future sandbox compliance CSID request.",
    "Approval recognition is planning-only or execution-guard-only and never authorizes a CSID request in this guard.",
    "It does not request OTPs, request CSIDs, call ZATCA, execute the sandbox adapter, sign, generate QR, validate signed XML, clear/report, create PDF/A-3, migrate, seed, reset, delete, mutate env, deploy, or send email.",
  ].join("\n");
}

function buildSandboxCsidPreflight(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const env = options.env || process.env;
  const args = options.args || {};

  const baseline = inspectRequiredFiles(repoRoot, REQUIRED_BASELINE_FILES);
  const references = inspectReferences(repoRoot);
  const csrReferences = inspectCsrReferences(repoRoot);
  const codeSurfaces = inspectCodeSurfaces(repoRoot);
  const packageScripts = inspectPackageScripts(repoRoot);
  const envPresence = inspectEnvPresence(env);
  const approval = inspectApproval(args);
  const executionMode = Boolean(args.executionGuard || args.executeCsidRequest);
  const executionApproval = inspectExecutionGuardApproval(args, executionMode);
  const blockers = [];
  const warnings = [];

  if (baseline.missing.length > 0) {
    blockers.push(`BLOCKED_MISSING_REPOSITORY_DOCS: ${baseline.missing.join(", ")}`);
  }
  if (references.missingRequired.length > 0) {
    blockers.push(`BLOCKED_MISSING_REFERENCE_DOCS: ${references.missingRequired.join(", ")}`);
  }
  if (csrReferences.missing.length > 0 || csrReferences.missingRequiredKeys.length > 0) {
    blockers.push(`BLOCKED_MISSING_CSR_REFERENCES: ${[...csrReferences.missing, ...csrReferences.missingRequiredKeys].join(", ")}`);
  }
  if (!packageScripts.allRequiredFound) {
    blockers.push(`BLOCKED_MISSING_PACKAGE_SCRIPT: ${packageScripts.missing.join(", ")}`);
  }
  if (!codeSurfaces.allRequiredFound) {
    blockers.push(`BLOCKED_MISSING_CODE_SURFACES: ${codeSurfaces.missing.join(", ")}`);
  }
  if (codeSurfaces.legacyRawPemFieldsPresent) {
    blockers.push("BLOCKED_KEY_CUSTODY_NOT_IMPLEMENTED: legacy raw PEM-capable fields exist and production KMS/HSM/external signing custody is not implemented.");
  } else {
    blockers.push("BLOCKED_KEY_CUSTODY_NOT_IMPLEMENTED: production KMS/HSM/external signing custody is not implemented.");
  }
  if (!codeSurfaces.custodyProviderFound || codeSurfaces.custodyProviderDisabled || !codeSurfaces.csidResponseCustodyApproved) {
    blockers.push("BLOCKED_CSID_RESPONSE_CUSTODY_NOT_APPROVED: token, secret, and certificate response custody remains disabled or unapproved.");
  }
  if (!codeSurfaces.sandboxAdapterFound || codeSurfaces.sandboxAdapterExecutionBlocked || !envPresence.effectiveRealNetworkEnabled) {
    blockers.push("BLOCKED_SANDBOX_ADAPTER_DISABLED: real sandbox adapter execution remains disabled and no ZATCA network call is allowed.");
  }
  if (executionMode) {
    if (executionApproval.status === "INVALID") {
      blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE: the supplied approval phrase did not match the exact future execution-guard phrase and was not echoed.");
    }
    if (executionApproval.status === "ABSENT") {
      blockers.push("EXECUTION_GUARD_BLOCKED_APPROVAL_REQUIRED: the exact sandbox compliance CSID request execution guard approval phrase is required.");
    }
    if (executionApproval.recognizedForGuard) {
      blockers.push("BLOCKED_OTP_NOT_APPROVED: OTP capture, request, storage, logging, and echo remain prohibited by this execution guard.");
      blockers.push("BLOCKED_CSID_REQUEST_NOT_APPROVED: compliance CSID request execution remains prohibited until a later explicit execution approval.");
    }
    if (args.executeCsidRequest) {
      blockers.push("BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED: --execute-csid-request is intentionally blocked in this no-network guard sprint.");
    }
  } else {
    if (approval.status === "INVALID") {
      blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE: the supplied approval phrase did not match the exact future planning phrase and was not echoed.");
    }
    if (approval.status === "MATCHED_PLAN_FLAG_REQUIRED") {
      blockers.push("BLOCKED_APPROVAL_PLAN_FLAG_REQUIRED: the exact approval phrase was recognized, but --approval-plan is required for planning-only recognition.");
    }
    if (approval.recognizedForPlanning) {
      blockers.push("BLOCKED_OTP_REQUEST_NOT_ALLOWED_BY_THIS_GUARD: approval was recognized for planning only; OTP request, capture, storage, logging, and echo remain prohibited.");
      blockers.push("BLOCKED_CSID_REQUEST_NOT_ALLOWED_BY_THIS_GUARD: approval was recognized for planning only; compliance CSID request execution requires a separate execution guard sprint.");
    } else {
      blockers.push("BLOCKED_OTP_NOT_APPROVED: OTP capture is not approved, accepted, stored, printed, or requested by this guard.");
      blockers.push("BLOCKED_CSID_REQUEST_NOT_APPROVED: future compliance CSID request execution requires a separate explicit approval gate.");
    }
  }
  blockers.push("BLOCKED_PRODUCTION_SIGNING_DISABLED: production signing and production compliance remain disabled.");

  if (envPresence.otpConfigured) {
    warnings.push("OTP-like environment variable presence was detected by boolean only; value was not read, printed, stored, or used.");
  }
  if (envPresence.productionCredentialsConfigured) {
    warnings.push("Production credential-like environment variable presence was detected by boolean only; values were not read, printed, stored, or used.");
  }
  if (envPresence.sandboxComplianceCsidRequestGateEnabled) {
    warnings.push(`${SANDBOX_REQUEST_GATE_ENV} presence indicates a future gate request, but this preflight still does not execute CSID onboarding.`);
  }
  if (references.optionalMissing.length > 0) {
    warnings.push(`Optional official reference files are not present: ${references.optionalMissing.join(", ")}`);
  }

  const uniqueBlockers = [...new Set(blockers.filter(Boolean))];
  const uniqueWarnings = [...new Set(warnings.filter(Boolean))];
  const status = selectStatus(uniqueBlockers, approval, executionApproval, args);

  return {
    status,
    environment: executionMode ? EXECUTION_GUARD_ENVIRONMENT : PREFLIGHT_ENVIRONMENT,
    noNetworkOnly: true,
    localOnly: true,
    planOnly: true,
    networkCallsMade: false,
    commandExecutionAttempted: false,
    dbConnectionAttempted: false,
    executionGuardRecognized: executionApproval.recognizedForGuard,
    approvalPhraseMatched: executionMode ? executionApproval.matched : approval.matched,
    otpRequested: false,
    otpAccepted: false,
    otpStored: false,
    otpApprovalRecognized: approval.recognizedForPlanning,
    complianceCsidRequested: false,
    complianceCsidApprovalRecognized: approval.recognizedForPlanning,
    productionCsidRequested: false,
    csidRequestBodyCreated: false,
    csidResponseBodyProcessed: false,
    csidResponsePersisted: false,
    sandboxCsidRequestEnabled: false,
    sandboxAdapterExecuted: false,
    productionSigningEnabled: false,
    productionComplianceEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    signedXmlGenerated: false,
    signedXmlPersisted: false,
    qrPayloadGenerated: false,
    qrPayloadPersisted: false,
    privateKeyBodyExposed: false,
    certificateBodyExposed: false,
    csidBodyExposed: false,
    tokenBodyExposed: false,
    mockAdapterOnly: codeSurfaces.mockAdapterOnly,
    authHeaderPrinted: false,
    requestResponseBodyPrinted: false,
    evidencePolicy: "metadata-only",
    references: {
      baselineDocsFound: baseline.missing.length === 0,
      csrTemplateFound: csrReferences.csrTemplateFound,
      csrExamplesFound: csrReferences.examplesFound,
      complianceCsidDocFound: references.complianceCsidDocFound,
      onboardingDocFound: references.onboardingDocFound,
      renewalDocFound: references.renewalDocFound,
      securityFeaturesDocFound: references.securityFeaturesDocFound,
      xmlImplementationDocFound: references.xmlImplementationDocFound,
      dataDictionaryFound: references.dataDictionaryFound,
      clearanceDocFound: references.clearanceDocFound,
      reportingDocFound: references.reportingDocFound,
      inspectedRelativePaths: references.inspectedRelativePaths,
      csrReferencePaths: csrReferences.inspectedRelativePaths,
      missingRequired: references.missingRequired,
      missingCsrReferences: csrReferences.missing,
      missingCsrKeys: csrReferences.missingRequiredKeys,
    },
    requiredMetadata: {
      csrFieldKeys: REQUIRED_CSR_KEYS,
      sellerProfileFields: SELLER_PROFILE_FIELDS,
      egsFields: EGS_FIELDS,
      csrKeysFound: csrReferences.requiredKeysFound,
      csrBodiesPrinted: false,
    },
    codeSurfaces,
    packageScripts,
    envPresence,
    custody: {
      providerFound: codeSurfaces.custodyProviderFound,
      providerDisabled: codeSurfaces.custodyProviderDisabled,
      providerImplementationReady: false,
      providerConfigurationApproved: false,
      csidResponseCustodyApproved: codeSurfaces.csidResponseCustodyApproved,
      tokenStorageReady: false,
      secretStorageReady: false,
      certificateStorageReady: false,
      bodyStorageAllowed: false,
      responseBodyProcessed: false,
      responsePersisted: false,
    },
    approvalGates: {
      csrDryRunApprovalRequired: true,
      sandboxOtpApprovalRequired: true,
      complianceCsidRequestApprovalRequired: true,
      csidResponseCustodyApprovalRequired: true,
      sandboxAdapterExecutionApprovalRequired: true,
      productionSigningApprovalRequired: true,
    },
    approval: {
      approvalPhraseRequired: true,
      approvalPhraseProvided: executionMode ? executionApproval.provided : approval.provided,
      approvalPhraseMatched: executionMode ? executionApproval.matched : approval.matched,
      approvalPhraseEchoed: false,
      approvalPlanFlagProvided: approval.approvalPlan,
      approvalPlanRecognized: approval.recognizedForPlanning,
      executionGuardFlagProvided: Boolean(args.executionGuard),
      executeCsidRequestFlagProvided: Boolean(args.executeCsidRequest),
      executionGuardApprovalPhraseMatched: executionApproval.matched,
      executionGuardRecognized: executionApproval.recognizedForGuard,
      executionAuthorizedNow: false,
      otpApprovalRecognized: approval.recognizedForPlanning,
      complianceCsidApprovalRecognized: approval.recognizedForPlanning,
      sandboxAdapterExecutionAuthorized: false,
      sandboxAdapterExecuted: false,
      approvalScope: executionMode ? "execution-guard-only" : "planning-only",
      executionGuardScope: executionMode ? "guard-only-request-blocked" : "not-requested",
      nextExecutionGuardRequired: !executionApproval.recognizedForGuard,
    },
    blockers: uniqueBlockers,
    warnings: uniqueWarnings,
    redaction: {
      envValuesPrinted: false,
      otpBodyPrinted: false,
      csrBodyPrinted: false,
      privateKeyBodyPrinted: false,
      certificateBodyPrinted: false,
      tokenBodyPrinted: false,
      secretBodyPrinted: false,
      authHeaderPrinted: false,
      requestBodyPrinted: false,
      responseBodyPrinted: false,
      requestBodyCreated: false,
      responseBodyProcessed: false,
      responseBodyPersisted: false,
      otpValuePrinted: false,
      approvalPhrasePrinted: false,
    },
    safePlanningPrerequisitesPresent:
      baseline.missing.length === 0 &&
      references.missingRequired.length === 0 &&
      csrReferences.missing.length === 0 &&
      csrReferences.missingRequiredKeys.length === 0 &&
      codeSurfaces.allRequiredFound &&
      packageScripts.allRequiredFound,
    nextApprovalGate: approval.recognizedForPlanning
      ? "sandbox CSID request execution guard"
      : executionApproval.recognizedForGuard
      ? "CSID response custody implementation plan"
      : "sandbox OTP and compliance CSID dry-run approval",
    recommendedNextPrompt: approval.recognizedForPlanning
      ? "ZATCA sandbox CSID request execution guard"
      : executionApproval.recognizedForGuard
      ? "ZATCA CSID response custody implementation plan"
      : "ZATCA sandbox OTP and compliance CSID approval plan",
    ...(args.plan ? { plan: buildPlanSummary(status, approval, executionApproval, args) } : {}),
  };
}

function inspectApproval(args) {
  const approvalPhrase = typeof args.approvalPhrase === "string" ? args.approvalPhrase : "";
  const provided = approvalPhrase.length > 0;
  const matched = provided && approvalPhrase === SANDBOX_OTP_CSID_APPROVAL_PHRASE;
  const approvalPlan = Boolean(args.approvalPlan);
  const recognizedForPlanning = matched && approvalPlan;
  let status = "ABSENT";
  if (provided && !matched) {
    status = "INVALID";
  } else if (matched && !approvalPlan) {
    status = "MATCHED_PLAN_FLAG_REQUIRED";
  } else if (recognizedForPlanning) {
    status = "MATCHED_PLANNING_ONLY";
  }

  return {
    provided,
    matched,
    approvalPlan,
    recognizedForPlanning,
    status,
  };
}

function inspectExecutionGuardApproval(args, executionMode) {
  const approvalPhrase = typeof args.approvalPhrase === "string" ? args.approvalPhrase : "";
  const provided = approvalPhrase.length > 0;
  const matched = provided && approvalPhrase === SANDBOX_CSID_REQUEST_EXECUTION_GUARD_APPROVAL_PHRASE;
  const recognizedForGuard = executionMode && matched;
  let status = "NOT_REQUESTED";
  if (executionMode && !provided) {
    status = "ABSENT";
  } else if (executionMode && provided && !matched) {
    status = "INVALID";
  } else if (recognizedForGuard) {
    status = "MATCHED_EXECUTION_GUARD_ONLY";
  }

  return {
    provided,
    matched,
    recognizedForGuard,
    status,
  };
}

function selectStatus(blockers, approval, executionApproval, args = {}) {
  const executionMode = Boolean(args.executionGuard || args.executeCsidRequest);
  if (executionMode) {
    if (executionApproval.status === "INVALID") {
      return "BLOCKED_INVALID_APPROVAL_PHRASE";
    }
    if (executionApproval.status === "ABSENT") {
      return "EXECUTION_GUARD_BLOCKED_APPROVAL_REQUIRED";
    }
    if (args.executeCsidRequest) {
      return "BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED";
    }
    if (executionApproval.status === "MATCHED_EXECUTION_GUARD_ONLY") {
      return "EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED";
    }
  }
  if (approval.status === "INVALID") {
    return "BLOCKED_INVALID_APPROVAL_PHRASE";
  }
  if (approval.status === "MATCHED_PLAN_FLAG_REQUIRED") {
    return "APPROVAL_PHRASE_RECOGNIZED_PLAN_FLAG_REQUIRED";
  }
  if (approval.status === "MATCHED_PLANNING_ONLY") {
    return "APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_REFERENCE_DOCS"))) {
    return "BLOCKED_MISSING_REFERENCE_DOCS";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_CSR_REFERENCES"))) {
    return "BLOCKED_MISSING_CSR_REFERENCES";
  }
  return blockers.length > 0 ? "PREFLIGHT_BLOCKED" : "PREFLIGHT_READY_FOR_APPROVAL_PLANNING";
}

function buildPlanSummary(status, approval, executionApproval = { recognizedForGuard: false, provided: false, matched: false }, args = {}) {
  const executionMode = Boolean(args.executionGuard || args.executeCsidRequest);
  return {
    currentPosture: status,
    executionApprovedNow: false,
    approvalPhraseProvided: approval.provided,
    approvalPhraseMatched: approval.matched,
    approvalPlanRecognized: approval.recognizedForPlanning,
    executionGuardRequested: executionMode,
    executionGuardApprovalPhraseProvided: executionApproval.provided,
    executionGuardApprovalPhraseMatched: executionApproval.matched,
    executionGuardRecognized: executionApproval.recognizedForGuard,
    allowedNow: [
      "Inspect local repo metadata.",
      "Inspect official reference file presence.",
      "Inspect CSR property keys.",
      "Inspect environment variable presence as booleans only.",
      "Report blockers and approval gates.",
      "Recognize the exact future approval phrase for planning metadata only when --approval-plan is also present.",
      "Recognize the exact sandbox compliance CSID request execution guard phrase when --execution-guard is present.",
    ],
    refusedNow: [
      "OTP request or capture.",
      "Compliance CSID or production CSID request.",
      "Compliance CSID request body creation.",
      "Compliance CSID response body processing or persistence.",
      "Real ZATCA network call.",
      "Sandbox adapter execution.",
      "Private key, certificate, token, secret, request, response, XML, signed XML, or QR body output.",
      "Signing, clearance/reporting, PDF/A-3, migrations, seed/reset/delete, deploy, or email.",
    ],
    nextPromptTitle: executionApproval.recognizedForGuard
      ? "ZATCA CSID response custody implementation plan"
      : approval.recognizedForPlanning
      ? "ZATCA sandbox CSID request execution guard"
      : "ZATCA sandbox OTP and compliance CSID approval plan",
  };
}

function inspectRequiredFiles(repoRoot, relativePaths) {
  const missing = relativePaths.filter((relativePath) => !exists(repoRoot, relativePath));
  return {
    allFound: missing.length === 0,
    missing,
    inspectedRelativePaths: relativePaths.map((relativePath) => ({ path: relativePath, found: exists(repoRoot, relativePath) })),
  };
}

function inspectReferences(repoRoot) {
  const required = inspectRequiredFiles(repoRoot, REQUIRED_OFFICIAL_REFERENCE_FILES);
  const optional = inspectRequiredFiles(repoRoot, OPTIONAL_OFFICIAL_REFERENCE_FILES);
  const found = (relativePath) => exists(repoRoot, relativePath);
  return {
    allRequiredFound: required.allFound,
    complianceCsidDocFound: found("reference/zatca-docs/compliance_csid.pdf"),
    onboardingDocFound: found("reference/zatca-docs/onboarding.pdf"),
    renewalDocFound: found("reference/zatca-docs/renewal.pdf"),
    securityFeaturesDocFound: found("reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf"),
    xmlImplementationDocFound: found("reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf"),
    dataDictionaryFound: found("reference/zatca-docs/EInvoice_Data_Dictionary.xlsx"),
    clearanceDocFound: found("reference/zatca-docs/clearance.pdf"),
    reportingDocFound: found("reference/zatca-docs/reporting.pdf"),
    missingRequired: required.missing,
    optionalMissing: optional.missing,
    inspectedRelativePaths: [
      ...required.inspectedRelativePaths,
      ...optional.inspectedRelativePaths,
    ],
  };
}

function inspectCsrReferences(repoRoot) {
  const files = inspectRequiredFiles(repoRoot, CSR_REFERENCE_FILES);
  const keys = new Set();
  for (const relativePath of CSR_REFERENCE_FILES) {
    for (const key of readCsrKeys(repoRoot, relativePath)) {
      keys.add(key);
    }
  }
  const missingRequiredKeys = REQUIRED_CSR_KEYS.filter((key) => !keys.has(key));
  return {
    allFound: files.allFound,
    csrTemplateFound: exists(repoRoot, `${SDK_ROOT}/Data/Input/csr-config-template.properties`),
    examplesFound:
      exists(repoRoot, `${SDK_ROOT}/Data/Input/csr-config-example-EN.properties`) &&
      exists(repoRoot, `${SDK_ROOT}/Data/Input/csr-config-example-EN-VAT-group.properties`),
    requiredKeysFound: REQUIRED_CSR_KEYS.filter((key) => keys.has(key)),
    missingRequiredKeys,
    missing: files.missing,
    inspectedRelativePaths: files.inspectedRelativePaths,
  };
}

function readCsrKeys(repoRoot, relativePath) {
  const fullPath = path.join(repoRoot, ...relativePath.split("/"));
  if (!fs.existsSync(fullPath)) return [];
  const text = fs.readFileSync(fullPath, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.split("=", 1)[0].trim())
    .filter(Boolean);
}

function inspectCodeSurfaces(repoRoot) {
  const entries = Object.entries(SOURCE_SURFACE_FILES);
  const missing = entries.filter(([, relativePath]) => !exists(repoRoot, relativePath)).map(([name]) => name);
  const schema = readTextIfExists(repoRoot, SOURCE_SURFACE_FILES.prismaSchema);
  const service = readTextIfExists(repoRoot, SOURCE_SURFACE_FILES.zatcaService);
  const config = readTextIfExists(repoRoot, SOURCE_SURFACE_FILES.zatcaConfig);
  const sandboxAdapter = readTextIfExists(repoRoot, SOURCE_SURFACE_FILES.sandboxAdapter);
  const mockAdapter = readTextIfExists(repoRoot, SOURCE_SURFACE_FILES.mockAdapter);
  const custodyProvider = readTextIfExists(repoRoot, SOURCE_SURFACE_FILES.custodyProvider);

  const sandboxAdapterFound = exists(repoRoot, SOURCE_SURFACE_FILES.sandboxAdapter);
  const mockAdapterFound = exists(repoRoot, SOURCE_SURFACE_FILES.mockAdapter);
  const custodyProviderFound = exists(repoRoot, SOURCE_SURFACE_FILES.custodyProvider);
  const sandboxAdapterExecutionBlocked = /not implemented|No ZATCA network call|network calls are disabled|createRealNetworkDisabledError/i.test(sandboxAdapter);
  const mockAdapterOnly = /mock|local mock|No real ZATCA request/i.test(mockAdapter);
  const custodyProviderDisabled = /providerEnabled:\s*false|bodyStorageAllowed:\s*false|DISABLED/i.test(custodyProvider);
  const csidResponseCustodyApproved = /providerEnabled:\s*true|realProviderImplementationReady:\s*true/i.test(custodyProvider) && !custodyProviderDisabled;

  return {
    allRequiredFound: missing.length === 0,
    missing,
    inspectedRelativePaths: entries.map(([name, relativePath]) => ({ name, path: relativePath, found: exists(repoRoot, relativePath) })),
    prismaSchemaFound: exists(repoRoot, SOURCE_SURFACE_FILES.prismaSchema),
    zatcaServiceFound: exists(repoRoot, SOURCE_SURFACE_FILES.zatcaService),
    zatcaControllerFound: exists(repoRoot, SOURCE_SURFACE_FILES.zatcaController),
    zatcaConfigFound: exists(repoRoot, SOURCE_SURFACE_FILES.zatcaConfig),
    sandboxAdapterFound,
    sandboxDisabledAdapterFound: exists(repoRoot, SOURCE_SURFACE_FILES.sandboxDisabledAdapter),
    sandboxAdapterExecutionBlocked,
    mockAdapterFound,
    mockAdapterOnly,
    custodyProviderFound,
    custodyProviderDisabled,
    csidResponseCustodyApproved,
    custodyRecordModelFound: /ZatcaComplianceCsidCustodyRecord/i.test(schema),
    legacyRawPemFieldsPresent: /privateKeyPem|complianceCsidPem|productionCsidPem/i.test(schema),
    readinessBlockersFound: /COMPLIANCE_CSID|productionCompliance:\s*false|productionComplianceEnabled:\s*false/i.test(service),
    sandboxRequestGateKnown: service.includes(SANDBOX_REQUEST_GATE_ENV) || config.includes("ZATCA_ENABLE_REAL_NETWORK"),
    sourceBodiesPrinted: false,
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  const scripts = {};
  if (!fs.existsSync(packagePath)) {
    return { packageJsonFound: false, allRequiredFound: false, scripts, missing: REQUIRED_PACKAGE_SCRIPTS };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    for (const name of REQUIRED_PACKAGE_SCRIPTS) {
      scripts[name] = Boolean(pkg.scripts?.[name]);
    }
    return {
      packageJsonFound: true,
      allRequiredFound: REQUIRED_PACKAGE_SCRIPTS.every((name) => scripts[name]),
      scripts,
      missing: REQUIRED_PACKAGE_SCRIPTS.filter((name) => !scripts[name]),
    };
  } catch {
    return { packageJsonFound: true, allRequiredFound: false, scripts, missing: REQUIRED_PACKAGE_SCRIPTS };
  }
}

function inspectEnvPresence(env) {
  const has = (name) => Boolean(String(env[name] || "").trim());
  const sandboxGateEnabled = isTruthy(env[SANDBOX_REQUEST_GATE_ENV]);
  const adapterModeSandbox = String(env.ZATCA_ADAPTER_MODE || "").trim().toLowerCase() === "sandbox";
  const realNetworkEnabled = isTruthy(env.ZATCA_ENABLE_REAL_NETWORK);
  const sandboxBaseUrlConfigured = has("ZATCA_SANDBOX_BASE_URL");
  const otpConfigured = [
    "ZATCA_OTP",
    "ZATCA_SANDBOX_OTP",
    "ZATCA_COMPLIANCE_CSID_OTP",
    "ZATCA_SANDBOX_COMPLIANCE_CSID_OTP",
  ].some(has);
  const productionCredentialsConfigured = [
    "ZATCA_PRODUCTION_BASE_URL",
    "ZATCA_PRODUCTION_CSID",
    "ZATCA_PRODUCTION_CERTIFICATE",
    "ZATCA_PRODUCTION_PRIVATE_KEY",
    "ZATCA_PRODUCTION_BINARY_SECURITY_TOKEN",
    "ZATCA_PRODUCTION_SECRET",
  ].some(has);
  const csidCustodyProviderConfigured = has("ZATCA_CSID_CUSTODY_PROVIDER");
  const csidCustodyKmsKeyIdConfigured = has("ZATCA_CSID_CUSTODY_KMS_KEY_ID");
  const csidCustodySecretPrefixConfigured = has("ZATCA_CSID_CUSTODY_SECRET_PREFIX");
  const csidCustodyRegionConfigured = has("ZATCA_CSID_CUSTODY_REGION");
  const csidCustodyEncryptedDbApprovalConfigured = has("ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED");
  const csidCustodyAllowBodyStorageConfigured = has("ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE");

  return {
    sandboxBaseUrlConfigured,
    otpConfigured,
    productionCredentialsConfigured,
    sandboxComplianceCsidRequestGateConfigured: has(SANDBOX_REQUEST_GATE_ENV),
    sandboxComplianceCsidRequestGateEnabled: sandboxGateEnabled,
    sandboxCsidExecutionExplicitlyDisabled: !sandboxGateEnabled,
    adapterModeSandboxConfigured: adapterModeSandbox,
    realNetworkEnabledConfigured: realNetworkEnabled,
    effectiveRealNetworkEnabled: adapterModeSandbox && realNetworkEnabled && sandboxBaseUrlConfigured,
    csidCustodyProviderConfigured,
    csidCustodyKmsKeyIdConfigured,
    csidCustodySecretPrefixConfigured,
    csidCustodyRegionConfigured,
    csidCustodyEncryptedDbApprovalConfigured,
    csidCustodyAllowBodyStorageConfigured,
    csidCustodyAnyProviderConfigPresent:
      csidCustodyProviderConfigured ||
      csidCustodyKmsKeyIdConfigured ||
      csidCustodySecretPrefixConfigured ||
      csidCustodyRegionConfigured ||
      csidCustodyEncryptedDbApprovalConfigured ||
      csidCustodyAllowBodyStorageConfigured,
    valuesPrinted: false,
  };
}

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function resolveRepoRoot(startDirectory) {
  let current = path.resolve(startDirectory);
  for (;;) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml")) || fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.resolve(current, "..");
    if (parent === current) return path.resolve(startDirectory);
    current = parent;
  }
}

function exists(repoRoot, relativePath) {
  return fs.existsSync(path.join(repoRoot, ...relativePath.split("/")));
}

function readTextIfExists(repoRoot, relativePath) {
  const fullPath = path.join(repoRoot, ...relativePath.split("/"));
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf8");
}

function sanitizeError(error) {
  return String(error?.message || error)
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY]")
    .replace(/-----BEGIN [^-]*CERTIFICATE-----[\s\S]*?-----END [^-]*CERTIFICATE-----/gi, "[REDACTED_CERTIFICATE]")
    .replace(/\b(authorization|token|secret|password|apiKey|otp|binarySecurityToken)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function formatHuman(result) {
  return [
    `ZATCA sandbox CSID preflight: ${result.status}`,
    `No network calls made: ${result.networkCallsMade === false ? "true" : "false"}`,
    `OTP requested: ${result.otpRequested ? "true" : "false"}`,
    `Compliance CSID requested: ${result.complianceCsidRequested ? "true" : "false"}`,
    `Approval phrase matched: ${result.approval.approvalPhraseMatched ? "true" : "false"}`,
    `Approval plan recognized: ${result.approval.approvalPlanRecognized ? "true" : "false"}`,
    `Execution guard recognized: ${result.executionGuardRecognized ? "true" : "false"}`,
    `Sandbox adapter executed: ${result.sandboxAdapterExecuted ? "true" : "false"}`,
    `Sandbox adapter execution blocked: ${result.codeSurfaces.sandboxAdapterExecutionBlocked ? "true" : "false"}`,
    `Key custody blocker present: ${result.blockers.some((blocker) => blocker.startsWith("BLOCKED_KEY_CUSTODY_NOT_IMPLEMENTED")) ? "true" : "false"}`,
    ...result.blockers.map((blocker) => `- ${blocker}`),
  ].join("\n");
}

function runCli(argv = process.argv.slice(2), io = console) {
  let parsed;
  try {
    parsed = parseArgs(argv);
    if (parsed.help) {
      io.log(usage());
      return 0;
    }

    if (!parsed.noNetwork) {
      const payload = {
        status: "BLOCKED_NO_NETWORK_REQUIRED",
        environment: PREFLIGHT_ENVIRONMENT,
        noNetworkOnly: false,
        networkCallsMade: false,
        otpRequested: false,
        complianceCsidRequested: false,
        productionCsidRequested: false,
        productionSigningEnabled: false,
        productionComplianceEnabled: false,
        error: "--no-network is required for ZATCA sandbox CSID preflight.",
      };
      const text = parsed.json ? JSON.stringify(payload, null, 2) : payload.error;
      io.error(text);
      return 2;
    }

    const result = buildSandboxCsidPreflight({ args: parsed });
    const text = parsed.json ? JSON.stringify(result, null, 2) : formatHuman(result);
    io.log(text);
    return parsed.strict && result.status !== "PREFLIGHT_READY_FOR_APPROVAL_PLANNING" ? 1 : 0;
  } catch (error) {
    const payload = {
      status: "ERROR",
      environment: PREFLIGHT_ENVIRONMENT,
      noNetworkOnly: Boolean(parsed?.noNetwork),
      networkCallsMade: false,
      otpRequested: false,
      complianceCsidRequested: false,
      productionCsidRequested: false,
      productionSigningEnabled: false,
      productionComplianceEnabled: false,
      error: sanitizeError(error),
    };
    const text = parsed?.json ? JSON.stringify(payload, null, 2) : payload.error;
    io.error(text);
    return 2;
  }
}

if (require.main === module) {
  process.exitCode = runCli();
}

module.exports = {
  buildSandboxCsidPreflight,
  SANDBOX_OTP_CSID_APPROVAL_PHRASE,
  SANDBOX_CSID_REQUEST_EXECUTION_GUARD_APPROVAL_PHRASE,
  parseArgs,
  runCli,
};
