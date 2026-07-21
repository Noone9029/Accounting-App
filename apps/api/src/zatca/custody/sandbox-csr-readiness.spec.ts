import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SandboxLocalDpapiComplianceCsidCustodyProvider } from "./compliance-csid-secret-custody.provider";
import { SandboxCsrReadinessService } from "./sandbox-csr-readiness";

describe("sandbox CSR readiness", () => {
  it("creates and verifies a synthetic secp256k1 CSR through custody without returning key or CSR bodies", async () => {
    const storageDirectory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-csr-"));
    const custody = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      protector: {
        protect: async (value) => Buffer.from(`protected:${value.toString("base64")}`, "utf8"),
        unprotect: async (value) => Buffer.from(value.toString("utf8").replace("protected:", ""), "base64"),
      },
    });
    const service = new SandboxCsrReadinessService({ custody, now: () => new Date("2026-07-21T00:00:00.000Z") });

    try {
      const result = await service.createSyntheticCsr({
        organizationId: "11111111-1111-1111-1111-111111111111",
        egsUnitId: "22222222-2222-2222-2222-222222222222",
        keyReferenceId: "synthetic-sandbox-signing-key",
        csrReferenceId: "synthetic-sandbox-csr",
        subject: {
          commonName: "SYNTHETIC-EGS-001",
          serialNumber: "1-Synthetic|2-Sandbox|3-001",
          organizationName: "LedgerByte Synthetic Sandbox",
          organizationalUnitName: "Synthetic Unit",
          countryName: "SA",
          localityName: "Riyadh",
          solutionName: "LedgerByte Synthetic",
          businessCategory: "Synthetic accounting test",
        },
      });

      expect(result.algorithm).toBe("EC_SECP256K1");
      expect(result.csrVerified).toBe(true);
      expect(result.publicKeyMatchesCustody).toBe(true);
      expect(result.privateKeyReturned).toBe(false);
      expect(result.csrBodyReturned).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(/BEGIN (EC )?PRIVATE KEY|BEGIN CERTIFICATE REQUEST|synthetic-sandbox-signing-key/i);
    } finally {
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("rejects incomplete or non-Saudi synthetic profiles before generating or storing a key", async () => {
    const storageDirectory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-csr-"));
    const custody = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      protector: { protect: async (value) => value, unprotect: async (value) => value },
    });
    const service = new SandboxCsrReadinessService({ custody });
    const base = {
      organizationId: "11111111-1111-1111-1111-111111111111",
      egsUnitId: "22222222-2222-2222-2222-222222222222",
      keyReferenceId: "synthetic-key",
      csrReferenceId: "synthetic-csr",
      subject: { commonName: "SYNTHETIC", serialNumber: "1-Synthetic", organizationName: "Synthetic", organizationalUnitName: "Synthetic", countryName: "SA", localityName: "Riyadh", solutionName: "Synthetic", businessCategory: "Synthetic" },
    };
    try {
      await expect(service.createSyntheticCsr({ ...base, subject: { ...base.subject, countryName: "US" } })).rejects.toThrow("Sandbox CSR readiness operation failed");
      await expect(service.createSyntheticCsr({ ...base, subject: { ...base.subject, solutionName: "" } })).rejects.toThrow("Sandbox CSR readiness operation failed");
      expect(await custody.listMetadataOnly()).toEqual([]);
    } finally {
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("rejects production-looking custody before a CSR key can be generated", async () => {
    const storageDirectory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-csr-"));
    const custody = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "PRODUCTION" as never,
      storageDirectory,
      protector: { protect: async (value) => value, unprotect: async (value) => value },
    });
    const service = new SandboxCsrReadinessService({ custody });
    try {
      await expect(
        service.createSyntheticCsr({
          organizationId: "11111111-1111-1111-1111-111111111111",
          egsUnitId: "22222222-2222-2222-2222-222222222222",
          keyReferenceId: "synthetic-key",
          csrReferenceId: "synthetic-csr",
          subject: { commonName: "SYNTHETIC", serialNumber: "1-Synthetic", organizationName: "Synthetic", organizationalUnitName: "Synthetic", countryName: "SA", localityName: "Riyadh", solutionName: "Synthetic", businessCategory: "Synthetic" },
        }),
      ).rejects.toThrow("Sandbox CSR readiness operation failed");
      expect(await custody.listMetadataOnly()).toEqual([]);
    } finally {
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });
});
