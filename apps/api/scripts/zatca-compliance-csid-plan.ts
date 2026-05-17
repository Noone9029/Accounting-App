import { PrismaClient } from "@prisma/client";
import { ZatcaService } from "../src/zatca/zatca.service";

interface CliOptions {
  help: boolean;
  egsId: string;
}

function optionValue(argv: string[], name: string): string {
  const index = argv.indexOf(name);
  return index >= 0 && index + 1 < argv.length ? argv[index + 1] : "";
}

function parseOptions(argv: string[]): CliOptions {
  return {
    help: argv.includes("--help") || argv.includes("-h"),
    egsId: optionValue(argv, "--egs-id") || process.env.ZATCA_COMPLIANCE_CSID_PLAN_EGS_ID?.trim() || "",
  };
}

function printHelp() {
  console.log(
    [
      "ZATCA compliance CSID onboarding plan",
      "",
      "Prints a sanitized local-only sandbox compliance CSID request plan for a non-production EGS unit.",
      "No CSID request, no OTP storage, no private key/certificate/token/secret output, no ZATCA network call, no clearance/reporting, no PDF/A-3, and no production compliance claim.",
      "",
      "Environment:",
      "  ZATCA_COMPLIANCE_CSID_PLAN_ORGANIZATION_ID     Optional organization id.",
      "  ZATCA_COMPLIANCE_CSID_PLAN_EGS_ID              Optional EGS unit id.",
      "  ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED Defaults false; this script still prints a plan only.",
      "",
      "Flags:",
      "  --egs-id <id>       EGS unit id. Defaults to the latest non-production EGS for the organization.",
      "  --help              Print this help without touching the database.",
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
    let organizationId = process.env.ZATCA_COMPLIANCE_CSID_PLAN_ORGANIZATION_ID?.trim() || "";

    if (!organizationId && options.egsId) {
      const egs = await prisma.zatcaEgsUnit.findUnique({ where: { id: options.egsId }, select: { organizationId: true } });
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
            noNetwork: true,
            noCsidRequest: true,
            productionCompliance: false,
            executionEnabled: process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED === "true",
            executionAttempted: false,
            blockers: ["No organization was found for compliance CSID planning."],
          },
          null,
          2,
        ),
      );
      return;
    }

    const egsUnit = options.egsId
      ? await prisma.zatcaEgsUnit.findFirst({ where: { id: options.egsId, organizationId }, select: { id: true, environment: true } })
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
            noNetwork: true,
            noCsidRequest: true,
            productionCompliance: false,
            executionEnabled: process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED === "true",
            executionAttempted: false,
            blockers: ["No non-production EGS unit was found for compliance CSID planning."],
          },
          null,
          2,
        ),
      );
      return;
    }

    const service = new ZatcaService(prisma as never, { log: async () => undefined } as never);
    const plan = await service.getEgsUnitComplianceCsidRequestPlan(organizationId, egsUnit.id);

    console.log(
      JSON.stringify(
        {
          localOnly: plan.localOnly,
          dryRun: plan.dryRun,
          noMutation: plan.noMutation,
          noNetwork: plan.noNetwork,
          noCsidRequest: plan.noCsidRequest,
          noProductionCredentials: plan.noProductionCredentials,
          noClearanceReporting: plan.noClearanceReporting,
          noPdfA3: plan.noPdfA3,
          productionCompliance: plan.productionCompliance,
          executionEnabled: plan.executionEnabled,
          executionAttempted: plan.executionAttempted,
          egsUnit: plan.egsUnit,
          csrStatus: plan.csrStatus,
          otpStatus: plan.otpStatus,
          plannedEndpointEnvironment: plan.plannedEndpointEnvironment,
          plannedEndpoint: plan.plannedEndpoint,
          plannedHeadersRedacted: plan.plannedHeadersRedacted,
          plannedBodyFieldsRedacted: plan.plannedBodyFieldsRedacted,
          sensitiveResponseFields: plan.sensitiveResponseFields,
          blockers: plan.blockers,
          warnings: plan.warnings,
          recommendedNextSteps: plan.recommendedNextSteps,
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
  console.error(error instanceof Error ? error.message : "Compliance CSID plan failed.");
  process.exitCode = 1;
});
