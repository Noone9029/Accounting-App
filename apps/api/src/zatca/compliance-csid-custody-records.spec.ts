import { BadRequestException } from "@nestjs/common";
import { ZatcaService } from "./zatca.service";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";
const userId = "33333333-3333-3333-3333-333333333333";

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

function makeCustodyRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    organizationId,
    egsUnitId,
    source: "MOCK",
    status: "PLANNED",
    requestId: "mock-request-id",
    certificateRequestId: "mock-certificate-request-id",
    hasBinarySecurityToken: true,
    hasSecret: true,
    hasCertificate: true,
    tokenStorageMode: "NOT_STORED",
    secretStorageMode: "NOT_STORED",
    certificateStorageMode: "NOT_STORED",
    expiryKnown: false,
    expiresAt: null,
    renewalRequired: false,
    signedWithProductionMaterial: false,
    productionCompliance: false,
    custodyBlockedReason: "Metadata-only custody planning record. Body persistence remains blocked.",
    createdById: userId,
    revokedById: null,
    revokedAt: null,
    createdAt: new Date("2026-05-18T00:00:00.000Z"),
    updatedAt: new Date("2026-05-18T00:00:00.000Z"),
    createdBy: { id: userId, name: "Demo User", email: "demo@ledgerbyte.test" },
    revokedBy: null,
    egsUnit: { id: egsUnitId, name: "LedgerByte Sandbox EGS", environment: "SANDBOX" },
    ...overrides,
  };
}

function makeService({
  egs = makeSafeEgs(),
  records = [],
  latestRecord = null,
}: {
  egs?: Record<string, unknown> | null;
  records?: Record<string, unknown>[];
  latestRecord?: Record<string, unknown> | null;
} = {}) {
  const createdRecord = makeCustodyRecord();
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
      findFirst: jest.fn().mockResolvedValue(egs),
      update: jest.fn(),
    },
    zatcaComplianceCsidCustodyRecord: {
      create: jest.fn().mockResolvedValue(createdRecord),
      findMany: jest.fn().mockResolvedValue(records),
      findFirst: jest.fn().mockResolvedValue(latestRecord),
      count: jest.fn().mockResolvedValue(records.length + (latestRecord ? 1 : 0)),
      update: jest.fn().mockResolvedValue(makeCustodyRecord({ status: "REVOKED", revokedById: userId, revokedAt: new Date("2026-05-18T00:01:00.000Z") })),
    },
    zatcaSubmissionLog: {
      create: jest.fn(),
    },
    zatcaCsrConfigReview: {
      findFirst: jest.fn().mockResolvedValue({ id: "55555555-5555-5555-5555-555555555555", status: "APPROVED" }),
    },
  };
  const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
  const onboardingAdapter = { requestComplianceCsid: jest.fn() };
  const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never, {
    realNetworkEnabled: false,
    mode: "mock",
  } as never);
  return { service, prisma, auditLogService, onboardingAdapter, createdRecord };
}

describe("ZATCA compliance CSID custody records", () => {
  it("creates a metadata-only custody record without mutating EGS CSID fields or creating submission logs", async () => {
    const { service, prisma, auditLogService, onboardingAdapter } = makeService();

    const response = await (service as any).createComplianceCsidCustodyRecord(organizationId, userId, egsUnitId, {
      source: "MOCK",
      status: "PLANNED",
      requestId: "mock-request-id",
      certificateRequestId: "mock-certificate-request-id",
      hasBinarySecurityToken: true,
      hasSecret: true,
      hasCertificate: true,
      custodyBlockedReason: "Metadata-only custody planning record. Body persistence remains blocked.",
    });

    expect(response.localOnly).toBe(true);
    expect(response.metadataOnly).toBe(true);
    expect(response.noNetwork).toBe(true);
    expect(response.noCsidRequest).toBe(true);
    expect(response.productionCompliance).toBe(false);
    expect(response.custodyRecord.productionCompliance).toBe(false);
    expect(response.custodyRecord.tokenStorageMode).toBe("NOT_STORED");
    expect(response.custodyRecord.secretStorageMode).toBe("NOT_STORED");
    expect(response.custodyRecord.certificateStorageMode).toBe("NOT_STORED");
    expect(JSON.stringify(response)).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|BEGIN CERTIFICATE REQUEST|token-value|secret-value|123456/i);
    expect(prisma.zatcaComplianceCsidCustodyRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId,
        egsUnitId,
        source: "MOCK",
        productionCompliance: false,
        signedWithProductionMaterial: false,
        tokenStorageMode: "NOT_STORED",
        secretStorageMode: "NOT_STORED",
        certificateStorageMode: "NOT_STORED",
      }),
    }));
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalled();
  });

  it("rejects token, certificate, private key, OTP, CSR, and secret-looking values", async () => {
    const { service, prisma } = makeService();
    const sensitiveValues = [
      "-----BEGIN CERTIFICATE-----\nredacted\n-----END CERTIFICATE-----",
      "-----BEGIN PRIVATE KEY-----\nredacted\n-----END PRIVATE KEY-----",
      "-----BEGIN CERTIFICATE REQUEST-----\nredacted\n-----END CERTIFICATE REQUEST-----",
      "binarySecurityToken=token-value",
      "secret=secret-value",
      "OTP 123456",
    ];

    for (const sensitiveValue of sensitiveValues) {
      await expect(
        (service as any).createComplianceCsidCustodyRecord(organizationId, userId, egsUnitId, {
          source: "MOCK",
          status: "PLANNED",
          requestId: sensitiveValue,
          custodyBlockedReason: "metadata only",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.zatcaComplianceCsidCustodyRecord.create).not.toHaveBeenCalled();
  });

  it("lists safe custody metadata only", async () => {
    const { service } = makeService({ records: [makeCustodyRecord()] });

    const response = await (service as any).listComplianceCsidCustodyRecords(organizationId, egsUnitId);

    expect(response.localOnly).toBe(true);
    expect(response.metadataOnly).toBe(true);
    expect(response.productionCompliance).toBe(false);
    expect(response.custodyRecords).toHaveLength(1);
    expect(response.custodyRecords[0].hasBinarySecurityToken).toBe(true);
    expect(JSON.stringify(response)).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|binary-security-token-body|secret-value|123456/);
  });

  it("revokes custody records as metadata only", async () => {
    const { service, prisma, auditLogService, onboardingAdapter } = makeService({ latestRecord: makeCustodyRecord() });

    const response = await (service as any).revokeComplianceCsidCustodyRecord(organizationId, userId, "44444444-4444-4444-4444-444444444444", {
      note: "Superseded by a later metadata review.",
    });

    expect(response.localOnly).toBe(true);
    expect(response.metadataOnly).toBe(true);
    expect(response.productionCompliance).toBe(false);
    expect(response.custodyRecord.status).toBe("REVOKED");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalled();
  });

  it("includes latest custody record and blocked secrets/KMS gate in custody plan", async () => {
    const latestRecord = makeCustodyRecord();
    const { service } = makeService({ latestRecord, records: [latestRecord] });

    const response = await service.getEgsUnitComplianceCsidCustodyPlan(organizationId, egsUnitId);

    expect(response.latestCustodyRecord?.id).toBe(latestRecord.id);
    expect(response.custodyRecordCount).toBeGreaterThan(0);
    expect(response.custodyGate.allowed).toBe(false);
    expect(response.custodyGate.kmsConfigured).toBe(false);
    expect(response.custodyGate.secretsManagerConfigured).toBe(false);
    expect(response.tokenStorageReady).toBe(false);
    expect(response.secretStorageReady).toBe(false);
    expect(response.certificateStorageReady).toBe(false);
    expect(response.productionCompliance).toBe(false);
  });

  it("keeps dry-run CSID responses behind the custody gate without persisting sensitive material", async () => {
    const { service, prisma, onboardingAdapter } = makeService();
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "false";
    try {
      const response = await service.getEgsUnitComplianceCsidRequestDryRun(organizationId, egsUnitId, { mode: "mock", otp: "123456" });

      expect(response.executionEnabled).toBe(false);
      expect(response.executionAttempted).toBe(false);
      expect(response.custodyRecordRequired).toBe(true);
      expect(response.custodyGate.allowed).toBe(false);
      expect(response.tokenStorageReady).toBe(false);
      expect(response.secretStorageReady).toBe(false);
      expect(response.certificateStorageReady).toBe(false);
      expect(response.tokenPersisted).toBe(false);
      expect(response.secretPersisted).toBe(false);
      expect(response.certificatePersisted).toBe(false);
      expect(response.productionCompliance).toBe(false);
      expect(JSON.stringify(response)).not.toContain("123456");
      expect(prisma.zatcaComplianceCsidCustodyRecord.create).not.toHaveBeenCalled();
      expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) {
        delete process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
      } else {
        process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
      }
    }
  });
});
