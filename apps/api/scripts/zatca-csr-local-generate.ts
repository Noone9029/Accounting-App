import { PrismaClient } from "@prisma/client";
import { ZatcaService } from "../src/zatca/zatca.service";

interface CliOptions {
  help: boolean;
  keepTempFiles: boolean;
}

function parseOptions(argv: string[]): CliOptions {
  return {
    help: argv.includes("--help") || argv.includes("-h"),
    keepTempFiles: argv.includes("--keep-temp-files") || process.env.ZATCA_CSR_LOCAL_GENERATE_KEEP_TEMP_FILES === "true",
  };
}

function printHelp() {
  console.log(
    [
      "ZATCA CSR local generation gate",
      "",
      "Local/non-production only. Requires ZATCA_SDK_CSR_EXECUTION_ENABLED=true and an APPROVED CSR config review.",
      "No CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, and no production compliance claim.",
      "",
      "Environment:",
      "  ZATCA_CSR_LOCAL_GENERATE_ORGANIZATION_ID  Optional organization id.",
      "  ZATCA_CSR_LOCAL_GENERATE_EGS_ID           Optional EGS unit id.",
      "  ZATCA_CSR_LOCAL_GENERATE_KEEP_TEMP_FILES  Set true to retain temp files for local debugging.",
      "  ZATCA_SDK_CSR_EXECUTION_ENABLED           Defaults false; when false, no SDK execution or temp key/CSR generation occurs.",
      "",
      "Flags:",
      "  --keep-temp-files     Retain prepared temp files. Otherwise cleanup is performed.",
      "  --help                Print this help without touching the database.",
    ].join("\n"),
  );
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const prisma = new PrismaClient();
  try {
    const egsIdFromEnv = process.env.ZATCA_CSR_LOCAL_GENERATE_EGS_ID?.trim() || "";
    let organizationId = process.env.ZATCA_CSR_LOCAL_GENERATE_ORGANIZATION_ID?.trim() || "";

    if (!organizationId && egsIdFromEnv) {
      const egs = await prisma.zatcaEgsUnit.findUnique({ where: { id: egsIdFromEnv }, select: { organizationId: true } });
      organizationId = egs?.organizationId ?? "";
    }

    if (!organizationId) {
      const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
      organizationId = organization?.id ?? "";
    }

    if (!organizationId) {
      console.log(
        JSON.stringify(
          {
            localOnly: true,
            noMutation: true,
            noCsidRequest: true,
            noNetwork: true,
            noSigning: true,
            noPersistence: true,
            productionCompliance: false,
            executionEnabled: process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED === "true",
            executionAttempted: false,
            executionSkipped: true,
            blockers: ["No organization was found for CSR local generation."],
          },
          null,
          2,
        ),
      );
      return;
    }

    const egsUnit = egsIdFromEnv
      ? await prisma.zatcaEgsUnit.findFirst({ where: { id: egsIdFromEnv, organizationId }, select: { id: true, environment: true } })
      : await prisma.zatcaEgsUnit.findFirst({
          where: { organizationId, environment: { not: "PRODUCTION" } },
          orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
          select: { id: true, environment: true },
        });

    if (!egsUnit) {
      console.log(
        JSON.stringify(
          {
            localOnly: true,
            noMutation: true,
            noCsidRequest: true,
            noNetwork: true,
            noSigning: true,
            noPersistence: true,
            productionCompliance: false,
            executionEnabled: process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED === "true",
            executionAttempted: false,
            executionSkipped: true,
            blockers: ["No non-production EGS unit was found for CSR local generation."],
          },
          null,
          2,
        ),
      );
      return;
    }

    const service = new ZatcaService(prisma as never, { log: async () => undefined } as never);
    const result = await service.getEgsUnitCsrLocalGenerate(organizationId, egsUnit.id, {
      keepTempFiles: options.keepTempFiles,
    });

    console.log(
      JSON.stringify(
        {
          localOnly: result.localOnly,
          noMutation: result.noMutation,
          noCsidRequest: result.noCsidRequest,
          noNetwork: result.noNetwork,
          noSigning: result.noSigning,
          noPersistence: result.noPersistence,
          productionCompliance: result.productionCompliance,
          executionEnabled: result.executionEnabled,
          executionAttempted: result.executionAttempted,
          executionSkipped: result.executionSkipped,
          executionSkipReason: result.executionSkipReason,
          reviewId: result.reviewId,
          latestReviewStatus: result.latestReviewStatus,
          configHash: result.configHash,
          sdkCommand: result.sdkCommand,
          commandPlan: {
            displayCommand: result.commandPlan.displayCommand,
            commandAvailable: Boolean(result.commandPlan.command),
            argsCount: result.commandPlan.args.length,
            envKeys: Object.keys(result.commandPlan.envAdditions),
            workingDirectory: result.commandPlan.workingDirectory,
            warnings: result.commandPlan.warnings,
          },
          tempFilesWritten: result.tempFilesWritten,
          cleanup: result.cleanup,
          sdkExitCode: result.sdkExitCode,
          timedOut: result.timedOut,
          generatedCsrDetected: result.generatedCsrDetected,
          privateKeyDetected: result.privateKeyDetected,
          stdoutSummary: result.stdoutSummary,
          stderrSummary: result.stderrSummary,
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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "CSR local generation gate failed.");
  process.exitCode = 1;
});
