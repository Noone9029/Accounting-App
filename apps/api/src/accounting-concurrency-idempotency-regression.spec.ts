import { BadRequestException } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankStatementImportStatus,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  CurrencyRateSource,
  CustomerPaymentStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
} from "@prisma/client";
import { BankStatementService } from "./bank-statements/bank-statement.service";
import { CustomerPaymentService } from "./customer-payments/customer-payment.service";
import { SalesInvoiceService } from "./sales-invoices/sales-invoice.service";

interface CustomerPaymentCreateArgs {
  data: {
    allocations: {
      create: Array<{
        invoice: { connect: { organizationId_id: { id: string } } };
        realizedGainAmount: string;
        realizedLossAmount: string;
        realizedFxJournalEntryId: string | null;
      }>;
    };
  };
}

describe("accounting concurrency and idempotency regression", () => {
  it("does not double-post a sales invoice when duplicate finalize requests race", async () => {
    const harness = makeSalesInvoiceFinalizeHarness();
    const service = new SalesInvoiceService(
      harness.prisma as never,
      { log: jest.fn() } as never,
      harness.numberSequence as never,
      { reverse: jest.fn() } as never,
    );
    jest.spyOn(service, "get").mockResolvedValue({ id: "invoice-1", status: SalesInvoiceStatus.DRAFT, journalEntryId: null } as never);

    const results = await Promise.all([
      service.finalize("org-1", "user-1", "invoice-1"),
      service.finalize("org-1", "user-1", "invoice-1"),
    ]);

    expect(results).toEqual([
      expect.objectContaining({ status: SalesInvoiceStatus.FINALIZED, journalEntryId: "journal-1" }),
      expect.objectContaining({ status: SalesInvoiceStatus.FINALIZED, journalEntryId: "journal-1" }),
    ]);
    expect(harness.tx.journalEntry.create).toHaveBeenCalledTimes(1);
    expect(harness.tx.salesInvoice.updateMany).toHaveBeenCalledTimes(2);
    expect(harness.tx.zatcaInvoiceMetadata.upsert).toHaveBeenCalledTimes(1);
    expect(harness.state.invoice).toMatchObject({
      status: SalesInvoiceStatus.FINALIZED,
      journalEntryId: "journal-1",
      balanceDue: "115.0000",
    });
  });

  it("blocks duplicate customer payment allocation attempts from overpaying one invoice", async () => {
    const harness = makeCustomerPaymentAllocationHarness();
    const service = new CustomerPaymentService(
      harness.prisma as never,
      { log: jest.fn() } as never,
      harness.numberSequence as never,
    );

    const attempts = await Promise.allSettled([
      service.create("org-1", "user-1", baseCustomerPaymentDto),
      service.create("org-1", "user-1", baseCustomerPaymentDto),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((attempt): attempt is PromiseRejectedResult => attempt.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(BadRequestException);
    expect(rejected?.reason.message).toBe("Allocation amount cannot exceed invoice balance due.");
    expect(harness.snapshot()).toEqual({
      invoiceBalanceDue: "0.0000",
      customerPaymentCount: 1,
      customerPaymentAllocationCount: 1,
      journalEntryCount: 1,
    });
  });

  it("does not let a stale bank match overwrite an already matched statement transaction", async () => {
    const { service, prisma, audit } = makeBankStatementMatchService({
      staleMatchClaimCount: 0,
    });

    await expect(
      service.matchTransaction("org-1", "user-1", "statement-transaction-1", { journalLineId: "line-1" }),
    ).rejects.toThrow("Only unmatched bank statement transactions can be matched.");

    expect(prisma.bankStatementTransaction.updateMany).toHaveBeenCalledWith({
      where: {
        id: "statement-transaction-1",
        organizationId: "org-1",
        status: BankStatementTransactionStatus.UNMATCHED,
      },
      data: {
        status: BankStatementTransactionStatus.MATCHED,
        matchedJournalLineId: "line-1",
        matchedJournalEntryId: "journal-1",
        matchType: BankStatementMatchType.JOURNAL_LINE,
      },
    });
    expect(prisma.bankStatementTransaction.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});

const baseCustomerPaymentDto = {
  customerId: "customer-1",
  paymentDate: "2026-05-06T00:00:00.000Z",
  currency: "SAR",
  amountReceived: "100.0000",
  accountId: "bank-1",
  allocations: [{ invoiceId: "invoice-1", amountApplied: "100.0000" }],
};

function makeSalesInvoiceFinalizeHarness() {
  const state = {
    invoice: {
      id: "invoice-1",
      organizationId: "org-1",
      status: SalesInvoiceStatus.DRAFT as SalesInvoiceStatus,
      journalEntryId: null as string | null,
      invoiceNumber: "INV-000001",
      issueDate: new Date("2026-05-06T00:00:00.000Z"),
      currency: "SAR",
      baseCurrency: "SAR",
      exchangeRate: "1.00000000",
      rateDate: new Date("2026-05-06T00:00:00.000Z"),
      rateSource: CurrencyRateSource.SYSTEM_RATE_1,
      rateSnapshotId: null,
      subtotal: "100.0000",
      transactionSubtotal: "100.0000",
      discountTotal: "0.0000",
      transactionDiscountTotal: "0.0000",
      taxableTotal: "100.0000",
      transactionTaxableTotal: "100.0000",
      taxTotal: "15.0000",
      transactionTaxTotal: "15.0000",
      total: "115.0000",
      transactionTotal: "115.0000",
      balanceDue: "0.0000",
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
          transactionTaxableAmount: "100.0000",
          taxAmount: "15.0000",
          lineTotal: "115.0000",
        },
      ],
    },
  };
  const tx = {
    salesInvoice: {
      findFirst: jest.fn(async () => state.invoice),
      updateMany: jest.fn(async ({ where, data }: { where: { status: SalesInvoiceStatus; journalEntryId: null }; data: { status: SalesInvoiceStatus; balanceDue: string } }) => {
        if (state.invoice.status !== where.status || state.invoice.journalEntryId !== where.journalEntryId) {
          return { count: 0 };
        }
        state.invoice.status = data.status;
        state.invoice.balanceDue = data.balanceDue;
        return { count: 1 };
      }),
      findUniqueOrThrow: jest.fn(async () => state.invoice),
      update: jest.fn(async ({ data }: { data: { journalEntryId: string } }) => {
        state.invoice.journalEntryId = data.journalEntryId;
        return state.invoice;
      }),
    },
    account: {
      findFirst: jest.fn(async ({ where }: { where: { code: string } }) => ({ id: where.code === "120" ? "ar-1" : "vat-1" })),
    },
    journalEntry: {
      create: jest.fn(async () => ({ id: "journal-1" })),
    },
    zatcaInvoiceMetadata: {
      upsert: jest.fn(async () => ({ id: "metadata-1" })),
    },
  };
  return {
    state,
    tx,
    prisma: {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    },
    numberSequence: { next: jest.fn().mockResolvedValue("JE-000001") },
  };
}

function makeCustomerPaymentAllocationHarness() {
  const state = {
    invoiceBalanceDue: "100.0000",
    customerPayments: [] as Array<{ id: string }>,
    customerPaymentAllocations: [] as Array<{ id: string; paymentId: string; invoiceId: string }>,
    journalEntries: [] as Array<{ id: string }>,
  };
  const tx = {
    contact: { findFirst: jest.fn(async () => ({ id: "customer-1", name: "Customer", displayName: null })) },
    account: {
      findFirst: jest.fn(async ({ where }: { where: { id?: string; code?: string } }) => {
        if (where.id === "bank-1") {
          return { id: "bank-1" };
        }
        if (where.code === "120") {
          return { id: "ar-1" };
        }
        return null;
      }),
    },
    salesInvoice: {
      findMany: jest.fn(async () => [
        {
          id: "invoice-1",
          balanceDue: state.invoiceBalanceDue,
          currency: "SAR",
          status: SalesInvoiceStatus.FINALIZED,
        },
      ]),
      updateMany: jest.fn(async ({ where, data }: { where: { balanceDue: { gte: string } }; data: { balanceDue: { decrement: string } } }) => {
        if (Number(state.invoiceBalanceDue) < Number(where.balanceDue.gte)) {
          return { count: 0 };
        }
        state.invoiceBalanceDue = formatMoney(Number(state.invoiceBalanceDue) - Number(data.balanceDue.decrement));
        return { count: 1 };
      }),
    },
    journalEntry: {
      create: jest.fn(async () => {
        const journalEntry = { id: `journal-${state.journalEntries.length + 1}` };
        state.journalEntries.push(journalEntry);
        return journalEntry;
      }),
    },
    customerPayment: {
      create: jest.fn(async ({ data }: CustomerPaymentCreateArgs) => {
        const payment = { id: `payment-${state.customerPayments.length + 1}` };
        state.customerPayments.push(payment);
        const allocations = data.allocations.create.map((allocation, index) => ({
          id: `allocation-${state.customerPaymentAllocations.length + index + 1}`,
          paymentId: payment.id,
          invoiceId: allocation.invoice.connect.organizationId_id.id,
          realizedGainAmount: allocation.realizedGainAmount,
          realizedLossAmount: allocation.realizedLossAmount,
          realizedFxJournalEntryId: allocation.realizedFxJournalEntryId,
        }));
        state.customerPaymentAllocations.push(...allocations);
        return { ...payment, allocations };
      }),
    },
  };
  return {
    tx,
    prisma: {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    },
    numberSequence: {
      next: jest.fn(async (_organizationId: string, scope: NumberSequenceScope) => (scope === NumberSequenceScope.PAYMENT ? "PAY-000001" : "JE-000001")),
    },
    snapshot: () => ({
      invoiceBalanceDue: state.invoiceBalanceDue,
      customerPaymentCount: state.customerPayments.length,
      customerPaymentAllocationCount: state.customerPaymentAllocations.length,
      journalEntryCount: state.journalEntries.length,
    }),
  };
}

function makeBankStatementMatchService(options: { staleMatchClaimCount?: number } = {}) {
  const account = {
    id: "bank-account",
    code: "112",
    name: "Bank Account",
    type: AccountType.ASSET,
    allowPosting: true,
    isActive: true,
  };
  const profile = {
    id: "profile-1",
    organizationId: "org-1",
    accountId: account.id,
    type: BankAccountType.BANK,
    status: BankAccountStatus.ACTIVE,
    displayName: "Operating Bank",
    currency: "SAR",
    account,
  };
  const statementTransaction = {
    id: "statement-transaction-1",
    organizationId: "org-1",
    importId: "import-1",
    bankAccountProfileId: profile.id,
    transactionDate: new Date("2026-05-13T00:00:00.000Z"),
    description: "Customer receipt",
    reference: "PAY-1",
    type: BankStatementTransactionType.CREDIT,
    amount: new Prisma.Decimal("50.0000"),
    status: BankStatementTransactionStatus.UNMATCHED,
    rawData: { normalized: { counterparty: "Customer LLC" } },
    bankAccountProfile: profile,
  };
  const prisma: any = {
    bankAccountProfile: { findFirst: jest.fn().mockResolvedValue(profile) },
    bankStatementImport: {
      findFirst: jest.fn().mockResolvedValue({ id: "import-1", status: BankStatementImportStatus.IMPORTED }),
      update: jest.fn(),
    },
    bankStatementTransaction: {
      findFirst: jest.fn().mockResolvedValue(statementTransaction),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: options.staleMatchClaimCount ?? 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        ...statementTransaction,
        status: BankStatementTransactionStatus.MATCHED,
        matchedJournalLineId: "line-1",
        matchedJournalEntryId: "journal-1",
        matchType: BankStatementMatchType.JOURNAL_LINE,
      }),
    },
    bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
    journalLine: {
      findFirst: jest.fn().mockResolvedValue({
        id: "line-1",
        journalEntryId: "journal-1",
        accountId: "bank-account",
        debit: new Prisma.Decimal("50.0000"),
        credit: new Prisma.Decimal("0.0000"),
        journalEntry: { id: "journal-1", status: JournalEntryStatus.POSTED },
      }),
    },
    $transaction: jest.fn((callback: (client: unknown) => Promise<unknown>) => callback(prisma)),
  };
  const audit = { log: jest.fn() };
  const service = new BankStatementService(
    prisma as never,
    audit as never,
    { next: jest.fn() } as never,
    { assertPostingDateAllowed: jest.fn() } as never,
  );
  return { service, prisma, audit };
}

function formatMoney(value: number): string {
  return value.toFixed(4);
}
