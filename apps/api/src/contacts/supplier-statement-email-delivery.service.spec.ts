import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ContactType } from "@prisma/client";
import { SupplierStatementEmailDeliveryService } from "./supplier-statement-email-delivery.service";

describe("SupplierStatementEmailDeliveryService", () => {
  function makeService(contactType: ContactType = ContactType.SUPPLIER) {
    const prisma = {
      contact: {
        findFirst: jest.fn().mockResolvedValue({
          id: "supplier-1",
          organizationId: "org-1",
          type: contactType,
          name: "Supplier",
          displayName: "Supplier & Sons",
          email: "supplier@example.test",
        }),
      },
    };
    const statementData = {
      organization: { name: "Example Trading", baseCurrency: "SAR" },
      contact: { id: "supplier-1", name: "Supplier", displayName: "Supplier & Sons", type: contactType, email: "supplier@example.test" },
      contactLabel: "Supplier",
      currency: "SAR",
      periodFrom: "2026-07-01",
      periodTo: "2026-07-31",
      openingBalance: "100.00",
      closingBalance: "250.00",
      rows: [],
    };
    const contactLedgerService = {
      supplierStatementPdfData: jest.fn().mockResolvedValue(statementData),
      supplierStatementPdf: jest.fn().mockResolvedValue({
        document: {
          id: "document-1",
          filename: "supplier-statement-Supplier-Sons-2026-07-01-to-2026-07-31.pdf",
          mimeType: "application/pdf",
          sizeBytes: 123,
          contentHash: "hash-1",
        },
      }),
      supplierStatement: jest.fn(),
    };
    const documentDeliveryService = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistoryBySourcePrefix: jest.fn().mockResolvedValue([]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    const service = new SupplierStatementEmailDeliveryService(
      prisma as never,
      contactLedgerService as never,
      documentDeliveryService as never,
      config as never,
    );
    return { service, prisma, contactLedgerService, documentDeliveryService };
  }

  it.each([ContactType.SUPPLIER, ContactType.BOTH])("queues a statement for %s contacts with normalized period context", async (contactType) => {
    const { service, contactLedgerService, documentDeliveryService } = makeService(contactType);

    const result = await service.queue("org-1", "user-1", "supplier-1", {
      from: "2026-07-01",
      to: "2026-07-31",
      asOf: "2026-07-31",
      idempotencyKey: "client-key-123456",
    });

    expect(result).toMatchObject({ id: "delivery-1", contactId: "supplier-1", status: "QUEUED" });
    expect(contactLedgerService.supplierStatementPdf).toHaveBeenCalledWith("org-1", "user-1", "supplier-1", "2026-07-01", "2026-07-31", expect.anything());
    expect(documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "SupplierStatement",
      documentType: "SUPPLIER_STATEMENT",
      recipientEmail: "supplier@example.test",
      requestContext: { from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" },
      generatedDocument: expect.objectContaining({ id: "document-1" }),
    }));
    expect(contactLedgerService.supplierStatement).not.toHaveBeenCalled();
  });

  it("normalizes omitted to to asOf and rejects invalid statement bounds", async () => {
    const normalized = makeService();
    await normalized.service.queue("org-1", "user-1", "supplier-1", { asOf: "2026-07-31", idempotencyKey: "client-key-123456" });
    expect(normalized.documentDeliveryService.queue).toHaveBeenCalledWith(expect.objectContaining({ requestContext: { from: null, to: "2026-07-31", asOf: "2026-07-31" } }));

    const invalid = makeService();
    await expect(invalid.service.queue("org-1", "user-1", "supplier-1", { from: "2026-08-01", asOf: "2026-07-31", idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(invalid.contactLedgerService.supplierStatementPdf).not.toHaveBeenCalled();
  });

  it("rejects customer-only contacts and missing recipient before PDF generation", async () => {
    const customer = makeService(ContactType.CUSTOMER);
    customer.prisma.contact.findFirst.mockResolvedValue(null);
    await expect(customer.service.queue("org-1", "user-1", "supplier-1", { asOf: "2026-07-31", idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(NotFoundException);

    const missing = makeService();
    missing.prisma.contact.findFirst.mockResolvedValue({ id: "supplier-1", type: ContactType.SUPPLIER, name: "Supplier", displayName: "Supplier", email: null });
    await expect(missing.service.queue("org-1", "user-1", "supplier-1", { asOf: "2026-07-31", idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(missing.contactLedgerService.supplierStatementPdf).not.toHaveBeenCalled();
  });

  it("replays before regenerating the archived PDF", async () => {
    const { service, contactLedgerService, documentDeliveryService } = makeService();
    await service.queue("org-1", "user-1", "supplier-1", { asOf: "2026-07-31", idempotencyKey: "client-key-123456" });
    documentDeliveryService.replayIfExisting.mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: true });

    await expect(service.queue("org-1", "user-1", "supplier-1", { asOf: "2026-07-31", idempotencyKey: "client-key-123456" })).resolves.toMatchObject({ idempotentReplay: true });
    expect(contactLedgerService.supplierStatementPdf).toHaveBeenCalledTimes(1);
    expect(documentDeliveryService.queue).toHaveBeenCalledTimes(1);
  });

  it("does not cross tenant boundaries", async () => {
    const { service, prisma } = makeService();
    prisma.contact.findFirst.mockResolvedValue(null);

    await expect(service.queue("org-other", "user-1", "supplier-1", { asOf: "2026-07-31", idempotencyKey: "client-key-123456" })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "supplier-1", organizationId: "org-other", type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } } }));
  });
});
