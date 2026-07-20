const { spawnSync: defaultSpawnSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const VALIDATION_MODE = "OFFICIAL_SDK_VALIDATE_NO_NETWORK";
const ENVIRONMENT = "LOCAL_SDK_NO_NETWORK";
const REQUIRED_JAVA_RANGE = ">=11 <15";
const DEFAULT_TIMEOUT_MS = 60000;

const FIXTURES = [
  {
    id: "official-standard-invoice",
    label: "Official Standard Invoice",
    source: "official-sdk",
    fixtureType: "official",
    invoiceKind: "standard-invoice",
    standardOrSimplified: "standard",
    sdkRelativePath: "Data/Samples/Standard/Invoice/Standard_Invoice.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
  {
    id: "official-simplified-invoice",
    label: "Official Simplified Invoice",
    source: "official-sdk",
    fixtureType: "official",
    invoiceKind: "simplified-invoice",
    standardOrSimplified: "simplified",
    sdkRelativePath: "Data/Samples/Simplified/Invoice/Simplified_Invoice.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
  {
    id: "ledgerbyte-standard-invoice",
    aliases: ["ledgerbyte-local-standard-invoice"],
    label: "LedgerByte Local Standard Invoice Fixture",
    source: "ledgerbyte-local",
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "standard-invoice",
    standardOrSimplified: "standard",
    relativePath: "packages/zatca-core/fixtures/local-standard-tax-invoice.expected.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
  {
    id: "ledgerbyte-generated-standard-invoice",
    aliases: ["ledgerbyte-local-generated-standard-invoice"],
    label: "LedgerByte Generated Standard Invoice Fixture",
    source: "ledgerbyte-local-generated",
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "standard-invoice",
    standardOrSimplified: "standard",
    relativePath: "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
  {
    id: "ledgerbyte-credit-note",
    aliases: ["ledgerbyte-local-credit-note", "ledgerbyte-generated-credit-note", "ledgerbyte-local-generated-credit-note"],
    label: "LedgerByte Local Credit Note Fixture",
    source: "ledgerbyte-local",
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "credit-note",
    standardOrSimplified: "standard",
    relativePath: "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
  {
    id: "ledgerbyte-debit-note",
    label: "LedgerByte Local Debit Note Fixture",
    source: "ledgerbyte-local",
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "debit-note",
    standardOrSimplified: "standard",
    relativePath: "packages/zatca-core/fixtures/ledgerbyte-generated-debit-note.expected.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
  {
    id: "ledgerbyte-allowance-invoice",
    label: "LedgerByte Local Document Allowance Invoice Fixture",
    source: "ledgerbyte-local",
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "standard-invoice",
    standardOrSimplified: "standard",
    relativePath: "packages/zatca-core/fixtures/ledgerbyte-generated-allowance-invoice.expected.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
  {
    id: "ledgerbyte-multiline-invoice",
    label: "LedgerByte Local Multiple-Line VAT Invoice Fixture",
    source: "ledgerbyte-local",
    fixtureType: "ledgerbyte-generated",
    invoiceKind: "standard-invoice",
    standardOrSimplified: "standard",
    relativePath: "packages/zatca-core/fixtures/ledgerbyte-generated-multiline-invoice.expected.xml",
    expectedResult: "PASS_OR_SAFE_SDK_WARNING",
    bodyOutputForbidden: true,
  },
];

function parseArgs(argv) {
  const fixtures = [];
  let all = false;
  let json = false;
  let noNetworkRequested = false;
  let out = null;
  const warnings = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--fixture") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Provide a fixture id after --fixture.");
      }
      fixtures.push(value);
      index += 1;
    } else if (arg === "--all") {
      all = true;
    } else if (arg === "--no-network") {
      noNetworkRequested = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--out") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Provide a file or directory path after --out.");
      }
      out = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      return { help: true, fixtures: [], all, json, noNetworkRequested, noNetworkEnforced: true, out, warnings };
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!all && fixtures.length === 0) {
    throw new Error("Provide --fixture <id> or --all.");
  }
  if (all && fixtures.length > 0) {
    warnings.push("--all was provided; explicit --fixture values were ignored.");
  }
  if (!noNetworkRequested) {
    warnings.push("No-network mode is enforced by this wrapper even when --no-network is omitted.");
  }

  return {
    help: false,
    fixtures: all ? FIXTURES.map((fixture) => fixture.id) : fixtures,
    all,
    json,
    noNetworkRequested,
    noNetworkEnforced: true,
    out,
    warnings,
  };
}

function usage() {
  return [
    "Usage:",
    "  node scripts/zatca-sdk-validate-local.cjs --fixture official-standard-invoice --no-network --json",
    "  node scripts/zatca-sdk-validate-local.cjs --all --no-network --json --out docs/zatca/evidence/latest-local-sdk-validation.json",
    "",
    "Supported fixtures:",
    ...FIXTURES.map((fixture) => `  - ${fixture.id}`),
    "",
    "This wrapper only runs local SDK validation metadata. It does not call ZATCA, request CSID/OTP, sign, clear, report, or create PDF/A-3.",
  ].join("\n");
}

function resolveFixture(id) {
  return FIXTURES.find((fixture) => fixture.id === id || fixture.aliases?.includes(id)) || null;
}

function resolveRepoRoot(startDirectory = process.cwd()) {
  let current = path.resolve(startDirectory);
  for (;;) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml")) || fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.resolve(current, "..");
    if (parent === current) {
      return path.resolve(startDirectory);
    }
    current = parent;
  }
}

function discoverSdk(repoRoot, env = process.env) {
  const configuredJar = cleanPath(env.ZATCA_SDK_JAR_PATH);
  const sdkRoot = cleanPath(env.ZATCA_SDK_ROOT) || path.join(repoRoot, "reference", "zatca-einvoicing-sdk-Java-238-R3.4.8");
  const sdkJarPath = configuredJar || path.join(sdkRoot, "Apps", "zatca-einvoicing-sdk-238-R3.4.8.jar");
  const launcherPath =
    cleanPath(env.ZATCA_SDK_LAUNCHER_PATH) ||
    path.join(sdkRoot, "Apps", process.platform === "win32" ? "fatoora.bat" : "fatoora");
  const configDirPath = cleanPath(env.ZATCA_SDK_CONFIG_DIR) || path.join(sdkRoot, "Configuration");
  const jqPath = path.join(sdkRoot, "Configuration", process.platform === "win32" ? "jq.exe" : "jq");
  const appsJqPath = path.join(sdkRoot, "Apps", process.platform === "win32" ? "jq.exe" : "jq");
  const timeoutMs = clampTimeout(env.ZATCA_SDK_TIMEOUT_MS);

  const sdkJarFound = fs.existsSync(sdkJarPath);
  const launcherFound = fs.existsSync(launcherPath);
  const configDirFound = fs.existsSync(configDirPath) && fs.statSync(configDirPath).isDirectory();
  const sdkRootFound = fs.existsSync(sdkRoot) && fs.statSync(sdkRoot).isDirectory();
  const sdkVersion = sdkJarFound ? path.basename(sdkJarPath).replace(/^zatca-einvoicing-sdk-/, "").replace(/\.jar$/i, "") : null;
  const jqFound = fs.existsSync(jqPath) || fs.existsSync(appsJqPath);

  return {
    sdkRoot,
    sdkRootFound,
    sdkJarPath,
    sdkJarFound,
    launcherPath,
    launcherFound,
    configDirPath,
    configDirFound,
    jqPath: fs.existsSync(jqPath) ? jqPath : fs.existsSync(appsJqPath) ? appsJqPath : null,
    jqFound,
    sdkPathFound: sdkRootFound && sdkJarFound,
    sdkVersion,
    timeoutMs,
  };
}

function detectJava(javaBin, spawnSyncImpl = defaultSpawnSync) {
  const result = spawnSyncImpl(javaBin || "java", ["-version"], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const version = parseJavaVersion(output);
  const majorVersion = version ? parseJavaMajorVersion(version) : null;
  const found = !result.error && Boolean(version);
  return {
    found,
    javaVersion: version,
    javaMajorVersion: majorVersion,
    javaVersionSupported: majorVersion !== null && majorVersion >= 11 && majorVersion < 15,
    requiredJavaRange: REQUIRED_JAVA_RANGE,
  };
}

function parseJavaVersion(output) {
  const quoted = String(output || "").match(/version\s+"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const openJdk = String(output || "").match(/openjdk\s+([0-9][^\s]*)/i);
  return openJdk?.[1] || null;
}

function parseJavaMajorVersion(version) {
  const legacy = String(version || "").match(/^1\.(\d+)/);
  if (legacy?.[1]) return Number(legacy[1]);
  const modern = String(version || "").match(/^(\d+)/);
  return modern?.[1] ? Number(modern[1]) : null;
}

function runValidationSet(options) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const parsed = options.parsed || parseArgs(options.argv || []);
  const env = options.env || process.env;
  const spawnSyncImpl = options.spawnSync || defaultSpawnSync;
  const sdk = discoverSdk(repoRoot, env);
  const javaBin = cleanPath(env.ZATCA_SDK_JAVA_BIN) || "java";
  const java = detectJava(javaBin, spawnSyncImpl);
  const validationRunId = options.validationRunId || `zatca-sdk-local-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  const timestamp = options.timestamp || new Date().toISOString();
  const runWarnings = parsed.warnings || [];
  const runs = parsed.fixtures.map((fixtureId) =>
    runFixtureValidation({
      repoRoot,
      fixtureId,
      sdk,
      java,
      javaBin,
      spawnSyncImpl,
      env,
      validationRunId,
      timestamp,
      runWarnings,
    }),
  );
  const summary = {
    fixtureCount: runs.length,
    registeredFixtureCount: FIXTURES.length,
    uniqueXmlArtifactCount: new Set(runs.map((run) => run.fixturePath).filter(Boolean)).size,
    officialSampleCount: runs.filter((run) => run.fixtureType === "official").length,
    ledgerbyteGeneratedUniqueFixtureCount: new Set(runs.filter((run) => run.fixtureType === "ledgerbyte-generated").map((run) => run.fixturePath).filter(Boolean)).size,
    validFixtureCount: runs.length,
    invalidFixtureCount: 0,
    passedCount: runs.filter((run) => run.passed).length,
    failedCount: runs.filter((run) => run.status === "FAILED").length,
    blockedCount: runs.filter((run) => run.status === "BLOCKED").length,
    networkCallsMade: false,
    productionComplianceEnabled: false,
  };
  return {
    validationRunId,
    timestamp,
    environment: ENVIRONMENT,
    validationMode: VALIDATION_MODE,
    noNetworkOnly: true,
    sdkPathFound: sdk.sdkPathFound,
    javaVersion: java.javaVersion,
    sdkVersion: sdk.sdkVersion,
    summary,
    runs,
    xmlBodyPrinted: false,
    qrPayloadPrinted: false,
    privateKeyPrinted: false,
    tokenPrinted: false,
    headerPrinted: false,
    networkCallsMade: false,
    productionComplianceEnabled: false,
  };
}

function runFixtureValidation({ repoRoot, fixtureId, sdk, java, javaBin, spawnSyncImpl, env, validationRunId, timestamp, runWarnings }) {
  const fixture = resolveFixture(fixtureId);
  if (!fixture) {
    return blockedEvidence({
      validationRunId,
      timestamp,
      fixtureId,
      fixture: null,
      sdk,
      java,
      blockers: [`Unknown fixture id: ${fixtureId}`],
      safeErrorCodes: ["UNKNOWN_FIXTURE"],
      warnings: runWarnings,
    });
  }

  const fixturePath = resolveFixturePath({ repoRoot, fixture, sdk });
  const blockers = [];
  const safeErrorCodes = [];
  if (!fs.existsSync(fixturePath)) {
    blockers.push(`Fixture XML was not found for ${fixture.id}.`);
    safeErrorCodes.push("FIXTURE_NOT_FOUND");
  }
  if (!sdk.sdkPathFound) {
    blockers.push("Official ZATCA SDK JAR was not found under the local reference folder or configured SDK path.");
    safeErrorCodes.push("SDK_NOT_FOUND");
  }
  if (!sdk.configDirFound) {
    blockers.push("Official ZATCA SDK Configuration directory was not found.");
    safeErrorCodes.push("SDK_CONFIG_NOT_FOUND");
  }
  if (!java.found) {
    blockers.push("Java was not found for local SDK validation.");
    safeErrorCodes.push("JAVA_NOT_FOUND");
  } else if (!java.javaVersionSupported) {
    blockers.push(`Detected Java ${java.javaVersion || "unknown"} is outside the SDK-supported range ${REQUIRED_JAVA_RANGE}.`);
    safeErrorCodes.push("JAVA_VERSION_UNSUPPORTED");
  }

  if (blockers.length > 0) {
    return blockedEvidence({ validationRunId, timestamp, fixtureId: fixture.id, fixture, sdk, java, blockers, safeErrorCodes, warnings: runWarnings });
  }

  const commandPlan = buildValidationCommand({ sdk, fixturePath, javaBin });
  if (!commandPlan.command) {
    return blockedEvidence({
      validationRunId,
      timestamp,
      fixtureId: fixture.id,
      fixture,
      sdk,
      java,
      blockers: ["No executable SDK validation command could be resolved."],
      safeErrorCodes: ["SDK_COMMAND_NOT_RESOLVED"],
      warnings: [...runWarnings, ...commandPlan.warnings],
    });
  }

  const result = spawnSyncImpl(commandPlan.command, commandPlan.args, {
    cwd: sdk.sdkRoot,
    env: { ...process.env, ...env, ...commandPlan.envAdditions },
    encoding: "utf8",
    timeout: sdk.timeoutMs,
    windowsHide: true,
    maxBuffer: 5 * 1024 * 1024,
  });
  cleanupCommandPlan(commandPlan);
  const safe = summarizeSdkOutput([result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n"));
  const timedOut = Boolean(result.error && /timed out/i.test(String(result.error.message || "")));
  const passed = inferPassed(safe.textForInference, result.status);
  const safeErrorCodesFromOutput = timedOut ? ["SDK_VALIDATION_TIMEOUT"] : passed ? [] : safe.errorCodes;

  return {
    ...baseEvidence({ validationRunId, timestamp, fixtureId: fixture.id, fixture, sdk, java }),
    fixturePath: path.relative(repoRoot, fixturePath).replace(/\\/g, "/"),
    status: passed ? "PASSED" : "FAILED",
    passed,
    validationAttempted: true,
    sdkExitCode: typeof result.status === "number" ? result.status : null,
    warningsCount: safe.warningCodes.length + commandPlan.warnings.length + runWarnings.length,
    errorsCount: safeErrorCodesFromOutput.length + (passed ? 0 : 1),
    safeErrorCodes: safeErrorCodesFromOutput,
    safeWarningCodes: safe.warningCodes,
    blockers: timedOut ? ["Official SDK local validation timed out."] : [],
    warnings: [...runWarnings, ...commandPlan.warnings],
    command: {
      usedOfficialValidateCommand: true,
      displayCommand: commandPlan.displayCommand,
    },
  };
}

function resolveFixturePath({ repoRoot, fixture, sdk }) {
  if (fixture.fixtureType === "official" && fixture.sdkRelativePath) {
    return path.resolve(sdk.sdkRoot, fixture.sdkRelativePath);
  }
  return path.resolve(repoRoot, fixture.relativePath);
}

function buildValidationCommand({ sdk, fixturePath, javaBin }) {
  const warnings = ["SDK validation is local/no-network only; no CSID, signing, clearance, reporting, or PDF/A-3 command is used."];
  const envAdditions = {};
  const pathParts = [];
  if (sdk.configDirFound) {
    envAdditions.SDK_CONFIG = path.join(sdk.configDirPath, "config.json");
  }
  if (sdk.launcherFound) {
    envAdditions.FATOORA_HOME = path.dirname(sdk.launcherPath);
  }
  if (sdk.jqPath) {
    pathParts.push(path.dirname(sdk.jqPath));
  }
  if (javaBin && javaBin !== "java" && /[\\/]/.test(javaBin)) {
    pathParts.push(path.dirname(javaBin));
  }
  if (pathParts.length > 0) {
    const delimiter = process.platform === "win32" ? ";" : ":";
    envAdditions.PATH = `${pathParts.join(delimiter)}${delimiter}${process.env.PATH || process.env.Path || ""}`;
    if (process.platform === "win32") envAdditions.Path = envAdditions.PATH;
  }

  if (sdk.launcherFound) {
    if (process.platform === "win32" && /\.bat$/i.test(sdk.launcherPath)) {
      const workspace = prepareWindowsLauncherWorkspace(sdk);
      const launcherPath = workspace?.launcherPath || sdk.launcherPath;
      if (workspace) {
        envAdditions.SDK_CONFIG = workspace.configPath;
        envAdditions.FATOORA_HOME = workspace.appsDir;
        pathParts.unshift(workspace.appsDir);
        applyPathEnv(envAdditions, pathParts);
      }
      const command = process.env.ComSpec || path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe");
      const args = ["/d", "/c", launcherPath, "-validate", "-invoice", fixturePath];
      return {
        command,
        args,
        envAdditions,
        cleanupPaths: workspace?.cleanupPaths || [],
        warnings: [
          ...warnings,
          "Uses cmd.exe argument-array execution only to run the official Windows fatoora.bat launcher.",
          ...(workspace ? ["Uses an isolated temporary no-space SDK launcher workspace with a generated local config."] : []),
        ],
        displayCommand: `fatoora -validate -invoice ${path.basename(fixturePath)}`,
      };
    }
    return {
      command: sdk.launcherPath,
      args: ["-validate", "-invoice", fixturePath],
      envAdditions,
      cleanupPaths: [],
      warnings,
      displayCommand: `fatoora -validate -invoice ${path.basename(fixturePath)}`,
    };
  }

  if (sdk.sdkJarFound) {
    return {
      command: javaBin || "java",
      args: ["-jar", sdk.sdkJarPath, "-validate", "-invoice", fixturePath],
      envAdditions,
      cleanupPaths: [],
      warnings: [...warnings, "Direct JAR execution is a fallback; prefer the official fatoora launcher when available."],
      displayCommand: `java -jar ${path.basename(sdk.sdkJarPath)} -validate -invoice ${path.basename(fixturePath)}`,
    };
  }

  return { command: null, args: [], envAdditions, warnings, displayCommand: "" };
}

function applyPathEnv(envAdditions, pathParts) {
  if (pathParts.length === 0) return;
  const delimiter = process.platform === "win32" ? ";" : ":";
  envAdditions.PATH = `${pathParts.join(delimiter)}${delimiter}${process.env.PATH || process.env.Path || ""}`;
  if (process.platform === "win32") envAdditions.Path = envAdditions.PATH;
}

function prepareWindowsLauncherWorkspace(sdk) {
  try {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-sdk-cli-"));
    const appsDir = path.join(tempRoot, "Apps");
    const configDir = path.join(tempRoot, "Configuration");
    fs.mkdirSync(appsDir, { recursive: true });
    fs.mkdirSync(configDir, { recursive: true });
    for (const fileName of ["fatoora.bat", "fatoora", "global.json", "jq.exe", path.basename(sdk.sdkJarPath)]) {
      const source = fileName === path.basename(sdk.sdkJarPath) ? sdk.sdkJarPath : path.join(path.dirname(sdk.launcherPath), fileName);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(appsDir, fileName));
      }
    }
    const configPath = path.join(configDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(buildSdkConfig(sdk.sdkRoot), null, 2), "utf8");
    return {
      appsDir,
      configPath,
      launcherPath: path.join(appsDir, "fatoora.bat"),
      cleanupPaths: [tempRoot],
    };
  } catch {
    return null;
  }
}

function buildSdkConfig(sdkRoot) {
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

function cleanupCommandPlan(commandPlan) {
  for (const cleanupPath of commandPlan.cleanupPaths || []) {
    const resolved = path.resolve(cleanupPath);
    const tempRoot = path.resolve(os.tmpdir());
    if (resolved.startsWith(tempRoot)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function blockedEvidence({ validationRunId, timestamp, fixtureId, fixture, sdk, java, blockers, safeErrorCodes, warnings }) {
  return {
    ...baseEvidence({ validationRunId, timestamp, fixtureId, fixture, sdk, java }),
    status: "BLOCKED",
    passed: false,
    validationAttempted: false,
    sdkExitCode: null,
    warningsCount: warnings.length,
    errorsCount: blockers.length,
    safeErrorCodes,
    safeWarningCodes: [],
    blockers,
    warnings,
    command: {
      usedOfficialValidateCommand: false,
      displayCommand: "fatoora -validate -invoice <fixture.xml>",
    },
  };
}

function baseEvidence({ validationRunId, timestamp, fixtureId, fixture, sdk, java }) {
  return {
    validationRunId,
    timestamp,
    environment: ENVIRONMENT,
    sdkPathFound: sdk.sdkPathFound,
    javaVersion: java.javaVersion,
    sdkVersion: sdk.sdkVersion,
    fixtureId,
    fixturePath: null,
    fixtureType: fixture?.fixtureType ?? "unknown",
    invoiceKind: fixture?.invoiceKind ?? "unknown",
    validationMode: VALIDATION_MODE,
    hashGenerated: false,
    xmlBodyPrinted: false,
    qrPayloadPrinted: false,
    privateKeyPrinted: false,
    tokenPrinted: false,
    headerPrinted: false,
    networkCallsMade: false,
    productionComplianceEnabled: false,
    realNetworkCallsEnabled: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
  };
}

function summarizeSdkOutput(output) {
  const sanitized = sanitizeText(output);
  const lines = sanitized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const warningCodes = unique(extractCodes(lines.filter((line) => /warning/i.test(line)).join("\n")));
  const errorCodes = unique(extractCodes(lines.filter((line) => /error|not pass|failed|^code\s*:/i.test(line)).join("\n")));
  return {
    warningCodes,
    errorCodes,
    textForInference: lines.filter((line) => /GLOBAL VALIDATION RESULT|VALIDATION RESULT|PASS|NOT PASS|FAILED|ERROR/i.test(line)).join("\n"),
  };
}

function sanitizeText(value) {
  return String(value || "")
    .replace(/<\?xml[\s\S]*?<\/(?:Invoice|CreditNote|DebitNote)>/gi, "[REDACTED_XML_BODY]")
    .replace(/<(?:Invoice|CreditNote|DebitNote)\b[\s\S]*?<\/(?:Invoice|CreditNote|DebitNote)>/gi, "[REDACTED_XML_BODY]")
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY]")
    .replace(/(password|passwordHash|token|tokenHash|secret|apiKey|accessKey|privateKey|privateKeyPem|authorization|contentBase64)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/(DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|JWT_SECRET|S3_SECRET_ACCESS_KEY)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, 8000);
}

function extractCodes(value) {
  const matches = String(value || "").match(/\b(?:BR-KSA|BR|KSA|EN|UBL|XSD|QRCODE|SIGNATURE|CERTIFICATE)[A-Z0-9._:-]*\b/gi);
  return matches || [];
}

function inferPassed(output, exitCode) {
  if (exitCode !== 0) return false;
  const value = String(output || "");
  if (/\bNOT PASS\b/i.test(value) || /\bFAILED\b/i.test(value)) return false;
  if (/\bPASS\b/i.test(value) || /GLOBAL\s+VALIDATION\s+RESULT\s*=\s*PASSED/i.test(value)) return true;
  return true;
}

function writeEvidence(out, evidence, cwd = process.cwd()) {
  if (!out) return null;
  const target = resolveOutPath(out, evidence, cwd);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return target;
}

function resolveOutPath(out, evidence, cwd) {
  const resolved = path.resolve(cwd, out);
  if (/\.json$/i.test(resolved)) {
    return resolved;
  }
  return path.join(resolved, `${evidence.validationRunId}.json`);
}

function cleanPath(value) {
  const trimmed = String(value || "").trim();
  return trimmed ? path.resolve(trimmed) : null;
}

function clampTimeout(value) {
  const parsed = Number(String(value || "").trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(parsed, 120000);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

module.exports = {
  ENVIRONMENT,
  FIXTURES,
  REQUIRED_JAVA_RANGE,
  VALIDATION_MODE,
  buildValidationCommand,
  detectJava,
  discoverSdk,
  inferPassed,
  parseArgs,
  parseJavaMajorVersion,
  parseJavaVersion,
  resolveFixturePath,
  resolveFixture,
  runValidationSet,
  sanitizeText,
  summarizeSdkOutput,
  usage,
  writeEvidence,
};
