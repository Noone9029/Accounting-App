import {
  AccountingRuleError,
  assertBalancedJournal,
  assertDraftInvoiceEditable,
  assertFinalizableSalesInvoice,
  calculateSalesInvoiceTotals,
} from "@ledgerbyte/accounting-core";
import { DocumentType } from "@prisma/client";
import { buildSalesInvoiceJournalLines } from "./sales-invoice-accounting";
import { SalesInvoiceService } from "./sales-invoice.service";
import { ItemService } from "../items/item.service";

describe("sales invoice rules", () => {
  it("calculates invoice totals with per-line tax", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "2.0000", unitPrice: "100.0000", taxRate: "15.0000" },
      { quantity: "1.0000", unitPrice: "50.0000", taxRate: "0.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "250.0000",
      discountTotal: "0.0000",
      taxableTotal: "250.0000",
      taxTotal: "30.0000",
      total: "280.0000",
    });
  });

  it("calculates discounts before tax", () => {
    const result = calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "200.0000", discountRate: "10.0000", taxRate: "15.0000" }]);

    expect(result.lines[0]).toMatchObject({
      lineGrossAmount: "200.0000",
      discountAmount: "20.0000",
      taxableAmount: "180.0000",
      taxAmount: "27.0000",
      lineTotal: "207.0000",
    });
    expect(result).toMatchObject({ subtotal: "200.0000", discountTotal: "20.0000", taxableTotal: "180.0000", taxTotal: "27.0000", total: "207.0000" });
  });

  it("supports lines without tax rates", () => {
    expect(calculateSalesInvoiceTotals([{ quantity: "3.0000", unitPrice: "10.0000" }])).toMatchObject({
      subtotal: "30.0000",
      taxableTotal: "30.0000",
      taxTotal: "0.0000",
      total: "30.0000",
    });
  });

  it("supports 100% discount and zero unit price draft lines", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "1.0000", unitPrice: "100.0000", discountRate: "100.0000", taxRate: "15.0000" },
      { quantity: "1.0000", unitPrice: "0.0000", taxRate: "15.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "100.0000",
      discountTotal: "100.0000",
      taxableTotal: "0.0000",
      taxTotal: "0.0000",
      total: "0.0000",
    });
    expect(() => assertFinalizableSalesInvoice(result)).toThrow(AccountingRuleError);
  });

  it("rejects invalid invoice line values", () => {
    expect(() => calculateSalesInvoiceTotals([{ quantity: "0.0000", unitPrice: "10.0000" }])).toThrow(AccountingRuleError);
    expect(() => calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "-1.0000" }])).toThrow(AccountingRuleError);
    expect(() => calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "10.0000", discountRate: "100.0001" }])).toThrow(AccountingRuleError);
    expect(() => calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "10.0000", taxRate: "-1.0000" }])).toThrow(AccountingRuleError);
  });

  it("allows draft invoices to be edited and rejects finalized invoices", () => {
    expect(() => assertDraftInvoiceEditable("DRAFT")).not.toThrow();
    expect(() => assertDraftInvoiceEditable("FINALIZED")).toThrow(AccountingRuleError);
    expect(() => assertDraftInvoiceEditable("VOIDED")).toThrow(AccountingRuleError);
  });

  it("builds balanced finalization journal lines", () => {
    const lines = buildSalesInvoiceJournalLines({
      accountsReceivableAccountId: "ar",
      vatPayableAccountId: "vat",
      invoiceNumber: "INV-000001",
      customerName: "Customer",
      currency: "SAR",
      total: "115.0000",
      taxTotal: "15.0000",
      lines: [{ accountId: "sales", description: "Services", taxableAmount: "100.0000" }],
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "ar", debit: "115.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "sales", debit: "0.0000", credit: "100.0000" }),
      expect.objectContaining({ accountId: "vat", debit: "0.0000", credit: "15.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("does not post again when finalizing an already finalized invoice", async () => {
    const finalizedInvoice = { id: "invoice-1", status: "FINALIZED", journalEntryId: "journal-1" };
    const prisma = { $transaction: jest.fn() };
    const service = new SalesInvoiceService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { reverse: jest.fn() } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue(finalizedInvoice as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).resolves.toBe(finalizedInvoice);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not create a journal when a competing finalize already claimed the invoice", async () => {
    const tx = makeFinalizeTransactionMock({ claimCount: 0 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).resolves.toMatchObject({
      id: "invoice-1",
      status: "FINALIZED",
      journalEntryId: "journal-existing",
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
  });

  it("creates ZATCA invoice metadata when finalizing an invoice", async () => {
    const tx = makeFinalizeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000001") } as never,
      { reverse: jest.fn() } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "FINALIZED", journalEntryId: "journal-1" });
    expect(tx.zatcaInvoiceMetadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { invoiceId: "invoice-1" },
        create: expect.objectContaining({ organizationId: "org-1", invoiceId: "invoice-1", zatcaInvoiceType: "STANDARD_TAX_INVOICE" }),
      }),
    );
  });

  it("does not link a journal when finalization journal creation fails", async () => {
    const tx = makeFinalizeTransactionMock({ journalCreateError: new Error("journal failed") });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-000001") } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).rejects.toThrow("journal failed");
    expect(tx.salesInvoice.update).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
  });

  it("prevents updates to finalized invoices", async () => {
    const service = new SalesInvoiceService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "FINALIZED" } as never);

    await expect(service.update("org-1", "user-1", "invoice-1", {})).rejects.toThrow();
  });

  it("deletes draft invoices and rejects finalized invoice deletion", async () => {
    const prisma = { salesInvoice: { delete: jest.fn().mockResolvedValue({}) } };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.remove("org-1", "user-1", "invoice-1")).resolves.toEqual({ deleted: true });
    expect(prisma.salesInvoice.delete).toHaveBeenCalledWith({ where: { id: "invoice-1" } });

    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-2", status: "FINALIZED", journalEntryId: "je-1" } as never);
    await expect(service.remove("org-1", "user-1", "invoice-2")).rejects.toThrow();
  });

  it("voids finalized invoices using one existing reversal and returns voided invoices idempotently", async () => {
    const tx = makeVoidTransactionMock({ reversedById: "rev-1" });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const accounting = { reverse: jest.fn() };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, accounting as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "FINALIZED", journalEntryId: "je-1" } as never);

    await service.void("org-1", "user-1", "invoice-1");
    expect(accounting.reverse).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice-1", organizationId: "org-1", status: "FINALIZED" },
        data: expect.objectContaining({ status: "VOIDED", balanceDue: "0.0000" }),
      }),
    );
    expect(tx.salesInvoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reversalJournalEntryId: "rev-1" } }));

    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "VOIDED", reversalJournalEntryId: "rev-1" } as never);
    await expect(service.void("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "VOIDED" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("rejects voiding finalized invoices with active payment allocations", async () => {
    const tx = makeVoidTransactionMock({ activePaymentCount: 1 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "FINALIZED", journalEntryId: "je-1" } as never);

    await expect(service.void("org-1", "user-1", "invoice-1")).rejects.toThrow("Cannot void invoice with active payments. Void payments first.");
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects voiding finalized invoices with active credit note allocations", async () => {
    const tx = makeVoidTransactionMock({ activeCreditAllocationCount: 1 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "FINALIZED", journalEntryId: "je-1" } as never);

    await expect(service.void("org-1", "user-1", "invoice-1")).rejects.toThrow(
      "Cannot void invoice with active credit note allocations. Reverse allocations first.",
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("voids draft invoices without creating reversal journals", async () => {
    const tx = makeVoidTransactionMock({ invoiceStatus: "DRAFT", journalEntryId: null });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.void("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "VOIDED" });
    expect(tx.customerPaymentAllocation.count).not.toHaveBeenCalled();
    expect(tx.creditNoteAllocation.count).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects finalizing voided invoices", async () => {
    const service = new SalesInvoiceService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "VOIDED" } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).rejects.toThrow();
  });

  it("returns invoice PDF data with totals, lines, and payments", async () => {
    const prisma = {
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: "invoice-1",
          invoiceNumber: "INV-000001",
          status: "FINALIZED",
          issueDate: new Date("2026-05-06T00:00:00.000Z"),
          dueDate: null,
          currency: "SAR",
          notes: "Notes",
          terms: "Terms",
          subtotal: "100.0000",
          discountTotal: "0.0000",
          taxableTotal: "100.0000",
          taxTotal: "15.0000",
          total: "115.0000",
          balanceDue: "65.0000",
          organization: { id: "org-1", name: "Org", legalName: null, taxNumber: "300", countryCode: "SA" },
          customer: {
            id: "customer-1",
            name: "Customer",
            displayName: "Customer",
            taxNumber: null,
            email: null,
            phone: null,
            addressLine1: null,
            addressLine2: null,
            city: null,
            postalCode: null,
            countryCode: "SA",
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
              taxRate: { name: "VAT on Sales 15%" },
            },
          ],
          paymentAllocations: [
            {
              amountApplied: "50.0000",
              payment: {
                paymentNumber: "PAY-000001",
                paymentDate: new Date("2026-05-06T00:00:00.000Z"),
                status: "POSTED",
              },
            },
          ],
        }),
      },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    await expect(service.pdfData("org-1", "invoice-1")).resolves.toMatchObject({
      invoice: {
        invoiceNumber: "INV-000001",
        subtotal: "100.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
        total: "115.0000",
        balanceDue: "65.0000",
      },
      lines: [{ description: "Service", taxRateName: "VAT on Sales 15%" }],
      payments: [{ paymentNumber: "PAY-000001", amountApplied: "50.0000" }],
    });
    expect(prisma.salesInvoice.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "invoice-1", organizationId: "org-1" } }));
  });

  it("archives generated invoice PDFs", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const service = new SalesInvoiceService(
      {} as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { reverse: jest.fn() } as never,
      { invoiceRenderSettings: jest.fn().mockResolvedValue({ title: "Branded Invoice" }) } as never,
      { archivePdf } as never,
    );
    jest.spyOn(service, "pdfData").mockResolvedValue({
      organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" },
      customer: { id: "customer-1", name: "Customer", displayName: "Customer", taxNumber: null, email: null, phone: null },
      invoice: {
        id: "invoice-1",
        invoiceNumber: "INV-000001",
        status: "FINALIZED",
        issueDate: "2026-05-06T00:00:00.000Z",
        dueDate: null,
        currency: "SAR",
        notes: null,
        terms: null,
        subtotal: "100.0000",
        discountTotal: "0.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
        total: "115.0000",
        balanceDue: "115.0000",
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
      payments: [],
      generatedAt: new Date("2026-05-06T00:00:00.000Z"),
    });

    const result = await service.pdf("org-1", "user-1", "invoice-1");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("invoice-INV-000001.pdf");
    expect(archivePdf).toHaveBeenCalledWith(expect.objectContaining({
      documentType: DocumentType.SALES_INVOICE,
      sourceType: "SalesInvoice",
      sourceId: "invoice-1",
      documentNumber: "INV-000001",
      generatedById: "user-1",
    }));
  });

  it("rejects cross-tenant invoice references", async () => {
    const baseLine = { description: "Service", accountId: "account-1", quantity: "1.0000", unitPrice: "10.0000" };
    const prisma = {
      contact: { findFirst: jest.fn() },
      branch: { findFirst: jest.fn() },
      item: { findMany: jest.fn() },
      account: { findMany: jest.fn() },
      taxRate: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    prisma.contact.findFirst.mockResolvedValueOnce(null);
    await expect(service.create("org-1", "user-1", { customerId: "other-customer", issueDate: new Date().toISOString(), lines: [baseLine] })).rejects.toThrow();

    prisma.contact.findFirst.mockResolvedValue({ id: "customer-1" });
    prisma.branch.findFirst.mockResolvedValueOnce(null);
    await expect(service.create("org-1", "user-1", { customerId: "customer-1", branchId: "other-branch", issueDate: new Date().toISOString(), lines: [baseLine] })).rejects.toThrow();

    prisma.branch.findFirst.mockResolvedValue({ id: "branch-1" });
    prisma.item.findMany.mockResolvedValueOnce([]);
    await expect(service.create("org-1", "user-1", { customerId: "customer-1", issueDate: new Date().toISOString(), lines: [{ ...baseLine, itemId: "other-item" }] })).rejects.toThrow();

    prisma.item.findMany.mockResolvedValue([]);
    prisma.account.findMany.mockResolvedValueOnce([]);
    await expect(service.create("org-1", "user-1", { customerId: "customer-1", issueDate: new Date().toISOString(), lines: [baseLine] })).rejects.toThrow();

    prisma.account.findMany.mockResolvedValue([{ id: "account-1" }]);
    prisma.taxRate.findMany.mockResolvedValueOnce([]);
    await expect(service.create("org-1", "user-1", { customerId: "customer-1", issueDate: new Date().toISOString(), lines: [{ ...baseLine, taxRateId: "other-tax" }] })).rejects.toThrow();
  });

  it("supports item creation without sales tax and protects used items", async () => {
    const prisma = {
      account: { findFirst: jest.fn().mockResolvedValue({ id: "account-1" }) },
      taxRate: { findFirst: jest.fn() },
      item: {
        create: jest.fn().mockResolvedValue({ id: "item-1", name: "Service", salesTaxRateId: null }),
        findFirst: jest.fn().mockResolvedValue({ id: "item-1", name: "Service", organizationId: "org-1" }),
        update: jest.fn().mockResolvedValue({ id: "item-1", name: "Service", status: "DISABLED" }),
      },
      salesInvoiceLine: { count: jest.fn().mockResolvedValue(1) },
    };
    const service = new ItemService(prisma as never, { log: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        name: "Service",
        type: "SERVICE",
        sellingPrice: "0.0000",
        revenueAccountId: "account-1",
      }),
    ).resolves.toMatchObject({ salesTaxRateId: null });
    expect(prisma.taxRate.findFirst).not.toHaveBeenCalled();

    prisma.account.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.create("org-1", "user-1", {
        name: "Bad Service",
        type: "SERVICE",
        sellingPrice: "0.0000",
        revenueAccountId: "other-account",
      }),
    ).rejects.toThrow();

    await expect(service.remove("org-1", "user-1", "item-1")).rejects.toThrow();
    await expect(service.update("org-1", "user-1", "item-1", { status: "DISABLED" })).resolves.toMatchObject({ status: "DISABLED" });
  });
});

function makeFinalizeTransactionMock(options: { claimCount?: number; journalCreateError?: Error } = {}) {
  return {
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue({
        id: "invoice-1",
        organizationId: "org-1",
        status: "DRAFT",
        journalEntryId: null,
        invoiceNumber: "INV-000001",
        issueDate: new Date("2026-05-06T00:00:00.000Z"),
        currency: "SAR",
        subtotal: "100.0000",
        discountTotal: "0.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
        total: "115.0000",
        customer: { id: "customer-1", name: "Customer", displayName: null },
        lines: [
          {
            accountId: "sales-1",
            description: "Services",
            quantity: "1.0000",
            unitPrice: "100.0000",
            discountRate: "0.0000",
            lineGrossAmount: "100.0000",
            discountAmount: "0.0000",
            taxableAmount: "100.0000",
            taxAmount: "15.0000",
            lineTotal: "115.0000",
          },
        ],
      }),
      updateMany: jest.fn().mockResolvedValue({ count: options.claimCount ?? 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "invoice-1",
        status: "FINALIZED",
        journalEntryId: "journal-existing",
      }),
      update: jest.fn().mockResolvedValue({
        id: "invoice-1",
        status: "FINALIZED",
        journalEntryId: "journal-1",
      }),
    },
    account: { findFirst: jest.fn().mockResolvedValue({ id: "account-1" }) },
    journalEntry: {
      create: options.journalCreateError
        ? jest.fn().mockRejectedValue(options.journalCreateError)
        : jest.fn().mockResolvedValue({ id: "journal-1" }),
    },
    zatcaInvoiceMetadata: {
      upsert: jest.fn().mockResolvedValue({ id: "zatca-metadata-1" }),
    },
  };
}

function makeVoidTransactionMock(
  options: {
    invoiceStatus?: "DRAFT" | "FINALIZED";
    journalEntryId?: string | null;
    reversedById?: string;
    activePaymentCount?: number;
    activeCreditAllocationCount?: number;
  } = {},
) {
  return {
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue({
        id: "invoice-1",
        organizationId: "org-1",
        status: options.invoiceStatus ?? "FINALIZED",
        journalEntryId: options.journalEntryId === undefined ? "je-1" : options.journalEntryId,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: "invoice-1",
        status: "VOIDED",
        reversalJournalEntryId: options.reversedById ?? null,
      }),
      update: jest.fn().mockResolvedValue({
        id: "invoice-1",
        status: "VOIDED",
        reversalJournalEntryId: options.reversedById ?? "rev-1",
      }),
    },
    customerPaymentAllocation: {
      count: jest.fn().mockResolvedValue(options.activePaymentCount ?? 0),
    },
    creditNoteAllocation: {
      count: jest.fn().mockResolvedValue(options.activeCreditAllocationCount ?? 0),
    },
    journalEntry: {
      findFirst: jest.fn().mockResolvedValue({
        id: "je-1",
        entryNumber: "JE-000001",
        description: "Sales invoice INV-000001 - Customer",
        reference: "INV-000001",
        currency: "SAR",
        reversedBy: options.reversedById ? { id: options.reversedById } : null,
        lines: [
          {
            accountId: "ar-1",
            debit: "115.0000",
            credit: "0.0000",
            description: "Accounts receivable for INV-000001 - Customer",
            currency: "SAR",
            exchangeRate: "1.00000000",
            taxRateId: null,
          },
          {
            accountId: "sales-1",
            debit: "0.0000",
            credit: "100.0000",
            description: "Sales revenue for INV-000001 - Services",
            currency: "SAR",
            exchangeRate: "1.00000000",
            taxRateId: null,
          },
          {
            accountId: "vat-1",
            debit: "0.0000",
            credit: "15.0000",
            description: "VAT payable for INV-000001",
            currency: "SAR",
            exchangeRate: "1.00000000",
            taxRateId: null,
          },
        ],
      }),
      create: jest.fn().mockResolvedValue({ id: "rev-1" }),
      update: jest.fn(),
    },
  };
}
