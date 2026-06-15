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
    complianceProvider: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    complianceTransmission: {
      create: jest.fn().mockResolvedValue({ id: "tx-1", status: "ACCEPTED", channel: "mock-asp-local-only", externalReference: "mock-asp-1" }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    complianceEventLog: {
      create: jest.fn().mockResolvedValue({ id: "event-1" }),
      findMany: jest.fn().mockResolvedValue([]),
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

  it("falls back to the disabled ASP provider when config is missing", async () => {
    const { service, prisma } = makeService();

    const result = await service.getAspProviderSummary("org-1");

    expect(prisma.complianceProvider.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", countryCode: "AE" } }));
    expect(result.adapter.providerKey).toBe("DISABLED");
    expect(result.adapter.health.status).toBe("DISABLED");
    expect(result.noNetwork).toBe(true);
    expect(result.noFtaReporting).toBe(true);
    expect(JSON.stringify(result)).not.toContain("plain-secret");
  });

  it("returns safe not-implemented results for future ASP providers", async () => {
    const { service } = makeService();

    const result = await service.testAspProviderConfig("org-1", { providerKey: "FUTURE_EDICOM", mode: "FUTURE" });

    expect(result.adapter.providerKey).toBe("FUTURE_EDICOM");
    expect(result.adapter.health.ok).toBe(false);
    expect(result.adapter.health.issues).toContain("ASP_PROVIDER_NOT_IMPLEMENTED");
    expect(result.noRealAspCalls).toBe(true);
  });

  it("rejects arbitrary external provider URLs and redacts secrets", async () => {
    const { service } = makeService();

    await expect(
      service.testAspProviderConfig("org-1", {
        providerKey: "MOCK",
        mode: "MOCK",
        mockModeEnabled: true,
        endpointUrl: "https://provider.example.test",
        apiKey: "plain-api-key",
      }),
    ).rejects.toThrow("External ASP provider URLs are disabled");

    const result = await service.testAspProviderConfig("org-1", { providerKey: "MOCK", mode: "MOCK", mockModeEnabled: true, apiKey: "plain-api-key", secret: "plain-secret" });
    expect(JSON.stringify(result)).not.toContain("plain-api-key");
    expect(JSON.stringify(result)).not.toContain("plain-secret");
    expect(result.config.apiKey).toBe("[REDACTED]");
  });

  it("creates local mock transmission only with explicit mock mode and leaves document status unchanged", async () => {
    const complianceDocument = {
      id: "doc-1",
      organizationId: "org-1",
      sourceType: "SALES_INVOICE",
      sourceId: "invoice-1",
      documentType: "TAX_INVOICE",
      status: "READY_FOR_ASP",
      documentNumber: "INV-0001",
    };
    const { service, prisma, auditLogService } = makeService({
      complianceDocument: {
        groupBy: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(complianceDocument),
      },
    });

    await expect(service.submitMockProvider("org-1", "user-1", "doc-1", { explicitMockMode: false })).rejects.toThrow("explicit mock mode");

    const result = await service.submitMockProvider("org-1", "user-1", "doc-1", {
      explicitMockMode: true,
      scenario: "SUBMISSION_ACCEPTED",
      config: { providerKey: "MOCK", mode: "MOCK", mockModeEnabled: true },
    });

    expect(result.provider.providerKey).toBe("MOCK");
    expect(result.documentStatusUnchanged).toBe(true);
    expect(result.result.mockOnly).toBe(true);
    expect(result.result.status).toBe("ASP_ACCEPTED");
    expect(prisma.complianceTransmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          complianceDocumentId: "doc-1",
          channel: "mock-asp-local-only",
        }),
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ entityType: "ComplianceTransmission" }));
  });

  it("blocks disabled provider submission previews and does not emit real delivery statuses", async () => {
    const { service, prisma } = makeService({
      complianceDocument: {
        groupBy: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({
          id: "doc-1",
          organizationId: "org-1",
          sourceType: "SALES_INVOICE",
          sourceId: "invoice-1",
          documentType: "TAX_INVOICE",
          status: "READY_FOR_ASP",
          documentNumber: "INV-0001",
        }),
      },
    });

    const preview = await service.createAspTransmissionPreview("org-1", "doc-1", { config: { providerKey: "DISABLED", mode: "DISABLED" } });

    expect(preview.noMutation).toBe(true);
    expect(preview.result.ok).toBe(false);
    expect(preview.result.status).toBe("DISABLED");
    expect(JSON.stringify(preview)).not.toContain("REPORTED_TO_FTA");
    expect(JSON.stringify(preview)).not.toContain("DELIVERED_TO_BUYER");
    expect(prisma.complianceTransmission.create).not.toHaveBeenCalled();
  });

  it("enforces tenant scoping before provider status or mock submission", async () => {
    const { service, prisma } = makeService({
      complianceDocument: {
        groupBy: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.getAspProviderStatusTimeline("org-2", "doc-1")).rejects.toThrow("Compliance document not found");
    await expect(service.submitMockProvider("org-2", "user-1", "doc-1", { explicitMockMode: true, config: { providerKey: "MOCK", mode: "MOCK", mockModeEnabled: true } })).rejects.toThrow(
      "Compliance document not found",
    );
    expect(prisma.complianceDocument.findFirst).toHaveBeenCalledWith({ where: { id: "doc-1", organizationId: "org-2" } });
  });

  it("records official local PINT-AE serializer validation for sales invoices without provider status", async () => {
    const { service, prisma, tx } = makeValidationService({ sourceType: "SALES_INVOICE" });

    const result = await service.validateDocument("org-1", "user-1", "doc-1");

    expect(result.archiveCreated).toBe(true);
    expect(result.validation.valid).toBe(true);
    expect(tx.complianceValidationResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validatorKey: "uae-pint-ae-official-local",
          summary: expect.stringContaining("Official local PINT-AE XML serialization passed"),
          metadataJson: expect.objectContaining({
            noNetwork: true,
            noAspValidation: true,
            noFtaReporting: true,
            productionCompliance: false,
          }),
        }),
      }),
    );
    expect(tx.documentArchiveRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ storageProvider: "metadata-only" }) }));
    expect(tx.complianceEventLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ message: expect.stringContaining("without ASP validation or network calls") }) }));
    expect(prisma.complianceTransmission.create).not.toHaveBeenCalled();
  });

  it("records official local PINT-AE serializer validation for credit notes", async () => {
    const { service } = makeValidationService({ sourceType: "CREDIT_NOTE" });

    const result = await service.validateDocument("org-1", "user-1", "doc-1");

    expect(result.archiveCreated).toBe(true);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.issues).toEqual([]);
  });

  it("returns structured official serializer errors for missing buyer endpoint", async () => {
    const { service } = makeValidationService({
      sourceType: "SALES_INVOICE",
      invoice: invoiceFixture({
        customer: { ...contactFixture(), peppolParticipantId: null, uaeTin: null },
      }),
    });

    const result = await service.validateDocument("org-1", "user-1", "doc-1");

    expect(result.archiveCreated).toBe(false);
    expect(result.validation.valid).toBe(false);
    expect(result.validation.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "BUYER_ENDPOINT_REQUIRED", fieldPath: "buyer.endpointId", source: "local-rule" })]),
    );
  });

  it("returns structured official serializer errors for credit notes missing reason and original reference", async () => {
    const { service } = makeValidationService({
      sourceType: "CREDIT_NOTE",
      creditNote: creditNoteFixture({ reason: "", originalInvoice: null }),
    });

    const result = await service.validateDocument("org-1", "user-1", "doc-1");

    expect(result.archiveCreated).toBe(false);
    expect(result.validation.valid).toBe(false);
    expect(result.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CREDIT_NOTE_REASON_REQUIRED", fieldPath: "creditNoteReason", source: "local-rule" }),
        expect.objectContaining({ code: "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED", fieldPath: "originalInvoiceNumber", source: "local-rule" }),
      ]),
    );
  });

  it("does not use network calls during official local PINT-AE validation", async () => {
    const { service } = makeValidationService({ sourceType: "SALES_INVOICE" });
    const originalFetch = global.fetch;
    let fetchCount = 0;
    global.fetch = jest.fn(() => {
      fetchCount += 1;
      throw new Error("network should not be called");
    }) as typeof fetch;
    try {
      await service.validateDocument("org-1", "user-1", "doc-1");
    } finally {
      global.fetch = originalFetch;
    }

    expect(fetchCount).toBe(0);
  });
});

function makeValidationService(input: { sourceType: "SALES_INVOICE" | "CREDIT_NOTE"; invoice?: unknown; creditNote?: unknown }) {
  const complianceDocument = {
    id: "doc-1",
    organizationId: "org-1",
    sourceType: input.sourceType,
    sourceId: input.sourceType === "SALES_INVOICE" ? "invoice-1" : "credit-1",
    documentType: input.sourceType === "SALES_INVOICE" ? "TAX_INVOICE" : "TAX_CREDIT_NOTE",
    status: "READY_FOR_VALIDATION",
    documentNumber: input.sourceType === "SALES_INVOICE" ? "INV-0001" : "CN-0001",
  };
  const tx = {
    complianceValidationResult: { create: jest.fn().mockResolvedValue({ id: "validation-1" }) },
    documentArchiveRecord: { create: jest.fn().mockResolvedValue({ id: "archive-1" }) },
    complianceDocument: { update: jest.fn().mockResolvedValue({ ...complianceDocument, status: "READY_FOR_ASP", latestValidationStatus: "PASSED" }) },
    complianceEventLog: { create: jest.fn().mockResolvedValue({ id: "event-1" }) },
  };
  const { service, prisma, auditLogService } = makeService({
    complianceDocument: {
      groupBy: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(complianceDocument),
      update: jest.fn(),
    },
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue(input.invoice ?? invoiceFixture({ dueDate: new Date("2026-07-14T00:00:00.000Z") })),
    },
    creditNote: {
      findFirst: jest.fn().mockResolvedValue(input.creditNote ?? creditNoteFixture()),
    },
    $transaction: jest.fn(async (callback: (executor: typeof tx) => Promise<unknown>) => callback(tx)),
  });
  return { service, prisma, auditLogService, tx };
}

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
    taxableTotal: "1000",
    taxTotal: "50",
    total: "1050",
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
