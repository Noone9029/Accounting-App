import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { DocumentType, EmailTemplateType, SalesQuoteDocumentKind, SalesQuoteStatus } from "@prisma/client";
import { SalesQuoteEmailDeliveryService } from "./sales-quote-email-delivery.service";

describe("SalesQuoteEmailDeliveryService", () => {
  const dto = {
    recipientEmail: "Customer@Example.Test",
    idempotencyKey: "quote-delivery-key-1234",
  };

  function makeService(quote: Record<string, unknown> | null = makeQuote()) {
    const prisma = { salesQuote: { findFirst: jest.fn().mockResolvedValue(quote) } };
    const salesQuote = { pdf: jest.fn().mockResolvedValue({ document: makeDocument() }) };
    const delivery = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([{ id: "delivery-1" }]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    return {
      service: new SalesQuoteEmailDeliveryService(prisma as never, salesQuote as never, delivery as never, config as never),
      prisma,
      salesQuote,
      delivery,
    };
  }

  it("queues an eligible sent proforma through the generic delivery engine", async () => {
    const { service, salesQuote, delivery } = makeService(makeQuote({ status: SalesQuoteStatus.SENT, documentKind: SalesQuoteDocumentKind.PROFORMA }));

    await expect(service.queue("org-1", "user-1", "quote-1", dto as never)).resolves.toMatchObject({ id: "delivery-1" });

    expect(salesQuote.pdf).toHaveBeenCalledWith("org-1", "user-1", "quote-1");
    expect(delivery.queue).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      sourceType: "SalesQuote",
      sourceId: "quote-1",
      sourceNumber: "QUO-000001",
      documentType: DocumentType.SALES_QUOTE,
      templateType: EmailTemplateType.SALES_QUOTE,
      subject: "Proforma QUO-000001 from Example Trading",
      generatedDocument: makeDocument(),
    }));
  });

  it.each([
    SalesQuoteStatus.DRAFT,
    SalesQuoteStatus.REJECTED,
    SalesQuoteStatus.EXPIRED,
    SalesQuoteStatus.CANCELLED,
    SalesQuoteStatus.CONVERTED,
  ])("rejects non-sendable %s quotes without generating a PDF", async (status) => {
    const { service, salesQuote } = makeService(makeQuote({ status }));

    await expect(service.queue("org-1", "user-1", "quote-1", dto as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(salesQuote.pdf).not.toHaveBeenCalled();
  });

  it("replays before PDF generation and preserves a changed-payload conflict", async () => {
    const { service, salesQuote, delivery } = makeService();
    delivery.replayIfExisting.mockResolvedValueOnce({ id: "delivery-1", idempotentReplay: true });

    await expect(service.queue("org-1", "user-1", "quote-1", dto as never)).resolves.toMatchObject({ idempotentReplay: true });
    expect(salesQuote.pdf).not.toHaveBeenCalled();
    expect(delivery.queue).not.toHaveBeenCalled();

    delivery.replayIfExisting.mockRejectedValueOnce(new ConflictException());
    await expect(service.queue("org-1", "user-1", "quote-1", { ...dto, subject: "Different" } as never)).rejects.toBeInstanceOf(ConflictException);
    expect(salesQuote.pdf).not.toHaveBeenCalled();
  });

  it("rejects a missing customer recipient and cross-tenant source", async () => {
    const missingRecipient = makeService(makeQuote({ customer: { name: "No Email", displayName: null, email: null } }));
    await expect(missingRecipient.service.queue("org-1", "user-1", "quote-1", { idempotencyKey: dto.idempotencyKey } as never)).rejects.toThrow(
      "A valid recipient email is required for sales quote delivery.",
    );

    const missing = makeService(null);
    await expect(missing.service.queue("org-2", "user-1", "quote-1", dto as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(missing.prisma.salesQuote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1", organizationId: "org-2" } }));
  });

  it("lists only the tenant-scoped quote history", async () => {
    const { service, delivery } = makeService();

    await expect(service.history("org-1", "quote-1")).resolves.toEqual([{ id: "delivery-1" }]);
    expect(delivery.listHistory).toHaveBeenCalledWith("org-1", "SalesQuote", "quote-1");
  });
});

function makeDocument() {
  return {
    id: "document-1",
    filename: "proforma-QUO-000001.pdf",
    mimeType: "application/pdf",
    sizeBytes: 123,
    contentHash: "hash-1",
  };
}

function makeQuote(overrides: Record<string, unknown> = {}) {
  return {
    id: "quote-1",
    organizationId: "org-1",
    quoteNumber: "QUO-000001",
    status: SalesQuoteStatus.SENT,
    documentKind: SalesQuoteDocumentKind.QUOTE,
    currency: "SAR",
    total: "115.00",
    expiryDate: new Date("2026-07-31T00:00:00.000Z"),
    customer: { name: "Example Customer", displayName: "Example Customer", email: "customer@example.test" },
    organization: { name: "Example Trading" },
    ...overrides,
  };
}
