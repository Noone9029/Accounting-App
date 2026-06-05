import { PERMISSIONS } from "@ledgerbyte/shared";
import { ContactType } from "@prisma/client";
import { SearchService } from "./search.service";

describe("SearchService", () => {
  it("returns customer and supplier contact results with separated open balances", async () => {
    const prisma = {
      contact: {
        findMany: jest.fn().mockResolvedValue([
          contact("customer-1", ContactType.CUSTOMER, "Alpha Customer"),
          contact("supplier-1", ContactType.SUPPLIER, "Alpha Supplier"),
          contact("both-1", ContactType.BOTH, "Alpha Trading"),
        ]),
      },
      salesInvoice: {
        groupBy: jest.fn().mockResolvedValue([
          { customerId: "customer-1", _sum: { balanceDue: "125.0000" } },
          { customerId: "both-1", _sum: { balanceDue: "75.0000" } },
        ]),
      },
      purchaseBill: {
        groupBy: jest.fn().mockResolvedValue([
          { supplierId: "supplier-1", _sum: { balanceDue: "200.0000" } },
          { supplierId: "both-1", _sum: { balanceDue: "50.0000" } },
        ]),
      },
    };
    const service = new SearchService(prisma as never);

    const result = await service.search("org-1", "alpha", [PERMISSIONS.contacts.view]);

    expect(result.results).toEqual([
      expect.objectContaining({ resultType: "Customer", href: "/customers/customer-1", amount: "125.0000" }),
      expect.objectContaining({ resultType: "Supplier", href: "/suppliers/supplier-1", amount: "200.0000" }),
      expect.objectContaining({ resultType: "Customer", href: "/customers/both-1", amount: "75.0000" }),
      expect.objectContaining({ resultType: "Supplier", href: "/suppliers/both-1", amount: "50.0000" }),
    ]);
    expect(prisma.contact.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }));
  });

  it("only queries and returns transaction sources allowed by permissions", async () => {
    const prisma = {
      contact: { findMany: jest.fn() },
      salesInvoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "invoice-1",
            invoiceNumber: "INV-001",
            issueDate: new Date("2026-05-01T00:00:00.000Z"),
            currency: "SAR",
            status: "FINALIZED",
            total: "115.0000",
            balanceDue: "25.0000",
            customer: { id: "customer-1", name: "Alpha Customer", displayName: null },
          },
        ]),
      },
      purchaseBill: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "bill-1",
            billNumber: "BILL-001",
            billDate: new Date("2026-05-02T00:00:00.000Z"),
            currency: "SAR",
            status: "FINALIZED",
            total: "230.0000",
            balanceDue: "130.0000",
            supplier: { id: "supplier-1", name: "Alpha Supplier", displayName: null },
          },
        ]),
      },
      cashExpense: { findMany: jest.fn() },
      customerPayment: { findMany: jest.fn() },
      supplierPayment: { findMany: jest.fn() },
      creditNote: { findMany: jest.fn() },
      purchaseOrder: { findMany: jest.fn() },
      deliveryNote: { findMany: jest.fn().mockResolvedValue([]) },
      collectionCase: { findMany: jest.fn().mockResolvedValue([]) },
      journalEntry: { findMany: jest.fn() },
    };
    const service = new SearchService(prisma as never);

    const result = await service.search("org-1", "alpha", [PERMISSIONS.salesInvoices.view, PERMISSIONS.purchaseBills.view]);

    expect(result.results).toEqual([
      expect.objectContaining({ resultType: "Bill", href: "/purchases/bills/bill-1", detail: "Alpha Supplier", amount: "230.0000" }),
      expect.objectContaining({ resultType: "Invoice", href: "/sales/invoices/invoice-1", detail: "Alpha Customer", amount: "115.0000" }),
    ]);
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
    expect(prisma.cashExpense.findMany).not.toHaveBeenCalled();
    expect(prisma.journalEntry.findMany).not.toHaveBeenCalled();
  });

  it("returns delivery note records as non-posting sales workflow results", async () => {
    const prisma = {
      contact: { findMany: jest.fn() },
      salesInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseBill: { findMany: jest.fn() },
      cashExpense: { findMany: jest.fn() },
      customerPayment: { findMany: jest.fn() },
      supplierPayment: { findMany: jest.fn() },
      creditNote: { findMany: jest.fn() },
      purchaseOrder: { findMany: jest.fn() },
      deliveryNote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "dn-1",
            deliveryNoteNumber: "DN-000001",
            issueDate: new Date("2026-06-04T00:00:00.000Z"),
            deliveryDate: new Date("2026-06-05T00:00:00.000Z"),
            status: "ISSUED",
            customer: { id: "customer-1", name: "Alpha Customer", displayName: null },
          },
        ]),
      },
      collectionCase: { findMany: jest.fn().mockResolvedValue([]) },
      journalEntry: { findMany: jest.fn() },
    };
    const service = new SearchService(prisma as never);

    const result = await service.search("org-1", "DN-000001", [PERMISSIONS.salesInvoices.view]);

    expect(result.results).toEqual([
      expect.objectContaining({
        resultType: "Delivery note",
        href: "/sales/delivery-notes/dn-1",
        amount: "0.0000",
        detail: "Alpha Customer",
      }),
    ]);
  });

  it("returns collection case records as Sales/AR follow-up workflow results", async () => {
    const prisma = {
      contact: { findMany: jest.fn() },
      salesInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseBill: { findMany: jest.fn() },
      cashExpense: { findMany: jest.fn() },
      customerPayment: { findMany: jest.fn() },
      supplierPayment: { findMany: jest.fn() },
      creditNote: { findMany: jest.fn() },
      purchaseOrder: { findMany: jest.fn() },
      deliveryNote: { findMany: jest.fn().mockResolvedValue([]) },
      collectionCase: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "case-1",
            caseNumber: "COL-000001",
            status: "PROMISED_TO_PAY",
            priority: "HIGH",
            nextActionAt: new Date("2026-06-10T00:00:00.000Z"),
            followUpDate: null,
            customer: { id: "customer-1", name: "Alpha Customer", displayName: null },
            salesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", balanceDue: "125.0000" },
          },
        ]),
      },
      journalEntry: { findMany: jest.fn() },
    };
    const service = new SearchService(prisma as never);

    const result = await service.search("org-1", "COL-000001", [PERMISSIONS.salesInvoices.view]);

    expect(result.results).toEqual([
      expect.objectContaining({
        resultType: "Collection case",
        href: "/sales/collections/case-1",
        label: "COL-000001",
        detail: "Alpha Customer / INV-000010",
        amount: "125.0000",
      }),
    ]);
    expect(JSON.stringify(result.results)).not.toMatch(/payment link|tax invoice|ZATCA|email sent/i);
  });

  it("returns no results for blank queries", async () => {
    const prisma = { contact: { findMany: jest.fn() } };
    const service = new SearchService(prisma as never);

    await expect(service.search("org-1", "  ", [PERMISSIONS.contacts.view])).resolves.toEqual({ query: "", results: [] });
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
  });
});

function contact(id: string, type: ContactType, name: string) {
  return {
    id,
    type,
    name,
    displayName: null,
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}
