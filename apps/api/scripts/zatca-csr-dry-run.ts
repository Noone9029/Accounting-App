import { PrismaClient } from "@prisma/client";
import { ZatcaService } from "../src/zatca/zatca.service";

interface CliOptions {
  help: boolean;
  prepareFiles: boolean;
  keepTempFiles: boolean;
}

function parseOptions(argv: string[]): CliOptions {
  return {
    help: argv.includes("--help") || argv.includes("-h"),
    prepareFiles: argv.includes("--prepare-files") || process.env.ZATCA_CSR_DRY_RUN_PREPARE_FILES === "true",
    keepTempFiles: argv.includes("--keep-temp-files") || process.env.ZATCA_CSR_DRY_RUN_KEEP_TEMP_FILES === "true",
  };
}

function printHelp() {
  console.log(
    [
      "ZATCA CSR dry-run planner",
      "",
      "Local/non-production only. No CSID request, no ZATCA network call, no invoice signing, and no production compliance claim.",
      "",
      "Environment:",
      "  ZATCA_CSR_DRY_RUN_ORGANIZATION_ID  Optional organization id.",
      "  ZATCA_CSR_DRY_RUN_EGS_ID           Optional EGS unit id.",
      "  ZATCA_CSR_DRY_RUN_PREPARE_FILES    Set true to request temp CSR config preparation.",
      "  ZATCA_CSR_DRY_RUN_KEEP_TEMP_FILES  Set true to retain prepared temp files for debugging.",
      "  ZATCA_SDK_CSR_EXECUTION_ENABLED    Defaults false; this script still skips SDK execution in this safe phase.",
      "",
      "Flags:",
      "  --prepare-files       Request temp CSR config file preparation if no blockers exist.",
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
    const egsIdFromEnv = process.env.ZATCA_CSR_DRY_RUN_EGS_ID?.trim() || "";
    let organizationId = process.env.ZATCA_CSR_DRY_RUN_ORGANIZATION_ID?.trim() || "";

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
            dryRun: true,
            noMutation: true,
            noCsidRequest: true,
            noNetwork: true,
            productionCompliance: false,
            executionSkipped: true,
            blockers: ["No organization was found for CSR dry-run planning."],
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
            dryRun: true,
            noMutation: true,
            noCsidRequest: true,
            noNetwork: true,
            productionCompliance: false,
            executionSkipped: true,
            blockers: ["No non-production EGS unit was found for CSR dry-run planning."],
          },
          null,
          2,
        ),
      );
      return;
    }

    const service = new ZatcaService(prisma as never, { log: async () => undefined } as never);
    const result = await service.getEgsUnitCsrDryRun(organizationId, egsUnit.id, {
      prepareFiles: options.prepareFiles,
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
          productionCompliance: result.productionCompliance,
          executionEnabled: result.executionEnabled,
          executionSkipped: result.executionSkipped,
          executionSkipReason: result.executionSkipReason,
          prepareFilesRequested: result.prepareFilesRequested,
          tempDirectory: result.tempDirectory,
          plannedFiles: result.plannedFiles,
          preparedFiles: result.preparedFiles,
          sdkCommand: result.sdkCommand,
          commandPlan: {
            displayCommand: result.commandPlan.displayCommand,
            commandAvailable: Boolean(result.commandPlan.command),
            argsCount: result.commandPlan.args.length,
            envKeys: Object.keys(result.commandPlan.envAdditions),
            workingDirectory: result.commandPlan.workingDirectory,
            warnings: result.commandPlan.warnings,
          },
          capturedCsrFields: result.requiredFields
            .filter((field) => field.currentValue?.trim())
            .map((field) => ({
              key: field.sdkConfigKey,
              status: field.status,
              source: field.source,
              valuePreview: field.currentValue && field.currentValue.length > 24 ? `${field.currentValue.slice(0, 24)}...` : field.currentValue,
            })),
          missingCsrFields: result.requiredFields
            .filter((field) => field.status === "MISSING")
            .map((field) => ({ key: field.sdkConfigKey, source: field.source })),
          reviewCsrFields: result.requiredFields
            .filter((field) => field.status === "NEEDS_REVIEW")
            .map((field) => ({ key: field.sdkConfigKey, source: field.source, hasValue: Boolean(field.currentValue?.trim()) })),
          configPreparationBlocked: result.blockers.some((blocker) => blocker.includes("required official CSR fields") || blocker.includes("non-production EGS units")),
          csrFields: result.requiredFields.map((field) => ({
            key: field.sdkConfigKey,
            status: field.status,
            source: field.source,
            hasValue: Boolean(field.currentValue?.trim()),
          })),
          blockers: result.blockers,
          warnings: result.warnings,
          recommendedNextSteps: result.recommendedNextSteps,
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
  console.error(error instanceof Error ? error.message : "CSR dry-run failed.");
  process.exitCode = 1;
});
