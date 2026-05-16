import { PrismaClient } from "@prisma/client";
import { ZatcaService } from "../src/zatca/zatca.service";

interface CliOptions {
  help: boolean;
  invoiceId: string;
  keepTempFiles: boolean;
}

function parseOptions(argv: string[]): CliOptions {
  const invoiceIdFlagIndex = argv.indexOf("--invoice-id");
  const invoiceId =
    invoiceIdFlagIndex >= 0 && argv[invoiceIdFlagIndex + 1]
      ? argv[invoiceIdFlagIndex + 1]
      : process.env.ZATCA_LOCAL_SIGNED_XML_VALIDATE_INVOICE_ID ?? "";

  return {
    help: argv.includes("--help") || argv.includes("-h"),
    invoiceId: invoiceId.trim(),
    keepTempFiles: argv.includes("--keep-temp-files") || process.env.ZATCA_LOCAL_SIGNED_XML_VALIDATE_KEEP_TEMP_FILES === "true",
  };
}

function printHelp() {
  console.log(
    [
      "ZATCA local signed XML validation dry-run",
      "",
      "Local/non-production only. Signs and QR-generates temp XML only when the signing execution gate is explicitly enabled, then validates the signed temp XML with the official SDK.",
      "No CSID request, no ZATCA network call, no clearance/reporting, no PDF/A-3, no production credentials, no persistence, and no production compliance claim.",
      "",
      "Environment:",
      "  ZATCA_LOCAL_SIGNED_XML_VALIDATE_ORGANIZATION_ID   Optional organization id.",
      "  ZATCA_LOCAL_SIGNED_XML_VALIDATE_INVOICE_ID        Invoice id if --invoice-id is not supplied.",
      "  ZATCA_LOCAL_SIGNED_XML_VALIDATE_KEEP_TEMP_FILES   Set true to retain temp files for local debugging.",
      "  ZATCA_SDK_SIGNING_EXECUTION_ENABLED               Defaults false; when false, no SDK signing, QR, or signed XML validation occurs.",
      "  ZATCA_SDK_JAVA_BIN                                Optional pinned Java 11-14 executable for local SDK execution.",
      "",
      "Flags:",
      "  --invoice-id <id>      Required invoice id.",
      "  --keep-temp-files      Retain temporary XML files if execution is enabled.",
      "  --help                 Print this help without touching the database.",
    ].join("\n"),
  );
}

function summarizeCommandPlan(plan: { displayCommand?: string; command?: string | null; args?: string[]; envAdditions?: Record<string, string>; workingDirectory?: string; warnings?: string[] } | null) {
  if (!plan) {
    return null;
  }
  return {
    displayCommand: plan.displayCommand ?? "",
    commandAvailable: Boolean(plan.command),
    argsCount: plan.args?.length ?? 0,
    envKeys: Object.keys(plan.envAdditions ?? {}),
    workingDirectory: plan.workingDirectory ?? null,
    warnings: plan.warnings ?? [],
  };
}

function blockedSummary(blockers: string[]) {
  return {
    localOnly: true,
    dryRun: true,
    noMutation: true,
    noCsidRequest: true,
    noNetwork: true,
    noClearanceReporting: true,
    noPdfA3: true,
    noProductionCredentials: true,
    noPersistence: true,
    productionCompliance: false,
    executionEnabled: process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED === "true",
    executionAttempted: false,
    signingExecutionStatus: "SKIPPED",
    validationAttempted: false,
    validationGlobalResult: "NOT_RUN",
    signedXmlDetected: false,
    qrDetected: false,
    blockers,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.invoiceId) {
    console.log(JSON.stringify(blockedSummary(["Invoice id is required. Pass --invoice-id <id> or set ZATCA_LOCAL_SIGNED_XML_VALIDATE_INVOICE_ID."]), null, 2));
    return;
  }

  const prisma = new PrismaClient();
  try {
    let organizationId = process.env.ZATCA_LOCAL_SIGNED_XML_VALIDATE_ORGANIZATION_ID?.trim() || "";
    if (!organizationId) {
      const invoice = await prisma.salesInvoice.findUnique({ where: { id: options.invoiceId }, select: { organizationId: true } });
      organizationId = invoice?.organizationId ?? "";
    }

    if (!organizationId) {
      console.log(JSON.stringify(blockedSummary(["No organization was found for the supplied invoice id."]), null, 2));
      return;
    }

    const service = new ZatcaService(prisma as never, { log: async () => undefined } as never);
    const result = await service.getInvoiceZatcaLocalSignedXmlValidationDryRun(organizationId, options.invoiceId, {
      keepTempFiles: options.keepTempFiles,
    });

    console.log(
      JSON.stringify(
        {
          localOnly: result.localOnly,
          dryRun: result.dryRun,
          noMutation: result.noMutation,
          noCsidRequest: result.noCsidRequest,
          noNetwork: result.noNetwork,
          noClearanceReporting: result.noClearanceReporting,
          noPdfA3: result.noPdfA3,
          noProductionCredentials: result.noProductionCredentials,
          noPersistence: result.noPersistence,
          productionCompliance: result.productionCompliance,
          invoiceId: result.invoiceId,
          invoiceNumber: result.invoiceNumber,
          invoiceType: result.invoiceType,
          executionEnabled: result.executionEnabled,
          executionAttempted: result.executionAttempted,
          signingExecutionStatus: result.signingExecutionStatus,
          signingExecuted: result.signingExecuted,
          qrExecuted: result.qrExecuted,
          sdkExitCode: result.sdkExitCode,
          qrSdkExitCode: result.qrSdkExitCode,
          validationAttempted: result.validationAttempted,
          validationExitCode: result.validationExitCode,
          validationTimedOut: result.validationTimedOut,
          validationGlobalResult: result.validationGlobalResult,
          validationResults: result.validationResults,
          validationMessages: result.validationMessages,
          validationCommandPlan: summarizeCommandPlan(result.validationCommandPlan),
          signedXmlDetected: result.signedXmlDetected,
          qrDetected: result.qrDetected,
          tempFilesWritten: result.tempFilesWritten,
          cleanup: result.cleanup,
          blockers: result.blockers,
          warnings: result.warnings,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
