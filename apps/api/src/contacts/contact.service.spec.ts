import { ContactType } from "@prisma/client";
import { ContactService } from "./contact.service";

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
    });

    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        countryCode: "SA",
        buildingNumber: "1111",
        district: "Al Murooj",
        addressLine2: "Unit 12",
      }),
    });
    expect(contact).toMatchObject({ buildingNumber: "1111", district: "Al Murooj" });
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
});
