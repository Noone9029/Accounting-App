import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  ZatcaCsrConfigReviewStatus,
  ZatcaInvoiceStatus,
  ZatcaInvoiceType,
  ZatcaRegistrationStatus,
  ZatcaSignedArtifactStorageControlEvidenceStatus,
  ZatcaSignedArtifactStorageControlEvidenceType,
  ZatcaSubmissionStatus,
  ZatcaSubmissionType,
} from "@prisma/client";
import { initialPreviousInvoiceHash } from "@ledgerbyte/zatca-core";
import * as ZatcaSdkPaths from "../zatca-sdk/zatca-sdk-paths";
import { SandboxDisabledZatcaOnboardingAdapter } from "./adapters/sandbox-disabled-zatca-onboarding.adapter";
import { ComplianceCsidRequestDryRunDto } from "./dto/compliance-csid-request-dry-run.dto";
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

  it("uses the stored simplified invoice type and emits ICV when generating XML", async () => {
    const tx = makeGenerationTransactionMock({
      activeEgsLastIcv: 1,
      zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      customerAddressLine1: "Olaya Street",
      customerAddressLine2: "Retail Counter",
      customerBuildingNumber: "2468",
      customerDistrict: "Al Olaya",
    });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await service.generateInvoiceCompliance("org-1", "user-1", "invoice-1");

    const generatedXml = Buffer.from(tx.zatcaInvoiceMetadata.update.mock.calls[0]![0].data.xmlBase64, "base64").toString("utf8");
    expect(generatedXml).toContain('<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>');
    expect(generatedXml).toContain("<cbc:ID>ICV</cbc:ID>");
    expect(generatedXml).toContain("<cbc:UUID>2</cbc:UUID>");
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

  it("blocks XML generation when no active EGS unit exists because ICV cannot be assigned", async () => {
    const tx = makeGenerationTransactionMock({ activeEgs: null });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(service.generateInvoiceCompliance("org-1", "user-1", "invoice-1")).rejects.toThrow("Active ZATCA EGS unit is required");

    expect(tx.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
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
    expect(readiness.environmentPolicyDocumented).toBe(true);
    expect(readiness.keyCustodyDecisionDocumented).toBe(true);
    expect(readiness.invoiceEligibilityDocumented).toBe(true);
    expect(readiness.auditEvidenceStandardDocumented).toBe(true);
    expect(readiness.sandboxOnboardingRunbookDocumented).toBe(true);
    expect(readiness.sdkValidationReadinessDocumented).toBe(true);
    expect(readiness.sdkValidationPipelineDocumented).toBe(true);
    expect(readiness.sdkValidationCommandAvailable).toBe(true);
    expect(readiness.sdkValidationEvidenceFormatDocumented).toBe(true);
    expect(readiness.officialFixtureRegistryDocumented).toBe(true);
    expect(readiness.latestSdkValidationEvidenceStatus).toBe("NOT_RUN");
    expect(readiness.sdkValidationNoNetworkOnly).toBe(true);
    expect(readiness.generatedFixtureNoNetworkOnly).toBe(true);
    expect(readiness.generatedFixtureProductionCompliance).toBe(false);
    expect(readiness.generatedStandardInvoiceFixtureStatus).toEqual(expect.any(String));
    expect(readiness.generatedCreditNoteFixtureStatus).toEqual(expect.any(String));
    expect(readiness.lastGeneratedFixtureEvidenceStatus).toEqual(expect.any(String));
    expect(readiness.productionComplianceEnabled).toBe(false);
    expect(readiness.realNetworkCallsEnabled).toBe(false);
    expect(readiness.signingEnabled).toBe(false);
    expect(readiness.clearanceReportingEnabled).toBe(false);
    expect(readiness.pdfA3Enabled).toBe(false);
    expect(JSON.stringify(readiness)).not.toContain("privateKeyPem");
    expect(JSON.stringify(readiness)).not.toContain("PRIVATE KEY");
  });

  it("returns generated fixture validation readiness metadata with Java blocker and no XML bodies", async () => {
    const prisma = makeReadinessPrisma({ localXmlCount: 1 });
    const service = new ZatcaService(
      prisma as never,
      { log: jest.fn() } as never,
      undefined,
      undefined,
      {
        getReadiness: jest.fn().mockReturnValue({
          enabled: true,
          canRunLocalValidation: false,
          javaFound: true,
          javaVersion: "17.0.16",
          javaVersionSupported: false,
          requiredJavaRange: ">=11 <15",
          blockingReasons: ["Detected Java 17.0.16 is outside the SDK-supported range >=11 <15."],
          warnings: [],
        }),
      } as never,
    );

    const readiness = await service.getZatcaReadinessSummary("org-1");
    const serialized = JSON.stringify(readiness);

    expect(readiness.generatedStandardInvoiceFixtureStatus).toBe("BLOCKED_UNSUPPORTED_JAVA");
    expect(readiness.generatedCreditNoteFixtureStatus).toBe("BLOCKED_UNSUPPORTED_JAVA");
    expect(readiness.lastGeneratedFixtureEvidenceStatus).toBe("BLOCKED_UNSUPPORTED_JAVA");
    expect(readiness.generatedFixtureJavaBlocker).toContain("Java 17.0.16");
    expect(readiness.generatedFixtureNoNetworkOnly).toBe(true);
    expect(readiness.generatedFixtureProductionCompliance).toBe(false);
    expect(serialized).not.toContain("<Invoice");
    expect(serialized).not.toContain("qrPayloadBody");
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
  });

  it("returns compliance CSID custody planning without exposing token, secret, certificate, OTP, CSR, or private key material", async () => {
    const prisma = {
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          ...makeEgsUnit({
            id: "egs-1",
            csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR\n-----END CERTIFICATE REQUEST-----",
            complianceCsidPem: "-----BEGIN CERTIFICATE-----\nMOCK-CERT\n-----END CERTIFICATE-----",
            productionCsidPem: null,
            certificateRequestId: "1234567890123",
          }),
          privateKeyPem: "-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----",
        }),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const plan = await service.getEgsUnitComplianceCsidCustodyPlan("org-1", "egs-1");
    const serialized = JSON.stringify(plan);

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noNetwork: true,
      noCsidRequest: true,
      noProductionCredentials: true,
      productionCompliance: false,
      hasMockResponse: true,
      hasComplianceCsid: true,
      hasProductionCsid: false,
      certificateExpiryKnown: false,
      renewalMetadataModeled: false,
      recommendedCustodyMode:
        "Use a secrets-manager/KMS custody design for binarySecurityToken and secret, with controlled encrypted certificate storage; no body persistence is enabled in this phase.",
    });
    expect(plan.tokenCustodyStatus).toMatchObject({ implemented: false, persisted: false, bodyReturned: false });
    expect(plan.secretCustodyStatus).toMatchObject({ implemented: false, persisted: false, bodyReturned: false });
    expect(plan.certificateCustodyStatus).toMatchObject({ implemented: false, persisted: false, bodyReturned: false });
    expect(plan.sensitiveFields).toEqual(["binarySecurityToken", "secret", "certificate", "privateKey", "OTP", "CSR"]);
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        "provider configuration not approved",
        "body storage explicitly blocked",
        "token storage not ready",
        "secret storage not ready",
        "certificate storage not ready",
      ]),
    );
    expect(serialized).not.toContain("BEGIN CERTIFICATE REQUEST");
    expect(serialized).not.toContain("BEGIN CERTIFICATE");
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("MOCK-CERT");
    expect(serialized).not.toContain("LOCAL-MOCK-SECRET");
    expect(serialized).not.toContain("binarySecurityToken:");
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("adds compliance CSID custody blockers to readiness without exposing sensitive material", async () => {
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

    expect(readiness.complianceCsidCustody.status).toBe("BLOCKED");
    expect(readiness.complianceCsidCustody.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ZATCA_COMPLIANCE_CSID_TOKEN_CUSTODY_NOT_IMPLEMENTED", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_COMPLIANCE_CSID_SECRET_CUSTODY_NOT_IMPLEMENTED", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_COMPLIANCE_CSID_CERTIFICATE_CUSTODY_NOT_IMPLEMENTED", severity: "ERROR" }),
      ]),
    );
    expect(readiness.productionCompliance).toBe(false);
    expect(JSON.stringify(readiness)).not.toContain("BEGIN CERTIFICATE");
    expect(JSON.stringify(readiness)).not.toContain("BEGIN PRIVATE KEY");
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
    expect(readiness.signedArtifactPromotion.status).toBe("BLOCKED");
    expect(readiness.signedArtifactStorage.status).toBe("BLOCKED");
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "ZATCA_SIGNING_NOT_IMPLEMENTED", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_PHASE_2_QR_NOT_IMPLEMENTED", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_SIGNED_XML_PROMOTION_NOT_IMPLEMENTED", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_DUMMY_SIGNED_XML_CANNOT_BE_PROMOTED", severity: "ERROR" }),
        expect.objectContaining({ code: "ZATCA_SIGNED_ARTIFACT_METADATA_DRAFT_MODEL_READY", severity: "INFO" }),
        expect.objectContaining({ code: "ZATCA_SIGNED_XML_BODY_PERSISTENCE_BLOCKED", severity: "ERROR" }),
      ]),
    );
  });

  it("returns a signed XML promotion plan as blocked, redacted, and no-mutation", async () => {
    const prisma = makeInvoiceReadinessPrisma({
      zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      activeEgs: {
        id: "egs-1",
        name: "Dev EGS",
        environment: "SANDBOX",
        status: ZatcaRegistrationStatus.ACTIVE,
        isActive: true,
        lastIcv: 37,
        lastInvoiceHash: "last-hash",
        hashMode: "SDK_GENERATED",
        csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR-CONTENT\n-----END CERTIFICATE REQUEST-----",
        complianceCsidPem: "COMPLIANCE-CERT-SECRET",
        productionCsidPem: null,
        privateKeyPem: "-----BEGIN EC PRIVATE KEY-----\nSUPER-SECRET-PRIVATE-KEY\n-----END EC PRIVATE KEY-----",
      },
    });
    const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, onboardingAdapter as never);

    const plan = await service.getInvoiceZatcaSignedXmlPromotionPlan("org-1", "invoice-1");

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      noClearanceReporting: true,
      noPdfA3: true,
      productionCompliance: false,
      promotionBlocked: true,
      signedXmlPersisted: false,
      latestLocalSignedValidationStatus: "NOT_PERSISTED",
      invoice: {
        id: "invoice-1",
        invoiceNumber: "INV-000001",
        zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      },
      currentMetadataState: {
        hasUnsignedXml: true,
        hasInvoiceHash: true,
        signedXmlStorageKey: null,
      },
    });
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("dummy/test material"),
        expect.stringContaining("real ZATCA certificate"),
        expect.stringContaining("production key custody"),
        expect.stringContaining("Signed XML promotion workflow is not implemented"),
        expect.stringContaining("clearance/reporting workflow is not implemented"),
      ]),
    );
    expect(plan.requiredFutureArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "signedXmlStorage", required: true, available: false }),
        expect.objectContaining({ id: "realSigningCertificate", required: true, available: false }),
        expect.objectContaining({ id: "invoiceHashForSubmission", required: true, available: true }),
      ]),
    );
    expect(JSON.stringify(plan)).not.toContain("<Invoice");
    expect(JSON.stringify(plan)).not.toContain("SUPER-SECRET-PRIVATE-KEY");
    expect(JSON.stringify(plan)).not.toContain("COMPLIANCE-CERT-SECRET");
    expect(JSON.stringify(plan)).not.toContain("BEGIN EC PRIVATE KEY");
    expect(JSON.stringify(plan)).not.toContain("binarySecurityToken");
    expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
  });

  it("returns a metadata-only signed artifact storage plan without bodies, SDK, network, or mutation", async () => {
    const prisma = makeInvoiceReadinessPrisma({
      zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      metadata: {
        id: "metadata-1",
        invoiceId: "invoice-1",
        invoiceUuid: "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
        zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
        xmlBase64: Buffer.from("<Invoice>SECRET XML BODY</Invoice>", "utf8").toString("base64"),
        icv: 37,
        previousInvoiceHash: "previous-hash",
        invoiceHash: "invoice-hash",
        xmlHash: "xml-hash",
        hashModeSnapshot: "SDK_GENERATED",
        egsUnitId: "egs-1",
        generatedAt: new Date("2026-05-16T00:00:00.000Z"),
        zatcaStatus: ZatcaInvoiceStatus.XML_GENERATED,
      },
    });
    const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, onboardingAdapter as never);

    const plan = await service.getInvoiceZatcaSignedArtifactStoragePlan("org-1", "invoice-1");

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      noCsidRequest: true,
      noNetwork: true,
      noClearanceReporting: true,
      noPdfA3: true,
      productionCompliance: false,
      metadataOnly: true,
      futureObjectStorageRequired: true,
      storageBlocked: true,
      schemaDecision: {
        schemaAdded: true,
      },
      metadataSource: {
        metadataId: "metadata-1",
        invoiceUuid: "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
        icv: 37,
        hasUnsignedXml: true,
        hasInvoiceHash: true,
      },
    });
    expect(plan.proposedStorageKeys).toEqual(
      expect.objectContaining({
        signedXmlObjectKey: expect.stringContaining("future-only"),
        qrPayloadObjectKey: expect.stringContaining("future-only"),
      }),
    );
    expect(plan.proposedMetadataFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "signedXmlStorageKey", safeNow: false }),
        expect.objectContaining({ name: "signedXmlSha256", safeNow: true }),
        expect.objectContaining({ name: "validationResultsJson", safeNow: true }),
        expect.objectContaining({ name: "productionCompliance", value: false }),
      ]),
    );
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("metadata-only drafts can be created"),
        expect.stringContaining("Object-storage retention"),
        expect.stringContaining("Signed XML body persistence is intentionally blocked"),
        expect.stringContaining("QR payload persistence is intentionally blocked"),
        expect.stringContaining("Clearance/reporting linkage is not implemented"),
      ]),
    );
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toContain("SECRET XML BODY");
    expect(serialized).not.toContain("<Invoice");
    expect(serialized).not.toContain("QR PAYLOAD");
    expect(serialized).not.toContain("PRIVATE KEY");
    expect(serialized).not.toContain("binarySecurityToken");
    expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
  });

  it("creates signed artifact draft records as metadata-only local planning records", async () => {
    const metadata = makeGeneratedMetadata();
    const draft = makeSignedArtifactDraft();
    const prisma = {
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          organizationId: "org-1",
          invoiceNumber: "INV-000001",
          zatcaMetadata: metadata,
        }),
      },
      zatcaSignedArtifactDraft: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue(draft),
      },
      zatcaInvoiceMetadata: { update: jest.fn() },
      zatcaEgsUnit: { update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);

    const result = await service.createInvoiceZatcaSignedArtifactDraft("org-1", "user-1", "invoice-1");

    expect(result).toMatchObject({
      localOnly: true,
      metadataOnly: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      noCsidRequest: true,
      noNetwork: true,
      productionCompliance: false,
      draft: {
        id: "draft-1",
        status: "PLANNED",
        source: "LOCAL_DRY_RUN",
        signedXmlStorageKey: null,
        qrPayloadStorageKey: null,
        signedWithDummyMaterial: true,
        productionCompliance: false,
      },
    });
    expect(prisma.zatcaSignedArtifactDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          invoiceId: "invoice-1",
          metadataId: "metadata-1",
          status: "PLANNED",
          source: "LOCAL_DRY_RUN",
          signedXmlStorageKey: null,
          qrPayloadStorageKey: null,
          signedWithDummyMaterial: true,
          productionCompliance: false,
          createdById: "user-1",
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("<Invoice");
    expect(JSON.stringify(result)).not.toContain("QR PAYLOAD");
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalled();
  });

  it("blocks metadata-only signed artifact draft creation when invoice XML metadata is missing", async () => {
    const prisma = {
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          organizationId: "org-1",
          invoiceNumber: "INV-000001",
          zatcaMetadata: null,
        }),
      },
      zatcaSignedArtifactDraft: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(service.createInvoiceZatcaSignedArtifactDraft("org-1", "user-1", "invoice-1")).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.zatcaSignedArtifactDraft.create).not.toHaveBeenCalled();
  });

  it("lists signed artifact draft records without returning XML or QR bodies", async () => {
    const draft = makeSignedArtifactDraft({ validationGlobalResult: "PASSED" });
    const prisma = {
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          organizationId: "org-1",
          invoiceNumber: "INV-000001",
        }),
      },
      zatcaSignedArtifactDraft: {
        findMany: jest.fn().mockResolvedValue([draft]),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const result = await service.listInvoiceZatcaSignedArtifactDrafts("org-1", "invoice-1");

    expect(result).toMatchObject({
      localOnly: true,
      metadataOnly: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      productionCompliance: false,
      count: 1,
      drafts: [
        {
          id: "draft-1",
          signedXmlStorageKey: null,
          qrPayloadStorageKey: null,
          productionCompliance: false,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("<Invoice");
    expect(JSON.stringify(result)).not.toContain("QR PAYLOAD");
  });

  it("includes metadata-only draft and object-storage capability status in the storage plan", async () => {
    const metadata = makeGeneratedMetadata();
    const draft = makeSignedArtifactDraft({ id: "draft-latest" });
    const prisma = {
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          organizationId: "org-1",
          invoiceNumber: "INV-000001",
        }),
      },
      zatcaInvoiceMetadata: {
        findFirst: jest.fn().mockResolvedValue(metadata),
        update: jest.fn(),
      },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          id: "egs-1",
          name: "Dev EGS",
          environment: "SANDBOX",
          status: ZatcaRegistrationStatus.ACTIVE,
          isActive: true,
          hashMode: "SDK_GENERATED",
          lastIcv: 37,
          lastInvoiceHash: "last-hash",
          csrPem: null,
          complianceCsidPem: null,
          productionCsidPem: null,
        }),
        update: jest.fn(),
      },
      zatcaSignedArtifactDraft: {
        findFirst: jest.fn().mockResolvedValue(draft),
        count: jest.fn().mockResolvedValue(1),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const plan = await service.getInvoiceZatcaSignedArtifactStoragePlan("org-1", "invoice-1");

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      metadataOnly: true,
      storageProbeRequired: true,
      latestStorageProbeStatus: "NOT_RUN",
      metadataOnlyDraftAllowed: true,
      bodyPersistenceAllowed: false,
      signedXmlStorageKey: null,
      qrPayloadStorageKey: null,
      latestDraft: {
        id: "draft-latest",
        signedXmlStorageKey: null,
        qrPayloadStorageKey: null,
      },
      draftCount: 1,
      objectStorageCapability: {
        signedArtifactBodyStorageAllowed: false,
        immutableRetentionConfigured: false,
        generatedDocumentStorageDistinct: true,
      },
      storageProbePlan: {
        localOnly: true,
        dryRun: true,
        noSignedXmlBody: true,
        noQrPayloadBody: true,
        writeProbeEnabled: false,
        immutablePolicyStatus: {
          policyApproved: false,
          retentionDurationApproved: false,
          bodyPersistenceAllowed: false,
          signedArtifactBodyStorageAllowed: false,
        },
      },
      immutablePolicyStatus: {
        policyApproved: false,
        retentionDurationApproved: false,
        bodyPersistenceAllowed: false,
        signedArtifactBodyStorageAllowed: false,
      },
    });
    expect(["BLOCKED", "WARNINGS", "READY_FOR_METADATA_ONLY"]).toContain(
      plan.objectStorageCapability.storageCapabilityStatus,
    );
    expect(JSON.stringify(plan)).not.toContain("<Invoice");
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("creates metadata-only immutable storage policy approval drafts without enabling body persistence", async () => {
    const draft = makeStoragePolicyApproval();
    const prisma = {
      zatcaSignedArtifactStoragePolicyApproval: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue(draft),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);

    const result = await service.createSignedArtifactStoragePolicyApproval("org-1", "user-1", {
      note: "Draft only; legal retention review is pending.",
    });

    expect(result).toMatchObject({
      localOnly: true,
      metadataOnly: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      noCsidRequest: true,
      noNetworkToZatca: true,
      noClearanceReporting: true,
      noPdfA3: true,
      productionCompliance: false,
      policyApproval: {
        id: "policy-approval-1",
        status: "DRAFT",
        retentionDurationStatus: "REQUIRES_LEGAL_REVIEW",
        signedXmlBodyPersistenceAllowed: false,
        qrPayloadBodyPersistenceAllowed: false,
        productionCompliance: false,
      },
    });
    expect(prisma.zatcaSignedArtifactStoragePolicyApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          status: "DRAFT",
          retentionDurationStatus: "REQUIRES_LEGAL_REVIEW",
          signedXmlBodyPersistenceAllowed: false,
          qrPayloadBodyPersistenceAllowed: false,
          productionCompliance: false,
          createdById: "user-1",
        }),
      }),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("<Invoice");
    expect(serialized).not.toContain("QR PAYLOAD");
    expect(serialized).not.toContain("PRIVATE KEY");
    expect(serialized).not.toContain("BEGIN CERTIFICATE");
    expect(serialized).not.toContain("OTP");
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        entityType: "ZatcaSignedArtifactStoragePolicyApproval",
        entityId: "policy-approval-1",
      }),
    );
  });

  it("blocks immutable policy approval until retention and technical controls are reviewed", async () => {
    const draft = makeStoragePolicyApproval();
    const prisma = {
      zatcaSignedArtifactStoragePolicyApproval: {
        findFirst: jest.fn().mockResolvedValue(draft),
        update: jest.fn(),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(
      service.approveSignedArtifactStoragePolicyApproval("org-1", "user-1", "policy-approval-1", {
        note: "Missing legal retention and storage controls.",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.zatcaSignedArtifactStoragePolicyApproval.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("approves and revokes immutable policy approval metadata while body persistence stays blocked", async () => {
    const approved = makeStoragePolicyApproval({
      status: "APPROVED",
      retentionDurationStatus: "APPROVED",
      retentionDurationValue: "Legal-reviewed duration reference: TAX-RETENTION-REVIEW-1",
      objectVersioningApproved: true,
      immutableArchiveApproved: true,
      deletionPolicyApproved: true,
      supersessionPolicyApproved: true,
      accessControlApproved: true,
      encryptionAtRestApproved: true,
      backupRestoreApproved: true,
      archiveRestoreTested: true,
      approvedById: "user-1",
      approvedAt: new Date("2026-05-17T10:00:00.000Z"),
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      productionCompliance: false,
    });
    const revoked = { ...approved, status: "REVOKED", revokedById: "user-1", revokedAt: new Date("2026-05-17T11:00:00.000Z") };
    const prisma = {
      zatcaSignedArtifactStoragePolicyApproval: {
        findFirst: jest.fn().mockResolvedValueOnce(makeStoragePolicyApproval()).mockResolvedValueOnce(approved),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValueOnce(approved).mockResolvedValueOnce(revoked),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);

    const approvalResult = await service.approveSignedArtifactStoragePolicyApproval("org-1", "user-1", "policy-approval-1", {
      retentionDurationStatus: "APPROVED",
      retentionDurationValue: "Legal-reviewed duration reference: TAX-RETENTION-REVIEW-1",
      objectVersioningApproved: true,
      immutableArchiveApproved: true,
      deletionPolicyApproved: true,
      supersessionPolicyApproved: true,
      accessControlApproved: true,
      encryptionAtRestApproved: true,
      backupRestoreApproved: true,
      archiveRestoreTested: true,
      note: "Policy controls reviewed; body persistence still blocked in this phase.",
    });
    const revokeResult = await service.revokeSignedArtifactStoragePolicyApproval("org-1", "user-1", "policy-approval-1", {
      note: "Revoke local approval metadata.",
    });

    expect(approvalResult.policyApproval).toMatchObject({
      status: "APPROVED",
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      productionCompliance: false,
    });
    expect(revokeResult.policyApproval).toMatchObject({
      status: "REVOKED",
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      productionCompliance: false,
    });
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "APPROVE" }));
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVOKE" }));
  });

  it("includes latest immutable policy approval state in policy and storage probe plans", async () => {
    const approved = makeStoragePolicyApproval({ status: "APPROVED", retentionDurationStatus: "APPROVED" });
    const prisma = {
      zatcaSignedArtifactStoragePolicyApproval: {
        findFirst: jest.fn().mockResolvedValue(approved),
      },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const policyPlan = await service.getSignedArtifactImmutableStoragePolicyPlan("org-1");
    const probePlan = await service.getSignedArtifactStorageProbePlan("org-1");

    expect(policyPlan).toMatchObject({
      latestApprovalId: "policy-approval-1",
      latestApprovalStatus: "APPROVED",
      approvalRequired: true,
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      productionCompliance: false,
    });
    expect(probePlan).toMatchObject({
      latestImmutablePolicyApprovalStatus: "APPROVED",
      policyApprovalRequired: true,
      bodyPersistenceAllowed: false,
      signedArtifactBodyStorageAllowed: false,
    });
  });

  it("returns a signed artifact storage probe plan without uploading objects or exposing bodies", async () => {
    const service = new ZatcaService({} as never, { log: jest.fn() } as never);

    const plan = await service.getSignedArtifactStorageProbePlan("org-1");

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      noCsidRequest: true,
      noNetworkToZatca: true,
      productionCompliance: false,
      testPrefix: "zatca/signed-artifacts/probe/org-1",
      writeProbeEnabled: false,
      retentionConfigured: false,
      immutabilityConfigured: false,
      immutablePolicyStatus: {
        policyApproved: false,
        retentionDurationApproved: false,
        bodyPersistenceAllowed: false,
        signedArtifactBodyStorageAllowed: false,
      },
    });
    expect(plan.plannedTestObjectKey).toContain("zatca/signed-artifacts/probe/org-1/");
    expect(JSON.stringify(plan)).not.toContain("<Invoice");
    expect(JSON.stringify(plan)).not.toContain("QR PAYLOAD");
    expect(JSON.stringify(plan)).not.toContain("SECRET");
  });

  it("returns an immutable signed artifact storage policy plan as blocked and no-mutation", async () => {
    const prisma = {
      zatcaSubmissionLog: { create: jest.fn() },
      zatcaSignedArtifactDraft: { create: jest.fn() },
      zatcaSignedArtifactStoragePolicyApproval: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const plan = await service.getSignedArtifactImmutableStoragePolicyPlan("org-1");

    expect(plan).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      noCsidRequest: true,
      noNetworkToZatca: true,
      noClearanceReporting: true,
      noPdfA3: true,
      productionCompliance: false,
      policyApproved: false,
      latestApprovalStatus: "NONE",
      approvalRequired: true,
      retentionDurationApproved: false,
      objectVersioningRequired: true,
      immutableArchiveRequired: true,
      deletionPolicyApproved: false,
      supersessionPolicyApproved: false,
      accessControlReviewed: false,
      encryptionAtRestReviewed: false,
      backupRestoreReviewed: false,
      bodyPersistenceAllowed: false,
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      signedArtifactBodyStorageAllowed: false,
      immutablePolicyStatus: {
        policyApproved: false,
        retentionDurationApproved: false,
        objectVersioningConfirmed: false,
        deletionPolicyApproved: false,
        supersessionPolicyApproved: false,
        archiveRestoreTested: false,
        accessControlReviewed: false,
        encryptionAtRestReviewed: false,
        bodyPersistenceAllowed: false,
        signedArtifactBodyStorageAllowed: false,
      },
    });
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Immutable signed artifact storage policy is not approved"),
        expect.stringContaining("Retention duration requires legal/accounting review"),
      ]),
    );
    expect(plan.recommendedNextSteps).toEqual(
      expect.arrayContaining([expect.stringContaining("Approve immutable storage policy")]),
    );
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toContain("<Invoice");
    expect(serialized).not.toContain("QR PAYLOAD");
    expect(serialized).not.toContain("PRIVATE KEY");
    expect(serialized).not.toContain("SECRET");
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(prisma.zatcaSignedArtifactDraft.create).not.toHaveBeenCalled();
  });

  it("creates metadata-only storage control evidence records without enabling body persistence", async () => {
    const evidence = makeStorageControlEvidence();
    const prisma = {
      zatcaSignedArtifactStorageControlEvidence: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue(evidence),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);

    const result = await service.createSignedArtifactStorageControlEvidence("org-1", "user-1", {
      evidenceType: ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE,
      provider: "s3-compatible",
      bucketNameRedacted: "ledgerbyte-test-[redacted]",
      evidenceSummaryJson: { probeRan: true, testObjectOnly: true, noInvoiceData: true },
      note: "Metadata-only storage probe evidence.",
    });

    expect(result).toMatchObject({
      localOnly: true,
      metadataOnly: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      noCsidRequest: true,
      noNetworkToZatca: true,
      productionCompliance: false,
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      controlEvidence: {
        id: "evidence-1",
        status: "DRAFT",
        evidenceType: "STORAGE_PROBE",
        signedXmlBodyPersistenceAllowed: false,
        qrPayloadBodyPersistenceAllowed: false,
        productionCompliance: false,
      },
    });
    expect(prisma.zatcaSignedArtifactStorageControlEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          status: "DRAFT",
          evidenceType: "STORAGE_PROBE",
          evidenceDocumentStorageKey: null,
          signedXmlBodyPersistenceAllowed: false,
          qrPayloadBodyPersistenceAllowed: false,
          productionCompliance: false,
          createdById: "user-1",
        }),
      }),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("<Invoice");
    expect(serialized).not.toContain("QR PAYLOAD");
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("BEGIN CERTIFICATE");
    expect(serialized).not.toContain("binarySecurityToken");
    expect(serialized).not.toContain("OTP");
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE" }));
  });

  it("rejects storage control evidence containing XML, QR, PEM, token, OTP, or credential-like values", async () => {
    const service = new ZatcaService({ zatcaSignedArtifactStorageControlEvidence: { create: jest.fn() } } as never, { log: jest.fn() } as never);
    const unsafeSummaries = [
      { invoiceXml: "<Invoice>secret</Invoice>", probeRan: true, testObjectOnly: true, noInvoiceData: true },
      { qrPayloadBody: "QR PAYLOAD BODY", probeRan: true, testObjectOnly: true, noInvoiceData: true },
      { probeRan: true, testObjectOnly: true, noInvoiceData: true, certificate: "-----BEGIN CERTIFICATE-----" },
      { probeRan: true, testObjectOnly: true, noInvoiceData: true, binarySecurityToken: "token" },
      { probeRan: true, testObjectOnly: true, noInvoiceData: true, otp: "123456" },
      { probeRan: true, testObjectOnly: true, noInvoiceData: true, accessKey: "AKIA0000000000000000" },
    ];

    for (const evidenceSummaryJson of unsafeSummaries) {
      await expect(
        service.createSignedArtifactStorageControlEvidence("org-1", "user-1", {
          evidenceType: ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE,
          provider: "s3-compatible",
          evidenceSummaryJson,
          note: "Unsafe evidence should be rejected.",
        }),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it("verifies and revokes storage control evidence while persistence and production compliance remain blocked", async () => {
    const draft = makeStorageControlEvidence();
    const verified = makeStorageControlEvidence({
      status: ZatcaSignedArtifactStorageControlEvidenceStatus.VERIFIED,
      verifiedById: "user-1",
      verifiedAt: new Date("2026-05-17T01:00:00.000Z"),
    });
    const revoked = makeStorageControlEvidence({
      ...verified,
      status: ZatcaSignedArtifactStorageControlEvidenceStatus.REVOKED,
      revokedById: "user-1",
      revokedAt: new Date("2026-05-17T02:00:00.000Z"),
    });
    const prisma = {
      zatcaSignedArtifactStorageControlEvidence: {
        findFirst: jest.fn().mockResolvedValueOnce(draft).mockResolvedValueOnce(verified),
        update: jest.fn().mockResolvedValueOnce(verified).mockResolvedValueOnce(revoked),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);

    const verifyResult = await service.verifySignedArtifactStorageControlEvidence("org-1", "user-1", "evidence-1", { note: "Verified metadata only." });
    const revokeResult = await service.revokeSignedArtifactStorageControlEvidence("org-1", "user-1", "evidence-1", { note: "Revoked metadata only." });

    expect(verifyResult.controlEvidence).toMatchObject({ status: "VERIFIED", signedXmlBodyPersistenceAllowed: false, qrPayloadBodyPersistenceAllowed: false, productionCompliance: false });
    expect(revokeResult.controlEvidence).toMatchObject({ status: "REVOKED", signedXmlBodyPersistenceAllowed: false, qrPayloadBodyPersistenceAllowed: false, productionCompliance: false });
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "VERIFY" }));
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVOKE" }));
  });

  it("includes storage control evidence state in immutable policy, storage, and probe plans", async () => {
    const evidence = makeStorageControlEvidence({ status: ZatcaSignedArtifactStorageControlEvidenceStatus.VERIFIED });
    const prisma = {
      zatcaSignedArtifactStorageControlEvidence: {
        findMany: jest.fn().mockResolvedValue([evidence]),
      },
      zatcaSignedArtifactStoragePolicyApproval: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({ id: "invoice-1", organizationId: "org-1", invoiceNumber: "INV-000001", status: "FINALIZED" }),
      },
      zatcaInvoiceMetadata: {
        findFirst: jest.fn().mockResolvedValue(makeGeneratedMetadata()),
        update: jest.fn(),
      },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          id: "egs-1",
          name: "Dev EGS",
          environment: "SANDBOX",
          status: ZatcaRegistrationStatus.ACTIVE,
          isActive: true,
          hashMode: "SDK_GENERATED",
          lastIcv: 37,
          lastInvoiceHash: "last-hash",
          csrPem: null,
          complianceCsidPem: null,
          productionCsidPem: null,
        }),
        update: jest.fn(),
      },
      zatcaSignedArtifactDraft: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const policyPlan = await service.getSignedArtifactImmutableStoragePolicyPlan("org-1");
    const probePlan = await service.getSignedArtifactStorageProbePlan("org-1");
    const storagePlan = await service.getInvoiceZatcaSignedArtifactStoragePlan("org-1", "invoice-1");

    for (const response of [policyPlan, probePlan, storagePlan]) {
      expect(response).toMatchObject({
        evidenceRequired: true,
        verifiedEvidenceTypes: expect.arrayContaining(["STORAGE_PROBE"]),
        missingEvidenceTypes: expect.any(Array),
        objectStorageTechnicalControlsStatus: "BLOCKED",
      });
      expect(JSON.stringify(response)).not.toContain("<Invoice");
      expect(JSON.stringify(response)).not.toContain("QR PAYLOAD");
    }
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
  });

  it("skips signed artifact storage probe execution when the env gate is false", async () => {
    const previous = process.env.ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED;
    delete process.env.ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED;
    const probeClient = {
      putObject: jest.fn(),
      getObject: jest.fn(),
      deleteObject: jest.fn(),
    };
    const prisma = {
      zatcaSubmissionLog: { create: jest.fn() },
      zatcaInvoiceMetadata: { update: jest.fn() },
      zatcaSignedArtifactDraft: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    try {
      const result = await service.runSignedArtifactStorageProbe("org-1", { probeClient });

      expect(result).toMatchObject({
        localOnly: true,
        probe: true,
        executionEnabled: false,
        executionAttempted: false,
        testObjectWritten: false,
        testObjectRead: false,
        testObjectDeleted: false,
        cleanupSuccess: true,
        signedArtifactBodyStorageAllowed: false,
        productionCompliance: false,
      });
      expect(probeClient.putObject).not.toHaveBeenCalled();
      expect(probeClient.getObject).not.toHaveBeenCalled();
      expect(probeClient.deleteObject).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSignedArtifactDraft.create).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) {
        delete process.env.ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED;
      } else {
        process.env.ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED = previous;
      }
    }
  });

  it("runs a harmless signed artifact storage probe with a mocked adapter when explicitly enabled", async () => {
    const previousEnv = {
      flag: process.env.ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED,
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
      accessKey: process.env.S3_ACCESS_KEY_ID,
      secret: process.env.S3_SECRET_ACCESS_KEY,
    };
    process.env.ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED = "true";
    process.env.S3_ENDPOINT = "https://objects.example.test";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_BUCKET = "ledgerbyte-test";
    process.env.S3_ACCESS_KEY_ID = "do-not-return";
    process.env.S3_SECRET_ACCESS_KEY = "super-secret";
    const probeClient = {
      putObject: jest.fn().mockResolvedValue(undefined),
      getObject: jest.fn().mockResolvedValue(Buffer.from("LedgerByte ZATCA signed artifact storage probe only. No invoice data.", "utf8")),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ZatcaService({} as never, { log: jest.fn() } as never);

    try {
      const result = await service.runSignedArtifactStorageProbe("org-1", {
        probeClient,
        now: new Date("2026-05-17T10:11:12.000Z"),
      });

      expect(result).toMatchObject({
        localOnly: true,
        probe: true,
        executionEnabled: true,
        executionAttempted: true,
        testObjectWritten: true,
        testObjectRead: true,
        testObjectDeleted: true,
        cleanupSuccess: true,
        signedArtifactBodyStorageAllowed: false,
        productionCompliance: false,
      });
      expect(probeClient.putObject).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringContaining("zatca/signed-artifacts/probe/org-1/20260517T101112000Z-probe.txt"),
          contentType: "text/plain; charset=utf-8",
        }),
      );
      const putInput = probeClient.putObject.mock.calls[0][0];
      expect(putInput.body.toString("utf8")).toBe("LedgerByte ZATCA signed artifact storage probe only. No invoice data.");
      expect(probeClient.getObject).toHaveBeenCalledWith(expect.objectContaining({ key: putInput.key }));
      expect(probeClient.deleteObject).toHaveBeenCalledWith(expect.objectContaining({ key: putInput.key }));
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("do-not-return");
      expect(serialized).not.toContain("super-secret");
      expect(serialized).not.toContain("<Invoice");
      expect(serialized).not.toContain("QR PAYLOAD");
    } finally {
      restoreEnv("ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED", previousEnv.flag);
      restoreEnv("S3_ENDPOINT", previousEnv.endpoint);
      restoreEnv("S3_REGION", previousEnv.region);
      restoreEnv("S3_BUCKET", previousEnv.bucket);
      restoreEnv("S3_ACCESS_KEY_ID", previousEnv.accessKey);
      restoreEnv("S3_SECRET_ACCESS_KEY", previousEnv.secret);
    }
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

  it("returns a default-disabled local signing dry-run without mutating metadata or EGS state", async () => {
    const previousFlag = process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    const prisma = makeInvoiceReadinessPrisma({
      zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      activeEgs: {
        id: "egs-1",
        name: "Dev EGS",
        environment: "SANDBOX",
        status: ZatcaRegistrationStatus.ACTIVE,
        isActive: true,
        lastIcv: 2,
        lastInvoiceHash: "last-hash",
        hashMode: "SDK_GENERATED",
        privateKeyPem: "-----BEGIN EC PRIVATE KEY-----\nSUPER-SECRET-PRIVATE-KEY\n-----END EC PRIVATE KEY-----",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    try {
      const result = await service.getInvoiceZatcaLocalSigningDryRun("org-1", "invoice-1");

      expect(result).toMatchObject({
        localOnly: true,
        dryRun: true,
        noMutation: true,
        noCsidRequest: true,
        noNetwork: true,
        noClearanceReporting: true,
        noPdfA3: true,
        noProductionCredentials: true,
        productionCompliance: false,
        executionEnabled: false,
        executionAttempted: false,
        signedXmlDetected: false,
        qrDetected: false,
        invoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      });
      expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("ZATCA_SDK_SIGNING_EXECUTION_ENABLED is false")]));
      expect(result.phase2Qr.blockers).toEqual(expect.arrayContaining([expect.stringContaining("Phase 2 QR generation is blocked until signed XML exists")]));
      expect(JSON.stringify(result)).not.toContain("SUPER-SECRET-PRIVATE-KEY");
      expect(JSON.stringify(result)).not.toContain("BEGIN EC PRIVATE KEY");
      expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("blocks local signing dry-run when generated XML is missing", async () => {
    const prisma = makeInvoiceReadinessPrisma({
      metadata: {
        id: "metadata-1",
        invoiceId: "invoice-1",
        zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
        xmlBase64: null,
        icv: null,
        previousInvoiceHash: null,
        invoiceHash: null,
        hashModeSnapshot: "LOCAL_DETERMINISTIC",
        egsUnitId: "egs-1",
        generatedAt: null,
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    const result = await service.getInvoiceZatcaLocalSigningDryRun("org-1", "invoice-1");

    expect(result.executionAttempted).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("Generated invoice XML is missing")]));
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("blocks enabled local signing execution when SDK dummy certificate material is unavailable", async () => {
    const previousFlag = process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = "true";
    const fixture = makeLocalSigningSdkFixture({ includeDummyMaterial: false });
    const readinessSpy = jest.spyOn(ZatcaSdkPaths, "discoverZatcaSdkReadiness").mockReturnValue(fixture.readiness);
    const prisma = makeInvoiceReadinessPrisma({ zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    const executeSpy = jest.spyOn(service as never as { executeZatcaSdkCommand: jest.Mock }, "executeZatcaSdkCommand").mockResolvedValue({
      exitCode: 0,
      stdout: "should-not-run",
      stderr: "",
      timedOut: false,
    });

    try {
      const result = await service.getInvoiceZatcaLocalSigningDryRun("org-1", "invoice-1");

      expect(result.executionEnabled).toBe(true);
      expect(result.executionAttempted).toBe(false);
      expect(result.executionStatus).toBe("SKIPPED");
      expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("SDK dummy certificate"), expect.stringContaining("SDK dummy private key")]));
      expect(executeSpy).not.toHaveBeenCalled();
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    } finally {
      readinessSpy.mockRestore();
      executeSpy.mockRestore();
      rmSync(fixture.root, { recursive: true, force: true });
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("uses temp SDK config and cleans signed XML on mocked local signing success", async () => {
    const previousFlag = process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = "true";
    const fixture = makeLocalSigningSdkFixture({ includeDummyMaterial: true });
    const readinessSpy = jest.spyOn(ZatcaSdkPaths, "discoverZatcaSdkReadiness").mockReturnValue(fixture.readiness);
    const prisma = makeInvoiceReadinessPrisma({ zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    const executeSpy = jest.spyOn(service as never as { executeZatcaSdkCommand: jest.Mock }, "executeZatcaSdkCommand").mockImplementation(async (plan: { args: string[] }) => {
      if (plan.args.includes("-sign")) {
        const signedInvoicePath = plan.args[plan.args.indexOf("-signedInvoice") + 1];
        expect(signedInvoicePath).toBeTruthy();
        writeFileSync(signedInvoicePath!, "<Invoice><ds:X509Certificate>SECRET-CERT</ds:X509Certificate></Invoice>", "utf8");
        return {
          exitCode: 0,
          stdout: "Signed <Invoice>SECRET XML</Invoice> -----BEGIN EC PRIVATE KEY-----SECRET-----END EC PRIVATE KEY-----",
          stderr: "",
          timedOut: false,
        };
      }
      return {
        exitCode: 0,
        stdout: `QR ${"A".repeat(140)}`,
        stderr: "OTP 123456",
        timedOut: false,
      };
    });

    try {
      const result = await service.getInvoiceZatcaLocalSigningDryRun("org-1", "invoice-1");

      expect(result.executionEnabled).toBe(true);
      expect(result.executionAttempted).toBe(true);
      expect(result.executionStatus).toBe("SUCCEEDED_LOCALLY");
      expect(result.signingExecuted).toBe(true);
      expect(result.qrExecuted).toBe(true);
      expect(result.signedXmlDetected).toBe(true);
      expect(result.qrDetected).toBe(true);
      expect(result.tempFilesWritten.sdkConfig).toBe(true);
      expect(result.commandPlan.envAdditions.SDK_CONFIG).toContain(result.tempFilesWritten.tempDirectory);
      expect(result.cleanup).toMatchObject({ performed: true, success: true, filesRetained: false });
      expect(result.tempFilesWritten.tempDirectory).toBeTruthy();
      expect(existsSync(result.tempFilesWritten.tempDirectory as string)).toBe(false);
      expect(JSON.stringify(result)).not.toContain("SECRET-CERT");
      expect(JSON.stringify(result)).not.toContain("BEGIN EC PRIVATE KEY");
      expect(JSON.stringify(result)).not.toContain("SECRET XML");
      expect(JSON.stringify(result)).not.toContain("123456");
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    } finally {
      readinessSpy.mockRestore();
      executeSpy.mockRestore();
      rmSync(fixture.root, { recursive: true, force: true });
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("stages the Windows SDK launcher into the no-space temp directory before local signing execution", async () => {
    const previousFlag = process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = "true";
    const fixture = makeLocalSigningSdkFixture({ includeDummyMaterial: true, includeLauncher: true, pathWithSpaces: true });
    const readinessSpy = jest.spyOn(ZatcaSdkPaths, "discoverZatcaSdkReadiness").mockReturnValue(fixture.readiness);
    const prisma = makeInvoiceReadinessPrisma({ zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    const executeSpy = jest.spyOn(service as never as { executeZatcaSdkCommand: jest.Mock }, "executeZatcaSdkCommand").mockImplementation(async (plan: { args: string[] }) => {
      if (plan.args.includes("-sign")) {
        const signedInvoicePath = plan.args[plan.args.indexOf("-signedInvoice") + 1];
        writeFileSync(signedInvoicePath!, "<Invoice />", "utf8");
      }
      return { exitCode: 0, stdout: plan.args.includes("-qr") ? "QR generated" : "", stderr: "", timedOut: false };
    });

    try {
      const result = await service.getInvoiceZatcaLocalSigningDryRun("org-1", "invoice-1");
      const signPlan = executeSpy.mock.calls[0]![0] as { args: string[]; envAdditions: Record<string, string>; workingDirectory: string };

      expect(result.executionStatus).toBe("SUCCEEDED_LOCALLY");
      expect(result.tempFilesWritten.sdkRuntime).toBe(true);
      expect(signPlan.args[2]).toContain(result.tempFilesWritten.tempDirectory);
      expect(signPlan.args[2]).not.toContain(fixture.root);
      expect(signPlan.envAdditions.FATOORA_HOME).toContain(result.tempFilesWritten.tempDirectory);
      expect(signPlan.envAdditions.PATH_PREPEND).toContain(result.tempFilesWritten.tempDirectory);
      expect(signPlan.workingDirectory).toBe(result.tempFilesWritten.tempDirectory);
      expect(existsSync(result.tempFilesWritten.tempDirectory as string)).toBe(false);
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    } finally {
      readinessSpy.mockRestore();
      executeSpy.mockRestore();
      rmSync(fixture.root, { recursive: true, force: true });
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("reports sanitized blockers when mocked local signing execution fails", async () => {
    const previousFlag = process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = "true";
    const fixture = makeLocalSigningSdkFixture({ includeDummyMaterial: true });
    const readinessSpy = jest.spyOn(ZatcaSdkPaths, "discoverZatcaSdkReadiness").mockReturnValue(fixture.readiness);
    const prisma = makeInvoiceReadinessPrisma({ zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    const executeSpy = jest.spyOn(service as never as { executeZatcaSdkCommand: jest.Mock }, "executeZatcaSdkCommand").mockResolvedValue({
      exitCode: 1,
      stdout: "",
      stderr: "failed <Invoice>SECRET XML</Invoice> -----BEGIN PRIVATE KEY-----SECRET-----END PRIVATE KEY----- CSID TOKEN",
      timedOut: false,
    });

    try {
      const result = await service.getInvoiceZatcaLocalSigningDryRun("org-1", "invoice-1");

      expect(result.executionAttempted).toBe(true);
      expect(result.executionStatus).toBe("FAILED");
      expect(result.signingExecuted).toBe(true);
      expect(result.qrExecuted).toBe(false);
      expect(result.signedXmlDetected).toBe(false);
      expect(result.qrDetected).toBe(false);
      expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("Official SDK -sign command failed")]));
      expect(result.stderrSummary).toContain("[REDACTED_XML]");
      expect(result.stderrSummary).toContain("[REDACTED");
      expect(JSON.stringify(result)).not.toContain("SECRET XML");
      expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
      expect(JSON.stringify(result)).not.toContain("CSID TOKEN");
      expect(result.cleanup.success).toBe(true);
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    } finally {
      readinessSpy.mockRestore();
      executeSpy.mockRestore();
      rmSync(fixture.root, { recursive: true, force: true });
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("returns a default-disabled signed XML validation dry-run without mutating metadata or EGS state", async () => {
    const previousFlag = process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    const prisma = makeInvoiceReadinessPrisma({
      zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      activeEgs: {
        id: "egs-1",
        name: "Dev EGS",
        environment: "SANDBOX",
        status: ZatcaRegistrationStatus.ACTIVE,
        isActive: true,
        lastIcv: 2,
        lastInvoiceHash: "last-hash",
        hashMode: "SDK_GENERATED",
      },
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    try {
      const result = await service.getInvoiceZatcaLocalSignedXmlValidationDryRun("org-1", "invoice-1");

      expect(result).toMatchObject({
        localOnly: true,
        dryRun: true,
        noMutation: true,
        noCsidRequest: true,
        noNetwork: true,
        noClearanceReporting: true,
        noPdfA3: true,
        noProductionCredentials: true,
        noPersistence: true,
        productionCompliance: false,
        executionEnabled: false,
        executionAttempted: false,
        signingExecutionStatus: "SKIPPED",
        validationAttempted: false,
        validationGlobalResult: "NOT_RUN",
        signedXmlDetected: false,
        qrDetected: false,
      });
      expect(result.blockers).toEqual(expect.arrayContaining([expect.stringContaining("ZATCA_SDK_SIGNING_EXECUTION_ENABLED is false")]));
      expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
      expect(JSON.stringify(result)).not.toContain("<Invoice");
      expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    } finally {
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("validates mocked signed XML with invoice-specific pihPath and sanitizes KSA-13 output", async () => {
    const previousFlag = process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
    process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = "true";
    const fixture = makeLocalSigningSdkFixture({ includeDummyMaterial: true });
    const readinessSpy = jest.spyOn(ZatcaSdkPaths, "discoverZatcaSdkReadiness").mockReturnValue(fixture.readiness);
    const prisma = makeInvoiceReadinessPrisma({
      zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
      metadata: makeGeneratedMetadata({
        zatcaInvoiceType: ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE,
        previousInvoiceHash: "invoice-specific-previous-hash",
      }),
    });
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    const executeSpy = jest.spyOn(service as never as { executeZatcaSdkCommand: jest.Mock }, "executeZatcaSdkCommand").mockImplementation(async (plan: { args: string[]; envAdditions: Record<string, string> }) => {
      if (plan.args.includes("-sign")) {
        const signedInvoicePath = plan.args[plan.args.indexOf("-signedInvoice") + 1];
        writeFileSync(signedInvoicePath!, "<Invoice><ds:X509Certificate>SECRET-CERT</ds:X509Certificate></Invoice>", "utf8");
        return { exitCode: 0, stdout: "signed", stderr: "", timedOut: false };
      }
      if (plan.args.includes("-qr")) {
        return { exitCode: 0, stdout: `QR ${"A".repeat(140)}`, stderr: "", timedOut: false };
      }
      if (plan.args.includes("-validate")) {
        const configPath = plan.envAdditions.SDK_CONFIG;
        expect(configPath).toBeTruthy();
        const config = JSON.parse(readFileSync(configPath!, "utf8")) as { pihPath: string };
        expect(config.pihPath).toContain("pih.txt");
        expect(readFileSync(config.pihPath, "utf8")).toBe("invoice-specific-previous-hash");
        return {
          exitCode: 1,
          stdout: [
            "XSD validation result : PASSED",
            "EN validation result : PASSED",
            "KSA validation result : PASSED",
            "QR validation result : PASSED",
            "SIGNATURE validation result : PASSED",
            "PIH validation result : FAILED",
            "CODE : KSA-13, MESSAGE : PIH is inValid <Invoice>SECRET XML</Invoice> -----BEGIN PRIVATE KEY-----SECRET-----END PRIVATE KEY-----",
            "GLOBAL VALIDATION RESULT = FAILED",
          ].join("\n"),
          stderr: "OTP 123456 binarySecurityToken SHOULD-REDACT",
          timedOut: false,
        };
      }
      throw new Error(`Unexpected SDK command: ${plan.args.join(" ")}`);
    });

    try {
      const result = await service.getInvoiceZatcaLocalSignedXmlValidationDryRun("org-1", "invoice-1");

      expect(result.executionEnabled).toBe(true);
      expect(result.executionAttempted).toBe(true);
      expect(result.signingExecutionStatus).toBe("SUCCEEDED_LOCALLY");
      expect(result.validationAttempted).toBe(true);
      expect(result.validationExitCode).toBe(1);
      expect(result.validationGlobalResult).toBe("FAILED");
      expect(result.validationResults).toMatchObject({
        xsd: "PASSED",
        en: "PASSED",
        ksa: "PASSED",
        qr: "PASSED",
        signature: "PASSED",
        pih: "FAILED",
        global: "FAILED",
      });
      expect(result.validationMessages).toEqual(expect.arrayContaining([expect.objectContaining({ code: "KSA-13", message: expect.stringContaining("PIH is inValid") })]));
      expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining("invoice metadata previous hash")]));
      expect(result.cleanup).toMatchObject({ performed: true, success: true, filesRetained: false });
      expect(existsSync(result.tempFilesWritten.tempDirectory as string)).toBe(false);
      expect(JSON.stringify(result)).not.toContain("SECRET XML");
      expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
      expect(JSON.stringify(result)).not.toContain("SECRET-CERT");
      expect(JSON.stringify(result)).not.toContain("123456");
      expect(JSON.stringify(result)).not.toContain("binarySecurityToken");
      expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
      expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    } finally {
      readinessSpy.mockRestore();
      executeSpy.mockRestore();
      rmSync(fixture.root, { recursive: true, force: true });
      if (previousFlag === undefined) {
        delete process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED;
      } else {
        process.env.ZATCA_SDK_SIGNING_EXECUTION_ENABLED = previousFlag;
      }
    }
  });

  it("seller readiness reports BR-KSA-08 missing and invalid seller identification", async () => {
    const missingPrisma = makeInvoiceReadinessPrisma({
      profile: { companyIdType: null, companyIdNumber: null },
    });
    const missingService = new ZatcaService(missingPrisma as never, { log: jest.fn() } as never);

    const missingReadiness = await missingService.getInvoiceZatcaReadiness("org-1", "invoice-1");

    expect(missingReadiness.sellerProfile.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ZATCA_SELLER_IDENTIFICATION_MISSING",
          severity: "WARNING",
          sourceRule: "BR-KSA-08",
        }),
      ]),
    );

    const invalidPrisma = makeInvoiceReadinessPrisma({
      profile: { companyIdType: "BAD", companyIdNumber: "CRN-123" },
    });
    const invalidService = new ZatcaService(invalidPrisma as never, { log: jest.fn() } as never);

    const invalidReadiness = await invalidService.getInvoiceZatcaReadiness("org-1", "invoice-1");

    expect(invalidReadiness.sellerProfile.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ZATCA_SELLER_IDENTIFICATION_SCHEME_INVALID",
          severity: "WARNING",
          sourceRule: "BR-KSA-08",
        }),
        expect.objectContaining({
          code: "ZATCA_SELLER_IDENTIFICATION_NUMBER_INVALID",
          severity: "WARNING",
          sourceRule: "BR-KSA-08",
        }),
      ]),
    );
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

  it("reports signed artifact storage evidence completeness as blocked when required evidence is missing", async () => {
    const { service, prisma, onboardingAdapter } = makeEvidenceCompletenessService([]);

    const result = await service.getSignedArtifactStorageEvidenceCompleteness("org-1");

    expect(result).toMatchObject({
      localOnly: true,
      readOnly: true,
      noMutation: true,
      noSignedXmlBody: true,
      noQrPayloadBody: true,
      bodyPersistenceAllowed: false,
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      productionCompliance: false,
      completenessStatus: "BLOCKED",
      evidenceCompletenessStatus: "BLOCKED",
    });
    expect(result.requiredEvidenceTypes).toEqual(requiredStorageControlEvidenceTypesForTest());
    expect(result.missingEvidenceTypes).toEqual(requiredStorageControlEvidenceTypesForTest());
    expect(result.verifiedEvidenceTypes).toEqual([]);
    expect(result.bodyPersistenceGate.allowed).toBe(false);
    expect(result.bodyPersistenceGate.reasons.join(" ")).toContain("Evidence completeness is BLOCKED");
    expect(JSON.stringify(result)).not.toContain("<Invoice");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
    expect(prisma.zatcaSignedArtifactStorageControlEvidence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
  });

  it("does not count draft or revoked evidence toward signed artifact storage completeness", async () => {
    const { service } = makeEvidenceCompletenessService([
      makeStorageControlEvidence({
        id: "draft-storage-probe",
        status: ZatcaSignedArtifactStorageControlEvidenceStatus.DRAFT,
        evidenceType: ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE,
      }),
      makeStorageControlEvidence({
        id: "revoked-access-control",
        status: ZatcaSignedArtifactStorageControlEvidenceStatus.REVOKED,
        evidenceType: ZatcaSignedArtifactStorageControlEvidenceType.ACCESS_CONTROL,
        revokedAt: new Date("2026-05-17T02:00:00.000Z"),
      }),
    ]);

    const result = await service.getSignedArtifactStorageEvidenceCompleteness("org-1");

    expect(result.completenessStatus).toBe("BLOCKED");
    expect(result.draftEvidenceTypes).toContain(ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE);
    expect(result.revokedEvidenceTypes).toContain(ZatcaSignedArtifactStorageControlEvidenceType.ACCESS_CONTROL);
    expect(result.missingEvidenceTypes).toEqual(
      expect.arrayContaining([
        ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE,
        ZatcaSignedArtifactStorageControlEvidenceType.ACCESS_CONTROL,
      ]),
    );
    expect(result.verifiedEvidenceTypes).not.toContain(ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE);
    expect(result.verifiedEvidenceTypes).not.toContain(ZatcaSignedArtifactStorageControlEvidenceType.ACCESS_CONTROL);
  });

  it("reports complete-for-review when every required evidence type is verified but keeps body persistence blocked", async () => {
    const verifiedEvidence = requiredStorageControlEvidenceTypesForTest().map((evidenceType, index) =>
      makeStorageControlEvidence({
        id: `verified-${index}`,
        status: ZatcaSignedArtifactStorageControlEvidenceStatus.VERIFIED,
        evidenceType,
        verifiedAt: new Date("2026-05-17T03:00:00.000Z"),
      }),
    );
    const { service } = makeEvidenceCompletenessService(verifiedEvidence);

    const result = await service.getSignedArtifactStorageEvidenceCompleteness("org-1");

    expect(result.completenessStatus).toBe("COMPLETE_FOR_REVIEW");
    expect(result.evidenceCompletenessStatus).toBe("COMPLETE_FOR_REVIEW");
    expect(result.verifiedEvidenceTypes).toEqual(requiredStorageControlEvidenceTypesForTest());
    expect(result.missingEvidenceTypes).toEqual([]);
    expect(result.bodyPersistenceAllowed).toBe(false);
    expect(result.signedXmlBodyPersistenceAllowed).toBe(false);
    expect(result.qrPayloadBodyPersistenceAllowed).toBe(false);
    expect(result.productionCompliance).toBe(false);
    expect(result.bodyPersistenceGate.allowed).toBe(false);
    expect(result.bodyPersistenceGate.reasons.join(" ")).toContain("Signed XML/QR body persistence is not implemented");
  });

  it("includes evidence completeness in immutable policy, storage, and probe plans while the body gate remains blocked", async () => {
    const prisma = {
      ...makeInvoiceReadinessPrisma(),
      zatcaSignedArtifactStoragePolicyApproval: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      zatcaSignedArtifactStorageControlEvidence: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, onboardingAdapter as never);

    const immutablePlan = await service.getSignedArtifactImmutableStoragePolicyPlan("org-1");
    const probePlan = await service.getSignedArtifactStorageProbePlan("org-1");
    const storagePlan = await service.getInvoiceZatcaSignedArtifactStoragePlan("org-1", "invoice-1");

    for (const plan of [immutablePlan, probePlan, storagePlan]) {
      expect(plan.evidenceCompletenessStatus).toBe("BLOCKED");
      expect(plan.requiredEvidenceTypes).toEqual(requiredStorageControlEvidenceTypesForTest());
      expect(plan.missingEvidenceTypes).toEqual(requiredStorageControlEvidenceTypesForTest());
      expect(plan.bodyPersistenceAllowed).toBe(false);
      expect(plan.bodyPersistenceGate.allowed).toBe(false);
      expect(plan.productionCompliance).toBe(false);
    }
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
  });

  it("returns a sanitized compliance CSID request plan without exposing secrets or making requests", async () => {
    const approvedReview = makeCsrConfigReview({ status: ZatcaCsrConfigReviewStatus.APPROVED });
    const egsUnit = makeEgsUnit({
      environment: "SANDBOX",
      status: ZatcaRegistrationStatus.ACTIVE,
      isActive: true,
      csrCommonName: "TST-Org",
      csrSerialNumber: "1-TST|2-TST|3-TST",
      csrOrganizationUnitName: "Riyadh Branch",
      csrInvoiceType: "1100",
      csrLocationAddress: "Riyadh",
      csrPem: "-----BEGIN CERTIFICATE REQUEST-----SECRET_CSR-----END CERTIFICATE REQUEST-----",
      complianceCsidPem: "-----BEGIN CERTIFICATE-----SECRET_CERT-----END CERTIFICATE-----",
      privateKeyPem: "-----BEGIN PRIVATE KEY-----SECRET_PRIVATE_KEY-----END PRIVATE KEY-----",
    });
    const service = new ZatcaService(makeComplianceCsidPlanPrisma(egsUnit, approvedReview) as never, { log: jest.fn() } as never, makeNoopOnboardingAdapter() as never);

    const plan = await service.getEgsUnitComplianceCsidRequestPlan("org-1", "egs-1");
    const serialized = JSON.stringify(plan);

    expect(plan.localOnly).toBe(true);
    expect(plan.dryRun).toBe(true);
    expect(plan.noNetwork).toBe(true);
    expect(plan.noCsidRequest).toBe(true);
    expect(plan.productionCompliance).toBe(false);
    expect(plan.plannedHeadersRedacted).toEqual(expect.arrayContaining([expect.objectContaining({ name: "OTP", value: "[REDACTED_OTP]" })]));
    expect(plan.plannedBodyFieldsRedacted).toEqual(expect.arrayContaining([expect.objectContaining({ name: "csr", value: "[REDACTED_CSR_BODY]" })]));
    expect(serialized).not.toContain("SECRET_PRIVATE_KEY");
    expect(serialized).not.toContain("SECRET_CERT");
    expect(serialized).not.toContain("SECRET_CSR");
    expect(serialized).not.toContain("000000");
  });

  it("blocks compliance CSID planning for production EGS units and missing OTP without network calls", async () => {
    const egsUnit = makeEgsUnit({
      environment: "PRODUCTION",
      status: ZatcaRegistrationStatus.ACTIVE,
      isActive: true,
      csrPem: "CSR-BODY",
    });
    const onboardingAdapter = makeNoopOnboardingAdapter();
    const service = new ZatcaService(makeComplianceCsidPlanPrisma(egsUnit, null) as never, { log: jest.fn() } as never, onboardingAdapter as never);

    const plan = await service.getEgsUnitComplianceCsidRequestPlan("org-1", "egs-1");

    expect(plan.blockers.join(" ")).toContain("production");
    expect(plan.blockers.join(" ")).toContain("OTP");
    expect(plan.noNetwork).toBe(true);
    expect(plan.noCsidRequest).toBe(true);
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
  });

  it("skips compliance CSID execution dry-run when the sandbox gate is disabled", async () => {
    const originalFlag = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    delete process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    const prisma = makeComplianceCsidPlanPrisma(makeEgsUnit({ csrPem: "CSR-BODY", status: ZatcaRegistrationStatus.ACTIVE, isActive: true }), null);
    const onboardingAdapter = makeNoopOnboardingAdapter();
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, onboardingAdapter as never);

    const result = await service.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1");

    expect(result.executionEnabled).toBe(false);
    expect(result.executionAttempted).toBe(false);
    expect(result.executionStatus).toBe("SKIPPED_DISABLED");
    expect(result.noMutation).toBe(true);
    expect(result.noNetwork).toBe(true);
    expect(result.noCsidRequest).toBe(true);
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    restoreEnv("ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED", originalFlag);
  });

  it("includes compliance CSID onboarding blockers in ZATCA readiness", async () => {
    const prisma = {
      ...makeReadinessPrisma(),
      zatcaCsrConfigReview: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, makeNoopOnboardingAdapter() as never);

    const readiness = await service.getZatcaReadinessSummary("org-1");

    expect(readiness.complianceCsidOnboarding.status).toBe("BLOCKED");
    expect(readiness.complianceCsidOnboarding.checks.map((check) => check.code)).toEqual(
      expect.arrayContaining(["ZATCA_COMPLIANCE_CSID_OTP_REQUIRED", "ZATCA_COMPLIANCE_CSID_ONBOARDING_EXECUTION_DISABLED"]),
    );
    expect(readiness.productionCompliance).toBe(false);
  });
  it("validates OTP only for mock compliance CSID dry-run mode", async () => {
    const planOnly = plainToInstance(ComplianceCsidRequestDryRunDto, { mode: "plan" });
    await expect(validate(planOnly)).resolves.toHaveLength(0);

    const realOnly = plainToInstance(ComplianceCsidRequestDryRunDto, { mode: "real" });
    expect(await validate(realOnly)).not.toHaveLength(0);

    const validReal = plainToInstance(ComplianceCsidRequestDryRunDto, { mode: "real", otp: "123456" });
    await expect(validate(validReal)).resolves.toHaveLength(0);

    const validMock = plainToInstance(ComplianceCsidRequestDryRunDto, { mode: "mock", otp: " 123456 " });
    await expect(validate(validMock)).resolves.toHaveLength(0);
    expect(validMock.otp).toBe("123456");

    const blankMock = plainToInstance(ComplianceCsidRequestDryRunDto, { mode: "mock", otp: "   " });
    expect(await validate(blankMock)).not.toHaveLength(0);

    const unsafeMock = plainToInstance(ComplianceCsidRequestDryRunDto, { mode: "mock", otp: "12345\n" });
    expect(await validate(unsafeMock)).not.toHaveLength(0);
  });

  it("skips compliance CSID mock dry-run when sandbox gate is disabled", async () => {
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "false";
    try {
      const egs = makeMockComplianceCsidReadyEgs();
      const review = makeCsrConfigReview({ status: ZatcaCsrConfigReviewStatus.APPROVED });
      const prisma = makeComplianceCsidPlanPrisma(egs, review);
      const adapter = makeNoopOnboardingAdapter();
      const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, adapter as never);

      const result = await service.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1", { mode: "mock", otp: "123456" });

      expect(result.executionEnabled).toBe(false);
      expect(result.executionAttempted).toBe(false);
      expect(result.executionStatus).toBe("SKIPPED_DISABLED");
      expect(result.requestMapperReady).toBe(true);
      expect(result.requestContract.method).toBe("POST");
      expect(result.requestContract.endpointPath).toBe("/compliance");
      expect(result.noNetwork).toBe(true);
      expect(result.noMutation).toBe(true);
      expect(adapter.requestComplianceCsid).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    } finally {
      process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
    }
  });

  it("returns a request mapper summary for compliance CSID plan mode without calling any adapter", async () => {
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "true";
    try {
      const egs = makeMockComplianceCsidReadyEgs();
      const review = makeCsrConfigReview({ status: ZatcaCsrConfigReviewStatus.APPROVED });
      const prisma = makeComplianceCsidPlanPrisma(egs, review);
      const adapter = makeNoopOnboardingAdapter();
      const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, adapter as never);
      const plan = await service.getEgsUnitComplianceCsidRequestPlan("org-1", "egs-1");
      review.configHash = plan.csrStatus.configHash;

      const result = await service.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1", { mode: "plan" });
      const serialized = JSON.stringify(result);

      expect(result.executionEnabled).toBe(true);
      expect(result.executionAttempted).toBe(false);
      expect(result.executionStatus).toBe("PLAN_ONLY");
      expect(result.requestMapperReady).toBe(true);
      expect(result.responseMapperReady).toBe(true);
      expect(result.requestContract.method).toBe("POST");
      expect(result.requestContract.endpointPath).toBe("/compliance");
      expect(result.requestContract.redactedHeaders).toEqual(expect.arrayContaining([expect.objectContaining({ name: "OTP", value: "[REDACTED_OTP]" })]));
      expect(result.requestContract.redactedBody).toEqual(expect.arrayContaining([expect.objectContaining({ name: "csr", value: "[REDACTED_CSR_BODY]" })]));
      expect(serialized).not.toContain("CSR-BODY");
      expect(serialized).not.toContain("123456");
      expect(adapter.requestComplianceCsid).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    } finally {
      process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
    }
  });

  it("runs only the local mock compliance CSID adapter when explicitly gated and redacts sensitive output", async () => {
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "true";
    try {
      const egs = makeMockComplianceCsidReadyEgs();
      const review = makeCsrConfigReview({ status: ZatcaCsrConfigReviewStatus.APPROVED });
      const prisma = makeComplianceCsidPlanPrisma(egs, review);
      const adapter = makeNoopOnboardingAdapter();
      const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, adapter as never);
      const plan = await service.getEgsUnitComplianceCsidRequestPlan("org-1", "egs-1");
      review.configHash = plan.csrStatus.configHash;

      const result = await service.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1", { mode: "mock", otp: "123456" });
      const serialized = JSON.stringify(result);

      expect(result.executionEnabled).toBe(true);
      expect(result.executionAttempted).toBe(true);
      expect(result.executionStatus).toBe("MOCK_SUCCEEDED");
      expect(result.mockAdapterCalled).toBe(true);
      expect((result as any).hasBinarySecurityToken).toBe(true);
      expect((result as any).hasSecret).toBe(true);
      expect((result as any).hasCertificate).toBe(true);
      expect(result.requestContract.method).toBe("POST");
      expect(result.requestContract.endpointPath).toBe("/compliance");
      expect((result as any).responseContract.hasBinarySecurityToken).toBe(true);
      expect((result as any).responseContract.tokenReturned).toBe(false);
      expect(result.tokenReturned).toBe(false);
      expect(result.secretReturned).toBe(false);
      expect(result.certificateBodyReturned).toBe(false);
      expect(result.otpReturned).toBe(false);
      expect(result.csrReturned).toBe(false);
      expect(serialized).not.toContain("123456");
      expect(serialized).not.toContain("CSR-BODY");
      expect(serialized).not.toContain("BEGIN CERTIFICATE");
      expect(serialized).not.toContain("LOCAL-MOCK-SECRET");
      expect(serialized).not.toContain("BINARY-SECURITY-TOKEN");
      expect(adapter.requestComplianceCsid).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    } finally {
      process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
    }
  });

  it("blocks real compliance CSID dry-run mode before any network-capable adapter call", async () => {
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "true";
    try {
      const egs = makeMockComplianceCsidReadyEgs();
      const review = makeCsrConfigReview({ status: ZatcaCsrConfigReviewStatus.APPROVED });
      const prisma = makeComplianceCsidPlanPrisma(egs, review);
      const adapter = makeNoopOnboardingAdapter();
      const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, adapter as never);
      const plan = await service.getEgsUnitComplianceCsidRequestPlan("org-1", "egs-1");
      review.configHash = plan.csrStatus.configHash;

      const result = await service.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1", { mode: "real", otp: "123456" });
      const serialized = JSON.stringify(result);

      expect(result.executionAttempted).toBe(false);
      expect(result.executionStatus).toBe("BLOCKED_REAL_HTTP_NOT_IMPLEMENTED");
      expect(result.realNetworkCalled).toBe(false);
      expect(result.noNetwork).toBe(true);
      expect(result.requestContract.method).toBe("POST");
      expect(result.requestContract.endpointPath).toBe("/compliance");
      expect(serialized).not.toContain("123456");
      expect(serialized).not.toContain("CSR-BODY");
      expect(adapter.requestComplianceCsid).not.toHaveBeenCalled();
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    } finally {
      process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
    }
  });

  it("blocks compliance CSID mock dry-run for production EGS and missing CSR prerequisites", async () => {
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "true";
    try {
      const review = makeCsrConfigReview({ status: ZatcaCsrConfigReviewStatus.APPROVED });
      const productionPrisma = makeComplianceCsidPlanPrisma(makeMockComplianceCsidReadyEgs({ environment: "PRODUCTION" }), review);
      const productionService = new ZatcaService(productionPrisma as never, { log: jest.fn() } as never, makeNoopOnboardingAdapter() as never);
      const productionResult = await productionService.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1", { mode: "mock", otp: "123456" });
      expect(productionResult.executionAttempted).toBe(false);
      expect(productionResult.executionStatus).toBe("BLOCKED_PRECONDITION");
      expect(productionResult.blockers.join(" ")).toContain("Production");

      const missingCsrPrisma = makeComplianceCsidPlanPrisma(makeMockComplianceCsidReadyEgs({ csrPem: null }), review);
      const missingCsrService = new ZatcaService(missingCsrPrisma as never, { log: jest.fn() } as never, makeNoopOnboardingAdapter() as never);
      const missingCsrResult = await missingCsrService.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1", { mode: "mock", otp: "123456" });
      expect(missingCsrResult.executionAttempted).toBe(false);
      expect(missingCsrResult.executionStatus).toBe("BLOCKED_PRECONDITION");
      expect(missingCsrResult.blockers.join(" ")).toContain("CSR");
    } finally {
      process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
    }
  });

  it("sanitizes compliance CSID mock adapter errors", async () => {
    const previous = process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED;
    process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = "true";
    try {
      const egs = makeMockComplianceCsidReadyEgs();
      const review = makeCsrConfigReview({ status: ZatcaCsrConfigReviewStatus.APPROVED });
      const prisma = makeComplianceCsidPlanPrisma(egs, review);
      const service = new ZatcaService(prisma as never, { log: jest.fn() } as never, makeNoopOnboardingAdapter() as never);
      const plan = await service.getEgsUnitComplianceCsidRequestPlan("org-1", "egs-1");
      review.configHash = plan.csrStatus.configHash;

      const result = await service.getEgsUnitComplianceCsidRequestDryRun("org-1", "egs-1", {
        mode: "mock",
        otp: "123456",
        mockScenario: "invalid-otp",
      });
      const serialized = JSON.stringify(result);

      expect(result.executionStatus).toBe("MOCK_FAILED");
      expect((result as any).adapterError.message).toContain("OTP");
      expect(serialized).not.toContain("123456");
      expect(serialized).not.toContain("CSR-BODY");
      expect(serialized).not.toContain("BEGIN CERTIFICATE");
      expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
      expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    } finally {
      process.env.ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED = previous;
    }
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
  zatcaInvoiceType?: ZatcaInvoiceType;
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
          zatcaInvoiceType: options.zatcaInvoiceType ?? ZatcaInvoiceType.STANDARD_TAX_INVOICE,
          icv: null,
          xmlBase64: null,
          qrCodeBase64: null,
          invoiceHash: null,
          generatedAt: null,
          hashModeSnapshot: "LOCAL_DETERMINISTIC",
        },
      ),
      findUniqueOrThrow: jest.fn().mockResolvedValue(options.existingMetadata ?? makeGeneratedMetadata()),
      findFirst: jest.fn().mockResolvedValue(options.existingMetadata ?? makeGeneratedMetadata()),
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
    zatcaSignedArtifactDraft: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue(makeSignedArtifactDraft()),
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

function makeCsrConfigReview(overrides: Record<string, unknown> = {}) {
  return {
    id: "review-1",
    organizationId: "org-1",
    egsUnitId: "egs-1",
    status: ZatcaCsrConfigReviewStatus.DRAFT,
    configHash: "stale-hash",
    configPreviewRedacted: "csr.common.name=TST-Org\n",
    configKeyOrder: [],
    missingFieldsJson: [],
    reviewFieldsJson: [],
    blockersJson: [],
    warningsJson: [],
    approvedById: null,
    approvedAt: null,
    revokedById: null,
    revokedAt: null,
    note: null,
    createdAt: new Date("2026-05-17T00:00:00.000Z"),
    updatedAt: new Date("2026-05-17T00:00:00.000Z"),
    approvedBy: null,
    revokedBy: null,
    ...overrides,
  };
}

function makeMockComplianceCsidReadyEgs(overrides: Record<string, unknown> = {}) {
  return makeEgsUnit({
    environment: "SANDBOX",
    csrCommonName: "TST-886431145-399999999900003",
    csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
    csrOrganizationUnitName: "Riyadh Branch",
    csrInvoiceType: "1100",
    csrLocationAddress: "RRRD2929",
    csrPem: "-----BEGIN CERTIFICATE REQUEST-----\nCSR-BODY\n-----END CERTIFICATE REQUEST-----",
    ...overrides,
  });
}
function makeComplianceCsidPlanPrisma(egsUnit: Record<string, unknown>, review: Record<string, unknown> | null) {
  return {
    organization: {
      findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: "Org Legal", taxNumber: "300000000000003", countryCode: "SA" }),
    },
    zatcaOrganizationProfile: {
      findFirst: jest.fn().mockResolvedValue({
        sellerName: "Org Legal",
        vatNumber: "300000000000003",
        countryCode: "SA",
        businessCategory: "Technology",
      }),
    },
    zatcaEgsUnit: {
      findFirst: jest.fn().mockResolvedValue(egsUnit),
      update: jest.fn(),
    },
    zatcaCsrConfigReview: {
      findFirst: jest.fn((args: { where?: { status?: ZatcaCsrConfigReviewStatus } }) =>
        Promise.resolve(args.where?.status === ZatcaCsrConfigReviewStatus.APPROVED ? (review?.status === ZatcaCsrConfigReviewStatus.APPROVED ? review : null) : review),
      ),
    },
    zatcaSubmissionLog: {
      create: jest.fn(),
    },
  };
}

function makeNoopOnboardingAdapter() {
  return {
    requestComplianceCsid: jest.fn(),
    requestProductionCsid: jest.fn(),
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
    zatcaSignedArtifactDraft: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue(makeSignedArtifactDraft()),
    },
  };
}

function makeLocalSigningSdkFixture(options: { includeDummyMaterial: boolean; includeLauncher?: boolean; pathWithSpaces?: boolean }) {
  const root = mkdtempSync(join(tmpdir(), options.pathWithSpaces ? "ledgerbyte zatca signing test-" : "ledgerbyte-zatca-signing-test-"));
  const sdkRootPath = join(root, "zatca-einvoicing-sdk-Java-238-R3.4.8");
  const appsDir = join(sdkRootPath, "Apps");
  const configDirPath = join(sdkRootPath, "Configuration");
  const certificateDir = join(sdkRootPath, "Data", "Certificates");
  const schemasDir = join(sdkRootPath, "Data", "Schemas", "xsds", "UBL2.1", "xsd", "maindoc");
  const schematronDir = join(sdkRootPath, "Data", "Rules", "Schematrons");
  const inputDir = join(sdkRootPath, "Data", "Input");
  const pihDir = join(sdkRootPath, "Data", "PIH");
  for (const dir of [appsDir, configDirPath, certificateDir, schemasDir, schematronDir, inputDir, pihDir]) {
    mkdirSync(dir, { recursive: true });
  }
  const sdkJarPath = join(appsDir, "zatca-einvoicing-sdk-test.jar");
  writeFileSync(sdkJarPath, "not-a-real-jar", "utf8");
  const launcherPath = join(appsDir, "fatoora.bat");
  const jqPath = join(appsDir, "jq.exe");
  if (options.includeLauncher) {
    writeFileSync(launcherPath, "@echo off\n", "utf8");
    writeFileSync(jqPath, "not-real-jq", "utf8");
    writeFileSync(join(appsDir, "global.json"), JSON.stringify({ version: "test" }), "utf8");
  }
  writeFileSync(join(configDirPath, "usage.txt"), "[-sign]\n[-qr]\n", "utf8");
  writeFileSync(join(schemasDir, "UBL-Invoice-2.1.xsd"), "<schema />", "utf8");
  writeFileSync(join(schematronDir, "CEN-EN16931-UBL.xsl"), "<xsl />", "utf8");
  writeFileSync(join(schematronDir, "20210819_ZATCA_E-invoice_Validation_Rules.xsl"), "<xsl />", "utf8");
  writeFileSync(join(pihDir, "pih.txt"), "previous-hash", "utf8");
  writeFileSync(
    join(configDirPath, "config.json"),
    JSON.stringify({
      xsdPath: "C:\\SDK\\Data\\Schemas\\xsds\\UBL2.1\\xsd\\maindoc\\UBL-Invoice-2.1.xsd",
      enSchematron: "C:\\SDK\\Data\\Rules\\Schematrons\\CEN-EN16931-UBL.xsl",
      zatcaSchematron: "C:\\SDK\\Data\\Rules\\Schematrons\\20210819_ZATCA_E-invoice_Validation_Rules.xsl",
      certPath: "C:\\SDK\\Data\\Certificates\\cert.pem",
      privateKeyPath: "C:\\SDK\\Data\\Certificates\\ec-secp256k1-priv-key.pem",
      pihPath: "C:\\SDK\\Data\\PIH\\pih.txt",
      inputPath: "C:\\SDK\\Data\\Input",
      usagePathFile: "C:\\SDK\\Configuration\\usage.txt",
    }),
    "utf8",
  );
  if (options.includeDummyMaterial) {
    writeFileSync(join(certificateDir, "cert.pem"), "-----BEGIN CERTIFICATE-----\nDUMMY\n-----END CERTIFICATE-----", "utf8");
    writeFileSync(join(certificateDir, "ec-secp256k1-priv-key.pem"), "-----BEGIN EC PRIVATE KEY-----\nDUMMY\n-----END EC PRIVATE KEY-----", "utf8");
  }

  return {
    root,
    readiness: {
      enabled: true,
      referenceFolderFound: true,
      sdkJarFound: true,
      fatooraLauncherFound: Boolean(options.includeLauncher),
      jqFound: Boolean(options.includeLauncher),
      configDirFound: true,
      workingDirectoryWritable: true,
      supportedCommandsKnown: true,
      javaFound: true,
      javaVersion: "11.0.22",
      javaMajorVersion: 11,
      javaVersionSupported: true,
      detectedJavaVersion: "11.0.22",
      javaSupported: true,
      requiredJavaRange: ">=11 <15",
      javaBinUsed: "java",
      javaBlockerMessage: null,
      sdkCommand: "fatoora -validate -invoice <filename>",
      projectPathHasSpaces: false,
      canAttemptSdkValidation: true,
      canRunLocalValidation: true,
      blockingReasons: [],
      warnings: [],
      suggestedFixes: [],
      referenceFolderPath: root,
      sdkRootPath,
      sdkJarPath,
      fatooraLauncherPath: options.includeLauncher ? launcherPath : undefined,
      jqPath: options.includeLauncher ? jqPath : undefined,
      configDirPath,
      workDir: join(root, "work"),
      javaCommand: "java",
      timeoutMs: 1000,
      projectRoot: root,
    } as ReturnType<typeof ZatcaSdkPaths.discoverZatcaSdkReadiness>,
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

function makeSignedArtifactDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft-1",
    organizationId: "org-1",
    invoiceId: "invoice-1",
    metadataId: "metadata-1",
    status: "PLANNED",
    source: "LOCAL_DRY_RUN",
    signedXmlStorageKey: null,
    signedXmlSha256: null,
    signedXmlSizeBytes: null,
    qrPayloadStorageKey: null,
    qrPayloadSha256: null,
    validationGlobalResult: null,
    validationResultsJson: null,
    signedWithDummyMaterial: true,
    productionCompliance: false,
    promotionBlockedReason:
      "Metadata-only draft. Signed XML and QR body persistence remain blocked until production storage and promotion are implemented.",
    createdById: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdBy: {
      id: "user-1",
      name: "Demo User",
      email: "demo@example.com",
    },
    ...overrides,
  };
}

function makeStorageControlEvidence(overrides: Record<string, unknown> = {}) {
  return {
    id: "evidence-1",
    organizationId: "org-1",
    policyApprovalId: null,
    status: ZatcaSignedArtifactStorageControlEvidenceStatus.DRAFT,
    evidenceType: ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE,
    provider: "s3-compatible",
    bucketNameRedacted: "ledgerbyte-test-[redacted]",
    evidenceSummaryJson: { probeRan: true, testObjectOnly: true, noInvoiceData: true },
    evidenceHash: "evidence-hash-1",
    evidenceDocumentStorageKey: null,
    verifiedById: null,
    verifiedAt: null,
    revokedById: null,
    revokedAt: null,
    note: "Metadata-only storage probe evidence.",
    productionCompliance: false,
    signedXmlBodyPersistenceAllowed: false,
    qrPayloadBodyPersistenceAllowed: false,
    createdById: "user-1",
    createdAt: new Date("2026-05-17T00:00:00.000Z"),
    updatedAt: new Date("2026-05-17T00:00:00.000Z"),
    createdBy: {
      id: "user-1",
      name: "Demo User",
      email: "demo@example.com",
    },
    verifiedBy: null,
    revokedBy: null,
    policyApproval: null,
    ...overrides,
  };
}

function requiredStorageControlEvidenceTypesForTest() {
  return [
    ZatcaSignedArtifactStorageControlEvidenceType.OBJECT_VERSIONING,
    ZatcaSignedArtifactStorageControlEvidenceType.IMMUTABLE_RETENTION,
    ZatcaSignedArtifactStorageControlEvidenceType.ENCRYPTION_AT_REST,
    ZatcaSignedArtifactStorageControlEvidenceType.ACCESS_CONTROL,
    ZatcaSignedArtifactStorageControlEvidenceType.BACKUP_RESTORE,
    ZatcaSignedArtifactStorageControlEvidenceType.RESTORE_TEST,
    ZatcaSignedArtifactStorageControlEvidenceType.TENANT_KEY_SCOPING,
    ZatcaSignedArtifactStorageControlEvidenceType.DELETION_SUPERSESSION,
    ZatcaSignedArtifactStorageControlEvidenceType.STORAGE_PROBE,
  ];
}

function makeEvidenceCompletenessService(records: Array<ReturnType<typeof makeStorageControlEvidence>>) {
  const prisma = {
    zatcaSignedArtifactStoragePolicyApproval: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    zatcaSignedArtifactStorageControlEvidence: {
      findMany: jest.fn().mockResolvedValue(records),
    },
    zatcaSubmissionLog: {
      create: jest.fn(),
    },
  };
  const auditLogService = { log: jest.fn() };
  const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
  return {
    prisma,
    auditLogService,
    onboardingAdapter,
    service: new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never),
  };
}

function makeStoragePolicyApproval(overrides: Record<string, unknown> = {}) {
  return {
    id: "policy-approval-1",
    organizationId: "org-1",
    status: "DRAFT",
    policyVersion: "2026-05-17.metadata-only",
    policyHash: "policy-hash-1",
    policySummaryJson: {
      source: "SIGNED_ARTIFACT_IMMUTABLE_STORAGE_POLICY",
      retentionDuration: "LEGAL_ACCOUNTING_REVIEW_REQUIRED",
      noSignedXmlBodyPersistence: true,
      noQrPayloadBodyPersistence: true,
    },
    retentionDurationStatus: "REQUIRES_LEGAL_REVIEW",
    retentionDurationValue: null,
    objectVersioningApproved: false,
    immutableArchiveApproved: false,
    deletionPolicyApproved: false,
    supersessionPolicyApproved: false,
    accessControlApproved: false,
    encryptionAtRestApproved: false,
    backupRestoreApproved: false,
    archiveRestoreTested: false,
    signedXmlBodyPersistenceAllowed: false,
    qrPayloadBodyPersistenceAllowed: false,
    productionCompliance: false,
    approvedById: null,
    approvedAt: null,
    revokedById: null,
    revokedAt: null,
    createdById: "user-1",
    note: "Draft only.",
    createdAt: new Date("2026-05-17T00:00:00.000Z"),
    updatedAt: new Date("2026-05-17T00:00:00.000Z"),
    approvedBy: null,
    revokedBy: null,
    createdBy: {
      id: "user-1",
      name: "Demo User",
      email: "demo@example.com",
    },
    ...overrides,
  };
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
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
