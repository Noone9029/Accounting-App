import { BadRequestException } from "@nestjs/common";
import { ContactType } from "@prisma/client";
import { validate } from "class-validator";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";

describe("ContactService ZATCA address fields", () => {
  it("creates contacts with dedicated Saudi buyer address fields", async () => {
    const prisma = {
      contact: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "contact-1", ...data })),
      },
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ContactService(prisma as never, auditLogService as never);

    const contact = await service.create("org-1", "user-1", {
      type: ContactType.CUSTOMER,
      name: "Saudi Buyer",
      addressLine1: "King Abdullah Road",
      addressLine2: "Unit 12",
      buildingNumber: "1111",
      district: "Al Murooj",
      city: "Riyadh",
      postalCode: "12222",
      countryCode: "SA",
      identificationType: "CRN",
      identificationNumber: "1010010000",
    });

    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        countryCode: "SA",
        buildingNumber: "1111",
        district: "Al Murooj",
        addressLine2: "Unit 12",
        identificationType: "CRN",
        identificationNumber: "1010010000",
      }),
    });
    expect(contact).toMatchObject({ buildingNumber: "1111", district: "Al Murooj", identificationType: "CRN", identificationNumber: "1010010000" });
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "Contact" }));
  });

  it("updates dedicated address fields while existing contacts without building numbers remain valid", async () => {
    const existing = {
      id: "contact-1",
      organizationId: "org-1",
      type: ContactType.CUSTOMER,
      name: "Existing Buyer",
      buildingNumber: null,
      district: null,
      countryCode: "SA",
      identificationType: null,
      identificationNumber: null,
    };
    const prisma = {
      contact: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...existing, ...data })),
      },
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ContactService(prisma as never, auditLogService as never);

    const contact = await service.update("org-1", "user-1", "contact-1", {
      buildingNumber: "2222",
      district: "Al Olaya",
    });

    expect(prisma.contact.findFirst).toHaveBeenCalledWith({ where: { id: "contact-1", organizationId: "org-1" } });
    expect(prisma.contact.update).toHaveBeenCalledWith({ where: { id: "contact-1" }, data: { buildingNumber: "2222", district: "Al Olaya" } });
    expect(contact).toMatchObject({ buildingNumber: "2222", district: "Al Olaya" });
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entityType: "Contact",
        before: existing,
        after: expect.objectContaining({ buildingNumber: "2222", district: "Al Olaya" }),
      }),
    );
  });

  it("rejects mismatched or malformed contact ID values", async () => {
    const prisma = {
      contact: {
        create: jest.fn(),
      },
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ContactService(prisma as never, auditLogService as never);

    await expect(
      service.create("org-1", "user-1", {
        type: ContactType.CUSTOMER,
        name: "Bad ID",
        identificationType: "NAT",
        identificationNumber: "2000000000",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create("org-1", "user-1", {
        type: ContactType.CUSTOMER,
        name: "Missing ID Type",
        identificationNumber: "1010010000",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.contact.create).not.toHaveBeenCalled();
  });
});

describe("Contact VAT number validation", () => {
  async function validateContactTaxNumber(taxNumber: string) {
    const dto = Object.assign(new CreateContactDto(), {
      type: ContactType.CUSTOMER,
      name: "VAT Buyer",
      taxNumber,
    });

    return validate(dto);
  }

  it("accepts exactly 15 digits", async () => {
    await expect(validateContactTaxNumber("300000000000003")).resolves.toHaveLength(0);
  });

  it("rejects VAT numbers that are shorter, longer, or not digits only", async () => {
    await expect(validateContactTaxNumber("30000000000003")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "taxNumber" })]),
    );
    await expect(validateContactTaxNumber("3000000000000039")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "taxNumber" })]),
    );
    await expect(validateContactTaxNumber("3000000000000A3")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "taxNumber" })]),
    );
  });
});
