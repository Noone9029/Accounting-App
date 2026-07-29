import { resolve } from "node:path";
import { SandboxLocalDpapiComplianceCsidCustodyProvider } from "../src/zatca/custody/compliance-csid-secret-custody.provider";
import { prepareSyntheticSimulationOnboardingIdentity } from "../src/zatca/simulation-compliance-csid/simulation-onboarding-identity";

export class SimulationOnboardingIdentityCliError extends Error {
  constructor(readonly code: string) {
    super("Simulation onboarding identity preparation was rejected.");
    this.name = "SimulationOnboardingIdentityCliError";
  }
}

export interface SimulationOnboardingIdentityCliArguments {
  prepareSynthetic: true;
  externalDirectory: string;
  custodyDirectory: string;
  organizationReference: string;
  egsReference: string;
  identityReference: string;
  noNetwork: true;
  metadataJson: true;
}

export function parseSimulationOnboardingIdentityCliArguments(argv: readonly string[]): SimulationOnboardingIdentityCliArguments {
  const values = argv[0] === "--" ? argv.slice(1) : argv;
  const flags = new Set(["--prepare-synthetic", "--external-directory", "--custody-directory", "--organization-reference", "--egs-reference", "--identity-reference", "--no-network", "--metadata-json"]);
  const requiredBoolean = ["--prepare-synthetic", "--no-network", "--metadata-json"];
  const valueFlags = ["--external-directory", "--custody-directory", "--organization-reference", "--egs-reference", "--identity-reference"];
  if (values.length !== 13 || values.some((value) => value.startsWith("--") && !flags.has(value)) || [...requiredBoolean, ...valueFlags].some((flag) => values.filter((value) => value === flag).length !== 1)) throw new SimulationOnboardingIdentityCliError("IDENTITY_CLI_ARGUMENTS_REJECTED");
  const valueFor = (flag: string): string => {
    const index = values.indexOf(flag);
    if (index < 0 || typeof values[index + 1] !== "string" || values[index + 1]!.startsWith("--")) throw new SimulationOnboardingIdentityCliError("IDENTITY_CLI_ARGUMENTS_REJECTED");
    return values[index + 1]!;
  };
  const absoluteValue = (flag: string): string => { const value = valueFor(flag); if (!isLocalAbsolutePath(value)) throw new SimulationOnboardingIdentityCliError("IDENTITY_CLI_ARGUMENTS_REJECTED"); return value; };
  const syntheticReference = (flag: string): string => {
    const value = valueFor(flag);
    if (!value.startsWith("synthetic-") || !/^[A-Za-z0-9_-]{8,128}$/u.test(value)) throw new SimulationOnboardingIdentityCliError("IDENTITY_CLI_ARGUMENTS_REJECTED");
    return value;
  };
  return { prepareSynthetic: true, externalDirectory: absoluteValue("--external-directory"), custodyDirectory: absoluteValue("--custody-directory"), organizationReference: syntheticReference("--organization-reference"), egsReference: syntheticReference("--egs-reference"), identityReference: syntheticReference("--identity-reference"), noNetwork: true, metadataJson: true };
}

export async function runSimulationOnboardingIdentityCli(input: { argv: readonly string[]; cwd: string; environment?: NodeJS.ProcessEnv }): Promise<Record<string, unknown>> {
  const args = parseSimulationOnboardingIdentityCliArguments(input.argv);
  const environment = input.environment ?? process.env;
  const runtimeEnvironment = (environment.APP_ENV ?? environment.NODE_ENV ?? "").trim().toUpperCase();
  if (environment.ZATCA_SIMULATION_IDENTITY_PREPARATION_ENABLED !== "true" || environment.ZATCA_ENABLE_REAL_NETWORK === "true" || environment.ZATCA_SANDBOX_BASE_URL !== undefined || (runtimeEnvironment !== "LOCAL" && runtimeEnvironment !== "TEST")) throw new SimulationOnboardingIdentityCliError("IDENTITY_CLI_ENVIRONMENT_REJECTED");
  try {
    const custody = new SandboxLocalDpapiComplianceCsidCustodyProvider({ environment: "LOCAL_TEST", storageDirectory: resolve(args.custodyDirectory) });
    return { ...(await prepareSyntheticSimulationOnboardingIdentity({
      custody,
      repositoryRoot: resolve(input.cwd),
      externalDirectory: resolve(args.externalDirectory),
      organizationId: args.organizationReference,
      egsUnitId: args.egsReference,
      identityReferenceId: args.identityReference,
      subject: {
        commonName: `SYNTHETIC-${args.identityReference}`,
        serialNumber: `1-Synthetic|2-Sandbox|3-${args.identityReference}`,
        organizationIdentifier: `SYNTHETIC-${args.organizationReference}`,
        organizationalUnitName: "Synthetic Simulation Unit",
        organizationName: "LedgerByte Synthetic Sandbox",
        countryName: "SA",
        invoiceType: "1100",
        locationAddress: "Riyadh Synthetic District",
        businessCategory: "Synthetic accounting test",
      },
    })) };
  } catch (error) {
    if (error instanceof SimulationOnboardingIdentityCliError) throw error;
    const code = error instanceof Error && "code" in error && typeof error.code === "string" && /^[A-Z][A-Z0-9_]{2,127}$/u.test(error.code) ? error.code : "IDENTITY_CLI_PREPARATION_REJECTED";
    throw new SimulationOnboardingIdentityCliError(code);
  }
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${JSON.stringify(await runSimulationOnboardingIdentityCli({ argv: process.argv.slice(2), cwd: process.cwd() }))}\n`);
  } catch (error) {
    const code = error instanceof SimulationOnboardingIdentityCliError ? error.code : "IDENTITY_CLI_PREPARATION_REJECTED";
    process.stderr.write(`${JSON.stringify({ status: "SIMULATION_ONBOARDING_IDENTITY_BLOCKED", safeErrorCodes: [code], networkCallsMade: false })}\n`);
    process.exitCode = 1;
  }
}

function isLocalAbsolutePath(value: string): boolean {
  return /^(?:[A-Za-z]:[\\/]|\/)(?!\/)/u.test(value) && !/^(?:\\\\|\/\/)/u.test(value);
}

if (require.main === module) void main();
