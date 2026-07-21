import {
  DisabledComplianceCsidSecretCustodyProvider,
  MockedKmsComplianceCsidCustodyProvider,
  MockedSecretsManagerComplianceCsidCustodyProvider,
  SandboxLocalDpapiComplianceCsidCustodyProvider,
  createComplianceCsidSecretCustodyProvider,
  readComplianceCsidCustodyProviderConfig,
  redactSecretReference,
} from "./custody/compliance-csid-secret-custody.provider";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ZatcaService } from "./zatca.service";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";

function makeSafeEgs(overrides: Record<string, unknown> = {}) {
  return {
    id: egsUnitId,
    organizationId,
    name: "LedgerByte Sandbox EGS",
    environment: "SANDBOX",
    status: "DEVELOPMENT",
    isActive: true,
    csrPem: "REDACTED_CSR_PRESENT",
    privateKeyPem: null,
    complianceCsidPem: null,
    productionCsidPem: null,
    certificateRequestId: null,
    lastInvoiceHash: null,
    lastIcv: 0,
    hashMode: "LOCAL_DETERMINISTIC",
    metadataCount: 0,
    deviceSerialNumber: "EGS-SANDBOX-001",
    csrCommonName: "LedgerByte Sandbox EGS",
    csrSerialNumber: "1-LedgerByte|2-Sandbox|3-001",
    csrOrganizationUnitName: "LedgerByte Demo Unit",
    csrInvoiceType: "1100",
    csrLocationAddress: "Riyadh",
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    organization: {
      findFirst: jest.fn().mockResolvedValue({
        id: organizationId,
        name: "LedgerByte Demo",
        legalName: "LedgerByte Demo LLC",
        taxNumber: "300000000000003",
        countryCode: "SA",
      }),
    },
    zatcaOrganizationProfile: {
      findFirst: jest.fn().mockResolvedValue({
        sellerName: "LedgerByte Demo LLC",
        vatNumber: "300000000000003",
        countryCode: "SA",
        businessCategory: "Accounting software",
      }),
    },
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(makeSafeEgs()),
    },
    zatcaComplianceCsidCustodyRecord: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    zatcaSubmissionLog: {
      create: jest.fn(),
    },
  };
  const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
  const onboardingAdapter = { requestComplianceCsid: jest.fn() };
  const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never, {
    realNetworkEnabled: false,
    mode: "mock",
  } as never);
  return { service, prisma, onboardingAdapter };
}

describe("ZATCA compliance CSID custody provider boundary", () => {
  const envKeys = [
    "ZATCA_CSID_CUSTODY_PROVIDER",
    "ZATCA_CSID_CUSTODY_KMS_KEY_ID",
    "ZATCA_CSID_CUSTODY_SECRET_PREFIX",
    "ZATCA_CSID_CUSTODY_REGION",
    "ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED",
    "ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE",
    "ZATCA_SANDBOX_LOCAL_CUSTODY_ENABLED",
    "ZATCA_SANDBOX_LOCAL_EXECUTION_CLASSIFICATION",
    "APP_ENV",
    "NODE_ENV",
  ] as const;

  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of envKeys) {
      const original = originalEnv[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  it("reads provider configuration as disabled by default without real provider calls", () => {
    for (const key of envKeys) {
      delete process.env[key];
    }

    const plan = readComplianceCsidCustodyProviderConfig();

    expect(plan.configuredProvider).toBe("DISABLED");
    expect(plan.providerEnabled).toBe(false);
    expect(plan.providerConfigPresent).toBe(false);
    expect(plan.kmsConfigured).toBe(false);
    expect(plan.secretsManagerConfigured).toBe(false);
    expect(plan.encryptedDbApproved).toBe(false);
    expect(plan.bodyStorageAllowed).toBe(false);
    expect(plan.productionCompliance).toBe(false);
    expect(JSON.stringify(plan)).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|binarySecurityToken|secret-value|access[_-]?key|password/i);
  });

  it("redacts provider configuration and keeps storage disabled even when env is set", () => {
    process.env.ZATCA_CSID_CUSTODY_PROVIDER = "secrets-manager";
    process.env.ZATCA_CSID_CUSTODY_KMS_KEY_ID = "arn:aws:kms:me-south-1:123456789012:key/raw-sensitive-key-id";
    process.env.ZATCA_CSID_CUSTODY_SECRET_PREFIX = "ledgerbyte/zatca/raw-sensitive-secret-prefix";
    process.env.ZATCA_CSID_CUSTODY_REGION = "me-south-1";
    process.env.ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED = "true";
    process.env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE = "true";

    const plan = readComplianceCsidCustodyProviderConfig();
    const serialized = JSON.stringify(plan);

    expect(plan.configuredProvider).toBe("FUTURE_SECRETS_MANAGER");
    expect(plan.providerEnabled).toBe(false);
    expect(plan.providerConfigPresent).toBe(true);
    expect(plan.kmsConfigured).toBe(true);
    expect(plan.secretsManagerConfigured).toBe(true);
    expect(plan.encryptedDbApproved).toBe(true);
    expect(plan.bodyStorageAllowed).toBe(false);
    expect(plan.configurationPresent.kmsKeyId).toBe(true);
    expect(plan.configurationPresent.secretPrefix).toBe(true);
    expect(plan.configurationPresent.region).toBe(true);
    expect(serialized).not.toContain("raw-sensitive-key-id");
    expect(serialized).not.toContain("raw-sensitive-secret-prefix");
    expect(serialized).not.toContain("me-south-1");
    expect(serialized).toContain("[redacted");
    expect(plan.blockers.some((blocker) => blocker.toLowerCase().includes("provider implementation disabled"))).toBe(true);
    expect(plan.blockers.some((blocker) => blocker.toLowerCase().includes("body storage explicitly blocked"))).toBe(true);
  });

  it("reports disabled provider readiness without exposing credentials", async () => {
    const { service, prisma, onboardingAdapter } = makeService();

    const response = await (service as any).getComplianceCsidCustodyProviderReadiness();

    expect(response.localOnly).toBe(true);
    expect(response.dryRun).toBe(true);
    expect(response.noMutation).toBe(true);
    expect(response.noNetwork).toBe(true);
    expect(response.noCsidRequest).toBe(true);
    expect(response.provider).toBe("DISABLED");
    expect(response.enabled).toBe(false);
    expect(response.tokenStorageReady).toBe(false);
    expect(response.secretStorageReady).toBe(false);
    expect(response.certificateStorageReady).toBe(false);
    expect(response.kmsConfigured).toBe(false);
    expect(response.secretsManagerConfigured).toBe(false);
    expect(response.encryptedDbApproved).toBe(false);
    expect(response.configuredProvider).toBe("DISABLED");
    expect(response.providerConfigPresent).toBe(false);
    expect(response.configurationPlanSummary.bodyStorageAllowed).toBe(false);
    expect(response.referenceOnlyBoundaryAvailable).toBe(true);
    expect(response.referenceOnlyBoundary.runtimeProvider).toBe("DISABLED");
    expect(response.referenceOnlyBoundary.localReferenceProviderAvailableForTests).toBe(true);
    expect(response.referenceOnlyBoundary.bodyStorageAllowed).toBe(false);
    expect(response.referenceOnlyBoundary.productionCompliance).toBe(false);
    expect(response.legacyRawPemBlockers).toContain("ZatcaEgsUnit.privateKeyPem");
    expect(response.legacyRawPemBlockers).toContain("ZatcaSubmissionLog.responsePayloadBase64");
    expect(response.productionCompliance).toBe(false);
    expect(JSON.stringify(response)).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|binary-security-token-body|secret-value|access[_-]?key|password/i);
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
  });

  it("returns a provider configuration plan without mutation or secret-like env leakage", async () => {
    process.env.ZATCA_CSID_CUSTODY_PROVIDER = "kms";
    process.env.ZATCA_CSID_CUSTODY_KMS_KEY_ID = "kms-key-raw-secret-value";
    process.env.ZATCA_CSID_CUSTODY_SECRET_PREFIX = "prefix-raw-secret-value";
    process.env.ZATCA_CSID_CUSTODY_REGION = "raw-region-value";
    process.env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE = "true";
    const { service, prisma, onboardingAdapter } = makeService();

    const response = await (service as any).getComplianceCsidCustodyProviderConfigurationPlan();
    const serialized = JSON.stringify(response);

    expect(response.localOnly).toBe(true);
    expect(response.dryRun).toBe(true);
    expect(response.noMutation).toBe(true);
    expect(response.noNetwork).toBe(true);
    expect(response.noCsidRequest).toBe(true);
    expect(response.noSecretBodyStorage).toBe(true);
    expect(response.configuredProvider).toBe("FUTURE_KMS");
    expect(response.providerEnabled).toBe(false);
    expect(response.providerConfigPresent).toBe(true);
    expect(response.bodyStorageAllowed).toBe(false);
    expect(response.productionCompliance).toBe(false);
    expect(response.referenceOnlyBoundaryAvailable).toBe(true);
    expect(response.referenceOnlyBoundary.runtimeProvider).toBe("DISABLED");
    expect(response.referenceOnlyBoundary.realProviderImplementationReady).toBe(false);
    expect(response.referenceOnlyBoundary.bodyStorageAllowed).toBe(false);
    expect(response.localReferenceProviderAvailableForTests).toBe(true);
    expect(response.legacyRawPemBlockers).toContain("ZatcaEgsUnit.complianceCsidPem");
    expect(serialized).not.toContain("kms-key-raw-secret-value");
    expect(serialized).not.toContain("prefix-raw-secret-value");
    expect(serialized).not.toContain("raw-region-value");
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|binarySecurityToken|secret-value|password/i);
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
  });

  it("throws sanitized disabled errors without leaking secret input", async () => {
    const provider = new DisabledComplianceCsidSecretCustodyProvider();
    const sensitiveInput = {
      organizationId,
      egsUnitId,
      certificateRequestId: "mock-certificate-request-id",
      value: "binary-security-token-body SECRET-VALUE -----BEGIN CERTIFICATE-----body-----END CERTIFICATE-----",
    };

    await expect(provider.storeComplianceToken(sensitiveInput)).rejects.toThrow("CSID secret custody provider is disabled");
    await expect(provider.storeComplianceSecret(sensitiveInput)).rejects.toThrow("CSID secret custody provider is disabled");
    await expect(provider.storeComplianceCertificate(sensitiveInput)).rejects.toThrow("CSID secret custody provider is disabled");
    await expect(provider.storeComplianceToken(sensitiveInput)).rejects.not.toThrow(/binary-security-token-body|SECRET-VALUE|BEGIN CERTIFICATE/);
  });

  it("allows the DPAPI provider only with an explicit local-test classification and never in production-looking processes", () => {
    const localConfig = readComplianceCsidCustodyProviderConfig({
      ZATCA_CSID_CUSTODY_PROVIDER: "sandbox-local-dpapi",
      ZATCA_SANDBOX_LOCAL_CUSTODY_ENABLED: "true",
      ZATCA_SANDBOX_LOCAL_EXECUTION_CLASSIFICATION: "LOCAL_TEST",
      APP_ENV: "local",
    } as NodeJS.ProcessEnv);
    const productionConfig = readComplianceCsidCustodyProviderConfig({
      ZATCA_CSID_CUSTODY_PROVIDER: "sandbox-local-dpapi",
      ZATCA_SANDBOX_LOCAL_CUSTODY_ENABLED: "true",
      ZATCA_SANDBOX_LOCAL_EXECUTION_CLASSIFICATION: "LOCAL_TEST",
      APP_ENV: "production",
    } as NodeJS.ProcessEnv);

    expect(localConfig.configuredProvider).toBe("SANDBOX_LOCAL_DPAPI");
    expect(localConfig.providerEnabled).toBe(true);
    expect(localConfig.realProviderImplementationReady).toBe(true);
    expect(localConfig.productionCompliance).toBe(false);
    expect(productionConfig.configuredProvider).toBe("SANDBOX_LOCAL_DPAPI");
    expect(productionConfig.providerEnabled).toBe(false);
    expect(productionConfig.providerConfigurationReady).toBe(false);
    expect(createComplianceCsidSecretCustodyProvider(productionConfig)).toBeInstanceOf(DisabledComplianceCsidSecretCustodyProvider);

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(
        () =>
          new SandboxLocalDpapiComplianceCsidCustodyProvider({
            environment: "LOCAL_TEST",
            storageDirectory: "synthetic-test-only-path",
            protector: { protect: async (value) => value, unprotect: async (value) => value },
          }),
      ).toThrow("CSID secret custody provider operation failed");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("stores synthetic sandbox material as protected local ciphertext and only reveals it to a narrow callback", async () => {
    const storageDirectory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-custody-"));
    const syntheticSecret = "synthetic-sandbox-secret-not-a-credential";
    const protector = {
      protect: jest.fn(async (value: Buffer) => Buffer.from(`protected:${value.toString("base64")}`, "utf8")),
      unprotect: jest.fn(async (value: Buffer) => {
        const serialized = value.toString("utf8");
        if (!serialized.startsWith("protected:")) {
          throw new Error("wrong local user scope");
        }
        return Buffer.from(serialized.slice("protected:".length), "base64");
      }),
    };
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      protector,
    });

    try {
      const reference = "synthetic-sandbox-token-reference";
      const stored = await provider.storeComplianceToken({
        organizationId,
        egsUnitId,
        certificateRequestId: "synthetic-request",
        referenceId: reference,
        environment: "SANDBOX",
        value: syntheticSecret,
      });

      expect(stored.provider).toBe("SANDBOX_LOCAL_DPAPI");
      expect(stored.referenceId).not.toContain(reference);
      expect(JSON.stringify(stored)).not.toContain(syntheticSecret);
      const files = await readdir(storageDirectory);
      expect(files).toHaveLength(1);
      const ciphertext = await readFile(join(storageDirectory, files[0]!));
      expect(ciphertext.toString("utf8")).not.toContain(syntheticSecret);

      await expect(
        provider.readSecretForOperation(
          { organizationId, egsUnitId, referenceId: reference, environment: "SANDBOX" },
          async (plaintext) => plaintext.toString("utf8"),
        ),
      ).resolves.toBe(syntheticSecret);

      await writeFile(join(storageDirectory, files[0]!), Buffer.from("changed-ciphertext", "utf8"));
      await expect(
        provider.readSecretForOperation(
          { organizationId, egsUnitId, referenceId: reference, environment: "SANDBOX" },
          async () => "unexpected",
        ),
      ).rejects.toThrow("CSID secret custody provider operation failed");
    } finally {
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("fails closed for missing, expired, revoked, and non-sandbox references without leaking material", async () => {
    const storageDirectory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-custody-"));
    let now = new Date("2026-07-21T00:00:00.000Z");
    const protector = {
      protect: async (value: Buffer) => Buffer.from(`protected:${value.toString("base64")}`, "utf8"),
      unprotect: async (value: Buffer) => {
        const encoded = value.toString("utf8");
        if (!encoded.startsWith("protected:")) throw new Error("wrong user scope");
        return Buffer.from(encoded.slice("protected:".length), "base64");
      },
    };
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      protector,
      now: () => now,
    });
    const referenceId = "synthetic-expiring-reference";
    const secret = "synthetic-expiring-value";
    const read = () => provider.readSecretForOperation({ organizationId, egsUnitId, referenceId, environment: "SANDBOX" }, async () => "unexpected");

    try {
      await expect(read()).rejects.toThrow("CSID secret custody provider operation failed");
      await expect(
        provider.storeComplianceSecret({ organizationId, egsUnitId, referenceId, environment: "SIMULATION", value: secret }),
      ).rejects.toThrow("CSID secret custody provider operation failed");
      await expect(
        new SandboxLocalDpapiComplianceCsidCustodyProvider({ environment: "PRODUCTION" as never, storageDirectory, protector }).storeComplianceSecret({
          organizationId,
          egsUnitId,
          referenceId,
          environment: "SANDBOX",
          value: secret,
        }),
      ).rejects.toThrow("CSID secret custody provider operation failed");

      await provider.storeComplianceSecret({
        organizationId,
        egsUnitId,
        referenceId,
        environment: "SANDBOX",
        expiresAt: "2026-07-21T00:01:00.000Z",
        value: secret,
      });
      now = new Date("2026-07-21T00:01:00.000Z");
      await expect(read()).rejects.toThrow("CSID secret custody provider operation failed");

      now = new Date("2026-07-21T00:00:30.000Z");
      await provider.storeComplianceSecret({ organizationId, egsUnitId, referenceId, environment: "SANDBOX", value: secret });
      await provider.revokeReference({ organizationId, egsUnitId, referenceId });
      await expect(read()).rejects.toThrow("CSID secret custody provider operation failed");
      await provider.deleteReference({ organizationId, egsUnitId, referenceId, environment: "SANDBOX" });
      expect(await readdir(storageDirectory)).toEqual([]);
    } finally {
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  (process.platform === "win32" ? it : it.skip)("round-trips only synthetic material through current-user Windows DPAPI", async () => {
    const storageDirectory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-dpapi-"));
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({ environment: "LOCAL_TEST", storageDirectory });
    const referenceId = "synthetic-dpapi-proof-reference";
    const syntheticValue = "synthetic-dpapi-proof-value";

    try {
      await provider.storeComplianceToken({ organizationId, egsUnitId, referenceId, environment: "SANDBOX", value: syntheticValue });
      await expect(
        provider.readSecretForOperation(
          { organizationId, egsUnitId, referenceId, environment: "SANDBOX" },
          async (plaintext) => plaintext.toString("utf8"),
        ),
      ).resolves.toBe(syntheticValue);
      const [file] = await readdir(storageDirectory);
      expect(await readFile(join(storageDirectory, file!), "utf8")).not.toContain(syntheticValue);
    } finally {
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("feeds disabled provider readiness into custody plan and dry-run gates", async () => {
    const { service } = makeService();
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "false";
    try {
      const plan = await service.getEgsUnitComplianceCsidCustodyPlan(organizationId, egsUnitId);
      expect(plan.providerReadiness.provider).toBe("DISABLED");
      expect(plan.providerReadiness.enabled).toBe(false);
      expect(plan.providerConfigurationReady).toBe(false);
      expect(plan.configuredProvider).toBe("DISABLED");
      expect(plan.referenceOnlyBoundary.runtimeProvider).toBe("DISABLED");
      expect(plan.referenceOnlyBoundary.localReferenceProviderAvailableForTests).toBe(true);
      expect(plan.legacyRawPemBlockers).toContain("ZatcaEgsUnit.productionCsidPem");
      expect(plan.custodyGate.allowed).toBe(false);
      expect(plan.custodyGate.providerReadiness.provider).toBe("DISABLED");
      expect(plan.custodyGate.providerConfiguration.providerConfigurationReady).toBe(false);
      expect(plan.custodyGate.reasons.some((reason) => reason.toLowerCase().includes("provider disabled"))).toBe(true);
      expect(plan.custodyGate.reasons.some((reason) => reason.toLowerCase().includes("provider configuration not approved"))).toBe(true);

      const dryRun = await service.getEgsUnitComplianceCsidRequestDryRun(organizationId, egsUnitId, { mode: "mock", otp: "123456" });
      expect(dryRun.providerReadiness.provider).toBe("DISABLED");
      expect(dryRun.providerConfigurationReady).toBe(false);
      expect(dryRun.custodyGate.allowed).toBe(false);
      expect(dryRun.tokenStorageReady).toBe(false);
      expect(dryRun.secretStorageReady).toBe(false);
      expect(dryRun.certificateStorageReady).toBe(false);
      expect(dryRun.productionCompliance).toBe(false);
      expect(JSON.stringify(dryRun)).not.toContain("123456");
    } finally {
      if (previous === undefined) {
        delete process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
      } else {
        process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
      }
    }
  });
});

describe("ZATCA mocked CSID custody provider client contracts", () => {
  const sensitiveToken = "binary-security-token-body-should-never-return";
  const sensitiveSecret = "secret-body-should-never-return";
  const sensitiveCertificate = "-----BEGIN CERTIFICATE-----certificate-body-should-never-return-----END CERTIFICATE-----";

  it("redacts raw cloud references without exposing provider paths, UUIDs, or key ids", () => {
    const rawReference = "arn:aws:secretsmanager:me-south-1:123456789012:secret:ledgerbyte/zatca/csid/550e8400-e29b-41d4-a716-446655440000";

    const redacted = redactSecretReference(rawReference);

    expect(redacted).toBe(`[redacted-reference:length-${rawReference.length}]`);
    expect(redacted).not.toContain("arn:aws");
    expect(redacted).not.toContain("ledgerbyte/zatca");
    expect(redacted).not.toContain("550e8400-e29b-41d4-a716-446655440000");
  });

  it("stores mocked secrets-manager token, secret, and certificate references without returning bodies", async () => {
    const putSecret = jest.fn(async (input) => ({
      referenceId: `arn:aws:secretsmanager:me-south-1:123456789012:secret:${input.kind}/raw-reference-id`,
      versionId: `raw-version-${input.kind}`,
    }));
    const revokeReference = jest.fn(async () => undefined);
    const provider = new MockedSecretsManagerComplianceCsidCustodyProvider({ putSecret, revokeReference });

    const tokenReference = await provider.storeComplianceToken({ organizationId, egsUnitId, value: sensitiveToken });
    const secretReference = await provider.storeComplianceSecret({ organizationId, egsUnitId, value: sensitiveSecret });
    const certificateReference = await provider.storeComplianceCertificate({ organizationId, egsUnitId, value: sensitiveCertificate });
    const serialized = JSON.stringify({ tokenReference, secretReference, certificateReference });

    expect(putSecret).toHaveBeenCalledTimes(3);
    expect(putSecret.mock.calls[0]![0].value).toBe(sensitiveToken);
    expect(putSecret.mock.calls[1]![0].value).toBe(sensitiveSecret);
    expect(putSecret.mock.calls[2]![0].value).toBe(sensitiveCertificate);
    expect(tokenReference.provider).toBe("FUTURE_SECRETS_MANAGER");
    expect(tokenReference.bodyReturned).toBe(false);
    expect(tokenReference.productionCompliance).toBe(false);
    expect(secretReference.bodyReturned).toBe(false);
    expect(secretReference.productionCompliance).toBe(false);
    expect(certificateReference.bodyReturned).toBe(false);
    expect(certificateReference.productionCompliance).toBe(false);
    expect(serialized).not.toContain(sensitiveToken);
    expect(serialized).not.toContain(sensitiveSecret);
    expect(serialized).not.toContain("certificate-body-should-never-return");
    expect(serialized).not.toContain("arn:aws");
    expect(serialized).not.toContain("raw-version");

    await provider.revokeReference({ organizationId, egsUnitId, referenceId: tokenReference.referenceId });
    expect(revokeReference).toHaveBeenCalledWith({ organizationId, egsUnitId, referenceId: tokenReference.referenceId });
  });

  it("sanitizes mocked secrets-manager client errors without leaking input bodies", async () => {
    const putSecret = jest.fn(async () => {
      throw new Error(`provider failed for ${sensitiveToken} and raw cloud path`);
    });
    const provider = new MockedSecretsManagerComplianceCsidCustodyProvider({ putSecret, revokeReference: jest.fn() });

    await expect(provider.storeComplianceToken({ organizationId, egsUnitId, value: sensitiveToken })).rejects.toThrow(
      "CSID secret custody provider operation failed",
    );
    await expect(provider.storeComplianceToken({ organizationId, egsUnitId, value: sensitiveToken })).rejects.not.toThrow(sensitiveToken);
    await expect(provider.storeComplianceToken({ organizationId, egsUnitId, value: sensitiveToken })).rejects.not.toThrow("raw cloud path");
  });

  it("stores mocked KMS encrypted references without exposing plaintext, ciphertext paths, or key ids", async () => {
    const encrypt = jest.fn(async (input) => ({
      ciphertextReference: `kms-ciphertext-reference-${input.kind}-raw`,
      keyReference: "arn:aws:kms:me-south-1:123456789012:key/raw-kms-key-id",
      versionId: `kms-version-${input.kind}`,
    }));
    const revokeReference = jest.fn(async () => undefined);
    const provider = new MockedKmsComplianceCsidCustodyProvider({ encrypt, revokeReference });

    const tokenReference = await provider.storeComplianceToken({ organizationId, egsUnitId, value: sensitiveToken });
    const secretReference = await provider.storeComplianceSecret({ organizationId, egsUnitId, value: sensitiveSecret });
    const certificateReference = await provider.storeComplianceCertificate({ organizationId, egsUnitId, value: sensitiveCertificate });
    const serialized = JSON.stringify({ tokenReference, secretReference, certificateReference });

    expect(encrypt).toHaveBeenCalledTimes(3);
    expect(encrypt.mock.calls[0]![0].plaintext).toBe(sensitiveToken);
    expect(encrypt.mock.calls[1]![0].plaintext).toBe(sensitiveSecret);
    expect(encrypt.mock.calls[2]![0].plaintext).toBe(sensitiveCertificate);
    expect(tokenReference.provider).toBe("FUTURE_KMS");
    expect(tokenReference.bodyReturned).toBe(false);
    expect(tokenReference.productionCompliance).toBe(false);
    expect(serialized).not.toContain(sensitiveToken);
    expect(serialized).not.toContain(sensitiveSecret);
    expect(serialized).not.toContain("certificate-body-should-never-return");
    expect(serialized).not.toContain("kms-ciphertext-reference");
    expect(serialized).not.toContain("raw-kms-key-id");

    await provider.revokeReference({ organizationId, egsUnitId, referenceId: certificateReference.referenceId });
    expect(revokeReference).toHaveBeenCalledWith({ organizationId, egsUnitId, referenceId: certificateReference.referenceId });
  });

  it("sanitizes mocked KMS client errors and keeps the runtime factory disabled", async () => {
    const encrypt = jest.fn(async () => {
      throw new Error(`kms failed for ${sensitiveCertificate} and raw-kms-key-id`);
    });
    const provider = new MockedKmsComplianceCsidCustodyProvider({ encrypt, revokeReference: jest.fn() });

    await expect(provider.storeComplianceCertificate({ organizationId, egsUnitId, value: sensitiveCertificate })).rejects.toThrow(
      "CSID secret custody provider operation failed",
    );
    await expect(provider.storeComplianceCertificate({ organizationId, egsUnitId, value: sensitiveCertificate })).rejects.not.toThrow(
      "certificate-body-should-never-return",
    );
    await expect(provider.storeComplianceCertificate({ organizationId, egsUnitId, value: sensitiveCertificate })).rejects.not.toThrow("raw-kms-key-id");

    const runtimeProvider = createComplianceCsidSecretCustodyProvider(
      readComplianceCsidCustodyProviderConfig({
        ZATCA_CSID_CUSTODY_PROVIDER: "kms",
        ZATCA_CSID_CUSTODY_KMS_KEY_ID: "raw-kms-key-id",
      } as NodeJS.ProcessEnv),
    );
    const readiness = runtimeProvider.getReadiness();
    expect(runtimeProvider).toBeInstanceOf(DisabledComplianceCsidSecretCustodyProvider);
    expect(readiness.provider).toBe("DISABLED");
    expect(readiness.enabled).toBe(false);
    expect(readiness.realProviderImplementationReady).toBe(false);
    expect(readiness.productionCompliance).toBe(false);
  });
});
