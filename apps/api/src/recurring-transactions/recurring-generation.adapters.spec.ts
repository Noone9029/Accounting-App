import {
  CurrencyRateSource,
  RecurringExchangeRatePolicy,
  RecurringTransactionType,
  SalesInvoiceStatus,
  PurchaseBillStatus,
  JournalEntryStatus,
} from "@prisma/client";
import {
  RecurringExpenseProposalAdapter,
  RecurringJournalAdapter,
  RecurringPurchaseBillAdapter,
  RecurringSalesInvoiceAdapter,
} from "./recurring-generation.adapters";

const scheduledLocalDate = new Date("2026-07-12T00:00:00.000Z");

function context(transactionType: RecurringTransactionType, overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    runId: "run-1",
    templateId: "template-1",
    templateVersion: 4,
    scheduledFor: new Date("2026-07-11T20:00:00.000Z"),
    scheduledLocalDate,
    actorUserId: "user-1",
    requestId: "request-1",
    template: {
      id: "template-1",
      transactionType,
      partyId: "party-1",
      branchId: "branch-1",
      paidThroughAccountId: "bank-1",
      paymentTermsDays: 30,
      currencyCode: "USD",
      exchangeRatePolicy: RecurringExchangeRatePolicy.FIXED_TEMPLATE_RATE,
      fixedExchangeRate: "3.67250000",
      rateSnapshotId: null,
      taxMode: "TAX_EXCLUSIVE",
      inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
      description: "Monthly services",
      reference: "RET-2026",
      notes: "Review before posting",
      terms: "Net 30",
      createdByUserId: "creator-1",
      subtotal: "100.0000",
      discountTotal: "5.0000",
      taxableTotal: "95.0000",
      taxTotal: "14.2500",
      total: "109.2500",
      lines: [{
        itemId: "item-1",
        accountId: "account-1",
        taxRateId: "tax-1",
        costCenterId: "cost-1",
        projectId: "project-1",
        description: "Retainer",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "5.0000",
        debit: "100.0000",
        credit: "0.0000",
        sortOrder: 0,
      }],
      ...overrides,
    },
  };
}

describe("recurring generation adapters", () => {
  const tx = {} as never;

  it("maps a recurring sales invoice to the normal draft service with safe fixed FX evidence", async () => {
    const salesInvoices = { createDraftInTransaction: jest.fn().mockResolvedValue({ id: "invoice-1", status: SalesInvoiceStatus.DRAFT }) };
    const adapter = new RecurringSalesInvoiceAdapter(salesInvoices as never);

    await expect(adapter.generate(context(RecurringTransactionType.SALES_INVOICE), tx)).resolves.toEqual({
      generatedEntityType: "SALES_INVOICE",
      generatedEntityId: "invoice-1",
      link: { generatedSalesInvoiceId: "invoice-1" },
    });
    expect(salesInvoices.createDraftInTransaction).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      expect.objectContaining({
        customerId: "party-1",
        issueDate: "2026-07-12",
        dueDate: "2026-08-11",
        currency: "USD",
        exchangeRate: "3.67250000",
        rateDate: "2026-07-12",
        rateSource: CurrencyRateSource.MANUAL,
        lines: [expect.objectContaining({ costCenterId: "cost-1", projectId: "project-1" })],
      }),
      tx,
    );
  });

  it("maps a recurring purchase bill to a draft and preserves snapshot FX evidence", async () => {
    const purchaseBills = { createDraftInTransaction: jest.fn().mockResolvedValue({ id: "bill-1", status: PurchaseBillStatus.DRAFT }) };
    const adapter = new RecurringPurchaseBillAdapter(purchaseBills as never);

    await adapter.generate(context(RecurringTransactionType.PURCHASE_BILL, {
      exchangeRatePolicy: RecurringExchangeRatePolicy.RATE_SNAPSHOT,
      fixedExchangeRate: null,
      rateSnapshotId: "snapshot-1",
    }), tx);

    expect(purchaseBills.createDraftInTransaction).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      expect.objectContaining({
        supplierId: "party-1",
        billDate: "2026-07-12",
        dueDate: "2026-08-11",
        currency: "USD",
        rateSnapshotId: "snapshot-1",
        lines: [expect.objectContaining({ costCenterId: "cost-1", projectId: "project-1" })],
      }),
      tx,
    );
  });

  it("fails closed when a run requires accountant-provided FX evidence", async () => {
    const salesInvoices = { createDraftInTransaction: jest.fn() };
    const adapter = new RecurringSalesInvoiceAdapter(salesInvoices as never);
    await expect(adapter.generate(context(RecurringTransactionType.SALES_INVOICE, {
      exchangeRatePolicy: RecurringExchangeRatePolicy.REQUIRE_RATE_AT_RUN,
      fixedExchangeRate: null,
    }), tx)).rejects.toThrow("requires exchange-rate evidence");
    expect(salesInvoices.createDraftInTransaction).not.toHaveBeenCalled();
  });

  it("creates a base-currency draft manual journal through the accounting service", async () => {
    const accounting = { createDraftInTransaction: jest.fn().mockResolvedValue({ id: "journal-1", status: JournalEntryStatus.DRAFT }) };
    const adapter = new RecurringJournalAdapter(accounting as never);
    const input = context(RecurringTransactionType.MANUAL_JOURNAL, {
      currencyCode: "AED",
      exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
      partyId: null,
      lines: [
        { accountId: "expense-1", description: "Debit", debit: "100.0000", credit: "0.0000", costCenterId: "cost-1", projectId: null, sortOrder: 0 },
        { accountId: "liability-1", description: "Credit", debit: "0.0000", credit: "100.0000", costCenterId: null, projectId: "project-1", sortOrder: 1 },
      ],
    });

    await adapter.generate(input, tx);
    expect(accounting.createDraftInTransaction).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      expect.objectContaining({
        entryDate: "2026-07-12",
        currency: "AED",
        reference: "RET-2026",
        lines: [
          expect.objectContaining({ debit: "100.0000", costCenterId: "cost-1" }),
          expect.objectContaining({ credit: "100.0000", projectId: "project-1" }),
        ],
      }),
      tx,
    );
  });

  it("creates a reviewable expense proposal without creating or posting a cash expense", async () => {
    const proposal = { id: "proposal-1", status: "DRAFT" };
    const executor = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
      currencyRateSnapshot: { findFirst: jest.fn() },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "account-1" }, { id: "bank-1" }]) },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "party-1" }) },
      branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
      item: { findMany: jest.fn().mockResolvedValue([{ id: "item-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-1" }]) },
      $queryRaw: jest.fn().mockResolvedValueOnce([{ id: "cost-1" }]).mockResolvedValueOnce([{ id: "project-1" }]),
      recurringExpenseProposal: { create: jest.fn().mockResolvedValue(proposal) },
    };
    const adapter = new RecurringExpenseProposalAdapter();

    await expect(adapter.generate(context(RecurringTransactionType.EXPENSE), executor as never)).resolves.toEqual({
      generatedEntityType: "EXPENSE_PROPOSAL",
      generatedEntityId: "proposal-1",
      link: { generatedExpenseProposalId: "proposal-1" },
    });
    expect(executor.recurringExpenseProposal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org-1",
        proposedDate: scheduledLocalDate,
        paidThroughAccountId: "bank-1",
        currency: "USD",
        exchangeRate: "3.67250000",
        rateSource: CurrencyRateSource.MANUAL,
        lines: { create: [expect.objectContaining({ costCenterId: "cost-1", projectId: "project-1" })] },
      }),
    }));
    expect(executor).not.toHaveProperty("cashExpense");
  });

  it("blocks an expense proposal when an account is inactive at execution time", async () => {
    const executor = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
      currencyRateSnapshot: { findFirst: jest.fn() },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "bank-1" }]) },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "party-1" }) },
      branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
      item: { findMany: jest.fn().mockResolvedValue([{ id: "item-1" }]) },
      taxRate: { findMany: jest.fn().mockResolvedValue([{ id: "tax-1" }]) },
      $queryRaw: jest.fn(),
      recurringExpenseProposal: { create: jest.fn() },
    };
    const adapter = new RecurringExpenseProposalAdapter();

    await expect(adapter.generate(context(RecurringTransactionType.EXPENSE), executor as never)).rejects.toThrow("accounts");
    expect(executor.recurringExpenseProposal.create).not.toHaveBeenCalled();
  });
});
