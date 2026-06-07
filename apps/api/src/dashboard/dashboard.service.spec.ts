import {
  AccountType,
  CollectionCaseStatus,
  DeliveryNoteStatus,
  Prisma,
  RecurringInvoiceTemplateStatus,
  SalesInvoiceStatus,
  SalesQuoteStatus,
  StockMovementType,
} from "@prisma/client";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  const organizationId = "org-1";

  function makeService(overrides: Partial<MockPrisma> = {}) {
    const bankingJournalLines = [
      {
        debit: new Prisma.Decimal("120.0000"),
        credit: new Prisma.Decimal("0.0000"),
        journalEntry: { entryDate: new Date("2026-05-01T00:00:00.000Z") },
      },
      {
        debit: new Prisma.Decimal("0.0000"),
        credit: new Prisma.Decimal("10.0000"),
        journalEntry: { entryDate: new Date("2026-05-02T00:00:00.000Z") },
      },
    ];
    const dashboardReportLines = [
      {
        debit: new Prisma.Decimal("100.0000"),
        credit: new Prisma.Decimal("0.0000"),
        account: { type: AccountType.ASSET },
        journalEntry: { entryDate: new Date("2026-05-02T00:00:00.000Z") },
      },
      {
        debit: new Prisma.Decimal("0.0000"),
        credit: new Prisma.Decimal("100.0000"),
        account: { type: AccountType.REVENUE },
        journalEntry: { entryDate: new Date("2026-05-02T00:00:00.000Z") },
      },
      {
        debit: new Prisma.Decimal("58.0000"),
        credit: new Prisma.Decimal("0.0000"),
        account: { type: AccountType.EXPENSE },
        journalEntry: { entryDate: new Date("2026-05-04T00:00:00.000Z") },
      },
      {
        debit: new Prisma.Decimal("0.0000"),
        credit: new Prisma.Decimal("58.0000"),
        account: { type: AccountType.ASSET },
        journalEntry: { entryDate: new Date("2026-05-04T00:00:00.000Z") },
      },
    ];
    const salesInvoices = [
      {
        id: "invoice-1",
        invoiceNumber: "INV-000001",
        issueDate: new Date("2026-05-02T00:00:00.000Z"),
        dueDate: new Date("2026-05-03T00:00:00.000Z"),
        total: new Prisma.Decimal("100.0000"),
        balanceDue: new Prisma.Decimal("75.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: { id: "customer-1", name: "Acme Trading", displayName: "Acme" },
      },
    ];
    const recurringDraftInvoices = [
      {
        id: "invoice-rec-1",
        invoiceNumber: "INV-DRAFT-REC",
        issueDate: new Date("2026-05-14T00:00:00.000Z"),
        dueDate: new Date("2026-05-28T00:00:00.000Z"),
        total: new Prisma.Decimal("44.0000"),
        balanceDue: new Prisma.Decimal("44.0000"),
        status: SalesInvoiceStatus.DRAFT,
        customer: { id: "customer-1", name: "Acme Trading", displayName: "Acme" },
        recurringInvoiceTemplate: { id: "rec-1", templateNumber: "REC-000001", name: "Monthly support" },
      },
    ];
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId, baseCurrency: "SAR" }) },
      account: { count: jest.fn().mockResolvedValue(8) },
      taxRate: { count: jest.fn().mockResolvedValue(1) },
      contact: { count: jest.fn().mockResolvedValue(1) },
      salesInvoice: {
        findMany: jest.fn().mockImplementation((query?: { where?: { status?: unknown; recurringInvoiceTemplateId?: unknown } }) => {
          if (query?.where?.recurringInvoiceTemplateId) {
            return Promise.resolve(recurringDraftInvoices);
          }
          return Promise.resolve(salesInvoices);
        }),
        count: jest.fn().mockResolvedValue(1),
      },
      salesQuote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "quote-1",
            quoteNumber: "SQ-000001",
            status: SalesQuoteStatus.SENT,
            issueDate: new Date("2026-05-01T00:00:00.000Z"),
            expiryDate: new Date("2026-05-17T00:00:00.000Z"),
            total: new Prisma.Decimal("120.0000"),
            customer: { id: "customer-1", name: "Acme Trading", displayName: "Acme" },
            convertedSalesInvoiceId: null,
          },
          {
            id: "quote-2",
            quoteNumber: "SQ-000002",
            status: SalesQuoteStatus.ACCEPTED,
            issueDate: new Date("2026-05-04T00:00:00.000Z"),
            expiryDate: new Date("2026-05-20T00:00:00.000Z"),
            total: new Prisma.Decimal("210.0000"),
            customer: { id: "customer-2", name: "Beta LLC", displayName: null },
            convertedSalesInvoiceId: null,
          },
        ]),
      },
      recurringInvoiceTemplate: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          {
            id: "rec-1",
            templateNumber: "REC-000001",
            name: "Monthly support",
            status: RecurringInvoiceTemplateStatus.ACTIVE,
            nextRunDate: new Date("2026-05-14T00:00:00.000Z"),
            total: new Prisma.Decimal("44.0000"),
            customer: { id: "customer-1", name: "Acme Trading", displayName: "Acme" },
          },
          {
            id: "rec-2",
            templateNumber: "REC-000002",
            name: "Weekly advisory",
            status: RecurringInvoiceTemplateStatus.ACTIVE,
            nextRunDate: new Date("2026-05-18T00:00:00.000Z"),
            total: new Prisma.Decimal("35.0000"),
            customer: { id: "customer-2", name: "Beta LLC", displayName: null },
          },
        ]),
      },
      deliveryNote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "dn-1",
            deliveryNoteNumber: "DN-000001",
            status: DeliveryNoteStatus.DRAFT,
            issueDate: new Date("2026-05-12T00:00:00.000Z"),
            deliveryDate: new Date("2026-05-16T00:00:00.000Z"),
            customer: { id: "customer-1", name: "Acme Trading", displayName: "Acme" },
          },
          {
            id: "dn-2",
            deliveryNoteNumber: "DN-000002",
            status: DeliveryNoteStatus.ISSUED,
            issueDate: new Date("2026-05-10T00:00:00.000Z"),
            deliveryDate: new Date("2026-05-13T00:00:00.000Z"),
            customer: { id: "customer-2", name: "Beta LLC", displayName: null },
          },
        ]),
      },
      collectionCase: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "case-1",
            caseNumber: "COL-000001",
            status: CollectionCaseStatus.PROMISED_TO_PAY,
            priority: "HIGH",
            followUpDate: new Date("2026-05-15T00:00:00.000Z"),
            nextActionAt: null,
            promisedPaymentDate: new Date("2026-05-22T00:00:00.000Z"),
            promisedAmount: new Prisma.Decimal("60.0000"),
            customer: { id: "customer-1", name: "Acme Trading", displayName: "Acme" },
            salesInvoice: { id: "invoice-1", invoiceNumber: "INV-000001", balanceDue: new Prisma.Decimal("75.0000"), dueDate: new Date("2026-05-03T00:00:00.000Z") },
          },
          {
            id: "case-2",
            caseNumber: "COL-000002",
            status: CollectionCaseStatus.DISPUTED,
            priority: "URGENT",
            followUpDate: new Date("2026-05-10T00:00:00.000Z"),
            nextActionAt: null,
            promisedPaymentDate: null,
            promisedAmount: null,
            customer: { id: "customer-2", name: "Beta LLC", displayName: null },
            salesInvoice: { id: "invoice-2", invoiceNumber: "INV-000002", balanceDue: new Prisma.Decimal("85.0000"), dueDate: new Date("2026-05-01T00:00:00.000Z") },
          },
        ]),
      },
      customerPayment: { findMany: jest.fn().mockResolvedValue([{ amountReceived: new Prisma.Decimal("25.0000") }]), count: jest.fn().mockResolvedValue(1) },
      journalEntry: { count: jest.fn().mockResolvedValue(2) },
      purchaseBill: {
        findMany: jest.fn().mockResolvedValue([
          {
            billDate: new Date("2026-05-01T00:00:00.000Z"),
            dueDate: new Date("2026-05-04T00:00:00.000Z"),
            total: new Prisma.Decimal("50.0000"),
            balanceDue: new Prisma.Decimal("30.0000"),
          },
        ]),
      },
      supplierPayment: { findMany: jest.fn().mockResolvedValue([{ amountPaid: new Prisma.Decimal("20.0000") }]) },
      bankAccountProfile: { findMany: jest.fn().mockResolvedValue([{ accountId: "bank-account-1" }]), count: jest.fn().mockResolvedValue(1) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(2) },
      bankReconciliation: {
        findFirst: jest.fn().mockResolvedValue({ closedAt: new Date("2026-05-10T00:00:00.000Z"), periodEnd: new Date("2026-05-09T00:00:00.000Z") }),
      },
      journalLine: {
        findMany: jest.fn().mockImplementation((query?: { where?: { accountId?: unknown } }) =>
          Promise.resolve(query?.where?.accountId ? bankingJournalLines : dashboardReportLines),
        ),
      },
      item: {
        findMany: jest.fn().mockResolvedValue([{ id: "item-1", name: "E2E Widget", reorderPoint: new Prisma.Decimal("10.0000") }]),
      },
      stockMovement: {
        findMany: jest.fn().mockResolvedValue([
          {
            itemId: "item-1",
            type: StockMovementType.PURCHASE_RECEIPT_PLACEHOLDER,
            quantity: new Prisma.Decimal("5.0000"),
            unitCost: new Prisma.Decimal("4.0000"),
            totalCost: null,
          },
        ]),
      },
      fiscalPeriod: {
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue({ status: "OPEN" }),
      },
      auditLog: { count: jest.fn().mockResolvedValue(4) },
      zatcaOrganizationProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue(null) },
      zatcaInvoiceMetadata: { count: jest.fn().mockResolvedValue(0) },
      ...overrides,
    } satisfies MockPrisma;
    const reportsService = {
      trialBalance: jest.fn().mockResolvedValue({ totals: { balanced: true } }),
      profitAndLoss: jest.fn().mockResolvedValue({ netProfit: "42.0000" }),
      balanceSheet: jest.fn().mockResolvedValue({ balanced: true }),
      agedReceivables: jest.fn().mockResolvedValue({
        bucketTotals: { CURRENT: "10.0000", "1_30": "5.0000", "31_60": "0.0000", "61_90": "0.0000", "90_PLUS": "0.0000" },
      }),
      agedPayables: jest.fn().mockResolvedValue({
        bucketTotals: { CURRENT: "3.0000", "1_30": "2.0000", "31_60": "0.0000", "61_90": "0.0000", "90_PLUS": "0.0000" },
      }),
    };
    const clearingReportService = {
      clearingVarianceReport: jest.fn().mockResolvedValue({ summary: { rowCount: 1 } }),
    };
    const storageService = {
      readiness: jest.fn().mockReturnValue({
        attachmentStorage: { activeProvider: "database" },
        generatedDocumentStorage: { activeProvider: "database" },
      }),
    };

    return {
      service: new DashboardService(prisma as never, reportsService as never, clearingReportService as never, storageService as never),
      prisma,
      reportsService,
      clearingReportService,
      storageService,
    };
  }

  it("returns tenant-scoped business KPI totals and attention items", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    const { service, prisma } = makeService();

    const summary = await service.summary(organizationId);

    expect(summary.currency).toBe("SAR");
    expect(summary.sales).toEqual(
      expect.objectContaining({
        unpaidInvoiceCount: 1,
        unpaidInvoiceBalance: "75.0000",
        overdueInvoiceCount: 1,
        overdueInvoiceBalance: "75.0000",
        salesThisMonth: "100.0000",
        customerPaymentThisMonth: "25.0000",
      }),
    );
    expect(summary.purchases.unpaidBillBalance).toBe("30.0000");
    expect(summary.banking.totalBankBalance).toBe("110.0000");
    expect(summary.inventory.lowStockCount).toBe(1);
    expect(summary.inventory.inventoryEstimatedValue).toBe("20.0000");
    expect(summary.inventory.lowStockItems).toEqual([
      {
        itemId: "item-1",
        name: "E2E Widget",
        quantityOnHand: "5.0000",
        reorderPoint: "10.0000",
      },
    ]);
    expect(summary.reports).toEqual({
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "42.0000",
      balanceSheetBalanced: true,
    });
    expect(summary.trends.monthlySales).toHaveLength(6);
    expect(summary.trends.monthlySales.at(-1)).toEqual({ month: "2026-05", amount: "100.0000" });
    expect(summary.trends.monthlyPurchases.at(-1)).toEqual({ month: "2026-05", amount: "50.0000" });
    expect(summary.trends.monthlyNetProfit).toHaveLength(6);
    expect(summary.trends.cashBalanceTrend.at(-1)).toEqual({ date: "2026-05-01", balance: "110.0000" });
    expect(summary.aging.receivablesBuckets).toEqual(
      expect.arrayContaining([
        { bucket: "Current", amount: "10.0000" },
        { bucket: "1-30", amount: "5.0000" },
      ]),
    );
    expect(summary.aging.payablesBuckets).toEqual(
      expect.arrayContaining([
        { bucket: "Current", amount: "3.0000" },
        { bucket: "1-30", amount: "2.0000" },
      ]),
    );
    expect(summary.salesAttention).toEqual(
      expect.objectContaining({
        readOnly: true,
        noMutation: true,
        overdueInvoices: expect.objectContaining({
          count: 1,
          total: "75.0000",
          topItems: [
            expect.objectContaining({
              id: "invoice-1",
              number: "INV-000001",
              customerName: "Acme",
              amount: "75.0000",
              href: "/sales/invoices/invoice-1",
            }),
          ],
        }),
        collections: expect.objectContaining({
          openCount: 2,
          dueTodayCount: 1,
          overdueFollowUpCount: 1,
          promisedToPayTotal: "60.0000",
          disputedCount: 1,
        }),
        quotes: expect.objectContaining({
          awaitingAcceptanceCount: 1,
          expiringSoonCount: 1,
          acceptedNotConvertedCount: 1,
        }),
        recurringInvoices: expect.objectContaining({
          activeCount: 2,
          dueSoonCount: 1,
          overdueForGenerationCount: 1,
          recentlyGeneratedDraftInvoiceCount: 1,
        }),
        deliveryNotes: expect.objectContaining({
          draftCount: 1,
          issuedNotDeliveredCount: 1,
          overdueDeliveryCount: 1,
        }),
      }),
    );
    expect(summary.salesAttention.customers.topOutstanding).toEqual([
      expect.objectContaining({
        id: "customer-1",
        customerName: "Acme",
        outstandingBalance: "75.0000",
        overdueAmount: "75.0000",
        openCollectionCaseCount: 1,
        href: "/customers/customer-1",
      }),
    ]);
    expect(summary.attentionItems.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        "OVERDUE_INVOICES",
        "OVERDUE_BILLS",
        "UNRECONCILED_BANK_TRANSACTIONS",
        "LOW_STOCK",
        "INVENTORY_CLEARING_VARIANCE",
        "ZATCA_NOT_READY",
        "DATABASE_STORAGE_ACTIVE",
      ]),
    );
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    expect(prisma.salesQuote.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    expect(prisma.recurringInvoiceTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    expect(prisma.deliveryNote.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    expect(prisma.collectionCase.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId }) }));
    jest.useRealTimers();
  });

  it("omits detailed Sales/AR attention rows when Sales/AR view permission is unavailable", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    const { service, prisma } = makeService();

    const summary = await service.summary(organizationId, { canViewSalesAttention: false });

    expect(summary.salesAttention).toEqual(expect.objectContaining({ readOnly: true, noMutation: true }));
    expect(summary.salesAttention.overdueInvoices.topItems).toEqual([]);
    expect(summary.salesAttention.collections.openCount).toBe(0);
    expect(summary.salesAttention.quotes.awaitingAcceptanceCount).toBe(0);
    expect(summary.salesAttention.recurringInvoices.dueSoonCount).toBe(0);
    expect(summary.salesAttention.deliveryNotes.draftCount).toBe(0);
    expect(summary.salesAttention.customers.topOutstanding).toEqual([]);
    expect(prisma.salesQuote.findMany).not.toHaveBeenCalled();
    expect(prisma.collectionCase.findMany).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("applies documented Sales/AR attention thresholds, ordering, and top limits", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    const customer = (id: string, name: string) => ({ id, name, displayName: name });
    const salesAttentionInvoices = [
      {
        id: "invoice-old-low",
        invoiceNumber: "INV-OLD-LOW",
        issueDate: new Date("2026-05-01T00:00:00.000Z"),
        dueDate: new Date("2026-05-01T00:00:00.000Z"),
        total: new Prisma.Decimal("10.0000"),
        balanceDue: new Prisma.Decimal("10.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: customer("customer-old-low", "Old Low LLC"),
      },
      {
        id: "invoice-old-high",
        invoiceNumber: "INV-OLD-HIGH",
        issueDate: new Date("2026-05-01T00:00:00.000Z"),
        dueDate: new Date("2026-05-01T00:00:00.000Z"),
        total: new Prisma.Decimal("99.0000"),
        balanceDue: new Prisma.Decimal("99.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: customer("customer-old-high", "Old High LLC"),
      },
      {
        id: "invoice-mid",
        invoiceNumber: "INV-MID",
        issueDate: new Date("2026-05-02T00:00:00.000Z"),
        dueDate: new Date("2026-05-02T00:00:00.000Z"),
        total: new Prisma.Decimal("30.0000"),
        balanceDue: new Prisma.Decimal("30.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: customer("customer-mid", "Mid LLC"),
      },
      {
        id: "invoice-no-due",
        invoiceNumber: "INV-NO-DUE",
        issueDate: new Date("2026-05-03T00:00:00.000Z"),
        dueDate: null,
        total: new Prisma.Decimal("25.0000"),
        balanceDue: new Prisma.Decimal("25.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: customer("customer-no-due", "No Due LLC"),
      },
      {
        id: "invoice-late-one",
        invoiceNumber: "INV-LATE-ONE",
        issueDate: new Date("2026-05-04T00:00:00.000Z"),
        dueDate: new Date("2026-05-04T00:00:00.000Z"),
        total: new Prisma.Decimal("40.0000"),
        balanceDue: new Prisma.Decimal("40.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: customer("customer-late-one", "Late One LLC"),
      },
      {
        id: "invoice-late-two",
        invoiceNumber: "INV-LATE-TWO",
        issueDate: new Date("2026-05-05T00:00:00.000Z"),
        dueDate: new Date("2026-05-05T00:00:00.000Z"),
        total: new Prisma.Decimal("50.0000"),
        balanceDue: new Prisma.Decimal("50.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: customer("customer-late-two", "Late Two LLC"),
      },
      {
        id: "invoice-current",
        invoiceNumber: "INV-CURRENT",
        issueDate: new Date("2026-05-14T00:00:00.000Z"),
        dueDate: new Date("2026-05-20T00:00:00.000Z"),
        total: new Prisma.Decimal("500.0000"),
        balanceDue: new Prisma.Decimal("500.0000"),
        status: SalesInvoiceStatus.FINALIZED,
        customer: customer("customer-current", "Current Balance LLC"),
      },
    ];
    const recurringDraftInvoices = [
      {
        id: "invoice-rec-1",
        invoiceNumber: "INV-DRAFT-REC",
        issueDate: new Date("2026-05-14T00:00:00.000Z"),
        dueDate: new Date("2026-05-28T00:00:00.000Z"),
        total: new Prisma.Decimal("44.0000"),
        balanceDue: new Prisma.Decimal("44.0000"),
        status: SalesInvoiceStatus.DRAFT,
        customer: customer("customer-rec", "Recurring Customer LLC"),
        recurringInvoiceTemplate: { id: "rec-1", templateNumber: "REC-000001", name: "Monthly support" },
      },
    ];
    const salesInvoiceFindMany = jest.fn().mockImplementation((query?: { select?: { invoiceNumber?: boolean }; where?: { recurringInvoiceTemplateId?: unknown } }) => {
      if (query?.where?.recurringInvoiceTemplateId) {
        return Promise.resolve(recurringDraftInvoices);
      }
      if (query?.select?.invoiceNumber) {
        return Promise.resolve(salesAttentionInvoices);
      }
      return Promise.resolve(salesAttentionInvoices);
    });
    const { service, prisma } = makeService({
      salesInvoice: {
        findMany: salesInvoiceFindMany,
        count: jest.fn().mockResolvedValue(7),
      },
      collectionCase: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "case-due-today",
            caseNumber: "COL-DUE-TODAY",
            status: CollectionCaseStatus.PROMISED_TO_PAY,
            priority: "NORMAL",
            followUpDate: new Date("2026-05-15T00:00:00.000Z"),
            nextActionAt: null,
            promisedPaymentDate: new Date("2026-05-20T00:00:00.000Z"),
            promisedAmount: new Prisma.Decimal("60.0000"),
            customer: customer("customer-case-today", "Due Today LLC"),
            salesInvoice: { id: "invoice-case-today", invoiceNumber: "INV-CASE-TODAY", balanceDue: new Prisma.Decimal("60.0000"), dueDate: new Date("2026-05-01T00:00:00.000Z") },
          },
          {
            id: "case-overdue-high",
            caseNumber: "COL-OVERDUE-HIGH",
            status: CollectionCaseStatus.IN_PROGRESS,
            priority: "HIGH",
            followUpDate: new Date("2026-05-11T00:00:00.000Z"),
            nextActionAt: null,
            promisedPaymentDate: null,
            promisedAmount: null,
            customer: customer("customer-case-high", "High Follow Up LLC"),
            salesInvoice: null,
          },
          {
            id: "case-overdue-urgent",
            caseNumber: "COL-OVERDUE-URGENT",
            status: CollectionCaseStatus.DISPUTED,
            priority: "URGENT",
            followUpDate: new Date("2026-05-12T00:00:00.000Z"),
            nextActionAt: null,
            promisedPaymentDate: null,
            promisedAmount: null,
            customer: customer("customer-case-urgent", "Urgent Follow Up LLC"),
            salesInvoice: null,
          },
          {
            id: "case-overdue-normal",
            caseNumber: "COL-OVERDUE-NORMAL",
            status: CollectionCaseStatus.OPEN,
            priority: "NORMAL",
            followUpDate: new Date("2026-05-10T00:00:00.000Z"),
            nextActionAt: null,
            promisedPaymentDate: null,
            promisedAmount: null,
            customer: customer("customer-case-normal", "Normal Follow Up LLC"),
            salesInvoice: null,
          },
          {
            id: "case-future-urgent",
            caseNumber: "COL-FUTURE-URGENT",
            status: CollectionCaseStatus.ON_HOLD,
            priority: "URGENT",
            followUpDate: new Date("2026-05-16T00:00:00.000Z"),
            nextActionAt: null,
            promisedPaymentDate: null,
            promisedAmount: null,
            customer: customer("customer-case-future", "Future Follow Up LLC"),
            salesInvoice: null,
          },
          {
            id: "case-no-follow-up",
            caseNumber: "COL-NO-FOLLOW-UP",
            status: CollectionCaseStatus.OPEN,
            priority: "URGENT",
            followUpDate: null,
            nextActionAt: null,
            promisedPaymentDate: null,
            promisedAmount: null,
            customer: customer("customer-case-none", "No Follow Up LLC"),
            salesInvoice: null,
          },
        ]),
      },
      salesQuote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "quote-expired",
            quoteNumber: "SQ-EXPIRED",
            status: SalesQuoteStatus.SENT,
            issueDate: new Date("2026-05-01T00:00:00.000Z"),
            expiryDate: new Date("2026-05-10T00:00:00.000Z"),
            total: new Prisma.Decimal("80.0000"),
            customer: customer("customer-quote-expired", "Expired Quote LLC"),
            convertedSalesInvoiceId: null,
          },
          {
            id: "quote-soon",
            quoteNumber: "SQ-SOON",
            status: SalesQuoteStatus.SENT,
            issueDate: new Date("2026-05-05T00:00:00.000Z"),
            expiryDate: new Date("2026-05-20T00:00:00.000Z"),
            total: new Prisma.Decimal("120.0000"),
            customer: customer("customer-quote-soon", "Expiring Quote LLC"),
            convertedSalesInvoiceId: null,
          },
          {
            id: "quote-far",
            quoteNumber: "SQ-FAR",
            status: SalesQuoteStatus.SENT,
            issueDate: new Date("2026-05-06T00:00:00.000Z"),
            expiryDate: new Date("2026-05-30T00:00:00.000Z"),
            total: new Prisma.Decimal("125.0000"),
            customer: customer("customer-quote-far", "Future Quote LLC"),
            convertedSalesInvoiceId: null,
          },
          {
            id: "quote-no-expiry",
            quoteNumber: "SQ-NO-EXPIRY",
            status: SalesQuoteStatus.SENT,
            issueDate: new Date("2026-05-07T00:00:00.000Z"),
            expiryDate: null,
            total: new Prisma.Decimal("130.0000"),
            customer: customer("customer-quote-open", "Open Quote LLC"),
            convertedSalesInvoiceId: null,
          },
          {
            id: "quote-accepted",
            quoteNumber: "SQ-ACCEPTED",
            status: SalesQuoteStatus.ACCEPTED,
            issueDate: new Date("2026-05-08T00:00:00.000Z"),
            expiryDate: new Date("2026-05-25T00:00:00.000Z"),
            total: new Prisma.Decimal("220.0000"),
            customer: customer("customer-quote-accepted", "Accepted Quote LLC"),
            convertedSalesInvoiceId: null,
          },
          {
            id: "quote-converted",
            quoteNumber: "SQ-CONVERTED",
            status: SalesQuoteStatus.ACCEPTED,
            issueDate: new Date("2026-05-09T00:00:00.000Z"),
            expiryDate: new Date("2026-05-25T00:00:00.000Z"),
            total: new Prisma.Decimal("320.0000"),
            customer: customer("customer-quote-converted", "Converted Quote LLC"),
            convertedSalesInvoiceId: "invoice-converted",
          },
        ]),
      },
      recurringInvoiceTemplate: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([
          {
            id: "rec-overdue",
            templateNumber: "REC-OVERDUE",
            name: "Overdue monthly template",
            status: RecurringInvoiceTemplateStatus.ACTIVE,
            nextRunDate: new Date("2026-05-14T00:00:00.000Z"),
            total: new Prisma.Decimal("44.0000"),
            customer: customer("customer-rec-overdue", "Overdue Recurring LLC"),
          },
          {
            id: "rec-due",
            templateNumber: "REC-DUE",
            name: "Due soon template",
            status: RecurringInvoiceTemplateStatus.ACTIVE,
            nextRunDate: new Date("2026-05-21T00:00:00.000Z"),
            total: new Prisma.Decimal("55.0000"),
            customer: customer("customer-rec-due", "Due Recurring LLC"),
          },
        ]),
      },
      deliveryNote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "dn-overdue-draft",
            deliveryNoteNumber: "DN-OVERDUE-DRAFT",
            status: DeliveryNoteStatus.DRAFT,
            issueDate: new Date("2026-05-10T00:00:00.000Z"),
            deliveryDate: new Date("2026-05-12T00:00:00.000Z"),
            customer: customer("customer-dn-overdue-draft", "Overdue Draft Delivery LLC"),
          },
          {
            id: "dn-overdue-issued",
            deliveryNoteNumber: "DN-OVERDUE-ISSUED",
            status: DeliveryNoteStatus.ISSUED,
            issueDate: new Date("2026-05-11T00:00:00.000Z"),
            deliveryDate: new Date("2026-05-13T00:00:00.000Z"),
            customer: customer("customer-dn-overdue-issued", "Overdue Issued Delivery LLC"),
          },
          {
            id: "dn-issued",
            deliveryNoteNumber: "DN-ISSUED",
            status: DeliveryNoteStatus.ISSUED,
            issueDate: new Date("2026-05-12T00:00:00.000Z"),
            deliveryDate: new Date("2026-05-20T00:00:00.000Z"),
            customer: customer("customer-dn-issued", "Issued Delivery LLC"),
          },
          {
            id: "dn-draft",
            deliveryNoteNumber: "DN-DRAFT",
            status: DeliveryNoteStatus.DRAFT,
            issueDate: new Date("2026-05-13T00:00:00.000Z"),
            deliveryDate: new Date("2026-05-22T00:00:00.000Z"),
            customer: customer("customer-dn-draft", "Draft Delivery LLC"),
          },
        ]),
      },
    });

    const summary = await service.summary(organizationId);

    expect(summary.salesAttention.overdueInvoices.count).toBe(6);
    expect(summary.salesAttention.overdueInvoices.topItems.map((item) => item.number)).toEqual([
      "INV-OLD-HIGH",
      "INV-OLD-LOW",
      "INV-MID",
      "INV-NO-DUE",
      "INV-LATE-ONE",
    ]);
    expect(summary.salesAttention.overdueInvoices.topItems).toHaveLength(5);
    expect(summary.salesAttention.collections).toEqual(
      expect.objectContaining({
        openCount: 6,
        dueTodayCount: 1,
        overdueFollowUpCount: 3,
        promisedToPayTotal: "60.0000",
        disputedCount: 1,
      }),
    );
    expect(summary.salesAttention.collections.topItems.map((item) => item.number)).toEqual([
      "COL-OVERDUE-URGENT",
      "COL-OVERDUE-HIGH",
      "COL-OVERDUE-NORMAL",
      "COL-DUE-TODAY",
      "COL-FUTURE-URGENT",
    ]);
    expect(summary.salesAttention.quotes).toEqual(
      expect.objectContaining({
        awaitingAcceptanceCount: 3,
        expiringSoonCount: 1,
        acceptedNotConvertedCount: 1,
      }),
    );
    expect(summary.salesAttention.quotes.topItems.map((item) => item.number)).toEqual([
      "SQ-SOON",
      "SQ-ACCEPTED",
      "SQ-FAR",
      "SQ-NO-EXPIRY",
    ]);
    expect(summary.salesAttention.recurringInvoices).toEqual(
      expect.objectContaining({
        activeCount: 4,
        dueSoonCount: 1,
        overdueForGenerationCount: 1,
        recentlyGeneratedDraftInvoiceCount: 1,
      }),
    );
    expect(summary.salesAttention.recurringInvoices.topItems.map((item) => item.number)).toEqual(["REC-OVERDUE", "REC-DUE"]);
    expect(summary.salesAttention.deliveryNotes).toEqual(
      expect.objectContaining({
        draftCount: 2,
        issuedNotDeliveredCount: 2,
        overdueDeliveryCount: 2,
      }),
    );
    expect(summary.salesAttention.deliveryNotes.topItems.map((item) => item.number)).toEqual([
      "DN-OVERDUE-DRAFT",
      "DN-OVERDUE-ISSUED",
      "DN-ISSUED",
      "DN-DRAFT",
    ]);
    expect(summary.salesAttention.customers.topOutstanding).toHaveLength(5);
    expect(summary.salesAttention.customers.topOutstanding[0]).toEqual(
      expect.objectContaining({
        id: "customer-current",
        outstandingBalance: "500.0000",
      }),
    );
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { gt: 0 },
        }),
      }),
    );
    expect(prisma.recurringInvoiceTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          status: RecurringInvoiceTemplateStatus.ACTIVE,
          nextRunDate: { lte: new Date("2026-05-22T23:59:59.999Z") },
        }),
      }),
    );
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          status: SalesInvoiceStatus.DRAFT,
          recurringInvoiceTemplateId: { not: null },
        }),
        take: 5,
      }),
    );
    jest.useRealTimers();
  });

  it("uses summary-only journal aggregation for dashboard reports and trends", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    const { service, prisma, reportsService } = makeService();

    const summary = await service.summary(organizationId);

    expect(summary.reports).toEqual({
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "42.0000",
      balanceSheetBalanced: true,
    });
    expect(summary.trends.monthlyNetProfit.at(-1)).toEqual({ month: "2026-05", amount: "42.0000" });
    expect(reportsService.trialBalance).not.toHaveBeenCalled();
    expect(reportsService.profitAndLoss).not.toHaveBeenCalled();
    expect(reportsService.balanceSheet).not.toHaveBeenCalled();
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId,
          journalEntry: expect.objectContaining({ status: { in: ["POSTED", "REVERSED"] } }),
        }),
        select: expect.objectContaining({
          account: { select: { type: true } },
          journalEntry: { select: { entryDate: true } },
        }),
      }),
    );
    jest.useRealTimers();
  });

  it("handles empty data without crashing", async () => {
    const { service } = makeService({
      salesInvoice: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      salesQuote: { findMany: jest.fn().mockResolvedValue([]) },
      recurringInvoiceTemplate: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      deliveryNote: { findMany: jest.fn().mockResolvedValue([]) },
      collectionCase: { findMany: jest.fn().mockResolvedValue([]) },
      customerPayment: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      journalEntry: { count: jest.fn().mockResolvedValue(0) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([]) },
      supplierPayment: { findMany: jest.fn().mockResolvedValue([]) },
      bankAccountProfile: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      bankStatementTransaction: { count: jest.fn().mockResolvedValue(0) },
      bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null) },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
      fiscalPeriod: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { count: jest.fn().mockResolvedValue(0) },
    });

    const summary = await service.summary(organizationId);

    expect(summary.sales.unpaidInvoiceCount).toBe(0);
    expect(summary.purchases.unpaidBillCount).toBe(0);
    expect(summary.banking.bankAccountCount).toBe(0);
    expect(summary.inventory.trackedItemCount).toBe(0);
    expect(summary.trends.monthlySales).toHaveLength(6);
    expect(summary.trends.cashBalanceTrend.every((point) => point.balance === "0.0000")).toBe(true);
    expect(summary.aging.receivablesBuckets).toHaveLength(5);
    expect(summary.attentionItems.map((item) => item.type)).toContain("FISCAL_PERIOD_MISSING");
  });

  it("returns partial data with sanitized warning metadata when compliance queries hit a Prisma pool timeout", async () => {
    const poolError = Object.assign(new Error("Invalid `prisma.zatcaInvoiceMetadata.count()` invocation with stack details"), {
      code: "P2024",
      meta: { connection_limit: 1, timeout: 10 },
    });
    const { service } = makeService({
      zatcaInvoiceMetadata: { count: jest.fn().mockRejectedValue(poolError) },
    });

    const summary = await service.summary(organizationId);

    expect(summary.sales.unpaidInvoiceCount).toBe(1);
    expect(summary.compliance).toEqual({
      zatcaProductionReady: false,
      zatcaBlockingReasonCount: 1,
      fiscalPeriodsLockedCount: 0,
      auditLogCountThisMonth: 0,
    });
    expect(summary.sectionStatus.compliance).toEqual({
      status: "UNAVAILABLE",
      code: "P2024",
      message: "Dashboard section is temporarily unavailable.",
    });
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        {
          section: "compliance",
          code: "P2024",
          message: "Dashboard section is temporarily unavailable.",
        },
      ]),
    );
    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain("Invalid `prisma");
    expect(serialized).not.toContain("stack details");
  });

  it("keeps storage readiness failures from killing the whole dashboard", async () => {
    const { service } = makeService();
    (service as unknown as { storageService: { readiness: jest.Mock } }).storageService.readiness.mockImplementation(() => {
      throw new Error("storage credential failure with secret-like details");
    });

    const summary = await service.summary(organizationId);

    expect(summary.sales.unpaidInvoiceCount).toBe(1);
    expect(summary.sectionStatus.storage).toEqual({
      status: "UNAVAILABLE",
      code: "Error",
      message: "Dashboard section is temporarily unavailable.",
    });
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        {
          section: "storage",
          code: "Error",
          message: "Dashboard section is temporarily unavailable.",
        },
      ]),
    );
    expect(JSON.stringify(summary)).not.toContain("secret-like");
  });

  it("does not run Prisma dashboard queries concurrently", async () => {
    const { service, prisma } = makeService();
    const tracker = { active: 0, max: 0 };
    for (const model of Object.values(prisma)) {
      for (const [methodName, method] of Object.entries(model)) {
        if (jest.isMockFunction(method)) {
          const currentImplementation = method.getMockImplementation();
          method.mockImplementation(async (...args: unknown[]) => {
            tracker.active += 1;
            tracker.max = Math.max(tracker.max, tracker.active);
            await new Promise((resolve) => setTimeout(resolve, 1));
            try {
              return currentImplementation?.(...args);
            } finally {
              tracker.active -= 1;
            }
          });
        }
      }
    }

    await service.summary(organizationId);

    expect(tracker.max).toBeLessThanOrEqual(1);
  });

  it("returns a tenant-scoped read-only onboarding checklist with safe readiness metadata", async () => {
    const { service, prisma } = makeService({
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: organizationId,
          name: "LedgerByte Demo",
          legalName: "LedgerByte Demo LLC",
          taxNumber: "300000000000003",
          countryCode: "SA",
          baseCurrency: "SAR",
          timezone: "Asia/Riyadh",
        }),
      },
      zatcaOrganizationProfile: {
        findUnique: jest.fn().mockResolvedValue({
          sellerName: "LedgerByte Demo LLC",
          vatNumber: "300000000000003",
          city: "Riyadh",
          countryCode: "SA",
        }),
      },
      zatcaEgsUnit: {
        findFirst: jest.fn().mockResolvedValue({
          id: "egs-1",
          csrPem: "redacted-csr-present",
          complianceCsidPem: "redacted-mock-csid-present",
          productionCsidPem: null,
        }),
      },
      zatcaInvoiceMetadata: { count: jest.fn().mockResolvedValue(1) },
    });

    const checklist = await service.onboardingChecklist(organizationId);

    expect(checklist).toEqual(
      expect.objectContaining({
        readOnly: true,
        noMutation: true,
        tenantScoped: true,
        organizationId,
        readinessScore: 91,
        completedCount: 10,
        totalCount: 11,
        productionCompliance: false,
        zatcaProductionCompliance: false,
        realZatcaNetworkEnabled: false,
        signedXmlBodyPersistenceAllowed: false,
        qrPayloadBodyPersistenceAllowed: false,
      }),
    );
    expect(checklist.items.map((item) => item.id)).toEqual([
      "organization_profile",
      "chart_of_accounts",
      "tax_profile",
      "customer_created",
      "first_invoice",
      "bank_payment_method",
      "first_payment",
      "first_report",
      "zatca_local_readiness_visible",
      "contact_vat_id_validation",
      "storage_readiness_checked",
    ]);
    expect(prisma.account.count).toHaveBeenCalledWith({ where: { organizationId, isActive: true, allowPosting: true } });
    expect(prisma.contact.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId }) }),
    );
    expect(prisma.customerPayment.count).toHaveBeenCalledWith({
      where: { organizationId, status: "POSTED" },
    });
    expect(prisma.journalEntry.count).toHaveBeenCalledWith({
      where: { organizationId, status: "POSTED" },
    });
    const serialized = JSON.stringify(checklist);
    expect(serialized).not.toContain("PRIVATE KEY");
    expect(serialized).not.toContain("binarySecurityToken");
    expect(serialized).not.toContain("secret");
  });

  it("reports onboarding blockers without exposing storage errors", async () => {
    const { service, storageService } = makeService({
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: organizationId,
          name: "Demo",
          legalName: null,
          taxNumber: null,
          countryCode: "SA",
          baseCurrency: "SAR",
          timezone: "Asia/Riyadh",
        }),
      },
      account: { count: jest.fn().mockResolvedValue(0) },
      taxRate: { count: jest.fn().mockResolvedValue(0) },
      contact: { count: jest.fn().mockResolvedValue(0) },
      salesInvoice: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      salesQuote: { findMany: jest.fn().mockResolvedValue([]) },
      recurringInvoiceTemplate: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      deliveryNote: { findMany: jest.fn().mockResolvedValue([]) },
      collectionCase: { findMany: jest.fn().mockResolvedValue([]) },
      customerPayment: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      journalEntry: { count: jest.fn().mockResolvedValue(0) },
      bankAccountProfile: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      zatcaInvoiceMetadata: { count: jest.fn().mockResolvedValue(0) },
    });
    storageService.readiness.mockImplementation(() => {
      throw new Error("storage access key AKIA_SECRET should not leak");
    });

    const checklist = await service.onboardingChecklist(organizationId);

    expect(checklist.status).toBe("BLOCKED");
    expect(checklist.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Organization profile complete"),
        expect.stringContaining("Chart of accounts available"),
        expect.stringContaining("At least one customer"),
      ]),
    );
    expect(checklist.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Storage readiness could not be loaded")]));
    expect(JSON.stringify(checklist)).not.toContain("AKIA_SECRET");
  });
});

type MockPrisma = {
  organization: { findFirst: jest.Mock };
  account: { count: jest.Mock };
  taxRate: { count: jest.Mock };
  contact: { count: jest.Mock };
  salesInvoice: { findMany: jest.Mock; count: jest.Mock };
  salesQuote: { findMany: jest.Mock };
  recurringInvoiceTemplate: { count: jest.Mock; findMany: jest.Mock };
  deliveryNote: { findMany: jest.Mock };
  collectionCase: { findMany: jest.Mock };
  customerPayment: { findMany: jest.Mock; count: jest.Mock };
  journalEntry: { count: jest.Mock };
  purchaseBill: { findMany: jest.Mock };
  supplierPayment: { findMany: jest.Mock };
  bankAccountProfile: { findMany: jest.Mock; count: jest.Mock };
  bankStatementTransaction: { count: jest.Mock };
  bankReconciliation: { findFirst: jest.Mock };
  journalLine: { findMany: jest.Mock };
  item: { findMany: jest.Mock };
  stockMovement: { findMany: jest.Mock };
  fiscalPeriod: { count: jest.Mock; findFirst: jest.Mock };
  auditLog: { count: jest.Mock };
  zatcaOrganizationProfile: { findUnique: jest.Mock };
  zatcaEgsUnit: { findFirst: jest.Mock };
  zatcaInvoiceMetadata: { count: jest.Mock };
};
