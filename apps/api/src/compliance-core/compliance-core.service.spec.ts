import { ComplianceCoreService } from "./compliance-core.service";

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    organization: {
      findUnique: jest.fn().mockResolvedValue({
        id: "org-1",
        name: "LedgerByte",
        legalName: "LedgerByte FZ LLC",
        taxNumber: "100000000000003",
        countryCode: "AE",
        tradeLicenseNumber: "TL-123",
        uaeTrn: "100000000000003",
        uaeTin: "1234567890",
        uaeVatRegistrationStatus: "REGISTERED",
        uaeAddressLine1: "Business Bay",
        uaeAddressLine2: null,
        uaeEmirate: "Dubai",
        uaeBusinessActivity: "Accounting software",
        peppolParticipantId: "02351234567890",
        uaeAspSelected: "Disabled mock ASP",
        uaeAspOnboardingStatus: "NOT_STARTED",
      }),
    },
    contact: {
      count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
    },
    complianceDocument: {
      groupBy: jest.fn().mockResolvedValue([{ status: "READY_FOR_VALIDATION", _count: { status: 1 } }]),
    },
    ...overrides,
  } as any;
  const auditLogService = { log: jest.fn() } as any;
  return { service: new ComplianceCoreService(prisma, auditLogService), prisma, auditLogService };
}

describe("ComplianceCoreService", () => {
  it("reports UAE readiness without production or ASP accreditation claims", async () => {
    const { service } = makeService();

    const result = await service.getReadiness("org-1");

    expect(result.posture).toBe("CONTROLLED_BETA_USER_TESTING_ONLY");
    expect(result.noNetworkByDefault).toBe(true);
    expect(result.uae.expectedParticipantId).toBe("02351234567890");
    expect(result.prohibitedClaims).toContain("Accredited ASP");
    expect(result.uae.readiness.status).toBe("READY_FOR_VALIDATION");
  });
});
