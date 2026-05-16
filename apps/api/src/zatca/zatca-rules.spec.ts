import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ZatcaInvoiceStatus, ZatcaInvoiceType, ZatcaRegistrationStatus, ZatcaSubmissionStatus, ZatcaSubmissionType } from "@prisma/client";
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

  it("captures non-secret CSR onboarding fields for non-production EGS units only", async () => {
    const existing = { ...makeEgsUnit({ environment: "SANDBOX", lastIcv: 7, lastInvoiceHash: "previous-hash" }), privateKeyPem: "PRIVATE-KEY-SECRET" };
    const updated = makeEgsUnit({
      environment: "SANDBOX",
      lastIcv: 7,
      lastInvoiceHash: "previous-hash",
      csrCommonName: "TST-886431145-399999999900003",
      csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
      csrOrganizationUnitName: "Riyadh Branch",
      csrInvoiceType: "1100",
      csrLocationAddress: "RRRD2929",
    });
    const prisma = {
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);

    const result = await service.updateEgsUnitCsrFields("org-1", "user-1", "egs-1", {
      csrCommonName: " TST-886431145-399999999900003 ",
      csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
      csrOrganizationUnitName: "Riyadh Branch",
      csrInvoiceType: "1100",
      csrLocationAddress: "RRRD2929",
    });

    const updateData = prisma.zatcaEgsUnit.update.mock.calls[0][0].data;
    expect(updateData).toEqual({
      csrCommonName: "TST-886431145-399999999900003",
      csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
      csrOrganizationUnitName: "Riyadh Branch",
      csrInvoiceType: "1100",
      csrLocationAddress: "RRRD2929",
    });
    expect(updateData).not.toHaveProperty("lastIcv");
    expect(updateData).not.toHaveProperty("lastInvoiceHash");
    expect(updateData).not.toHaveProperty("privateKeyPem");
    expect(updateData).not.toHaveProperty("csrPem");
    expect(result).toMatchObject({
      csrCommonName: "TST-886431145-399999999900003",
      csrInvoiceType: "1100",
      csrLocationAddress: "RRRD2929",
      lastIcv: 7,
      lastInvoiceHash: "previous-hash",
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE-KEY-SECRET");
    expect(JSON.stringify(auditLogService.log.mock.calls)).not.toContain("PRIVATE-KEY-SECRET");
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entityType: "ZatcaEgsUnitCsrFields",
        entityId: "egs-1",
      }),
    );
  });

  it("rejects CSR field capture for production EGS units", async () => {
    const prisma = {
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit({ environment: "PRODUCTION" }), privateKeyPem: null }),
        update: jest.fn(),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(
      service.updateEgsUnitCsrFields("org-1", "user-1", "egs-1", {
        csrCommonName: "TST-886431145-399999999900003",
        csrInvoiceType: "1100",
      }),
    ).rejects.toThrow("non-production EGS units");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
  });

  it("rejects unsafe CSR field content and unmodeled invoice type values", async () => {
    const prisma = {
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit({ environment: "SANDBOX" }), privateKeyPem: null }),
        update: jest.fn(),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(
      service.updateEgsUnitCsrFields("org-1", "user-1", "egs-1", {
        csrCommonName: "TST\ncsr.invoice.type=1100",
      }),
    ).rejects.toThrow("cannot contain");
    await expect(
      service.updateEgsUnitCsrFields("org-1", "user-1", "egs-1", {
        csrInvoiceType: "0100",
      }),
    ).rejects.toThrow("1100");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
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
    const tx = makeGenerationTransactionMock({
      activeEgsLastIcv: 4,
      activeEgsLastInvoiceHash: "previous-hash",
      customerAddressLine1: "King Abdullah Road",
      customerAddressLine2: "Unit 12",
      customerBuildingNumber: "1111",
      customerDistrict: "Al Murooj",
    });
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
    expect(generatedXml).toContain("<cbc:StreetName>King Abdullah Road</cbc:StreetName>");
    expect(generatedXml).toContain("<cbc:AdditionalStreetName>Unit 12</cbc:AdditionalStreetName>");
    expect(generatedXml).toContain("<cbc:BuildingNumber>1111</cbc:BuildingNumber>");
    expect(generatedXml).toContain("<cbc:CitySubdivisionName>Al Murooj</cbc:CitySubdivisionName>");
    expect(generatedXml.indexOf("<cbc:AdditionalStreetName>Unit 12</cbc:AdditionalStreetName>")).toBeLessThan(generatedXml.indexOf("<cbc:BuildingNumber>1111</cbc:BuildingNumber>"));
    expect(generatedXml.indexOf("<cbc:BuildingNumber>1111</cbc:BuildingNumber>")).toBeLessThan(generatedXml.indexOf("<cbc:CitySubdivisionName>Al Murooj</cbc:CitySubdivisionName>"));
    expect(tx.zatcaEgsUnit.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastIcv: 5, lastInvoiceHash: expect.any(String) }) }));
    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestUrl: "local-generation-only" }) }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "GENERATE", entityType: "ZatcaInvoiceMetadata" }));
  });

  it("persists SDK-generated hashes for SDK hash-mode EGS units without changing signing or submission behavior", async () => {
    const tx = makeGenerationTransactionMock({
      activeEgsHashMode: "SDK_GENERATED",
      activeEgsLastIcv: 0,
      activeEgsLastInvoiceHash: initialPreviousInvoiceHash,
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const sdk = makeSdkServiceMock({ sdkHash: "sdk-generated-hash" });
    const service = new (ZatcaService as never as new (...args: unknown[]) => ZatcaService)(prisma, { log: jest.fn() }, undefined, undefined, sdk);

    const result = await service.generateInvoiceCompliance("org-1", "user-1", "invoice-1");

    expect(sdk.generateOfficialZatcaHash).toHaveBeenCalledWith(expect.stringContaining("<Invoice"), expect.objectContaining({ appHash: expect.any(String) }));
    expect(result).toMatchObject({
      icv: 1,
      previousInvoiceHash: initialPreviousInvoiceHash,
      invoiceHash: "sdk-generated-hash",
      xmlHash: "sdk-generated-hash",
      hashModeSnapshot: "SDK_GENERATED",
    });
    expect(tx.zatcaInvoiceMetadata.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceHash: "sdk-generated-hash",
          xmlHash: "sdk-generated-hash",
          hashModeSnapshot: "SDK_GENERATED",
        }),
      }),
    );
    expect(tx.zatcaEgsUnit.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastIcv: 1, lastInvoiceHash: "sdk-generated-hash" }) }));
    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestUrl: "local-generation-only" }) }));
  });

  it("uses the previous SDK hash as PIH for the next SDK hash-mode invoice", async () => {
    const tx = makeGenerationTransactionMock({
      activeEgsHashMode: "SDK_GENERATED",
      activeEgsLastIcv: 5,
      activeEgsLastInvoiceHash: "previous-sdk-hash",
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const sdk = makeSdkServiceMock({ sdkHash: "next-sdk-hash" });
    const service = new (ZatcaService as never as new (...args: unknown[]) => ZatcaService)(prisma, { log: jest.fn() }, undefined, undefined, sdk);

    await service.generateInvoiceCompliance("org-1", "user-1", "invoice-1");

    expect(tx.zatcaInvoiceMetadata.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          icv: 6,
          previousInvoiceHash: "previous-sdk-hash",
          invoiceHash: "next-sdk-hash",
          hashModeSnapshot: "SDK_GENERATED",
        }),
      }),
    );
  });

  it("does not partially mutate invoice metadata or EGS state when SDK hash generation fails", async () => {
    const tx = makeGenerationTransactionMock({ activeEgsHashMode: "SDK_GENERATED" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const sdk = makeSdkServiceMock({ sdkHash: null, blockingReasons: ["SDK hash generation is blocked."] });
    const service = new (ZatcaService as never as new (...args: unknown[]) => ZatcaService)(prisma, { log: jest.fn() }, undefined, undefined, sdk);

    await expect(service.generateInvoiceCompliance("org-1", "user-1", "invoice-1")).rejects.toThrow("SDK hash generation");

    expect(tx.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(tx.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(tx.zatcaSubmissionLog.create).not.toHaveBeenCalled();
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

  it("blocks SDK hash mode enablement when SDK execution is not ready", async () => {
    const prisma = makeSdkHashEnablePrisma({ egsUnit: makeEgsUnit({ status: ZatcaRegistrationStatus.ACTIVE, isActive: true }) });
    const sdk = makeSdkServiceMock({ readiness: { enabled: false, canRunLocalValidation: false, blockingReasons: ["ZATCA SDK local execution is disabled."] } });
    const service = new (ZatcaService as never as new (...args: unknown[]) => ZatcaService)(prisma, { log: jest.fn() }, undefined, undefined, sdk);

    await expect(
      (service as unknown as { enableSdkHashMode: (organizationId: string, actorUserId: string, id: string, dto: { reason: string; confirmReset: boolean }) => Promise<unknown> })
        .enableSdkHashMode("org-1", "user-1", "egs-1", { reason: "Testing SDK generated hashes locally", confirmReset: true }),
    ).rejects.toThrow("ZATCA SDK local execution is not ready");

    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
  });

  it("blocks SDK hash mode enablement when the EGS already has invoice metadata", async () => {
    const prisma = makeSdkHashEnablePrisma({
      egsUnit: makeEgsUnit({ status: ZatcaRegistrationStatus.ACTIVE, isActive: true }),
      metadataCount: 2,
    });
    const sdk = makeSdkServiceMock();
    const service = new (ZatcaService as never as new (...args: unknown[]) => ZatcaService)(prisma, { log: jest.fn() }, undefined, undefined, sdk);

    await expect(
      (service as unknown as { enableSdkHashMode: (organizationId: string, actorUserId: string, id: string, dto: { reason: string; confirmReset: boolean }) => Promise<unknown> })
        .enableSdkHashMode("org-1", "user-1", "egs-1", { reason: "Testing SDK generated hashes locally", confirmReset: true }),
    ).rejects.toThrow("Create a new EGS unit");

    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
  });

  it("enables SDK hash mode only on a fresh EGS unit and writes an audit log", async () => {
    const egsUnit = makeEgsUnit({ status: ZatcaRegistrationStatus.ACTIVE, isActive: true, lastIcv: 4, lastInvoiceHash: "local-hash" });
    const prisma = makeSdkHashEnablePrisma({ egsUnit, metadataCount: 0 });
    const audit = { log: jest.fn() };
    const sdk = makeSdkServiceMock();
    const service = new (ZatcaService as never as new (...args: unknown[]) => ZatcaService)(prisma, audit, undefined, undefined, sdk);

    const result = await (
      service as unknown as { enableSdkHashMode: (organizationId: string, actorUserId: string, id: string, dto: { reason: string; confirmReset: boolean }) => Promise<unknown> }
    ).enableSdkHashMode("org-1", "user-1", "egs-1", { reason: "Testing SDK generated hashes locally", confirmReset: true });

    expect(result).toMatchObject({ id: "egs-1", hashMode: "SDK_GENERATED", lastIcv: 0, lastInvoiceHash: initialPreviousInvoiceHash });
    expect(prisma.zatcaEgsUnit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hashMode: "SDK_GENERATED",
          hashModeEnabledById: "user-1",
          hashModeResetReason: "Testing SDK generated hashes locally",
          lastIcv: 0,
          lastInvoiceHash: initialPreviousInvoiceHash,
          hashModeEnabledAt: expect.any(Date),
          sdkHashChainStartedAt: expect.any(Date),
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ZATCA_SDK_HASH_MODE_ENABLED",
        entityType: "ZatcaEgsUnit",
        entityId: "egs-1",
        after: expect.objectContaining({ hashMode: "SDK_GENERATED" }),
      }),
    );
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

  it("settings readiness reports official seller invoice XML address checks", async () => {
    const prisma = makeReadinessPrisma({
      profile: {
        sellerName: "Org Legal",
        vatNumber: "300000000000003",
        streetName: null,
        buildingNumber: null,
        district: "Olaya",
        city: null,
        postalCode: null,
        countryCode: "SA",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getZatcaReadinessSummary("org-1");

    expect(readiness.productionCompliance).toBe(false);
    expect(readiness.sellerProfile.status).toBe("BLOCKED");
    expect(readiness.sellerProfile.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ZATCA_SELLER_STREET_MISSING", sourceRule: "BR-KSA-09", field: "seller.streetName" }),
        expect.objectContaining({ code: "ZATCA_SELLER_BUILDING_NUMBER_MISSING", sourceRule: "BR-KSA-09", field: "seller.buildingNumber" }),
        expect.objectContaining({ code: "ZATCA_SELLER_CITY_MISSING", sourceRule: "BR-KSA-09", field: "seller.city" }),
        expect.objectContaining({ code: "ZATCA_SELLER_POSTAL_CODE_MISSING", sourceRule: "BR-KSA-09", field: "seller.postalCode" }),
      ]),
    );
  });

  it("settings readiness exposes signing and Phase 2 QR production blockers without blocking local XML status", async () => {
    const prisma = makeReadinessPrisma({ localXmlCount: 1 });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getZatcaReadinessSummary("org-1");

    expect(readiness.localXmlReady).toBe(true);
    expect(readiness.productionCompliance).toBe(false);
    expect(readiness.signing.status).toBe("BLOCKED");
    expect(readiness.phase2Qr.status).toBe("BLOCKED");
    expect(readiness.pdfA3.status).toBe("BLOCKED");
    expect(readiness.signing.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ZATCA_SIGNING_NOT_IMPLEMENTED", severity: "ERROR", sourceRule: "KSA-15" }),
        expect.objectContaining({ code: "ZATCA_SIGNING_CERTIFICATE_NOT_CONFIGURED", severity: "ERROR", sourceRule: "SDK_README_SIGN" }),
        expect.objectContaining({ code: "ZATCA_PRIVATE_KEY_CUSTODY_NOT_CONFIGURED", severity: "ERROR", sourceRule: "SECURITY_FEATURES_XADES" }),
      ]),
    );
    expect(readiness.phase2Qr.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ZATCA_PHASE_2_QR_NOT_IMPLEMENTED", severity: "ERROR", sourceRule: "KSA-14" }),
        expect.objectContaining({ code: "ZATCA_PHASE_2_QR_SIGNATURE_DEPENDENCY", severity: "ERROR", sourceRule: "SECURITY_FEATURES_QR_TAGS_6_9" }),
      ]),
    );
  });

  it("invoice readiness passes Saudi standard buyer required address fields", async () => {
    const prisma = makeInvoiceReadinessPrisma({
      customer: {
        taxNumber: "399999999900003",
        addressLine1: "Salah Al-Din",
        buildingNumber: "1111",
        district: "Al Murooj",
        city: "Riyadh",
        postalCode: "12222",
        countryCode: "SA",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getInvoiceZatcaReadiness("org-1", "invoice-1");

    expect(readiness.localOnly).toBe(true);
    expect(readiness.productionCompliance).toBe(false);
    expect(readiness.buyerContact.status).toBe("READY");
    expect(readiness.buyerContact.checks).toContainEqual(expect.objectContaining({ code: "ZATCA_BUYER_STANDARD_SA_ADDRESS_READY", severity: "INFO", sourceRule: "BR-KSA-63" }));
  });

  it("invoice readiness includes signing and Phase 2 QR blockers while generated XML stays ready", async () => {
    const prisma = makeInvoiceReadinessPrisma();
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getInvoiceZatcaReadiness("org-1", "invoice-1");

    expect(readiness.productionCompliance).toBe(false);
    expect(readiness.xml.status).toBe("READY");
    expect(readiness.signing.status).toBe("BLOCKED");
    expect(readiness.phase2Qr.status).toBe("BLOCKED");
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ZATCA_SIGNING_NOT_IMPLEMENTED", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_PHASE_2_QR_NOT_IMPLEMENTED", severity: "ERROR" }),
      ]),
    );
  });

  it("invoice readiness blocks Saudi standard buyer missing building number", async () => {
    const prisma = makeInvoiceReadinessPrisma({
      customer: {
        addressLine1: "Salah Al-Din",
        buildingNumber: null,
        district: "Al Murooj",
        city: "Riyadh",
        postalCode: "12222",
        countryCode: "SA",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getInvoiceZatcaReadiness("org-1", "invoice-1");

    expect(readiness.status).toBe("BLOCKED");
    expect(readiness.buyerContact.checks).toContainEqual(
      expect.objectContaining({
        code: "ZATCA_BUYER_BUILDING_NUMBER_MISSING",
        severity: "ERROR",
        field: "buyer.buildingNumber",
        sourceRule: "BR-KSA-63",
      }),
    );
  });

  it("invoice readiness does not block simplified buyer postal address", async () => {
    const prisma = makeInvoiceReadinessPrisma({
      zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      customer: {
        addressLine1: null,
        buildingNumber: null,
        district: null,
        city: null,
        postalCode: null,
        countryCode: "SA",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getInvoiceZatcaReadiness("org-1", "invoice-1");

    expect(readiness.buyerContact.status).not.toBe("BLOCKED");
    expect(readiness.buyerContact.checks).toContainEqual(expect.objectContaining({ code: "ZATCA_BUYER_SIMPLIFIED_ADDRESS_OPTIONAL", severity: "INFO" }));
  });

  it("invoice readiness is read-only for metadata and EGS state", async () => {
    const prisma = makeInvoiceReadinessPrisma();
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getInvoiceZatcaReadiness("org-1", "invoice-1");

    expect(readiness.noMutation).toBe(true);
    expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
  });

  it("returns an SDK signing plan as dry-run/no-mutation and does not expose private key content", async () => {
    const prisma = makeInvoiceReadinessPrisma({
      activeEgs: {
        id: "egs-1",
        name: "Dev EGS",
        status: ZatcaRegistrationStatus.ACTIVE,
        isActive: true,
        lastIcv: 2,
        lastInvoiceHash: "last-hash",
        hashMode: "SDK_GENERATED",
        complianceCsidPem: null,
        productionCsidPem: null,
        privateKeyPem: "-----BEGIN EC PRIVATE KEY-----\nSUPER-SECRET-PRIVATE-KEY\n-----END EC PRIVATE KEY-----",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const plan = await service.getInvoiceZatcaSigningPlan("org-1", "invoice-1");

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      productionCompliance: false,
      executionEnabled: false,
      sdkCommand: "fatoora -sign -invoice <filename> -signedInvoice <filename>",
    });
    expect(plan.commandPlan.displayCommand).toContain("-sign");
    expect(plan.commandPlan.displayCommand).toContain("-signedInvoice");
    expect(plan.blockers).toEqual(expect.arrayContaining([expect.stringContaining("ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false")]));
    expect(plan.requiredInputs).toEqual(expect.arrayContaining([expect.objectContaining({ id: "certificate" }), expect.objectContaining({ id: "privateKeyCustody" })]));
    expect(JSON.stringify(plan)).not.toContain("SUPER-SECRET-PRIVATE-KEY");
    expect(JSON.stringify(plan)).not.toContain("BEGIN EC PRIVATE KEY");
    expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
  });

  it("settings readiness reports CSR and key-custody blockers without exposing private key content", async () => {
    const prisma = makeReadinessPrisma({
      activeEgs: {
        id: "egs-1",
        name: "Dev EGS",
        status: ZatcaRegistrationStatus.ACTIVE,
        isActive: true,
        csrPem: null,
        complianceCsidPem: null,
        productionCsidPem: null,
        certificateRequestId: null,
        privateKeyPem: "-----BEGIN EC PRIVATE KEY-----\nSUPER-SECRET-PRIVATE-KEY\n-----END EC PRIVATE KEY-----",
        lastIcv: 0,
        lastInvoiceHash: null,
        hashMode: "LOCAL_DETERMINISTIC",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const readiness = await service.getZatcaReadinessSummary("org-1");

    expect(readiness.productionCompliance).toBe(false);
    expect(readiness.keyCustody.status).toBe("BLOCKED");
    expect(readiness.csr.status).toBe("BLOCKED");
    expect(readiness.keyCustody.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ZATCA_PRIVATE_KEY_STORED_IN_DATABASE", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_CERTIFICATE_EXPIRY_UNKNOWN", severity: "WARNING" }),
        expect.objectContaining({ code: "ZATCA_RENEWAL_WORKFLOW_MISSING", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_KMS_HSM_NOT_CONFIGURED", severity: "ERROR" }),
      ]),
    );
    expect(readiness.csr.checks).toEqual(expect.arrayContaining([expect.objectContaining({ code: "ZATCA_CSR_REQUIRED_FIELDS_MISSING", severity: "ERROR" })]));
    expect(JSON.stringify(readiness)).not.toContain("SUPER-SECRET-PRIVATE-KEY");
    expect(JSON.stringify(readiness)).not.toContain("BEGIN EC PRIVATE KEY");
  });

  it("returns a CSR plan as local-only dry-run/no-mutation without exposing secrets or calling onboarding adapters", async () => {
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300000000000003", countryCode: "SA" }),
      },
      zatcaOrganizationProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: "profile-1",
          organizationId: "org-1",
          sellerName: "Org Legal",
          vatNumber: "300000000000003",
          countryCode: "SA",
          businessCategory: "Supply activities",
        }),
        upsert: jest.fn().mockResolvedValue({
          id: "profile-1",
          organizationId: "org-1",
          sellerName: "Org Legal",
          vatNumber: "300000000000003",
          countryCode: "SA",
          businessCategory: "Supply activities",
        }),
      },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          ...makeEgsUnit({
            id: "egs-1",
            name: "Dev EGS",
            status: ZatcaRegistrationStatus.ACTIVE,
            isActive: true,
            deviceSerialNumber: "EGS-UNIT-001",
            certificateRequestId: "REQ-123",
            csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR-CONTENT\n-----END CERTIFICATE REQUEST-----",
            complianceCsidPem: "COMPLIANCE-CERT-SECRET",
            productionCsidPem: "PRODUCTION-CERT-SECRET",
          }),
          privateKeyPem: "-----BEGIN EC PRIVATE KEY-----\nSUPER-SECRET-PRIVATE-KEY\n-----END EC PRIVATE KEY-----",
        }),
        update: jest.fn(),
      },
      zatcaSubmissionLog: {
        create: jest.fn(),
      },
    };
    const auditLogService = { log: jest.fn() };
    const onboardingAdapter = {
      requestComplianceCsid: jest.fn(),
      requestProductionCsid: jest.fn(),
    };
    const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never);

    const plan = await service.getEgsUnitCsrPlan("org-1", "egs-1");

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      productionCompliance: false,
      noCsidRequest: true,
      sdkCommand: "fatoora -csr -csrConfig <filename> -privateKey <filename> -generatedCsr <filename> -pem",
    });
    expect(plan.requiredFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sdkConfigKey: "csr.organization.identifier", currentValue: "300000000000003", status: "AVAILABLE" }),
        expect.objectContaining({ sdkConfigKey: "csr.serial.number", currentValue: "EGS-UNIT-001", status: "NEEDS_REVIEW" }),
        expect.objectContaining({ sdkConfigKey: "csr.invoice.type", status: "MISSING" }),
        expect.objectContaining({ sdkConfigKey: "csr.location.address", status: "MISSING" }),
      ]),
    );
    expect(plan.blockers).toEqual(expect.arrayContaining([expect.stringContaining("CSID requests are intentionally disabled")]));
    expect(JSON.stringify(plan)).not.toContain("SUPER-SECRET-PRIVATE-KEY");
    expect(JSON.stringify(plan)).not.toContain("COMPLIANCE-CERT-SECRET");
    expect(JSON.stringify(plan)).not.toContain("PRODUCTION-CERT-SECRET");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
  });


  it("returns a CSR dry-run plan without exposing secrets or mutating EGS", async () => {
    const previousFlag = process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED;
    delete process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED;
    const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
    const auditLogService = { log: jest.fn() };
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "Org",
          legalName: "Org Legal",
          taxNumber: "300000000000003",
          countryCode: "SA",
        }),
      },
      zatcaOrganizationProfile: {
        findFirst: jest.fn().mockResolvedValue({
          sellerName: "Org Legal",
          vatNumber: "300000000000003",
          countryCode: "SA",
          businessCategory: "Services",
        }),
      },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          ...makeEgsUnit({
            environment: "SANDBOX",
            csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR-SECRET\n-----END CERTIFICATE REQUEST-----",
            complianceCsidPem: "COMPLIANCE-CERT-SECRET",
            productionCsidPem: "PRODUCTION-CERT-SECRET",
          }),
          privateKeyPem: "-----BEGIN PRIVATE KEY-----\nSUPER-SECRET-PRIVATE-KEY\n-----END PRIVATE KEY-----",
        }),
        update: jest.fn(),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never);

    try {
      const result = await service.getEgsUnitCsrDryRun("org-1", "egs-1", { prepareFiles: true });

      expect(result).toMatchObject({
        localOnly: true,
        dryRun: true,
        noMutation: true,
        noCsidRequest: true,
        noNetwork: true,
        productionCompliance: false,
        executionEnabled: false,
        executionSkipped: true,
        prepareFilesRequested: true,
      });
      expect(result.sdkCommand).toContain("-csr");
      expect(result.commandPlan.displayCommand).toContain("-csr");
      expect(result.preparedFiles.csrConfigWritten).toBe(false);
      expect(result.preparedFiles.privateKeyWritten).toBe(false);
      expect(result.preparedFiles.generatedCsrWritten).toBe(false);
      expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("csr.invoice.type"), expect.stringContaining("csr.location.address")]));
      expect(JSON.stringify(result)).not.toContain("SUPER-SECRET-PRIVATE-KEY");
      expect(JSON.stringify(result)).not.toContain("COMPLIANCE-CERT-SECRET");
      expect(JSON.stringify(result)).not.toContain("PRODUCTION-CERT-SECRET");
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
      expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
      expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("uses captured CSR fields to clear missing dry-run config blockers without CSID, network, or SDK execution", async () => {
    const previousFlag = process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED;
    process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = "false";
    const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
    const auditLogService = { log: jest.fn() };
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "Org",
          legalName: "Org Legal",
          taxNumber: "300000000000003",
          countryCode: "SA",
        }),
      },
      zatcaOrganizationProfile: {
        findFirst: jest.fn().mockResolvedValue({
          sellerName: "Org Legal",
          vatNumber: "300000000000003",
          countryCode: "SA",
          businessCategory: "Services",
        }),
      },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          ...makeEgsUnit({
            environment: "SANDBOX",
            csrCommonName: "TST-886431145-399999999900003",
            csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
            csrOrganizationUnitName: "Riyadh Branch",
            csrInvoiceType: "1100",
            csrLocationAddress: "RRRD2929",
          }),
          privateKeyPem: null,
        }),
        update: jest.fn(),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never);

    try {
      const result = await service.getEgsUnitCsrDryRun("org-1", "egs-1", { prepareFiles: true });

      expect(result.missingValues).toEqual([]);
      expect(result.requiredFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ sdkConfigKey: "csr.common.name", currentValue: "TST-886431145-399999999900003", status: "AVAILABLE" }),
          expect.objectContaining({ sdkConfigKey: "csr.serial.number", currentValue: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f", status: "AVAILABLE" }),
          expect.objectContaining({ sdkConfigKey: "csr.organization.unit.name", currentValue: "Riyadh Branch", status: "AVAILABLE" }),
          expect.objectContaining({ sdkConfigKey: "csr.invoice.type", currentValue: "1100", status: "AVAILABLE" }),
          expect.objectContaining({ sdkConfigKey: "csr.location.address", currentValue: "RRRD2929", status: "AVAILABLE" }),
        ]),
      );
      expect(result.blockers).not.toEqual(expect.arrayContaining([expect.stringContaining("required official CSR fields")]));
      expect(result.noNetwork).toBe(true);
      expect(result.noCsidRequest).toBe(true);
      expect(result.executionEnabled).toBe(false);
      expect(result.executionSkipped).toBe(true);
      expect(result.productionCompliance).toBe(false);
      expect(result.preparedFiles.csrConfigWritten).toBe(true);
      expect(result.preparedFiles.privateKeyWritten).toBe(false);
      expect(result.preparedFiles.generatedCsrWritten).toBe(false);
      expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
      expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
      expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("returns a sanitized CSR config preview in official key order without secrets or mutation", async () => {
    const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
    const auditLogService = { log: jest.fn() };
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "Org",
          legalName: "Org Legal",
          taxNumber: "300000000000003",
          countryCode: "SA",
        }),
      },
      zatcaOrganizationProfile: {
        findFirst: jest.fn().mockResolvedValue({
          sellerName: "Org Legal",
          vatNumber: "300000000000003",
          countryCode: "SA",
          businessCategory: "Services",
        }),
      },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          ...makeEgsUnit({
            environment: "SANDBOX",
            lastIcv: 9,
            lastInvoiceHash: "last-hash",
            csrCommonName: "TST-886431145-399999999900003",
            csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
            csrOrganizationUnitName: "Riyadh Branch",
            csrInvoiceType: "1100",
            csrLocationAddress: "RRRD2929",
            csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR-SECRET\n-----END CERTIFICATE REQUEST-----",
            complianceCsidPem: "COMPLIANCE-CERT-SECRET",
            productionCsidPem: "PRODUCTION-CERT-SECRET",
          }),
          privateKeyPem: "-----BEGIN PRIVATE KEY-----\nSUPER-SECRET-PRIVATE-KEY\n-----END PRIVATE KEY-----",
        }),
        update: jest.fn(),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never);

    const result = await service.getEgsUnitCsrConfigPreview("org-1", "egs-1");

    expect(result).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      productionCompliance: false,
      canPrepareConfig: true,
    });
    expect(result.configEntries.map((entry) => entry.key)).toEqual([
      "csr.common.name",
      "csr.serial.number",
      "csr.organization.identifier",
      "csr.organization.unit.name",
      "csr.organization.name",
      "csr.country.name",
      "csr.invoice.type",
      "csr.location.address",
      "csr.industry.business.category",
    ]);
    expect(result.sanitizedConfigPreview).toContain("csr.common.name=TST-886431145-399999999900003");
    expect(result.sanitizedConfigPreview).toContain("csr.invoice.type=1100");
    expect(result.sanitizedConfigPreview).toContain("csr.location.address=RRRD2929");
    expect(result.missingFields).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("SUPER-SECRET-PRIVATE-KEY");
    expect(JSON.stringify(result)).not.toContain("COMPLIANCE-CERT-SECRET");
    expect(JSON.stringify(result)).not.toContain("PRODUCTION-CERT-SECRET");
    expect(JSON.stringify(result)).not.toContain("BEGIN CERTIFICATE REQUEST");
    expect(JSON.stringify(result)).not.toContain("OTP");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
  });

  it("shows missing CSR config preview values without inventing placeholders", async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: null, taxNumber: "300000000000003", countryCode: "SA" }) },
      zatcaOrganizationProfile: { findFirst: jest.fn().mockResolvedValue({ sellerName: "Org", vatNumber: "300000000000003", countryCode: "SA", businessCategory: null }) },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit({ environment: "SANDBOX", csrCommonName: null, csrInvoiceType: null, csrLocationAddress: null }), privateKeyPem: null }),
        update: jest.fn(),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const result = await service.getEgsUnitCsrConfigPreview("org-1", "egs-1");

    expect(result.canPrepareConfig).toBe(false);
    expect(result.sanitizedConfigPreview).toContain("csr.common.name=\n");
    expect(result.sanitizedConfigPreview).toContain("csr.invoice.type=\n");
    expect(result.sanitizedConfigPreview).toContain("csr.location.address=\n");
    expect(result.missingFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "csr.common.name", status: "MISSING" }),
        expect.objectContaining({ key: "csr.invoice.type", status: "MISSING" }),
        expect.objectContaining({ key: "csr.location.address", status: "MISSING" }),
      ]),
    );
    expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("csr.common.name"), expect.stringContaining("csr.invoice.type"), expect.stringContaining("csr.location.address")]));
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("rejects CSR config preview for production EGS units", async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300000000000003", countryCode: "SA" }) },
      zatcaOrganizationProfile: { findFirst: jest.fn().mockResolvedValue({ sellerName: "Org Legal", vatNumber: "300000000000003", countryCode: "SA", businessCategory: "Services" }) },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit({ environment: "PRODUCTION" }), privateKeyPem: "SECRET" }),
        update: jest.fn(),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(service.getEgsUnitCsrConfigPreview("org-1", "egs-1")).rejects.toThrow("non-production EGS units");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("blocks CSR dry-run file preparation for production EGS units", async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300000000000003", countryCode: "SA" }) },
      zatcaOrganizationProfile: { findFirst: jest.fn().mockResolvedValue({ sellerName: "Org Legal", vatNumber: "300000000000003", countryCode: "SA", businessCategory: "Services" }) },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({ ...makeEgsUnit({ environment: "PRODUCTION" }), privateKeyPem: null }),
        update: jest.fn(),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const result = await service.getEgsUnitCsrDryRun("org-1", "egs-1", { prepareFiles: true, keepTempFiles: true });

    expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("non-production EGS units")]));
    expect(result.preparedFiles.csrConfigWritten).toBe(false);
    expect(result.productionCompliance).toBe(false);
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
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
        groupBy: jest.fn().mockResolvedValue([{ egsUnitId: "egs-1", _count: { _all: 1 } }]),
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
    expect(plan.egsUnits[0]).toMatchObject({
      hashMode: "LOCAL_DETERMINISTIC",
      metadataCount: 1,
      canEnableSdkHashMode: false,
      enableSdkHashModeBlockers: expect.arrayContaining([expect.stringContaining("already has ZATCA invoice metadata")]),
    });
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
  activeEgsHashMode?: "LOCAL_DETERMINISTIC" | "SDK_GENERATED";
  activeEgs?: null;
  existingMetadata?: ReturnType<typeof makeGeneratedMetadata>;
  customerAddressLine1?: string | null;
  customerAddressLine2?: string | null;
  customerBuildingNumber?: string | null;
  customerDistrict?: string | null;
} = {}) {
  const activeEgs =
    options.activeEgs === null
      ? null
      : {
          id: "egs-1",
          lastIcv: options.activeEgsLastIcv ?? 0,
          lastInvoiceHash: options.activeEgsLastInvoiceHash ?? null,
          hashMode: options.activeEgsHashMode ?? "LOCAL_DETERMINISTIC",
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
          addressLine1: options.customerAddressLine1 ?? null,
          addressLine2: options.customerAddressLine2 ?? null,
          buildingNumber: options.customerBuildingNumber ?? null,
          district: options.customerDistrict ?? null,
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
          hashModeSnapshot: "LOCAL_DETERMINISTIC",
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
    csrCommonName: null,
    csrSerialNumber: null,
    csrOrganizationUnitName: null,
    csrInvoiceType: null,
    csrLocationAddress: null,
    csrPem: null,
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
    isActive: false,
    createdAt: new Date("2026-05-07T00:00:00.000Z"),
    updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    ...overrides,
  };
}

function makeSdkServiceMock(options: {
  sdkHash?: string | null;
  blockingReasons?: string[];
  readiness?: Record<string, unknown>;
} = {}) {
  return {
    getReadiness: jest.fn().mockReturnValue({
      enabled: true,
      canRunLocalValidation: true,
      blockingReasons: [],
      warnings: [],
      ...options.readiness,
    }),
    generateOfficialZatcaHash: jest.fn().mockResolvedValue({
      disabled: false,
      localOnly: true,
      noMutation: true,
      officialHashAttempted: true,
      sdkExitCode: options.sdkHash === null ? null : 0,
      sdkHash: options.sdkHash ?? "sdk-generated-hash",
      appHash: "local-app-hash",
      hashMatches: false,
      hashComparisonStatus: options.sdkHash === null ? "BLOCKED" : "MISMATCH",
      stdoutSummary: "",
      stderrSummary: "",
      blockingReasons: options.blockingReasons ?? [],
      warnings: [],
      hashMode: { mode: "LOCAL_DETERMINISTIC", envValue: "local", sdkModeRequested: false, blockingReasons: [], warnings: [] },
    }),
  };
}

function makeSdkHashEnablePrisma(options: { egsUnit: Record<string, unknown> | null; metadataCount?: number }) {
  const updated = options.egsUnit
    ? {
        ...options.egsUnit,
        hashMode: "SDK_GENERATED",
        lastIcv: 0,
        lastInvoiceHash: initialPreviousInvoiceHash,
        hashModeEnabledAt: new Date("2026-05-16T12:00:00.000Z"),
        hashModeEnabledById: "user-1",
        hashModeResetReason: "Testing SDK generated hashes locally",
        sdkHashChainStartedAt: new Date("2026-05-16T12:00:00.000Z"),
      }
    : null;
  return {
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(options.egsUnit),
      update: jest.fn().mockResolvedValue(updated),
    },
    zatcaInvoiceMetadata: {
      count: jest.fn().mockResolvedValue(options.metadataCount ?? 0),
    },
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

function makeInvoiceReadinessPrisma(options: {
  invoiceStatus?: "DRAFT" | "FINALIZED";
  zatcaInvoiceType?: ZatcaInvoiceType;
  profile?: Record<string, unknown>;
  customer?: Record<string, unknown>;
  activeEgs?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
} = {}) {
  const invoice = {
    ...makeValidationInvoice(),
    status: options.invoiceStatus ?? "FINALIZED",
    customer: {
      ...makeValidationInvoice().customer,
      taxNumber: "399999999900003",
      addressLine1: "Salah Al-Din",
      buildingNumber: "1111",
      district: "Al Murooj",
      city: "Riyadh",
      postalCode: "12222",
      countryCode: "SA",
      ...options.customer,
    },
  };
  const activeEgs =
    options.activeEgs === undefined
      ? {
          id: "egs-1",
          name: "Dev EGS",
          status: ZatcaRegistrationStatus.ACTIVE,
          isActive: true,
          lastIcv: 2,
          lastInvoiceHash: "last-hash",
          hashMode: "SDK_GENERATED",
        }
      : options.activeEgs;
  const metadata =
    options.metadata === undefined
      ? {
          id: "metadata-1",
          invoiceId: "invoice-1",
          zatcaInvoiceType: options.zatcaInvoiceType ?? ZatcaInvoiceType.STANDARD_TAX_INVOICE,
          xmlBase64: Buffer.from("<Invoice />", "utf8").toString("base64"),
          icv: 2,
          previousInvoiceHash: "previous-hash",
          invoiceHash: "invoice-hash",
          hashModeSnapshot: "SDK_GENERATED",
          egsUnitId: "egs-1",
          generatedAt: new Date("2026-05-16T00:00:00.000Z"),
        }
      : options.metadata;

  return {
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue(invoice),
    },
    zatcaOrganizationProfile: {
      findUnique: jest.fn().mockResolvedValue({
        ...makeValidationProfile(),
        ...options.profile,
      }),
    },
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(activeEgs),
      update: jest.fn(),
    },
    zatcaInvoiceMetadata: {
      findFirst: jest.fn().mockResolvedValue(metadata),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    zatcaSubmissionLog: {
      create: jest.fn(),
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
    hashModeSnapshot: "LOCAL_DETERMINISTIC",
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
      buildingNumber: null,
      district: null,
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
