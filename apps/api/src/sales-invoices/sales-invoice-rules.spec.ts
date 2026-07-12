import {
  AccountingRuleError,
  assertBalancedJournal,
  assertJournalFxContext,
  assertDraftInvoiceEditable,
  assertFinalizableSalesInvoice,
  calculateSalesInvoiceTotals,
} from "@ledgerbyte/accounting-core";
import { AccountType, DocumentType, ItemTrackingMode, SalesInvoiceStatus, SalesInvoiceTaxMode } from "@prisma/client";
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

  it("calculates tax-inclusive invoice lines by extracting the VAT portion", () => {
    const result = calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "115.0000", taxRate: "15.0000" }], "TAX_INCLUSIVE");

    expect(result.lines[0]).toMatchObject({
      lineGrossAmount: "115.0000",
      taxableAmount: "100.0000",
      taxAmount: "15.0000",
      lineTotal: "115.0000",
    });
    expect(result).toMatchObject({ subtotal: "115.0000", taxableTotal: "100.0000", taxTotal: "15.0000", total: "115.0000" });
  });

  it("calculates tax-inclusive discounts and no-tax mode consistently", () => {
    expect(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "115.0000", discountRate: "10.0000", taxRate: "15.0000" }], "TAX_INCLUSIVE")).toMatchObject({
      discountTotal: "11.5000",
      taxableTotal: "90.0000",
      taxTotal: "13.5000",
      total: "103.5000",
    });
    expect(calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "100.0000", taxRate: "15.0000" }], "NO_TAX")).toMatchObject({
      taxableTotal: "100.0000",
      taxTotal: "0.0000",
      total: "100.0000",
    });
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

  it("builds an AED-base USD journal with immutable transaction amounts and rate evidence", () => {
    const lines = buildSalesInvoiceJournalLines({
      accountsReceivableAccountId: "ar",
      vatPayableAccountId: "vat",
      invoiceNumber: "INV-USD-1",
      customerName: "Customer",
      currency: "USD",
      baseCurrency: "AED",
      exchangeRate: "3.67250000",
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      total: "385.6125",
      transactionTotal: "105.0000",
      taxTotal: "18.3625",
      transactionTaxTotal: "5.0000",
      lines: [{ accountId: "sales", description: "Services", taxableAmount: "367.2500", transactionTaxableAmount: "100.0000" }],
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "ar", debit: "385.6125", transactionDebit: "105.0000", currency: "USD", exchangeRate: "3.67250000" }),
      expect.objectContaining({ accountId: "sales", credit: "367.2500", transactionCredit: "100.0000", rateSnapshotId: "11111111-1111-4111-8111-111111111111" }),
      expect.objectContaining({ accountId: "vat", credit: "18.3625", transactionCredit: "5.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
    expect(() => assertJournalFxContext(lines, "AED")).not.toThrow();
  });

  it("groups finalization revenue credits by selected invoice line account", () => {
    const lines = buildSalesInvoiceJournalLines({
      accountsReceivableAccountId: "ar",
      vatPayableAccountId: "vat",
      invoiceNumber: "INV-000002",
      customerName: "Customer",
      currency: "SAR",
      total: "230.0000",
      taxTotal: "30.0000",
      lines: [
        { accountId: "sales", description: "Services", taxableAmount: "100.0000" },
        { accountId: "other-income", description: "Training", taxableAmount: "100.0000" },
      ],
    });

    expect(lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: "sales", credit: "100.0000" }),
        expect.objectContaining({ accountId: "other-income", credit: "100.0000" }),
      ]),
    );
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("prefills invoice line account and tax from the selected item", async () => {
    const prisma = {
      item: {
        findMany: jest.fn().mockResolvedValue([
          { id: "item-1", name: "Consulting", description: null, revenueAccountId: "revenue-1", salesTaxRateId: "tax-1" },
        ]),
      },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-1", rate: "15.0000" }]) },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    const prepared = await prepareInvoice(service, "org-1", [
      { itemId: "item-1", quantity: "1.0000", unitPrice: "100.0000" },
    ]);

    expect(prepared.lines[0]).toMatchObject({ accountId: "revenue-1", taxRateId: "tax-1", taxableAmount: "100.0000", taxAmount: "15.0000" });
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", id: { in: ["revenue-1"] }, type: AccountType.REVENUE }),
      }),
    );
  });

  it("rejects invoice line accounts outside active posting revenue accounts in the tenant", async () => {
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    await expect(
      prepareInvoice(service, "org-1", [{ description: "Consulting", accountId: "expense-1", quantity: "1.0000", unitPrice: "100.0000" }]),
    ).rejects.toThrow("active posting revenue accounts");

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", id: { in: ["expense-1"] }, type: AccountType.REVENUE, isActive: true, allowPosting: true }),
      }),
    );
  });

  it("clears line tax rates in no-tax mode before calculation", async () => {
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    const prepared = await prepareInvoice(
      service,
      "org-1",
      [{ description: "Consulting", accountId: "revenue-1", quantity: "1.0000", unitPrice: "100.0000", taxRateId: "tax-1" }],
      SalesInvoiceTaxMode.NO_TAX,
    );

    expect(prepared.taxTotal).toBe("0.0000");
    expect(prepared.lines[0]?.taxRateId).toBeUndefined();
    expect(prisma.taxRate.findMany).not.toHaveBeenCalled();
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
    const auditLog = { log: jest.fn() };
    const service = new SalesInvoiceService(
      prisma as never,
      auditLog as never,
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
    expect(auditLog.log).not.toHaveBeenCalledWith(expect.objectContaining({ action: "FREEZE_FX_RATE" }), expect.anything());
  });

  it("does not generate or archive invoice PDFs when finalizing an invoice", async () => {
    const tx = makeFinalizeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const generatedDocuments = {
      archivePdf: jest.fn(),
      archiveInvoicePdf: jest.fn(),
    };
    const service = new SalesInvoiceService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("JE-000001") } as never,
      { reverse: jest.fn() } as never,
      undefined,
      generatedDocuments as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "FINALIZED" });
    expect(generatedDocuments.archivePdf).not.toHaveBeenCalled();
    expect(generatedDocuments.archiveInvoicePdf).not.toHaveBeenCalled();
  });

  it("blocks invoice finalization in a closed fiscal period before posting", async () => {
    const tx = makeFinalizeTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const guard = { assertPostingDateAllowed: jest.fn().mockRejectedValue(new Error("Posting date falls in a closed fiscal period.")) };
    const service = new SalesInvoiceService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { reverse: jest.fn() } as never,
      undefined,
      undefined,
      guard as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).rejects.toThrow("Posting date falls in a closed fiscal period.");
    expect(tx.salesInvoice.updateMany).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("finalizes a foreign-currency invoice into a base-balanced journal with transaction evidence", async () => {
    const tx = makeFinalizeTransactionMock({ foreign: true });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLog = { log: jest.fn() };
    const postingGuard = {
      assertPostingAllowed: jest.fn().mockRejectedValue(new Error("must not run for supported document posting")),
    };
    const service = new SalesInvoiceService(
      prisma as never,
      auditLog as never,
      { next: jest.fn() } as never,
      { reverse: jest.fn() } as never,
      undefined,
      undefined,
      undefined,
      postingGuard as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "DRAFT", journalEntryId: null } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "FINALIZED" });
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ balanceDue: "385.6125", transactionBalanceDue: "105.0000" }),
    }));
    expect(postingGuard.assertPostingAllowed).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        currency: "AED",
        totalDebit: "385.6125",
        totalCredit: "385.6125",
        lines: { create: [
          expect.objectContaining({ debit: "385.6125", transactionDebit: "105.0000", currency: "USD", exchangeRate: "3.67250000" }),
          expect.objectContaining({ credit: "367.2500", transactionCredit: "100.0000", currency: "USD" }),
          expect.objectContaining({ credit: "18.3625", transactionCredit: "5.0000", currency: "USD" }),
        ] },
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FREEZE_FX_RATE", entityType: "SalesInvoice", entityId: "invoice-1",
        after: expect.objectContaining({ currency: "USD", baseCurrency: "AED", exchangeRate: "3.67250000" }),
      }),
      tx,
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
        data: expect.objectContaining({ status: "VOIDED", balanceDue: "0.0000", transactionBalanceDue: "0.0000" }),
      }),
    );
    expect(tx.salesInvoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reversalJournalEntryId: "rev-1" } }));

    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "VOIDED", reversalJournalEntryId: "rev-1" } as never);
    await expect(service.void("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "VOIDED" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("keeps historical invoice reversal available when forward posting is blocked", async () => {
    const tx = makeVoidTransactionMock();
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const postingGuard = { assertPostingAllowed: jest.fn().mockRejectedValue(new Error("must not run")) };
    const service = new SalesInvoiceService(
      prisma as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { reverse: jest.fn() } as never,
      undefined,
      undefined,
      undefined,
      postingGuard as never,
    );
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "FINALIZED", journalEntryId: "je-1" } as never);

    await expect(service.void("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "VOIDED" });
    expect(postingGuard.assertPostingAllowed).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
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
    expect(tx.creditNoteAllocation.count).toHaveBeenCalledWith({
      where: {
        invoiceId: "invoice-1",
        organizationId: "org-1",
        reversedAt: null,
        creditNote: { status: { not: "VOIDED" } },
      },
    });
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("rejects voiding finalized invoices with active unapplied payment allocations", async () => {
    const tx = makeVoidTransactionMock({ activeUnappliedPaymentAllocationCount: 1 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "FINALIZED", journalEntryId: "je-1" } as never);

    await expect(service.void("org-1", "user-1", "invoice-1")).rejects.toThrow(
      "Cannot void invoice with active unapplied payment allocations. Reverse allocations first.",
    );
    expect(tx.customerPaymentUnappliedAllocation.count).toHaveBeenCalledWith({
      where: {
        invoiceId: "invoice-1",
        organizationId: "org-1",
        reversedAt: null,
        payment: { status: { not: "VOIDED" } },
      },
    });
    expect(tx.creditNoteAllocation.count).not.toHaveBeenCalled();
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
  });

  it("allows invoice void when credit note allocations are already reversed", async () => {
    const tx = makeVoidTransactionMock({ activeCreditAllocationCount: 0, activeUnappliedPaymentAllocationCount: 0 });
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn().mockResolvedValue("JE-000002") } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "FINALIZED", journalEntryId: "je-1" } as never);

    await expect(service.void("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "VOIDED" });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
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
          paymentUnappliedAllocations: [],
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

  it("passes only safe ZATCA metadata into explicit invoice PDF archives without submitting to ZATCA", async () => {
    const archivePdf = jest.fn();
    const archiveInvoicePdf = jest.fn().mockResolvedValue({
      document: { id: "doc-1" },
      zatcaPdfA3Archive: {
        metadataOnly: true,
        pdfA3Embedded: false,
        zatcaSubmitted: false,
        explicitArtifactCreationRequired: true,
      },
    });
    const service = new SalesInvoiceService(
      {} as never,
      { log: jest.fn() } as never,
      { next: jest.fn() } as never,
      { reverse: jest.fn() } as never,
      { invoiceRenderSettings: jest.fn().mockResolvedValue({ title: "Branded Invoice" }) } as never,
      { archivePdf, archiveInvoicePdf } as never,
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
      zatca: {
        metadataId: "metadata-1",
        status: "XML_GENERATED",
        invoiceUuid: "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
        icv: 17,
        invoiceHash: "invoice-hash",
        xmlHash: "xml-hash",
        generatedAt: new Date("2026-05-25T00:00:00.000Z"),
        hasUnsignedXml: true,
        hasQrPayload: true,
        qrCodeBase64: "QR PAYLOAD BODY",
      },
      generatedAt: new Date("2026-05-06T00:00:00.000Z"),
    });

    const result = await service.pdf("org-1", "user-1", "invoice-1");

    expect(result.document).toEqual({ id: "doc-1" });
    expect(archiveInvoicePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: DocumentType.SALES_INVOICE,
        sourceType: "SalesInvoice",
        sourceId: "invoice-1",
        zatca: expect.objectContaining({
          metadataId: "metadata-1",
          zatcaStatus: "XML_GENERATED",
          invoiceUuid: "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
          invoiceHash: "invoice-hash",
          xmlHash: "xml-hash",
          hasUnsignedXml: true,
          hasQrPayload: true,
        }),
      }),
    );
    const archivedZatca = archiveInvoicePdf.mock.calls[0]![0].zatca;
    expect(archivedZatca).not.toHaveProperty("qrCodeBase64");
    expect(JSON.stringify(archivedZatca)).not.toContain("QR PAYLOAD BODY");
    expect(archivePdf).not.toHaveBeenCalled();
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

  it("lists only finalized open invoices for a customer in the active organization", async () => {
    const openInvoices = [
      {
        id: "invoice-1",
        invoiceNumber: "INV-000001",
        issueDate: new Date("2026-05-21T00:00:00.000Z"),
        dueDate: null,
        currency: "SAR",
        total: "115.0000",
        balanceDue: "40.0000",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
      },
    ];
    const prisma = {
      salesInvoice: {
        findMany: jest.fn().mockResolvedValue(openInvoices),
      },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    await expect(service.open("org-1", " customer-1 ")).resolves.toBe(openInvoices);

    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { gt: 0 },
      },
      orderBy: { issueDate: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        currency: true,
        baseCurrency: true,
        exchangeRate: true,
        rateDate: true,
        rateSource: true,
        rateSnapshotId: true,
        total: true,
        balanceDue: true,
        transactionTotal: true,
        transactionBalanceDue: true,
        customerId: true,
        status: true,
      },
    });
  });

  it("filters invoice lists by active organization and optional branch", async () => {
    const prisma = {
      salesInvoice: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    await service.list("org-1", " branch-1 ");

    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", branchId: "branch-1" },
      }),
    );
  });

  it("filters open allocation targets by active organization, customer, and optional branch", async () => {
    const prisma = {
      salesInvoice: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    await service.open("org-1", " customer-1 ", " branch-1 ");

    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          customerId: "customer-1",
          branchId: "branch-1",
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { gt: 0 },
        },
      }),
    );
  });

  it("excludes voided DEV-06 invoices and includes INVOICE-000002-like finalized balance due targets", async () => {
    const issueDate = new Date("2026-05-24T00:00:00.000Z");
    const prisma = makeOpenInvoicePrisma([
      openInvoiceFixture({
        id: "invoice-draft",
        invoiceNumber: "DEV-06-DRAFT",
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.DRAFT,
        balanceDue: "650.0000",
        issueDate,
      }),
      openInvoiceFixture({
        id: "invoice-dev-06-voided",
        invoiceNumber: "DEV-06-VOIDED",
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.VOIDED,
        balanceDue: "650.0000",
        issueDate,
      }),
      openInvoiceFixture({
        id: "invoice-paid",
        invoiceNumber: "INVOICE-PAID",
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: "0.0000",
        issueDate,
      }),
      openInvoiceFixture({
        id: "invoice-other-customer",
        invoiceNumber: "INVOICE-OTHER-CUSTOMER",
        organizationId: "org-1",
        customerId: "customer-2",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: "650.0000",
        issueDate,
      }),
      openInvoiceFixture({
        id: "invoice-other-org",
        invoiceNumber: "INVOICE-OTHER-ORG",
        organizationId: "org-2",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: "650.0000",
        issueDate,
      }),
      openInvoiceFixture({
        id: "invoice-000002",
        invoiceNumber: "INVOICE-000002",
        organizationId: "org-1",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
        total: "1150.0000",
        balanceDue: "650.0000",
        issueDate,
      }),
    ]);
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    await expect(service.open("org-1", "customer-1")).resolves.toEqual([
      {
        id: "invoice-000002",
        invoiceNumber: "INVOICE-000002",
        issueDate,
        dueDate: null,
        currency: "SAR",
        total: "1150.0000",
        balanceDue: "650.0000",
        customerId: "customer-1",
        status: SalesInvoiceStatus.FINALIZED,
      },
    ]);

    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          customerId: "customer-1",
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { gt: 0 },
        },
      }),
    );
  });

  it("rejects missing or blank open invoice customer filters", () => {
    const prisma = {
      salesInvoice: {
        findMany: jest.fn(),
      },
    };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);

    expect(() => service.open("org-1")).toThrow("customerId is required.");
    expect(() => service.open("org-1", "   ")).toThrow("customerId is required.");
    expect(prisma.salesInvoice.findMany).not.toHaveBeenCalled();
  });

  it("supports item creation without sales tax and protects used items", async () => {
    const prisma = {
      account: { findFirst: jest.fn().mockResolvedValue({ id: "account-1" }) },
      taxRate: { findFirst: jest.fn() },
      item: {
        create: jest.fn().mockResolvedValue({ id: "item-1", name: "Service", salesTaxRateId: null }),
        findFirst: jest.fn().mockResolvedValue({
          id: "item-1",
          name: "Service",
          organizationId: "org-1",
          inventoryTracking: false,
          trackingMode: ItemTrackingMode.NONE,
          expiryTrackingEnabled: false,
          binTrackingEnabled: false,
        }),
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

interface OpenInvoiceFixture {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  customerId: string;
  status: SalesInvoiceStatus;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  total: string;
  balanceDue: string;
}

interface OpenInvoiceFindManyArgs {
  where: {
    organizationId: string;
    customerId: string;
    status: SalesInvoiceStatus;
    balanceDue: { gt: number };
  };
  select: Record<keyof Omit<OpenInvoiceFixture, "organizationId">, boolean>;
}

function openInvoiceFixture(overrides: Partial<OpenInvoiceFixture>): OpenInvoiceFixture {
  return {
    id: "invoice-1",
    invoiceNumber: "INV-001",
    organizationId: "org-1",
    customerId: "customer-1",
    status: SalesInvoiceStatus.FINALIZED,
    issueDate: new Date("2026-05-24T00:00:00.000Z"),
    dueDate: null,
    currency: "SAR",
    total: "1150.0000",
    balanceDue: "650.0000",
    ...overrides,
  };
}

function makeOpenInvoicePrisma(invoices: OpenInvoiceFixture[]) {
  return {
    salesInvoice: {
      findMany: jest.fn(({ where, select }: OpenInvoiceFindManyArgs) =>
        Promise.resolve(
          invoices
            .filter(
              (invoice) =>
                invoice.organizationId === where.organizationId &&
                invoice.customerId === where.customerId &&
                invoice.status === where.status &&
                Number(invoice.balanceDue) > where.balanceDue.gt,
            )
            .sort((left, right) => left.issueDate.getTime() - right.issueDate.getTime())
            .map((invoice) => selectOpenInvoiceFields(invoice, select)),
        ),
      ),
    },
  };
}

function selectOpenInvoiceFields(invoice: OpenInvoiceFixture, select: Record<keyof Omit<OpenInvoiceFixture, "organizationId">, boolean>) {
  return Object.fromEntries(
    Object.entries(select)
      .filter(([, include]) => include)
      .map(([key]) => [key, invoice[key as keyof OpenInvoiceFixture]]),
  );
}

function makeFinalizeTransactionMock(options: { claimCount?: number; journalCreateError?: Error; foreign?: boolean } = {}) {
  const foreign = options.foreign ?? false;
  return {
    salesInvoice: {
      findFirst: jest.fn().mockResolvedValue({
        id: "invoice-1",
        organizationId: "org-1",
        status: "DRAFT",
        journalEntryId: null,
        invoiceNumber: "INV-000001",
        issueDate: new Date("2026-05-06T00:00:00.000Z"),
        currency: foreign ? "USD" : "SAR",
        baseCurrency: foreign ? "AED" : "SAR",
        exchangeRate: foreign ? "3.67250000" : "1.00000000",
        rateDate: new Date("2026-05-06T00:00:00.000Z"),
        rateSource: foreign ? "MANUAL" : "SYSTEM_RATE_1",
        rateSnapshotId: foreign ? "11111111-1111-4111-8111-111111111111" : null,
        subtotal: foreign ? "367.2500" : "100.0000",
        discountTotal: "0.0000",
        taxableTotal: foreign ? "367.2500" : "100.0000",
        taxTotal: foreign ? "18.3625" : "15.0000",
        total: foreign ? "385.6125" : "115.0000",
        transactionSubtotal: "100.0000",
        transactionDiscountTotal: "0.0000",
        transactionTaxableTotal: "100.0000",
        transactionTaxTotal: foreign ? "5.0000" : "15.0000",
        transactionTotal: foreign ? "105.0000" : "115.0000",
        customer: { id: "customer-1", name: "Customer", displayName: null },
        lines: [
          {
            accountId: "sales-1",
            description: "Services",
            quantity: "1.0000",
            unitPrice: "100.0000",
            discountRate: "0.0000",
            lineGrossAmount: foreign ? "367.2500" : "100.0000",
            discountAmount: "0.0000",
            taxableAmount: foreign ? "367.2500" : "100.0000",
            taxAmount: foreign ? "18.3625" : "15.0000",
            lineTotal: foreign ? "385.6125" : "115.0000",
            transactionLineGrossAmount: "100.0000",
            transactionDiscountAmount: "0.0000",
            transactionTaxableAmount: "100.0000",
            transactionTaxAmount: foreign ? "5.0000" : "15.0000",
            transactionLineTotal: foreign ? "105.0000" : "115.0000",
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
    activeUnappliedPaymentAllocationCount?: number;
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
    customerPaymentUnappliedAllocation: {
      count: jest.fn().mockResolvedValue(options.activeUnappliedPaymentAllocationCount ?? 0),
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

function prepareInvoice(
  service: SalesInvoiceService,
  organizationId: string,
  lines: Array<{
    itemId?: string | null;
    description?: string;
    accountId?: string | null;
    quantity: string;
    unitPrice: string;
    discountRate?: string;
    taxRateId?: string | null;
    sortOrder?: number;
  }>,
  taxMode: SalesInvoiceTaxMode = SalesInvoiceTaxMode.TAX_EXCLUSIVE,
): Promise<{
  taxTotal: string;
  lines: Array<{ accountId: string; taxRateId?: string; taxableAmount: string; taxAmount: string }>;
}> {
  return (service as unknown as {
    prepareInvoice: (
      organizationId: string,
      lines: Array<{
        itemId?: string | null;
        description?: string;
        accountId?: string | null;
        quantity: string;
        unitPrice: string;
        discountRate?: string;
        taxRateId?: string | null;
        sortOrder?: number;
      }>,
      taxMode: SalesInvoiceTaxMode,
    ) => Promise<{
      taxTotal: string;
      lines: Array<{ accountId: string; taxRateId?: string; taxableAmount: string; taxAmount: string }>;
    }>;
  }).prepareInvoice(organizationId, lines, taxMode);
}
