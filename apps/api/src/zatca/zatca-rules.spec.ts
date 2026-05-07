import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ZatcaInvoiceStatus, ZatcaRegistrationStatus } from "@prisma/client";
import { initialPreviousInvoiceHash } from "@ledgerbyte/zatca-core";
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
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" }) },
      zatcaOrganizationProfile: { upsert: jest.fn().mockResolvedValue({ id: "profile-1", environment: "SANDBOX" }) },
      zatcaEgsUnit: {
        create: jest.fn().mockResolvedValue({ id: "egs-1", name: "Dev EGS", isActive: false }),
        findFirst: jest.fn().mockResolvedValue({ id: "egs-1", name: "Dev EGS", csrPem: null, privateKeyPem: null, complianceCsidPem: null }),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          zatcaEgsUnit: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            update: jest.fn().mockResolvedValue({ id: "egs-1", isActive: true, status: ZatcaRegistrationStatus.ACTIVE }),
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
    expect(tx.zatcaEgsUnit.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastIcv: 5, lastInvoiceHash: expect.any(String) }) }));
    expect(tx.zatcaSubmissionLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestUrl: "local-generation-only" }) }));
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
});

function makeGenerationTransactionMock(options: {
  invoiceStatus?: "DRAFT" | "FINALIZED";
  sellerName?: string | null;
  vatNumber?: string | null;
  activeEgsLastIcv?: number;
  activeEgsLastInvoiceHash?: string | null;
  activeEgs?: null;
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
      upsert: jest.fn().mockResolvedValue({
        id: "metadata-1",
        invoiceUuid: "00000000-0000-0000-0000-000000000001",
        icv: null,
      }),
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
