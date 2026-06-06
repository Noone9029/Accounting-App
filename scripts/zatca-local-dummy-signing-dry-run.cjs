#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REQUIRED_JAVA_RANGE = ">=11 <15";
const ENVIRONMENT = "LOCAL_DUMMY_SIGNING_DRY_RUN_GUARD";
const EXECUTION_ENVIRONMENT = "LOCAL_DUMMY_SIGNING_NO_NETWORK";
const APPROVAL_ENV_VAR = "ZATCA_LOCAL_DUMMY_SIGNING_APPROVAL";
const APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PHRASE =
  "I approve ZATCA local dummy signing execution against sanitized local fixtures only. No production, no beta, no customer data, no ZATCA network, no CSID, no OTP, no clearance, no reporting, no PDF-A3, and metadata-only evidence.";
const SDK_ROOT = "reference/zatca-einvoicing-sdk-Java-238-R3.4.8";
const STANDARD_FIXTURE_ID = "ledgerbyte-generated-standard-invoice";
const CREDIT_FIXTURE_ID = "ledgerbyte-generated-credit-note";
const STANDARD_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml";
const CREDIT_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml";
const DEFAULT_TIMEOUT_MS = 60000;

const FIXTURES = {
  [STANDARD_FIXTURE_ID]: {
    fixtureId: STANDARD_FIXTURE_ID,
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "standard-invoice",
    path: STANDARD_FIXTURE,
  },
  [CREDIT_FIXTURE_ID]: {
    fixtureId: CREDIT_FIXTURE_ID,
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "credit-note",
    path: CREDIT_FIXTURE,
  },
};

const OFFICIAL_REFERENCE_FILES = [
  `${SDK_ROOT}/Readme/readme.md`,
  `${SDK_ROOT}/Configuration/usage.txt`,
  `${SDK_ROOT}/Configuration/config.json`,
  `${SDK_ROOT}/Apps`,
  `${SDK_ROOT}/Data/Certificates`,
  `${SDK_ROOT}/Data/Input`,
  `${SDK_ROOT}/Data/Samples/Standard/Invoice/Standard_Invoice.xml`,
  `${SDK_ROOT}/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`,
  `${SDK_ROOT}/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`,
  `${SDK_ROOT}/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`,
  `${SDK_ROOT}/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`,
  `${SDK_ROOT}/Data/Rules/Schematrons/CEN-EN16931-UBL.xsl`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonExtensionComponents-2.1.xsd`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonSignatureComponents-2.1.xsd`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureAggregateComponents-2.1.xsd`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureBasicComponents-2.1.xsd`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd`,
  "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf",
  "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf",
  "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx",
  "reference/zatca-docs/compliance_csid.pdf",
  "reference/zatca-docs/onboarding.pdf",
  "reference/zatca-docs/renewal.pdf",
];

const REQUIRED_PACKAGE_SCRIPTS = [
  "zatca:sdk-ci-readiness",
  "zatca:sdk-validate-local",
  "zatca:local-signed-xml-plan",
  "test:zatca-local-signed-xml-plan",
  "zatca:local-dummy-signing-dry-run",
  "test:zatca-local-dummy-signing-dry-run",
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    plan: false,
    strict: false,
    noNetwork: false,
    help: false,
    fixture: null,
    fixtures: [],
    all: false,
    out: null,
    approvalPhrase: null,
    executeApprovedPlan: false,
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
    } else if (arg === "--fixture") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--fixture requires a fixture id.");
      }
      parsed.fixture = value;
      parsed.fixtures.push(value);
      index += 1;
    } else if (arg === "--all") {
      parsed.all = true;
    } else if (arg === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a metadata evidence JSON path.");
      }
      parsed.out = value;
      index += 1;
    } else if (arg === "--approval-phrase") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--approval-phrase requires the exact approved phrase.");
      }
      parsed.approvalPhrase = value;
      index += 1;
    } else if (arg === "--execute-approved-plan") {
      parsed.executeApprovedPlan = true;
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
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --plan --no-network --json",
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --plan --fixture ledgerbyte-generated-standard-invoice --no-network --json",
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --plan --no-network --json --strict",
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --plan --no-network --json --approval-phrase \"<exact future approval phrase>\"",
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --execute-approved-plan --fixture ledgerbyte-generated-standard-invoice --no-network --json --approval-phrase \"<exact future approval phrase>\" --out docs/zatca/evidence/local-dummy-signing-execution-YYYYMMDD.json",
    "",
    "By default this command prints metadata-only readiness and command-plan output.",
    "Only the exact approved local dummy-material execution path may invoke SDK sign, QR, and signed XML validation against temp sanitized fixtures; it still never requests OTP/CSID, calls ZATCA, clears/reports, creates PDF/A-3, deploys, migrates, seeds, resets, deletes, or sends email.",
  ].join("\n");
}

function buildDummySigningDryRunGuard(options = {}) {
  const args = options.args || {};
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const env = options.env || process.env;
  const runCommand = options.runCommand || defaultRunCommand;
  const java = detectJava(env, runCommand);
  const sdk = inspectSdk(repoRoot);
  const commandFindings = inspectCommandFindings(repoRoot);
  const dummyMaterial = inspectDummyMaterial(repoRoot);
  const fixtures = inspectFixtures(repoRoot, args.fixture);
  const requestedFixtureIds = resolveRequestedFixtureIds(args);
  const packageScripts = inspectPackageScripts(repoRoot);
  const officialReferences = inspectOfficialReferences(repoRoot);
  const approval = inspectApproval(env, args);
  const blockers = [];
  const warnings = [];

  if (!sdk.referenceFound || !sdk.jarFound || !sdk.configFound || !sdk.usageFound || !sdk.readmeFound) {
    blockers.push("BLOCKED_MISSING_SDK_REFERENCE: local official SDK readme, usage, app jar, and config files are required for the future dry-run.");
  }

  if (!dummyMaterial.certificatePathFound || !dummyMaterial.privateKeyPathFound) {
    blockers.push("BLOCKED_DUMMY_MATERIAL_PATH_MISSING: SDK dummy certificate/private-key paths must exist before a future temp-only experiment can be planned.");
  }

  if (!fixtures.generatedStandardInvoiceFound || !fixtures.generatedCreditNoteFound || fixtures.selectedFixtureKnown === false || fixtures.selectedFixtureFound === false) {
    blockers.push("BLOCKED_MISSING_GENERATED_FIXTURE: generated standard invoice and credit-note fixture paths must exist; targeted fixture ids must be known and present.");
  }

  if (!java.found || !java.supportedForSdk) {
    blockers.push("BLOCKED_UNSUPPORTED_JAVA: official SDK execution requires Java >=11 <15; Java 17 and missing Java remain blocked.");
  }

  if (approval.approvalPhraseValid && approval.executeApprovedPlanRequested && java.source !== "ZATCA_SDK_JAVA_BIN") {
    blockers.push("BLOCKED_UNSUPPORTED_JAVA: approved execution requires an explicit Java 11-14 binary through ZATCA_SDK_JAVA_BIN; default Java is not used for SDK execution.");
  }

  if (!packageScripts.allRequiredFound) {
    blockers.push("BLOCKED_MISSING_PACKAGE_SCRIPT: dummy signing guard package scripts must be present before repeatable local use.");
  }

  if (!commandFindings.signCommandDocumented || !commandFindings.qrCommandDocumented || !commandFindings.validateCommandDocumented) {
    blockers.push("BLOCKED_MISSING_DOCUMENTED_COMMAND: SDK sign, QR, and validate command shapes must be source-backed by local official SDK docs.");
  }

  if (!commandFindings.hashCommandDocumented) {
    warnings.push("SDK hash command shape was not detected in local usage/readme; keep invoice-hash reasoning blocked until reinspected.");
  }

  if (approval.executeApprovedPlanRequested && !args.noNetwork) {
    blockers.push("BLOCKED_NO_NETWORK_REQUIRED: --no-network is required before local dummy signing execution.");
  }

  if (approval.executeApprovedPlanRequested && requestedFixtureIds.length === 0) {
    blockers.push("BLOCKED_MISSING_GENERATED_FIXTURE: approved execution requires --fixture <id> or --all for the sanitized generated fixture scope.");
  }

  if (requestedFixtureIds.some((fixtureId) => !FIXTURES[fixtureId])) {
    blockers.push("BLOCKED_UNAPPROVED_FIXTURE: only ledgerbyte-generated-standard-invoice and ledgerbyte-generated-credit-note are approved for this local dummy signing execution.");
  }

  if (approval.approvalPhraseProvided && !approval.approvalPhraseValid) {
    blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE: the provided approval phrase does not exactly match the documented future execution approval phrase.");
  } else if (approval.explicitFutureApprovalFlagPresent) {
    blockers.push("BLOCKED_SIGNING_EXECUTION_DISABLED: an approval marker was detected, but this sprint still does not execute signing.");
  } else if (!approval.approvalPhraseValid) {
    blockers.push("BLOCKED_PENDING_DUMMY_SIGNING_APPROVAL: no exact future local dummy signing approval phrase is present.");
  } else {
    warnings.push("Exact future approval phrase recognized for planning only; execution remains disabled until a later implementation sprint.");
  }

  const executionRequested = approval.approvalPhraseValid && approval.executeApprovedPlanRequested;
  const preflightStatus = selectStatus(blockers, approval);
  const executionEvidence =
    executionRequested && blockers.length === 0
      ? executeApprovedDummySigning({
          repoRoot,
          env,
          runCommand,
          java,
          sdk,
          fixtureIds: requestedFixtureIds,
          timestamp: options.timestamp,
          runId: options.runId,
        })
      : null;
  const status = executionEvidence?.status || preflightStatus;

  return {
    status,
    environment: executionEvidence ? EXECUTION_ENVIRONMENT : ENVIRONMENT,
    noNetworkOnly: true,
    networkCallsMade: false,
    networkEndpointsConfigured: false,
    localOnly: true,
    planningOnly: !executionEvidence,
    productionComplianceEnabled: false,
    productionCompliance: false,
    signingExecutionEnabled: Boolean(executionEvidence?.sdkSignCommandExecuted),
    dummySigningAllowed: Boolean(executionEvidence),
    plannedExecutionAllowedInFuture: approval.plannedExecutionAllowedInFuture,
    qrExecutionEnabled: Boolean(executionEvidence?.sdkQrCommandExecuted),
    signedValidationExecutionEnabled: Boolean(executionEvidence?.sdkSignedValidationExecuted),
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    csidOtpNetworkUsed: false,
    java,
    sdk: {
      ...sdk,
      signCommandDocumented: commandFindings.signCommandDocumented,
      qrCommandDocumented: commandFindings.qrCommandDocumented,
      hashCommandDocumented: commandFindings.hashCommandDocumented,
      validateCommandDocumented: commandFindings.validateCommandDocumented,
    },
    dummyMaterial,
    fixtures,
    requestedFixtureIds,
    packageScripts,
    officialReferences,
    approval,
    plannedCommands: {
      sign: "fatoora -sign -invoice <temp-unsigned.xml> -signedInvoice <temp-signed.xml>",
      qr: "fatoora -qr -invoice <temp-signed.xml>",
      validate: "fatoora -validate -invoice <temp-signed.xml>",
      hash: "fatoora -generateHash -invoice <temp-unsigned.xml>",
      executionPlannedOnly: !executionEvidence,
    },
    commandFindings,
    sdkSignCommandExecuted: Boolean(executionEvidence?.sdkSignCommandExecuted),
    sdkQrCommandExecuted: Boolean(executionEvidence?.sdkQrCommandExecuted),
    sdkHashCommandExecuted: false,
    sdkSignedValidationExecuted: Boolean(executionEvidence?.sdkSignedValidationExecuted),
    signedXmlGenerated: Boolean(executionEvidence?.signedXmlGenerated),
    signedXmlPersisted: false,
    qrPayloadGenerated: Boolean(executionEvidence?.qrPayloadGenerated),
    qrPayloadPersisted: false,
    tempFilesCreated: Boolean(executionEvidence?.tempWorkspaceCreated),
    tempSignedXmlCreated: Boolean(executionEvidence?.tempSignedXmlCreated),
    tempCleanupRequiredForFutureSprint: false,
    tempCleanupStatus: executionEvidence?.tempCleanupStatus || null,
    evidence: executionEvidence,
    evidencePolicy: buildEvidencePolicy(),
    redaction: buildRedactionFlags(),
    blockers,
    warnings,
    ...(args.plan ? { plan: buildPlanSummary(status, approval) } : {}),
  };
}

function selectStatus(blockers, approval) {
  if (approval.approvalPhraseProvided && !approval.approvalPhraseValid) {
    return "BLOCKED_INVALID_APPROVAL_PHRASE";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_NO_NETWORK_REQUIRED"))) {
    return "BLOCKED_NO_NETWORK_REQUIRED";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_UNAPPROVED_FIXTURE"))) {
    return "BLOCKED_UNAPPROVED_FIXTURE";
  }
  if (approval.approvalPhraseValid && !approval.executeApprovedPlanRequested) {
    return "PLAN_ONLY_APPROVAL_RECOGNIZED";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_SDK_REFERENCE"))) {
    return "BLOCKED_MISSING_SDK_REFERENCE";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_GENERATED_FIXTURE"))) {
    return "BLOCKED_MISSING_GENERATED_FIXTURE";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_DUMMY_MATERIAL_PATH_MISSING"))) {
    return "BLOCKED_DUMMY_MATERIAL_PATH_MISSING";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_UNSUPPORTED_JAVA"))) {
    return "BLOCKED_UNSUPPORTED_JAVA";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_PACKAGE_SCRIPT"))) {
    return "BLOCKED_SIGNING_EXECUTION_DISABLED";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_DOCUMENTED_COMMAND"))) {
    return "BLOCKED_SIGNING_EXECUTION_DISABLED";
  }
  return approval.explicitFutureApprovalFlagPresent ? "BLOCKED_SIGNING_EXECUTION_DISABLED" : "BLOCKED_PENDING_DUMMY_SIGNING_APPROVAL";
}

function resolveRequestedFixtureIds(args = {}) {
  if (args.all) {
    return [STANDARD_FIXTURE_ID, CREDIT_FIXTURE_ID];
  }
  const ids = Array.isArray(args.fixtures) && args.fixtures.length > 0 ? args.fixtures : args.fixture ? [args.fixture] : [];
  return [...new Set(ids)];
}

function executeApprovedDummySigning({ repoRoot, env, runCommand, java, sdk, fixtureIds, timestamp, runId }) {
  const executionRunId =
    runId || `zatca-dummy-signing-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const executionTimestamp = timestamp || new Date().toISOString();
  const javaBin = cleanPath(env.ZATCA_SDK_JAVA_BIN);
  const execution = {
    runId: executionRunId,
    timestamp: executionTimestamp,
    environment: EXECUTION_ENVIRONMENT,
    noNetworkOnly: true,
    networkCallsMade: false,
    productionComplianceEnabled: false,
    productionCompliance: false,
    approvalPhraseMatched: true,
    sdkVersion: sdk.sdkVersion,
    javaVersion: java.version,
    fixtureCount: fixtureIds.length,
    passedCount: 0,
    failedCount: 0,
    blockedCount: 0,
    fixtures: [],
    sdkSignCommandExecuted: false,
    sdkQrCommandExecuted: false,
    sdkSignedValidationExecuted: false,
    signedXmlGenerated: false,
    signedXmlPersisted: false,
    qrPayloadGenerated: false,
    qrPayloadPersisted: false,
    tempWorkspaceCreated: false,
    tempSignedXmlCreated: false,
    tempCleanupStatus: "NOT_STARTED",
    redaction: buildRedactionFlags(),
    blockers: [],
    safeWarningCodes: [],
    safeErrorCodes: [],
    officialSdkCommands: {
      sign: "fatoora -sign -invoice <temp-unsigned.xml> -signedInvoice <temp-signed.xml>",
      qr: "fatoora -qr -invoice <temp-signed.xml>",
      validate: "fatoora -validate -invoice <temp-signed.xml>",
    },
  };

  let workspace = null;
  try {
    workspace = prepareExecutionWorkspace(repoRoot, sdk, javaBin);
    execution.tempWorkspaceCreated = true;
    const stageEnv = buildStageEnv(env, workspace, javaBin);
    for (const fixtureId of fixtureIds) {
      const result = runFixtureExecution({
        repoRoot,
        fixtureId,
        workspace,
        sdk,
        java,
        stageEnv,
        runCommand,
      });
      execution.fixtures.push(result);
      execution.sdkSignCommandExecuted = execution.sdkSignCommandExecuted || result.sdkCommandExecuted.sign;
      execution.sdkQrCommandExecuted = execution.sdkQrCommandExecuted || result.sdkCommandExecuted.qr;
      execution.sdkSignedValidationExecuted = execution.sdkSignedValidationExecuted || result.sdkCommandExecuted.validate;
      execution.signedXmlGenerated = execution.signedXmlGenerated || result.signedXmlGenerated;
      execution.qrPayloadGenerated = execution.qrPayloadGenerated || result.qrPayloadGenerated;
      execution.tempSignedXmlCreated = execution.tempSignedXmlCreated || result.tempSignedXmlCreated;
    }
  } catch (error) {
    execution.blockers.push("FAILED_TEMP_WORKSPACE_SETUP: local dummy signing temp workspace setup failed before SDK execution.");
    execution.safeErrorCodes.push("FAILED_TEMP_WORKSPACE_SETUP");
  } finally {
    execution.tempCleanupStatus = cleanupExecutionWorkspace(workspace);
  }

  for (const fixture of execution.fixtures) {
    fixture.tempCleanupStatus = execution.tempCleanupStatus;
  }

  for (const fixture of execution.fixtures) {
    execution.safeWarningCodes.push(...fixture.safeWarningCodes);
    execution.safeErrorCodes.push(...fixture.safeErrorCodes);
    execution.blockers.push(...fixture.blockers);
  }
  execution.safeWarningCodes = unique(execution.safeWarningCodes);
  execution.safeErrorCodes = unique(execution.safeErrorCodes);
  execution.blockers = unique(execution.blockers);
  execution.passedCount = execution.fixtures.filter((fixture) => fixture.status === "PASSED_LOCAL_DUMMY_SIGNING").length;
  execution.failedCount = execution.fixtures.filter((fixture) => fixture.status === "FAILED_LOCAL_DUMMY_SIGNING").length;
  execution.blockedCount =
    execution.fixtures.filter((fixture) => fixture.status.startsWith("BLOCKED_")).length +
    (execution.safeErrorCodes.includes("FAILED_TEMP_WORKSPACE_SETUP") ? 1 : 0);
  execution.status = selectExecutionStatus(execution);
  return execution;
}

function selectExecutionStatus(execution) {
  if (execution.tempCleanupStatus !== "SUCCESS") {
    return "FAILED_TEMP_CLEANUP";
  }
  if (execution.safeErrorCodes.includes("FAILED_TEMP_WORKSPACE_SETUP")) {
    return "FAILED_TEMP_WORKSPACE_SETUP";
  }
  if (execution.blockedCount > 0) {
    const firstBlocked = execution.fixtures.find((fixture) => fixture.status.startsWith("BLOCKED_"));
    return firstBlocked?.status || "BLOCKED_MISSING_GENERATED_FIXTURE";
  }
  if (execution.failedCount > 0) {
    return "FAILED_LOCAL_DUMMY_SIGNING";
  }
  return "PASSED_LOCAL_DUMMY_SIGNING";
}

function runFixtureExecution({ repoRoot, fixtureId, workspace, sdk, java, stageEnv, runCommand }) {
  const fixture = FIXTURES[fixtureId];
  if (!fixture) {
    return blockedFixtureExecution(fixtureId, "BLOCKED_UNAPPROVED_FIXTURE", "UNAPPROVED_FIXTURE");
  }

  const sourcePath = path.join(repoRoot, ...fixture.path.split("/"));
  if (!fs.existsSync(sourcePath)) {
    return blockedFixtureExecution(fixtureId, "BLOCKED_MISSING_GENERATED_FIXTURE", "FIXTURE_NOT_FOUND", fixture);
  }

  const safeName = fixtureId.replace(/[^a-z0-9-]/gi, "-");
  const unsignedPath = path.join(workspace.workspaceDir, `${safeName}-unsigned.xml`);
  const signedPath = path.join(workspace.workspaceDir, `${safeName}-signed.xml`);
  fs.copyFileSync(sourcePath, unsignedPath);

  const evidence = {
    fixtureId,
    fixtureType: fixture.fixtureType,
    invoiceKind: fixture.invoiceKind,
    sourcePath: fixture.path,
    status: "FAILED_LOCAL_DUMMY_SIGNING",
    signStageStatus: "NOT_STARTED",
    qrStageStatus: "NOT_STARTED",
    validationStageStatus: "NOT_STARTED",
    sdkExitCodes: { sign: null, qr: null, validate: null },
    safeWarningCodes: [],
    safeErrorCodes: [],
    blockers: [],
    tempWorkspaceCreated: true,
    tempCleanupStatus: "PENDING",
    tempPathsPrinted: false,
    xmlBodyPersistedInEvidence: false,
    signedXmlBodyPersistedInEvidence: false,
    qrPayloadBodyPersistedInEvidence: false,
    privateKeyBodyRead: false,
    certificateBodyRead: false,
    signedXmlGenerated: false,
    tempSignedXmlCreated: false,
    qrPayloadGenerated: false,
    rawStdoutPersisted: false,
    rawStderrPersisted: false,
    sdkCommandExecuted: { sign: false, qr: false, validate: false },
    commands: {
      sign: "fatoora -sign -invoice <temp-unsigned.xml> -signedInvoice <temp-signed.xml>",
      qr: "fatoora -qr -invoice <temp-signed.xml>",
      validate: "fatoora -validate -invoice <temp-signed.xml>",
    },
  };

  const sign = runSdkStage({
    workspace,
    stageEnv,
    runCommand,
    stage: "sign",
    args: ["-sign", "-invoice", unsignedPath, "-signedInvoice", signedPath],
    sdk,
  });
  evidence.sdkCommandExecuted.sign = true;
  evidence.sdkExitCodes.sign = sign.exitCode;
  evidence.safeWarningCodes.push(...sign.safeWarningCodes);
  evidence.safeErrorCodes.push(...sign.safeErrorCodes);
  evidence.signStageStatus = sign.passed ? "PASSED" : "FAILED";
  if (!sign.passed) {
    evidence.blockers.push("FAILED_LOCAL_DUMMY_SIGNING: SDK sign stage failed; QR and signed validation were skipped for this fixture.");
    evidence.qrStageStatus = "SKIPPED";
    evidence.validationStageStatus = "SKIPPED";
    return finishFixtureExecution(evidence);
  }

  evidence.signedXmlGenerated = fs.existsSync(signedPath);
  evidence.tempSignedXmlCreated = evidence.signedXmlGenerated;
  if (!evidence.signedXmlGenerated) {
    evidence.safeErrorCodes.push("SIGNED_XML_OUTPUT_MISSING");
    evidence.blockers.push("FAILED_LOCAL_DUMMY_SIGNING: SDK sign stage returned success but the temp signed XML output was not found.");
    evidence.qrStageStatus = "SKIPPED";
    evidence.validationStageStatus = "SKIPPED";
    return finishFixtureExecution(evidence);
  }

  const qr = runSdkStage({
    workspace,
    stageEnv,
    runCommand,
    stage: "qr",
    args: ["-qr", "-invoice", signedPath],
    sdk,
  });
  evidence.sdkCommandExecuted.qr = true;
  evidence.sdkExitCodes.qr = qr.exitCode;
  evidence.safeWarningCodes.push(...qr.safeWarningCodes);
  evidence.safeErrorCodes.push(...qr.safeErrorCodes);
  evidence.qrStageStatus = qr.passed ? "PASSED" : "FAILED";
  evidence.qrPayloadGenerated = qr.passed;
  if (!qr.passed) {
    evidence.blockers.push("FAILED_LOCAL_DUMMY_SIGNING: SDK QR stage failed; signed validation was skipped for this fixture.");
    evidence.validationStageStatus = "SKIPPED";
    return finishFixtureExecution(evidence);
  }

  const validation = runSdkStage({
    workspace,
    stageEnv,
    runCommand,
    stage: "validate",
    args: ["-validate", "-invoice", signedPath],
    sdk,
  });
  evidence.sdkCommandExecuted.validate = true;
  evidence.sdkExitCodes.validate = validation.exitCode;
  evidence.safeWarningCodes.push(...validation.safeWarningCodes);
  evidence.safeErrorCodes.push(...validation.safeErrorCodes);
  evidence.validationStageStatus = validation.passed ? "PASSED" : "FAILED";
  if (!validation.passed) {
    evidence.blockers.push("FAILED_LOCAL_DUMMY_SIGNING: SDK signed XML validation stage failed.");
    return finishFixtureExecution(evidence);
  }

  evidence.status = "PASSED_LOCAL_DUMMY_SIGNING";
  return finishFixtureExecution(evidence);
}

function finishFixtureExecution(evidence) {
  evidence.safeWarningCodes = unique(evidence.safeWarningCodes);
  evidence.safeErrorCodes = unique(evidence.safeErrorCodes);
  evidence.blockers = unique(evidence.blockers);
  evidence.tempCleanupStatus = "PENDING_RUN_CLEANUP";
  if (evidence.status !== "PASSED_LOCAL_DUMMY_SIGNING") {
    evidence.status = evidence.status.startsWith("BLOCKED_") ? evidence.status : "FAILED_LOCAL_DUMMY_SIGNING";
  }
  return evidence;
}

function blockedFixtureExecution(fixtureId, status, safeErrorCode, fixture = null) {
  return {
    fixtureId,
    fixtureType: fixture?.fixtureType || "unknown",
    invoiceKind: fixture?.invoiceKind || "unknown",
    sourcePath: fixture?.path || null,
    status,
    signStageStatus: "BLOCKED",
    qrStageStatus: "SKIPPED",
    validationStageStatus: "SKIPPED",
    sdkExitCodes: { sign: null, qr: null, validate: null },
    safeWarningCodes: [],
    safeErrorCodes: [safeErrorCode],
    blockers: [`${status}: fixture was not approved or not available before SDK execution.`],
    tempWorkspaceCreated: false,
    tempCleanupStatus: "NOT_REQUIRED",
    tempPathsPrinted: false,
    xmlBodyPersistedInEvidence: false,
    signedXmlBodyPersistedInEvidence: false,
    qrPayloadBodyPersistedInEvidence: false,
    privateKeyBodyRead: false,
    certificateBodyRead: false,
    signedXmlGenerated: false,
    tempSignedXmlCreated: false,
    qrPayloadGenerated: false,
    rawStdoutPersisted: false,
    rawStderrPersisted: false,
    sdkCommandExecuted: { sign: false, qr: false, validate: false },
    commands: {
      sign: "fatoora -sign -invoice <temp-unsigned.xml> -signedInvoice <temp-signed.xml>",
      qr: "fatoora -qr -invoice <temp-signed.xml>",
      validate: "fatoora -validate -invoice <temp-signed.xml>",
    },
  };
}

function runSdkStage({ workspace, stageEnv, runCommand, stage, args, sdk }) {
  const commandPlan = buildFatooraCommand(workspace.launcherPath, args);
  const result = runCommand(commandPlan.command, commandPlan.args, {
    cwd: workspace.appsDir,
    env: stageEnv,
    encoding: "utf8",
    timeout: sdk.timeoutMs || DEFAULT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 5 * 1024 * 1024,
  });
  const safe = summarizeSdkOutput([result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n"));
  const exitCode = typeof result.status === "number" ? result.status : null;
  return {
    stage,
    exitCode,
    passed: inferStagePassed(stage, safe.textForInference, exitCode, result.error),
    safeWarningCodes: safe.warningCodes,
    safeErrorCodes: safe.errorCodes,
  };
}

function buildFatooraCommand(launcherPath, args) {
  if (process.platform === "win32" && /\.bat$/i.test(launcherPath)) {
    return {
      command: process.env.ComSpec || path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe"),
      args: ["/d", "/c", launcherPath, ...args],
    };
  }
  return { command: launcherPath, args };
}

function prepareExecutionWorkspace(repoRoot, sdk, javaBin) {
  if (!javaBin) {
    throw new Error("ZATCA_SDK_JAVA_BIN is required for approved local dummy signing execution.");
  }
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-dummy-sign-"));
  const workspaceDir = path.join(tempRoot, "workspace");
  const appsDir = path.join(tempRoot, "Apps");
  const configDir = path.join(tempRoot, "Configuration");
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.mkdirSync(appsDir, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });

  for (const fileName of ["fatoora.bat", "fatoora", "global.json", "jq.exe", "zatca-einvoicing-sdk-238-R3.4.8.jar"]) {
    const source = path.join(repoRoot, ...SDK_ROOT.split("/"), "Apps", fileName);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(appsDir, fileName));
    }
  }

  const configPath = path.join(configDir, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(buildExecutionSdkConfig(repoRoot), null, 2), "utf8");
  return {
    tempRoot,
    workspaceDir,
    appsDir,
    configDir,
    configPath,
    launcherPath: path.join(appsDir, process.platform === "win32" ? "fatoora.bat" : "fatoora"),
  };
}

function buildExecutionSdkConfig(repoRoot) {
  const sdkRoot = path.join(repoRoot, ...SDK_ROOT.split("/"));
  return {
    xsdPath: path.join(sdkRoot, "Data", "Schemas", "xsds", "UBL2.1", "xsd", "maindoc", "UBL-Invoice-2.1.xsd"),
    enSchematron: path.join(sdkRoot, "Data", "Rules", "Schematrons", "CEN-EN16931-UBL.xsl"),
    zatcaSchematron: path.join(sdkRoot, "Data", "Rules", "Schematrons", "20210819_ZATCA_E-invoice_Validation_Rules.xsl"),
    certPath: path.join(sdkRoot, "Data", "Certificates", "cert.pem"),
    privateKeyPath: path.join(sdkRoot, "Data", "Certificates", "ec-secp256k1-priv-key.pem"),
    pihPath: path.join(sdkRoot, "Data", "PIH", "pih.txt"),
    inputPath: path.join(sdkRoot, "Data", "Input"),
    usagePathFile: path.join(sdkRoot, "Configuration", "usage.txt"),
  };
}

function buildStageEnv(env, workspace, javaBin) {
  const javaDir = path.dirname(javaBin);
  const delimiter = process.platform === "win32" ? ";" : ":";
  const inheritedPath = env.PATH || env.Path || process.env.PATH || process.env.Path || "";
  const pathValue = `${javaDir}${delimiter}${workspace.appsDir}${delimiter}${inheritedPath}`;
  return {
    ...process.env,
    ...env,
    FATOORA_HOME: workspace.appsDir,
    SDK_CONFIG: workspace.configPath,
    PATH: pathValue,
    Path: pathValue,
  };
}

function cleanupExecutionWorkspace(workspace) {
  if (!workspace?.tempRoot) return "NOT_REQUIRED";
  try {
    const resolved = path.resolve(workspace.tempRoot);
    const tempRoot = path.resolve(os.tmpdir());
    if (!resolved.startsWith(tempRoot)) {
      return "FAILED_UNSAFE_PATH";
    }
    fs.rmSync(resolved, { recursive: true, force: true });
    return fs.existsSync(resolved) ? "FAILED_TEMP_CLEANUP" : "SUCCESS";
  } catch {
    return "FAILED_TEMP_CLEANUP";
  }
}

function inspectSdk(repoRoot) {
  const readme = `${SDK_ROOT}/Readme/readme.md`;
  const usage = `${SDK_ROOT}/Configuration/usage.txt`;
  const config = `${SDK_ROOT}/Configuration/config.json`;
  const jar = `${SDK_ROOT}/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`;
  const windowsLauncher = `${SDK_ROOT}/Apps/fatoora.bat`;
  const posixLauncher = `${SDK_ROOT}/Apps/fatoora`;

  return {
    referenceFound: exists(repoRoot, SDK_ROOT),
    jarFound: exists(repoRoot, jar),
    launcherFound: exists(repoRoot, windowsLauncher) || exists(repoRoot, posixLauncher),
    windowsLauncherFound: exists(repoRoot, windowsLauncher),
    posixLauncherFound: exists(repoRoot, posixLauncher),
    readmeFound: exists(repoRoot, readme),
    usageFound: exists(repoRoot, usage),
    configFound: exists(repoRoot, config),
    sdkVersion: exists(repoRoot, jar) ? "238-R3.4.8" : null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    referenceBodyPrinted: false,
    inspectedRelativePaths: [readme, usage, config, jar, windowsLauncher, posixLauncher],
  };
}

function inspectDummyMaterial(repoRoot) {
  const certificatePath = `${SDK_ROOT}/Data/Certificates/cert.pem`;
  const privateKeyPath = `${SDK_ROOT}/Data/Certificates/ec-secp256k1-priv-key.pem`;

  return {
    certificatePathFound: exists(repoRoot, certificatePath),
    privateKeyPathFound: exists(repoRoot, privateKeyPath),
    inspectedRelativePaths: [
      `${SDK_ROOT}/Data/Certificates/`,
      certificatePath,
      privateKeyPath,
    ],
    bodyRead: false,
    bodyPrinted: false,
    bodyPersisted: false,
  };
}

function inspectFixtures(repoRoot, selectedFixtureId) {
  const selected = selectedFixtureId ? FIXTURES[selectedFixtureId] : null;
  const selectedFixtureKnown = selectedFixtureId ? Boolean(selected) : null;
  const selectedFixtureFound = selected ? exists(repoRoot, selected.path) : null;

  return {
    generatedStandardInvoiceFound: exists(repoRoot, STANDARD_FIXTURE),
    generatedCreditNoteFound: exists(repoRoot, CREDIT_FIXTURE),
    generatedStandardInvoicePath: STANDARD_FIXTURE,
    generatedCreditNotePath: CREDIT_FIXTURE,
    selectedFixtureId: selectedFixtureId || null,
    selectedFixtureType: selected?.fixtureType || null,
    selectedFixturePath: selected?.path || null,
    selectedFixtureKnown,
    selectedFixtureFound,
    fixtureBodiesRead: false,
    fixtureBodiesPrinted: false,
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  const scripts = {};
  if (!fs.existsSync(packagePath)) {
    return { packageJsonFound: false, allRequiredFound: false, scripts };
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
    };
  } catch {
    return { packageJsonFound: true, allRequiredFound: false, scripts };
  }
}

function inspectOfficialReferences(repoRoot) {
  return {
    allRequiredFound: OFFICIAL_REFERENCE_FILES.every((relativePath) => exists(repoRoot, relativePath)),
    inspectedRelativePaths: OFFICIAL_REFERENCE_FILES.map((relativePath) => ({
      path: relativePath,
      found: exists(repoRoot, relativePath),
    })),
  };
}

function inspectCommandFindings(repoRoot) {
  const usage = readTextIfExists(repoRoot, `${SDK_ROOT}/Configuration/usage.txt`);
  const readme = readTextIfExists(repoRoot, `${SDK_ROOT}/Readme/readme.md`);
  const docs = `${usage}\n${readme}`;

  return {
    sourceFilesRead: [
      `${SDK_ROOT}/Configuration/usage.txt`,
      `${SDK_ROOT}/Readme/readme.md`,
    ],
    signCommandDocumented: /-sign\b/i.test(docs) && /-signedInvoice\b/i.test(docs),
    qrCommandDocumented: /-qr\b/i.test(docs),
    hashCommandDocumented: /-generateHash\b/i.test(docs),
    validateCommandDocumented: /-validate\b/i.test(docs),
    dummyMaterialPolicyDocumented: /dummy\s+and\s+for\s+testing\s+purposes\s+only/i.test(docs),
    javaRequirementDocumented: />?=11/i.test(docs) && /<15/i.test(docs),
    signCommandShape: "fatoora -sign -invoice <filename> -signedInvoice <filename>",
    qrCommandShape: "fatoora -qr -invoice <filename>",
    hashCommandShape: "fatoora -generateHash -invoice <filename>",
    validateCommandShape: "fatoora -validate -invoice <filename>",
    commandsExecuted: false,
  };
}

function inspectApproval(env, args = {}) {
  const approvalPhrase = args.approvalPhrase ? String(args.approvalPhrase) : "";
  const approvalPhraseProvided = approvalPhrase.length > 0;
  const approvalPhraseValid = approvalPhrase === APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PHRASE;
  const executeApprovedPlanRequested = Boolean(args.executeApprovedPlan);

  return {
    requiredForExecution: true,
    envVarName: APPROVAL_ENV_VAR,
    explicitFutureApprovalFlagPresent: Boolean(cleanPath(env[APPROVAL_ENV_VAR])),
    approvalPhraseProvided,
    approvalPhraseValid,
    approvalPhrasePrinted: false,
    approvalValuePrinted: false,
    executeApprovedPlanRequested,
    plannedExecutionAllowedInFuture: approvalPhraseValid && !executeApprovedPlanRequested,
    enablesExecutionInThisSprint: false,
  };
}

function detectJava(env, runCommand) {
  const javaBin = cleanPath(env.ZATCA_SDK_JAVA_BIN) || "java";
  const result = runCommand(javaBin, ["-version"], { timeout: 5000 });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const version = parseJavaVersion(output);
  const majorVersion = parseJavaMajorVersion(version);
  const found = !result.error && Boolean(version);
  const supportedForSdk = found && majorVersion >= 11 && majorVersion < 15;

  return {
    found,
    version,
    majorVersion,
    supportedForSdk,
    requiredRange: REQUIRED_JAVA_RANGE,
    source: cleanPath(env.ZATCA_SDK_JAVA_BIN) ? "ZATCA_SDK_JAVA_BIN" : "default-java",
    javaPathPrinted: false,
  };
}

function parseJavaVersion(output) {
  const text = String(output || "");
  const quoted = text.match(/version\s+"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const openJdk = text.match(/openjdk\s+([0-9][^\s]*)/i);
  return openJdk?.[1] || null;
}

function parseJavaMajorVersion(version) {
  if (!version) return null;
  const legacy = String(version).match(/^1\.(\d+)/);
  if (legacy?.[1]) return Number(legacy[1]);
  const modern = String(version).match(/^(\d+)/);
  return modern?.[1] ? Number(modern[1]) : null;
}

function summarizeSdkOutput(output) {
  const sanitized = sanitizeSdkText(output);
  const lines = sanitized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    warningCodes: unique(extractSafeCodes(lines.filter((line) => /warning/i.test(line)).join("\n"))),
    errorCodes: unique(extractSafeCodes(lines.filter((line) => /error|failed|not pass|invalid|exception/i.test(line)).join("\n"))),
    textForInference: lines.filter((line) => /GLOBAL VALIDATION RESULT|VALIDATION RESULT|PASS|NOT PASS|FAILED|ERROR|SUCCESS/i.test(line)).join("\n"),
  };
}

function sanitizeSdkText(value) {
  return String(value || "")
    .replace(/<\?xml[\s\S]*?<\/(?:Invoice|CreditNote|DebitNote)>/gi, "[REDACTED_XML_BODY]")
    .replace(/<(?:Invoice|CreditNote|DebitNote)\b[\s\S]*?<\/(?:Invoice|CreditNote|DebitNote)>/gi, "[REDACTED_XML_BODY]")
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY]")
    .replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gi, "[REDACTED_CERTIFICATE]")
    .replace(/\b(authorization|token|secret|password|apiKey|certificate|privateKey)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, 8000);
}

function extractSafeCodes(value) {
  const matches = String(value || "").match(/\b(?:BR-KSA|BR|KSA|EN|UBL|XSD|QRCODE|SIGNATURE|CERTIFICATE|QR|PIH|GLOBAL)[A-Z0-9._:-]*\b/gi);
  return matches || [];
}

function inferStagePassed(stage, output, exitCode, error) {
  if (error || exitCode !== 0) return false;
  if (stage !== "validate") return true;
  const text = String(output || "");
  if (/\bNOT PASS\b/i.test(text) || /\bFAILED\b/i.test(text) || /\bERROR\b/i.test(text)) return false;
  return true;
}

function writeExecutionEvidence(out, guard, cwd = process.cwd()) {
  if (!out || !guard.evidence) return null;
  const target = path.resolve(cwd, out);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(guard.evidence, null, 2)}\n`, "utf8");
  return target;
}

function buildBlockedExecutionEvidence(guard) {
  return {
    runId: `zatca-dummy-signing-blocked-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    environment: EXECUTION_ENVIRONMENT,
    status: guard.status,
    noNetworkOnly: Boolean(guard.noNetworkOnly),
    networkCallsMade: false,
    productionComplianceEnabled: false,
    approvalPhraseMatched: Boolean(guard.approval?.approvalPhraseValid),
    sdkVersion: guard.sdk?.sdkVersion || null,
    javaVersion: guard.java?.version || null,
    fixtureCount: guard.requestedFixtureIds?.length || 0,
    passedCount: 0,
    failedCount: 0,
    blockedCount: 1,
    fixtures: [],
    blockers: guard.blockers || [],
    safeWarningCodes: [],
    safeErrorCodes: (guard.blockers || []).map((blocker) => String(blocker).split(":")[0]).filter(Boolean),
    tempWorkspaceCreated: false,
    tempCleanupStatus: "NOT_REQUIRED",
    redaction: buildRedactionFlags(),
  };
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function buildEvidencePolicy() {
  return {
    bodyPolicy: "metadata-only",
    xmlBodyPersisted: false,
    signedXmlBodyPersisted: false,
    qrPayloadBodyPersisted: false,
    privateKeyPersisted: false,
    certificateBodyPersisted: false,
    rawSdkStdoutPersisted: false,
    rawSdkStderrPersisted: false,
    allowedFutureFields: [
      "runId",
      "timestamp",
      "fixtureId",
      "fixtureType",
      "sdkVersion",
      "javaVersion",
      "signingStageStatus",
      "qrStageStatus",
      "signedValidationStatus",
      "safeWarningCodes",
      "safeErrorCodes",
      "noNetworkOnly",
      "networkCallsMade",
      "productionCompliance",
      "redaction",
      "tempCleanupStatus",
    ],
  };
}

function buildRedactionFlags() {
  return {
    xmlBodyPrinted: false,
    signedXmlBodyPrinted: false,
    qrPayloadPrinted: false,
    privateKeyPrinted: false,
    certificateBodyPrinted: false,
    tokenPrinted: false,
    headerPrinted: false,
    requestResponseBodyPrinted: false,
    customerVendorPayloadPrinted: false,
    attachmentBodyPrinted: false,
  };
}

function buildPlanSummary(status, approval) {
  return {
    currentPosture: status,
    signingExecutedThisSprint: false,
    qrExecutedThisSprint: false,
    signedValidationExecutedThisSprint: false,
    approvalFlagDetected: approval.explicitFutureApprovalFlagPresent,
    approvalPhraseRecognized: approval.approvalPhraseValid,
    executeApprovedPlanRequested: approval.executeApprovedPlanRequested,
    plannedExecutionAllowedInFuture: approval.plannedExecutionAllowedInFuture,
    executionEnabledInThisSprint: false,
    recommendedNextStep: "A future approved sprint may implement the execution gate, but this guard must still refuse signing until that separate sprint explicitly enables the approved plan.",
    nextPromptTitle: "ZATCA approved local dummy signing execution",
  };
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

function cleanPath(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function defaultRunCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout: options.timeout || 5000,
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    maxBuffer: options.maxBuffer,
  });
}

function sanitizeError(error) {
  return String(error?.message || error)
    .replace(/<Invoice[\s\S]*?<\/Invoice>/gi, "[REDACTED_XML_BODY]")
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY]")
    .replace(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gi, "[REDACTED_CERTIFICATE]")
    .replace(/\b(authorization|token|secret|password|apiKey|certificate)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function formatHuman(guard) {
  return [
    `ZATCA local dummy signing dry-run guard: ${guard.status}`,
    `Signing execution enabled: ${guard.signingExecutionEnabled ? "true" : "false"}`,
    `Dummy signing allowed: ${guard.dummySigningAllowed ? "true" : "false"}`,
    `QR execution enabled: ${guard.qrExecutionEnabled ? "true" : "false"}`,
    `Signed validation execution enabled: ${guard.signedValidationExecutionEnabled ? "true" : "false"}`,
    `Java: ${guard.java.version || "not found"} (${guard.java.supportedForSdk ? "supported" : "unsupported"})`,
    `SDK reference found: ${guard.sdk.referenceFound ? "true" : "false"}`,
    `Dummy material paths found: ${guard.dummyMaterial.certificatePathFound && guard.dummyMaterial.privateKeyPathFound ? "true" : "false"}`,
    `Generated fixtures found: ${guard.fixtures.generatedStandardInvoiceFound && guard.fixtures.generatedCreditNoteFound ? "true" : "false"}`,
    `No network calls made: ${guard.networkCallsMade === false ? "true" : "false"}`,
    ...guard.blockers.map((blocker) => `- ${blocker}`),
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
        environment: ENVIRONMENT,
        noNetworkOnly: false,
        networkCallsMade: false,
        signingExecutionEnabled: false,
        dummySigningAllowed: false,
        qrExecutionEnabled: false,
        signedValidationExecutionEnabled: false,
        error: "--no-network is required for ZATCA local dummy signing dry-run planning.",
      };
      const text = parsed.json ? JSON.stringify(payload, null, 2) : payload.error;
      io.error(text);
      return 2;
    }

    const guard = buildDummySigningDryRunGuard({ args: parsed });
    if (parsed.executeApprovedPlan && !guard.evidence) {
      guard.evidence = buildBlockedExecutionEvidence(guard);
    }
    const evidencePath = writeExecutionEvidence(parsed.out, guard, process.cwd());
    if (evidencePath) {
      guard.evidenceFilePath = path.relative(process.cwd(), evidencePath).replace(/\\/g, "/");
    }
    const text = parsed.json ? JSON.stringify(guard, null, 2) : formatHuman(guard);
    io.log(text);
    return parsed.strict && guard.status.startsWith("BLOCKED_") ? 1 : 0;
  } catch (error) {
    const payload = {
      status: "ERROR",
      environment: ENVIRONMENT,
      noNetworkOnly: Boolean(parsed?.noNetwork),
      networkCallsMade: false,
      signingExecutionEnabled: false,
      dummySigningAllowed: false,
      qrExecutionEnabled: false,
      signedValidationExecutionEnabled: false,
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
  APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PHRASE,
  buildDummySigningDryRunGuard,
  buildFatooraCommand,
  buildStageEnv,
  executeApprovedDummySigning,
  inferStagePassed,
  parseArgs,
  parseJavaMajorVersion,
  parseJavaVersion,
  runCli,
  summarizeSdkOutput,
  writeExecutionEvidence,
};
