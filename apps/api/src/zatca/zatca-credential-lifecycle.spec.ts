import { BadRequestException } from "@nestjs/common";
import { ZatcaService } from "./zatca.service";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";
const userId = "33333333-3333-3333-3333-333333333333";
const lifecycleId = "44444444-4444-4444-4444-444444444444";

function makeEgs(overrides: Record<string, unknown> = {}) {
  return {
    id: egsUnitId,
    organizationId,
    profileId: "55555555-5555-5555-5555-555555555555",
    name: "LedgerByte Sandbox EGS",
    environment: "SANDBOX",
    status: "ACTIVE",
    isActive: true,
    csrPem: null,
    privateKeyPem: null,
    complianceCsidPem: null,
    productionCsidPem: null,
    certificateRequestId: null,
    lastInvoiceHash: null,
    lastIcv: 0,
    hashMode: "LOCAL_DETERMINISTIC",
    hashModeEnabledAt: null,
    hashModeEnabledById: null,
    hashModeResetReason: null,
    sdkHashChainStartedAt: null,
    deviceSerialNumber: "EGS-SANDBOX-001",
    solutionName: "LedgerByte",
    csrCommonName: "LedgerByte Sandbox EGS",
    csrSerialNumber: "1-LedgerByte|2-Sandbox|3-001",
    csrOrganizationUnitName: "LedgerByte Demo Unit",
    csrInvoiceType: "1100",
    csrLocationAddress: "Riyadh",
    createdAt: new Date("2026-06-07T00:00:00.000Z"),
    updatedAt: new Date("2026-06-07T00:00:00.000Z"),
    ...overrides,
  };
}

function makeLifecycle(overrides: Record<string, unknown> = {}) {
  return {
    id: lifecycleId,
    organizationId,
    egsUnitId,
    environment: "SANDBOX",
    lifecycleStatus: "CSR_PENDING",
    custodyProviderType: "MANAGED_SECRET_REFERENCE",
    custodyReferenceAlias: "zatca-sandbox-reference-alias",
    certificateFingerprint: "sha256:ABCDEFABCDEF",
    certificateSerialNumber: "SERIAL-123",
    certificateIssuer: "ZATCA test issuer metadata",
    certificateSubject: "LedgerByte Sandbox EGS metadata",
    certificateNotBefore: new Date("2026-06-07T00:00:00.000Z"),
    certificateExpiresAt: new Date("2027-06-07T00:00:00.000Z"),
    certificateRequestId: "certificate-request-metadata",
    complianceCsidStatus: "COMPLIANCE_CSID_PENDING",
    productionCsidStatus: "NOT_CONFIGURED",
    lastReadinessCheckAt: new Date("2026-06-07T00:10:00.000Z"),
    disabledAt: null,
    revokedAt: null,
    statusReason: "Metadata-only setup.",
    errorCode: null,
    productionCompliance: false,
    metadataOnly: true,
    createdById: userId,
    updatedById: userId,
    disabledById: null,
    revokedById: null,
    createdAt: new Date("2026-06-07T00:00:00.000Z"),
    updatedAt: new Date("2026-06-07T00:10:00.000Z"),
    ...overrides,
  };
}

function makeService({
  egs = makeEgs(),
  lifecycle = null,
  lifecycles = [],
}: {
  egs?: Record<string, unknown> | null;
  lifecycle?: Record<string, unknown> | null;
  lifecycles?: Record<string, unknown>[];
} = {}) {
  const upsertedLifecycle = makeLifecycle();
  const prisma = {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: organizationId, name: "LedgerByte Demo", countryCode: "SA" }),
    },
    zatcaOrganizationProfile: {
      findFirst: jest.fn().mockResolvedValue({ sellerName: "LedgerByte Demo", vatNumber: "300000000000003", countryCode: "SA" }),
    },
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(egs),
      update: jest.fn(),
    },
    zatcaInvoiceMetadata: {
      count: jest.fn().mockResolvedValue(0),
    },
    zatcaCredentialLifecycle: {
      findMany: jest.fn().mockResolvedValue(lifecycles),
      findFirst: jest.fn().mockResolvedValue(lifecycle),
      upsert: jest.fn().mockResolvedValue(upsertedLifecycle),
      update: jest.fn().mockResolvedValue(makeLifecycle({ lifecycleStatus: "REVOKED", revokedAt: new Date("2026-06-07T01:00:00.000Z"), revokedById: userId })),
      count: jest.fn().mockResolvedValue(lifecycles.length + (lifecycle ? 1 : 0)),
    },
    zatcaSubmissionLog: {
      create: jest.fn(),
    },
    zatcaComplianceCsidCustodyRecord: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
  const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
  const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never, {
    realNetworkEnabled: false,
    mode: "mock",
  } as never);
  return { service, prisma, auditLogService, onboardingAdapter, upsertedLifecycle };
}

describe("ZATCA key custody and CSID lifecycle foundation", () => {
  it("returns metadata-only NOT_CONFIGURED readiness when no lifecycle record exists", async () => {
    const { service, prisma, onboardingAdapter } = makeService();

    const response = await (service as any).getEgsUnitCredentialLifecycleMetadata(organizationId, egsUnitId);

    expect(response.localOnly).toBe(true);
    expect(response.metadataOnly).toBe(true);
    expect(response.noNetwork).toBe(true);
    expect(response.noCsidRequest).toBe(true);
    expect(response.noSigning).toBe(true);
    expect(response.noClearanceReporting).toBe(true);
    expect(response.noPdfA3).toBe(true);
    expect(response.productionCompliance).toBe(false);
    expect(response.lifecycle.lifecycleStatus).toBe("NOT_CONFIGURED");
    expect(response.lifecycle.custodyProviderType).toBe("NONE");
    expect(response.lifecycle.complianceCsidStatus).toBe("NOT_CONFIGURED");
    expect(response.lifecycle.productionCsidStatus).toBe("NOT_CONFIGURED");
    expect(JSON.stringify(response)).not.toMatch(/BEGIN PRIVATE KEY|BEGIN CERTIFICATE|binarySecurityToken|secret-value|123456|signedXml|qrPayload/i);
    expect(prisma.zatcaCredentialLifecycle.findFirst).toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
  });

  it("upserts safe custody reference and certificate metadata without storing body material", async () => {
    const { service, prisma, auditLogService, onboardingAdapter } = makeService();

    const response = await (service as any).upsertEgsUnitCredentialLifecycleMetadata(organizationId, userId, egsUnitId, {
      lifecycleStatus: "COMPLIANCE_CSID_PENDING",
      custodyProviderType: "MANAGED_SECRET_REFERENCE",
      custodyReferenceAlias: "zatca-sandbox-reference-alias",
      certificateFingerprint: "sha256:ABCDEFABCDEF",
      certificateSerialNumber: "SERIAL-123",
      certificateIssuer: "ZATCA test issuer metadata",
      certificateSubject: "LedgerByte Sandbox EGS metadata",
      certificateRequestId: "certificate-request-metadata",
      certificateExpiresAt: "2027-06-07T00:00:00.000Z",
      complianceCsidStatus: "COMPLIANCE_CSID_PENDING",
      productionCsidStatus: "NOT_CONFIGURED",
      statusReason: "Metadata-only setup.",
    });

    expect(response.localOnly).toBe(true);
    expect(response.metadataOnly).toBe(true);
    expect(response.lifecycle.productionCompliance).toBe(false);
    expect(response.lifecycle.custodyProviderType).toBe("MANAGED_SECRET_REFERENCE");
    expect(response.lifecycle.custodyReferenceAlias).toBe("zatca-sandbox-reference-alias");
    expect(response.lifecycle.secretMaterialPersisted).toBe(false);
    expect(response.lifecycle.privateKeyReturned).toBe(false);
    expect(response.lifecycle.certificateBodyReturned).toBe(false);
    expect(response.lifecycle.otpReturned).toBe(false);
    expect(response.lifecycle.providerRequestPayloadReturned).toBe(false);
    expect(JSON.stringify(response)).not.toMatch(/BEGIN PRIVATE KEY|BEGIN CERTIFICATE|binarySecurityToken|secret-value|123456|signedXml|qrPayload/i);
    expect(prisma.zatcaCredentialLifecycle.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        productionCompliance: false,
        metadataOnly: true,
        createdById: userId,
      }),
      update: expect.objectContaining({
        productionCompliance: false,
        metadataOnly: true,
        updatedById: userId,
      }),
    }));
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalled();
  });

  it("rejects unsafe secret-like fields and values before persistence", async () => {
    const { service, prisma } = makeService();
    const unsafeInputs = [
      { privateKey: "not allowed" },
      { rawPrivateKey: "not allowed" },
      { pem: "not allowed" },
      { certificateBody: "not allowed" },
      { csrBody: "not allowed" },
      { otp: "123456" },
      { token: "not allowed" },
      { secret: "not allowed" },
      { password: "not allowed" },
      { signedXml: "<Invoice></Invoice>" },
      { qrPayload: "not allowed" },
      { requestBody: "not allowed" },
      { responseBody: "not allowed" },
      { statusReason: "-----BEGIN PRIVATE KEY-----body-----END PRIVATE KEY-----" },
      { custodyReferenceAlias: "arn:aws:secretsmanager:raw-provider-path" },
    ];

    for (const unsafeInput of unsafeInputs) {
      await expect((service as any).upsertEgsUnitCredentialLifecycleMetadata(organizationId, userId, egsUnitId, unsafeInput)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(prisma.zatcaCredentialLifecycle.upsert).not.toHaveBeenCalled();
  });

  it("disables and revokes lifecycle records as metadata-only actions", async () => {
    const { service, prisma, onboardingAdapter } = makeService({ lifecycle: makeLifecycle() });

    const disabled = await (service as any).disableCredentialLifecycleMetadata(organizationId, userId, lifecycleId, {
      statusReason: "Operator disabled metadata while key custody remains blocked.",
    });
    const revoked = await (service as any).revokeCredentialLifecycleMetadata(organizationId, userId, lifecycleId, {
      statusReason: "Superseded by rotation metadata.",
    });

    expect(disabled.metadataOnly).toBe(true);
    expect(disabled.productionCompliance).toBe(false);
    expect(revoked.metadataOnly).toBe(true);
    expect(revoked.productionCompliance).toBe(false);
    expect(prisma.zatcaCredentialLifecycle.update).toHaveBeenCalledTimes(2);
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
  });
});
