import { BadRequestException, Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { ValidateZatcaSdkFixtureDto, ValidateZatcaSdkXmlDto } from "./dto/validate-zatca-sdk-xml.dto";
import {
  buildZatcaSdkValidationCommand,
  discoverZatcaSdkReadiness,
  type ZatcaSdkReadiness,
  type ZatcaSdkValidationCommandPlan,
} from "./zatca-sdk-paths";

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
  stdoutSummary: string;
  stderrSummary: string;
  validationMessages: string[];
  blockingReasons: string[];
  warnings: string[];
  xmlSource: "generated" | "fixture" | "uploaded" | "invoice" | "request";
  invoiceType?: "standard" | "simplified";
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
    });
  }

  async validateReferenceFixtureLocal(_organizationId: string, dto: ValidateZatcaSdkFixtureDto): Promise<ZatcaSdkValidationResponse> {
    const fixturePath = this.resolveAllowedFixturePath(dto.fixturePath);
    const xml = await readFile(fixturePath, "utf8");
    return this.validateXmlStringLocal(xml, { source: "fixture", tempName: fixturePath.split(/[\\/]/).at(-1) ?? "fixture.xml" });
  }

  async validateInvoiceXmlLocal(organizationId: string, invoiceId: string): Promise<ZatcaSdkValidationResponse> {
    const { xml } = await this.resolveXmlStringPayload(organizationId, { invoiceId });
    return this.validateXmlStringLocal(xml, { source: "generated", tempName: invoiceId });
  }

  private async resolveXmlPayload(organizationId: string, dto: ValidateZatcaSdkXmlDto): Promise<{ xmlBase64: string; source: "invoice" | "request" }> {
    if (dto.invoiceId && (dto.xmlBase64 || dto.xml)) {
      throw new BadRequestException("Provide either invoiceId or XML payload, not both.");
    }

    if (dto.invoiceId) {
      const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({
        where: { organizationId, invoiceId: dto.invoiceId },
        select: { xmlBase64: true },
      });

      if (!metadata?.xmlBase64) {
        throw new BadRequestException("ZATCA XML has not been generated for this invoice.");
      }

      return { xmlBase64: metadata.xmlBase64, source: "invoice" };
    }

    if (dto.xml?.trim()) {
      return { xmlBase64: Buffer.from(dto.xml, "utf8").toString("base64"), source: "request" };
    }

    if (!dto.xmlBase64?.trim()) {
      throw new BadRequestException("Provide xml, xmlBase64, or invoiceId for SDK validation.");
    }

    return { xmlBase64: dto.xmlBase64, source: "request" };
  }

  private async resolveXmlStringPayload(organizationId: string, dto: ValidateZatcaSdkXmlDto): Promise<{ xml: string; source: "invoice" | "request" }> {
    const { xmlBase64, source } = await this.resolveXmlPayload(organizationId, dto);
    const xml = Buffer.from(xmlBase64, "base64").toString("utf8").trim();
    if (!xml) {
      throw new BadRequestException("ZATCA XML payload is empty.");
    }
    assertXmlSize(xml);
    return { xml, source };
  }

  private async validateXmlStringLocal(
    xml: string,
    options: { source: ZatcaSdkValidationResponse["xmlSource"]; tempName: string; invoiceType?: "standard" | "simplified" },
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
      });
    }

    if (!readiness.canRunLocalValidation) {
      return buildBlockedValidationResponse(readiness, {
        disabled: false,
        warnings,
        source: options.source,
        invoiceType: options.invoiceType,
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
          blockingReasons: ["No executable ZATCA SDK command could be resolved."],
        });
      }

      const executed = await executeCommand(commandPlan, readiness.timeoutMs);
      const stdoutSummary = sanitizeZatcaSdkOutput(executed.stdout);
      const stderrSummary = sanitizeZatcaSdkOutput(executed.stderr);

      return {
        success: executed.exitCode === 0,
        disabled: false,
        localOnly: true,
        officialValidationAttempted: true,
        sdkExitCode: executed.exitCode,
        stdoutSummary,
        stderrSummary,
        validationMessages: extractValidationMessages(`${stdoutSummary}\n${stderrSummary}`),
        blockingReasons: executed.timedOut ? ["ZATCA SDK validation timed out."] : [],
        warnings: [...warnings, ...commandPlan.warnings],
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

    const readiness = discoverZatcaSdkReadiness();
    const projectRoot = readiness.projectRoot;
    const requestedPath = resolve(projectRoot, trimmed);
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
    projectPathHasSpaces: readiness.projectPathHasSpaces,
    canAttemptSdkValidation: readiness.canAttemptSdkValidation,
    canRunLocalValidation: readiness.canRunLocalValidation,
    blockingReasons: readiness.blockingReasons,
    warnings: readiness.warnings,
    suggestedFixes: readiness.suggestedFixes,
    timeoutMs: readiness.timeoutMs,
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

function buildBlockedValidationResponse(
  readiness: ZatcaSdkReadiness,
  options: {
    disabled: boolean;
    warnings: string[];
    source: ZatcaSdkValidationResponse["xmlSource"];
    invoiceType?: "standard" | "simplified";
    blockingReasons?: string[];
  },
): ZatcaSdkValidationResponse {
  return {
    success: false,
    disabled: options.disabled,
    localOnly: true,
    officialValidationAttempted: false,
    sdkExitCode: null,
    stdoutSummary: "",
    stderrSummary: "",
    validationMessages: [],
    blockingReasons: options.blockingReasons ?? readiness.blockingReasons,
    warnings: options.warnings,
    xmlSource: options.source,
    invoiceType: options.invoiceType,
  };
}

function executeCommand(commandPlan: ZatcaSdkValidationCommandPlan, timeoutMs: number): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolveResult) => {
    const env = { ...process.env };
    if (commandPlan.envAdditions.PATH_PREPEND) {
      env.PATH = `${commandPlan.envAdditions.PATH_PREPEND}${process.platform === "win32" ? ";" : ":"}${env.PATH ?? ""}`;
    }

    execFile(commandPlan.command!, commandPlan.args, { cwd: commandPlan.workingDirectory, env, timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      const maybeCode = error && typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number" ? ((error as NodeJS.ErrnoException & { code: number }).code) : null;
      resolveResult({
        exitCode: error ? maybeCode : 0,
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? error?.message ?? ""),
        timedOut: Boolean(error && /timed out/i.test(error.message)),
      });
    });
  });
}

export function sanitizeZatcaSdkOutput(output: string): string {
  return output
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED]")
    .replace(/(password|passwordHash|token|tokenHash|secret|apiKey|accessKey|privateKey|privateKeyPem|authorization|contentBase64)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/(DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|JWT_SECRET|S3_SECRET_ACCESS_KEY)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, OUTPUT_SUMMARY_LIMIT);
}

function extractValidationMessages(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => sanitizeZatcaSdkOutput(line.trim()))
    .filter(Boolean)
    .filter((line) => /(PASS|NOT PASS|ERROR|WARNING|BR-|KSA-|XSD|SCHEMATRON|VALID)/i.test(line))
    .slice(0, 50);
}

function isInsidePath(child: string, parent: string): boolean {
  const relation = relative(parent, child);
  return relation === "" || (!relation.startsWith("..") && !isAbsolute(relation));
}
