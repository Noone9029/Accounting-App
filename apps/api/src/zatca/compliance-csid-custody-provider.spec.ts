import { DisabledComplianceCsidSecretCustodyProvider } from "./custody/compliance-csid-secret-custody.provider";
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
    expect(response.productionCompliance).toBe(false);
    expect(JSON.stringify(response)).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|binary-security-token-body|secret-value|access[_-]?key|password/i);
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

  it("feeds disabled provider readiness into custody plan and dry-run gates", async () => {
    const { service } = makeService();
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "false";
    try {
      const plan = await service.getEgsUnitComplianceCsidCustodyPlan(organizationId, egsUnitId);
      expect(plan.providerReadiness.provider).toBe("DISABLED");
      expect(plan.providerReadiness.enabled).toBe(false);
      expect(plan.custodyGate.allowed).toBe(false);
      expect(plan.custodyGate.providerReadiness.provider).toBe("DISABLED");
      expect(plan.custodyGate.reasons.some((reason) => reason.toLowerCase().includes("provider disabled"))).toBe(true);

      const dryRun = await service.getEgsUnitComplianceCsidRequestDryRun(organizationId, egsUnitId, { mode: "mock", otp: "123456" });
      expect(dryRun.providerReadiness.provider).toBe("DISABLED");
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
