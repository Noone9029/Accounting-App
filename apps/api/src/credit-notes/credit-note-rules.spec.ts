import { assertBalancedJournal, calculateSalesInvoiceTotals } from "@ledgerbyte/accounting-core";
import { CreditNoteStatus, DocumentType } from "@prisma/client";
import { buildCreditNoteJournalLines } from "./credit-note-accounting";
import { CreditNoteService } from "./credit-note.service";

describe("credit note rules", () => {
  it("calculates credit note totals using invoice semantics", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "2.0000", unitPrice: "100.0000", discountRate: "10.0000", taxRate: "15.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "200.0000",
      discountTotal: "20.0000",
      taxableTotal: "180.0000",
      taxTotal: "27.0000",
      total: "207.0000",
    });
  });

  it("builds balanced finalization journal lines", () => {
    const lines = buildCreditNoteJournalLines({
      accountsReceivableAccountId: "ar",
      vatPayableAccountId: "vat",
      creditNoteNumber: "CN-000001",
      customerName: "Customer",
      currency: "SAR",
      total: "115.0000",
      taxTotal: "15.0000",
      lines: [{ accountId: "sales", description: "Services", taxableAmount: "100.0000" }],
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "sales", debit: "100.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "vat", debit: "15.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "ar", debit: "0.0000", credit: "115.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("does not post again when finalizing an already finalized credit note", async () => {
    const finalizedCreditNote = { id: "credit-note-1", status: CreditNoteStatus.FINALIZED, journalEntryId: "journal-1" };
    const prisma = { $transaction: jest.fn() };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue(finalizedCreditNote as never);

    await expect(service.finalize("org-1", "user-1", "credit-note-1")).resolves.toBe(finalizedCreditNote);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("prevents updates to finalized credit notes", async () => {
    const service = new CreditNoteService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED } as never);

    await expect(service.update("org-1", "user-1", "credit-note-1", {})).rejects.toThrow("Only draft credit notes can be edited.");
  });

  it("deletes draft credit notes only", async () => {
    const prisma = { creditNote: { delete: jest.fn().mockResolvedValue({}) } };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "credit-note-1", status: CreditNoteStatus.DRAFT, journalEntryId: null } as never);

    await expect(service.remove("org-1", "user-1", "credit-note-1")).resolves.toEqual({ deleted: true });
    expect(prisma.creditNote.delete).toHaveBeenCalledWith({ where: { id: "credit-note-1" } });

    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "credit-note-2", status: CreditNoteStatus.FINALIZED, journalEntryId: "journal-1" } as never);
    await expect(service.remove("org-1", "user-1", "credit-note-2")).rejects.toThrow("Only draft credit notes without journal entries can be deleted.");
  });

  it("finalization creates a balanced posted journal", async () => {
    const tx = makeFinalizeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000001") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.DRAFT, journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "credit-note-1")).resolves.toMatchObject({
      status: CreditNoteStatus.FINALIZED,
      journalEntryId: "journal-1",
    });
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "POSTED",
          totalDebit: "115.0000",
          totalCredit: "115.0000",
          lines: {
            create: [
              expect.objectContaining({ debit: "100.0000", credit: "0.0000" }),
              expect.objectContaining({ debit: "15.0000", credit: "0.0000" }),
              expect.objectContaining({ debit: "0.0000", credit: "115.0000" }),
            ],
          },
        }),
      }),
    );
  });

  it("void creates one reversal journal", async () => {
    const tx = makeVoidTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "credit-note-1")).resolves.toMatchObject({ status: CreditNoteStatus.VOIDED });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.creditNote.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reversalJournalEntryId: "reversal-1" } }));
  });

  it("rejects linked original invoices for a different customer", async () => {
    const prisma = makeCreateValidationPrisma({
      originalInvoice: { id: "invoice-1", customerId: "customer-2", status: "FINALIZED", total: "500.0000" },
    });
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        customerId: "customer-1",
        originalInvoiceId: "invoice-1",
        issueDate: "2026-05-12T00:00:00.000Z",
        lines: [{ description: "Adjustment", accountId: "sales", quantity: "1.0000", unitPrice: "100.0000" }],
      }),
    ).rejects.toThrow("Original invoice must belong to the selected customer.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("tenant-scopes invoice credit note listing", async () => {
    const prisma = {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
      creditNote: { findMany: jest.fn() },
    };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.listForInvoice("org-1", "invoice-1")).rejects.toThrow("Sales invoice not found.");
    expect(prisma.salesInvoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "invoice-1", organizationId: "org-1" } }));
    expect(prisma.creditNote.findMany).not.toHaveBeenCalled();
  });

  it("archives generated credit note PDFs", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const service = new CreditNoteService(
      {} as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { invoiceRenderSettings: jest.fn().mockResolvedValue({ title: "Credit Note" }) } as never,
      { archivePdf } as never,
    );
    jest.spyOn(service, "pdfData").mockResolvedValue({
      organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" },
      customer: { id: "customer-1", name: "Customer", displayName: "Customer", taxNumber: null, email: null, phone: null },
      originalInvoice: { id: "invoice-1", invoiceNumber: "INV-000001", issueDate: "2026-05-12T00:00:00.000Z", total: "115.0000" },
      creditNote: {
        id: "credit-note-1",
        creditNoteNumber: "CN-000001",
        status: "FINALIZED",
        issueDate: "2026-05-12T00:00:00.000Z",
        currency: "SAR",
        notes: null,
        reason: "Adjustment",
        subtotal: "100.0000",
        discountTotal: "0.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
        total: "115.0000",
        unappliedAmount: "115.0000",
      },
      lines: [
        {
          description: "Service",
          quantity: "1.0000",
          unitPrice: "100.0000",
          discountRate: "0.0000",
          lineGrossAmount: "100.0000",
          discountAmount: "0.0000",
          taxableAmount: "100.0000",
          taxAmount: "15.0000",
          lineTotal: "115.0000",
          taxRateName: "VAT on Sales 15%",
        },
      ],
      journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: "POSTED" },
      generatedAt: new Date("2026-05-12T00:00:00.000Z"),
    });

    const result = await service.pdf("org-1", "user-1", "credit-note-1");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("credit-note-CN-000001.pdf");
    expect(archivePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: DocumentType.CREDIT_NOTE,
        sourceType: "CreditNote",
        sourceId: "credit-note-1",
        generatedById: "user-1",
      }),
    );
  });
});

function makeFinalizeTransactionMock() {
  const creditNote = {
    id: "credit-note-1",
    creditNoteNumber: "CN-000001",
    customerId: "customer-1",
    originalInvoiceId: null,
    status: CreditNoteStatus.DRAFT,
    issueDate: new Date("2026-05-12T00:00:00.000Z"),
    currency: "SAR",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    journalEntryId: null,
    customer: { id: "customer-1", name: "Customer", displayName: "Customer" },
    lines: [
      {
        accountId: "sales",
        description: "Services",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        account: { id: "sales" },
      },
    ],
  };

  return {
    creditNote: {
      findFirst: jest.fn().mockResolvedValue(creditNote),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ ...creditNote, status: CreditNoteStatus.FINALIZED, journalEntryId: "journal-existing" }),
      update: jest.fn().mockResolvedValue({ ...creditNote, status: CreditNoteStatus.FINALIZED, journalEntryId: "journal-1" }),
      aggregate: jest.fn(),
    },
    account: {
      findFirst: jest.fn(({ where }: { where: { code: string } }) => Promise.resolve({ id: where.code === "120" ? "ar" : "vat" })),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
  };
}

function makeVoidTransactionMock() {
  return {
    creditNote: {
      findFirst: jest.fn().mockResolvedValue({
        id: "credit-note-1",
        status: CreditNoteStatus.FINALIZED,
        journalEntryId: "journal-1",
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.VOIDED }),
      update: jest.fn().mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.VOIDED, reversalJournalEntryId: "reversal-1" }),
    },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "journal-1",
        entryNumber: "JE-000001",
        reference: "CN-000001",
        currency: "SAR",
        description: "Sales credit note CN-000001",
        reversedBy: null,
        lines: [
          { accountId: "sales", debit: "100.0000", credit: "0.0000", description: "Revenue reversal", currency: "SAR", exchangeRate: "1", taxRateId: null },
          { accountId: "ar", debit: "0.0000", credit: "100.0000", description: "AR credit", currency: "SAR", exchangeRate: "1", taxRateId: null },
        ],
      }),
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function makeCreateValidationPrisma(options: { originalInvoice: { id: string; customerId: string; status: string; total: string } }) {
  return {
    item: { findMany: jest.fn().mockResolvedValue([]) },
    account: { findMany: jest.fn().mockResolvedValue([{ id: "sales" }]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([]) },
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }) },
    branch: { findFirst: jest.fn() },
    salesInvoice: { findFirst: jest.fn().mockResolvedValue(options.originalInvoice) },
    creditNote: { aggregate: jest.fn().mockResolvedValue({ _sum: { total: "0.0000" } }) },
    $transaction: jest.fn(),
  };
}
