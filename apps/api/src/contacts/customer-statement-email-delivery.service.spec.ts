import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ContactType, DocumentType, EmailTemplateType } from "@prisma/client";
import { CustomerStatementEmailDeliveryService } from "./customer-statement-email-delivery.service";

describe("CustomerStatementEmailDeliveryService", () => {
  const dto = { asOf: "2026-07-31", from: "2026-07-01", idempotencyKey: "customer-statement-delivery-1234", recipientEmail: "customer@example.test" };

  function makeService(contact: Record<string, unknown> | null = makeContact(), statement = makeStatement()) {
    const prisma = { contact: { findFirst: jest.fn().mockResolvedValue(contact) } };
    const ledger = { statementPdfData: jest.fn().mockResolvedValue(statement.data), statementPdf: jest.fn().mockResolvedValue(statement) };
    const delivery = {
      replayIfExisting: jest.fn().mockResolvedValue(null),
      queue: jest.fn().mockResolvedValue({ id: "delivery-1", status: "QUEUED", idempotentReplay: false }),
      listHistory: jest.fn().mockResolvedValue([{ id: "delivery-1" }]),
      listHistoryBySourcePrefix: jest.fn().mockResolvedValue([{ id: "delivery-1" }]),
    };
    const config = { get: jest.fn().mockReturnValue("no-reply@example.test") };
    return {
      service: new CustomerStatementEmailDeliveryService(prisma as never, ledger as never, delivery as never, config as never),
      prisma,
      ledger,
      delivery,
    };
  }

  it("queues a tenant-scoped customer statement through the existing PDF pipeline", async () => {
    const { service, ledger, delivery } = makeService();

    await expect(service.queue("org-1", "user-1", "contact-1", dto as never)).resolves.toMatchObject({ id: "delivery-1" });
    expect(ledger.statementPdfData).toHaveBeenCalledWith("org-1", "contact-1", "2026-07-01", "2026-07-31");
    expect(ledger.statementPdf).toHaveBeenCalledWith("org-1", "user-1", "contact-1", "2026-07-01", "2026-07-31", expect.objectContaining({ periodFrom: "2026-07-01", periodTo: "2026-07-31" }));
    expect(delivery.queue).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      sourceType: "CustomerStatement",
      sourceId: "customer-statement:contact-1?baseCurrency=SAR&from=2026-07-01&to=2026-07-31",
      documentType: DocumentType.CUSTOMER_STATEMENT,
      templateType: EmailTemplateType.CUSTOMER_STATEMENT,
      subject: "Customer statement from Example Trading, 2026-07-01 to 2026-07-31",
      requestContext: { from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" },
    }));
  });

  it("requires an explicit as-of date and rejects conflicting bounds", async () => {
    const { service, ledger } = makeService();
    await expect(service.queue("org-1", "user-1", "contact-1", { ...dto, asOf: undefined } as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.queue("org-1", "user-1", "contact-1", { ...dto, to: "2026-07-30" } as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(ledger.statementPdfData).not.toHaveBeenCalled();
  });

  it("uses asOf as the effective upper bound when to is omitted", async () => {
    const { service, ledger } = makeService();
    await expect(service.queue("org-1", "user-1", "contact-1", { ...dto, to: undefined } as never)).resolves.toMatchObject({ id: "delivery-1" });
    expect(ledger.statementPdfData).toHaveBeenCalledWith("org-1", "contact-1", "2026-07-01", "2026-07-31");
  });

  it("rejects supplier-only or cross-tenant contacts and scopes history", async () => {
    const missing = makeService(null);
    await expect(missing.service.queue("org-2", "user-1", "contact-1", dto as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(missing.prisma.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: "contact-1", organizationId: "org-2", type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
    } }));

    const active = makeService();
    await expect(active.service.history("org-1", "contact-1")).resolves.toEqual([{ id: "delivery-1" }]);
    expect(active.delivery.listHistoryBySourcePrefix).toHaveBeenCalledWith("org-1", "CustomerStatement", "customer-statement:contact-1");
  });
});

function makeStatement() {
  return {
    data: {
      organization: { name: "Example Trading" },
      contact: makeContact(),
      currency: "SAR",
      periodFrom: "2026-07-01",
      periodTo: "2026-07-31",
      openingBalance: "0.0000",
      closingBalance: "100.0000",
      rows: [],
      generatedAt: new Date("2026-07-16T00:00:00.000Z"),
    },
    document: { id: "document-1", filename: "statement-Example-Customer-2026-07-01-to-2026-07-31.pdf", mimeType: "application/pdf", sizeBytes: 123, contentHash: "hash-1" },
  };
}

function makeContact(overrides: Record<string, unknown> = {}) {
  return { id: "contact-1", name: "Example Customer", displayName: "Example Customer", type: ContactType.CUSTOMER, email: "customer@example.test", ...overrides };
}
