#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REQUIRED_JAVA_RANGE = ">=11 <15";
const SDK_ROOT = "reference/zatca-einvoicing-sdk-Java-238-R3.4.8";
const GENERATED_STANDARD_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml";
const GENERATED_CREDIT_FIXTURE = "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml";
const GENERATED_STANDARD_INPUT = "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.input.json";
const GENERATED_CREDIT_INPUT = "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.input.json";

const REQUIRED_SCRIPTS = [
  "zatca:sdk-validate-local",
  "zatca:generate-local-xml-fixtures",
  "test:zatca-sdk-validate-local",
  "zatca:sdk-ci-readiness",
  "test:zatca-sdk-ci-readiness",
];

const OFFICIAL_REFERENCE_FILES = [
  `${SDK_ROOT}/Readme/readme.md`,
  `${SDK_ROOT}/Configuration/usage.txt`,
  `${SDK_ROOT}/Apps/fatoora`,
  `${SDK_ROOT}/Apps/fatoora.bat`,
  `${SDK_ROOT}/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`,
  `${SDK_ROOT}/Configuration/config.json`,
  `${SDK_ROOT}/Data/Samples/Standard/Invoice/Standard_Invoice.xml`,
  `${SDK_ROOT}/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`,
  `${SDK_ROOT}/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`,
  `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`,
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
    "  node scripts/zatca-sdk-ci-readiness.cjs --plan --no-network --json",
    "  node scripts/zatca-sdk-ci-readiness.cjs --plan --no-network --json --strict",
    "",
    "This guard inspects no-network SDK CI readiness metadata only.",
    "It does not validate XML, sign invoices, request OTP/CSID, call ZATCA, clear/report, create PDF/A-3, deploy, migrate, seed, reset, delete, or send email.",
  ].join("\n");
}

function buildReadiness(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const runCommand = options.runCommand || defaultRunCommand;
  const args = options.args || { plan: false };

  const java = detectJava(env, runCommand);
  const sdk = inspectSdk(repoRoot, platform, runCommand);
  const fixtures = inspectFixtures(repoRoot);
  const packageScripts = inspectPackageScripts(repoRoot);
  const launcher = inspectLauncherCompatibility(sdk, platform);
  const ciEnv = inspectCi(env);
  const blockers = [];
  const warnings = [];

  if (!sdk.referenceFound || !sdk.jarFound || !sdk.configFound || !sdk.rulesFound || !sdk.schemasFound || !sdk.samplesFound) {
    blockers.push("CI_BLOCKED_MISSING_SDK_REFERENCE: required local official SDK reference files are missing.");
  }

  if (sdk.gitTrackingKnown && sdk.requiredReferenceFilesTracked === false) {
    blockers.push("CI_BLOCKED_MISSING_SDK_REFERENCE: official SDK reference files are local/ignored and are not available from a fresh repository checkout.");
  }

  if (!fixtures.registryFound || !fixtures.generatedStandardInvoiceFound || !fixtures.generatedCreditNoteFound) {
    blockers.push("CI_BLOCKED_MISSING_GENERATED_FIXTURE: generated fixture registry or deterministic fixture paths are missing.");
  }

  if (!packageScripts.allRequiredFound) {
    blockers.push("CI_BLOCKED_MISSING_PACKAGE_SCRIPT: required local ZATCA wrapper package scripts are missing.");
  }

  if (!java.found || !java.supported) {
    blockers.push("CI_BLOCKED_JAVA_RUNTIME: Java must be available and within the official SDK range >=11 <15.");
  }

  if (launcher.windowsLauncherOnly && platform !== "win32") {
    blockers.push("CI_BLOCKED_WINDOWS_LAUNCHER_ONLY: only the Windows SDK launcher is present for a non-Windows runner.");
  }

  if (sdk.referenceIgnored === true) {
    blockers.push("CI_BLOCKED_LICENSE_OR_REFERENCE_POLICY: reference/ is ignored locally, so CI SDK acquisition/reference policy is not approved.");
  }

  if (ciEnv.isCi && env.ZATCA_SDK_CI_METADATA_ARTIFACTS_APPROVED !== "true") {
    blockers.push("CI_BLOCKED_ARTIFACT_RETENTION_POLICY: metadata evidence artifact retention/redaction approval is not recorded.");
  } else if (!ciEnv.isCi) {
    warnings.push("CI artifact retention policy is not approved; keep evidence metadata local until retention/redaction policy is accepted.");
  }

  if (!ciEnv.isCi && sdk.referenceFound && !sdk.gitTrackingKnown) {
    warnings.push("Git tracking could not be inspected; CI repeatability cannot be proven from this workspace metadata alone.");
  }

  const status = selectStatus(blockers, ciEnv.isCi);
  const ciReady = status === "CI_READY_NO_NETWORK";

  return {
    status,
    noNetworkOnly: true,
    networkCallsMade: false,
    productionComplianceEnabled: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    sdkValidationExecuted: false,
    java,
    sdk,
    fixtures,
    packageScripts,
    launcher,
    ci: {
      isCi: ciEnv.isCi,
      provider: ciEnv.provider,
      ciReady,
      blockers,
      warnings,
    },
    redaction: {
      xmlBodyPrinted: false,
      qrPayloadPrinted: false,
      privateKeyPrinted: false,
      certificateBodyPrinted: false,
      tokenPrinted: false,
      headerPrinted: false,
    },
    ...(args.plan ? { plan: buildPlan(status) } : {}),
  };
}

function selectStatus(blockers, isCi) {
  if (blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_MISSING_SDK_REFERENCE"))) {
    return "CI_BLOCKED_MISSING_SDK_REFERENCE";
  }
  if (blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_JAVA_RUNTIME"))) {
    return "CI_BLOCKED_JAVA_RUNTIME";
  }
  if (blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_WINDOWS_LAUNCHER_ONLY"))) {
    return "CI_BLOCKED_WINDOWS_LAUNCHER_ONLY";
  }
  if (blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_LICENSE_OR_REFERENCE_POLICY"))) {
    return "CI_BLOCKED_LICENSE_OR_REFERENCE_POLICY";
  }
  if (blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_ARTIFACT_RETENTION_POLICY"))) {
    return "CI_BLOCKED_ARTIFACT_RETENTION_POLICY";
  }
  if (blockers.length > 0) {
    return "CI_BLOCKED_MISSING_SDK_REFERENCE";
  }
  return isCi ? "CI_READY_NO_NETWORK" : "LOCAL_ONLY_READY";
}

function buildPlan(status) {
  return {
    currentPosture: status,
    prCiWorkflowChangeIncluded: false,
    sdkValidationEnabledInGitHubActions: false,
    recommendedApproach:
      "Keep PR CI non-ZATCA for now. After reference/licensing and artifact-retention approval, use GitHub Actions setup-java with Java 11-14 and repo-approved SDK acquisition for metadata-only no-network validation.",
    rejectedApproach:
      "Do not upload XML fixture bodies, QR payloads, signed XML, private material, request/response bodies, or raw SDK stdout/stderr as CI artifacts.",
  };
}

function inspectCi(env) {
  if (env.GITHUB_ACTIONS === "true") {
    return { isCi: true, provider: "github-actions" };
  }
  if (env.CI === "true") {
    return { isCi: true, provider: "generic-ci" };
  }
  return { isCi: false, provider: "local" };
}

function inspectSdk(repoRoot, platform, runCommand) {
  const jar = `${SDK_ROOT}/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`;
  const windowsLauncher = `${SDK_ROOT}/Apps/fatoora.bat`;
  const posixLauncher = `${SDK_ROOT}/Apps/fatoora`;
  const config = `${SDK_ROOT}/Configuration/config.json`;
  const usage = `${SDK_ROOT}/Configuration/usage.txt`;
  const schematron = `${SDK_ROOT}/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`;
  const schema = `${SDK_ROOT}/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`;
  const sample = `${SDK_ROOT}/Data/Samples/Standard/Invoice/Standard_Invoice.xml`;

  const git = inspectGitReferenceTracking(repoRoot, runCommand);
  const referenceIgnored = inspectGitIgnore(repoRoot, jar, runCommand);

  return {
    referenceFound: exists(repoRoot, SDK_ROOT),
    referenceTracked: git.referenceTracked,
    gitTrackingKnown: git.known,
    requiredReferenceFilesTracked: git.requiredFilesTracked,
    referenceIgnored,
    launcherFound: platform === "win32" ? exists(repoRoot, windowsLauncher) : exists(repoRoot, posixLauncher),
    windowsLauncherFound: exists(repoRoot, windowsLauncher),
    posixLauncherFound: exists(repoRoot, posixLauncher),
    jarFound: exists(repoRoot, jar),
    configFound: exists(repoRoot, config),
    usageFound: exists(repoRoot, usage),
    rulesFound: exists(repoRoot, schematron),
    schemasFound: exists(repoRoot, schema),
    samplesFound: exists(repoRoot, sample),
    sdkVersion: exists(repoRoot, jar) ? "238-R3.4.8" : null,
    referencePolicy: referenceIgnored ? "LOCAL_IGNORED_REFERENCE" : git.requiredFilesTracked ? "REPO_TRACKED_REFERENCE" : "UNKNOWN_OR_LOCAL_REFERENCE",
    inspectedRelativePaths: [
      SDK_ROOT,
      jar,
      windowsLauncher,
      posixLauncher,
      config,
      usage,
      schematron,
      schema,
      sample,
    ],
  };
}

function inspectGitReferenceTracking(repoRoot, runCommand) {
  if (!fs.existsSync(path.join(repoRoot, ".git"))) {
    return { known: false, referenceTracked: false, requiredFilesTracked: false };
  }

  const tracked = OFFICIAL_REFERENCE_FILES.map((relativePath) => {
    const result = runCommand("git", ["ls-files", "--error-unmatch", "--", relativePath], { cwd: repoRoot });
    return result.status === 0;
  });

  return {
    known: true,
    referenceTracked: tracked.some(Boolean),
    requiredFilesTracked: tracked.every(Boolean),
  };
}

function inspectGitIgnore(repoRoot, relativePath, runCommand) {
  if (!fs.existsSync(path.join(repoRoot, ".git"))) {
    return null;
  }
  const result = runCommand("git", ["check-ignore", "--quiet", "--", relativePath], { cwd: repoRoot });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return null;
}

function inspectFixtures(repoRoot) {
  return {
    registryFound: exists(repoRoot, "docs/zatca/ZATCA_SDK_FIXTURE_REGISTRY.md"),
    generatedStandardInvoiceFound: exists(repoRoot, GENERATED_STANDARD_FIXTURE),
    generatedCreditNoteFound: exists(repoRoot, GENERATED_CREDIT_FIXTURE),
    generatedStandardInvoiceInputFound: exists(repoRoot, GENERATED_STANDARD_INPUT),
    generatedCreditNoteInputFound: exists(repoRoot, GENERATED_CREDIT_INPUT),
    generatedStandardInvoicePath: GENERATED_STANDARD_FIXTURE,
    generatedCreditNotePath: GENERATED_CREDIT_FIXTURE,
  };
}

function inspectPackageScripts(repoRoot) {
  const packagePath = path.join(repoRoot, "package.json");
  const scripts = {};
  if (!fs.existsSync(packagePath)) {
    return {
      packageJsonFound: false,
      allRequiredFound: false,
      scripts,
    };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    for (const scriptName of REQUIRED_SCRIPTS) {
      scripts[scriptName] = Boolean(pkg.scripts?.[scriptName]);
    }
    return {
      packageJsonFound: true,
      allRequiredFound: REQUIRED_SCRIPTS.every((scriptName) => scripts[scriptName]),
      scripts,
    };
  } catch {
    return {
      packageJsonFound: true,
      allRequiredFound: false,
      scripts,
    };
  }
}

function inspectLauncherCompatibility(sdk, platform) {
  const platformLauncherFound = platform === "win32" ? sdk.windowsLauncherFound : sdk.posixLauncherFound;
  return {
    osPlatform: platform,
    osType: os.type(),
    windowsLauncherFound: sdk.windowsLauncherFound,
    posixLauncherFound: sdk.posixLauncherFound,
    platformLauncherFound,
    windowsLauncherOnly: sdk.windowsLauncherFound && !sdk.posixLauncherFound,
    linuxRunnerMetadataOnly: platform !== "win32" && !platformLauncherFound,
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

function cleanPath(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function defaultRunCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    timeout: options.timeout || 5000,
    windowsHide: true,
  });
}

function sanitizeError(error) {
  return String(error?.message || error)
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY]")
    .replace(/\b(authorization|token|secret|password|apiKey)\b\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

function formatHuman(readiness) {
  return [
    `ZATCA SDK CI readiness: ${readiness.status}`,
    `CI ready: ${readiness.ci.ciReady ? "true" : "false"}`,
    `Java: ${readiness.java.version || "not found"} (${readiness.java.supported ? "supported" : "unsupported"})`,
    `SDK reference found: ${readiness.sdk.referenceFound ? "true" : "false"}`,
    `SDK reference tracked for fresh checkout: ${readiness.sdk.requiredReferenceFilesTracked ? "true" : "false"}`,
    `No network calls made: ${readiness.networkCallsMade === false ? "true" : "false"}`,
    ...readiness.ci.blockers.map((blocker) => `- ${blocker}`),
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
        error: "--no-network is required for ZATCA SDK CI readiness inspection.",
      };
      const text = parsed.json ? JSON.stringify(payload, null, 2) : payload.error;
      io.error(text);
      return 2;
    }

    const readiness = buildReadiness({ args: parsed });
    const text = parsed.json ? JSON.stringify(readiness, null, 2) : formatHuman(readiness);
    io.log(text);
    return parsed.strict && readiness.status !== "CI_READY_NO_NETWORK" && readiness.status !== "LOCAL_ONLY_READY" ? 1 : 0;
  } catch (error) {
    const payload = {
      status: "ERROR",
      noNetworkOnly: Boolean(parsed?.noNetwork),
      networkCallsMade: false,
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
  buildReadiness,
  parseArgs,
  parseJavaMajorVersion,
  parseJavaVersion,
  runCli,
};
