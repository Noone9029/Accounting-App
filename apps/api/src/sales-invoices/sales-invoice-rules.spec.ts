import {
  AccountingRuleError,
  assertBalancedJournal,
  assertDraftInvoiceEditable,
  calculateSalesInvoiceTotals,
} from "@ledgerbyte/accounting-core";
import { buildSalesInvoiceJournalLines } from "./sales-invoice-accounting";
import { SalesInvoiceService } from "./sales-invoice.service";

describe("sales invoice rules", () => {
  it("calculates invoice totals with per-line tax", () => {
    const result = calculateSalesInvoiceTotals([
      { quantity: "2.0000", unitPrice: "100.0000", taxRate: "15.0000" },
      { quantity: "1.0000", unitPrice: "50.0000", taxRate: "0.0000" },
    ]);

    expect(result).toMatchObject({
      subtotal: "250.0000",
      discountTotal: "0.0000",
      taxTotal: "30.0000",
      total: "280.0000",
    });
  });

  it("calculates discounts before tax", () => {
    const result = calculateSalesInvoiceTotals([{ quantity: "1.0000", unitPrice: "200.0000", discountRate: "10.0000", taxRate: "15.0000" }]);

    expect(result.lines[0]).toMatchObject({
      discountAmount: "20.0000",
      lineSubtotal: "180.0000",
      taxAmount: "27.0000",
      lineTotal: "207.0000",
    });
    expect(result).toMatchObject({ discountTotal: "20.0000", taxTotal: "27.0000", total: "207.0000" });
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
      lines: [{ accountId: "sales", description: "Services", lineSubtotal: "100.0000" }],
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
});
