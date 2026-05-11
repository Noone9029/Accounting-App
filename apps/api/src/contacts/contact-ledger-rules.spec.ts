import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CreditNoteStatus, CustomerPaymentStatus, DocumentType, SalesInvoiceStatus } from "@prisma/client";
import {
  buildCustomerLedgerRows,
  calculateStatementOpeningBalance,
  ContactLedgerService,
  filterStatementRows,
} from "./contact-ledger.service";

describe("customer ledger rules", () => {
  it("includes invoice debits, credit note credits, payment credits, allocations, void payments, and void rows", () => {
    const rows = buildCustomerLedgerRows({
      invoices: [
        invoice("invoice-1", "INV-001", "2026-01-01T00:00:00.000Z", "100.0000", SalesInvoiceStatus.FINALIZED),
        invoice("invoice-2", "INV-002", "2026-01-05T00:00:00.000Z", "200.0000", SalesInvoiceStatus.VOIDED, "2026-01-06T00:00:00.000Z"),
      ],
      creditNotes: [
        creditNote("credit-note-1", "CN-001", "2026-01-04T00:00:00.000Z", "25.0000", CreditNoteStatus.VOIDED, "2026-01-04T12:00:00.000Z"),
      ],
      creditNoteAllocations: [
        {
          id: "credit-allocation-1",
          creditNoteId: "credit-note-1",
          invoiceId: "invoice-1",
          amountApplied: "10.0000",
          createdAt: "2026-01-04T06:00:00.000Z",
          invoice: {
            id: "invoice-1",
            invoiceNumber: "INV-001",
            issueDate: "2026-01-01T00:00:00.000Z",
            total: "100.0000",
            balanceDue: "50.0000",
            status: SalesInvoiceStatus.FINALIZED,
          },
          creditNote: {
            id: "credit-note-1",
            creditNoteNumber: "CN-001",
            issueDate: "2026-01-04T00:00:00.000Z",
            total: "25.0000",
            unappliedAmount: "15.0000",
            status: CreditNoteStatus.VOIDED,
          },
        },
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

    expect(rows.map((row) => row.type)).toEqual([
      "INVOICE",
      "PAYMENT",
      "PAYMENT_ALLOCATION",
      "VOID_PAYMENT",
      "CREDIT_NOTE",
      "CREDIT_NOTE_ALLOCATION",
      "VOID_CREDIT_NOTE",
      "INVOICE",
      "VOID_INVOICE",
    ]);
    expect(rows.find((row) => row.type === "INVOICE" && row.number === "INV-001")).toMatchObject({ debit: "100.0000", credit: "0.0000", balance: "100.0000" });
    expect(rows.find((row) => row.type === "PAYMENT")).toMatchObject({ debit: "0.0000", credit: "40.0000", balance: "60.0000" });
    expect(rows.find((row) => row.type === "PAYMENT_ALLOCATION")).toMatchObject({ debit: "0.0000", credit: "0.0000", balance: "60.0000" });
    expect(rows.find((row) => row.type === "VOID_PAYMENT")).toMatchObject({ debit: "40.0000", credit: "0.0000", balance: "100.0000" });
    expect(rows.find((row) => row.type === "CREDIT_NOTE")).toMatchObject({ debit: "0.0000", credit: "25.0000", balance: "75.0000" });
    expect(rows.find((row) => row.type === "CREDIT_NOTE_ALLOCATION")).toMatchObject({
      debit: "0.0000",
      credit: "0.0000",
      balance: "75.0000",
      description: "Credit note CN-001 applied to INV-001",
    });
    expect(rows.find((row) => row.type === "VOID_CREDIT_NOTE")).toMatchObject({ debit: "25.0000", credit: "0.0000", balance: "100.0000" });
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
      creditNote: { findMany: jest.fn() },
      customerPayment: { findMany: jest.fn() },
      creditNoteAllocation: { findMany: jest.fn() },
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
    expect(prisma.creditNote.findMany).not.toHaveBeenCalled();
    expect(prisma.creditNoteAllocation.findMany).not.toHaveBeenCalled();
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

  it("returns statement PDF data with period balances", async () => {
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "Org",
          legalName: null,
          taxNumber: null,
          countryCode: "SA",
          baseCurrency: "SAR",
        }),
      },
    };
    const service = new ContactLedgerService(prisma as never);
    jest.spyOn(service, "statement").mockResolvedValue({
      contact: {
        id: "contact-1",
        name: "Customer",
        displayName: "Customer",
        type: "CUSTOMER",
        email: null,
        phone: null,
        taxNumber: null,
      },
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      openingBalance: "100.0000",
      closingBalance: "0.0000",
      rows: [
        {
          id: "row-1",
          type: "PAYMENT",
          date: "2026-05-06T00:00:00.000Z",
          number: "PAY-000001",
          description: "Payment",
          debit: "0.0000",
          credit: "100.0000",
          balance: "0.0000",
          sourceType: "CustomerPayment",
          sourceId: "payment-1",
          status: "POSTED",
          metadata: {},
        },
      ],
    });

    await expect(service.statementPdfData("org-1", "contact-1", "2026-05-01", "2026-05-31")).resolves.toMatchObject({
      organization: { id: "org-1", name: "Org" },
      contact: { id: "contact-1", name: "Customer" },
      currency: "SAR",
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      openingBalance: "100.0000",
      closingBalance: "0.0000",
      rows: [{ number: "PAY-000001", credit: "100.0000", balance: "0.0000" }],
    });
  });

  it("archives generated statement PDFs", async () => {
    const archivePdf = jest.fn().mockResolvedValue({ id: "doc-1" });
    const service = new ContactLedgerService(
      {} as never,
      { statementRenderSettings: jest.fn().mockResolvedValue({ title: "Customer Statement" }) } as never,
      { archivePdf } as never,
    );
    jest.spyOn(service, "statementPdfData").mockResolvedValue({
      organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA" },
      contact: { id: "contact-1", name: "Customer", displayName: "Customer", taxNumber: null, email: null, phone: null },
      currency: "SAR",
      periodFrom: "2026-05-01",
      periodTo: "2026-05-31",
      openingBalance: "100.0000",
      closingBalance: "0.0000",
      rows: [
        {
          date: "2026-05-06T00:00:00.000Z",
          type: "PAYMENT",
          number: "PAY-000001",
          description: "Payment",
          debit: "0.0000",
          credit: "100.0000",
          balance: "0.0000",
          status: "POSTED",
        },
      ],
      generatedAt: new Date("2026-05-06T00:00:00.000Z"),
    });

    const result = await service.statementPdf("org-1", "user-1", "contact-1", "2026-05-01", "2026-05-31");

    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(result.filename).toBe("statement-Customer-2026-05-01-to-2026-05-31.pdf");
    expect(archivePdf).toHaveBeenCalledWith(expect.objectContaining({
      documentType: DocumentType.CUSTOMER_STATEMENT,
      sourceType: "CustomerStatement",
      sourceId: "contact-1",
      generatedById: "user-1",
    }));
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

function creditNote(
  id: string,
  creditNoteNumber: string,
  issueDate: string,
  total: string,
  status: CreditNoteStatus,
  updatedAt = issueDate,
) {
  return {
    id,
    creditNoteNumber,
    issueDate,
    total,
    unappliedAmount: total,
    status,
    journalEntryId: `journal-${id}`,
    reversalJournalEntryId: status === CreditNoteStatus.VOIDED ? `reversal-${id}` : null,
    originalInvoiceId: "invoice-1",
    finalizedAt: issueDate,
    createdAt: issueDate,
    updatedAt,
  };
}
