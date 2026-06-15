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
      findFirst: jest.fn().mockResolvedValue(null),
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

  it("calculates read-only sales invoice readiness with seller and buyer endpoint warnings", async () => {
    const { service, prisma } = makeService({
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue(
          invoiceFixture({
            customer: {
              ...contactFixture(),
              peppolParticipantId: null,
            },
          }),
        ),
      },
      complianceDocument: {
        groupBy: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({
          id: "doc-1",
          status: "VALIDATION_FAILED",
          validationResults: [{ id: "validation-1", status: "FAILED", summary: "Local PINT-AE readiness validation failed." }],
          archiveRecords: [],
        }),
      },
    });

    const result = await service.getSalesInvoiceReadiness("org-1", "invoice-1");

    expect(prisma.salesInvoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "invoice-1", organizationId: "org-1" } }));
    expect(result.localOnly).toBe(true);
    expect(result.noNetwork).toBe(true);
    expect(result.noAspSubmission).toBe(true);
    expect(result.noFtaReporting).toBe(true);
    expect(result.productionCompliance).toBe(false);
    expect(result.canAttemptLocalXmlGeneration).toBe(false);
    expect(result.readiness.buyer.checks.map((check) => check.key)).toContain("BUYER_PEPPOL_ID");
    expect(result.readiness.validation.issues.map((issue) => issue.code)).toContain("BUYER_ENDPOINT_REQUIRED");
    expect(result.complianceDocument?.validationResults.at(0)?.status).toBe("FAILED");
  });

  it("calculates read-only credit-note readiness with original invoice and reason checks", async () => {
    const { service } = makeService({
      creditNote: {
        findFirst: jest.fn().mockResolvedValue(
          creditNoteFixture({
            reason: "",
            originalInvoice: null,
          }),
        ),
      },
      complianceDocument: {
        groupBy: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    const result = await service.getCreditNoteReadiness("org-1", "credit-1");

    expect(result.sourceType).toBe("CREDIT_NOTE");
    expect(result.localOnly).toBe(true);
    expect(result.canAttemptLocalXmlGeneration).toBe(false);
    expect(result.readiness.originalReference?.checks.map((check) => check.key)).toEqual(["CREDIT_NOTE_REASON", "ORIGINAL_INVOICE_REFERENCE"]);
    expect(result.readiness.validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["CREDIT_NOTE_REASON_REQUIRED", "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED"]),
    );
  });
});

function organizationFixture() {
  return {
    id: "org-1",
    name: "LedgerByte",
    legalName: "LedgerByte FZ LLC",
    taxNumber: "100000000000003",
    uaeTrn: "100000000000003",
    uaeTin: "1234567890",
    uaeAddressLine1: "Business Bay",
    uaeAddressLine2: null,
    uaeEmirate: "Dubai",
    peppolParticipantId: "02351234567890",
  };
}

function contactFixture() {
  return {
    id: "customer-1",
    name: "Buyer LLC",
    legalName: "Buyer LLC",
    taxNumber: "200000000000003",
    uaeTrn: "200000000000003",
    uaeTin: "2234567890",
    addressLine1: "Al Reem Island",
    addressLine2: null,
    uaeAddressLine1: "Al Reem Island",
    uaeAddressLine2: null,
    city: "Abu Dhabi",
    uaeEmirate: "Abu Dhabi",
    countryCode: "AE",
    peppolParticipantId: "02352234567890",
  };
}

function invoiceFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "invoice-1",
    status: "FINALIZED",
    invoiceNumber: "INV-0001",
    issueDate: new Date("2026-06-14T00:00:00.000Z"),
    currency: "AED",
    organization: organizationFixture(),
    customer: contactFixture(),
    lines: [documentLineFixture()],
    taxableTotal: "1000",
    taxTotal: "50",
    total: "1050",
    ...overrides,
  };
}

function creditNoteFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "credit-1",
    status: "FINALIZED",
    creditNoteNumber: "CN-0001",
    issueDate: new Date("2026-06-15T00:00:00.000Z"),
    currency: "AED",
    organization: organizationFixture(),
    customer: contactFixture(),
    originalInvoice: { invoiceNumber: "INV-0001" },
    reason: "Returned service",
    lines: [documentLineFixture()],
    taxableTotal: "100",
    taxTotal: "5",
    total: "105",
    ...overrides,
  };
}

function documentLineFixture() {
  return {
    id: "line-1",
    sortOrder: 1,
    description: "Bookkeeping services",
    quantity: "1",
    unitPrice: "1000",
    taxableAmount: "1000",
    taxAmount: "50",
    lineTotal: "1050",
  };
}
