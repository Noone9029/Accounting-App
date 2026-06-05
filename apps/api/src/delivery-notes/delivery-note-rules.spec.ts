import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  DeliveryNoteStatus,
  DocumentType,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
  SalesQuoteStatus,
  SalesStockIssueStatus,
} from "@prisma/client";
import { DeliveryNoteService } from "./delivery-note.service";

describe("delivery note rules", () => {
  it("creates a draft non-posting delivery note with a delivery-note sequence number", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx);
    const { service, numbers, audit } = makeService(prisma);

    const deliveryNote = await service.create("org-1", "user-1", makeCreateDto());

    expect(deliveryNote).toMatchObject({ id: "dn-1", deliveryNoteNumber: "DN-000001", status: DeliveryNoteStatus.DRAFT });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.DELIVERY_NOTE, tx);
    expect(tx.deliveryNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          deliveryNoteNumber: "DN-000001",
          customerId: "customer-1",
          relatedSalesInvoiceId: "invoice-1",
          lines: expect.objectContaining({ create: expect.any(Array) }),
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(tx.emailOutbox.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "DeliveryNote", entityId: "dn-1" }));
  });

  it("prevents duplicate delivery note numbers when the configured sequence collides", async () => {
    const tx = makeTransactionClient({
      deliveryNote: {
        create: jest.fn().mockRejectedValue({ code: "P2002" }),
      },
    });
    const prisma = makeCreatePrisma(tx);
    const { service } = makeService(prisma);

    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it("tenant-scopes delivery note detail lookup", async () => {
    const prisma = { deliveryNote: { findFirst: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);

    await expect(service.get("org-2", "dn-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.deliveryNote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "dn-1", organizationId: "org-2" } }));
  });

  it("rejects cross-tenant or mismatched related sales invoices", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx, {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1", customerId: "other-customer", status: SalesInvoiceStatus.FINALIZED }) },
    });
    const { service } = makeService(prisma);

    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toThrow("Related sales invoice must belong");
    expect(tx.deliveryNote.create).not.toHaveBeenCalled();
  });

  it("allows only accepted quote source links", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx, {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
      salesQuote: { findFirst: jest.fn().mockResolvedValue({ id: "quote-1", customerId: "customer-1", status: SalesQuoteStatus.SENT }) },
    });
    const { service } = makeService(prisma);

    await expect(
      service.create("org-1", "user-1", { ...makeCreateDto(), relatedSalesInvoiceId: null, relatedSalesQuoteId: "quote-1" }),
    ).rejects.toThrow("accepted sales quotes");
  });

  it("rejects voided stock issue source links and does not create stock movements", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx, {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
      salesStockIssue: { findFirst: jest.fn().mockResolvedValue({ id: "ssi-1", customerId: "customer-1", status: SalesStockIssueStatus.VOIDED }) },
    });
    const { service } = makeService(prisma);

    await expect(
      service.create("org-1", "user-1", { ...makeCreateDto(), relatedSalesInvoiceId: null, relatedSalesStockIssueId: "ssi-1" }),
    ).rejects.toThrow("Voided sales stock issues");
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("validates positive quantities and source-line customer matching", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx, {
      salesInvoiceLine: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "invoice-line-1",
            invoiceId: "invoice-1",
            itemId: null,
            description: "Delivered consulting",
            invoice: { id: "invoice-1", customerId: "other-customer" },
          },
        ]),
      },
    });
    const { service } = makeService(prisma);

    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toThrow("source must match");
    await expect(
      service.create("org-1", "user-1", { ...makeCreateDto(), lines: [{ description: "Bad line", quantity: "0.0000" }] }),
    ).rejects.toThrow("quantity must be greater");
  });

  it("runs draft-to-issued-to-delivered lifecycle and blocks editing once issued", async () => {
    const prisma = { deliveryNote: { update: jest.fn() } };
    const { service, audit } = makeService(prisma);
    const draft = makeDeliveryNote();
    const issued = makeDeliveryNote({ status: DeliveryNoteStatus.ISSUED, issuedAt: new Date("2026-06-04T10:00:00.000Z") });
    const delivered = makeDeliveryNote({ status: DeliveryNoteStatus.DELIVERED, deliveredAt: new Date("2026-06-04T11:00:00.000Z") });
    jest.spyOn(service, "get").mockResolvedValueOnce(draft as never).mockResolvedValueOnce(issued as never).mockResolvedValueOnce(issued as never);
    prisma.deliveryNote.update.mockResolvedValueOnce(issued).mockResolvedValueOnce(delivered);

    await expect(service.issue("org-1", "user-1", "dn-1")).resolves.toMatchObject({ status: DeliveryNoteStatus.ISSUED });
    await expect(service.markDelivered("org-1", "user-1", "dn-1")).resolves.toMatchObject({ status: DeliveryNoteStatus.DELIVERED });
    await expect(service.update("org-1", "user-1", "dn-1", { reference: "Changed" })).rejects.toThrow("Only draft delivery notes can be edited");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ISSUE" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "MARK_DELIVERED" }));
  });

  it("blocks delivered, cancelled, and voided notes from normal cancellation/void paths", async () => {
    const { service } = makeService({});
    jest.spyOn(service, "get").mockResolvedValueOnce(makeDeliveryNote({ status: DeliveryNoteStatus.DELIVERED }) as never);
    await expect(service.cancel("org-1", "user-1", "dn-1")).rejects.toThrow("Only draft or issued delivery notes");

    jest.spyOn(service, "get").mockResolvedValueOnce(makeDeliveryNote({ status: DeliveryNoteStatus.CANCELLED }) as never);
    await expect(service.void("org-1", "user-1", "dn-1")).rejects.toThrow("Only issued delivery notes");
  });

  it("builds tenant-scoped delivery note PDF data with safe metadata", async () => {
    const prisma = { deliveryNote: { findFirst: jest.fn().mockResolvedValue(makePdfDeliveryNote()) } };
    const { service } = makeService(prisma);

    await expect(service.pdfData("org-1", "dn-1")).resolves.toMatchObject({
      deliveryNote: {
        deliveryNoteNumber: "DN-000001",
        status: DeliveryNoteStatus.DRAFT,
        relatedSalesInvoice: { invoiceNumber: "INV-000010" },
      },
      lines: [{ description: "Delivered consulting", itemName: "Consulting Package" }],
    });
    expect(prisma.deliveryNote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "dn-1", organizationId: "org-1" } }));
  });

  it("generates and archives delivery note PDFs without journal, AR, VAT, inventory, email, or ZATCA side effects", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const prisma = {
      deliveryNote: { findFirst: jest.fn().mockResolvedValue(makePdfDeliveryNote()) },
      journalEntry: { create: jest.fn() },
      salesInvoice: { create: jest.fn() },
      stockMovement: { create: jest.fn() },
      zatcaInvoiceMetadata: { upsert: jest.fn() },
      emailOutbox: { create: jest.fn() },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new DeliveryNoteService(
      prisma as never,
      audit as never,
      { preview: jest.fn(), next: jest.fn() } as never,
      { invoiceRenderSettings: jest.fn().mockResolvedValue({ title: "Should not override delivery note title" }) } as never,
      { archivePdf } as never,
    );

    const result = await service.pdf("org-1", "user-1", "dn-1");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("delivery-note-DN-000001.pdf");
    expect(archivePdf).toHaveBeenCalledWith(expect.objectContaining({
      documentType: DocumentType.DELIVERY_NOTE,
      sourceType: "DeliveryNote",
      sourceId: "dn-1",
      documentNumber: "DN-000001",
      generatedById: "user-1",
    }));
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.salesInvoice.create).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "GENERATE_PDF",
      entityType: "DeliveryNote",
      entityId: "dn-1",
      after: expect.objectContaining({
        deliveryNoteNumber: "DN-000001",
        status: DeliveryNoteStatus.DRAFT,
        generatedDocumentId: "doc-1",
        contentType: "application/pdf",
      }),
    }));
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain("%PDF");
  });
});

function makeService(prisma: any) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const numbers = {
    preview: jest.fn().mockResolvedValue({ exampleNextNumber: "DN-000001", scope: NumberSequenceScope.DELIVERY_NOTE, prefix: "DN-", nextNumber: 1, padding: 6 }),
    next: jest.fn().mockResolvedValue("DN-000001"),
  };
  return { service: new DeliveryNoteService(prisma as never, audit as never, numbers as never), audit, numbers };
}

function makeCreatePrisma(tx: ReturnType<typeof makeTransactionClient>, overrides: Record<string, any> = {}) {
  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }) },
    branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
    salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED }) },
    salesQuote: { findFirst: jest.fn().mockResolvedValue(null) },
    salesStockIssue: { findFirst: jest.fn().mockResolvedValue(null) },
    item: { findMany: jest.fn().mockResolvedValue([]) },
    salesInvoiceLine: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "invoice-line-1",
          invoiceId: "invoice-1",
          itemId: null,
          description: "Delivered consulting",
          invoice: { id: "invoice-1", customerId: "customer-1" },
        },
      ]),
    },
    salesQuoteLine: { findMany: jest.fn().mockResolvedValue([]) },
    salesStockIssueLine: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    ...overrides,
  };
}

function makeTransactionClient(overrides: Record<string, any> = {}) {
  return {
    deliveryNoteLine: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    deliveryNote: {
      create: jest.fn().mockResolvedValue(makeDeliveryNote()),
      update: jest.fn().mockResolvedValue(makeDeliveryNote({ status: DeliveryNoteStatus.ISSUED })),
    },
    journalEntry: { create: jest.fn() },
    stockMovement: { create: jest.fn() },
    zatcaInvoiceMetadata: { upsert: jest.fn() },
    emailOutbox: { create: jest.fn() },
    ...overrides,
  };
}

function makeCreateDto() {
  return {
    customerId: "customer-1",
    branchId: "branch-1",
    issueDate: "2026-06-04",
    deliveryDate: "2026-06-05",
    reference: "SHIP-1",
    relatedSalesInvoiceId: "invoice-1",
    deliveryAddress: "Warehouse gate 3",
    lines: [{ description: "Delivered consulting", quantity: "1.0000", sourceSalesInvoiceLineId: "invoice-line-1" }],
  };
}

function makeDeliveryNote(overrides: Record<string, unknown> = {}) {
  return {
    id: "dn-1",
    organizationId: "org-1",
    deliveryNoteNumber: "DN-000001",
    customerId: "customer-1",
    branchId: "branch-1",
    status: DeliveryNoteStatus.DRAFT,
    issueDate: new Date("2026-06-04T00:00:00.000Z"),
    deliveryDate: new Date("2026-06-05T00:00:00.000Z"),
    reference: "SHIP-1",
    relatedSalesInvoiceId: "invoice-1",
    relatedSalesQuoteId: null,
    relatedSalesStockIssueId: null,
    deliveryAddress: "Warehouse gate 3",
    notes: null,
    instructions: null,
    issuedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    voidedAt: null,
    lines: [makeLine()],
    ...overrides,
  };
}

function makeLine(overrides: Record<string, unknown> = {}) {
  return {
    id: "dn-line-1",
    organizationId: "org-1",
    deliveryNoteId: "dn-1",
    itemId: null,
    description: "Delivered consulting",
    quantity: decimal("1.0000"),
    unitOfMeasure: "each",
    sourceSalesInvoiceLineId: "invoice-line-1",
    sourceSalesQuoteLineId: null,
    sourceSalesStockIssueLineId: null,
    sortOrder: 0,
    ...overrides,
  };
}

function makePdfDeliveryNote() {
  return {
    ...makeDeliveryNote(),
    organization: { id: "org-1", name: "LedgerByte Demo", legalName: null, taxNumber: "300000000000003", countryCode: "SA" },
    customer: {
      id: "customer-1",
      name: "Beta Customer",
      displayName: "Beta Customer",
      taxNumber: null,
      email: "customer@example.test",
      phone: null,
      addressLine1: "Street 1",
      addressLine2: null,
      city: "Riyadh",
      postalCode: "12345",
      countryCode: "SA",
    },
    relatedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: SalesInvoiceStatus.FINALIZED },
    relatedSalesQuote: null,
    relatedSalesStockIssue: null,
    lines: [
      {
        ...makeLine(),
        item: { id: "item-1", name: "Consulting Package", sku: "CONSULT" },
      },
    ],
  };
}

function decimal(value: string) {
  return new Prisma.Decimal(value);
}
