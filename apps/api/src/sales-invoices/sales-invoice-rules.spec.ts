import {
  AccountingRuleError,
  assertBalancedJournal,
  assertDraftInvoiceEditable,
  assertFinalizableSalesInvoice,
  calculateSalesInvoiceTotals,
} from "@ledgerbyte/accounting-core";
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
    const finalizedInvoice = { id: "invoice-1", status: "FINALIZED" };
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
    const prisma = {
      journalEntry: { findFirst: jest.fn().mockResolvedValue({ reversedBy: { id: "rev-1" } }) },
      salesInvoice: { update: jest.fn().mockResolvedValue({ id: "invoice-1", status: "VOIDED", reversalJournalEntryId: "rev-1" }) },
    };
    const accounting = { reverse: jest.fn() };
    const service = new SalesInvoiceService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never, accounting as never);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "FINALIZED", journalEntryId: "je-1" } as never);

    await service.void("org-1", "user-1", "invoice-1");
    expect(accounting.reverse).not.toHaveBeenCalled();
    expect(prisma.salesInvoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reversalJournalEntryId: "rev-1", status: "VOIDED" }) }));

    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "invoice-1", status: "VOIDED", reversalJournalEntryId: "rev-1" } as never);
    await expect(service.void("org-1", "user-1", "invoice-1")).resolves.toMatchObject({ status: "VOIDED" });
    expect(prisma.salesInvoice.update).toHaveBeenCalledTimes(1);
  });

  it("rejects finalizing voided invoices", async () => {
    const service = new SalesInvoiceService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never, { reverse: jest.fn() } as never);
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: "VOIDED" } as never);

    await expect(service.finalize("org-1", "user-1", "invoice-1")).rejects.toThrow();
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
