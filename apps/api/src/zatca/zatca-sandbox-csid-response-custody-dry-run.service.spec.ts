import { ZatcaComplianceCsidCustodyRecordSource, ZatcaComplianceCsidCustodyRecordStatus, ZatcaCsrConfigReviewStatus, ZatcaRegistrationStatus } from "@prisma/client";
import { ZatcaService } from "./zatca.service";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";

function makeCustodyRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    organizationId,
    egsUnitId,
    source: ZatcaComplianceCsidCustodyRecordSource.FUTURE_SANDBOX,
    status: ZatcaComplianceCsidCustodyRecordStatus.PLANNED,
    requestId: "metadata-request-id",
    certificateRequestId: "metadata-certificate-request-id",
    hasBinarySecurityToken: true,
    hasSecret: true,
    hasCertificate: true,
    tokenStorageMode: "NOT_STORED",
    secretStorageMode: "NOT_STORED",
    certificateStorageMode: "NOT_STORED",
    expiryKnown: true,
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    renewalRequired: false,
    signedWithProductionMaterial: false,
    productionCompliance: false,
    custodyBlockedReason: "Metadata-only record; body storage blocked.",
    createdById: null,
    revokedById: null,
    revokedAt: null,
    createdAt: new Date("2026-06-08T12:00:00.000Z"),
    updatedAt: new Date("2026-06-08T12:00:00.000Z"),
    createdBy: null,
    revokedBy: null,
    egsUnit: { id: egsUnitId, name: "LedgerByte Sandbox EGS", environment: "SANDBOX" },
    ...overrides,
  };
}

function makeService(overrides: { egsUnit?: Record<string, unknown>; latestRecord?: Record<string, unknown> | null } = {}) {
  const egsUnit = {
    id: egsUnitId,
    organizationId,
    profileId: "33333333-3333-3333-3333-333333333333",
    name: "LedgerByte Sandbox EGS",
    environment: "SANDBOX",
    status: ZatcaRegistrationStatus.DRAFT,
    deviceSerialNumber: "EGS-SANDBOX-001",
    solutionName: "LedgerByte",
    csrCommonName: "LedgerByte Sandbox EGS",
    csrSerialNumber: "1-LedgerByte|2-Sandbox|3-001",
    csrOrganizationUnitName: "LedgerByte Demo Unit",
    csrInvoiceType: "1100",
    csrLocationAddress: "Riyadh",
    csrPem: "REDACTED_CSR_PRESENT",
    privateKeyPem: null,
    complianceCsidPem: null,
    productionCsidPem: null,
    certificateRequestId: "metadata-certificate-request-id",
    lastInvoiceHash: null,
    lastIcv: 0,
    hashMode: "LOCAL_DETERMINISTIC",
    hashModeEnabledAt: null,
    hashModeEnabledById: null,
    hashModeResetReason: null,
    sdkHashChainStartedAt: null,
    isActive: true,
    createdAt: new Date("2026-06-08T12:00:00.000Z"),
    updatedAt: new Date("2026-06-08T12:00:00.000Z"),
    ...overrides.egsUnit,
  };
  const latestRecord = overrides.latestRecord === null ? null : makeCustodyRecord(overrides.latestRecord);
  const prisma = {
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(egsUnit),
    },
    zatcaComplianceCsidCustodyRecord: {
      findFirst: jest.fn().mockResolvedValue(latestRecord),
      create: jest.fn(),
    },
    zatcaCsrConfigReview: {
      findFirst: jest.fn().mockResolvedValue({
        id: "44444444-4444-4444-4444-444444444444",
        organizationId,
        egsUnitId,
        status: ZatcaCsrConfigReviewStatus.APPROVED,
      }),
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

describe("ZATCA sandbox CSID response custody dry-run service plan", () => {
  it("returns response custody metadata without processing response bodies or persisting secrets", async () => {
    const { service, prisma, onboardingAdapter } = makeService();

    const plan = await service.getEgsUnitSandboxCsidResponseCustodyDryRunPlan(organizationId, egsUnitId);
    const serialized = JSON.stringify(plan);

    expect(plan.localOnly).toBe(true);
    expect(plan.custodyDryRunOnly).toBe(true);
    expect(plan.noNetwork).toBe(true);
    expect(plan.noRequestBodyCreated).toBe(true);
    expect(plan.noResponseBodyProcessed).toBe(true);
    expect(plan.noSecretMaterialPersisted).toBe(true);
    expect(plan.productionCompliance).toBe(false);
    expect(plan.safeCustodyContractSummary.futureCustodyShape.storagePolicy).toBe("REFERENCE_ONLY_FUTURE_APPROVAL_REQUIRED");
    expect(plan.latestCustodyRecordMetadata?.hasBinarySecurityToken).toBe(true);
    expect(plan.latestCustodyRecordMetadata?.hasSecret).toBe(true);
    expect(plan.latestCustodyRecordMetadata?.hasCertificate).toBe(true);
    expect(plan.latestCustodyRecordMetadata?.tokenBodyReturned).toBe(false);
    expect(plan.latestCustodyRecordMetadata?.secretBodyReturned).toBe(false);
    expect(plan.latestCustodyRecordMetadata?.certificateBodyReturned).toBe(false);
    expect(plan.custodyMetadata.runtimeProvider).toBe("DISABLED");
    expect(plan.blockers).toEqual(expect.arrayContaining(["real sandbox CSID response-body processing is not approved"]));
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|binary-security-token-body|SECRET_VALUE|real-response-body/i);
    expect(prisma.zatcaComplianceCsidCustodyRecord.create).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
  });

  it("keeps production EGS units blocked in the response custody dry-run API", async () => {
    const { service } = makeService({ egsUnit: { environment: "PRODUCTION" } });

    const plan = await service.getEgsUnitSandboxCsidResponseCustodyDryRunPlan(organizationId, egsUnitId);

    expect(plan.ready).toBe(false);
    expect(plan.environment).toBe("BLOCKED_PRODUCTION");
    expect(plan.blockers).toContain("production CSID response custody planning is out of scope for the sandbox dry-run lane");
    expect(plan.productionCompliance).toBe(false);
  });
});
