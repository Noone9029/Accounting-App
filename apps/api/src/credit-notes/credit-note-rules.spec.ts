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

  it("applies finalized credit to an open invoice without posting another journal", async () => {
    const tx = makeApplyTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED, unappliedAmount: "100.0000" } as never);

    await expect(
      service.apply("org-1", "user-1", "credit-note-1", { invoiceId: "invoice-1", amountApplied: "40.0000" }),
    ).resolves.toMatchObject({ id: "credit-note-1", unappliedAmount: "60.0000" });

    expect(tx.creditNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "credit-note-1",
        organizationId: "org-1",
        status: CreditNoteStatus.FINALIZED,
        unappliedAmount: { gte: "40.0000" },
      },
      data: { unappliedAmount: { decrement: "40.0000" } },
    });
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invoice-1",
        organizationId: "org-1",
        customerId: "customer-1",
        status: "FINALIZED",
        balanceDue: { gte: "40.0000" },
      },
      data: { balanceDue: { decrement: "40.0000" } },
    });
    expect(tx.creditNoteAllocation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountApplied: "40.0000",
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects applying draft or voided credit notes", async () => {
    const tx = makeApplyTransactionMock({ creditNoteStatus: CreditNoteStatus.DRAFT });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.DRAFT } as never);

    await expect(service.apply("org-1", "user-1", "credit-note-1", { invoiceId: "invoice-1", amountApplied: "10.0000" })).rejects.toThrow(
      "Only finalized credit notes can be applied",
    );
    expect(tx.creditNoteAllocation.create).not.toHaveBeenCalled();
  });

  it("rejects applying credit to a different customer invoice", async () => {
    const tx = makeApplyTransactionMock({ invoiceCustomerId: "customer-2" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED } as never);

    await expect(service.apply("org-1", "user-1", "credit-note-1", { invoiceId: "invoice-1", amountApplied: "10.0000" })).rejects.toThrow(
      "same customer",
    );
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
  });

  it("rejects applying above credit unapplied amount or invoice balance due", async () => {
    let tx = makeApplyTransactionMock({ unappliedAmount: "20.0000" });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED } as never);

    await expect(service.apply("org-1", "user-1", "credit-note-1", { invoiceId: "invoice-1", amountApplied: "25.0000" })).rejects.toThrow(
      "unapplied amount",
    );

    tx = makeApplyTransactionMock({ invoiceBalanceDue: "20.0000" });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED } as never);

    await expect(service.apply("org-1", "user-1", "credit-note-1", { invoiceId: "invoice-1", amountApplied: "25.0000" })).rejects.toThrow(
      "invoice balance due",
    );
  });

  it("rejects stale concurrent credit or invoice allocation claims cleanly", async () => {
    let tx = makeApplyTransactionMock({ creditUpdateCount: 0 });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED } as never);

    await expect(service.apply("org-1", "user-1", "credit-note-1", { invoiceId: "invoice-1", amountApplied: "40.0000" })).rejects.toThrow(
      "unapplied amount is no longer sufficient",
    );
    expect(tx.creditNoteAllocation.create).not.toHaveBeenCalled();

    tx = makeApplyTransactionMock({ invoiceUpdateCount: 0 });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED } as never);

    await expect(service.apply("org-1", "user-1", "credit-note-1", { invoiceId: "invoice-1", amountApplied: "40.0000" })).rejects.toThrow(
      "Invoice balance due is no longer sufficient",
    );
    expect(tx.creditNoteAllocation.create).not.toHaveBeenCalled();
  });

  it("blocks voiding finalized credit notes with active allocations", async () => {
    const tx = makeVoidTransactionMock({ allocationCount: 1 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "credit-note-1")).rejects.toThrow(
      "Cannot void credit note with active allocations. Reverse allocations first.",
    );
    expect(tx.creditNoteAllocation.count).toHaveBeenCalledWith({ where: { organizationId: "org-1", creditNoteId: "credit-note-1", reversedAt: null } });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("allows voiding finalized credit notes when allocations are reversed", async () => {
    const tx = makeVoidTransactionMock({ allocationCount: 0 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000002") } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "credit-note-1", status: CreditNoteStatus.FINALIZED, journalEntryId: "journal-1" } as never);

    await expect(service.void("org-1", "user-1", "credit-note-1")).resolves.toMatchObject({ status: CreditNoteStatus.VOIDED });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
  });

  it("reverses active allocations and restores invoice and credit balances without a journal", async () => {
    const tx = makeReverseAllocationTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(
      service.reverseAllocation("org-1", "user-1", "credit-note-1", "allocation-1", { reason: "Corrected matching" }),
    ).resolves.toMatchObject({ id: "credit-note-1", unappliedAmount: "100.0000" });

    expect(tx.creditNoteAllocation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "allocation-1", creditNoteId: "credit-note-1", organizationId: "org-1", reversedAt: null },
        data: expect.objectContaining({
          reversedById: "user-1",
          reversalReason: "Corrected matching",
        }),
      }),
    );
    expect(tx.creditNote.updateMany).toHaveBeenCalledWith({
      where: {
        id: "credit-note-1",
        organizationId: "org-1",
        status: CreditNoteStatus.FINALIZED,
        unappliedAmount: { lte: "60.0000" },
      },
      data: { unappliedAmount: { increment: "40.0000" } },
    });
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invoice-1",
        organizationId: "org-1",
        status: "FINALIZED",
        balanceDue: { lte: "60.0000" },
      },
      data: { balanceDue: { increment: "40.0000" } },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects reversing an allocation twice", async () => {
    const tx = makeReverseAllocationTransactionMock({ reversedAt: new Date("2026-05-12T00:00:00.000Z") });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseAllocation("org-1", "user-1", "credit-note-1", "allocation-1", {})).rejects.toThrow(
      "Credit allocation has already been reversed.",
    );
    expect(tx.creditNote.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale concurrent allocation reversal claims cleanly", async () => {
    const tx = makeReverseAllocationTransactionMock({ allocationUpdateCount: 0 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseAllocation("org-1", "user-1", "credit-note-1", "allocation-1", {})).rejects.toThrow(
      "Credit allocation has already been reversed.",
    );
    expect(tx.creditNote.updateMany).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale balance restoration guards cleanly", async () => {
    let tx = makeReverseAllocationTransactionMock({ creditUpdateCount: 0 });
    let prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    let service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseAllocation("org-1", "user-1", "credit-note-1", "allocation-1", {})).rejects.toThrow(
      "Credit note unapplied amount could not be restored",
    );
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();

    tx = makeReverseAllocationTransactionMock({ invoiceUpdateCount: 0 });
    prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    service = new CreditNoteService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.reverseAllocation("org-1", "user-1", "credit-note-1", "allocation-1", {})).rejects.toThrow(
      "Invoice balance due could not be restored",
    );
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
      allocations: [],
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

function makeApplyTransactionMock(options: {
  creditNoteStatus?: CreditNoteStatus;
  unappliedAmount?: string;
  invoiceCustomerId?: string;
  invoiceStatus?: string;
  invoiceBalanceDue?: string;
  creditUpdateCount?: number;
  invoiceUpdateCount?: number;
} = {}) {
  const creditNote = {
    id: "credit-note-1",
    customerId: "customer-1",
    status: options.creditNoteStatus ?? CreditNoteStatus.FINALIZED,
    total: "100.0000",
    unappliedAmount: options.unappliedAmount ?? "100.0000",
  };
  const invoice = {
    id: "invoice-1",
    customerId: options.invoiceCustomerId ?? "customer-1",
    status: options.invoiceStatus ?? "FINALIZED",
    balanceDue: options.invoiceBalanceDue ?? "100.0000",
  };

  return {
    creditNote: {
      findFirst: jest.fn().mockResolvedValue(creditNote),
      updateMany: jest.fn().mockResolvedValue({ count: options.creditUpdateCount ?? 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "credit-note-1",
        status: CreditNoteStatus.FINALIZED,
        total: "100.0000",
        unappliedAmount: "60.0000",
      }),
    },
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue(invoice),
      updateMany: jest.fn().mockResolvedValue({ count: options.invoiceUpdateCount ?? 1 }),
    },
    creditNoteAllocation: {
      create: jest.fn().mockResolvedValue({ id: "credit-allocation-1" }),
    },
    journalEntry: {
      create: jest.fn(),
    },
  };
}

function makeReverseAllocationTransactionMock(options: {
  reversedAt?: Date | null;
  creditNoteStatus?: CreditNoteStatus;
  invoiceStatus?: string;
  amountApplied?: string;
  creditUnappliedAmount?: string;
  invoiceBalanceDue?: string;
  allocationUpdateCount?: number;
  creditUpdateCount?: number;
  invoiceUpdateCount?: number;
} = {}) {
  const allocation = {
    id: "allocation-1",
    organizationId: "org-1",
    creditNoteId: "credit-note-1",
    invoiceId: "invoice-1",
    amountApplied: options.amountApplied ?? "40.0000",
    reversedAt: options.reversedAt ?? null,
    creditNote: {
      id: "credit-note-1",
      status: options.creditNoteStatus ?? CreditNoteStatus.FINALIZED,
      total: "100.0000",
      unappliedAmount: options.creditUnappliedAmount ?? "60.0000",
    },
    invoice: {
      id: "invoice-1",
      status: options.invoiceStatus ?? "FINALIZED",
      total: "100.0000",
      balanceDue: options.invoiceBalanceDue ?? "60.0000",
    },
  };

  return {
    creditNoteAllocation: {
      findFirst: jest.fn().mockResolvedValue(allocation),
      updateMany: jest.fn().mockResolvedValue({ count: options.allocationUpdateCount ?? 1 }),
    },
    creditNote: {
      updateMany: jest.fn().mockResolvedValue({ count: options.creditUpdateCount ?? 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "credit-note-1",
        status: CreditNoteStatus.FINALIZED,
        total: "100.0000",
        unappliedAmount: "100.0000",
      }),
    },
    salesInvoice: {
      updateMany: jest.fn().mockResolvedValue({ count: options.invoiceUpdateCount ?? 1 }),
    },
    journalEntry: {
      create: jest.fn(),
    },
  };
}

function makeVoidTransactionMock(options: { allocationCount?: number } = {}) {
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
    creditNoteAllocation: {
      count: jest.fn().mockResolvedValue(options.allocationCount ?? 0),
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
