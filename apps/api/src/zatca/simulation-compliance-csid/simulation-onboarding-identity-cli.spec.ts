import { parseSimulationOnboardingIdentityCliArguments, runSimulationOnboardingIdentityCli, SimulationOnboardingIdentityCliError } from "../../../scripts/zatca-prepare-simulation-onboarding-identity";

describe("Simulation onboarding identity preparation CLI", () => {
  const valid = ["--prepare-synthetic", "--external-directory", "E:\\external\\identity", "--custody-directory", "E:\\external\\custody", "--organization-reference", "synthetic-org-001", "--egs-reference", "synthetic-egs-001", "--identity-reference", "synthetic-identity-001", "--no-network", "--metadata-json"];

  it("accepts only explicit absolute external paths and synthetic references", () => {
    expect(parseSimulationOnboardingIdentityCliArguments(valid)).toEqual(expect.objectContaining({ prepareSynthetic: true, noNetwork: true, metadataJson: true, organizationReference: "synthetic-org-001", egsReference: "synthetic-egs-001", identityReference: "synthetic-identity-001" }));
  });

  it.each([
    ["a relative output path", valid.map((value) => value === "E:\\external\\identity" ? "identity" : value)],
    ["a non-synthetic organization", valid.map((value) => value === "synthetic-org-001" ? "customer-org-001" : value)],
    ["a missing no-network gate", valid.filter((value) => value !== "--no-network")],
    ["an unknown option", [...valid, "--network"]],
  ])("rejects %s before custody or key generation", (_name, argv) => {
    expect(() => parseSimulationOnboardingIdentityCliArguments(argv)).toThrow(SimulationOnboardingIdentityCliError);
  });

  it("rejects environment configurations that could combine preparation with a network execution", async () => {
    await expect(runSimulationOnboardingIdentityCli({ argv: valid, cwd: process.cwd(), environment: { APP_ENV: "LOCAL", ZATCA_SIMULATION_IDENTITY_PREPARATION_ENABLED: "true", ZATCA_ENABLE_REAL_NETWORK: "true" } })).rejects.toMatchObject({ code: "IDENTITY_CLI_ENVIRONMENT_REJECTED" });
  });
});
