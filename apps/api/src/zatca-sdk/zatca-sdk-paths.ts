import { spawnSync } from "node:child_process";
import { constants, existsSync, readdirSync, statSync, accessSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve, win32 } from "node:path";
import { cwd, env, platform } from "node:process";

export interface JavaProbeResult {
  found: boolean;
  version: string | null;
  majorVersion: number | null;
  rawOutput?: string;
}

export interface ZatcaSdkReadiness {
  enabled: boolean;
  referenceFolderFound: boolean;
  sdkJarFound: boolean;
  fatooraLauncherFound: boolean;
  jqFound: boolean;
  configDirFound: boolean;
  workingDirectoryWritable: boolean;
  supportedCommandsKnown: boolean;
  javaFound: boolean;
  javaVersion: string | null;
  javaMajorVersion: number | null;
  javaVersionSupported: boolean;
  detectedJavaVersion: string | null;
  javaSupported: boolean;
  requiredJavaRange: string;
  javaBinUsed: string;
  javaBlockerMessage: string | null;
  sdkCommand: string;
  projectPathHasSpaces: boolean;
  canAttemptSdkValidation: boolean;
  canRunLocalValidation: boolean;
  blockingReasons: string[];
  warnings: string[];
  suggestedFixes: string[];
  referenceFolderPath?: string;
  sdkRootPath?: string;
  sdkJarPath?: string;
  fatooraLauncherPath?: string;
  jqPath?: string;
  configDirPath?: string;
  workDir: string;
  javaCommand: string;
  timeoutMs: number;
  projectRoot: string;
}

export interface ZatcaSdkDiscoveryOptions {
  projectRoot?: string;
  startDirectory?: string;
  platform?: NodeJS.Platform | string;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  runCommand?: (command: string, args: string[]) => { status: number | null; stdout?: string | Buffer; stderr?: string | Buffer; error?: unknown };
}

export interface ZatcaSdkValidationCommandInput {
  xmlFilePath: string;
  sdkJarPath?: string | null;
  launcherPath?: string | null;
  jqPath?: string | null;
  configDirPath?: string | null;
  workingDirectory: string;
  platform: NodeJS.Platform | string;
  javaFound?: boolean;
  javaCommand?: string;
}

export interface ZatcaSdkCsrCommandInput {
  csrConfigFilePath: string;
  privateKeyFilePath: string;
  generatedCsrFilePath: string;
  sdkJarPath?: string | null;
  launcherPath?: string | null;
  jqPath?: string | null;
  configDirPath?: string | null;
  workingDirectory: string;
  platform: NodeJS.Platform | string;
  javaFound?: boolean;
  javaCommand?: string;
}

export interface ZatcaSdkValidationCommandPlan {
  command: string | null;
  args: string[];
  displayCommand: string;
  envAdditions: Record<string, string>;
  workingDirectory: string;
  warnings: string[];
}

export interface ZatcaSdkExecutionConfig {
  enabled: boolean;
  sdkJarPath?: string;
  configDir?: string;
  workDir: string;
  javaBin: string;
  timeoutMs: number;
}

const DEFAULT_ZATCA_SDK_TIMEOUT_MS = 30000;
export const ZATCA_SDK_REQUIRED_JAVA_RANGE = ">=11 <15";
export const ZATCA_SDK_VALIDATE_COMMAND = "fatoora -validate -invoice <filename>";
export const ZATCA_SDK_GENERATE_HASH_COMMAND = "fatoora -generateHash -invoice <filename>";
export const ZATCA_SDK_SIGN_COMMAND = "fatoora -sign -invoice <filename> -signedInvoice <filename>";
export const ZATCA_SDK_CSR_COMMAND = "fatoora -csr -csrConfig <filename> -privateKey <filename> -generatedCsr <filename> -pem";

export function discoverZatcaSdkReadiness(options: ZatcaSdkDiscoveryOptions = {}): ZatcaSdkReadiness {
  const projectRoot = resolve(options.projectRoot ?? findProjectRoot(options.startDirectory ?? cwd()));
  const currentPlatform = options.platform ?? platform;
  const executionConfig = readZatcaSdkExecutionConfig(options.env, projectRoot);
  const referenceFolderPath = join(projectRoot, "reference");
  const referenceFolderFound = existsSync(referenceFolderPath);
  const configuredSdkRoot = executionConfig.sdkJarPath && existsSync(executionConfig.sdkJarPath) ? dirname(dirname(executionConfig.sdkJarPath)) : undefined;
  const configuredFiles =
    configuredSdkRoot && existsSync(configuredSdkRoot) && statSync(configuredSdkRoot).isDirectory() ? listFiles(configuredSdkRoot) : [];
  const files = [...configuredFiles, ...(referenceFolderFound ? listFiles(referenceFolderPath) : [])];
  const sdkJarPath = executionConfig.sdkJarPath || files.find((file) => /zatca-einvoicing-sdk.*\.jar$/i.test(file));
  const launcherPath = findLauncher(files, currentPlatform);
  const jqPath = files.find((file) => /(?:^|[\\/])jq(?:\.exe)?$/i.test(file));
  const configDirPath = executionConfig.configDir || findConfigDir(files, sdkJarPath);
  const sdkRootPath = findSdkRoot(sdkJarPath, configDirPath, launcherPath);
  const java = detectJava(options.runCommand, executionConfig.javaBin);
  const javaVersionSupported = java.found && java.majorVersion !== null && java.majorVersion >= 11 && java.majorVersion < 15;
  const javaBlockerMessage = !java.found
    ? "Java was not found."
    : !javaVersionSupported
      ? `Detected Java ${java.version ?? "unknown"} is outside the SDK-supported range ${ZATCA_SDK_REQUIRED_JAVA_RANGE}.`
      : null;
  const projectPathHasSpaces = /\s/.test(projectRoot);
  const configDirFound = Boolean(configDirPath && existsSync(configDirPath) && statSync(configDirPath).isDirectory());
  const workingDirectoryWritable = canWriteToDirectory(executionConfig.workDir);
  const supportedCommandsKnown = Boolean(sdkJarPath || launcherPath);
  const canAttemptSdkValidation = referenceFolderFound && Boolean(sdkJarPath) && javaVersionSupported && supportedCommandsKnown;
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const suggestedFixes: string[] = [];

  if (!executionConfig.enabled) {
    blockingReasons.push("ZATCA SDK local execution is disabled. Set ZATCA_SDK_EXECUTION_ENABLED=true to run local-only SDK validation.");
  }
  if (!referenceFolderFound) {
    blockingReasons.push("Local ZATCA reference folder was not found.");
    warnings.push("Local ZATCA reference folder was not found.");
    suggestedFixes.push("Place the official ZATCA SDK/docs under the repo-local reference/ folder.");
  }
  if (!sdkJarPath) {
    blockingReasons.push("ZATCA Java SDK JAR was not found.");
    warnings.push("ZATCA Java SDK JAR was not found under reference/.");
    suggestedFixes.push("Verify the SDK archive has been extracted and contains zatca-einvoicing-sdk-*.jar.");
  }
  if (!launcherPath) {
    warnings.push("fatoora SDK launcher was not found under reference/.");
    suggestedFixes.push("Verify the SDK Apps/fatoora or Apps/fatoora.bat launcher exists.");
  }
  if (!jqPath) {
    warnings.push("jq helper was not found under the SDK folder.");
    suggestedFixes.push("Keep the SDK-provided jq executable available when using the fatoora launcher.");
  }
  if (!configDirFound) {
    blockingReasons.push("ZATCA SDK configuration directory was not found.");
    warnings.push("ZATCA SDK configuration directory was not found.");
    suggestedFixes.push("Set ZATCA_SDK_CONFIG_DIR to the SDK Configuration folder or keep Configuration/ beside Apps/.");
  }
  if (!workingDirectoryWritable) {
    blockingReasons.push("ZATCA SDK work directory is not writable.");
    warnings.push("ZATCA SDK work directory is not writable.");
    suggestedFixes.push("Set ZATCA_SDK_WORK_DIR to a writable temporary folder.");
  }
  if (!java.found) {
    blockingReasons.push(javaBlockerMessage ?? "Java was not found.");
    warnings.push("Java was not found on PATH.");
    suggestedFixes.push("Install a Java runtime compatible with the ZATCA SDK before enabling local SDK validation.");
  } else if (!javaVersionSupported) {
    blockingReasons.push(javaBlockerMessage ?? "Detected Java version is outside the SDK-supported range.");
    warnings.push(`Detected Java ${java.version ?? "unknown"}, but the SDK readme expects Java ${ZATCA_SDK_REQUIRED_JAVA_RANGE}.`);
    suggestedFixes.push("Use a pinned Java 11-14 runtime or a Docker wrapper for SDK validation.");
  }
  if (!supportedCommandsKnown) {
    blockingReasons.push("No supported local SDK validation command could be resolved.");
    warnings.push("No supported local SDK validation command could be resolved.");
  }
  if (projectPathHasSpaces) {
    warnings.push("Project path contains spaces, which previously broke the SDK Windows batch launcher.");
    suggestedFixes.push("Use the dry-run command plan, a Docker wrapper, or a no-space temp SDK path before enabling execution.");
  }
  const canRunLocalValidation =
    executionConfig.enabled &&
    canAttemptSdkValidation &&
    configDirFound &&
    workingDirectoryWritable &&
    blockingReasons.length === 0;

  return {
    enabled: executionConfig.enabled,
    referenceFolderFound,
    sdkJarFound: Boolean(sdkJarPath),
    fatooraLauncherFound: Boolean(launcherPath),
    jqFound: Boolean(jqPath),
    configDirFound,
    workingDirectoryWritable,
    supportedCommandsKnown,
    javaFound: java.found,
    javaVersion: java.version,
    javaMajorVersion: java.majorVersion,
    javaVersionSupported,
    detectedJavaVersion: java.version,
    javaSupported: javaVersionSupported,
    requiredJavaRange: ZATCA_SDK_REQUIRED_JAVA_RANGE,
    javaBinUsed: executionConfig.javaBin,
    javaBlockerMessage,
    sdkCommand: ZATCA_SDK_VALIDATE_COMMAND,
    projectPathHasSpaces,
    canAttemptSdkValidation,
    canRunLocalValidation,
    blockingReasons,
    warnings,
    suggestedFixes,
    referenceFolderPath: referenceFolderFound ? referenceFolderPath : undefined,
    sdkRootPath,
    sdkJarPath,
    fatooraLauncherPath: launcherPath,
    jqPath,
    configDirPath: configDirFound ? configDirPath : undefined,
    workDir: executionConfig.workDir,
    javaCommand: executionConfig.javaBin,
    timeoutMs: executionConfig.timeoutMs,
    projectRoot,
  };
}

export function buildZatcaSdkValidationCommand(input: ZatcaSdkValidationCommandInput): ZatcaSdkValidationCommandPlan {
  return buildZatcaSdkCommand(input, "validate");
}

export function buildZatcaSdkGenerateHashCommand(input: ZatcaSdkValidationCommandInput): ZatcaSdkValidationCommandPlan {
  return buildZatcaSdkCommand(input, "generateHash");
}

export function buildZatcaSdkSigningCommand(input: ZatcaSdkValidationCommandInput & { signedInvoiceFilePath?: string | null }): ZatcaSdkValidationCommandPlan {
  return buildZatcaSdkCommand(input, "sign");
}

export function buildZatcaSdkCsrCommand(input: ZatcaSdkCsrCommandInput): ZatcaSdkValidationCommandPlan {
  const currentPlatform = input.platform;
  const warnings: string[] = [
    "Use argument-array execution for this SDK CSR command; do not concatenate a shell string.",
    `Uses the SDK readme documented command: ${ZATCA_SDK_CSR_COMMAND}.`,
  ];
  const envAdditions: Record<string, string> = {};
  const pathPrepend: string[] = [];

  if (!input.csrConfigFilePath.trim()) {
    warnings.push("CSR config file path is missing.");
  }
  if (!input.privateKeyFilePath.trim()) {
    warnings.push("Private key output file path is missing.");
  }
  if (!input.generatedCsrFilePath.trim()) {
    warnings.push("Generated CSR output file path is missing.");
  }
  if (input.javaFound === false) {
    warnings.push("Java is missing; the planned CSR command cannot run until Java is installed.");
  }
  if (!input.sdkJarPath && !input.launcherPath) {
    warnings.push("Neither SDK JAR nor fatoora launcher is available.");
  }
  if (input.launcherPath && !input.jqPath) {
    warnings.push("fatoora launcher may require jq, but jq was not found.");
  }
  if (input.configDirPath) {
    envAdditions.SDK_CONFIG = currentPlatform === "win32" ? win32.join(input.configDirPath, "config.json") : posix.join(input.configDirPath, "config.json");
  } else {
    warnings.push("SDK_CONFIG could not be planned because the SDK Configuration directory was not resolved.");
  }
  if (input.launcherPath) {
    envAdditions.FATOORA_HOME = currentPlatform === "win32" ? win32.dirname(input.launcherPath) : dirname(input.launcherPath);
  }
  if (input.jqPath) {
    pathPrepend.push(currentPlatform === "win32" ? win32.dirname(input.jqPath) : dirname(input.jqPath));
  }
  if (input.javaCommand && input.javaCommand !== "java" && /[\\/]/.test(input.javaCommand)) {
    pathPrepend.push(currentPlatform === "win32" ? win32.dirname(input.javaCommand) : dirname(input.javaCommand));
  }
  if (pathPrepend.length > 0) {
    envAdditions.PATH_PREPEND = pathPrepend.join(currentPlatform === "win32" ? ";" : ":");
  }

  const pathContainsSpaces =
    /\s/.test(input.workingDirectory) ||
    /\s/.test(input.csrConfigFilePath) ||
    /\s/.test(input.privateKeyFilePath) ||
    /\s/.test(input.generatedCsrFilePath) ||
    Boolean(input.sdkJarPath && /\s/.test(input.sdkJarPath));
  if (pathContainsSpaces) {
    warnings.push("One or more planned CSR paths contain spaces; use argument-array execution, not shell string concatenation.");
  }

  const csrArgs = [
    "-csr",
    "-csrConfig",
    input.csrConfigFilePath,
    "-privateKey",
    input.privateKeyFilePath,
    "-generatedCsr",
    input.generatedCsrFilePath,
    "-pem",
  ];
  let command: string | null = null;
  let args: string[] = [];

  if (input.launcherPath) {
    if (currentPlatform === "win32" && /\.bat$/i.test(input.launcherPath)) {
      command = "cmd.exe";
      args = ["/d", "/c", input.launcherPath, ...csrArgs];
      warnings.push("Uses cmd.exe argument-array execution only to run the official Windows fatoora.bat launcher.");
    } else {
      command = input.launcherPath;
      args = csrArgs;
    }
  } else if (input.sdkJarPath) {
    command = input.javaCommand ?? "java";
    args = ["-jar", input.sdkJarPath, ...csrArgs];
    warnings.push("Direct JAR execution is a fallback; prefer the official fatoora launcher when available.");
  }

  return {
    command,
    args,
    displayCommand: command ? [command, ...args].map((part) => quoteForDisplay(part, currentPlatform)).join(" ") : "",
    envAdditions,
    workingDirectory: input.workingDirectory,
    warnings,
  };
}

function buildZatcaSdkCommand(input: ZatcaSdkValidationCommandInput & { signedInvoiceFilePath?: string | null }, operation: "validate" | "generateHash" | "sign"): ZatcaSdkValidationCommandPlan {
  const currentPlatform = input.platform;
  const warnings: string[] = ["Use argument-array execution for this SDK command; do not concatenate a shell string."];
  const envAdditions: Record<string, string> = {};
  const pathPrepend: string[] = [];
  const operationFlag = operation === "validate" ? "-validate" : operation === "generateHash" ? "-generateHash" : "-sign";
  const documentedCommand = operation === "validate" ? ZATCA_SDK_VALIDATE_COMMAND : operation === "generateHash" ? ZATCA_SDK_GENERATE_HASH_COMMAND : ZATCA_SDK_SIGN_COMMAND;

  if (!input.xmlFilePath.trim()) {
    warnings.push("XML file path is missing.");
  }
  if (operation === "sign" && !input.signedInvoiceFilePath?.trim()) {
    warnings.push("Signed invoice output file path is missing.");
  }
  if (input.javaFound === false) {
    warnings.push("Java is missing; the planned command cannot run until Java is installed.");
  }
  if (!input.sdkJarPath && !input.launcherPath) {
    warnings.push("Neither SDK JAR nor fatoora launcher is available.");
  }
  if (input.launcherPath && !input.jqPath) {
    warnings.push("fatoora launcher may require jq, but jq was not found.");
  }
  if (input.configDirPath) {
    envAdditions.SDK_CONFIG = currentPlatform === "win32" ? win32.join(input.configDirPath, "config.json") : posix.join(input.configDirPath, "config.json");
  } else {
    warnings.push("SDK_CONFIG could not be planned because the SDK Configuration directory was not resolved.");
  }
  if (input.launcherPath) {
    envAdditions.FATOORA_HOME = currentPlatform === "win32" ? win32.dirname(input.launcherPath) : dirname(input.launcherPath);
  }
  if (input.jqPath) {
    pathPrepend.push(currentPlatform === "win32" ? win32.dirname(input.jqPath) : dirname(input.jqPath));
  }
  if (input.javaCommand && input.javaCommand !== "java" && /[\\/]/.test(input.javaCommand)) {
    pathPrepend.push(currentPlatform === "win32" ? win32.dirname(input.javaCommand) : dirname(input.javaCommand));
  }
  if (pathPrepend.length > 0) {
    envAdditions.PATH_PREPEND = pathPrepend.join(currentPlatform === "win32" ? ";" : ":");
  }

  const pathContainsSpaces = /\s/.test(input.workingDirectory) || /\s/.test(input.xmlFilePath) || Boolean(input.sdkJarPath && /\s/.test(input.sdkJarPath));
  if (pathContainsSpaces) {
    warnings.push("One or more planned paths contain spaces; use argument-array execution, not shell string concatenation.");
  }

  let command: string | null = null;
  let args: string[] = [];

  if (input.launcherPath) {
    if (currentPlatform === "win32" && /\.bat$/i.test(input.launcherPath)) {
      command = "cmd.exe";
      args = ["/d", "/c", input.launcherPath, operationFlag, "-invoice", input.xmlFilePath];
      if (operation === "sign" && input.signedInvoiceFilePath) {
        args.push("-signedInvoice", input.signedInvoiceFilePath);
      }
      warnings.push("Uses cmd.exe argument-array execution only to run the official Windows fatoora.bat launcher.");
    } else {
      command = input.launcherPath;
      args = [operationFlag, "-invoice", input.xmlFilePath];
      if (operation === "sign" && input.signedInvoiceFilePath) {
        args.push("-signedInvoice", input.signedInvoiceFilePath);
      }
    }
    warnings.push(`Uses the SDK readme documented command: ${documentedCommand}.`);
  } else if (input.sdkJarPath) {
    command = input.javaCommand ?? "java";
    args = ["-jar", input.sdkJarPath, operationFlag, "-invoice", input.xmlFilePath];
    if (operation === "sign" && input.signedInvoiceFilePath) {
      args.push("-signedInvoice", input.signedInvoiceFilePath);
    }
    warnings.push("Direct JAR execution is a fallback; prefer the official fatoora launcher when available.");
  }

  return {
    command,
    args,
    displayCommand: command ? [command, ...args].map((part) => quoteForDisplay(part, currentPlatform)).join(" ") : "",
    envAdditions,
    workingDirectory: input.workingDirectory,
    warnings,
  };
}

export function detectJava(runCommand?: ZatcaSdkDiscoveryOptions["runCommand"], javaCommand = "java"): JavaProbeResult {
  try {
    const result = runCommand
      ? runCommand(javaCommand, ["-version"])
      : spawnSync(javaCommand, ["-version"], { encoding: "utf8", timeout: 5000, windowsHide: true });
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .map((part) => String(part))
      .join("\n")
      .trim();
    const found = !result.error && (result.status === 0 || output.length > 0);
    const version = found ? parseJavaVersion(output) : null;

    return {
      found,
      version,
      majorVersion: version ? parseJavaMajorVersion(version) : null,
      rawOutput: output || undefined,
    };
  } catch {
    return { found: false, version: null, majorVersion: null };
  }
}

export function parseJavaVersion(output: string): string | null {
  const quoted = output.match(/version\s+"([^"]+)"/i);
  if (quoted?.[1]) {
    return quoted[1];
  }

  const openJdk = output.match(/openjdk\s+([0-9][^\s]*)/i);
  return openJdk?.[1] ?? null;
}

export function parseJavaMajorVersion(version: string): number | null {
  const legacy = version.match(/^1\.(\d+)/);
  if (legacy?.[1]) {
    return Number(legacy[1]);
  }

  const modern = version.match(/^(\d+)/);
  return modern?.[1] ? Number(modern[1]) : null;
}

export function isZatcaSdkExecutionEnabled(sourceEnv: NodeJS.ProcessEnv = env): boolean {
  return String(sourceEnv.ZATCA_SDK_EXECUTION_ENABLED ?? "").trim().toLowerCase() === "true";
}

export function isZatcaSdkSigningExecutionEnabled(sourceEnv: NodeJS.ProcessEnv = env): boolean {
  return String(sourceEnv.ZATCA_SDK_SIGNING_EXECUTION_ENABLED ?? "").trim().toLowerCase() === "true";
}

export function isZatcaSdkCsrExecutionEnabled(sourceEnv: NodeJS.ProcessEnv = env): boolean {
  return String(sourceEnv.ZATCA_SDK_CSR_EXECUTION_ENABLED ?? "").trim().toLowerCase() === "true";
}

export function readZatcaSdkExecutionConfig(sourceEnv: NodeJS.ProcessEnv | Record<string, string | undefined> = env, projectRoot = cwd()): ZatcaSdkExecutionConfig {
  const timeoutRaw = Number(String(sourceEnv.ZATCA_SDK_TIMEOUT_MS ?? DEFAULT_ZATCA_SDK_TIMEOUT_MS).trim());
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? Math.min(timeoutRaw, 120000) : DEFAULT_ZATCA_SDK_TIMEOUT_MS;

  return {
    enabled: isZatcaSdkExecutionEnabled(sourceEnv as NodeJS.ProcessEnv),
    sdkJarPath: optionalPath(sourceEnv.ZATCA_SDK_JAR_PATH),
    configDir: optionalPath(sourceEnv.ZATCA_SDK_CONFIG_DIR),
    workDir: optionalPath(sourceEnv.ZATCA_SDK_WORK_DIR) ?? join(tmpdir(), "ledgerbyte-zatca-sdk"),
    javaBin: String(sourceEnv.ZATCA_SDK_JAVA_BIN ?? "").trim() || "java",
    timeoutMs,
  };
}

function findProjectRoot(startDirectory: string): string {
  let current = resolve(startDirectory);

  for (;;) {
    if (existsSync(join(current, "pnpm-workspace.yaml")) || existsSync(join(current, "reference"))) {
      return current;
    }

    const parent = resolve(current, "..");
    if (parent === current) {
      return resolve(startDirectory);
    }
    current = parent;
  }
}

function listFiles(root: string): string[] {
  const result: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        stack.push(fullPath);
      } else if (stats.isFile()) {
        result.push(fullPath);
      }
    }
  }

  return result.sort((left, right) => left.localeCompare(right));
}

function findLauncher(files: string[], currentPlatform: NodeJS.Platform | string): string | undefined {
  const preferred = currentPlatform === "win32" ? ["fatoora.bat", "fatoora.exe", "fatoora"] : ["fatoora", "fatoora.sh", "fatoora.bat"];

  for (const name of preferred) {
    const found = files.find((file) => file.split(/[\\/]/).at(-1)?.toLowerCase() === name);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function findConfigDir(files: string[], sdkJarPath?: string): string | undefined {
  const fromFile = files.find((file) => /[\\/]Configuration[\\/](config|defaults)\.json$/i.test(file));
  if (fromFile) {
    return dirname(fromFile);
  }

  if (sdkJarPath) {
    const appsDir = dirname(sdkJarPath);
    const candidate = join(dirname(appsDir), "Configuration");
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function findSdkRoot(sdkJarPath?: string, configDirPath?: string, launcherPath?: string): string | undefined {
  if (configDirPath) {
    return dirname(configDirPath);
  }
  if (sdkJarPath) {
    return dirname(dirname(sdkJarPath));
  }
  if (launcherPath) {
    return dirname(dirname(launcherPath));
  }
  return undefined;
}

function canWriteToDirectory(directory: string): boolean {
  try {
    if (existsSync(directory)) {
      accessSync(directory, constants.W_OK);
      return true;
    }
    accessSync(dirname(resolve(directory)), constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function optionalPath(value: string | undefined): string | undefined {
  const trimmed = String(value ?? "").trim();
  return trimmed ? resolve(trimmed) : undefined;
}

function quoteForDisplay(value: string, currentPlatform: NodeJS.Platform | string): string {
  if (!value || !/[\s"'$&()<>|;]/.test(value)) {
    return value;
  }

  if (currentPlatform === "win32") {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}
