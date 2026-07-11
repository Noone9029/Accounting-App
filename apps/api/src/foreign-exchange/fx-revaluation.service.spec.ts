import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AccountType, CurrencyRateSource, FxRevaluationStatus, Prisma, SalesInvoiceStatus } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FxRevaluationService } from "./fx-revaluation.service";

const rate = {
  id: "11111111-1111-4111-8111-111111111111",
  organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  transactionCurrency: "USD",
  baseCurrency: "AED",
  rate: new Prisma.Decimal("3.75000000"),
  rateDate: new Date("2026-06-30T00:00:00.000Z"),
  source: CurrencyRateSource.MANUAL,
};

const eurRate = {
  ...rate,
  id: "22222222-2222-4222-8222-222222222222",
  transactionCurrency: "EUR",
  rate: new Prisma.Decimal("4.10000000"),
};

function makeService() {
  const prisma: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    organization: { findUnique: jest.fn() },
    currencyRateSnapshot: { findMany: jest.fn() },
    salesInvoice: { findMany: jest.fn() },
    purchaseBill: { findMany: jest.fn() },
    fxAccountConfiguration: { findUnique: jest.fn() },
    account: { findMany: jest.fn(), findFirst: jest.fn() },
    fxRevaluationRun: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    fxMonetaryBalance: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    journalEntry: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    customerPaymentAllocation: { count: jest.fn().mockResolvedValue(0) },
    customerPaymentUnappliedAllocation: { count: jest.fn().mockResolvedValue(0) },
    supplierPaymentAllocation: { count: jest.fn().mockResolvedValue(0) },
    supplierPaymentUnappliedAllocation: { count: jest.fn().mockResolvedValue(0) },
    creditNoteAllocation: { count: jest.fn().mockResolvedValue(0) },
    purchaseDebitNoteAllocation: { count: jest.fn().mockResolvedValue(0) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
  const realAudit = new AuditLogService(prisma as never);
  const audit = { log: jest.fn((input, executor) => realAudit.log(input, executor)) };
  const periods = { assertPostingDateAllowed: jest.fn() };
  const numbers = { next: jest.fn().mockResolvedValue("JOURNAL_ENTRY-000001") };
  return {
    service: new FxRevaluationService(prisma as never, audit as never, periods as never, numbers as never),
    prisma,
    audit,
    periods,
    numbers,
  };
}

describe("FxRevaluationService", () => {
  it("previews all eligible foreign AR/AP with manually selected immutable rate evidence", async () => {
    const { service, prisma, audit } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.currencyRateSnapshot.findMany.mockResolvedValue([rate, eurRate]);
    prisma.salesInvoice.findMany.mockResolvedValue([{
      id: "inv-1", invoiceNumber: "INV-1", customerId: "customer-1", currency: "USD", baseCurrency: "AED",
      exchangeRate: new Prisma.Decimal("3.65000000"), balanceDue: new Prisma.Decimal("365"),
      transactionBalanceDue: new Prisma.Decimal("100"), customer: { id: "customer-1", name: "Customer" },
    }]);
    prisma.purchaseBill.findMany.mockResolvedValue([{
      id: "bill-1", billNumber: "BILL-1", supplierId: "supplier-1", currency: "EUR", baseCurrency: "AED",
      exchangeRate: new Prisma.Decimal("4.00000000"), balanceDue: new Prisma.Decimal("200"),
      transactionBalanceDue: new Prisma.Decimal("50"), supplier: { id: "supplier-1", name: "Supplier" },
    }]);
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([]);
    prisma.fxRevaluationRun.findUnique.mockResolvedValue(null);
    prisma.fxRevaluationRun.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "run-1", ...data, lines: data.lines.create }));

    await service.preview("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user-1", {
      revaluationDate: "2026-06-30",
      rateDate: "2026-06-30",
      rates: [
        { currencyCode: "USD", rateSnapshotId: rate.id },
        { currencyCode: "EUR", rateSnapshotId: eurRate.id },
      ],
      idempotencyKey: "fx-reval-2026-06",
    });

    expect(prisma.fxRevaluationRun.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: FxRevaluationStatus.DRAFT,
        activeScopeKey: "2026-06-30",
        lines: { create: expect.arrayContaining([
          expect.objectContaining({
            salesInvoiceId: "inv-1",
            purchaseBillId: null,
            carryingBaseAmount: "365.0000",
            revaluedBaseAmount: "375.0000",
            unrealizedGainAmount: "10.0000",
          }),
          expect.objectContaining({
            salesInvoiceId: null,
            purchaseBillId: "bill-1",
            revaluedBaseAmount: "205.0000",
            unrealizedLossAmount: "5.0000",
          }),
        ]) },
      }),
    }));
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        issueDate: { lte: new Date("2026-06-30T00:00:00.000Z") },
        finalizedAt: { lt: new Date("2026-07-01T00:00:00.000Z") },
      }),
    }));
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        billDate: { lte: new Date("2026-06-30T00:00:00.000Z") },
        finalizedAt: { lt: new Date("2026-07-01T00:00:00.000Z") },
      }),
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "FxRevaluationRun", entityId: "run-1" }), prisma);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "FX_REVALUATION_PREVIEWED", entityType: "FxRevaluationRun", entityId: "run-1" }),
    }));
  });

  it("supersedes a stale unposted run only after a replacement preview validates", async () => {
    const { service, prisma, audit } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.currencyRateSnapshot.findMany.mockResolvedValue([rate]);
    prisma.salesInvoice.findMany.mockResolvedValue([{
      id: "inv-1", invoiceNumber: "INV-1", customerId: "customer-1", currency: "USD", baseCurrency: "AED",
      exchangeRate: new Prisma.Decimal("3.65"), balanceDue: new Prisma.Decimal("365"), transactionBalanceDue: new Prisma.Decimal("100"),
    }]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([]);
    prisma.fxRevaluationRun.findUnique.mockResolvedValue(null);
    prisma.fxRevaluationRun.findFirst.mockResolvedValue({
      id: "stale-run", status: FxRevaluationStatus.REVIEWED, revaluationDate: new Date("2026-06-30T00:00:00.000Z"), lines: [],
    });
    prisma.fxRevaluationRun.updateMany.mockResolvedValue({ count: 1 });
    prisma.fxRevaluationRun.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "replacement-run", ...data, lines: data.lines.create }));

    await service.preview("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user-1", {
      revaluationDate: "2026-06-30", rateDate: "2026-06-30",
      rates: [{ currencyCode: "USD", rateSnapshotId: rate.id }], idempotencyKey: "replacement-preview",
    });

    expect(prisma.fxRevaluationRun.updateMany).toHaveBeenCalledWith({
      where: { id: "stale-run", organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: { in: [FxRevaluationStatus.DRAFT, FxRevaluationStatus.REVIEWED] }, activeScopeKey: "2026-06-30" },
      data: { status: FxRevaluationStatus.FAILED, activeScopeKey: null },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "SUPERSEDE", entityId: "stale-run" }), prisma);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "FX_REVALUATION_SUPERSEDED", entityId: "stale-run" }),
    }));
  });

  it("rejects a revaluation date older than the active carrying layer", async () => {
    const { service, prisma, audit } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.currencyRateSnapshot.findMany.mockResolvedValue([rate]);
    prisma.salesInvoice.findMany.mockResolvedValue([{
      id: "inv-1", invoiceNumber: "INV-1", customerId: "customer-1", currency: "USD", baseCurrency: "AED",
      exchangeRate: new Prisma.Decimal("3.65"), balanceDue: new Prisma.Decimal("365"), transactionBalanceDue: new Prisma.Decimal("100"),
    }]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);
    prisma.fxRevaluationRun.findUnique.mockResolvedValue(null);
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([{
      salesInvoiceId: "inv-1", purchaseBillId: null,
      openTransactionAmount: new Prisma.Decimal("100"), sourceBaseOpenAmount: new Prisma.Decimal("365"), carryingBaseAmount: new Prisma.Decimal("370"),
      lastRevaluationLineId: "prior-line", lastRevaluationLine: { revaluationRun: { revaluationDate: new Date("2026-07-31T00:00:00.000Z") } },
    }]);

    await expect(service.preview("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user-1", {
      revaluationDate: "2026-06-30", rateDate: "2026-06-30",
      rates: [{ currencyCode: "USD", rateSnapshotId: rate.id }], idempotencyKey: "older-than-carrying",
    })).rejects.toEqual(new BadRequestException("Revaluation date cannot be earlier than the active monetary carrying layer."));
    expect(prisma.fxRevaluationRun.create).not.toHaveBeenCalled();
  });

  it("rejects a fully settled current balance when settlement occurred after the requested close date", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.salesInvoice.findMany.mockResolvedValue([{
      id: "inv-settled-later", currency: "USD", baseCurrency: "AED",
      balanceDue: new Prisma.Decimal("0"), transactionBalanceDue: new Prisma.Decimal("0"),
    }]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);
    prisma.fxRevaluationRun.findUnique.mockResolvedValue(null);
    prisma.customerPaymentAllocation.count.mockResolvedValue(1);

    await expect(service.preview("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user-1", {
      revaluationDate: "2026-06-30", rateDate: "2026-06-30", rates: [], idempotencyKey: "settled-after-close",
    })).rejects.toEqual(new BadRequestException("A foreign balance has settlement or correction activity after the revaluation date. Revalue the current open state instead."));
    expect(prisma.customerPaymentAllocation.count).toHaveBeenCalledWith({ where: expect.objectContaining({
      invoiceId: { in: ["inv-settled-later"] },
      OR: expect.arrayContaining([{ payment: { paymentDate: { gte: new Date("2026-07-01T00:00:00.000Z") } } }]),
    }) });
    expect(prisma.fxRevaluationRun.create).not.toHaveBeenCalled();
  });

  it("rejects a source that was open at period end but voided later", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.salesInvoice.findMany.mockResolvedValue([{
      id: "inv-voided-later", currency: "USD", baseCurrency: "AED", status: SalesInvoiceStatus.VOIDED,
      balanceDue: new Prisma.Decimal("0"), transactionBalanceDue: new Prisma.Decimal("0"),
      reversalJournalEntry: { entryDate: new Date("2026-07-05T00:00:00.000Z"), postedAt: new Date("2026-07-05T08:00:00.000Z") },
    }]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);
    prisma.fxRevaluationRun.findUnique.mockResolvedValue(null);

    await expect(service.preview("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user-1", {
      revaluationDate: "2026-06-30", rateDate: "2026-06-30", rates: [], idempotencyKey: "voided-after-close",
    })).rejects.toEqual(new BadRequestException("A foreign source document was voided after the revaluation date. Revalue the current open state instead."));
    expect(prisma.fxRevaluationRun.create).not.toHaveBeenCalled();
  });

  it("fails before creating a run when any eligible currency lacks a selected rate", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.currencyRateSnapshot.findMany.mockResolvedValue([]);
    prisma.salesInvoice.findMany.mockResolvedValue([{
      id: "inv-1", currency: "USD", baseCurrency: "AED", balanceDue: new Prisma.Decimal("365"),
      transactionBalanceDue: new Prisma.Decimal("100"), customer: { id: "customer-1", name: "Customer" },
    }]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);

    await expect(service.preview("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user-1", {
      revaluationDate: "2026-06-30", rateDate: "2026-06-30", rates: [], idempotencyKey: "missing-rate",
    })).rejects.toEqual(new BadRequestException("A selected rate snapshot is required for every eligible foreign currency."));
    expect(prisma.fxRevaluationRun.create).not.toHaveBeenCalled();
  });

  it("scopes run detail to the current tenant", async () => {
    const { service, prisma } = makeService();
    prisma.fxRevaluationRun.findFirst.mockResolvedValue(null);
    await expect(service.get("org-2", "run-1")).rejects.toEqual(new NotFoundException("FX revaluation run not found."));
    expect(prisma.fxRevaluationRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "run-1", organizationId: "org-2" } }));
  });

  it("reviews a draft once and replays the same idempotency key safely", async () => {
    const { service, prisma, audit } = makeService();
    const draft = { id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.DRAFT, reviewIdempotencyKey: null };
    const reviewed = { ...draft, status: FxRevaluationStatus.REVIEWED, reviewIdempotencyKey: "review-1" };
    prisma.fxRevaluationRun.findFirst.mockResolvedValueOnce(draft).mockResolvedValueOnce(reviewed).mockResolvedValueOnce(reviewed);
    prisma.fxRevaluationRun.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.review("org-1", "user-1", "run-1", { idempotencyKey: "review-1" })).resolves.toMatchObject({ status: FxRevaluationStatus.REVIEWED });
    await expect(service.review("org-1", "user-1", "run-1", { idempotencyKey: "review-1" })).resolves.toMatchObject({ status: FxRevaluationStatus.REVIEWED });
    expect(prisma.fxRevaluationRun.updateMany).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVIEW", entityType: "FxRevaluationRun", entityId: "run-1" }), prisma);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "FX_REVALUATION_REVIEWED" }) }));
  });

  it("posts a reviewed run into a balanced journal and establishes adjusted carrying state", async () => {
    const { service, prisma, audit, periods } = makeService();
    const line = {
      id: "line-1", organizationId: "org-1", sourceType: "CUSTOMER_RECEIVABLE",
      salesInvoiceId: "inv-1", purchaseBillId: null, priorRevaluationLineId: null,
      openTransactionAmount: new Prisma.Decimal("100"), sourceBaseOpenAmount: new Prisma.Decimal("365"),
      carryingBaseAmount: new Prisma.Decimal("365"), closingRate: new Prisma.Decimal("3.75"),
      revaluedBaseAmount: new Prisma.Decimal("375"), unrealizedGainAmount: new Prisma.Decimal("10"),
      unrealizedLossAmount: new Prisma.Decimal("0"), currencyCode: "USD", baseCurrencyCode: "AED",
      rateSnapshotId: rate.id, salesInvoice: { id: "inv-1", invoiceNumber: "INV-1" }, purchaseBill: null,
      counterparty: null, rateSnapshot: rate, priorRevaluationLine: null,
    };
    const reviewed = {
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.REVIEWED,
      revaluationDate: new Date("2026-06-30T00:00:00.000Z"), postIdempotencyKey: null, lines: [line],
    };
    prisma.fxRevaluationRun.findFirst.mockResolvedValueOnce(reviewed).mockResolvedValueOnce({ ...reviewed, status: FxRevaluationStatus.POSTED, postIdempotencyKey: "post-001" });
    prisma.fxAccountConfiguration.findUnique.mockResolvedValue({
      unrealizedGainAccount: { id: "gain", type: AccountType.REVENUE, isActive: true, allowPosting: true },
      unrealizedLossAccount: { id: "loss", type: AccountType.EXPENSE, isActive: true, allowPosting: true },
    });
    prisma.account.findMany.mockResolvedValue([
      { id: "ar", code: "120", isActive: true, allowPosting: true },
      { id: "ap", code: "210", isActive: true, allowPosting: true },
    ]);
    prisma.salesInvoice.findMany.mockResolvedValue([{
      id: "inv-1", status: "FINALIZED", currency: "USD", baseCurrency: "AED", issueDate: reviewed.revaluationDate,
      transactionBalanceDue: new Prisma.Decimal("100"), balanceDue: new Prisma.Decimal("365"),
    }]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([]);
    prisma.journalEntry.create.mockResolvedValue({ id: "journal-1" });
    prisma.fxMonetaryBalance.create.mockResolvedValue({ id: "balance-1" });
    prisma.fxRevaluationRun.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.post("org-1", "user-1", "run-1", { idempotencyKey: "post-001" }))
      .resolves.toMatchObject({ status: FxRevaluationStatus.POSTED });
    expect(periods.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", reviewed.revaluationDate, prisma);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.journalEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      status: "POSTED", totalDebit: "10.0000", totalCredit: "10.0000",
      lines: { create: expect.arrayContaining([
        expect.objectContaining({ accountId: "ar", debit: "10.0000", functionalCurrencyOnly: true }),
        expect.objectContaining({ accountId: "gain", credit: "10.0000", functionalCurrencyOnly: true }),
      ]) },
    }) });
    expect(prisma.fxMonetaryBalance.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      salesInvoiceId: "inv-1", carryingBaseAmount: new Prisma.Decimal("375"), carryingRate: new Prisma.Decimal("3.75"),
      lastRevaluationLineId: "line-1",
    }) });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "POST", entityType: "FxRevaluationRun", entityId: "run-1" }), prisma);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "FX_REVALUATION_POSTED" }) }));
  });

  it("blocks posting when a newly eligible foreign balance was added after preview", async () => {
    const { service, prisma } = makeService();
    const revaluationDate = new Date("2026-06-30T00:00:00.000Z");
    prisma.fxRevaluationRun.findFirst.mockResolvedValue({
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.REVIEWED, revaluationDate,
      lines: [{
        id: "line-1", salesInvoiceId: "inv-1", purchaseBillId: null, baseCurrencyCode: "AED",
        openTransactionAmount: new Prisma.Decimal("100"), sourceBaseOpenAmount: new Prisma.Decimal("365"), carryingBaseAmount: new Prisma.Decimal("365"),
      }],
    });
    prisma.fxAccountConfiguration.findUnique.mockResolvedValue({
      unrealizedGainAccount: { id: "gain", type: AccountType.REVENUE, isActive: true, allowPosting: true },
      unrealizedLossAccount: { id: "loss", type: AccountType.EXPENSE, isActive: true, allowPosting: true },
    });
    prisma.account.findMany.mockResolvedValue([{ id: "ar", code: "120", isActive: true, allowPosting: true }, { id: "ap", code: "210", isActive: true, allowPosting: true }]);
    prisma.salesInvoice.findMany.mockResolvedValue([
      { id: "inv-1", currency: "USD", transactionBalanceDue: new Prisma.Decimal("100"), balanceDue: new Prisma.Decimal("365") },
      { id: "inv-2", currency: "EUR", transactionBalanceDue: new Prisma.Decimal("50"), balanceDue: new Prisma.Decimal("200") },
    ]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([]);

    await expect(service.post("org-1", "user-1", "run-1", { idempotencyKey: "post-source-drift" }))
      .rejects.toEqual(new BadRequestException("Eligible foreign monetary balances changed after preview. Create a new FX revaluation run."));
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("blocks a backdated run when its source changed after the revaluation date", async () => {
    const { service, prisma } = makeService();
    const revaluationDate = new Date("2026-06-30T00:00:00.000Z");
    prisma.fxRevaluationRun.findFirst.mockResolvedValue({
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.REVIEWED, revaluationDate,
      lines: [{
        id: "line-1", salesInvoiceId: "inv-1", purchaseBillId: null, baseCurrencyCode: "AED",
        openTransactionAmount: new Prisma.Decimal("100"), sourceBaseOpenAmount: new Prisma.Decimal("365"), carryingBaseAmount: new Prisma.Decimal("365"),
      }],
    });
    prisma.fxAccountConfiguration.findUnique.mockResolvedValue({
      unrealizedGainAccount: { id: "gain", type: AccountType.REVENUE, isActive: true, allowPosting: true },
      unrealizedLossAccount: { id: "loss", type: AccountType.EXPENSE, isActive: true, allowPosting: true },
    });
    prisma.account.findMany.mockResolvedValue([{ id: "ar", code: "120", isActive: true, allowPosting: true }, { id: "ap", code: "210", isActive: true, allowPosting: true }]);
    prisma.salesInvoice.findMany.mockResolvedValue([{ id: "inv-1", currency: "USD", transactionBalanceDue: new Prisma.Decimal("100"), balanceDue: new Prisma.Decimal("365") }]);
    prisma.purchaseBill.findMany.mockResolvedValue([]);
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([]);
    prisma.customerPaymentAllocation.count.mockResolvedValue(1);

    await expect(service.post("org-1", "user-1", "run-1", { idempotencyKey: "post-later-activity" }))
      .rejects.toEqual(new BadRequestException("A foreign balance has settlement or correction activity after the revaluation date. Revalue the current open state instead."));
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("blocks posting in a locked period before journal or carrying mutation", async () => {
    const { service, prisma, periods } = makeService();
    prisma.fxRevaluationRun.findFirst.mockResolvedValue({
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.REVIEWED,
      revaluationDate: new Date("2026-06-30T00:00:00.000Z"), postIdempotencyKey: null, lines: [],
    });
    periods.assertPostingDateAllowed.mockRejectedValue(new BadRequestException("Posting date falls in a locked fiscal period."));
    await expect(service.post("org-1", "user-1", "run-1", { idempotencyKey: "post-lock" }))
      .rejects.toEqual(new BadRequestException("Posting date falls in a locked fiscal period."));
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.fxMonetaryBalance.create).not.toHaveBeenCalled();
  });

  it("blocks posting when configured unrealized gain/loss accounts are missing", async () => {
    const { service, prisma } = makeService();
    prisma.fxRevaluationRun.findFirst.mockResolvedValue({
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.REVIEWED,
      revaluationDate: new Date("2026-06-30T00:00:00.000Z"), lines: [],
    });
    prisma.fxAccountConfiguration.findUnique.mockResolvedValue(null);
    prisma.account.findMany.mockResolvedValue([
      { id: "ar", code: "120", isActive: true, allowPosting: true },
      { id: "ap", code: "210", isActive: true, allowPosting: true },
    ]);

    await expect(service.post("org-1", "user-1", "run-1", { idempotencyKey: "post-no-config" }))
      .rejects.toEqual(new BadRequestException("Configured unrealized FX gain and loss accounts are required for revaluation posting."));
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.fxRevaluationRun.updateMany).not.toHaveBeenCalled();
  });

  it("replays an already posted run only for the same idempotency key", async () => {
    const { service, prisma } = makeService();
    prisma.fxRevaluationRun.findFirst.mockResolvedValue({
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.POSTED, postIdempotencyKey: "post-001", lines: [],
    });
    await expect(service.post("org-1", "user-1", "run-1", { idempotencyKey: "post-001" }))
      .resolves.toMatchObject({ status: FxRevaluationStatus.POSTED });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("blocks reversal when downstream settlement changed an adjusted carrying record", async () => {
    const { service, prisma } = makeService();
    prisma.fxRevaluationRun.findFirst.mockResolvedValue({
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.POSTED,
      postedJournalEntryId: "journal-1", reversalIdempotencyKey: null,
      lines: [{
        id: "line-1", salesInvoiceId: "inv-1", purchaseBillId: null,
        openTransactionAmount: new Prisma.Decimal("100"), revaluedBaseAmount: new Prisma.Decimal("375"),
        carryingBaseAmount: new Prisma.Decimal("365"), priorRevaluationLineId: null,
      }],
    });
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([{
      salesInvoiceId: "inv-1", purchaseBillId: null, lastRevaluationLineId: "line-1",
      openTransactionAmount: new Prisma.Decimal("60"), carryingBaseAmount: new Prisma.Decimal("225"),
    }]);

    await expect(service.reverse("org-1", "user-1", "run-1", { idempotencyKey: "reverse-1" }))
      .rejects.toEqual(new BadRequestException("FX revaluation cannot be reversed after a later revaluation or settlement changed its carrying basis."));
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("reverses an untouched posted run and removes its first carrying layer", async () => {
    const { service, prisma, audit } = makeService();
    const line = {
      id: "line-1", salesInvoiceId: "inv-1", purchaseBillId: null,
      openTransactionAmount: new Prisma.Decimal("100"), sourceBaseOpenAmount: new Prisma.Decimal("365"),
      revaluedBaseAmount: new Prisma.Decimal("375"), carryingBaseAmount: new Prisma.Decimal("365"),
      priorRevaluationLineId: null, priorRevaluationLine: null,
    };
    const posted = {
      id: "run-1", organizationId: "org-1", status: FxRevaluationStatus.POSTED,
      postedJournalEntryId: "journal-1", reversalIdempotencyKey: null, lines: [line],
    };
    prisma.fxRevaluationRun.findFirst.mockResolvedValueOnce(posted).mockResolvedValueOnce({ ...posted, status: FxRevaluationStatus.REVERSED, reversalIdempotencyKey: "reverse-1" });
    prisma.fxMonetaryBalance.findMany.mockResolvedValue([{
      id: "balance-1", salesInvoiceId: "inv-1", purchaseBillId: null, lastRevaluationLineId: "line-1",
      openTransactionAmount: new Prisma.Decimal("100"), sourceBaseOpenAmount: new Prisma.Decimal("365"),
      carryingBaseAmount: new Prisma.Decimal("375"),
    }]);
    prisma.journalEntry.findFirst.mockResolvedValue({
      id: "journal-1", entryNumber: "JE-1", description: "FX", reference: "FX", currency: "AED", reversedBy: null,
      lines: [
        { accountId: "ar", debit: new Prisma.Decimal("10"), credit: new Prisma.Decimal("0"), transactionDebit: null, transactionCredit: null, description: "AR", currency: "AED", exchangeRate: new Prisma.Decimal("1"), rateSnapshotId: null, fxRoundingComponentCount: 1, functionalCurrencyOnly: true },
        { accountId: "gain", debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("10"), transactionDebit: null, transactionCredit: null, description: "Gain", currency: "AED", exchangeRate: new Prisma.Decimal("1"), rateSnapshotId: null, fxRoundingComponentCount: 1, functionalCurrencyOnly: true },
      ],
    });
    prisma.journalEntry.create.mockResolvedValue({ id: "reversal-journal" });
    prisma.journalEntry.updateMany.mockResolvedValue({ count: 1 });
    prisma.fxMonetaryBalance.deleteMany.mockResolvedValue({ count: 1 });
    prisma.fxRevaluationRun.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.reverse("org-1", "user-1", "run-1", { idempotencyKey: "reverse-1" }))
      .resolves.toMatchObject({ status: FxRevaluationStatus.REVERSED });
    expect(prisma.fxMonetaryBalance.deleteMany).toHaveBeenCalledWith({ where: {
      id: "balance-1", organizationId: "org-1", lastRevaluationLineId: "line-1",
      openTransactionAmount: line.openTransactionAmount,
      sourceBaseOpenAmount: line.sourceBaseOpenAmount,
      carryingBaseAmount: line.revaluedBaseAmount,
    } });
    expect(prisma.fxRevaluationRun.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      status: FxRevaluationStatus.REVERSED, reversalJournalEntryId: "reversal-journal", activeScopeKey: null,
    }) }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVERSE", entityType: "FxRevaluationRun", entityId: "run-1" }), prisma);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "FX_REVALUATION_REVERSED" }) }));
  });
});
