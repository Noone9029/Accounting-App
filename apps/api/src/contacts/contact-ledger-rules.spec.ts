import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CustomerPaymentStatus, SalesInvoiceStatus } from "@prisma/client";
import {
  buildCustomerLedgerRows,
  calculateStatementOpeningBalance,
  ContactLedgerService,
  filterStatementRows,
} from "./contact-ledger.service";

describe("customer ledger rules", () => {
  it("includes invoice debits, payment credits, allocations, void payments, and void invoices", () => {
    const rows = buildCustomerLedgerRows({
      invoices: [
        invoice("invoice-1", "INV-001", "2026-01-01T00:00:00.000Z", "100.0000", SalesInvoiceStatus.FINALIZED),
        invoice("invoice-2", "INV-002", "2026-01-04T00:00:00.000Z", "200.0000", SalesInvoiceStatus.VOIDED, "2026-01-05T00:00:00.000Z"),
      ],
      payments: [
        {
          id: "payment-1",
          paymentNumber: "PAY-001",
          paymentDate: "2026-01-02T00:00:00.000Z",
          status: CustomerPaymentStatus.VOIDED,
          amountReceived: "40.0000",
          unappliedAmount: "0.0000",
          description: "Payment",
          voidedAt: "2026-01-03T00:00:00.000Z",
          createdAt: "2026-01-02T00:00:00.000Z",
          updatedAt: "2026-01-03T00:00:00.000Z",
          allocations: [
            {
              id: "allocation-1",
              invoiceId: "invoice-1",
              amountApplied: "40.0000",
              createdAt: "2026-01-02T00:00:01.000Z",
              invoice: {
                id: "invoice-1",
                invoiceNumber: "INV-001",
                issueDate: "2026-01-01T00:00:00.000Z",
                total: "100.0000",
                balanceDue: "60.0000",
                status: SalesInvoiceStatus.FINALIZED,
              },
            },
          ],
        },
      ],
    });

    expect(rows.map((row) => row.type)).toEqual(["INVOICE", "PAYMENT", "PAYMENT_ALLOCATION", "VOID_PAYMENT", "INVOICE", "VOID_INVOICE"]);
    expect(rows.find((row) => row.type === "INVOICE" && row.number === "INV-001")).toMatchObject({ debit: "100.0000", credit: "0.0000", balance: "100.0000" });
    expect(rows.find((row) => row.type === "PAYMENT")).toMatchObject({ debit: "0.0000", credit: "40.0000", balance: "60.0000" });
    expect(rows.find((row) => row.type === "PAYMENT_ALLOCATION")).toMatchObject({ debit: "0.0000", credit: "0.0000", balance: "60.0000" });
    expect(rows.find((row) => row.type === "VOID_PAYMENT")).toMatchObject({ debit: "40.0000", credit: "0.0000", balance: "100.0000" });
    expect(rows.at(-1)).toMatchObject({ type: "VOID_INVOICE", credit: "200.0000", balance: "100.0000" });
  });

  it("calculates statement opening balance and filters statement rows by period", () => {
    const rows = buildCustomerLedgerRows({
      invoices: [
        invoice("invoice-1", "INV-001", "2026-01-01T00:00:00.000Z", "100.0000", SalesInvoiceStatus.FINALIZED),
        invoice("invoice-2", "INV-002", "2026-02-01T00:00:00.000Z", "50.0000", SalesInvoiceStatus.FINALIZED),
      ],
      payments: [
        {
          id: "payment-1",
          paymentNumber: "PAY-001",
          paymentDate: "2026-01-15T00:00:00.000Z",
          status: CustomerPaymentStatus.POSTED,
          amountReceived: "30.0000",
          unappliedAmount: "0.0000",
          createdAt: "2026-01-15T00:00:00.000Z",
          updatedAt: "2026-01-15T00:00:00.000Z",
          allocations: [],
        },
      ],
    });

    const from = new Date("2026-01-10T00:00:00.000Z");
    const to = new Date("2026-01-31T23:59:59.999Z");
    const opening = calculateStatementOpeningBalance(rows, from);
    const periodRows = filterStatementRows(rows, from, to);

    expect(opening).toBe("100.0000");
    expect(periodRows).toHaveLength(1);
    expect(periodRows[0]).toMatchObject({ type: "PAYMENT", credit: "30.0000" });
  });

  it("rejects cross-tenant or non-customer contact ledgers", async () => {
    const prisma = {
      contact: { findFirst: jest.fn().mockResolvedValue(null) },
      salesInvoice: { findMany: jest.fn() },
      customerPayment: { findMany: jest.fn() },
    };
    const service = new ContactLedgerService(prisma as never);

    await expect(service.ledger("org-1", "contact-1")).rejects.toThrow(NotFoundException);
    expect(prisma.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          id: "contact-1",
          type: { in: ["CUSTOMER", "BOTH"] },
        }),
      }),
    );
    expect(prisma.salesInvoice.findMany).not.toHaveBeenCalled();
    expect(prisma.customerPayment.findMany).not.toHaveBeenCalled();
  });

  it("rejects impossible statement calendar dates", async () => {
    const service = new ContactLedgerService({} as never);
    jest.spyOn(service, "ledger").mockResolvedValue({
      contact: {
        id: "contact-1",
        name: "Customer",
        displayName: null,
        type: "CUSTOMER",
        email: null,
        phone: null,
        taxNumber: null,
      },
      openingBalance: "0.0000",
      closingBalance: "0.0000",
      rows: [],
    });

    await expect(service.statement("org-1", "contact-1", "2026-02-31", "2026-03-31")).rejects.toThrow(BadRequestException);
  });
});

function invoice(
  id: string,
  invoiceNumber: string,
  issueDate: string,
  total: string,
  status: SalesInvoiceStatus,
  updatedAt = issueDate,
) {
  return {
    id,
    invoiceNumber,
    issueDate,
    total,
    status,
    journalEntryId: `journal-${id}`,
    reversalJournalEntryId: status === SalesInvoiceStatus.VOIDED ? `reversal-${id}` : null,
    finalizedAt: issueDate,
    createdAt: issueDate,
    updatedAt,
  };
}
