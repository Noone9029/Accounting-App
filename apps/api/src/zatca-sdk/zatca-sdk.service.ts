import { BadRequestException, Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { ValidateZatcaSdkFixtureDto, ValidateZatcaSdkXmlDto } from "./dto/validate-zatca-sdk-xml.dto";
import { isAllowedZatcaFixturePath, normalizeZatcaFixturePath } from "./zatca-official-fixtures";
import {
  buildZatcaSdkGenerateHashCommand,
  buildZatcaSdkValidationCommand,
  discoverZatcaSdkReadiness,
  type ZatcaSdkReadiness,
  type ZatcaSdkValidationCommandPlan,
} from "./zatca-sdk-paths";
import { readZatcaHashModeConfig, type ZatcaHashModeConfig } from "../zatca/zatca-hash-mode";

export interface ZatcaSdkDryRunResponse {
  dryRun: true;
  localOnly: true;
  officialSdkValidation: false;
  xmlSource: "invoice" | "request";
  temporaryXmlFilePath: string;
  readiness: Pick<
    ZatcaSdkReadiness,
    | "referenceFolderFound"
    | "sdkJarFound"
    | "fatooraLauncherFound"
    | "jqFound"
    | "javaFound"
    | "javaVersion"
    | "javaVersionSupported"
    | "detectedJavaVersion"
    | "javaSupported"
    | "requiredJavaRange"
    | "javaBinUsed"
    | "javaBlockerMessage"
    | "sdkCommand"
    | "projectPathHasSpaces"
    | "canAttemptSdkValidation"
  >;
  commandPlan: ZatcaSdkValidationCommandPlan;
  warnings: string[];
}

export interface ZatcaSdkValidationResponse {
  success: boolean;
  disabled: boolean;
  localOnly: true;
  officialValidationAttempted: boolean;
  sdkExitCode: number | null;
  sdkHash: string | null;
  appHash: string | null;
  hashMatches: boolean | null;
  hashComparisonStatus: ZatcaHashComparisonStatus;
  stdoutSummary: string;
  stderrSummary: string;
  validationMessages: string[];
  blockingReasons: string[];
  warnings: string[];
  xmlSource: "generated" | "fixture" | "uploaded" | "invoice" | "request";
  invoiceType?: "standard" | "simplified";
}

export type ZatcaHashComparisonStatus = "MATCH" | "MISMATCH" | "NOT_AVAILABLE" | "BLOCKED";

export interface ZatcaHashComparison {
  sdkHash: string | null;
  appHash: string | null;
  hashMatches: boolean | null;
  hashComparisonStatus: ZatcaHashComparisonStatus;
}

export interface ZatcaOfficialHashResult extends ZatcaHashComparison {
  disabled: boolean;
  localOnly: true;
  noMutation: true;
  officialHashAttempted: boolean;
  sdkExitCode: number | null;
  stdoutSummary: string;
  stderrSummary: string;
  blockingReasons: string[];
  warnings: string[];
  hashMode: ZatcaHashModeConfig;
}

export interface ZatcaInvoiceHashCompareResponse extends ZatcaOfficialHashResult {
  invoiceId: string;
  metadataId: string;
  previousInvoiceHash: string | null;
  icv: number | null;
  egsUnitId: string | null;
}

const MAX_ZATCA_XML_BYTES = 2 * 1024 * 1024;
const OUTPUT_SUMMARY_LIMIT = 4000;

@Injectable()
export class ZatcaSdkService {
  constructor(private readonly prisma: PrismaService) {}

  getReadiness() {
    const readiness = discoverZatcaSdkReadiness();
    return redactReadiness(readiness);
  }

  async buildValidationDryRun(organizationId: string, dto: ValidateZatcaSdkXmlDto): Promise<ZatcaSdkDryRunResponse> {
    if (dto.mode !== "dry-run") {
      throw new BadRequestException("SDK validation dry run requires mode=dry-run.");
    }

    const { xmlBase64, source } = await this.resolveXmlPayload(organizationId, dto);
    const xmlFilePath = join(tmpdir(), "ledgerbyte-zatca-sdk", `${safeTempName(dto.invoiceId ?? "request-xml")}.xml`);
    const readiness = discoverZatcaSdkReadiness();
    const commandPlan = buildZatcaSdkValidationCommand({
      xmlFilePath,
      sdkJarPath: readiness.sdkJarPath,
      launcherPath: readiness.fatooraLauncherPath,
      jqPath: readiness.jqPath,
      configDirPath: readiness.configDirPath,
      workingDirectory: readiness.referenceFolderPath ?? readiness.projectRoot,
      platform: process.platform,
      javaFound: readiness.javaFound,
    });

    // Decode only enough to reject empty/invalid-looking input. Do not return or log the XML content.
    const decoded = Buffer.from(xmlBase64, "base64").toString("utf8").trim();
    if (!decoded) {
      throw new BadRequestException("ZATCA XML payload is empty.");
    }
    assertXmlSize(decoded);

    return {
      dryRun: true,
      localOnly: true,
      officialSdkValidation: false,
      xmlSource: source,
      temporaryXmlFilePath: xmlFilePath,
      readiness: {
        referenceFolderFound: readiness.referenceFolderFound,
        sdkJarFound: readiness.sdkJarFound,
        fatooraLauncherFound: readiness.fatooraLauncherFound,
        jqFound: readiness.jqFound,
        javaFound: readiness.javaFound,
        javaVersion: readiness.javaVersion,
        javaVersionSupported: readiness.javaVersionSupported,
        detectedJavaVersion: readiness.detectedJavaVersion,
        javaSupported: readiness.javaSupported,
        requiredJavaRange: readiness.requiredJavaRange,
        javaBinUsed: readiness.javaBinUsed,
        javaBlockerMessage: readiness.javaBlockerMessage,
        sdkCommand: readiness.sdkCommand,
        projectPathHasSpaces: readiness.projectPathHasSpaces,
        canAttemptSdkValidation: readiness.canAttemptSdkValidation,
      },
      commandPlan,
      warnings: [...readiness.warnings, ...commandPlan.warnings],
    };
  }

  async validateXmlLocal(organizationId: string, dto: ValidateZatcaSdkXmlDto): Promise<ZatcaSdkValidationResponse> {
    const payload = await this.resolveXmlStringPayload(organizationId, dto);
    return this.validateXmlStringLocal(payload.xml, {
      source: payload.source === "invoice" ? "generated" : dto.source ?? "uploaded",
      invoiceType: dto.invoiceType,
      tempName: dto.invoiceId ?? "request-xml",
      appHash: payload.appHash,
    });
  }

  async validateReferenceFixtureLocal(_organizationId: string, dto: ValidateZatcaSdkFixtureDto): Promise<ZatcaSdkValidationResponse> {
    const fixturePath = this.resolveAllowedFixturePath(dto.fixturePath);
    const xml = await readFile(fixturePath, "utf8");
    return this.validateXmlStringLocal(xml, { source: "fixture", tempName: fixturePath.split(/[\\/]/).at(-1) ?? "fixture.xml" });
  }

  async validateInvoiceXmlLocal(organizationId: string, invoiceId: string): Promise<ZatcaSdkValidationResponse> {
    const { xml, appHash } = await this.resolveXmlStringPayload(organizationId, { invoiceId });
    return this.validateXmlStringLocal(xml, { source: "generated", tempName: invoiceId, appHash });
  }

  async generateOfficialZatcaHash(xml: string, options: { appHash?: string | null; tempName?: string } = {}): Promise<ZatcaOfficialHashResult> {
    assertXmlSize(xml);
    const readiness = discoverZatcaSdkReadiness();
    const hashMode = readZatcaHashModeConfig();
    const warnings = [
      "This is local SDK hash generation only.",
      "This does not submit to ZATCA.",
      "This does not mutate invoice metadata, EGS ICV, or EGS last hash.",
      "This does not prove production compliance.",
      ...readiness.warnings,
      ...hashMode.warnings,
    ];

    if (!readiness.enabled) {
      return buildBlockedOfficialHashResponse(readiness, {
        disabled: true,
        appHash: options.appHash ?? null,
        warnings,
        hashMode,
      });
    }

    if (!readiness.canRunLocalValidation) {
      return buildBlockedOfficialHashResponse(readiness, {
        disabled: false,
        appHash: options.appHash ?? null,
        warnings,
        hashMode,
      });
    }

    await mkdir(readiness.workDir, { recursive: true });
    const runDir = await mkdtemp(join(readiness.workDir, "hash-"));
    const xmlFilePath = join(runDir, `${safeTempName(options.tempName ?? "hash-compare")}.xml`);
    try {
      await writeFile(xmlFilePath, xml, "utf8");
      const commandPlan = buildZatcaSdkGenerateHashCommand({
        xmlFilePath,
        sdkJarPath: readiness.sdkJarPath,
        launcherPath: readiness.fatooraLauncherPath,
        jqPath: readiness.jqPath,
        configDirPath: readiness.configDirPath,
        workingDirectory: readiness.sdkRootPath ?? readiness.referenceFolderPath ?? readiness.projectRoot,
        platform: process.platform,
        javaFound: readiness.javaFound,
        javaCommand: readiness.javaCommand,
      });

      if (!commandPlan.command) {
        return buildBlockedOfficialHashResponse(readiness, {
          disabled: false,
          appHash: options.appHash ?? null,
          warnings: [...warnings, ...commandPlan.warnings, "No executable ZATCA SDK hash command could be resolved."],
          blockingReasons: ["No executable ZATCA SDK hash command could be resolved."],
          hashMode,
        });
      }

      const executed = await executeCommand(commandPlan, readiness.timeoutMs);
      const stdoutSummary = sanitizeZatcaSdkOutput(executed.stdout);
      const stderrSummary = sanitizeZatcaSdkOutput(executed.stderr);
      const sdkHash = extractZatcaSdkInvoiceHash(`${stdoutSummary}\n${stderrSummary}`);
      const blockingReasons = executed.timedOut ? ["ZATCA SDK hash generation timed out."] : [];
      const hashWarnings = [...warnings, ...commandPlan.warnings];
      if (!sdkHash) {
        hashWarnings.push("ZATCA SDK hash output could not be parsed from generateHash output.");
      }

      return {
        disabled: false,
        localOnly: true,
        noMutation: true,
        officialHashAttempted: true,
        sdkExitCode: executed.exitCode,
        stdoutSummary,
        stderrSummary,
        ...buildZatcaHashComparison(options.appHash ?? null, sdkHash, executed.timedOut ? "BLOCKED" : undefined),
        blockingReasons,
        warnings: hashWarnings,
        hashMode,
      };
    } finally {
      await rm(runDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async compareInvoiceHash(organizationId: string, invoiceId: string): Promise<ZatcaInvoiceHashCompareResponse> {
    const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({
      where: { organizationId, invoiceId },
      select: {
        id: true,
        invoiceId: true,
        xmlBase64: true,
        invoiceHash: true,
        previousInvoiceHash: true,
        icv: true,
        egsUnitId: true,
      },
    });

    if (!metadata?.xmlBase64) {
      throw new BadRequestException("ZATCA XML has not been generated for this invoice.");
    }

    const xml = Buffer.from(metadata.xmlBase64, "base64").toString("utf8").trim();
    if (!xml) {
      throw new BadRequestException("ZATCA XML payload is empty.");
    }

    const result = await this.generateOfficialZatcaHash(xml, { appHash: metadata.invoiceHash, tempName: invoiceId });
    return {
      ...result,
      invoiceId: metadata.invoiceId,
      metadataId: metadata.id,
      previousInvoiceHash: metadata.previousInvoiceHash,
      icv: metadata.icv,
      egsUnitId: metadata.egsUnitId,
    };
  }

  private async resolveXmlPayload(organizationId: string, dto: ValidateZatcaSdkXmlDto): Promise<{ xmlBase64: string; source: "invoice" | "request"; appHash: string | null }> {
    if (dto.invoiceId && (dto.xmlBase64 || dto.xml)) {
      throw new BadRequestException("Provide either invoiceId or XML payload, not both.");
    }

    if (dto.invoiceId) {
      const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({
        where: { organizationId, invoiceId: dto.invoiceId },
        select: { xmlBase64: true, invoiceHash: true },
      });

      if (!metadata?.xmlBase64) {
        throw new BadRequestException("ZATCA XML has not been generated for this invoice.");
      }

      return { xmlBase64: metadata.xmlBase64, source: "invoice", appHash: metadata.invoiceHash ?? null };
    }

    if (dto.xml?.trim()) {
      return { xmlBase64: Buffer.from(dto.xml, "utf8").toString("base64"), source: "request", appHash: null };
    }

    if (!dto.xmlBase64?.trim()) {
      throw new BadRequestException("Provide xml, xmlBase64, or invoiceId for SDK validation.");
    }

    return { xmlBase64: dto.xmlBase64, source: "request", appHash: null };
  }

  private async resolveXmlStringPayload(organizationId: string, dto: ValidateZatcaSdkXmlDto): Promise<{ xml: string; source: "invoice" | "request"; appHash: string | null }> {
    const { xmlBase64, source, appHash } = await this.resolveXmlPayload(organizationId, dto);
    const xml = Buffer.from(xmlBase64, "base64").toString("utf8").trim();
    if (!xml) {
      throw new BadRequestException("ZATCA XML payload is empty.");
    }
    assertXmlSize(xml);
    return { xml, source, appHash };
  }

  private async validateXmlStringLocal(
    xml: string,
    options: {
      source: ZatcaSdkValidationResponse["xmlSource"];
      tempName: string;
      invoiceType?: "standard" | "simplified";
      appHash?: string | null;
    },
  ): Promise<ZatcaSdkValidationResponse> {
    assertXmlSize(xml);
    const readiness = discoverZatcaSdkReadiness();
    const warnings = [
      "This is local SDK validation only.",
      "This does not submit to ZATCA.",
      "This does not prove production compliance.",
      ...readiness.warnings,
    ];

    if (!readiness.enabled) {
      return buildBlockedValidationResponse(readiness, {
        disabled: true,
        warnings,
        source: options.source,
        invoiceType: options.invoiceType,
        appHash: options.appHash ?? null,
      });
    }

    if (!readiness.canRunLocalValidation) {
      return buildBlockedValidationResponse(readiness, {
        disabled: false,
        warnings,
        source: options.source,
        invoiceType: options.invoiceType,
        appHash: options.appHash ?? null,
      });
    }

    await mkdir(readiness.workDir, { recursive: true });
    const runDir = await mkdtemp(join(readiness.workDir, "run-"));
    const xmlFilePath = join(runDir, `${safeTempName(options.tempName)}.xml`);
    try {
      await writeFile(xmlFilePath, xml, "utf8");
      const commandPlan = buildZatcaSdkValidationCommand({
        xmlFilePath,
        sdkJarPath: readiness.sdkJarPath,
        launcherPath: readiness.fatooraLauncherPath,
        jqPath: readiness.jqPath,
        configDirPath: readiness.configDirPath,
        workingDirectory: readiness.sdkRootPath ?? readiness.referenceFolderPath ?? readiness.projectRoot,
        platform: process.platform,
        javaFound: readiness.javaFound,
        javaCommand: readiness.javaCommand,
      });

      if (!commandPlan.command) {
        return buildBlockedValidationResponse(readiness, {
          disabled: false,
          warnings: [...warnings, ...commandPlan.warnings],
          source: options.source,
          invoiceType: options.invoiceType,
          appHash: options.appHash ?? null,
          blockingReasons: ["No executable ZATCA SDK command could be resolved."],
        });
      }

      const executed = await executeCommand(commandPlan, readiness.timeoutMs);
      const stdoutSummary = sanitizeZatcaSdkOutput(executed.stdout);
      const stderrSummary = sanitizeZatcaSdkOutput(executed.stderr);
      const hashResult = await generateSdkHashComparison(readiness, xmlFilePath, options.appHash ?? null);

      return {
        success: executed.exitCode === 0,
        disabled: false,
        localOnly: true,
        officialValidationAttempted: true,
        sdkExitCode: executed.exitCode,
        ...hashResult.comparison,
        stdoutSummary,
        stderrSummary,
        validationMessages: extractZatcaSdkValidationMessages(`${stdoutSummary}\n${stderrSummary}`),
        blockingReasons: executed.timedOut ? ["ZATCA SDK validation timed out."] : [],
        warnings: [...warnings, ...commandPlan.warnings, ...hashResult.warnings],
        xmlSource: options.source,
        invoiceType: options.invoiceType,
      };
    } finally {
      await rm(runDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private resolveAllowedFixturePath(fixturePath: string): string {
    const trimmed = fixturePath.trim();
    if (!trimmed) {
      throw new BadRequestException("fixturePath is required.");
    }
    if (extname(trimmed).toLowerCase() !== ".xml") {
      throw new BadRequestException("Only XML fixture files can be validated.");
    }
    if (!isAllowedZatcaFixturePath(trimmed)) {
      throw new BadRequestException("Fixture path must be under reference/ or packages/zatca-core/fixtures.");
    }

    const readiness = discoverZatcaSdkReadiness();
    const projectRoot = readiness.projectRoot;
    const requestedPath = resolve(projectRoot, normalizeZatcaFixturePath(trimmed));
    const allowedRoots = [resolve(projectRoot, "reference"), resolve(projectRoot, "packages", "zatca-core", "fixtures")];

    if (!allowedRoots.some((root) => isInsidePath(requestedPath, root))) {
      throw new BadRequestException("Fixture path must be under reference/ or packages/zatca-core/fixtures.");
    }
    if (!existsSync(requestedPath)) {
      throw new BadRequestException("Reference fixture XML file was not found.");
    }

    return requestedPath;
  }
}

function redactReadiness(readiness: ZatcaSdkReadiness) {
  const hashMode = readZatcaHashModeConfig();
  return {
    enabled: readiness.enabled,
    referenceFolderFound: readiness.referenceFolderFound,
    sdkJarFound: readiness.sdkJarFound,
    fatooraLauncherFound: readiness.fatooraLauncherFound,
    jqFound: readiness.jqFound,
    configDirFound: readiness.configDirFound,
    workingDirectoryWritable: readiness.workingDirectoryWritable,
    supportedCommandsKnown: readiness.supportedCommandsKnown,
    javaFound: readiness.javaFound,
    javaVersion: readiness.javaVersion,
    javaMajorVersion: readiness.javaMajorVersion,
    javaVersionSupported: readiness.javaVersionSupported,
    detectedJavaVersion: readiness.detectedJavaVersion,
    javaSupported: readiness.javaSupported,
    requiredJavaRange: readiness.requiredJavaRange,
    javaBinUsed: readiness.javaBinUsed,
    javaBlockerMessage: readiness.javaBlockerMessage,
    sdkCommand: readiness.sdkCommand,
    projectPathHasSpaces: readiness.projectPathHasSpaces,
    canAttemptSdkValidation: readiness.canAttemptSdkValidation,
    canRunLocalValidation: readiness.canRunLocalValidation,
    blockingReasons: readiness.blockingReasons,
    warnings: readiness.warnings,
    suggestedFixes: readiness.suggestedFixes,
    timeoutMs: readiness.timeoutMs,
    hashMode,
    sdkHashModeBlocked: hashMode.mode === "SDK_GENERATED" && !readiness.canRunLocalValidation,
  };
}

function safeTempName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "zatca-xml"
  );
}

function assertXmlSize(xml: string): void {
  if (Buffer.byteLength(xml, "utf8") > MAX_ZATCA_XML_BYTES) {
    throw new BadRequestException("ZATCA XML payload exceeds the 2 MB local SDK validation limit.");
  }
}

async function generateSdkHashComparison(
  readiness: ZatcaSdkReadiness,
  xmlFilePath: string,
  appHash: string | null,
): Promise<{ comparison: ZatcaHashComparison; warnings: string[] }> {
  const commandPlan = buildZatcaSdkGenerateHashCommand({
    xmlFilePath,
    sdkJarPath: readiness.sdkJarPath,
    launcherPath: readiness.fatooraLauncherPath,
    jqPath: readiness.jqPath,
    configDirPath: readiness.configDirPath,
    workingDirectory: readiness.sdkRootPath ?? readiness.referenceFolderPath ?? readiness.projectRoot,
    platform: process.platform,
    javaFound: readiness.javaFound,
    javaCommand: readiness.javaCommand,
  });

  if (!commandPlan.command) {
    return {
      comparison: buildZatcaHashComparison(appHash, null, "NOT_AVAILABLE"),
      warnings: [...commandPlan.warnings, "SDK hash comparison was not available because no executable ZATCA SDK hash command could be resolved."],
    };
  }

  const executed = await executeCommand(commandPlan, readiness.timeoutMs);
  const output = sanitizeZatcaSdkOutput(`${executed.stdout}\n${executed.stderr}`);
  const sdkHash = extractZatcaSdkInvoiceHash(output);
  const blocking = executed.timedOut ? "BLOCKED" : undefined;
  const warnings = [...commandPlan.warnings];

  if (executed.timedOut) {
    warnings.push("ZATCA SDK hash generation timed out.");
  }
  if (!sdkHash) {
    warnings.push("ZATCA SDK hash output could not be parsed from generateHash output.");
  }

  return {
    comparison: buildZatcaHashComparison(appHash, sdkHash, blocking),
    warnings,
  };
}

function buildBlockedValidationResponse(
  readiness: ZatcaSdkReadiness,
  options: {
    disabled: boolean;
    warnings: string[];
    source: ZatcaSdkValidationResponse["xmlSource"];
    invoiceType?: "standard" | "simplified";
    appHash?: string | null;
    blockingReasons?: string[];
  },
): ZatcaSdkValidationResponse {
  const comparison = buildZatcaHashComparison(options.appHash ?? null, null, "BLOCKED");
  return {
    success: false,
    disabled: options.disabled,
    localOnly: true,
    officialValidationAttempted: false,
    sdkExitCode: null,
    ...comparison,
    stdoutSummary: "",
    stderrSummary: "",
    validationMessages: [],
    blockingReasons: options.blockingReasons ?? readiness.blockingReasons,
    warnings: options.warnings,
    xmlSource: options.source,
    invoiceType: options.invoiceType,
  };
}

function buildBlockedOfficialHashResponse(
  readiness: ZatcaSdkReadiness,
  options: {
    disabled: boolean;
    appHash: string | null;
    warnings: string[];
    hashMode: ZatcaHashModeConfig;
    blockingReasons?: string[];
  },
): ZatcaOfficialHashResult {
  return {
    disabled: options.disabled,
    localOnly: true,
    noMutation: true,
    officialHashAttempted: false,
    sdkExitCode: null,
    stdoutSummary: "",
    stderrSummary: "",
    ...buildZatcaHashComparison(options.appHash, null, "BLOCKED"),
    blockingReasons: options.blockingReasons ?? readiness.blockingReasons,
    warnings: options.warnings,
    hashMode: options.hashMode,
  };
}

function executeCommand(commandPlan: ZatcaSdkValidationCommandPlan, timeoutMs: number): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolveResult) => {
    const env = { ...process.env };
    if (commandPlan.envAdditions.PATH_PREPEND) {
      const delimiter = process.platform === "win32" ? ";" : ":";
      const existingPath = env.PATH ?? env.Path ?? "";
      env.PATH = `${commandPlan.envAdditions.PATH_PREPEND}${delimiter}${existingPath}`;
      if (process.platform === "win32") {
        env.Path = env.PATH;
      }
    }
    if (commandPlan.envAdditions.SDK_CONFIG) {
      env.SDK_CONFIG = commandPlan.envAdditions.SDK_CONFIG;
    }
    if (commandPlan.envAdditions.FATOORA_HOME) {
      env.FATOORA_HOME = commandPlan.envAdditions.FATOORA_HOME;
    }

    const command = process.platform === "win32" && commandPlan.command?.toLowerCase() === "cmd.exe" ? process.env.ComSpec || join(process.env.SystemRoot ?? "C:\\Windows", "System32", "cmd.exe") : commandPlan.command!;

    execFile(
      command,
      commandPlan.args,
      { cwd: commandPlan.workingDirectory, env, timeout: timeoutMs, windowsHide: true, maxBuffer: 5 * 1024 * 1024 },
      (error, stdout, stderr) => {
      const maybeCode = error && typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number" ? ((error as NodeJS.ErrnoException & { code: number }).code) : null;
      resolveResult({
        exitCode: error ? maybeCode : 0,
        stdout: String(stdout ?? ""),
        stderr: String(stderr || error?.message || ""),
        timedOut: Boolean(error && /timed out/i.test(error.message)),
      });
      },
    );
  });
}

export function sanitizeZatcaSdkOutput(output: string): string {
  return output
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED]")
    .replace(/(password|passwordHash|token|tokenHash|secret|apiKey|accessKey|privateKey|privateKeyPem|authorization|contentBase64)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/(DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|JWT_SECRET|S3_SECRET_ACCESS_KEY)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, OUTPUT_SUMMARY_LIMIT);
}

export function extractZatcaSdkInvoiceHash(output: string): string | null {
  const sanitized = sanitizeZatcaSdkOutput(output);
  const match = sanitized.match(/INVOICE\s+HASH\s*=\s*([A-Za-z0-9+/=]+)/i);
  return match?.[1] ?? null;
}

export function buildZatcaHashComparison(appHash: string | null | undefined, sdkHash: string | null | undefined, statusOverride?: ZatcaHashComparisonStatus): ZatcaHashComparison {
  const normalizedAppHash = appHash?.trim() || null;
  const normalizedSdkHash = sdkHash?.trim() || null;

  if (statusOverride) {
    return {
      appHash: normalizedAppHash,
      sdkHash: normalizedSdkHash,
      hashMatches: null,
      hashComparisonStatus: statusOverride,
    };
  }

  if (!normalizedAppHash || !normalizedSdkHash) {
    return {
      appHash: normalizedAppHash,
      sdkHash: normalizedSdkHash,
      hashMatches: null,
      hashComparisonStatus: "NOT_AVAILABLE",
    };
  }

  const hashMatches = normalizedAppHash === normalizedSdkHash;
  return {
    appHash: normalizedAppHash,
    sdkHash: normalizedSdkHash,
    hashMatches,
    hashComparisonStatus: hashMatches ? "MATCH" : "MISMATCH",
  };
}

export function extractZatcaSdkValidationMessages(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => sanitizeZatcaSdkOutput(line.trim()))
    .filter(Boolean)
    .filter((line) => /(\bNOT PASS\b|\bPASS\b|\bERROR\b|\bWARNING\b|BR-|KSA-|\bXSD\b|\bSCHEMATRON\b|\bVALID\b)/i.test(line))
    .slice(0, 50);
}

function isInsidePath(child: string, parent: string): boolean {
  const relation = relative(parent, child);
  return relation === "" || (!relation.startsWith("..") && !isAbsolute(relation));
}
