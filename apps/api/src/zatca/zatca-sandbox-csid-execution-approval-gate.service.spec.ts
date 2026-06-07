import { ZatcaComplianceCsidCustodyRecordSource, ZatcaComplianceCsidCustodyRecordStatus, ZatcaCsrConfigReviewStatus, ZatcaRegistrationStatus } from "@prisma/client";
import { ZatcaService } from "./zatca.service";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";

function makeService(overrides: { egsUnit?: Record<string, unknown>; latestRecord?: Record<string, unknown> | null; approvedReview?: Record<string, unknown> | null } = {}) {
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
  const latestRecord =
    overrides.latestRecord === null
      ? null
      : {
          id: "55555555-5555-5555-5555-555555555555",
          organizationId,
          egsUnitId,
          source: ZatcaComplianceCsidCustodyRecordSource.FUTURE_SANDBOX,
          status: ZatcaComplianceCsidCustodyRecordStatus.PLANNED,
          requestId: "metadata-request-id",
          certificateRequestId: "metadata-certificate-request-id",
          hasBinarySecurityToken: false,
          hasSecret: false,
          hasCertificate: false,
          tokenStorageMode: "NOT_STORED",
          secretStorageMode: "NOT_STORED",
          certificateStorageMode: "NOT_STORED",
          expiryKnown: false,
          expiresAt: null,
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
          ...overrides.latestRecord,
        };
  const approvedReview =
    overrides.approvedReview === null
      ? null
      : {
          id: "44444444-4444-4444-4444-444444444444",
          organizationId,
          egsUnitId,
          status: ZatcaCsrConfigReviewStatus.APPROVED,
          ...overrides.approvedReview,
        };
  const prisma = {
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(egsUnit),
    },
    zatcaCsrConfigReview: {
      findFirst: jest.fn().mockResolvedValue(approvedReview),
    },
    zatcaComplianceCsidCustodyRecord: {
      findFirst: jest.fn().mockResolvedValue(latestRecord),
      create: jest.fn(),
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

describe("ZATCA sandbox CSID execution approval gate service plan", () => {
  it("returns a blocked approval-gate plan without execution, bodies, or persistence", async () => {
    const { service, prisma, onboardingAdapter } = makeService();

    const plan = await service.getEgsUnitSandboxCsidExecutionApprovalPlan(organizationId, egsUnitId);
    const serialized = JSON.stringify(plan);

    expect(plan.localOnly).toBe(true);
    expect(plan.approvalGateOnly).toBe(true);
    expect(plan.executionAllowed).toBe(false);
    expect(plan.approvalPhraseRecognized).toBe(false);
    expect(plan.noNetwork).toBe(true);
    expect(plan.noOtpCaptured).toBe(true);
    expect(plan.noCsidRequested).toBe(true);
    expect(plan.noRequestBodyCreated).toBe(true);
    expect(plan.noResponseBodyProcessed).toBe(true);
    expect(plan.noSecretMaterialPersisted).toBe(true);
    expect(plan.productionCompliance).toBe(false);
    expect(plan.sandboxPortalReference.referenceOnly).toBe(true);
    expect(plan.sandboxPortalReference.loginAttempted).toBe(false);
    expect(plan.sandboxPortalReference.otpRequested).toBe(false);
    expect(plan.sandboxPortalReference.csidRequested).toBe(false);
    expect(plan.requestSchemaMetadata.schemaPlanAvailable).toBe(true);
    expect(plan.responseCustodyMetadata.responseCustodyDryRunAvailable).toBe(true);
    expect(plan.custodyMetadata.runtimeProvider).toBe("DISABLED");
    expect(plan.blockers).toEqual(expect.arrayContaining(["real ZATCA network calls are disabled"]));
    expect(serialized).not.toMatch(/123456|real-csid|BEGIN PRIVATE KEY|BEGIN CERTIFICATE|binary-token-body|SECRET_VALUE|token-value/i);
    expect(prisma.zatcaComplianceCsidCustodyRecord.create).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
  });

  it("keeps production EGS units blocked in the approval gate API", async () => {
    const { service } = makeService({ egsUnit: { environment: "PRODUCTION" } });

    const plan = await service.getEgsUnitSandboxCsidExecutionApprovalPlan(organizationId, egsUnitId);

    expect(plan.executionAllowed).toBe(false);
    expect(plan.environment).toBe("BLOCKED_PRODUCTION");
    expect(plan.statuses).toContain("BLOCKED_PRODUCTION_COMPLIANCE_FALSE");
    expect(plan.productionCompliance).toBe(false);
  });
});
