import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, win32 } from "node:path";
import { cwd, env, platform } from "node:process";

export interface JavaProbeResult {
  found: boolean;
  version: string | null;
  majorVersion: number | null;
  rawOutput?: string;
}

export interface ZatcaSdkReadiness {
  referenceFolderFound: boolean;
  sdkJarFound: boolean;
  fatooraLauncherFound: boolean;
  jqFound: boolean;
  javaFound: boolean;
  javaVersion: string | null;
  javaMajorVersion: number | null;
  javaVersionSupported: boolean;
  projectPathHasSpaces: boolean;
  canAttemptSdkValidation: boolean;
  warnings: string[];
  suggestedFixes: string[];
  referenceFolderPath?: string;
  sdkJarPath?: string;
  fatooraLauncherPath?: string;
  jqPath?: string;
  projectRoot: string;
}

export interface ZatcaSdkDiscoveryOptions {
  projectRoot?: string;
  startDirectory?: string;
  platform?: NodeJS.Platform | string;
  runCommand?: (command: string, args: string[]) => { status: number | null; stdout?: string | Buffer; stderr?: string | Buffer; error?: unknown };
}

export interface ZatcaSdkValidationCommandInput {
  xmlFilePath: string;
  sdkJarPath?: string | null;
  launcherPath?: string | null;
  jqPath?: string | null;
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

export function discoverZatcaSdkReadiness(options: ZatcaSdkDiscoveryOptions = {}): ZatcaSdkReadiness {
  const projectRoot = resolve(options.projectRoot ?? findProjectRoot(options.startDirectory ?? cwd()));
  const currentPlatform = options.platform ?? platform;
  const referenceFolderPath = join(projectRoot, "reference");
  const referenceFolderFound = existsSync(referenceFolderPath);
  const files = referenceFolderFound ? listFiles(referenceFolderPath) : [];
  const sdkJarPath = files.find((file) => /zatca-einvoicing-sdk.*\.jar$/i.test(file));
  const launcherPath = findLauncher(files, currentPlatform);
  const jqPath = files.find((file) => /(?:^|[\\/])jq(?:\.exe)?$/i.test(file));
  const java = detectJava(options.runCommand);
  const javaVersionSupported = java.found && java.majorVersion !== null && java.majorVersion >= 11 && java.majorVersion < 15;
  const projectPathHasSpaces = /\s/.test(projectRoot);
  const warnings: string[] = [];
  const suggestedFixes: string[] = [];

  if (!referenceFolderFound) {
    warnings.push("Local ZATCA reference folder was not found.");
    suggestedFixes.push("Place the official ZATCA SDK/docs under the repo-local reference/ folder.");
  }
  if (!sdkJarPath) {
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
  if (!java.found) {
    warnings.push("Java was not found on PATH.");
    suggestedFixes.push("Install a Java runtime compatible with the ZATCA SDK before enabling local SDK validation.");
  } else if (!javaVersionSupported) {
    warnings.push(`Detected Java ${java.version ?? "unknown"}, but the SDK readme expects Java >=11 and <15.`);
    suggestedFixes.push("Use a pinned Java 11-14 runtime or a Docker wrapper for SDK validation.");
  }
  if (projectPathHasSpaces) {
    warnings.push("Project path contains spaces, which previously broke the SDK Windows batch launcher.");
    suggestedFixes.push("Use the dry-run command plan, a Docker wrapper, or a no-space temp SDK path before enabling execution.");
  }

  return {
    referenceFolderFound,
    sdkJarFound: Boolean(sdkJarPath),
    fatooraLauncherFound: Boolean(launcherPath),
    jqFound: Boolean(jqPath),
    javaFound: java.found,
    javaVersion: java.version,
    javaMajorVersion: java.majorVersion,
    javaVersionSupported,
    projectPathHasSpaces,
    canAttemptSdkValidation: referenceFolderFound && Boolean(sdkJarPath) && javaVersionSupported,
    warnings,
    suggestedFixes,
    referenceFolderPath: referenceFolderFound ? referenceFolderPath : undefined,
    sdkJarPath,
    fatooraLauncherPath: launcherPath,
    jqPath,
    projectRoot,
  };
}

export function buildZatcaSdkValidationCommand(input: ZatcaSdkValidationCommandInput): ZatcaSdkValidationCommandPlan {
  const currentPlatform = input.platform;
  const warnings: string[] = ["Dry-run command plan only; do not treat this as executed SDK validation."];
  const envAdditions: Record<string, string> = {};

  if (!input.xmlFilePath.trim()) {
    warnings.push("XML file path is missing.");
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
  if (input.jqPath) {
    envAdditions.PATH_PREPEND = currentPlatform === "win32" ? win32.dirname(input.jqPath) : dirname(input.jqPath);
  }

  const pathContainsSpaces = /\s/.test(input.workingDirectory) || /\s/.test(input.xmlFilePath) || Boolean(input.sdkJarPath && /\s/.test(input.sdkJarPath));
  if (pathContainsSpaces) {
    warnings.push("One or more planned paths contain spaces; use argument-array execution, not shell string concatenation.");
  }

  let command: string | null = null;
  let args: string[] = [];

  if (input.sdkJarPath) {
    command = input.javaCommand ?? "java";
    args = ["-jar", input.sdkJarPath, "-validate", "-invoice", input.xmlFilePath];
    warnings.push("Direct JAR validation avoids the Windows batch path-splitting issue but must be verified against the SDK before real execution is enabled.");
  } else if (input.launcherPath) {
    command = input.launcherPath;
    args = ["-validate", "-invoice", input.xmlFilePath];
    warnings.push("Launcher validation plan depends on the SDK launcher resolving its configuration correctly.");
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

export function detectJava(runCommand?: ZatcaSdkDiscoveryOptions["runCommand"]): JavaProbeResult {
  try {
    const result = runCommand
      ? runCommand("java", ["-version"])
      : spawnSync("java", ["-version"], { encoding: "utf8", timeout: 5000, windowsHide: true });
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

function quoteForDisplay(value: string, currentPlatform: NodeJS.Platform | string): string {
  if (!value || !/[\s"'$&()<>|;]/.test(value)) {
    return value;
  }

  if (currentPlatform === "win32") {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  return `'${value.replaceAll("'", "'\\''")}'`;
}
