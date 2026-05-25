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

describe("ContactService customer and supplier summaries", () => {
  const customer = contactFixture("customer-1", ContactType.CUSTOMER, "Alpha Customer");
  const supplier = contactFixture("supplier-1", ContactType.SUPPLIER, "Beta Supplier");
  const both = contactFixture("both-1", ContactType.BOTH, "Delta Trading");

  it("lists customer contacts with open and overdue receivable balances without supplier-only contacts", async () => {
    const prisma = {
      contact: {
        findMany: jest.fn().mockResolvedValue([customer, both]),
      },
      salesInvoice: {
        groupBy: jest.fn(({ where, _sum }) => {
          if (_sum) {
            return Promise.resolve(
              where.dueDate
                ? [{ customerId: "customer-1", _sum: { balanceDue: "25.0000" } }]
                : [
                    { customerId: "customer-1", _sum: { balanceDue: "125.0000" } },
                    { customerId: "both-1", _sum: { balanceDue: "75.0000" } },
                  ],
            );
          }

          return Promise.resolve([{ customerId: "customer-1", _max: { issueDate: new Date("2026-05-10T00:00:00.000Z") } }]);
        }),
      },
      creditNote: { groupBy: jest.fn().mockResolvedValue([]) },
      customerPayment: {
        groupBy: jest.fn().mockResolvedValue([{ customerId: "both-1", _max: { paymentDate: new Date("2026-05-12T00:00:00.000Z") } }]),
      },
      customerRefund: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = new ContactService(prisma as never, { log: jest.fn() } as never);

    const result = await service.listCustomers("org-1", new Date("2026-05-25T00:00:00.000Z"));

    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", type: { in: [ContactType.CUSTOMER, ContactType.BOTH] } },
      }),
    );
    expect(result.map((row) => row.contact.id)).toEqual(["customer-1", "both-1"]);
    expect(result[0]).toMatchObject({
      openReceivableBalance: "125.0000",
      overdueReceivableBalance: "25.0000",
      lastTransactionDate: "2026-05-10T00:00:00.000Z",
    });
    expect(result[1]).toMatchObject({
      openReceivableBalance: "75.0000",
      overdueReceivableBalance: "0.0000",
      lastTransactionDate: "2026-05-12T00:00:00.000Z",
    });
  });

  it("lists supplier contacts with open and overdue payable balances without customer-only contacts", async () => {
    const prisma = {
      contact: {
        findMany: jest.fn().mockResolvedValue([supplier, both]),
      },
      purchaseBill: {
        groupBy: jest.fn(({ where, _sum }) => {
          if (_sum) {
            return Promise.resolve(
              where.dueDate
                ? [{ supplierId: "supplier-1", _sum: { balanceDue: "40.0000" } }]
                : [
                    { supplierId: "supplier-1", _sum: { balanceDue: "200.0000" } },
                    { supplierId: "both-1", _sum: { balanceDue: "50.0000" } },
                  ],
            );
          }

          return Promise.resolve([{ supplierId: "supplier-1", _max: { billDate: new Date("2026-05-09T00:00:00.000Z") } }]);
        }),
      },
      purchaseDebitNote: { groupBy: jest.fn().mockResolvedValue([]) },
      supplierPayment: { groupBy: jest.fn().mockResolvedValue([]) },
      supplierRefund: {
        groupBy: jest.fn().mockResolvedValue([{ supplierId: "both-1", _max: { refundDate: new Date("2026-05-13T00:00:00.000Z") } }]),
      },
      cashExpense: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const service = new ContactService(prisma as never, { log: jest.fn() } as never);

    const result = await service.listSuppliers("org-1", new Date("2026-05-25T00:00:00.000Z"));

    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      }),
    );
    expect(result.map((row) => row.contact.id)).toEqual(["supplier-1", "both-1"]);
    expect(result[0]).toMatchObject({
      openPayableBalance: "200.0000",
      overduePayableBalance: "40.0000",
      lastTransactionDate: "2026-05-09T00:00:00.000Z",
    });
    expect(result[1]).toMatchObject({
      openPayableBalance: "50.0000",
      overduePayableBalance: "0.0000",
      lastTransactionDate: "2026-05-13T00:00:00.000Z",
    });
  });
});

function contactFixture(id: string, type: ContactType, name: string) {
  return {
    id,
    organizationId: "org-1",
    type,
    name,
    displayName: null,
    email: null,
    phone: null,
    taxNumber: null,
    identificationType: null,
    identificationNumber: null,
    addressLine1: null,
    addressLine2: null,
    buildingNumber: null,
    district: null,
    city: null,
    postalCode: null,
    countryCode: "SA",
    isActive: true,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  };
}
