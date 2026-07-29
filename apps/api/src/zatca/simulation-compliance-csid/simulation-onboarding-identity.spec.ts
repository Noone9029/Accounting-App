import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SandboxLocalDpapiComplianceCsidCustodyProvider } from "../custody/compliance-csid-secret-custody.provider";
import { prepareSyntheticSimulationOnboardingIdentity } from "./simulation-onboarding-identity";

describe("persistent synthetic Simulation onboarding identity", () => {
  it("stores a secp256k1 key in local DPAPI custody, writes the CSR outside the repository, and returns metadata only", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-identity-"));
    const custodyDirectory = join(directory, "custody");
    const externalDirectory = join(directory, "external");
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST", storageDirectory: custodyDirectory,
      protector: { protect: async (value) => Buffer.from(`protected:${value.toString("base64")}`, "utf8"), unprotect: async (value) => Buffer.from(value.toString("utf8").replace("protected:", ""), "base64") },
    });
    try {
      const result = await prepareSyntheticSimulationOnboardingIdentity({
        custody: provider, repositoryRoot: join(directory, "repository"), externalDirectory,
        organizationId: "synthetic-org-001", egsUnitId: "synthetic-egs-001", identityReferenceId: "synthetic-identity-001",
        subject: { commonName: "SYNTHETIC-EGS-001", serialNumber: "1-Synthetic|2-Sandbox|3-001", organizationIdentifier: "SYNTHETIC-synthetic-org-001", organizationalUnitName: "Synthetic Unit", organizationName: "LedgerByte Synthetic Sandbox", countryName: "SA", invoiceType: "1100", locationAddress: "Riyadh Synthetic District", businessCategory: "Synthetic accounting test" },
      });
      expect(result.csrVerified).toBe(true);
      expect(result.publicKeyMatchesCustody).toBe(true);
      expect(result.syntheticDataOnly).toBe(true);
      expect(result.privateKeyReturned).toBe(false);
      expect(result.csrBodyReturned).toBe(false);
      expect(result.identityMetadataPath).toBeUndefined();
      expect(JSON.stringify(result)).not.toMatch(/BEGIN |-----|custodyDirectory|externalDirectory/i);
      const metadata = JSON.parse(await readFile(join(externalDirectory, "synthetic-identity-001.json"), "utf8")) as { csrPath: string; csrSha256: string; keyReferenceId: string; subject: Record<string, string> };
      expect(metadata.csrSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata.keyReferenceId).toBe("simulation-signing-key-synthetic-identity-001");
      expect(Object.keys(metadata.subject)).toHaveLength(9);
      expect(metadata.subject).toEqual(expect.objectContaining({ invoiceType: "1100", locationAddress: "Riyadh Synthetic District" }));
      await expect(access(metadata.csrPath)).resolves.toBeUndefined();
      expect((await provider.listMetadataOnly()).length).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects production-looking or repository-owned output before key generation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-identity-"));
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST", storageDirectory: join(directory, "custody"),
      protector: { protect: async (value) => Buffer.from(value), unprotect: async (value) => Buffer.from(value) },
    });
    try {
      await expect(prepareSyntheticSimulationOnboardingIdentity({
        custody: provider, repositoryRoot: directory, externalDirectory: join(directory, "repository", "output"),
        organizationId: "synthetic-org", egsUnitId: "synthetic-egs", identityReferenceId: "synthetic-identity",
        subject: { commonName: "SYNTHETIC", serialNumber: "synthetic", organizationIdentifier: "synthetic", organizationalUnitName: "Synthetic", organizationName: "Synthetic", countryName: "SA", invoiceType: "1100", locationAddress: "Riyadh", businessCategory: "Synthetic" },
      })).rejects.toMatchObject({ code: "IDENTITY_EXTERNAL_PATH_REJECTED" });
      expect(await provider.listMetadataOnly()).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
