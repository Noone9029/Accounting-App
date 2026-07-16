import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DocumentType, EmailTemplateType, CreditNoteStatus } from "@prisma/client";
import { CreditNoteEmailDeliveryService } from "./credit-note-email-delivery.service";

describe("CreditNoteEmailDeliveryService", () => {
  const dto = { idempotencyKey: "credit-note-delivery-1234", recipientEmail: "customer@example.test" };

  function makeService(note: Record<string, unknown> | null = makeNote()) {
    const prisma = { creditNote: { findFirst: jest.fn().mockResolvedValue(note) } };
    const creditNote = { pdf: jest.fn().mockResolvedValue({ document: makeDocument() }) };
    const delivery = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([{ id: "delivery-1" }]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    return {
      service: new CreditNoteEmailDeliveryService(prisma as never, creditNote as never, delivery as never, config as never),
      prisma,
      creditNote,
      delivery,
    };
  }

  it("queues a finalized credit note with an archived credit-note PDF", async () => {
    const { service, creditNote, delivery } = makeService();

    await expect(service.queue("org-1", "user-1", "credit-note-1", dto as never)).resolves.toMatchObject({ id: "delivery-1" });
    expect(creditNote.pdf).toHaveBeenCalledWith("org-1", "user-1", "credit-note-1");
    expect(delivery.queue).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: "CreditNote",
      sourceId: "credit-note-1",
      sourceNumber: "CN-000001",
      documentType: DocumentType.CREDIT_NOTE,
      templateType: EmailTemplateType.CREDIT_NOTE,
      subject: "Credit note CN-000001 from Example Trading",
    }));
  });

  it.each([CreditNoteStatus.DRAFT, CreditNoteStatus.VOIDED])("rejects %s credit notes before PDF generation", async (status) => {
    const { service, creditNote } = makeService(makeNote({ status }));
    await expect(service.queue("org-1", "user-1", "credit-note-1", dto as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(creditNote.pdf).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant notes and lists source-scoped history", async () => {
    const missing = makeService(null);
    await expect(missing.service.queue("org-2", "user-1", "credit-note-1", dto as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(missing.prisma.creditNote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "credit-note-1", organizationId: "org-2" } }));

    const active = makeService();
    await expect(active.service.history("org-1", "credit-note-1")).resolves.toEqual([{ id: "delivery-1" }]);
    expect(active.delivery.listHistory).toHaveBeenCalledWith("org-1", "CreditNote", "credit-note-1");
  });
});

function makeDocument() {
  return { id: "document-1", filename: "credit-note-CN-000001.pdf", mimeType: "application/pdf", sizeBytes: 123, contentHash: "hash-1" };
}

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: "credit-note-1",
    organizationId: "org-1",
    creditNoteNumber: "CN-000001",
    status: CreditNoteStatus.FINALIZED,
    currency: "SAR",
    total: "100.00",
    issueDate: new Date("2026-07-16T00:00:00.000Z"),
    customer: { name: "Example Customer", displayName: "Example Customer", email: "customer@example.test" },
    originalInvoice: { invoiceNumber: "INV-000001" },
    organization: { name: "Example Trading" },
    ...overrides,
  };
}
