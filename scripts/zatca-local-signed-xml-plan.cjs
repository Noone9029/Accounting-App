#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_JAVA_RANGE = ">=11 <15";
const SDK_ROOT = "reference/zatca-einvoicing-sdk-Java-238-R3.4.8";
const STANDARD_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml";
const CREDIT_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml";

const OFFICIAL_REFERENCE_FILES = [
  `${SDK_ROOT}/Readme/readme.md`,
  `${SDK_ROOT}/Configuration/usage.txt`,
  `${SDK_ROOT}/Configuration/config.json`,
  `${SDK_ROOT}/Data/Samples/Standard/Invoice/Standard_Invoice.xml`,
  `${SDK_ROOT}/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`,
  `${SDK_ROOT}/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`,
  `${SDK_ROOT}/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`,
  `${SDK_ROOT}/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`,
  `${SDK_ROOT}/Data/Rules/Schematrons/CEN-EN16931-UBL.xsl`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`,
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
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    plan: false,
    strict: false,
    noNetwork: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--plan") {
      parsed.plan = true;
    } else if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--no-network") {
      parsed.noNetwork = true;
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
    "  node scripts/zatca-local-signed-xml-plan.cjs --plan --no-network --json",
    "  node scripts/zatca-local-signed-xml-plan.cjs --plan --no-network --json --strict",
    "",
    "This command prints a metadata-only local signed XML validation plan.",
    "It does not sign XML, generate QR, generate hash, request OTP/CSID, call ZATCA, clear/report, create PDF/A-3, deploy, migrate, seed, reset, delete, or send email.",
  ].join("\n");
}

function buildSignedXmlPlan(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const env = options.env || process.env;
  const runCommand = options.runCommand || defaultRunCommand;
  const java = detectJava(env, runCommand);
  const sdk = inspectSdk(repoRoot);
  const fixtures = inspectFixtures(repoRoot);
  const packageScripts = inspectPackageScripts(repoRoot);
  const officialReferences = inspectOfficialReferences(repoRoot);
  const commandFindings = inspectCommandFindings(repoRoot);
  const blockers = [];
  const warnings = [];

  if (!sdk.referenceFound || !sdk.jarFound || !sdk.configFound || !sdk.usageFound) {
    blockers.push("BLOCKED_MISSING_SDK_REFERENCE: local official SDK app/config/readme files are required before any future dummy signing experiment.");
  }

  if (!sdk.certificateDirectoryFound || !sdk.dummyCertificateFileFound || !sdk.dummyPrivateKeyFileFound) {
    blockers.push("BLOCKED_MISSING_DUMMY_MATERIAL_REFERENCE: SDK dummy certificate/private-key file paths must exist before planning an isolated future local experiment.");
  }

  if (!fixtures.generatedStandardInvoiceFound || !fixtures.generatedCreditNoteFound) {
    blockers.push("BLOCKED_MISSING_GENERATED_FIXTURE: generated standard invoice and credit-note fixtures are required inputs for future local signed XML validation.");
  }

  if (!java.found || !java.supported) {
    blockers.push("BLOCKED_UNSUPPORTED_JAVA: official SDK execution requires Java >=11 <15; Java 17 and missing Java must remain blocked.");
  }

  if (!packageScripts.allRequiredFound) {
    blockers.push("BLOCKED_MISSING_PACKAGE_SCRIPT: local signed XML plan package scripts are missing.");
  }

  if (!commandFindings.signCommandDocumented) {
    blockers.push("BLOCKED_SIGN_COMMAND_NOT_DOCUMENTED: SDK -sign command shape was not found in local official SDK usage/readme files.");
  }

  if (!commandFindings.qrCommandDocumented) {
    warnings.push("SDK -qr command shape was not found in local official SDK usage/readme files; Phase 2 QR remains blocked.");
  }

  if (!commandFindings.hashCommandDocumented) {
    warnings.push("SDK -generateHash command shape was not found in local official SDK usage/readme files; hash/signature relationship requires reinspection.");
  }

  blockers.push("BLOCKED_SIGNING_EXECUTION_DISABLED: this sprint is planning-only and does not approve or execute local dummy signing.");

  const status = selectStatus(blockers);

  return {
    status,
    noNetworkOnly: true,
    networkCallsMade: false,
    localOnly: true,
    planningOnly: true,
    productionComplianceEnabled: false,
    productionCompliance: false,
    signingExecutionEnabled: false,
    localSignedXmlExecutionEnabled: false,
    localDummySigningAllowed: false,
    localSignedXmlNoNetworkOnly: true,
    localSignedXmlProductionCompliance: false,
    localSignedXmlEvidenceBodyPolicy: "metadata-only",
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    csidOtpNetworkUsed: false,
    sdkSignCommandExecuted: false,
    sdkQrCommandExecuted: false,
    sdkHashCommandExecuted: false,
    signedXmlGenerated: false,
    signedXmlPersisted: false,
    qrPayloadGenerated: false,
    java,
    sdk,
    fixtures,
    packageScripts,
    officialReferences,
    commandFindings,
    readinessGates: buildReadinessGates(java, sdk, fixtures, commandFindings),
    futureExperiment: buildFutureExperimentPlan(),
    blockers,
    warnings,
    redaction: {
      xmlBodyPrinted: false,
      signedXmlBodyPrinted: false,
      qrPayloadPrinted: false,
      privateKeyPrinted: false,
      certificateBodyPrinted: false,
      tokenPrinted: false,
      headerPrinted: false,
      requestResponseBodyPrinted: false,
      customerVendorPayloadPrinted: false,
    },
    evidencePolicy: {
      bodyPolicy: "metadata-only",
      signedXmlBodyCommitted: false,
      signedXmlBodyLogged: false,
      signedXmlBodyUploaded: false,
      qrPayloadBodyPersisted: false,
      privateMaterialPersisted: false,
      allowedFutureFields: [
        "runId",
        "timestamp",
        "sdkVersion",
        "javaVersion",
        "fixtureId",
        "fixtureType",
        "validationStatus",
        "safeWarningCodes",
        "safeErrorCodes",
        "noNetworkOnly",
        "redactionFlags",
        "productionCompliance",
      ],
    },
    ...(options.args?.plan ? { plan: buildPlanSummary(status) } : {}),
  };
}

function selectStatus(blockers) {
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_SDK_REFERENCE"))) {
    return "BLOCKED_MISSING_SDK_REFERENCE";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_GENERATED_FIXTURE"))) {
    return "BLOCKED_MISSING_GENERATED_FIXTURE";
  }
  if (blockers.some((blocker) => blocker.startsWith("BLOCKED_UNSUPPORTED_JAVA"))) {
    return "BLOCKED_UNSUPPORTED_JAVA";
  }
  return "BLOCKED_SIGNING_EXECUTION_DISABLED";
}

function buildReadinessGates(java, sdk, fixtures, commandFindings) {
  return [
    { id: "NO_NETWORK_ONLY", ready: true, notes: "No network calls are part of this planning command." },
    { id: "SDK_REFERENCE_PRESENT", ready: sdk.referenceFound && sdk.jarFound && sdk.configFound && sdk.usageFound, notes: "Official SDK files must be local and available by path." },
    { id: "JAVA_11_TO_14", ready: java.supported, notes: "Java >=11 <15 is required for any future SDK execution." },
    { id: "GENERATED_FIXTURES_PRESENT", ready: fixtures.generatedStandardInvoiceFound && fixtures.generatedCreditNoteFound, notes: "Future local experiment must use sanitized generated fixtures only." },
    { id: "DUMMY_MATERIAL_LOCAL_ONLY", ready: sdk.dummyCertificateFileFound && sdk.dummyPrivateKeyFileFound, notes: "SDK dummy material may only be used in an isolated temp experiment after explicit approval." },
    { id: "SIGN_COMMAND_DOCUMENTED", ready: commandFindings.signCommandDocumented, notes: "The SDK -sign command shape must remain source-backed by local official docs." },
    { id: "EXECUTION_APPROVAL", ready: false, notes: "No approval exists in this sprint; signing execution remains disabled." },
    { id: "EVIDENCE_METADATA_ONLY", ready: true, notes: "Future evidence must not include XML, signed XML, QR, certificate, private key, token, header, or request/response bodies." },
  ];
}

function buildFutureExperimentPlan() {
  return {
    currentSprintExecutesSigning: false,
    requiredFutureApproval: "Explicit local dummy signing dry-run approval in a separate sprint.",
    tempDirectoryOnly: true,
    writeXmlOutputNow: false,
    futureInputs: [
      STANDARD_FIXTURE,
      CREDIT_FIXTURE,
    ],
    futureCommandsPlannedOnly: [
      "fatoora -sign -invoice <unsigned-local-fixture.xml> -signedInvoice <temp-signed.xml>",
      "fatoora -qr -invoice <temp-signed.xml>",
      "fatoora -validate -invoice <temp-signed.xml>",
    ],
    cleanupRequired: true,
    evidenceBodyPolicy: "metadata-only",
  };
}

function buildPlanSummary(status) {
  return {
    currentPosture: status,
    signingExecutedThisSprint: false,
    recommendedNextStep: "Create a separate local dummy signing dry-run guard that still defaults to execution disabled and requires explicit approval before temp-only SDK signing.",
    nextPromptTitle: "ZATCA local dummy signing dry-run guard",
  };
}

function inspectSdk(repoRoot) {
  const readme = `${SDK_ROOT}/Readme/readme.md`;
  const usage = `${SDK_ROOT}/Configuration/usage.txt`;
  const config = `${SDK_ROOT}/Configuration/config.json`;
  const jar = `${SDK_ROOT}/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`;
  const certDir = `${SDK_ROOT}/Data/Certificates`;
  const cert = `${certDir}/cert.pem`;
  const privateKey = `${certDir}/ec-secp256k1-priv-key.pem`;
  const inputDir = `${SDK_ROOT}/Data/Input`;

  return {
    referenceFound: exists(repoRoot, SDK_ROOT),
    jarFound: exists(repoRoot, jar),
    readmeFound: exists(repoRoot, readme),
    usageFound: exists(repoRoot, usage),
    configFound: exists(repoRoot, config),
    certificateDirectoryFound: exists(repoRoot, certDir),
    dummyCertificateFileFound: exists(repoRoot, cert),
    dummyPrivateKeyFileFound: exists(repoRoot, privateKey),
    dummyCertificateBodyRead: false,
    dummyPrivateKeyBodyRead: false,
    inputDirectoryFound: exists(repoRoot, inputDir),
    sdkVersion: exists(repoRoot, jar) ? "238-R3.4.8" : null,
    inspectedRelativePaths: [readme, usage, config, jar, certDir, inputDir],
  };
}

function inspectFixtures(repoRoot) {
  return {
    generatedStandardInvoiceFound: exists(repoRoot, STANDARD_FIXTURE),
    generatedCreditNoteFound: exists(repoRoot, CREDIT_FIXTURE),
    generatedStandardInvoicePath: STANDARD_FIXTURE,
    generatedCreditNotePath: CREDIT_FIXTURE,
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
    csrCommandDocumented: /-csr\b/i.test(docs),
    dummyMaterialPolicyDocumented: /dummy\s+and\s+for\s+testing\s+purposes\s+only/i.test(docs),
    signCommandShape: "fatoora -sign -invoice <filename> -signedInvoice <filename>",
    qrCommandShape: "fatoora -qr -invoice <filename>",
    hashCommandShape: "fatoora -generateHash -invoice <filename>",
    validateCommandShape: "fatoora -validate -invoice <filename>",
    commandBodiesPrinted: false,
  };
}

function detectJava(env, runCommand) {
  const javaBin = cleanPath(env.ZATCA_SDK_JAVA_BIN) || "java";
  const result = runCommand(javaBin, ["-version"], { timeout: 5000 });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const version = parseJavaVersion(output);
  const majorVersion = parseJavaMajorVersion(version);
  const found = !result.error && Boolean(version);
  const supported = found && majorVersion >= 11 && majorVersion < 15;

  return {
    found,
    version,
    majorVersion,
    supported,
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
    .replace(/\b(authorization|token|secret|password|apiKey|certificate)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function formatHuman(plan) {
  return [
    `ZATCA local signed XML plan: ${plan.status}`,
    `Signing execution enabled: ${plan.signingExecutionEnabled ? "true" : "false"}`,
    `Java: ${plan.java.version || "not found"} (${plan.java.supported ? "supported" : "unsupported"})`,
    `SDK reference found: ${plan.sdk.referenceFound ? "true" : "false"}`,
    `Generated fixtures found: ${plan.fixtures.generatedStandardInvoiceFound && plan.fixtures.generatedCreditNoteFound ? "true" : "false"}`,
    `No network calls made: ${plan.networkCallsMade === false ? "true" : "false"}`,
    ...plan.blockers.map((blocker) => `- ${blocker}`),
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
        noNetworkOnly: false,
        networkCallsMade: false,
        signingExecutionEnabled: false,
        error: "--no-network is required for ZATCA local signed XML planning.",
      };
      const text = parsed.json ? JSON.stringify(payload, null, 2) : payload.error;
      io.error(text);
      return 2;
    }

    const plan = buildSignedXmlPlan({ args: parsed });
    const text = parsed.json ? JSON.stringify(plan, null, 2) : formatHuman(plan);
    io.log(text);
    return parsed.strict && plan.status.startsWith("BLOCKED_") ? 1 : 0;
  } catch (error) {
    const payload = {
      status: "ERROR",
      noNetworkOnly: Boolean(parsed?.noNetwork),
      networkCallsMade: false,
      signingExecutionEnabled: false,
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
  buildSignedXmlPlan,
  parseArgs,
  parseJavaMajorVersion,
  parseJavaVersion,
  runCli,
};
