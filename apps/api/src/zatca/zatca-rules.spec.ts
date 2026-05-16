import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ZatcaInvoiceStatus, ZatcaRegistrationStatus, ZatcaSubmissionStatus, ZatcaSubmissionType } from "@prisma/client";
import { initialPreviousInvoiceHash } from "@ledgerbyte/zatca-core";
import { SandboxDisabledZatcaOnboardingAdapter } from "./adapters/sandbox-disabled-zatca-onboarding.adapter";
import type { ZatcaAdapterConfig } from "./zatca.config";
import { ZatcaService } from "./zatca.service";

describe("ZATCA service rules", () => {
  it("creates a default profile from organization data", async () => {
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300", countryCode: "SA" }),
      },
      zatcaOrganizationProfile: {
        upsert: jest.fn().mockResolvedValue({ id: "profile-1", sellerName: "Org Legal", vatNumber: "300" }),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(service.getProfile("org-1")).resolves.toMatchObject({ id: "profile-1" });
    expect(prisma.zatcaOrganizationProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        create: expect.objectContaining({ sellerName: "Org Legal", vatNumber: "300", countryCode: "SA" }),
      }),
    );
  });

  it("rejects blank profile country codes", async () => {
    const service = new ZatcaService({} as never, { log: jest.fn() } as never);
    jest.spyOn(service, "getProfile").mockResolvedValue({ id: "profile-1" } as never);

    await expect(service.updateProfile("org-1", "user-1", { countryCode: "" })).rejects.toThrow(BadRequestException);
  });

  it("creates and activates development EGS units", async () => {
    const egsUnit = makeEgsUnit({ id: "egs-1", name: "Dev EGS", isActive: false });
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" }) },
      zatcaOrganizationProfile: { upsert: jest.fn().mockResolvedValue({ id: "profile-1", environment: "SANDBOX" }) },
      zatcaEgsUnit: {
        create: jest.fn().mockResolvedValue(egsUnit),
        findFirst: jest.fn().mockResolvedValue({ ...egsUnit, privateKeyPem: null }),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          zatcaEgsUnit: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue({ ...egsUnit, isActive: true, status: ZatcaRegistrationStatus.ACTIVE }),
          },
        }),
      ),
    };
    const audit = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, audit as never);

    await expect(service.createEgsUnit("org-1", "user-1", { name: "Dev EGS", deviceSerialNumber: "DEV-001" })).resolves.toMatchObject({
      id: "egs-1",
    });
    await expect(service.activateDevEgsUnit("org-1", "user-1", "egs-1")).resolves.toMatchObject({ isActive: true, status: ZatcaRegistrationStatus.ACTIVE });
    expect(audit.log).toHaveBeenCalledTimes(2);
  });

  it("generates CSR only when profile fields are ready and never returns the private key", async () => {
    const egsUnit = makeEgsUnit({ id: "egs-1", csrPem: null });
    const updatedUnit = makeEgsUnit({ id: "egs-1", csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR\n-----END CERTIFICATE REQUEST-----", status: ZatcaRegistrationStatus.OTP_REQUIRED });
    const prisma = {
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({ ...egsUnit, privateKeyPem: null }),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          zatcaEgsUnit: { update: jest.fn().mockResolvedValue(updatedUnit) },
          zatcaOrganizationProfile: { update: jest.fn().mockResolvedValue({}) },
        }),
      ),
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest.spyOn(service, "getProfile").mockResolvedValue({
      id: "profile-1",
      sellerName: "Seller",
      vatNumber: "300000000000003",
      city: "Riyadh",
      countryCode: "SA",
      businessCategory: "Services",
      readiness: { ready: true, missingFields: [] },
    } as never);

    const result = await service.generateEgsCsr("org-1", "user-1", "egs-1");

    expect(result).toMatchObject({ hasCsr: true, status: ZatcaRegistrationStatus.OTP_REQUIRED });
    expect(result).not.toHaveProperty("privateKeyPem");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
  });

  it("rejects CSR generation when required profile fields are missing", async () => {
    const service = new ZatcaService(
      { zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit(), privateKeyPem: null }) } } as never,
      { log: jest.fn() } as never,
    );
    jest.spyOn(service, "getProfile").mockResolvedValue({
      sellerName: "",
      vatNumber: "300000000000003",
      city: "",
      countryCode: "SA",
      readiness: { ready: false, missingFields: ["sellerName", "city"] },
    } as never);

    await expect(service.generateEgsCsr("org-1", "user-1", "egs-1")).rejects.toThrow("sellerName, city");
  });

  it("returns CSR PEM without exposing private keys", async () => {
    const service = new ZatcaService(
      {
        zatcaEgsUnit: {
          findFirst: jest.fn().mockResolvedValue({
            ...makeEgsUnit({ csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR\n-----END CERTIFICATE REQUEST-----" }),
            privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\nSECRET\n-----END RSA PRIVATE KEY-----",
          }),
        },
      } as never,
      { log: jest.fn() } as never,
    );

    await expect(service.getEgsCsr("org-1", "egs-1")).resolves.toContain("BEGIN CERTIFICATE REQUEST");
    await expect(service.getEgsUnit("org-1", "egs-1")).resolves.not.toHaveProperty("privateKeyPem");
  });

  it("rejects cross-tenant EGS CSR access", async () => {
    const service = new ZatcaService(
      { zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue(null) } } as never,
      { log: jest.fn() } as never,
    );

    await expect(service.getEgsCsr("other-org", "egs-1")).rejects.toThrow(NotFoundException);
  });

  it("requests mock compliance CSID only after CSR and OTP are present", async () => {
    const egsUnit = makeEgsUnit({ csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR\n-----END CERTIFICATE REQUEST-----" });
    const tx = {
      zatcaEgsUnit: {
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({
          ...egsUnit,
          isActive: true,
          status: ZatcaRegistrationStatus.ACTIVE,
          complianceCsidPem: "-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----",
          certificateRequestId: "LOCAL-MOCK-1",
        }),
      },
      zatcaOrganizationProfile: { update: jest.fn().mockResolvedValue({}) },
      zatcaSubmissionLog: { create: jest.fn().mockResolvedValue({ id: "log-1" }) },
    };
    const prisma = {
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue({ ...egsUnit, privateKeyPem: "secret" }) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const result = await service.requestComplianceCsid("org-1", "user-1", "egs-1", { otp: "000000", mode: "mock" });

    expect(result).toMatchObject({ hasComplianceCsid: true, certificateRequestId: "LOCAL-MOCK-1", isActive: true });
    expect(result).not.toHaveProperty("privateKeyPem");
    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invoiceMetadataId: null, responseCode: "LOCAL_MOCK", requestPayloadBase64: expect.any(String) }),
      }),
    );
    const loggedRequest = Buffer.from(tx.zatcaSubmissionLog.create.mock.calls[0][0].data.requestPayloadBase64, "base64").toString();
    expect(loggedRequest).not.toContain("000000");
    expect(loggedRequest).not.toContain("BEGIN CERTIFICATE REQUEST");
    expect(loggedRequest).not.toContain("PRIVATE KEY");
  });

  it("rejects compliance CSID requests without CSR or OTP", async () => {
    const service = new ZatcaService(
      { zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit({ csrPem: null }), privateKeyPem: null }) } } as never,
      { log: jest.fn() } as never,
    );

    await expect(service.requestComplianceCsid("org-1", "user-1", "egs-1", { otp: "000000" })).rejects.toThrow("Generate a CSR");

    const withCsr = new ZatcaService(
      {
        zatcaEgsUnit: {
          findFirst: jest.fn().mockResolvedValue({
            ...makeEgsUnit({ csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR\n-----END CERTIFICATE REQUEST-----" }),
            privateKeyPem: null,
          }),
        },
      } as never,
      { log: jest.fn() } as never,
    );
    await expect(withCsr.requestComplianceCsid("org-1", "user-1", "egs-1", { otp: "" })).rejects.toThrow("OTP is required");
  });

  it("logs failed sandbox-disabled compliance CSID attempts without requiring a real OTP", async () => {
    const logCreate = jest.fn().mockResolvedValue({ id: "log-1" });
    const service = new ZatcaService(
      {
        zatcaEgsUnit: {
          findFirst: jest.fn().mockResolvedValue({
            ...makeEgsUnit({ csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR\n-----END CERTIFICATE REQUEST-----" }),
            privateKeyPem: null,
          }),
        },
        zatcaSubmissionLog: { create: logCreate },
      } as never,
      { log: jest.fn() } as never,
      new SandboxDisabledZatcaOnboardingAdapter(),
      makeAdapterConfig({ mode: "sandbox-disabled" }),
    );

    await expect(service.requestComplianceCsid("org-1", "user-1", "egs-1", {})).rejects.toThrow("Real ZATCA network calls are disabled");
    expect(logCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          egsUnitId: "egs-1",
          status: ZatcaSubmissionStatus.FAILED,
          responseCode: "REAL_NETWORK_DISABLED",
          errorMessage: expect.stringContaining("Real ZATCA network calls are disabled"),
        }),
      }),
    );
  });

  it("does not implement production CSID requests yet", async () => {
    const logCreate = jest.fn().mockResolvedValue({ id: "log-1" });
    const service = new ZatcaService(
      { zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit(), privateKeyPem: null }) }, zatcaSubmissionLog: { create: logCreate } } as never,
      { log: jest.fn() } as never,
    );

    await expect(service.requestProductionCsid("org-1", "user-1", "egs-1")).rejects.toThrow("Production CSID request is not implemented");
    expect(logCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          egsUnitId: "egs-1",
          status: ZatcaSubmissionStatus.FAILED,
          responseCode: "MOCK_NOT_IMPLEMENTED",
        }),
      }),
    );
  });

  it("requires finalized invoices and seller VAT data before generation", async () => {
    const draftTx = makeGenerationTransactionMock({ invoiceStatus: "DRAFT" });
    const draftPrisma = { $transaction: jest.fn((callback: (tx: typeof draftTx) => Promise<unknown>) => callback(draftTx)) };
    const service = new ZatcaService(draftPrisma as never, { log: jest.fn() } as never);

    await expect(service.generateInvoiceCompliance("org-1", "user-1", "invoice-1")).rejects.toThrow("ZATCA XML can only be generated for finalized invoices.");

    const missingProfileTx = makeGenerationTransactionMock({ sellerName: null, vatNumber: null });
    const missingProfilePrisma = { $transaction: jest.fn((callback: (tx: typeof missingProfileTx) => Promise<unknown>) => callback(missingProfileTx)) };
    const missingProfileService = new ZatcaService(missingProfilePrisma as never, { log: jest.fn() } as never);

    await expect(missingProfileService.generateInvoiceCompliance("org-1", "user-1", "invoice-1")).rejects.toThrow(
      "ZATCA seller name and VAT number are required before XML generation.",
    );
  });

  it("generates metadata, increments ICV, and updates the previous hash chain", async () => {
    const tx = makeGenerationTransactionMock({ activeEgsLastIcv: 4, activeEgsLastInvoiceHash: "previous-hash" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const audit = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, audit as never);

    const result = await service.generateInvoiceCompliance("org-1", "user-1", "invoice-1");

    expect(result).toMatchObject({ zatcaStatus: ZatcaInvoiceStatus.XML_GENERATED, icv: 5, previousInvoiceHash: "previous-hash" });
    expect(tx.zatcaInvoiceMetadata.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          icv: 5,
          previousInvoiceHash: "previous-hash",
          invoiceHash: expect.any(String),
          xmlBase64: expect.any(String),
          qrCodeBase64: expect.any(String),
        }),
      }),
    );
    const generatedXml = Buffer.from(tx.zatcaInvoiceMetadata.update.mock.calls[0]![0].data.xmlBase64, "base64").toString("utf8");
    expect(generatedXml).toContain("<cbc:ActualDeliveryDate>2026-05-07</cbc:ActualDeliveryDate>");
    expect(tx.zatcaEgsUnit.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastIcv: 5, lastInvoiceHash: expect.any(String) }) }));
    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestUrl: "local-generation-only" }) }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "GENERATE", entityType: "ZatcaInvoiceMetadata" }));
  });

  it("returns existing generated metadata without consuming another ICV", async () => {
    const existingMetadata = makeGeneratedMetadata({ icv: 7, previousInvoiceHash: "previous-hash", invoiceHash: "existing-hash" });
    const tx = makeGenerationTransactionMock({
      activeEgsLastIcv: 7,
      activeEgsLastInvoiceHash: "existing-hash",
      existingMetadata,
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const audit = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, audit as never);

    const result = await service.generateInvoiceCompliance("org-1", "user-1", "invoice-1");

    expect(result).toMatchObject({ id: "metadata-1", icv: 7, invoiceHash: "existing-hash" });
    expect(tx.zatcaInvoiceMetadata.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "metadata-1" }, include: expect.any(Object) }),
    );
    expect(tx.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(tx.zatcaEgsUnit.findFirst).not.toHaveBeenCalled();
    expect(tx.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(tx.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "GENERATE", entityType: "ZatcaInvoiceMetadata" }));
  });

  it("uses the initial previous hash when no active EGS unit exists", async () => {
    const tx = makeGenerationTransactionMock({ activeEgs: null });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await service.generateInvoiceCompliance("org-1", "user-1", "invoice-1");

    expect(tx.zatcaInvoiceMetadata.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ previousInvoiceHash: initialPreviousInvoiceHash, icv: null }) }),
    );
    expect(tx.zatcaEgsUnit.update).not.toHaveBeenCalled();
  });

  it("runs mock invoice compliance checks, updates local readiness, and logs the submission", async () => {
    const metadata = makeGeneratedMetadata();
    const tx = {
      zatcaSubmissionLog: { create: jest.fn().mockResolvedValue({ id: "log-1" }) },
      zatcaInvoiceMetadata: {
        update: jest.fn().mockResolvedValue({
          ...metadata,
          zatcaStatus: ZatcaInvoiceStatus.READY_FOR_SUBMISSION,
          submissionLogs: [{ id: "log-1", responseCode: "LOCAL_MOCK_COMPLIANCE_CHECK" }],
        }),
      },
    };
    const prisma = {
      zatcaInvoiceMetadata: { findFirst: jest.fn().mockResolvedValue(metadata) },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue({ id: "egs-1" }) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const audit = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, audit as never);

    const result = await service.submitInvoiceComplianceCheck("org-1", "user-1", "invoice-1");

    expect(result).toMatchObject({ zatcaStatus: ZatcaInvoiceStatus.READY_FOR_SUBMISSION });
    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceMetadataId: "metadata-1",
          submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
          status: ZatcaSubmissionStatus.SUCCESS,
          responseCode: "LOCAL_MOCK_COMPLIANCE_CHECK",
          requestPayloadBase64: expect.any(String),
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ZATCA_COMPLIANCE_CHECK" }));
  });

  it("logs safe mock clearance and reporting blocks without marking invoices cleared or reported", async () => {
    const metadata = makeGeneratedMetadata();
    const tx = {
      zatcaSubmissionLog: { create: jest.fn().mockResolvedValue({ id: "log-1" }) },
      zatcaInvoiceMetadata: { update: jest.fn().mockResolvedValue(metadata) },
    };
    const prisma = {
      zatcaInvoiceMetadata: { findFirst: jest.fn().mockResolvedValue(metadata) },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue({ id: "egs-1" }) },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(service.requestInvoiceClearance("org-1", "user-1", "invoice-1")).rejects.toThrow("Clearance submission is not implemented in mock mode");
    await expect(service.requestInvoiceReporting("org-1", "user-1", "invoice-1")).rejects.toThrow("Reporting submission is not implemented in mock mode");

    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionType: ZatcaSubmissionType.CLEARANCE,
          status: ZatcaSubmissionStatus.FAILED,
          responseCode: "MOCK_NOT_IMPLEMENTED",
        }),
      }),
    );
    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionType: ZatcaSubmissionType.REPORTING,
          status: ZatcaSubmissionStatus.FAILED,
          responseCode: "MOCK_NOT_IMPLEMENTED",
        }),
      }),
    );
    expect(tx.zatcaInvoiceMetadata.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ zatcaStatus: ZatcaInvoiceStatus.CLEARED }) }),
    );
    expect(tx.zatcaInvoiceMetadata.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ zatcaStatus: ZatcaInvoiceStatus.REPORTED }) }),
    );
  });

  it("scopes XML and QR lookup by organization", async () => {
    const prisma = {
      zatcaInvoiceMetadata: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ xmlBase64: Buffer.from("<Invoice />", "utf8").toString("base64") })
          .mockResolvedValueOnce({ qrCodeBase64: "qr-base64" })
          .mockResolvedValueOnce(null),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(service.getInvoiceXml("org-1", "invoice-1")).resolves.toEqual(Buffer.from("<Invoice />", "utf8"));
    await expect(service.getInvoiceQr("org-1", "invoice-1")).resolves.toEqual({ qrCodeBase64: "qr-base64" });
    await expect(service.getInvoiceXml("other-org", "invoice-1")).rejects.toThrow(NotFoundException);
    expect(prisma.zatcaInvoiceMetadata.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", invoiceId: "invoice-1" } });
  });

  it("returns local XML validation errors before XML generation", async () => {
    const prisma = {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1" }) },
      zatcaInvoiceMetadata: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const result = await service.getInvoiceXmlValidation("org-1", "invoice-1");

    expect(result).toMatchObject({
      localOnly: true,
      officialValidation: false,
      valid: false,
      errors: ["ZATCA XML has not been generated for this invoice."],
    });
  });

  it("returns local-only XML validation after generation without claiming official validation", async () => {
    const metadata = makeGeneratedMetadata({
      invoiceUuid: "00000000-0000-0000-0000-000000000001",
      xmlBase64: Buffer.from("<Invoice>00000000-0000-0000-0000-000000000001</Invoice>", "utf8").toString("base64"),
    });
    const prisma = {
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValueOnce({ id: "invoice-1" }).mockResolvedValue(makeValidationInvoice()),
      },
      zatcaInvoiceMetadata: { findFirst: jest.fn().mockResolvedValue(metadata) },
      zatcaOrganizationProfile: { findUnique: jest.fn().mockResolvedValue(makeValidationProfile()) },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const result = await service.getInvoiceXmlValidation("org-1", "invoice-1");

    expect(result.localOnly).toBe(true);
    expect(result.officialValidation).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.warnings.join(" ")).toContain("not official ZATCA SDK validation");
    expect(JSON.stringify(result)).not.toContain("privateKeyPem");
  });

  it("scopes XML validation by organization", async () => {
    const service = new ZatcaService({ salesInvoice: { findFirst: jest.fn().mockResolvedValue(null) } } as never, { log: jest.fn() } as never);

    await expect(service.getInvoiceXmlValidation("other-org", "invoice-1")).rejects.toThrow(NotFoundException);
  });

  it("scopes invoice compliance-check submissions by organization", async () => {
    const service = new ZatcaService(
      { zatcaInvoiceMetadata: { findFirst: jest.fn().mockResolvedValue(null) } } as never,
      { log: jest.fn() } as never,
    );

    await expect(service.submitInvoiceComplianceCheck("other-org", "user-1", "invoice-1")).rejects.toThrow(NotFoundException);
  });

  it("scopes submission log listing by organization", async () => {
    const prisma = { zatcaSubmissionLog: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await service.listSubmissions("org-1");

    expect(prisma.zatcaSubmissionLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
  });

  it("groups the static compliance checklist and flags critical not-started gaps", () => {
    const service = new ZatcaService({} as never, { log: jest.fn() } as never);

    const checklist = service.getComplianceChecklist("org-1");
    const items = Object.values(checklist.groups).flat();

    expect(checklist.warning).toContain("not legal certification");
    expect(checklist.groups).toHaveProperty("API");
    expect(checklist.summary.byStatus.NOT_STARTED).toBeGreaterThan(0);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "signature-cryptographic-stamp", status: "NOT_STARTED", riskLevel: "CRITICAL" }),
        expect.objectContaining({ id: "api-official-endpoint-mapping", status: "NOT_STARTED", riskLevel: "CRITICAL" }),
        expect.objectContaining({ id: "pdf-a3-xml-embedding", status: "NOT_STARTED", riskLevel: "CRITICAL" }),
      ]),
    );
  });

  it("returns XML field mapping summary with local-only warning", () => {
    const service = new ZatcaService({} as never, { log: jest.fn() } as never);

    const mapping = service.getXmlFieldMapping("org-1");

    expect(mapping.warning).toContain("not official ZATCA validation");
    expect(mapping.summary.total).toBeGreaterThan(0);
    expect(mapping.summary.byStatus.NOT_STARTED).toBeGreaterThan(0);
    expect(mapping.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "signature-extensions", status: "NOT_STARTED", requiredForProduction: true })]),
    );
  });

  it("returns readiness with productionReady false and no private key material", async () => {
    const prisma = makeReadinessPrisma({
      activeEgs: {
        id: "egs-1",
        name: "Dev EGS",
        status: ZatcaRegistrationStatus.ACTIVE,
        isActive: true,
        csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR\n-----END CERTIFICATE REQUEST-----",
        complianceCsidPem: "-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----",
        privateKeyPem: "-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----",
        lastIcv: 2,
        lastInvoiceHash: "hash",
      },
      localXmlCount: 1,
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getZatcaReadinessSummary("org-1");

    expect(readiness.productionReady).toBe(false);
    expect(readiness.profileReady).toBe(true);
    expect(readiness.egsReady).toBe(true);
    expect(readiness.localXmlReady).toBe(true);
    expect(readiness.mockCsidReady).toBe(true);
    expect(JSON.stringify(readiness)).not.toContain("privateKeyPem");
    expect(JSON.stringify(readiness)).not.toContain("PRIVATE KEY");
  });

  it("readiness identifies missing profile fields", async () => {
    const prisma = makeReadinessPrisma({ profile: { sellerName: "", vatNumber: "300", city: null, countryCode: "SA" } });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getZatcaReadinessSummary("org-1");

    expect(readiness.profileReady).toBe(false);
    expect(readiness.profileMissingFields).toEqual(["sellerName", "city"]);
    expect(readiness.blockingReasons.join(" ")).toContain("sellerName, city");
  });

  it("readiness identifies a missing active EGS unit", async () => {
    const prisma = makeReadinessPrisma({ activeEgs: null });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getZatcaReadinessSummary("org-1");

    expect(readiness.egsReady).toBe(false);
    expect(readiness.blockingReasons).toContain("No active development EGS unit is configured.");
  });

  it("returns a hash-chain reset dry-run plan without mutating EGS or metadata", async () => {
    const prisma = {
      zatcaEgsUnit: {
        findMany: jest.fn().mockResolvedValue([
          makeEgsUnit({ id: "egs-1", name: "Active EGS", status: ZatcaRegistrationStatus.ACTIVE, isActive: true, lastIcv: 8, lastInvoiceHash: "local-last-hash" }),
        ]),
        update: jest.fn(),
      },
      zatcaInvoiceMetadata: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "metadata-1",
            invoiceId: "invoice-1",
            invoiceUuid: "00000000-0000-0000-0000-000000000001",
            zatcaStatus: ZatcaInvoiceStatus.XML_GENERATED,
            icv: 8,
            previousInvoiceHash: "previous-hash",
            invoiceHash: "local-last-hash",
            xmlHash: "local-last-hash",
            egsUnitId: "egs-1",
            generatedAt: new Date("2026-05-16T10:00:00.000Z"),
            invoice: { invoiceNumber: "INV-000008", status: "FINALIZED" },
          },
        ]),
        update: jest.fn(),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const plan = await service.getHashChainResetPlan("org-1");

    expect(plan).toMatchObject({
      dryRunOnly: true,
      hashMode: { mode: "LOCAL_DETERMINISTIC", envValue: "local" },
      summary: {
        activeEgsUnitCount: 1,
        invoicesWithMetadataCount: 1,
        currentIcv: 8,
        currentLastInvoiceHash: "local-last-hash",
      },
    });
    expect(plan.egsUnits[0]).toMatchObject({ id: "egs-1", name: "Active EGS", lastIcv: 8, lastInvoiceHash: "local-last-hash" });
    expect(plan.invoicesWithMetadata[0]).toMatchObject({ invoiceId: "invoice-1", invoiceNumber: "INV-000008", invoiceHash: "local-last-hash" });
    expect(plan.resetRisks.join(" ")).toContain("Do not reset");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
  });
});

function makeGenerationTransactionMock(options: {
  invoiceStatus?: "DRAFT" | "FINALIZED";
  sellerName?: string | null;
  vatNumber?: string | null;
  activeEgsLastIcv?: number;
  activeEgsLastInvoiceHash?: string | null;
  activeEgs?: null;
  existingMetadata?: ReturnType<typeof makeGeneratedMetadata>;
} = {}) {
  const activeEgs =
    options.activeEgs === null
      ? null
      : {
          id: "egs-1",
          lastIcv: options.activeEgsLastIcv ?? 0,
          lastInvoiceHash: options.activeEgsLastInvoiceHash ?? null,
        };

  return {
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue({
        id: "invoice-1",
        organizationId: "org-1",
        invoiceNumber: "INV-000001",
        status: options.invoiceStatus ?? "FINALIZED",
        issueDate: new Date("2026-05-07T10:00:00.000Z"),
        currency: "SAR",
        subtotal: "100.0000",
        discountTotal: "0.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
        total: "115.0000",
        organization: { id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300000000000003", countryCode: "SA" },
        customer: {
          id: "customer-1",
          name: "Customer",
          displayName: "Customer",
          taxNumber: null,
          addressLine1: null,
          addressLine2: null,
          city: "Riyadh",
          postalCode: "12345",
          countryCode: "SA",
        },
        lines: [
          {
            id: "line-1",
            description: "Service",
            quantity: "1.0000",
            unitPrice: "100.0000",
            taxableAmount: "100.0000",
            taxAmount: "15.0000",
            lineTotal: "115.0000",
            taxRate: { name: "VAT on Sales 15%" },
          },
        ],
      }),
    },
    zatcaOrganizationProfile: {
      findUnique: jest.fn().mockResolvedValue({
        sellerName: options.sellerName === undefined ? "Org Legal" : options.sellerName,
        vatNumber: options.vatNumber === undefined ? "300000000000003" : options.vatNumber,
        companyIdType: null,
        companyIdNumber: null,
        buildingNumber: "1234",
        streetName: "King Fahd Road",
        district: "Olaya",
        city: "Riyadh",
        postalCode: "12345",
        countryCode: "SA",
        additionalAddressNumber: null,
      }),
    },
    zatcaInvoiceMetadata: {
      upsert: jest.fn().mockResolvedValue(
        options.existingMetadata ?? {
          id: "metadata-1",
          invoiceUuid: "00000000-0000-0000-0000-000000000001",
          icv: null,
          xmlBase64: null,
          qrCodeBase64: null,
          invoiceHash: null,
          generatedAt: null,
        },
      ),
      findUniqueOrThrow: jest.fn().mockResolvedValue(options.existingMetadata ?? makeGeneratedMetadata()),
      update: jest.fn(({ data }) =>
        Promise.resolve({
          id: "metadata-1",
          invoiceUuid: "00000000-0000-0000-0000-000000000001",
          ...data,
        }),
      ),
    },
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(activeEgs),
      update: jest.fn().mockResolvedValue({ id: "egs-1" }),
    },
    zatcaSubmissionLog: {
      create: jest.fn().mockResolvedValue({ id: "log-1" }),
    },
  };
}

function makeEgsUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: "egs-1",
    organizationId: "org-1",
    profileId: "profile-1",
    name: "Dev EGS",
    environment: "SANDBOX",
    status: ZatcaRegistrationStatus.DRAFT,
    deviceSerialNumber: "DEV-001",
    solutionName: "LedgerByte",
    csrPem: null,
    complianceCsidPem: null,
    productionCsidPem: null,
    certificateRequestId: null,
    lastInvoiceHash: null,
    lastIcv: 0,
    isActive: false,
    createdAt: new Date("2026-05-07T00:00:00.000Z"),
    updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    ...overrides,
  };
}

function makeReadinessPrisma(options: {
  profile?: Record<string, unknown>;
  activeEgs?: Record<string, unknown> | null;
  localXmlCount?: number;
} = {}) {
  return {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300000000000003", countryCode: "SA" }),
    },
    zatcaOrganizationProfile: {
      upsert: jest.fn().mockResolvedValue({
        id: "profile-1",
        organizationId: "org-1",
        sellerName: "Org Legal",
        vatNumber: "300000000000003",
        city: "Riyadh",
        countryCode: "SA",
        ...options.profile,
      }),
    },
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(
        options.activeEgs === undefined
          ? {
              id: "egs-1",
              name: "Dev EGS",
              status: ZatcaRegistrationStatus.ACTIVE,
              isActive: true,
              csrPem: null,
              complianceCsidPem: null,
              lastIcv: 0,
              lastInvoiceHash: null,
            }
          : options.activeEgs,
      ),
    },
    zatcaInvoiceMetadata: {
      count: jest.fn().mockResolvedValue(options.localXmlCount ?? 0),
    },
  };
}

function makeGeneratedMetadata(overrides: Record<string, unknown> = {}) {
  return {
    id: "metadata-1",
    organizationId: "org-1",
    invoiceId: "invoice-1",
    zatcaInvoiceType: "STANDARD_TAX_INVOICE",
    zatcaStatus: ZatcaInvoiceStatus.XML_GENERATED,
    invoiceUuid: "00000000-0000-0000-0000-000000000001",
    icv: 1,
    previousInvoiceHash: "previous-hash",
    invoiceHash: "invoice-hash",
    qrCodeBase64: "qr-base64",
    xmlBase64: Buffer.from("<Invoice />", "utf8").toString("base64"),
    xmlHash: "invoice-hash",
    egsUnitId: "egs-1",
    generatedAt: new Date("2026-05-07T00:00:00.000Z"),
    clearedAt: null,
    reportedAt: null,
    rejectedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    createdAt: new Date("2026-05-07T00:00:00.000Z"),
    updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    ...overrides,
  };
}

function makeValidationInvoice() {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-000001",
    status: "FINALIZED",
    issueDate: new Date("2026-05-07T10:00:00.000Z"),
    currency: "SAR",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    organization: { id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300000000000003", countryCode: "SA" },
    customer: {
      id: "customer-1",
      name: "Customer",
      displayName: "Customer",
      taxNumber: null,
      addressLine1: null,
      addressLine2: null,
      city: "Riyadh",
      postalCode: "12345",
      countryCode: "SA",
    },
    lines: [
      {
        id: "line-1",
        description: "Service",
        quantity: "1.0000",
        unitPrice: "100.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        taxRate: { name: "VAT on Sales 15%" },
      },
    ],
  };
}

function makeValidationProfile() {
  return {
    sellerName: "Org Legal",
    vatNumber: "300000000000003",
    companyIdType: null,
    companyIdNumber: null,
    buildingNumber: "1234",
    streetName: "King Fahd Road",
    district: "Olaya",
    city: "Riyadh",
    postalCode: "12345",
    countryCode: "SA",
    additionalAddressNumber: null,
  };
}

function makeAdapterConfig(overrides: Partial<ZatcaAdapterConfig> = {}): ZatcaAdapterConfig {
  return {
    mode: "mock",
    enableRealNetwork: false,
    ...overrides,
  };
}
