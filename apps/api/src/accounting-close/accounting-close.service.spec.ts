import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BankReconciliationStatus, BankStatementTransactionStatus, CashExpenseStatus, CreditNoteStatus, CustomerPaymentStatus, FiscalPeriodStatus, InventoryAdjustmentStatus, InventoryVarianceProposalStatus, JournalEntryStatus, PurchaseBillStatus, PurchaseDebitNoteStatus, ReportPackStatus, SalesInvoiceStatus, SupplierPaymentStatus } from "@prisma/client";
import { AccountingCloseService } from "./accounting-close.service";

describe("AccountingCloseService", () => {
  const period = { id: "period-1", organizationId: "org-1", name: "June 2026", startsOn: new Date("2026-06-01T00:00:00.000Z"), endsOn: new Date("2026-06-30T23:59:59.999Z"), status: FiscalPeriodStatus.OPEN };

  function createService() {
    const prisma: any = {
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      journalEntry: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      salesInvoice: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      creditNote: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      customerPayment: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      purchaseBill: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      purchaseDebitNote: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      supplierPayment: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      bankStatementTransaction: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      bankReconciliation: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      inventoryAdjustment: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      inventoryVarianceProposal: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      reportPack: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      cashExpense: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const fx = {
      readiness: jest.fn().mockResolvedValue({
        status: "BLOCKED", asOf: "2026-06-30", counts: { foreignDocuments: 1 }, actions: [],
        blockers: [{ code: "MISSING_CLOSING_RATE", count: 1, message: "Capture a closing rate.", actionHref: "/settings/currencies-fx" }],
      }),
    };
    const recurring = {
      get: jest.fn().mockResolvedValue({
        status: "NEEDS_ATTENTION", templateCount: 1, activeTemplates: 1, dueTemplates: 1, failedRuns: 0, blockedRuns: 0,
        generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0,
        runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T00:00:00.000Z",
      }),
    };
    const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
    const fiscalPeriods = { closeInTransaction: jest.fn(), lockInTransaction: jest.fn() };
    return { service: new AccountingCloseService(prisma as never, fx as never, recurring as never, auditLog as never, fiscalPeriods as never), prisma, fx, recurring, auditLog, fiscalPeriods };
  }

  it("uses tenant-scoped fiscal dates and existing domain readiness without reclassifying policy", async () => {
    const { service, prisma, fx, recurring } = createService();

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      fiscalPeriod: { id: "period-1", status: FiscalPeriodStatus.OPEN },
      blockerCount: 1,
      warningCount: 1,
      checks: expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_CLOSING_RATE", severity: "BLOCKER", status: "BLOCKED", canAcknowledge: false }),
        expect.objectContaining({ code: "RECURRING_DUE", severity: "WARNING", status: "OPEN", canAcknowledge: true }),
      ]),
      canonicalHash: expect.any(String),
    });

    expect(prisma.fiscalPeriod.findFirst).toHaveBeenCalledWith({ where: { id: "period-1", organizationId: "org-1" } });
    expect(fx.readiness).toHaveBeenCalledWith("org-1", period.endsOn);
    expect(recurring.get).toHaveBeenCalledWith("org-1", { startsOn: period.startsOn, endsOn: period.endsOn });
  });

  it("surfaces every tenant-scoped draft journal by its entry date, including re-dated recurring drafts", async () => {
    const { service, prisma } = createService();
    prisma.journalEntry.count.mockResolvedValue(2);
    prisma.journalEntry.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-21T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({
          key: "journals.manualDrafts",
          severity: "WARNING",
          status: "OPEN",
          code: "MANUAL_DRAFT_JOURNALS",
          count: 2,
          canAcknowledge: false,
          detailsHref: "/journal-entries",
          sourceUpdatedAt: "2026-06-21T12:00:00.000Z",
        }),
      ]),
    });
    expect(prisma.journalEntry.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: JournalEntryStatus.DRAFT,
        entryDate: { gte: period.startsOn, lte: period.endsOn },
      },
    });
    expect(prisma.journalEntry.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: JournalEntryStatus.DRAFT,
        entryDate: { gte: period.startsOn, lte: period.endsOn },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
  });

  it("surfaces tenant-scoped draft sales invoices inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.salesInvoice.count.mockResolvedValue(2);
    prisma.salesInvoice.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-22T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({
          key: "sales.draftInvoices",
          severity: "WARNING",
          status: "OPEN",
          code: "DRAFT_SALES_INVOICES",
          count: 2,
          canAcknowledge: false,
          detailsHref: "/sales/invoices",
          sourceUpdatedAt: "2026-06-22T12:00:00.000Z",
        }),
      ]),
    });
    expect(prisma.salesInvoice.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: SalesInvoiceStatus.DRAFT,
        issueDate: { gte: period.startsOn, lte: period.endsOn },
      },
    });
    expect(prisma.salesInvoice.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: SalesInvoiceStatus.DRAFT,
        issueDate: { gte: period.startsOn, lte: period.endsOn },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
  });

  it("surfaces tenant-scoped draft credit notes inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.creditNote.count.mockResolvedValue(2);
    prisma.creditNote.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-23T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({
          key: "sales.draftCreditNotes",
          severity: "WARNING",
          status: "OPEN",
          code: "DRAFT_CREDIT_NOTES",
          count: 2,
          canAcknowledge: false,
          detailsHref: "/sales/credit-notes",
          sourceUpdatedAt: "2026-06-23T12:00:00.000Z",
        }),
      ]),
    });
    expect(prisma.creditNote.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: CreditNoteStatus.DRAFT,
        issueDate: { gte: period.startsOn, lte: period.endsOn },
      },
    });
    expect(prisma.creditNote.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        status: CreditNoteStatus.DRAFT,
        issueDate: { gte: period.startsOn, lte: period.endsOn },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
  });

  it("surfaces posted non-voided customer payments with an unapplied balance inside the fiscal period", async () => {
    const { service, prisma } = createService();
    prisma.customerPayment.count.mockResolvedValue(2);
    prisma.customerPayment.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-24T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "sales.unappliedCustomerPayments", severity: "WARNING", status: "OPEN", code: "UNAPPLIED_CUSTOMER_PAYMENTS", count: 2, canAcknowledge: false, detailsHref: "/sales/customer-payments", sourceUpdatedAt: "2026-06-24T12:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: CustomerPaymentStatus.POSTED, voidReversalJournalEntryId: null, paymentDate: { gte: period.startsOn, lte: period.endsOn }, unappliedAmount: { gt: 0 } };
    expect(prisma.customerPayment.count).toHaveBeenCalledWith({ where });
    expect(prisma.customerPayment.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped draft purchase bills inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.purchaseBill.count.mockResolvedValue(2);
    prisma.purchaseBill.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-25T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "purchases.draftBills", severity: "WARNING", status: "OPEN", code: "DRAFT_PURCHASE_BILLS", count: 2, canAcknowledge: false, detailsHref: "/purchases/bills", sourceUpdatedAt: "2026-06-25T12:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: PurchaseBillStatus.DRAFT, billDate: { gte: period.startsOn, lte: period.endsOn } };
    expect(prisma.purchaseBill.count).toHaveBeenCalledWith({ where });
    expect(prisma.purchaseBill.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped draft purchase debit notes inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.purchaseDebitNote.count.mockResolvedValue(2);
    prisma.purchaseDebitNote.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-26T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "purchases.draftDebitNotes", severity: "WARNING", status: "OPEN", code: "DRAFT_PURCHASE_DEBIT_NOTES", count: 2, canAcknowledge: false, detailsHref: "/purchases/debit-notes", sourceUpdatedAt: "2026-06-26T12:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: PurchaseDebitNoteStatus.DRAFT, issueDate: { gte: period.startsOn, lte: period.endsOn } };
    expect(prisma.purchaseDebitNote.count).toHaveBeenCalledWith({ where });
    expect(prisma.purchaseDebitNote.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped posted supplier payments with an unapplied balance inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.supplierPayment.count.mockResolvedValue(2);
    prisma.supplierPayment.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-27T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "purchases.unappliedSupplierPayments", severity: "WARNING", status: "OPEN", code: "UNAPPLIED_SUPPLIER_PAYMENTS", count: 2, canAcknowledge: false, detailsHref: "/purchases/supplier-payments", sourceUpdatedAt: "2026-06-27T12:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: SupplierPaymentStatus.POSTED, voidReversalJournalEntryId: null, paymentDate: { gte: period.startsOn, lte: period.endsOn }, unappliedAmount: { gt: 0 } };
    expect(prisma.supplierPayment.count).toHaveBeenCalledWith({ where });
    expect(prisma.supplierPayment.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped unmatched bank statement transactions dated in or through the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.bankStatementTransaction.count.mockResolvedValue(2);
    prisma.bankStatementTransaction.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-28T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "banking.unreconciledStatementTransactions", severity: "WARNING", status: "OPEN", code: "UNRECONCILED_BANK_STATEMENT_TRANSACTIONS", count: 2, canAcknowledge: false, detailsHref: "/bank-accounts", sourceUpdatedAt: "2026-06-28T12:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: BankStatementTransactionStatus.UNMATCHED, transactionDate: { lte: period.endsOn } };
    expect(prisma.bankStatementTransaction.count).toHaveBeenCalledWith({ where });
    expect(prisma.bankStatementTransaction.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped incomplete bank reconciliations that overlap the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.bankReconciliation.count.mockResolvedValue(2);
    prisma.bankReconciliation.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-29T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "banking.incompleteReconciliations", severity: "WARNING", status: "OPEN", code: "INCOMPLETE_BANK_RECONCILIATIONS", count: 2, canAcknowledge: false, detailsHref: "/bank-accounts", sourceUpdatedAt: "2026-06-29T12:00:00.000Z" }),
      ]),
    });
    const where = {
      organizationId: "org-1",
      status: { in: [BankReconciliationStatus.DRAFT, BankReconciliationStatus.PENDING_APPROVAL, BankReconciliationStatus.APPROVED] },
      periodStart: { lte: period.endsOn },
      periodEnd: { gte: period.startsOn },
    };
    expect(prisma.bankReconciliation.count).toHaveBeenCalledWith({ where });
    expect(prisma.bankReconciliation.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped draft inventory adjustments inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.inventoryAdjustment.count.mockResolvedValue(2);
    prisma.inventoryAdjustment.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-30T12:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "inventory.draftAdjustments", severity: "WARNING", status: "OPEN", code: "DRAFT_INVENTORY_ADJUSTMENTS", count: 2, canAcknowledge: false, detailsHref: "/inventory/adjustments", sourceUpdatedAt: "2026-06-30T12:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: InventoryAdjustmentStatus.DRAFT, adjustmentDate: { gte: period.startsOn, lte: period.endsOn } };
    expect(prisma.inventoryAdjustment.count).toHaveBeenCalledWith({ where });
    expect(prisma.inventoryAdjustment.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped inventory variance proposals awaiting posting inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.inventoryVarianceProposal.count.mockResolvedValue(2);
    prisma.inventoryVarianceProposal.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-30T13:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "inventory.pendingVarianceProposals", severity: "WARNING", status: "OPEN", code: "PENDING_INVENTORY_VARIANCE_PROPOSALS", count: 2, canAcknowledge: false, detailsHref: "/inventory/reports/clearing-reconciliation", sourceUpdatedAt: "2026-06-30T13:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: { in: [InventoryVarianceProposalStatus.DRAFT, InventoryVarianceProposalStatus.PENDING_APPROVAL, InventoryVarianceProposalStatus.APPROVED] }, proposalDate: { gte: period.startsOn, lte: period.endsOn } };
    expect(prisma.inventoryVarianceProposal.count).toHaveBeenCalledWith({ where });
    expect(prisma.inventoryVarianceProposal.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped failed report packs that overlap the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.reportPack.count.mockResolvedValue(2);
    prisma.reportPack.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-30T14:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "reports.failedPacks", severity: "WARNING", status: "OPEN", code: "FAILED_REPORT_PACKS", count: 2, canAcknowledge: false, detailsHref: "/reports", sourceUpdatedAt: "2026-06-30T14:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: ReportPackStatus.FAILED, periodFrom: { lte: "2026-06-30" }, periodTo: { gte: "2026-06-01" } };
    expect(prisma.reportPack.count).toHaveBeenCalledWith({ where });
    expect(prisma.reportPack.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("surfaces tenant-scoped draft cash expenses inside the fiscal period as an authoritative warning", async () => {
    const { service, prisma } = createService();
    prisma.cashExpense.count.mockResolvedValue(2);
    prisma.cashExpense.findFirst.mockResolvedValue({ updatedAt: new Date("2026-06-30T14:00:00.000Z") });

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      warningCount: 2,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "purchases.draftCashExpenses", severity: "WARNING", status: "OPEN", code: "DRAFT_CASH_EXPENSES", count: 2, canAcknowledge: false, detailsHref: "/purchases/cash-expenses", sourceUpdatedAt: "2026-06-30T14:00:00.000Z" }),
      ]),
    });
    const where = { organizationId: "org-1", status: CashExpenseStatus.DRAFT, expenseDate: { gte: period.startsOn, lte: period.endsOn } };
    expect(prisma.cashExpense.count).toHaveBeenCalledWith({ where });
    expect(prisma.cashExpense.findFirst).toHaveBeenCalledWith({ where, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  });

  it("fails closed when the requested fiscal period is outside the active tenant", async () => {
    const { service, prisma } = createService();
    prisma.fiscalPeriod.findFirst.mockResolvedValue(null);

    await expect(service.readiness("org-1", "other-tenant-period")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns a safe non-acknowledgeable blocker when an authoritative category is unavailable", async () => {
    const { service, fx } = createService();
    fx.readiness.mockRejectedValue(new Error("database connection details must not escape"));

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      blockerCount: 1,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "fx.error", severity: "BLOCKER", status: "ERROR", code: "FX_READINESS_UNAVAILABLE", canAcknowledge: false }),
      ]),
    });
  });

  it("returns a tenant-scoped close-cycle summary without raw organization or request fields", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, {
      accountingCloseCycle: {
        findFirst: jest.fn().mockResolvedValue({
          id: "cycle-1", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 3,
          startedAt: new Date("2026-07-01T00:00:00.000Z"), lastRefreshedAt: null, readinessHash: "hash", requestId: "internal-request-id",
          fiscalPeriod: { id: "period-1", name: "June 2026", startsOn: period.startsOn, endsOn: period.endsOn, status: FiscalPeriodStatus.OPEN },
          _count: { tasks: 17, evidence: 0, readinessSnapshots: 1 },
        }),
      },
    });

    const result = await service.getCycle("org-1", "cycle-1");
    expect(result).toMatchObject({ id: "cycle-1", fiscalPeriod: { id: "period-1", status: FiscalPeriodStatus.OPEN }, taskCount: 17, snapshotCount: 1 });
    expect(result).not.toHaveProperty("organizationId");
    expect(result).not.toHaveProperty("requestId");
    expect(prisma.accountingCloseCycle.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "cycle-1", organizationId: "org-1" } }));
  });

  it("finds an existing cycle by tenant-owned fiscal period for read-only workspace reloads", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, { accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", organizationId: "org-1", fiscalPeriodId: "period-1", status: "REVIEWED", version: 4, startedAt: new Date(), lastRefreshedAt: null, readinessHash: "hash", requestId: "internal", fiscalPeriod: { id: "period-1", name: "June 2026", startsOn: period.startsOn, endsOn: period.endsOn, status: FiscalPeriodStatus.OPEN }, _count: { tasks: 17, evidence: 1, readinessSnapshots: 2 } }) } });

    await expect(service.findCycleByFiscalPeriod("org-1", "period-1")).resolves.toMatchObject({ id: "cycle-1", status: "REVIEWED", fiscalPeriod: { id: "period-1" } });
    expect(prisma.accountingCloseCycle.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", fiscalPeriodId: "period-1" } }));
  });

  it("lists close tasks through a tenant-scoped bounded page and maps only safe fields", async () => {
    const { service, prisma } = createService();
    const tasks = [{ id: "task-1", organizationId: "org-1", closeCycleId: "cycle-1", taskType: "AR_AGING", source: "STANDARD_TEMPLATE", title: "Review AR aging", description: null, severity: "INFORMATION", status: "OPEN", isRequired: true, assignedToUserId: null, dueDate: null, completedAt: null, completedByUserId: null, completionNote: null, reopenedAt: null, reopenedByUserId: null, reopenReason: null, acknowledgementReason: null, sortOrder: 1, systemCheckKey: null }];
    Object.assign(prisma, {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1" }) },
      accountingCloseTask: { findMany: jest.fn().mockResolvedValue(tasks), count: jest.fn().mockResolvedValue(17) },
    });

    const result = await service.listTasks("org-1", "cycle-1", 2, 10);
    expect(result).toMatchObject({ items: [expect.objectContaining({ id: "task-1", title: "Review AR aging" })], meta: { page: 2, pageSize: 10, totalItems: 17, totalPages: 2 } });
    expect(result.items[0]).not.toHaveProperty("organizationId");
    expect(prisma.accountingCloseTask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", closeCycleId: "cycle-1" }, skip: 10, take: 10 }));
  });

  it("rejects a pathological close-task page before issuing an offset query", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, { accountingCloseCycle: { findFirst: jest.fn() }, accountingCloseTask: { findMany: jest.fn() } });
    await expect(service.listTasks("org-1", "cycle-1", 10001, 100)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.accountingCloseCycle.findFirst).not.toHaveBeenCalled();
    expect(prisma.accountingCloseTask.findMany).not.toHaveBeenCalled();
  });

  it("lists immutable readiness snapshot summaries through a bounded tenant-scoped page", async () => {
    const { service, prisma } = createService();
    const snapshots = [{
      id: "snapshot-1", organizationId: "org-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", capturedAt: new Date("2026-07-01T00:00:00.000Z"),
      capturedByUserId: "user-1", status: "REVIEWED", blockerCount: 0, warningCount: 2, informationCount: 3, checkCount: 5,
      canonicalHash: "canonical-hash", sourceVersion: 4, requestId: "internal-request-id",
    }];
    Object.assign(prisma, {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1" }) },
      accountingCloseReadinessSnapshot: { findMany: jest.fn().mockResolvedValue(snapshots), count: jest.fn().mockResolvedValue(17) },
    });

    const result = await service.listSnapshots("org-1", "cycle-1", 2, 10);
    expect(result).toMatchObject({ items: [expect.objectContaining({ id: "snapshot-1", status: "REVIEWED", canonicalHash: "canonical-hash" })], meta: { page: 2, pageSize: 10, totalItems: 17, totalPages: 2 } });
    expect(result.items[0]).not.toHaveProperty("organizationId");
    expect(result.items[0]).not.toHaveProperty("requestId");
    expect(prisma.accountingCloseReadinessSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", closeCycleId: "cycle-1" }, skip: 10, take: 10 }));
  });

  it("returns only safe immutable snapshot items scoped to the requested tenant and cycle", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, {
      accountingCloseReadinessSnapshot: {
        findFirst: jest.fn().mockResolvedValue({
          id: "snapshot-1", organizationId: "org-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", capturedAt: new Date("2026-07-01T00:00:00.000Z"),
          capturedByUserId: "user-1", status: "REVIEWED", blockerCount: 0, warningCount: 2, informationCount: 3, checkCount: 5,
          canonicalHash: "canonical-hash", sourceVersion: 4, requestId: "internal-request-id",
          items: [{ checkKey: "fx.rates", severity: "WARNING", status: "OPEN", code: "MISSING_RATE", safeMessage: "Capture a closing rate.", count: 1, currencyCode: "AED", sourceUpdatedAt: null, metadataSafe: { title: "FX rates" }, sourceEntityId: "internal-entity-id" }],
        }),
      },
    });

    const result = await service.getSnapshot("org-1", "cycle-1", "snapshot-1");
    expect(result).toMatchObject({ id: "snapshot-1", status: "REVIEWED", items: [expect.objectContaining({ checkKey: "fx.rates", metadataSafe: { title: "FX rates" } })] });
    expect(result).not.toHaveProperty("organizationId");
    expect(result).not.toHaveProperty("requestId");
    expect(result.items[0]).not.toHaveProperty("sourceEntityId");
    expect(prisma.accountingCloseReadinessSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "snapshot-1", closeCycleId: "cycle-1", organizationId: "org-1" } }));
  });

  it("rejects a pathological readiness snapshot page before querying tenant data", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, { accountingCloseCycle: { findFirst: jest.fn() }, accountingCloseReadinessSnapshot: { findMany: jest.fn() } });
    await expect(service.listSnapshots("org-1", "cycle-1", 10001, 100)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.accountingCloseCycle.findFirst).not.toHaveBeenCalled();
    expect(prisma.accountingCloseReadinessSnapshot.findMany).not.toHaveBeenCalled();
  });

  it("compares two tenant-scoped immutable snapshots with deterministic safe check changes", async () => {
    const { service, prisma } = createService();
    const snapshot = (id: string, items: any[]) => ({ id, organizationId: "org-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", capturedAt: new Date(id === "baseline" ? "2026-06-30T10:00:00.000Z" : "2026-07-01T10:00:00.000Z"), capturedByUserId: "user-1", status: "REVIEWED", blockerCount: 0, warningCount: 1, informationCount: 0, checkCount: items.length, canonicalHash: `${id}-hash`, sourceVersion: 4, requestId: "internal", items });
    Object.assign(prisma, {
      accountingCloseReadinessSnapshot: { findMany: jest.fn().mockResolvedValue([
        snapshot("baseline", [
          { checkKey: "ar.aging", severity: "WARNING", status: "OPEN", code: "AR_OLD", safeMessage: "Review overdue receivables.", count: 2, currencyCode: null, sourceUpdatedAt: null, metadataSafe: { title: "AR aging" }, sourceEntityId: "internal-a" },
          { checkKey: "removed.check", severity: "INFORMATION", status: "OPEN", code: "REMOVED", safeMessage: "Was present.", count: null, currencyCode: null, sourceUpdatedAt: null, metadataSafe: null },
        ]),
        snapshot("current", [
          { checkKey: "ar.aging", severity: "WARNING", status: "OPEN", code: "AR_OLD", safeMessage: "Review overdue receivables.", count: 3, currencyCode: null, sourceUpdatedAt: null, metadataSafe: { title: "AR aging" }, sourceEntityId: "internal-b" },
          { checkKey: "added.check", severity: "BLOCKER", status: "BLOCKED", code: "ADDED", safeMessage: "New blocker.", count: 1, currencyCode: "AED", sourceUpdatedAt: null, metadataSafe: null },
        ]),
      ]) },
    });

    const result = await service.compareSnapshots("org-1", "cycle-1", "baseline", "current");
    expect(result).toMatchObject({ baseline: { id: "baseline", canonicalHash: "baseline-hash" }, comparison: { id: "current", canonicalHash: "current-hash" }, changes: [
      { checkKey: "added.check", changeType: "ADDED", after: expect.objectContaining({ safeMessage: "New blocker." }) },
      { checkKey: "ar.aging", changeType: "MODIFIED", before: expect.objectContaining({ count: 2 }), after: expect.objectContaining({ count: 3 }) },
      { checkKey: "removed.check", changeType: "REMOVED", before: expect.objectContaining({ safeMessage: "Was present." }) },
    ] });
    expect(result.changes[1]!.after).not.toHaveProperty("sourceEntityId");
    expect(prisma.accountingCloseReadinessSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", closeCycleId: "cycle-1", id: { in: ["baseline", "current"] } } }));
  });

  it("rejects self-comparison or a snapshot outside the requested tenant and cycle", async () => {
    const { service, prisma } = createService();
    await expect(service.compareSnapshots("org-1", "cycle-1", "same", "same")).rejects.toBeInstanceOf(BadRequestException);
    Object.assign(prisma, { accountingCloseReadinessSnapshot: { findMany: jest.fn().mockResolvedValue([]) } });
    await expect(service.compareSnapshots("org-1", "cycle-1", "baseline", "other-tenant")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("exports a tenant-scoped close evidence manifest with safe, bounded task, evidence, and frozen check records", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, {
      accountingCloseCycle: {
        findFirst: jest.fn().mockResolvedValue({
          id: "cycle-1", organizationId: "org-1", fiscalPeriodId: "period-1", status: "REVIEWED", version: 7,
          startedAt: new Date("2026-07-01T00:00:00.000Z"), preparedAt: new Date("2026-07-02T00:00:00.000Z"), preparedByUserId: "user-preparer",
          reviewedAt: new Date("2026-07-03T00:00:00.000Z"), reviewedByUserId: "user-reviewer", closedAt: null, lockedAt: null,
          readinessHash: "current-hash", requestId: "internal-request-id",
          organization: { id: "org-1", name: "LedgerByte Demo", baseCurrency: "AED", taxNumber: "private-tax-number" },
          fiscalPeriod: { id: "period-1", name: "June 2026", startsOn: period.startsOn, endsOn: period.endsOn, status: FiscalPeriodStatus.OPEN },
        }),
      },
      accountingCloseTask: {
        findMany: jest.fn().mockResolvedValue([{
          id: "task-1", organizationId: "org-1", closeCycleId: "cycle-1", taskType: "AR_AGING", source: "STANDARD_TEMPLATE", title: "Review AR aging",
          severity: "WARNING", status: "COMPLETED", isRequired: true, assignedToUserId: "user-preparer", dueDate: null,
          completedAt: new Date("2026-07-02T00:00:00.000Z"), completedByUserId: "user-preparer", completionNote: "private working note",
          acknowledgementReason: "Reviewed with controller", safeMetadata: { private: "no" },
        }]),
      },
      accountingCloseEvidence: {
        findMany: jest.fn().mockResolvedValue([{
          id: "evidence-1", organizationId: "org-1", closeCycleId: "cycle-1", closeTaskId: "task-1", evidenceType: "REPORT",
          entityType: "GeneratedDocument", entityId: "document-1", reportType: "TRIAL_BALANCE", generatedDocumentId: "document-1",
          safeLabel: "=June trial balance", safeMetadata: { privatePayload: "must not export" }, addedByUserId: "user-preparer", addedAt: new Date("2026-07-02T00:00:00.000Z"),
        }]),
      },
      accountingCloseReadinessSnapshot: {
        findFirst: jest.fn().mockResolvedValue({
          id: "snapshot-1", organizationId: "org-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", capturedAt: new Date("2026-07-03T00:00:00.000Z"),
          capturedByUserId: "user-reviewer", status: "REVIEWED", blockerCount: 0, warningCount: 1, informationCount: 2, checkCount: 3,
          canonicalHash: "frozen-hash", sourceVersion: 7, requestId: "internal-request-id",
          items: [{ checkKey: "ar.aging", severity: "WARNING", status: "OPEN", code: "AR_OLD", safeMessage: "Review overdue receivables.", count: 2, currencyCode: "AED", sourceUpdatedAt: null, metadataSafe: { title: "AR aging" }, sourceEntityId: "private-source-id" }],
        }),
      },
    });

    const manifest = await service.exportCycleEvidence("org-1", "cycle-1");

    expect(manifest).toMatchObject({
      organization: { id: "org-1", name: "LedgerByte Demo", baseCurrency: "AED" },
      fiscalPeriod: { id: "period-1", name: "June 2026" },
      cycle: { id: "cycle-1", status: "REVIEWED", preparerUserId: "user-preparer", reviewerUserId: "user-reviewer", readinessHash: "current-hash" },
      tasks: [expect.objectContaining({ id: "task-1", acknowledgementReason: "Reviewed with controller" })],
      evidence: [expect.objectContaining({ id: "evidence-1", reportType: "TRIAL_BALANCE", generatedDocumentId: "document-1" })],
      latestReadinessSnapshot: expect.objectContaining({ id: "snapshot-1", canonicalHash: "frozen-hash", items: [expect.objectContaining({ checkKey: "ar.aging" })] }),
    });
    expect(manifest).not.toHaveProperty("requestId");
    expect(manifest.organization).not.toHaveProperty("taxNumber");
    expect(manifest.tasks[0]).not.toHaveProperty("organizationId");
    expect(manifest.tasks[0]).not.toHaveProperty("completionNote");
    expect(manifest.evidence[0]).not.toHaveProperty("safeMetadata");
    expect(manifest.evidence[0]).not.toHaveProperty("entityType");
    expect(manifest.evidence[0]).not.toHaveProperty("entityId");
    expect(manifest.evidence[0]).not.toHaveProperty("addedByUserId");
    expect(manifest.latestReadinessSnapshot!.items[0]).not.toHaveProperty("sourceEntityId");
    expect(prisma.accountingCloseCycle.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "cycle-1", organizationId: "org-1" } }));
    expect(prisma.accountingCloseTask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", closeCycleId: "cycle-1" }, take: 10001 }));
    expect(prisma.accountingCloseEvidence.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", closeCycleId: "cycle-1" }, take: 10001 }));
    const csv = service.exportCycleEvidenceCsv(manifest);
    expect(csv).toMatchObject({ filename: "accounting-close-evidence-cycle-1.csv" });
    expect(csv.content).toContain("'=June trial balance");
    expect(csv.content).not.toContain("private-source-id");
    expect(csv.content).not.toContain("user-preparer");
  });

  it("fails rather than silently truncating a close evidence export", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", organization: { id: "org-1", name: "LedgerByte Demo", baseCurrency: "AED" }, fiscalPeriod: { id: "period-1", name: "June 2026", startsOn: period.startsOn, endsOn: period.endsOn, status: FiscalPeriodStatus.OPEN } }) },
      accountingCloseTask: { findMany: jest.fn().mockResolvedValue(Array.from({ length: 10001 }, (_, index) => ({ id: `task-${index}` })) ) },
      accountingCloseEvidence: { findMany: jest.fn() },
      accountingCloseReadinessSnapshot: { findFirst: jest.fn() },
    });

    await expect(service.exportCycleEvidence("org-1", "cycle-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.accountingCloseEvidence.findMany).not.toHaveBeenCalled();
    expect(prisma.accountingCloseReadinessSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it("attaches tenant-owned generated-document evidence to a mutable close task with safe fields only", async () => {
    const { service, prisma, auditLog } = createService();
    const evidence = { id: "evidence-1", organizationId: "org-1", closeCycleId: "cycle-1", closeTaskId: "task-1", evidenceType: "REPORT", reportType: "TRIAL_BALANCE", generatedDocumentId: "document-1", safeLabel: "June trial balance" };
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.OPEN }) },
      accountingCloseTask: { findFirst: jest.fn().mockResolvedValue({ id: "task-1", organizationId: "org-1", closeCycleId: "cycle-1" }) },
      generatedDocument: { findFirst: jest.fn().mockResolvedValue({ id: "document-1" }) },
      accountingCloseEvidence: { create: jest.fn().mockResolvedValue(evidence) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    const result = await service.addEvidence("org-1", "user-1", "cycle-1", 4, { closeTaskId: "task-1", evidenceType: "REPORT", reportType: "TRIAL_BALANCE", generatedDocumentId: "document-1", safeLabel: "June trial balance" });
    expect(result).toMatchObject({ id: "evidence-1", safeLabel: "June trial balance" });
    expect(result).not.toHaveProperty("organizationId");
    expect(tx.generatedDocument.findFirst).toHaveBeenCalledWith({ where: { id: "document-1", organizationId: "org-1", status: "GENERATED" }, select: { id: true } });
    expect(tx.accountingCloseEvidence.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1", closeTaskId: "task-1", generatedDocumentId: "document-1", safeLabel: "June trial balance" }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ATTACH_EVIDENCE", entityType: "AccountingCloseEvidence" }), tx);
  });

  it("rejects failed generated documents before claiming the close cycle", async () => {
    const { service, prisma } = createService();
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }), updateMany: jest.fn() },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.OPEN }) },
      generatedDocument: { findFirst: jest.fn().mockResolvedValue(null) },
      accountingCloseEvidence: { create: jest.fn() },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });
    await expect(service.addEvidence("org-1", "user-1", "cycle-1", 4, { evidenceType: "REPORT", reportType: "TRIAL_BALANCE", generatedDocumentId: "failed-document", safeLabel: "Failed report" })).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.generatedDocument.findFirst).toHaveBeenCalledWith({ where: { id: "failed-document", organizationId: "org-1", status: "GENERATED" }, select: { id: true } });
    expect(tx.accountingCloseCycle.updateMany).not.toHaveBeenCalled();
    expect(tx.accountingCloseEvidence.create).not.toHaveBeenCalled();
  });

  it("assigns a manual close task only to an active member of the tenant and audits the change", async () => {
    const { service, prisma, auditLog } = createService();
    const task = { id: "task-1", organizationId: "org-1", closeCycleId: "cycle-1", source: "STANDARD_TEMPLATE", status: "OPEN", assignedToUserId: null };
    const assigned = { ...task, assignedToUserId: "user-2" };
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.OPEN }) },
      accountingCloseTask: { findFirst: jest.fn().mockResolvedValue(task), update: jest.fn().mockResolvedValue(assigned) },
      organizationMember: { findFirst: jest.fn().mockResolvedValue({ id: "membership-1" }) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    const result = await service.assignTask("org-1", "user-1", "cycle-1", "task-1", 3, "user-2");
    expect(result).toMatchObject({ assignedToUserId: "user-2" });
    expect(result).not.toHaveProperty("organizationId");
    expect(result).not.toHaveProperty("closeCycleId");
    expect(tx.organizationMember.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", userId: "user-2", status: "ACTIVE" }, select: { id: true } });
    expect(tx.accountingCloseTask.update).toHaveBeenCalledWith(expect.objectContaining({ data: { assignedToUserId: "user-2" } }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ASSIGN", before: task, after: assigned }), tx);
  });

  it("creates one tenant-scoped cycle with the standard required manual tasks and an audit event", async () => {
    const { service, prisma, fx, recurring, auditLog } = createService();
    const tx = {
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      accountingCloseCycle: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "cycle-1", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }),
      },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.createCycle("org-1", "user-1", "period-1")).resolves.toMatchObject({ id: "cycle-1" });

    expect(tx.accountingCloseCycle.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org-1",
        fiscalPeriodId: "period-1",
        startedByUserId: "user-1",
        tasks: { create: expect.arrayContaining([
          expect.objectContaining({ taskType: "BANK_RECONCILIATION", isRequired: true, source: "STANDARD_TEMPLATE" }),
          expect.objectContaining({ taskType: "REVIEWER_SIGN_OFF", isRequired: true, source: "STANDARD_TEMPLATE" }),
        ]) },
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", actorUserId: "user-1", action: "START", entityType: "AccountingCloseCycle", entityId: "cycle-1" }), tx);
  });

  it("rejects a cycle for a closed or locked fiscal period", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback({ fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ ...period, status: FiscalPeriodStatus.LOCKED }) } })) });

    await expect(service.createCycle("org-1", "user-1", "period-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("replays the existing cycle when a concurrent unique claim wins", async () => {
    const { service, prisma } = createService();
    const existing = { id: "cycle-existing", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" };
    Object.assign(prisma, {
      $transaction: jest.fn().mockRejectedValue({ code: "P2002" }),
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue(existing) },
    });

    await expect(service.createCycle("org-1", "user-1", "period-1")).resolves.toEqual(existing);
  });

  it("replays the existing cycle when serializable retries are exhausted", async () => {
    const { service, prisma } = createService();
    const existing = { id: "cycle-existing", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" };
    Object.assign(prisma, {
      $transaction: jest.fn().mockRejectedValue({ code: "P2034" }),
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue(existing) },
    });

    await expect(service.createCycle("org-1", "user-1", "period-1")).resolves.toEqual(existing);
  });

  it("completes only a tenant-scoped manual task with the expected cycle version", async () => {
    const { service, prisma, auditLog } = createService();
    const task = { id: "task-1", organizationId: "org-1", closeCycleId: "cycle-1", source: "STANDARD_TEMPLATE", status: "OPEN" };
    const tx = {
      accountingCloseTask: {
        findFirst: jest.fn().mockResolvedValue(task),
        update: jest.fn().mockResolvedValue({ ...task, status: "COMPLETED", completionNote: "Reviewed." }),
      },
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.OPEN }) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.completeTask("org-1", "user-1", "cycle-1", "task-1", 3, "Reviewed.")).resolves.toMatchObject({ status: "COMPLETED" });
    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith({ where: { id: "cycle-1", organizationId: "org-1", version: 3, status: { in: ["IN_PROGRESS", "READY_FOR_REVIEW"] }, fiscalPeriod: { is: { organizationId: "org-1", status: FiscalPeriodStatus.OPEN } } }, data: { version: { increment: 1 } } });
    expect(tx.accountingCloseTask.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED", completedByUserId: "user-1", completionNote: "Reviewed." }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "COMPLETE", entityType: "AccountingCloseTask", entityId: "task-1" }), tx);
  });

  it("rejects completion after the cycle is closed or locked", async () => {
    const { service, prisma } = createService();
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "LOCKED" }) },
      accountingCloseTask: { findFirst: jest.fn() },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });
    await expect(service.completeTask("org-1", "user-1", "cycle-1", "task-1", 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects completion when the authoritative fiscal period is closed or locked", async () => {
    const { service, prisma } = createService();
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.CLOSED }) },
      accountingCloseTask: { findFirst: jest.fn() },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });
    await expect(service.completeTask("org-1", "user-1", "cycle-1", "task-1", 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires reopening before a completed task can be completed again", async () => {
    const { service, prisma } = createService();
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.OPEN }) },
      accountingCloseTask: { findFirst: jest.fn().mockResolvedValue({ id: "task-1", organizationId: "org-1", closeCycleId: "cycle-1", source: "STANDARD_TEMPLATE", status: "COMPLETED" }) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });
    await expect(service.completeTask("org-1", "user-1", "cycle-1", "task-1", 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps a serializable completion conflict to a safe conflict response", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, { $transaction: jest.fn().mockRejectedValue({ code: "P2034" }) });
    await expect(service.completeTask("org-1", "user-1", "cycle-1", "task-1", 1)).rejects.toMatchObject({ status: 409 });
  });

  it("reopens a completed manual task with a reason and preserves the completion history in audit", async () => {
    const { service, prisma, auditLog } = createService();
    const task = { id: "task-1", organizationId: "org-1", closeCycleId: "cycle-1", source: "STANDARD_TEMPLATE", status: "COMPLETED", completedByUserId: "user-2", completionNote: "Prior review." };
    const reopened = { ...task, status: "OPEN", completedAt: null, completedByUserId: null, completionNote: null, reopenedByUserId: "user-1", reopenReason: "Supporting report changed." };
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.OPEN }) },
      accountingCloseTask: { findFirst: jest.fn().mockResolvedValue(task), update: jest.fn().mockResolvedValue(reopened) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.reopenTask("org-1", "user-1", "cycle-1", "task-1", 4, "Supporting report changed.")).resolves.toMatchObject({ status: "OPEN", reopenedByUserId: "user-1" });
    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ version: 4 }) }));
    expect(tx.accountingCloseTask.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "OPEN", completedAt: null, completedByUserId: null, completionNote: null, reopenedByUserId: "user-1", reopenReason: "Supporting report changed." }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REOPEN", before: task, after: reopened }), tx);
  });

  it("prepares a close cycle only after current readiness is clear and required manual tasks are complete", async () => {
    const { service, prisma, fx, recurring, auditLog } = createService();
    fx.readiness.mockResolvedValue({ status: "READY", asOf: "2026-06-30", counts: { foreignDocuments: 0 }, actions: [], blockers: [] });
    recurring.get.mockResolvedValue({ status: "READY", templateCount: 0, activeTemplates: 0, dueTemplates: 0, failedRuns: 0, blockedRuns: 0, generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0, runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T00:00:00.000Z" });
    const snapshot = { id: "snapshot-prepare", organizationId: "org-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", capturedAt: new Date(), capturedByUserId: "user-1", status: "DRAFT", blockerCount: 0, warningCount: 0, informationCount: 0, checkCount: 0, canonicalHash: "clear-hash", sourceVersion: 5, items: [] };
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      journalEntry: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      salesInvoice: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      creditNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      customerPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseBill: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseDebitNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      supplierPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankReconciliation: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryAdjustment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryVarianceProposal: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      reportPack: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      cashExpense: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      accountingCloseTask: { findFirst: jest.fn().mockResolvedValue(null) },
      accountingCloseReadinessSnapshot: { create: jest.fn().mockResolvedValue(snapshot) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.prepareCycle("org-1", "user-1", "cycle-1", 4)).resolves.toMatchObject({ id: "cycle-1", status: "READY_FOR_REVIEW", version: 5, readinessHash: expect.any(String) });

    expect(fx.readiness).toHaveBeenCalledWith("org-1", period.endsOn, tx);
    expect(recurring.get).toHaveBeenCalledWith("org-1", { startsOn: period.startsOn, endsOn: period.endsOn }, tx);
    expect(tx.accountingCloseTask.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", closeCycleId: "cycle-1", source: { not: "SYSTEM" }, isRequired: true, status: { not: "COMPLETED" } }, select: { id: true } });
    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "cycle-1", version: 4, status: "IN_PROGRESS" }), data: expect.objectContaining({ status: "READY_FOR_REVIEW", preparedByUserId: "user-1", readinessHash: expect.any(String) }) }));
    expect(tx.accountingCloseReadinessSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ closeCycleId: "cycle-1", status: "DRAFT", blockerCount: 0, canonicalHash: expect.any(String), sourceVersion: 5 }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "PREPARE", entityType: "AccountingCloseCycle", entityId: "cycle-1" }), tx);
  });

  it("rejects preparation before claiming the cycle when current readiness has a blocker", async () => {
    const { service, prisma } = createService();
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }), updateMany: jest.fn() },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      accountingCloseTask: { findFirst: jest.fn() },
      accountingCloseReadinessSnapshot: { create: jest.fn() },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.prepareCycle("org-1", "user-1", "cycle-1", 4)).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.accountingCloseTask.findFirst).not.toHaveBeenCalled();
    expect(tx.accountingCloseCycle.updateMany).not.toHaveBeenCalled();
    expect(tx.accountingCloseReadinessSnapshot.create).not.toHaveBeenCalled();
  });

  it("reviews a prepared cycle only against its current matching draft readiness snapshot", async () => {
    const { service, prisma, fx, recurring, auditLog } = createService();
    fx.readiness.mockResolvedValue({ status: "READY", asOf: "2026-06-30", counts: { foreignDocuments: 0 }, actions: [], blockers: [] });
    recurring.get.mockResolvedValue({ status: "READY", templateCount: 0, activeTemplates: 0, dueTemplates: 0, failedRuns: 0, blockedRuns: 0, generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0, runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T00:00:00.000Z" });
    const readinessHash = (await service.readiness("org-1", "period-1")).canonicalHash;
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "READY_FOR_REVIEW", preparedByUserId: "user-1", readinessHash }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      journalEntry: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      salesInvoice: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      creditNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      customerPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseBill: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseDebitNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      supplierPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankReconciliation: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryAdjustment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryVarianceProposal: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      reportPack: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      cashExpense: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      accountingCloseReadinessSnapshot: { findFirst: jest.fn().mockResolvedValue({ id: "snapshot-1", canonicalHash: readinessHash }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.reviewCycle("org-1", "user-2", "cycle-1", 5)).resolves.toMatchObject({ id: "cycle-1", status: "REVIEWED", version: 6, readinessHash, reviewedByUserId: "user-2" });

    expect(fx.readiness).toHaveBeenCalledWith("org-1", period.endsOn, tx);
    expect(recurring.get).toHaveBeenCalledWith("org-1", { startsOn: period.startsOn, endsOn: period.endsOn }, tx);
    expect(tx.accountingCloseReadinessSnapshot.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", closeCycleId: "cycle-1", status: "DRAFT", canonicalHash: readinessHash }, orderBy: { capturedAt: "desc" }, select: { id: true, canonicalHash: true } });
    expect(tx.accountingCloseReadinessSnapshot.updateMany).toHaveBeenCalledWith({ where: { id: "snapshot-1", organizationId: "org-1", status: "DRAFT" }, data: { status: "REVIEWED" } });
    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "cycle-1", version: 5, status: "READY_FOR_REVIEW" }), data: expect.objectContaining({ status: "REVIEWED", reviewedByUserId: "user-2", readinessHash }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVIEW", entityType: "AccountingCloseCycle", entityId: "cycle-1", after: expect.objectContaining({ snapshotId: "snapshot-1", readinessHash }) }), tx);
  });

  it("rejects reviewer self-approval before reading or claiming a prepared cycle", async () => {
    const { service, prisma } = createService();
    const tx = { accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "READY_FOR_REVIEW", preparedByUserId: "user-1", readinessHash: "clear-hash" }) } };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.reviewCycle("org-1", "user-1", "cycle-1", 5)).rejects.toBeInstanceOf(BadRequestException);

    expect((tx.accountingCloseCycle as any).updateMany).toBeUndefined();
  });

  it("captures an immutable tenant-scoped readiness snapshot from current normalized checks", async () => {
    const { service, prisma, fx, recurring, auditLog } = createService();
    const snapshot = {
      id: "snapshot-1",
      organizationId: "org-1",
      closeCycleId: "cycle-1",
      fiscalPeriodId: "period-1",
      capturedAt: new Date("2026-07-13T00:00:00.000Z"),
      capturedByUserId: "user-1",
      status: "DRAFT",
      blockerCount: 1,
      warningCount: 1,
      informationCount: 0,
      checkCount: 2,
      canonicalHash: "readiness-hash",
      sourceVersion: 4,
      requestId: "internal-request-id",
      items: [],
    };
    const tx = {
      accountingCloseCycle: {
        findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      journalEntry: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      salesInvoice: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      creditNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      customerPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseBill: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseDebitNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      supplierPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankReconciliation: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryAdjustment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryVarianceProposal: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      reportPack: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      cashExpense: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      accountingCloseReadinessSnapshot: { create: jest.fn().mockResolvedValue(snapshot) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    const result = await service.refreshCycle("org-1", "user-1", "cycle-1", 3);
    expect(result).toMatchObject({ id: "snapshot-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", canonicalHash: "readiness-hash" });
    expect(result).not.toHaveProperty("organizationId");
    expect(result).not.toHaveProperty("requestId");
    expect(fx.readiness).toHaveBeenCalledWith("org-1", period.endsOn, tx);
    expect(recurring.get).toHaveBeenCalledWith("org-1", { startsOn: period.startsOn, endsOn: period.endsOn }, tx);
    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "cycle-1", organizationId: "org-1", version: 3, fiscalPeriod: { is: { organizationId: "org-1", status: FiscalPeriodStatus.OPEN } } }),
    }));
    expect(tx.accountingCloseReadinessSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: "org-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", capturedByUserId: "user-1", status: "DRAFT", sourceVersion: 4, canonicalHash: expect.any(String) }),
    }));
    expect(tx.accountingCloseReadinessSnapshot.create.mock.calls[0][0].data.items.create).toEqual(expect.arrayContaining([
      expect.objectContaining({ checkKey: "fx.MISSING_CLOSING_RATE", severity: "BLOCKER", status: "BLOCKED", code: "MISSING_CLOSING_RATE", count: 1 }),
    ]));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REFRESH", entityType: "AccountingCloseReadinessSnapshot", entityId: "snapshot-1" }), tx);
  });

  it("invalidates preparation when a readiness refresh changes a ready-for-review cycle", async () => {
    const { service, prisma, fx, recurring } = createService();
    fx.readiness.mockResolvedValue({ status: "READY", asOf: "2026-06-30", counts: { foreignDocuments: 0 }, actions: [], blockers: [] });
    recurring.get.mockResolvedValue({ status: "READY", templateCount: 0, activeTemplates: 0, dueTemplates: 0, failedRuns: 0, blockedRuns: 0, generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0, runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T00:00:00.000Z" });
    const snapshot = { id: "snapshot-2", organizationId: "org-1", closeCycleId: "cycle-1", fiscalPeriodId: "period-1", capturedAt: new Date(), capturedByUserId: "user-1", status: "DRAFT", blockerCount: 0, warningCount: 0, informationCount: 0, checkCount: 0, canonicalHash: "hash", sourceVersion: 5, items: [] };
    const tx = { accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", organizationId: "org-1", fiscalPeriodId: "period-1", status: "READY_FOR_REVIEW" }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) }, journalEntry: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, salesInvoice: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, creditNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, customerPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, purchaseBill: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, purchaseDebitNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, supplierPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, cashExpense: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, bankStatementTransaction: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, bankReconciliation: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, inventoryAdjustment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, inventoryVarianceProposal: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, reportPack: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, accountingCloseReadinessSnapshot: { create: jest.fn().mockResolvedValue(snapshot) } };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await service.refreshCycle("org-1", "user-1", "cycle-1", 4);

    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "IN_PROGRESS", preparedAt: null, preparedByUserId: null, reviewedAt: null, reviewedByUserId: null }) }));
  });

  it("closes only a reviewed cycle whose live readiness still matches the reviewed hash", async () => {
    const { service, prisma, fx, recurring, auditLog, fiscalPeriods } = createService();
    fx.readiness.mockResolvedValue({ status: "READY", asOf: "2026-06-30", counts: { foreignDocuments: 0 }, actions: [], blockers: [] });
    recurring.get.mockResolvedValue({ status: "READY", templateCount: 0, activeTemplates: 0, dueTemplates: 0, failedRuns: 0, blockedRuns: 0, generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0, runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T00:00:00.000Z" });
    const readinessHash = (await service.readiness("org-1", "period-1")).canonicalHash;
    const tx = {
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "REVIEWED", readinessHash }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      journalEntry: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      salesInvoice: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      creditNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      customerPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseBill: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      purchaseDebitNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      supplierPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      bankReconciliation: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryAdjustment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      inventoryVarianceProposal: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      reportPack: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      cashExpense: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      accountingCloseReadinessSnapshot: { create: jest.fn().mockResolvedValue({ id: "snapshot-close" }) },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });
    fiscalPeriods.closeInTransaction.mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.CLOSED });

    await expect(service.closeCycle("org-1", "user-2", "cycle-1", 6)).resolves.toMatchObject({ id: "cycle-1", status: "CLOSED", version: 7 });
    expect(fiscalPeriods.closeInTransaction).toHaveBeenCalledWith("org-1", "user-2", "period-1", tx);
    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "REVIEWED", version: 6, readinessHash }), data: expect.objectContaining({ status: "CLOSED", closedByUserId: "user-2" }) }));
    expect(tx.accountingCloseReadinessSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "CLOSED", canonicalHash: readinessHash }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CLOSE", entityType: "AccountingCloseCycle", entityId: "cycle-1" }), tx);
  });

  it("locks only a closed cycle whose current readiness still matches its closed hash", async () => {
    const { service, prisma, fx, recurring, auditLog, fiscalPeriods } = createService();
    fx.readiness.mockResolvedValue({ status: "READY", asOf: "2026-06-30", counts: { foreignDocuments: 0 }, actions: [], blockers: [] });
    recurring.get.mockResolvedValue({ status: "READY", templateCount: 0, activeTemplates: 0, dueTemplates: 0, failedRuns: 0, blockedRuns: 0, generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0, runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T00:00:00.000Z" });
    const readinessHash = (await service.readiness("org-1", "period-1")).canonicalHash;
    const tx = { accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "CLOSED", readinessHash }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ ...period, status: FiscalPeriodStatus.CLOSED }) }, journalEntry: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, salesInvoice: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, creditNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, customerPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, purchaseBill: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, purchaseDebitNote: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, supplierPayment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, cashExpense: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, bankStatementTransaction: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, bankReconciliation: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, inventoryAdjustment: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, inventoryVarianceProposal: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, reportPack: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) }, accountingCloseReadinessSnapshot: { create: jest.fn().mockResolvedValue({ id: "snapshot-lock" }) } };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });
    fiscalPeriods.lockInTransaction.mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.LOCKED });

    await expect(service.lockCycle("org-1", "user-2", "cycle-1", 7)).resolves.toMatchObject({ id: "cycle-1", status: "LOCKED", version: 8 });
    expect(fiscalPeriods.lockInTransaction).toHaveBeenCalledWith("org-1", "user-2", "period-1", tx);
    expect(tx.accountingCloseCycle.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "CLOSED", version: 7, readinessHash }), data: expect.objectContaining({ status: "LOCKED", lockedByUserId: "user-2" }) }));
    expect(tx.accountingCloseReadinessSnapshot.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "LOCKED", canonicalHash: readinessHash }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "LOCK", entityType: "AccountingCloseCycle", entityId: "cycle-1" }), tx);
  });

  it("replays an already locked tenant-scoped close cycle without another snapshot or audit event", async () => {
    const { service, prisma, auditLog, fiscalPeriods } = createService();
    const tx = { accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue({ id: "cycle-1", fiscalPeriodId: "period-1", status: "LOCKED", readinessHash: "locked-hash", lockedAt: new Date("2026-07-13T00:00:00.000Z"), lockedByUserId: "user-2" }) }, fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "period-1", status: FiscalPeriodStatus.LOCKED }) }, accountingCloseReadinessSnapshot: { create: jest.fn() } };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.lockCycle("org-1", "user-2", "cycle-1", 8)).resolves.toMatchObject({ id: "cycle-1", status: "LOCKED", readinessHash: "locked-hash" });
    expect(fiscalPeriods.lockInTransaction).not.toHaveBeenCalled();
    expect(tx.accountingCloseReadinessSnapshot.create).not.toHaveBeenCalled();
    expect(auditLog.log).not.toHaveBeenCalled();
  });
});
