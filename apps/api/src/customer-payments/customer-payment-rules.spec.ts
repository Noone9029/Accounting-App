import { BadRequestException } from "@nestjs/common";
import { assertBalancedJournal } from "@ledgerbyte/accounting-core";
import { CustomerPaymentStatus, JournalEntryStatus, SalesInvoiceStatus } from "@prisma/client";
import { buildCustomerPaymentJournalLines } from "./customer-payment-accounting";
import { CustomerPaymentService } from "./customer-payment.service";
import type { CreateCustomerPaymentDto } from "./dto/create-customer-payment.dto";

const basePaymentDto: CreateCustomerPaymentDto = {
  customerId: "customer-1",
  paymentDate: "2026-05-06T00:00:00.000Z",
  currency: "SAR",
  amountReceived: "100.0000",
  accountId: "bank-1",
  allocations: [{ invoiceId: "invoice-1", amountApplied: "100.0000" }],
};

describe("customer payment rules", () => {
  it("builds balanced AR-clearing payment journal lines", () => {
    const lines = buildCustomerPaymentJournalLines({
      paidThroughAccountId: "bank",
      accountsReceivableAccountId: "ar",
      paymentNumber: "PAY-000001",
      customerName: "Customer",
      currency: "SAR",
      amountReceived: "575.0000",
    });

    expect(lines).toEqual([
      expect.objectContaining({ accountId: "bank", debit: "575.0000", credit: "0.0000" }),
      expect.objectContaining({ accountId: "ar", debit: "0.0000", credit: "575.0000" }),
    ]);
    expect(() => assertBalancedJournal(lines)).not.toThrow();
  });

  it("rejects non-positive payment and allocation amounts", async () => {
    const service = new CustomerPaymentService({} as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", { ...basePaymentDto, amountReceived: "0.0000" })).rejects.toThrow(BadRequestException);
    await expect(
      service.create("org-1", "user-1", {
        ...basePaymentDto,
        allocations: [{ invoiceId: "invoice-1", amountApplied: "0.0000" }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects cross-tenant or invalid customer, account, and invoice references", async () => {
    const prisma = {
      contact: { findFirst: jest.fn() },
      account: { findFirst: jest.fn() },
      salesInvoice: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    prisma.contact.findFirst.mockResolvedValueOnce(null);
    prisma.account.findFirst.mockResolvedValue({ id: "bank-1" });
    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Customer must be an active customer contact");

    prisma.contact.findFirst.mockResolvedValue({ id: "customer-1", name: "Customer", displayName: null });
    prisma.account.findFirst.mockResolvedValueOnce(null);
    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Paid-through account must be");

    prisma.account.findFirst.mockResolvedValue({ id: "bank-1" });
    prisma.salesInvoice.findMany.mockResolvedValueOnce([]);
    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Allocations must reference finalized");
  });

  it("rejects allocation amounts above invoice balance due", async () => {
    const prisma = makeCreatePrismaMock({ invoiceBalanceDue: "50.0000" });
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).rejects.toThrow("Allocation amount cannot exceed invoice balance due.");
  });

  it("creates a posted payment journal and reduces invoice balance due", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeCreatePrismaMock({ tx });
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await expect(service.create("org-1", "user-1", basePaymentDto)).resolves.toMatchObject({
      id: "payment-1",
      status: CustomerPaymentStatus.POSTED,
      journalEntryId: "journal-1",
    });

    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "100.0000",
          totalCredit: "100.0000",
        }),
      }),
    );
    expect(tx.salesInvoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      data: { balanceDue: { decrement: "100.0000" } },
    });
  });

  it("supports partial allocation and records unapplied amount", async () => {
    const tx = makeCreateTransactionMock();
    const prisma = makeCreatePrismaMock({ tx, invoiceBalanceDue: "100.0000" });
    const numberSequence = { next: jest.fn().mockResolvedValueOnce("PAY-000001").mockResolvedValueOnce("JE-000001") };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await service.create("org-1", "user-1", {
      ...basePaymentDto,
      amountReceived: "100.0000",
      allocations: [{ invoiceId: "invoice-1", amountApplied: "60.0000" }],
    });

    expect(tx.customerPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountReceived: "100.0000",
          unappliedAmount: "40.0000",
        }),
      }),
    );
    expect(tx.salesInvoice.update).toHaveBeenCalledWith({
      where: { id: "invoice-1" },
      data: { balanceDue: { decrement: "60.0000" } },
    });
  });

  it("voids a posted payment once and restores allocated invoice balances", async () => {
    const tx = makeVoidTransactionMock();
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const numberSequence = { next: jest.fn().mockResolvedValue("JE-000002") };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, numberSequence as never);

    await expect(service.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({
      id: "payment-1",
      status: CustomerPaymentStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });

    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);
    expect(tx.salesInvoice.updateMany).toHaveBeenCalledWith({
      where: { id: "invoice-1", organizationId: "org-1", status: SalesInvoiceStatus.FINALIZED },
      data: { balanceDue: { increment: "60.0000" } },
    });

    prisma.customerPayment.findFirst.mockResolvedValueOnce({
      id: "payment-1",
      status: CustomerPaymentStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });
    await expect(service.void("org-1", "user-1", "payment-1")).resolves.toMatchObject({ status: CustomerPaymentStatus.VOIDED });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("does not create a second reversal when an existing reversal is linked", async () => {
    const tx = makeVoidTransactionMock({ reversedById: "existing-reversal" });
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.POSTED, journalEntryId: "journal-1" }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await service.void("org-1", "user-1", "payment-1");

    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.customerPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: CustomerPaymentStatus.VOIDED,
          voidReversalJournalEntryId: "existing-reversal",
        }),
      }),
    );
  });

  it("rejects voiding non-posted payments", async () => {
    const prisma = {
      customerPayment: { findFirst: jest.fn().mockResolvedValue({ id: "payment-1", status: CustomerPaymentStatus.DRAFT, journalEntryId: null }) },
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.void("org-1", "user-1", "payment-1")).rejects.toThrow("Only posted customer payments can be voided.");
  });

  it("returns receipt data with invoice allocations", async () => {
    const prisma = {
      customerPayment: {
        findFirst: jest.fn().mockResolvedValue({
          id: "payment-1",
          paymentNumber: "PAY-000001",
          paymentDate: new Date("2026-05-06T00:00:00.000Z"),
          customer: { id: "customer-1", name: "Customer", displayName: "Customer", email: null, phone: null, taxNumber: null },
          organization: { id: "org-1", name: "Org", legalName: null, taxNumber: null, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
          amountReceived: "115.0000",
          unappliedAmount: "0.0000",
          currency: "SAR",
          account: { id: "bank-1", code: "112", name: "Bank Account", type: "ASSET" },
          journalEntry: { id: "journal-1", entryNumber: "JE-000001", status: JournalEntryStatus.POSTED, totalDebit: "115.0000", totalCredit: "115.0000" },
          allocations: [
            {
              invoiceId: "invoice-1",
              amountApplied: "115.0000",
              invoice: {
                id: "invoice-1",
                invoiceNumber: "INV-000001",
                issueDate: new Date("2026-05-06T00:00:00.000Z"),
                total: "115.0000",
                balanceDue: "0.0000",
              },
            },
          ],
          status: CustomerPaymentStatus.POSTED,
        }),
      },
    };
    const service = new CustomerPaymentService(prisma as never, { log: jest.fn() } as never, { next: jest.fn() } as never);

    await expect(service.receiptData("org-1", "payment-1")).resolves.toMatchObject({
      receiptNumber: "PAY-000001",
      amountReceived: "115.0000",
      allocations: [{ invoiceId: "invoice-1", invoiceNumber: "INV-000001", amountApplied: "115.0000" }],
    });
    expect(prisma.customerPayment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "payment-1", organizationId: "org-1" } }));
  });
});

function makeCreatePrismaMock(options: { tx?: ReturnType<typeof makeCreateTransactionMock>; invoiceBalanceDue?: string } = {}) {
  const tx = options.tx ?? makeCreateTransactionMock();
  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1", name: "Customer", displayName: null }) },
    account: { findFirst: jest.fn().mockResolvedValue({ id: "bank-1" }) },
    salesInvoice: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "invoice-1",
          balanceDue: options.invoiceBalanceDue ?? "100.0000",
          status: SalesInvoiceStatus.FINALIZED,
        },
      ]),
    },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
}

function makeCreateTransactionMock() {
  return {
    account: { findFirst: jest.fn().mockResolvedValue({ id: "ar-1" }) },
    journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-1" }) },
    customerPayment: {
      create: jest.fn().mockResolvedValue({
        id: "payment-1",
        paymentNumber: "PAY-000001",
        status: CustomerPaymentStatus.POSTED,
        journalEntryId: "journal-1",
      }),
    },
    salesInvoice: { update: jest.fn() },
  };
}

function makeVoidTransactionMock(options: { reversedById?: string } = {}) {
  return {
    customerPayment: {
      findFirst: jest.fn().mockResolvedValue({
        id: "payment-1",
        paymentNumber: "PAY-000001",
        paymentDate: new Date("2026-05-06T00:00:00.000Z"),
        currency: "SAR",
        status: CustomerPaymentStatus.POSTED,
        allocations: [{ invoiceId: "invoice-1", amountApplied: "60.0000" }],
        journalEntry: {
          id: "journal-1",
          entryNumber: "JE-000001",
          description: "Customer payment PAY-000001 - Customer",
          reversedBy: options.reversedById ? { id: options.reversedById } : null,
          lines: [
            {
              accountId: "bank-1",
              debit: "60.0000",
              credit: "0.0000",
              description: "Customer payment PAY-000001 - Customer",
              currency: "SAR",
              exchangeRate: "1.00000000",
              taxRateId: null,
            },
            {
              accountId: "ar-1",
              debit: "0.0000",
              credit: "60.0000",
              description: "Accounts receivable cleared by PAY-000001 - Customer",
              currency: "SAR",
              exchangeRate: "1.00000000",
              taxRateId: null,
            },
          ],
        },
      }),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn().mockResolvedValue({
        id: "payment-1",
        status: CustomerPaymentStatus.VOIDED,
        voidReversalJournalEntryId: options.reversedById ?? "reversal-1",
      }),
    },
    journalEntry: {
      create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
      update: jest.fn(),
    },
    salesInvoice: { updateMany: jest.fn() },
  };
}
