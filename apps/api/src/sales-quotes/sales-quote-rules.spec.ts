import { BadRequestException, NotFoundException } from "@nestjs/common";
import { calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import { AccountType, DocumentType, GeneratedDocumentStatus, NumberSequenceScope, Prisma, SalesInvoiceStatus, SalesInvoiceTaxMode, SalesQuoteStatus } from "@prisma/client";
import { SalesQuoteService, buildSalesQuoteWorkflowSummary } from "./sales-quote.service";

describe("sales quote rules", () => {
  it("calculates quote totals with the same tax-exclusive, tax-inclusive, and no-tax rules as sales invoices", async () => {
    const prisma = makePreparePrisma();
    const service = makeService(prisma).service;

    const taxExclusive = await prepareQuote(service, "org-1", [quoteLine({ taxRateId: "tax-15" })], SalesInvoiceTaxMode.TAX_EXCLUSIVE);
    const taxInclusive = await prepareQuote(service, "org-1", [quoteLine({ unitPrice: "115.0000", taxRateId: "tax-15" })], SalesInvoiceTaxMode.TAX_INCLUSIVE);
    const noTax = await prepareQuote(service, "org-1", [quoteLine({ taxRateId: "tax-15" })], SalesInvoiceTaxMode.NO_TAX);

    expect(taxExclusive).toMatchObject(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "100.0000", taxRate: "15.0000" }]));
    expect(taxInclusive).toMatchObject(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "115.0000", taxRate: "15.0000" }], "TAX_INCLUSIVE"));
    expect(noTax).toMatchObject(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "100.0000", taxRate: "15.0000" }], "NO_TAX"));
    expect(noTax.lines[0]?.taxRateId).toBeUndefined();
  });

  it("prefills quote line account and tax from the selected item", async () => {
    const prisma = makePreparePrisma({
      item: {
        findMany: jest.fn().mockResolvedValue([
          { id: "item-1", name: "Consulting", description: null, revenueAccountId: "revenue-1", salesTaxRateId: "tax-15" },
        ]),
      },
    });
    const service = makeService(prisma).service;

    const prepared = await prepareQuote(service, "org-1", [{ itemId: "item-1", quantity: "1.0000", unitPrice: "100.0000" }]);

    expect(prepared.lines[0]).toMatchObject({ accountId: "revenue-1", taxRateId: "tax-15", taxableAmount: "100.0000", taxAmount: "15.0000" });
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", id: { in: ["revenue-1"] }, type: AccountType.REVENUE }),
      }),
    );
  });

  it("rejects invalid or cross-tenant quote line revenue accounts", async () => {
    const prisma = makePreparePrisma({ account: { findMany: jest.fn().mockResolvedValue([]) } });
    const service = makeService(prisma).service;

    await expect(prepareQuote(service, "org-1", [quoteLine({ accountId: "expense-1" })])).rejects.toThrow("active posting revenue accounts");
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", id: { in: ["expense-1"] }, type: AccountType.REVENUE, isActive: true, allowPosting: true }),
      }),
    );
  });

  it("creates a draft non-posting quote with a quote sequence number", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx);
    const { service, numbers, audit } = makeService(prisma);

    const quote = await service.create("org-1", "user-1", makeCreateDto());

    expect(quote).toMatchObject({ id: "quote-1", quoteNumber: "QUO-000001", status: SalesQuoteStatus.DRAFT });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.SALES_QUOTE, tx);
    expect(tx.salesQuote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          quoteNumber: "QUO-000001",
          taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
          lines: expect.objectContaining({ create: expect.any(Array) }),
        }),
      }),
    );
    expect(tx.salesQuote.create.mock.calls[0][0].data.lines.create[0]).not.toHaveProperty("transactionLineTotal");
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "SalesQuote", entityId: "quote-1" }));
  });

  it("prevents duplicate quote numbers when the configured sequence collides", async () => {
    const tx = makeTransactionClient({
      salesQuote: {
        create: jest.fn().mockRejectedValue({ code: "P2002" }),
      },
    });
    const prisma = makeCreatePrisma(tx);
    const { service } = makeService(prisma);

    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it("tenant-scopes quote detail lookup", async () => {
    const prisma = { salesQuote: { findFirst: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);

    await expect(service.get("org-2", "quote-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.salesQuote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1", organizationId: "org-2" } }));
  });

  it("builds tenant-scoped sales quote PDF data with safe quote metadata", async () => {
    const prisma = { salesQuote: { findFirst: jest.fn().mockResolvedValue(makePdfQuote()) } };
    const { service } = makeService(prisma);

    await expect(service.pdfData("org-1", "quote-1")).resolves.toMatchObject({
      quote: {
        quoteNumber: "QUO-000001",
        status: SalesQuoteStatus.DRAFT,
        taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
        total: "115",
      },
      lines: [{ description: "Consulting", itemName: "Consulting Package", taxRateName: "VAT on Sales 15%" }],
    });
    expect(prisma.salesQuote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1", organizationId: "org-1" } }));
  });

  it("rejects cross-tenant sales quote PDF data access", async () => {
    const prisma = { salesQuote: { findFirst: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);

    await expect(service.pdfData("org-2", "quote-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.salesQuote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1", organizationId: "org-2" } }));
  });

  it("generates and archives sales quote PDFs without journal, AR, VAT, inventory, or ZATCA side effects", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const prisma = {
      salesQuote: { findFirst: jest.fn().mockResolvedValue(makePdfQuote()) },
      journalEntry: { create: jest.fn() },
      salesInvoice: { create: jest.fn() },
      zatcaInvoiceMetadata: { upsert: jest.fn() },
      stockMovement: { create: jest.fn() },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new SalesQuoteService(
      prisma as never,
      audit as never,
      { preview: jest.fn(), next: jest.fn() } as never,
      { invoiceRenderSettings: jest.fn().mockResolvedValue({ title: "Should not be used for quote title" }) } as never,
      { archivePdf } as never,
    );

    const result = await service.pdf("org-1", "user-1", "quote-1");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("sales-quote-QUO-000001.pdf");
    expect(archivePdf).toHaveBeenCalledWith(expect.objectContaining({
      documentType: DocumentType.SALES_QUOTE,
      sourceType: "SalesQuote",
      sourceId: "quote-1",
      documentNumber: "QUO-000001",
      generatedById: "user-1",
    }));
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.salesInvoice.create).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "GENERATE_PDF",
      entityType: "SalesQuote",
      entityId: "quote-1",
      after: expect.objectContaining({
        quoteNumber: "QUO-000001",
        status: SalesQuoteStatus.DRAFT,
        generatedDocumentId: "doc-1",
        contentType: "application/pdf",
      }),
    }));
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain("%PDF");
  });

  it("builds quote workflow summaries without mutating quote state", () => {
    const draftSummary = buildSalesQuoteWorkflowSummary(quoteWorkflowFixture(), []);
    expect(draftSummary).toMatchObject({
      document: {
        id: "quote-1",
        type: "SalesQuote",
        number: "QUO-000001",
        status: SalesQuoteStatus.DRAFT,
        customerId: "customer-1",
        currency: "SAR",
        total: "115.0000",
      },
      lifecycle: { state: "DRAFT_NOT_SENT" },
      conversion: { state: "NOT_READY", convertedSalesInvoice: null },
      generatedDocuments: { pdfCount: 0, latestPdf: null },
    });
    expect(draftSummary.availableActions).toEqual(["edit", "markSent", "generatePdf"]);
    expect(draftSummary.blockedActions).toEqual(expect.arrayContaining([{ action: "convertToInvoice", reason: "Only accepted sales quotes can be converted." }]));

    const acceptedSummary = buildSalesQuoteWorkflowSummary(
      quoteWorkflowFixture({ status: SalesQuoteStatus.ACCEPTED, acceptedAt: new Date("2026-06-04T12:00:00.000Z") }),
      [
        generatedDocumentFixture({ id: "doc-old", generatedAt: new Date("2026-06-04T08:00:00.000Z") }),
        generatedDocumentFixture({ id: "doc-new", filename: "sales-quote-QUO-000001-v2.pdf", generatedAt: new Date("2026-06-04T09:00:00.000Z") }),
      ],
    );
    expect(acceptedSummary.lifecycle.state).toBe("ACCEPTED_READY_TO_CONVERT");
    expect(acceptedSummary.conversion).toMatchObject({ state: "READY_TO_CONVERT", convertedSalesInvoice: null });
    expect(acceptedSummary.generatedDocuments).toMatchObject({
      pdfCount: 2,
      latestPdf: {
        id: "doc-new",
        filename: "sales-quote-QUO-000001-v2.pdf",
        status: GeneratedDocumentStatus.GENERATED,
        storageProvider: "database",
      },
    });
    expect(acceptedSummary.availableActions).toEqual(["convertToInvoice", "generatePdf"]);

    const convertedSummary = buildSalesQuoteWorkflowSummary(
      quoteWorkflowFixture({
        status: SalesQuoteStatus.CONVERTED,
        convertedSalesInvoiceId: "invoice-1",
        convertedAt: new Date("2026-06-05T10:00:00.000Z"),
        convertedSalesInvoice: {
          id: "invoice-1",
          invoiceNumber: "INV-000010",
          status: SalesInvoiceStatus.DRAFT,
          issueDate: new Date("2026-06-05T00:00:00.000Z"),
          total: decimal("115.0000"),
        },
      }),
      [],
    );
    expect(convertedSummary.conversion).toMatchObject({
      state: "CONVERTED",
      convertedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: SalesInvoiceStatus.DRAFT, total: "115.0000" },
    });
    expect(convertedSummary.availableActions).toEqual(["viewConvertedInvoice", "generatePdf"]);
    expect(convertedSummary.notes.join(" ")).toContain("does not submit compliance data");
  });

  it("returns quote workflow summaries from active-organization quote and generated document state", async () => {
    const prisma = {
      salesQuote: { findFirst: jest.fn().mockResolvedValue(quoteWorkflowFixture({ status: SalesQuoteStatus.SENT })) },
      generatedDocument: { findMany: jest.fn().mockResolvedValue([generatedDocumentFixture()]) },
    };
    const { service } = makeService(prisma);

    await expect(service.workflowSummary("org-1", "quote-1")).resolves.toMatchObject({
      document: { id: "quote-1", type: "SalesQuote", number: "QUO-000001", status: SalesQuoteStatus.SENT },
      lifecycle: { state: "SENT_AWAITING_ACCEPTANCE" },
      generatedDocuments: { pdfCount: 1 },
    });
    expect(prisma.salesQuote.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1", organizationId: "org-1" } }));
    expect(prisma.generatedDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", sourceType: "SalesQuote", sourceId: "quote-1", documentType: DocumentType.SALES_QUOTE },
      }),
    );
  });

  it("allows draft-to-sent-to-accepted lifecycle and blocks editing once sent", async () => {
    const prisma = { salesQuote: { update: jest.fn() } };
    const { service, audit } = makeService(prisma);
    const draft = makeQuote();
    const sent = makeQuote({ status: SalesQuoteStatus.SENT, sentAt: new Date("2026-06-03T10:00:00.000Z") });
    const accepted = makeQuote({ status: SalesQuoteStatus.ACCEPTED, acceptedAt: new Date("2026-06-03T11:00:00.000Z") });
    jest.spyOn(service, "get").mockResolvedValueOnce(draft as never).mockResolvedValueOnce(sent as never).mockResolvedValueOnce(sent as never);
    prisma.salesQuote.update.mockResolvedValueOnce(sent).mockResolvedValueOnce(accepted);

    await expect(service.markSent("org-1", "user-1", "quote-1")).resolves.toMatchObject({ status: SalesQuoteStatus.SENT });
    await expect(service.accept("org-1", "user-1", "quote-1")).resolves.toMatchObject({ status: SalesQuoteStatus.ACCEPTED });
    await expect(service.update("org-1", "user-1", "quote-1", { reference: "Changed" })).rejects.toThrow("Only draft sales quotes can be edited");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "MARK_SENT" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ACCEPT" }));
  });

  it("converts only accepted quotes into draft sales invoices without posting journals or ZATCA metadata", async () => {
    const tx = makeTransactionClient();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const { service, numbers, audit } = makeService(prisma);
    const acceptedQuote = makeQuote({ status: SalesQuoteStatus.ACCEPTED });
    jest.spyOn(service, "get").mockResolvedValue(acceptedQuote as never);

    const result = await service.convertToInvoice("org-1", "user-1", "quote-1");

    expect(result.invoice).toMatchObject({ id: "invoice-1", invoiceNumber: "INV-000010", status: SalesInvoiceStatus.DRAFT });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.INVOICE, tx);
    expect(tx.salesInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          invoiceNumber: "INV-000010",
          status: SalesInvoiceStatus.DRAFT,
          taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
          balanceDue: decimal("115.0000"),
          lines: expect.objectContaining({ create: [expect.objectContaining({
            account: { connect: { id: "revenue-1" } },
            transactionLineGrossAmount: decimal("100.0000"),
            transactionTaxAmount: decimal("15.0000"),
            transactionLineTotal: decimal("115.0000"),
          })] }),
        }),
      }),
    );
    expect(tx.salesQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SalesQuoteStatus.CONVERTED, convertedSalesInvoiceId: "invoice-1" }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CONVERT_TO_INVOICE", entityType: "SalesQuote" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "SalesInvoice", entityId: "invoice-1" }));
  });

  it("keeps foreign quote conversion fail-closed until an explicit invoice-rate workflow exists", async () => {
    const tx = makeTransactionClient();
    tx.salesQuote.findFirst.mockResolvedValue({ ...makeQuoteForConversion(), currency: "USD" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const { service } = makeService(prisma);
    jest.spyOn(service, "get").mockResolvedValue(makeQuote({ status: SalesQuoteStatus.ACCEPTED, currency: "USD" }) as never);

    await expect(service.convertToInvoice("org-1", "user-1", "quote-1")).rejects.toThrow(
      "Foreign quote conversion requires an explicit invoice rate and is not enabled yet.",
    );
    expect(tx.salesInvoice.create).not.toHaveBeenCalled();
  });

  it("blocks conversion of cancelled, expired, rejected, draft, sent, and already converted quotes", async () => {
    const { service } = makeService({});
    for (const status of [SalesQuoteStatus.DRAFT, SalesQuoteStatus.SENT, SalesQuoteStatus.REJECTED, SalesQuoteStatus.EXPIRED, SalesQuoteStatus.CANCELLED]) {
      jest.spyOn(service, "get").mockResolvedValueOnce(makeQuote({ status }) as never);
      await expect(service.convertToInvoice("org-1", "user-1", "quote-1")).rejects.toThrow("Only accepted sales quotes");
    }
    jest.spyOn(service, "get").mockResolvedValueOnce(makeQuote({ status: SalesQuoteStatus.CONVERTED, convertedSalesInvoiceId: "invoice-1" }) as never);
    await expect(service.convertToInvoice("org-1", "user-1", "quote-1")).rejects.toThrow("already been converted");
  });
});

function makeService(prisma: any) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const numbers = {
    preview: jest.fn().mockResolvedValue({ exampleNextNumber: "QUO-000001", scope: NumberSequenceScope.SALES_QUOTE, prefix: "QUO-", nextNumber: 1, padding: 6 }),
    next: jest.fn((_organizationId: string, scope: NumberSequenceScope) =>
      Promise.resolve(scope === NumberSequenceScope.SALES_QUOTE ? "QUO-000001" : "INV-000010"),
    ),
  };
  return { service: new SalesQuoteService(prisma as never, audit as never, numbers as never), audit, numbers };
}

function makePreparePrisma(overrides: Record<string, unknown> = {}) {
  return {
    item: { findMany: jest.fn().mockResolvedValue([]) },
    account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: "15.0000" }]) },
    ...overrides,
  };
}

function makeCreatePrisma(tx: ReturnType<typeof makeTransactionClient>) {
  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }) },
    branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
    item: { findMany: jest.fn().mockResolvedValue([]) },
    account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: "15.0000" }]) },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function makeTransactionClient(overrides: Record<string, any> = {}) {
  const quote = makeQuote();
  const invoice = makeInvoice();
  return {
    organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "SAR" }) },
    account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-15", rate: decimal("15.0000") }]) },
    journalEntry: { create: jest.fn() },
    zatcaInvoiceMetadata: { upsert: jest.fn() },
    salesQuoteLine: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    salesQuote: {
      create: jest.fn().mockResolvedValue(quote),
      update: jest.fn().mockResolvedValue(makeQuote({ status: SalesQuoteStatus.CONVERTED, convertedSalesInvoiceId: "invoice-1" })),
      findFirst: jest.fn().mockResolvedValue(makeQuoteForConversion()),
    },
    salesInvoice: { create: jest.fn().mockResolvedValue(invoice) },
    ...overrides,
  };
}

async function prepareQuote(
  service: SalesQuoteService,
  organizationId: string,
  lines: Array<Partial<Parameters<SalesQuoteService["create"]>[2]["lines"][number]>>,
  taxMode: SalesInvoiceTaxMode = SalesInvoiceTaxMode.TAX_EXCLUSIVE,
) {
  return (service as any).prepareQuote(organizationId, lines, taxMode);
}

function quoteLine(overrides: Record<string, unknown> = {}) {
  return {
    description: "Consulting",
    accountId: "revenue-1",
    quantity: "1.0000",
    unitPrice: "100.0000",
    discountRate: "0.0000",
    ...overrides,
  };
}

function makeCreateDto() {
  return {
    customerId: "customer-1",
    branchId: "branch-1",
    issueDate: "2026-06-03",
    expiryDate: "2026-06-30",
    reference: "RFQ-1",
    currency: "SAR",
    taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
    lines: [quoteLine({ taxRateId: "tax-15" })],
  };
}

function makeQuote(overrides: Record<string, unknown> = {}) {
  return {
    id: "quote-1",
    organizationId: "org-1",
    quoteNumber: "QUO-000001",
    customerId: "customer-1",
    branchId: "branch-1",
    status: SalesQuoteStatus.DRAFT,
    issueDate: new Date("2026-06-03T00:00:00.000Z"),
    expiryDate: new Date("2026-06-30T00:00:00.000Z"),
    reference: "RFQ-1",
    currency: "SAR",
    taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
    subtotal: decimal("100.0000"),
    discountTotal: decimal("0.0000"),
    taxableTotal: decimal("100.0000"),
    taxTotal: decimal("15.0000"),
    total: decimal("115.0000"),
    notes: null,
    terms: null,
    convertedSalesInvoiceId: null,
    lines: [makePersistedLine()],
    ...overrides,
  };
}

function makeQuoteForConversion() {
  return {
    ...makeQuote({ status: SalesQuoteStatus.ACCEPTED }),
    customer: { id: "customer-1", name: "Customer", displayName: null, type: "CUSTOMER", isActive: true },
    lines: [makePersistedLine()],
  };
}

function makePdfQuote() {
  return {
    ...makeQuote(),
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
    convertedSalesInvoice: null,
    lines: [
      {
        ...makePersistedLine(),
        item: { id: "item-1", name: "Consulting Package", sku: "CONSULT" },
        taxRate: { name: "VAT on Sales 15%" },
      },
    ],
  };
}

function quoteWorkflowFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "quote-1",
    quoteNumber: "QUO-000001",
    customerId: "customer-1",
    status: SalesQuoteStatus.DRAFT,
    issueDate: new Date("2026-06-03T00:00:00.000Z"),
    expiryDate: new Date("2026-06-30T00:00:00.000Z"),
    currency: "SAR",
    total: decimal("115.0000"),
    convertedSalesInvoiceId: null,
    convertedAt: null,
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    expiredAt: null,
    cancelledAt: null,
    convertedSalesInvoice: null,
    ...overrides,
  };
}

function generatedDocumentFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    filename: "sales-quote-QUO-000001.pdf",
    status: GeneratedDocumentStatus.GENERATED,
    storageProvider: "database",
    generatedAt: new Date("2026-06-04T08:00:00.000Z"),
    ...overrides,
  };
}

function makePersistedLine(overrides: Record<string, unknown> = {}) {
  return {
    id: "quote-line-1",
    organizationId: "org-1",
    quoteId: "quote-1",
    itemId: null,
    description: "Consulting",
    accountId: "revenue-1",
    quantity: decimal("1.0000"),
    unitPrice: decimal("100.0000"),
    discountRate: decimal("0.0000"),
    taxRateId: "tax-15",
    lineGrossAmount: decimal("100.0000"),
    discountAmount: decimal("0.0000"),
    taxableAmount: decimal("100.0000"),
    taxAmount: decimal("15.0000"),
    lineSubtotal: decimal("100.0000"),
    lineTotal: decimal("115.0000"),
    sortOrder: 0,
    ...overrides,
  };
}

function makeInvoice() {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-000010",
    customerId: "customer-1",
    branchId: "branch-1",
    issueDate: new Date("2026-06-03T00:00:00.000Z"),
    dueDate: null,
    currency: "SAR",
    status: SalesInvoiceStatus.DRAFT,
    taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
    subtotal: decimal("100.0000"),
    discountTotal: decimal("0.0000"),
    taxableTotal: decimal("100.0000"),
    taxTotal: decimal("15.0000"),
    total: decimal("115.0000"),
    balanceDue: decimal("115.0000"),
    lines: [makePersistedLine()],
  };
}

function decimal(value: string) {
  return new Prisma.Decimal(value);
}
