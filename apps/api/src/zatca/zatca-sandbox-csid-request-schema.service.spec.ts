import { ZatcaCsrConfigReviewStatus, ZatcaRegistrationStatus } from "@prisma/client";
import { ZatcaService } from "./zatca.service";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";

function makeService(overrides: { egsUnit?: Record<string, unknown>; approvedReview?: Record<string, unknown> | null } = {}) {
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
    certificateRequestId: null,
    lastInvoiceHash: null,
    lastIcv: 0,
    hashMode: "LOCAL_DETERMINISTIC",
    hashModeEnabledAt: null,
    hashModeEnabledById: null,
    hashModeResetReason: null,
    sdkHashChainStartedAt: null,
    isActive: true,
    createdAt: new Date("2026-06-07T12:00:00.000Z"),
    updatedAt: new Date("2026-06-07T12:00:00.000Z"),
    ...overrides.egsUnit,
  };
  const approvedReview =
    overrides.approvedReview === null
      ? null
      : {
          id: "44444444-4444-4444-4444-444444444444",
          organizationId,
          egsUnitId,
          status: ZatcaCsrConfigReviewStatus.APPROVED,
          configHash: "safe-config-hash",
          configPreviewRedacted: "redacted",
          configKeyOrder: [],
          missingFieldsJson: [],
          reviewFieldsJson: [],
          blockersJson: [],
          warningsJson: [],
          approvedById: null,
          approvedAt: new Date("2026-06-07T12:00:00.000Z"),
          revokedById: null,
          revokedAt: null,
          note: null,
          createdAt: new Date("2026-06-07T12:00:00.000Z"),
          updatedAt: new Date("2026-06-07T12:00:00.000Z"),
          approvedBy: null,
          revokedBy: null,
          ...overrides.approvedReview,
        };
  const prisma = {
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(egsUnit),
    },
    zatcaCsrConfigReview: {
      findFirst: jest.fn().mockResolvedValue(approvedReview),
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

describe("ZATCA sandbox CSID request schema service plan", () => {
  it("returns a metadata-only schema plan without request execution or body exposure", async () => {
    const { service, prisma, onboardingAdapter } = makeService();

    const plan = await service.getEgsUnitSandboxCsidRequestSchemaPlan(organizationId, egsUnitId);
    const serialized = JSON.stringify(plan);

    expect(plan.localOnly).toBe(true);
    expect(plan.schemaOnly).toBe(true);
    expect(plan.noNetwork).toBe(true);
    expect(plan.noRequestBodyCreated).toBe(true);
    expect(plan.noResponseBodyProcessed).toBe(true);
    expect(plan.productionCompliance).toBe(false);
    expect(plan.safeRequestContractSummary.futureRequestShape.bodyPolicy).toBe("NOT_CREATED_IN_THIS_LANE");
    expect(plan.sandboxPortalReference.referenceOnly).toBe(true);
    expect(plan.sandboxPortalReference.loginAttempted).toBe(false);
    expect(plan.sandboxPortalReference.otpRequested).toBe(false);
    expect(plan.sandboxPortalReference.csidRequested).toBe(false);
    expect(plan.csrMetadata.latestApprovedReviewId).toBe("44444444-4444-4444-4444-444444444444");
    expect(plan.csrMetadata.csrBodyReturned).toBe(false);
    expect(plan.custodyMetadata.runtimeProvider).toBe("DISABLED");
    expect(plan.blockers).toEqual(expect.arrayContaining(["real sandbox CSID request execution is not approved"]));
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE REQUEST|BEGIN PRIVATE KEY|binarySecurityToken":"|real-otp-value|SECRET_VALUE/i);
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
  });

  it("keeps production EGS units blocked in the schema planning API", async () => {
    const { service } = makeService({ egsUnit: { environment: "PRODUCTION" } });

    const plan = await service.getEgsUnitSandboxCsidRequestSchemaPlan(organizationId, egsUnitId);

    expect(plan.ready).toBe(false);
    expect(plan.environment).toBe("BLOCKED_PRODUCTION");
    expect(plan.blockers).toContain("production CSID request planning is out of scope for the sandbox schema lane");
    expect(plan.productionCompliance).toBe(false);
  });
});
