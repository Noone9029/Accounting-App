#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_JAVA_RANGE = ">=11 <15";
const ENVIRONMENT = "LOCAL_DUMMY_SIGNING_DRY_RUN_GUARD";
const APPROVAL_ENV_VAR = "ZATCA_LOCAL_DUMMY_SIGNING_APPROVAL";
const SDK_ROOT = "reference/zatca-einvoicing-sdk-Java-238-R3.4.8";
const STANDARD_FIXTURE_ID = "ledgerbyte-generated-standard-invoice";
const CREDIT_FIXTURE_ID = "ledgerbyte-generated-credit-note";
const STANDARD_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml";
const CREDIT_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml";

const FIXTURES = {
  [STANDARD_FIXTURE_ID]: {
    fixtureId: STANDARD_FIXTURE_ID,
    fixtureType: "standard-invoice",
    path: STANDARD_FIXTURE,
  },
  [CREDIT_FIXTURE_ID]: {
    fixtureId: CREDIT_FIXTURE_ID,
    fixtureType: "credit-note",
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
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --plan --no-network --json",
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --plan --fixture ledgerbyte-generated-standard-invoice --no-network --json",
    "  node scripts/zatca-local-dummy-signing-dry-run.cjs --plan --no-network --json --strict",
    "",
    "This command prints metadata-only readiness and command-plan output.",
    "It does not sign XML, generate QR, validate signed XML, request OTP/CSID, call ZATCA, clear/report, create PDF/A-3, deploy, migrate, seed, reset, delete, or send email.",
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
  const packageScripts = inspectPackageScripts(repoRoot);
  const officialReferences = inspectOfficialReferences(repoRoot);
  const approval = inspectApproval(env);
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

  if (!packageScripts.allRequiredFound) {
    blockers.push("BLOCKED_MISSING_PACKAGE_SCRIPT: dummy signing guard package scripts must be present before repeatable local use.");
  }

  if (!commandFindings.signCommandDocumented || !commandFindings.qrCommandDocumented || !commandFindings.validateCommandDocumented) {
    blockers.push("BLOCKED_MISSING_DOCUMENTED_COMMAND: SDK sign, QR, and validate command shapes must be source-backed by local official SDK docs.");
  }

  if (!commandFindings.hashCommandDocumented) {
    warnings.push("SDK hash command shape was not detected in local usage/readme; keep invoice-hash reasoning blocked until reinspected.");
  }

  if (approval.explicitFutureApprovalFlagPresent) {
    blockers.push("BLOCKED_SIGNING_EXECUTION_DISABLED: an approval marker was detected, but this sprint still does not execute signing.");
  } else {
    blockers.push("BLOCKED_PENDING_DUMMY_SIGNING_APPROVAL: no explicit future local dummy signing approval is present.");
  }

  const status = selectStatus(blockers, approval);

  return {
    status,
    environment: ENVIRONMENT,
    noNetworkOnly: true,
    networkCallsMade: false,
    networkEndpointsConfigured: false,
    localOnly: true,
    planningOnly: true,
    productionComplianceEnabled: false,
    productionCompliance: false,
    signingExecutionEnabled: false,
    dummySigningAllowed: false,
    qrExecutionEnabled: false,
    signedValidationExecutionEnabled: false,
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
    packageScripts,
    officialReferences,
    approval,
    plannedCommands: {
      sign: "fatoora -sign -invoice <temp-unsigned.xml> -signedInvoice <temp-signed.xml>",
      qr: "fatoora -qr -invoice <temp-signed.xml>",
      validate: "fatoora -validate -invoice <temp-signed.xml>",
      hash: "fatoora -generateHash -invoice <temp-unsigned.xml>",
      executionPlannedOnly: true,
    },
    commandFindings,
    sdkSignCommandExecuted: false,
    sdkQrCommandExecuted: false,
    sdkHashCommandExecuted: false,
    sdkSignedValidationExecuted: false,
    signedXmlGenerated: false,
    signedXmlPersisted: false,
    qrPayloadGenerated: false,
    qrPayloadPersisted: false,
    tempFilesCreated: false,
    tempSignedXmlCreated: false,
    tempCleanupRequiredForFutureSprint: true,
    evidencePolicy: buildEvidencePolicy(),
    redaction: buildRedactionFlags(),
    blockers,
    warnings,
    ...(args.plan ? { plan: buildPlanSummary(status, approval) } : {}),
  };
}

function selectStatus(blockers, approval) {
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

function inspectApproval(env) {
  return {
    requiredForExecution: true,
    envVarName: APPROVAL_ENV_VAR,
    explicitFutureApprovalFlagPresent: Boolean(cleanPath(env[APPROVAL_ENV_VAR])),
    approvalValuePrinted: false,
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
    executionEnabledInThisSprint: false,
    recommendedNextStep: "A future approved sprint may design execution, but this guard must remain blocked until explicit local dummy signing execution approval exists.",
    nextPromptTitle: "ZATCA approved local dummy signing execution plan",
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
    windowsHide: true,
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
        status: "BLOCKED_NO_NETWORK_FLAG_REQUIRED",
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
  buildDummySigningDryRunGuard,
  parseArgs,
  parseJavaMajorVersion,
  parseJavaVersion,
  runCli,
};
