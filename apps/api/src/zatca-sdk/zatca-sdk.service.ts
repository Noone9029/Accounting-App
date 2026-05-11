import { BadRequestException, Injectable, NotImplementedException } from "@nestjs/common";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { ValidateZatcaSdkXmlDto } from "./dto/validate-zatca-sdk-xml.dto";
import {
  buildZatcaSdkValidationCommand,
  discoverZatcaSdkReadiness,
  isZatcaSdkExecutionEnabled,
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

  async validateXmlLocal(_organizationId: string, _dto: ValidateZatcaSdkXmlDto) {
    if (!isZatcaSdkExecutionEnabled()) {
      throw new BadRequestException("Local SDK execution is disabled. Set ZATCA_SDK_EXECUTION_ENABLED=true to enable local-only validation.");
    }

    throw new NotImplementedException("Local SDK execution is not implemented until the command format is verified from SDK docs.");
  }

  private async resolveXmlPayload(organizationId: string, dto: ValidateZatcaSdkXmlDto): Promise<{ xmlBase64: string; source: "invoice" | "request" }> {
    if (dto.invoiceId && dto.xmlBase64) {
      throw new BadRequestException("Provide either invoiceId or xmlBase64, not both.");
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

    if (!dto.xmlBase64?.trim()) {
      throw new BadRequestException("Provide xmlBase64 or invoiceId for SDK validation dry run.");
    }

    return { xmlBase64: dto.xmlBase64, source: "request" };
  }
}

function redactReadiness(readiness: ZatcaSdkReadiness) {
  return {
    referenceFolderFound: readiness.referenceFolderFound,
    sdkJarFound: readiness.sdkJarFound,
    fatooraLauncherFound: readiness.fatooraLauncherFound,
    jqFound: readiness.jqFound,
    javaFound: readiness.javaFound,
    javaVersion: readiness.javaVersion,
    javaMajorVersion: readiness.javaMajorVersion,
    javaVersionSupported: readiness.javaVersionSupported,
    projectPathHasSpaces: readiness.projectPathHasSpaces,
    canAttemptSdkValidation: readiness.canAttemptSdkValidation,
    warnings: readiness.warnings,
    suggestedFixes: readiness.suggestedFixes,
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
