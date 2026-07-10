import { BadRequestException } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  DocumentType,
  JournalEntryStatus,
  PurchaseBillStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import {
  agingBucket,
  buildAgingReport,
  buildBalanceSheetReport,
  buildCashFlowReport,
  buildGeneralLedgerReport,
  buildProfitAndLossReport,
  buildRevenueTrendReport,
  buildTopCustomersReport,
  buildTopProductsServicesReport,
  buildTrialBalanceReport,
  buildVatReturnReport,
  buildVatSummaryReport,
  ReportsService,
} from "./reports.service";
import { REPORT_PACK_EXECUTION_BOUNDARY, REPORT_PACK_SUPPORTED_REPORTS } from "./report-pack-manifest";

const accounts = [
  { id: "cash", code: "111", name: "Cash", type: AccountType.ASSET },
  { id: "ar", code: "120", name: "Accounts Receivable", type: AccountType.ASSET },
  { id: "inventory-asset", code: "130", name: "Inventory", type: AccountType.ASSET },
  { id: "ap", code: "210", name: "Accounts Payable", type: AccountType.LIABILITY },
  { id: "vat-payable", code: "220", name: "VAT Payable", type: AccountType.LIABILITY },
  { id: "vat-receivable", code: "230", name: "VAT Receivable", type: AccountType.ASSET },
  { id: "inventory-clearing", code: "240", name: "Inventory Clearing", type: AccountType.LIABILITY },
  { id: "equity", code: "310", name: "Owner Equity", type: AccountType.EQUITY },
  { id: "revenue", code: "411", name: "Sales Revenue", type: AccountType.REVENUE },
  { id: "cogs", code: "510", name: "Cost of Sales", type: AccountType.COST_OF_SALES },
  { id: "expense", code: "511", name: "General Expenses", type: AccountType.EXPENSE },
];

describe("report pack manifest preview", () => {
  it("returns a default planning-only manifest for all supported reports without reading data", () => {
    const prisma = {
      bankAccountProfile: { findMany: jest.fn() },
      journalLine: { findMany: jest.fn() },
      salesInvoice: { findMany: jest.fn() },
      salesInvoiceLine: { findMany: jest.fn() },
    };
    const service = new ReportsService(prisma as never);

    const manifest = service.reportPackManifestPreview("org-1", "user-1", {});

    expect(manifest).toMatchObject({
      id: "report-pack-manifest-preview",
      organizationId: "org-1",
      title: "Report pack manifest preview",
      requestedByUserId: "user-1",
      status: "PLANNING_ONLY",
      executionBoundary: REPORT_PACK_EXECUTION_BOUNDARY,
    });
    expect(manifest.items.map((item) => item.reportKind)).toEqual(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.kind));
    expect(manifest.items).toEqual(
      REPORT_PACK_SUPPORTED_REPORTS.map((report) =>
        expect.objectContaining({
          id: `preview-${report.kind}`,
          reportKind: report.kind,
          title: report.title,
          query: {},
          source: { type: "ledgerbyte-report-route", href: report.href },
          reviewStatus: "NEEDS_REVIEW",
        }),
      ),
    );
    expect(prisma.bankAccountProfile.findMany).not.toHaveBeenCalled();
    expect(prisma.journalLine.findMany).not.toHaveBeenCalled();
    expect(prisma.salesInvoice.findMany).not.toHaveBeenCalled();
    expect(prisma.salesInvoiceLine.findMany).not.toHaveBeenCalled();
  });

  it("returns requested supported report kinds, including cash flow and revenue trend", () => {
    const service = new ReportsService({} as never);

    const manifest = service.reportPackManifestPreview("org-1", "user-1", {
      reportKinds: "cash-flow,revenue-trend,profit-and-loss",
    });

    expect(manifest.items.map((item) => item.reportKind)).toEqual(["cash-flow", "revenue-trend", "profit-and-loss"]);
    expect(manifest.items.map((item) => item.source.href)).toEqual([
      "/reports/cash-flow",
      "/reports/revenue-trend",
      "/reports/profit-and-loss",
    ]);
  });

  it("dedupes repeated report kinds deterministically and treats blank requests as default", () => {
    const service = new ReportsService({} as never);

    const deduped = service.reportPackManifestPreview("org-1", "user-1", {
      reportKinds: ["cash-flow", " revenue-trend , cash-flow ", "revenue-trend"],
    });
    const blank = service.reportPackManifestPreview("org-1", "user-1", { reportKinds: " , " });

    expect(deduped.items.map((item) => item.reportKind)).toEqual(["cash-flow", "revenue-trend"]);
    expect(blank.items.map((item) => item.reportKind)).toEqual(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.kind));
  });

  it("rejects unsupported report kinds before building a manifest", () => {
    const service = new ReportsService({} as never);

    expect(() =>
      service.reportPackManifestPreview("org-1", "user-1", {
        reportKinds: "cash-flow,vat-return",
      }),
    ).toThrow(BadRequestException);
  });

  it("keeps every execution, storage, provider, and compliance boundary disabled", () => {
    const service = new ReportsService({} as never);

    const manifest = service.reportPackManifestPreview("org-1", "user-1", { reportKinds: "cash-flow" });

    expect(manifest.executionBoundary).toEqual({
      generationEnabled: false,
      downloadEnabled: false,
      emailSendingEnabled: false,
      scheduledRunEnabled: false,
      archiveWriteEnabled: false,
      generatedDocumentMutationEnabled: false,
      storageMutationEnabled: false,
      providerCallEnabled: false,
      complianceSubmissionEnabled: false,
    });
  });
});

describe("report pack generation groundwork", () => {
  it("creates a tenant-scoped READY_LOCAL report pack manifest with requestId and audit events", async () => {
    const prisma = reportPackPrisma();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ReportsService(prisma as never, undefined, undefined, audit as never);

    const manifest = await service.createReportPack(
      "org-1",
      "user-1",
      {
        title: "  June accountant pack  ",
        reportKinds: "cash-flow,profit-and-loss",
        from: "2026-06-01",
        to: "2026-06-30",
        branchId: " branch-1 ",
      },
      { requestId: "req-pack-1" },
    );

    expect(manifest).toMatchObject({
      organizationId: "org-1",
      title: "June accountant pack",
      status: "READY_LOCAL",
      requestId: "req-pack-1",
      generatedAt: expect.any(String),
      period: { from: "2026-06-01", to: "2026-06-30", asOf: null },
      downloadReadiness: {
        packDownloadEnabled: false,
        storageProvider: "disabled",
        signedUrlEnabled: false,
      },
    });
    expect(manifest.items.map((item) => item.reportKind)).toEqual(["cash-flow", "profit-and-loss"]);
    expect(manifest.items[0]!.exports.csv.href).toBe("/reports/cash-flow?from=2026-06-01&to=2026-06-30&branchId=branch-1&format=csv");
    expect(manifest.items[0]!.exports.pdf).toMatchObject({ supported: false, href: null });
    expect(manifest.items[1]!.exports.pdf).toMatchObject({ supported: true, href: "/reports/profit-and-loss/pdf" });
    expect(prisma.reportPack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          title: "June accountant pack",
          status: "READY_LOCAL",
          requestId: "req-pack-1",
          requestedById: "user-1",
          manifestJson: expect.objectContaining({
            items: expect.any(Array),
          }),
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENTS.REPORT_PACK_GENERATION_REQUESTED,
        entityType: AUDIT_ENTITY_TYPES.REPORT_PACK,
        request: { requestId: "req-pack-1" },
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_EVENTS.REPORT_PACK_GENERATED,
        after: expect.objectContaining({
          itemCount: 2,
          packDownloadEnabled: false,
          providerCallEnabled: false,
        }),
      }),
    );
  });

  it("lists and reads report packs through organization-scoped queries", async () => {
    const prisma = reportPackPrisma();
    const service = new ReportsService(prisma as never);
    await service.createReportPack("org-1", "user-1", { reportKinds: "trial-balance" }, { requestId: "req-pack-2" });

    const list = await service.listReportPacks("org-1", { status: "READY_LOCAL", limit: "10" });
    const detail = await service.getReportPack("org-1", list.data[0]!.id);

    expect(list.data).toHaveLength(1);
    expect(detail.status).toBe("READY_LOCAL");
    expect(prisma.reportPack.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", status: "READY_LOCAL" } }));
    expect(prisma.reportPack.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: list.data[0]!.id, organizationId: "org-1" } }));
  });

  it("blocks pack-level download readiness while preserving manifest metadata", async () => {
    const prisma = reportPackPrisma();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new ReportsService(prisma as never, undefined, undefined, audit as never);
    const manifest = await service.createReportPack("org-1", "user-1", { reportKinds: "cash-flow" }, { requestId: "req-pack-3" });

    const readiness = await service.reportPackDownloadReadiness("org-1", "user-2", manifest.id, { requestId: "req-download-1" });

    expect(readiness).toMatchObject({
      id: manifest.id,
      status: "DOWNLOAD_BLOCKED",
      downloadEnabled: false,
      storageProvider: "disabled",
      signedUrlEnabled: false,
      reason: expect.stringContaining("blocked"),
      manifest: {
        status: "DOWNLOAD_BLOCKED",
        items: [{ reportKind: "cash-flow" }],
      },
    });
    expect(prisma.reportPack.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: manifest.id }, data: { status: "DOWNLOAD_BLOCKED" } }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AUDIT_EVENTS.REPORT_PACK_DOWNLOAD_ATTEMPTED }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AUDIT_EVENTS.REPORT_PACK_DOWNLOAD_BLOCKED }));
  });

  it("rejects unsupported filters and missing tenant-scoped records", async () => {
    const prisma = reportPackPrisma();
    const service = new ReportsService(prisma as never);

    await expect(service.listReportPacks("org-1", { status: "SENT" })).rejects.toThrow(BadRequestException);
    await expect(service.listReportPacks("org-1", { limit: "500" })).rejects.toThrow(BadRequestException);
    await expect(service.getReportPack("org-2", "missing-pack")).rejects.toThrow("Report pack not found.");
  });
});

describe("reports service builders", () => {
  it("calculates general ledger opening balances and natural running balances", () => {
    const report = buildGeneralLedgerReport(
      accounts,
      [line("cash", "2026-01-01", "100.0000", "0.0000", "Opening cash")],
      [
        line("cash", "2026-01-10", "0.0000", "25.0000", "Cash spent"),
        line("cash", "2026-01-11", "10.0000", "0.0000", "Cash received"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    const cash = report.accounts.find((account) => account.accountId === "cash");
    expect(cash).toMatchObject({
      openingDebit: "100.0000",
      periodDebit: "10.0000",
      periodCredit: "25.0000",
      closingDebit: "85.0000",
    });
    expect(cash?.lines.map((entry) => entry.runningBalance)).toEqual(["75.0000", "85.0000"]);
  });

  it("keeps trial balance closing debits and credits equal", () => {
    const report = buildTrialBalanceReport(
      accounts,
      [],
      [
        line("cash", "2026-01-10", "115.0000", "0.0000"),
        line("revenue", "2026-01-10", "0.0000", "100.0000"),
        line("vat-payable", "2026-01-10", "0.0000", "15.0000"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report.totals.closingDebit).toBe("115.0000");
    expect(report.totals.closingCredit).toBe("115.0000");
    expect(report.totals.balanced).toBe(true);
  });

  it("reflects finalized inventory-clearing purchase bills through posted journal lines", () => {
    const report = buildTrialBalanceReport(
      accounts,
      [],
      [
        line("inventory-clearing", "2026-05-14", "100.0000", "0.0000", "Purchase bill inventory clearing debit"),
        line("vat-receivable", "2026-05-14", "15.0000", "0.0000", "Purchase bill VAT receivable"),
        line("ap", "2026-05-14", "0.0000", "115.0000", "Purchase bill AP"),
      ],
      { from: "2026-05-01", to: "2026-05-31" },
    );

    const clearing = report.accounts.find((account) => account.accountId === "inventory-clearing");
    expect(clearing).toMatchObject({ periodDebit: "100.0000", closingDebit: "100.0000" });
    expect(report.totals.closingDebit).toBe("115.0000");
    expect(report.totals.closingCredit).toBe("115.0000");
    expect(report.totals.balanced).toBe(true);
  });

  it("handles P&L signs for revenue, COGS, and expenses", () => {
    const report = buildProfitAndLossReport(
      accounts,
      [
        line("revenue", "2026-01-10", "0.0000", "200.0000"),
        line("cogs", "2026-01-10", "40.0000", "0.0000"),
        line("expense", "2026-01-10", "25.0000", "0.0000"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report).toMatchObject({
      revenue: "200.0000",
      costOfSales: "40.0000",
      grossProfit: "160.0000",
      expenses: "25.0000",
      netProfit: "135.0000",
    });
  });

  it("builds cash flow from cash and bank journal lines", () => {
    const report = buildCashFlowReport(
      [
        dashboardLine("cash", "111", AccountType.ASSET, "2025-12-31", JournalEntryStatus.POSTED, "200.0000", "0.0000"),
        dashboardLine("bank", "112", AccountType.ASSET, "2025-12-31", JournalEntryStatus.POSTED, "0.0000", "50.0000"),
      ],
      [
        dashboardLine("cash", "111", AccountType.ASSET, "2026-01-05", JournalEntryStatus.POSTED, "150.0000", "0.0000"),
        dashboardLine("bank", "112", AccountType.ASSET, "2026-01-06", JournalEntryStatus.POSTED, "0.0000", "40.0000"),
        dashboardLine("bank", "112", AccountType.ASSET, "2026-02-07", JournalEntryStatus.REVERSED, "30.0000", "0.0000"),
      ],
      { from: "2026-01-01", to: "2026-02-28", accountCount: 2 },
    );

    expect(report).toMatchObject({
      from: "2026-01-01",
      to: "2026-02-28",
      basis: "POSTED_AND_REVERSED_CASH_AND_BANK_JOURNAL_LINES",
      totals: {
        openingCash: "150.0000",
        inflows: "180.0000",
        outflows: "40.0000",
        netCashFlow: "140.0000",
        closingCash: "290.0000",
        accountCount: 2,
        lineCount: 3,
      },
      rows: [
        { period: "2026-01", inflows: "150.0000", outflows: "40.0000", netCashFlow: "110.0000", lineCount: 2 },
        { period: "2026-02", inflows: "30.0000", outflows: "0.0000", netCashFlow: "30.0000", lineCount: 1 },
      ],
    });
    expect(report.notes.join(" ")).toContain("journal lines");
    expect(report.notes.join(" ")).toContain("does not initiate payments");
  });

  it("builds monthly revenue trend from revenue journal lines", () => {
    const report = buildRevenueTrendReport(
      [
        dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-10", JournalEntryStatus.POSTED, "0.0000", "120.0000"),
        dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-25", JournalEntryStatus.REVERSED, "25.0000", "0.0000"),
        dashboardLine("revenue", "411", AccountType.REVENUE, "2026-02-04", JournalEntryStatus.POSTED, "0.0000", "40.0000"),
      ],
      { from: "2026-01-01", to: "2026-02-28" },
    );

    expect(report).toMatchObject({
      from: "2026-01-01",
      to: "2026-02-28",
      basis: "POSTED_AND_REVERSED_REVENUE_JOURNAL_LINES",
      totals: { revenue: "135.0000", lineCount: 3 },
      rows: [
        { period: "2026-01", revenue: "95.0000", lineCount: 2 },
        { period: "2026-02", revenue: "40.0000", lineCount: 1 },
      ],
    });
    expect(report.notes.join(" ")).toContain("journal lines");
    expect(report.notes.join(" ")).toContain("does not create filings");
  });

  it("reflects manually posted sales stock issue COGS through journal lines only after posting", () => {
    const beforePosting = buildProfitAndLossReport(
      accounts,
      [line("revenue", "2026-05-14", "0.0000", "100.0000", "Sales invoice revenue")],
      { from: "2026-05-01", to: "2026-05-31" },
    );
    const afterPosting = buildProfitAndLossReport(
      accounts,
      [
        line("revenue", "2026-05-14", "0.0000", "100.0000", "Sales invoice revenue"),
        line("cogs", "2026-05-14", "32.5000", "0.0000", "COGS for sales stock issue SSI-000001"),
      ],
      { from: "2026-05-01", to: "2026-05-31" },
    );

    expect(beforePosting.costOfSales).toBe("0.0000");
    expect(afterPosting.costOfSales).toBe("32.5000");
    expect(afterPosting.netProfit).toBe("67.5000");
  });

  it("reflects manually posted purchase receipt inventory asset journals through balance sheet accounts", () => {
    const report = buildBalanceSheetReport(
      accounts,
      [
        line("inventory-asset", "2026-05-14", "100.0000", "0.0000", "Inventory asset posting for purchase receipt PRC-000001"),
        line("inventory-clearing", "2026-05-14", "0.0000", "100.0000", "Inventory clearing for purchase receipt PRC-000001"),
      ],
      { asOf: "2026-05-31" },
    );

    expect(report.assets.accounts.find((account) => account.accountId === "inventory-asset")).toMatchObject({ amount: "100.0000" });
    expect(report.liabilities.accounts.find((account) => account.accountId === "inventory-clearing")).toMatchObject({ amount: "100.0000" });
    expect(report.balanced).toBe(true);
  });

  it("includes retained earnings in a balanced balance sheet", () => {
    const report = buildBalanceSheetReport(
      accounts,
      [
        line("cash", "2026-01-01", "100.0000", "0.0000"),
        line("equity", "2026-01-01", "0.0000", "100.0000"),
        line("cash", "2026-01-10", "115.0000", "0.0000"),
        line("revenue", "2026-01-10", "0.0000", "100.0000"),
        line("vat-payable", "2026-01-10", "0.0000", "15.0000"),
      ],
      { asOf: "2026-01-31" },
    );

    expect(report.retainedEarnings).toBe("100.0000");
    expect(report.totalAssets).toBe("215.0000");
    expect(report.totalLiabilitiesAndEquity).toBe("215.0000");
    expect(report.balanced).toBe(true);
  });

  it("summarizes VAT from VAT accounts", () => {
    const report = buildVatSummaryReport(
      accounts,
      [
        line("vat-payable", "2026-01-10", "0.0000", "15.0000"),
        line("vat-receivable", "2026-01-11", "5.0000", "0.0000"),
      ],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report.salesVat).toBe("15.0000");
    expect(report.purchaseVat).toBe("5.0000");
    expect(report.netVatPayable).toBe("10.0000");
    expect(report.notes[0]).toContain("not an official VAT return");
  });

  it("builds VAT return totals from finalized invoice and bill source documents", () => {
    const report = buildVatReturnReport(
      [
        vatDocument("invoice-1", "INV-1", "2026-01-10", "100.0000", "15.0000", "115.0000"),
        vatDocument("invoice-2", "INV-2", "2026-01-11", "50.0000", "7.5000", "57.5000"),
      ],
      [vatDocument("bill-1", "BILL-1", "2026-01-12", "40.0000", "6.0000", "46.0000")],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report).toMatchObject({
      outputVat: "22.5000",
      inputVat: "6.0000",
      netVat: "16.5000",
      netVatPayable: "16.5000",
      netVatRefundable: "0.0000",
      sales: { documentCount: 2, taxableAmount: "150.0000", taxAmount: "22.5000", grossAmount: "172.5000" },
      purchases: { documentCount: 1, taxableAmount: "40.0000", taxAmount: "6.0000", grossAmount: "46.0000" },
    });
  });

  it("reports refundable VAT when input VAT exceeds output VAT", () => {
    const report = buildVatReturnReport(
      [vatDocument("invoice-1", "INV-1", "2026-01-10", "100.0000", "15.0000", "115.0000")],
      [vatDocument("bill-1", "BILL-1", "2026-01-12", "200.0000", "30.0000", "230.0000")],
      { from: "2026-01-01", to: "2026-01-31" },
    );

    expect(report.netVat).toBe("-15.0000");
    expect(report.netVatPayable).toBe("0.0000");
    expect(report.netVatRefundable).toBe("15.0000");
  });

  it("ranks top customers from finalized sales invoice source documents", () => {
    const report = buildTopCustomersReport(
      [
        topCustomerInvoice("invoice-1", "INV-1", "customer-2", "Beta Trading", "2026-01-10", "100.0000", "15.0000", "115.0000"),
        topCustomerInvoice("invoice-2", "INV-2", "customer-1", "Alpha LLC", "2026-01-11", "200.0000", "30.0000", "230.0000"),
        topCustomerInvoice("invoice-3", "INV-3", "customer-2", "Beta Trading", "2026-01-12", "80.0000", "12.0000", "92.0000"),
      ],
      { from: "2026-01-01", to: "2026-01-31", limit: 1 },
    );

    expect(report).toMatchObject({
      from: "2026-01-01",
      to: "2026-01-31",
      basis: "FINALIZED_SALES_INVOICES",
      limit: 1,
      totals: {
        customerCount: 2,
        invoiceCount: 3,
        taxableAmount: "380.0000",
        taxAmount: "57.0000",
        grossAmount: "437.0000",
      },
    });
    expect(report.rows).toEqual([
      {
        customer: { id: "customer-1", name: "Alpha LLC", displayName: "Alpha LLC" },
        invoiceCount: 1,
        taxableAmount: "200.0000",
        taxAmount: "30.0000",
        grossAmount: "230.0000",
        latestInvoiceDate: "2026-01-11T00:00:00.000Z",
      },
    ]);
    expect(report.notes.join(" ")).toContain("finalized sales invoices");
    expect(report.notes.join(" ")).toContain("does not net credit notes");
  });

  it("calculates top customers from active-organization finalized invoices inside the date range", async () => {
    const salesInvoices = [
      salesInvoiceFixture({
        id: "invoice-alpha",
        customerId: "customer-alpha",
        issueDate: new Date("2026-01-10T00:00:00.000Z"),
        total: "230.0000",
        taxableTotal: "200.0000",
        taxTotal: "30.0000",
      }),
      salesInvoiceFixture({
        id: "invoice-beta",
        customerId: "customer-beta",
        issueDate: new Date("2026-01-12T00:00:00.000Z"),
        total: "115.0000",
        taxableTotal: "100.0000",
        taxTotal: "15.0000",
      }),
      salesInvoiceFixture({ id: "invoice-draft", customerId: "customer-draft", status: SalesInvoiceStatus.DRAFT, total: "999.0000" }),
      salesInvoiceFixture({ id: "invoice-other-org", organizationId: "org-2", customerId: "customer-other", total: "888.0000" }),
      salesInvoiceFixture({ id: "invoice-other-branch", branchId: "branch-2", customerId: "customer-branch", total: "777.0000" }),
      salesInvoiceFixture({
        id: "invoice-outside-range",
        customerId: "customer-outside",
        issueDate: new Date("2026-02-01T00:00:00.000Z"),
        total: "666.0000",
      }),
    ].map((invoice) => ({
      ...invoice,
      customer: {
        id: invoice.customerId,
        name: invoice.customerId.replace("customer-", "").toUpperCase(),
        displayName: `${invoice.customerId.replace("customer-", "").toUpperCase()} Customer`,
      },
    }));
    const prisma = {
      salesInvoice: { findMany: jest.fn(async (args: any) => salesInvoices.filter((invoice) => matchesVatWhere(invoice, args.where, "issueDate"))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.topCustomers("org-1", { from: "2026-01-01", to: "2026-01-31", branchId: " branch-1 ", limit: "5" });

    expect(report.rows.map((row) => row.customer.id)).toEqual(["customer-alpha", "customer-beta"]);
    expect(report.totals).toMatchObject({ customerCount: 2, invoiceCount: 2, grossAmount: "345.0000" });
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          branchId: "branch-1",
          status: SalesInvoiceStatus.FINALIZED,
          issueDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
        }),
      }),
    );
  });

  it("ranks top products and services from finalized sales invoice lines", () => {
    const report = buildTopProductsServicesReport(
      [
        topProductServiceLine({
          id: "line-1",
          item: { id: "item-2", name: "Advisory", sku: "ADV", type: "SERVICE" },
          description: "Advisory retainer",
          quantity: "1.0000",
          taxableAmount: "100.0000",
          taxAmount: "15.0000",
          lineTotal: "115.0000",
        }),
        topProductServiceLine({
          id: "line-2",
          item: { id: "item-1", name: "Implementation", sku: "IMP", type: "SERVICE" },
          description: "Implementation",
          quantity: "2.0000",
          taxableAmount: "220.0000",
          taxAmount: "33.0000",
          lineTotal: "253.0000",
          invoice: { issueDate: new Date("2026-01-12T00:00:00.000Z"), invoiceNumber: "INV-2" },
        }),
        topProductServiceLine({
          id: "line-3",
          item: null,
          description: "Custom setup",
          quantity: "3.0000",
          taxableAmount: "90.0000",
          taxAmount: "13.5000",
          lineTotal: "103.5000",
          invoice: { issueDate: new Date("2026-01-13T00:00:00.000Z"), invoiceNumber: "INV-3" },
        }),
      ],
      { from: "2026-01-01", to: "2026-01-31", limit: 2 },
    );

    expect(report).toMatchObject({
      from: "2026-01-01",
      to: "2026-01-31",
      basis: "FINALIZED_SALES_INVOICE_LINES",
      limit: 2,
      totals: {
        lineCount: 3,
        catalogItemCount: 2,
        uncatalogedLineGroupCount: 1,
        quantity: "6.0000",
        taxableAmount: "410.0000",
        taxAmount: "61.5000",
        grossAmount: "471.5000",
      },
    });
    expect(report.rows.map((row) => row.label)).toEqual(["Implementation", "Advisory"]);
    expect(report.rows[0]).toMatchObject({
      kind: "CATALOG_ITEM",
      item: { id: "item-1", name: "Implementation", sku: "IMP", type: "SERVICE" },
      lineCount: 1,
      quantity: "2.0000",
      grossAmount: "253.0000",
      latestInvoiceDate: "2026-01-12T00:00:00.000Z",
    });
    expect(report.notes.join(" ")).toContain("finalized sales invoice lines");
    expect(report.notes.join(" ")).toContain("does not net credit notes");
  });

  it("calculates top products and services from active-organization finalized invoice lines inside the date range", async () => {
    const invoiceLines = [
      topProductServiceLine({
        id: "line-implementation",
        organizationId: "org-1",
        invoice: { organizationId: "org-1", branchId: "branch-1", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-01-10T00:00:00.000Z"), invoiceNumber: "INV-1" },
        item: { id: "item-implementation", name: "Implementation", sku: "IMP", type: "SERVICE" },
        lineTotal: "230.0000",
      }),
      topProductServiceLine({
        id: "line-setup",
        organizationId: "org-1",
        invoice: { organizationId: "org-1", branchId: "branch-1", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-01-11T00:00:00.000Z"), invoiceNumber: "INV-2" },
        item: null,
        description: "Custom setup",
        lineTotal: "115.0000",
      }),
      topProductServiceLine({ id: "line-draft", invoice: { status: SalesInvoiceStatus.DRAFT }, lineTotal: "999.0000" }),
      topProductServiceLine({ id: "line-other-org", organizationId: "org-2", invoice: { organizationId: "org-2" }, lineTotal: "888.0000" }),
      topProductServiceLine({ id: "line-other-branch", invoice: { branchId: "branch-2" }, lineTotal: "777.0000" }),
      topProductServiceLine({ id: "line-outside-range", invoice: { issueDate: new Date("2026-02-01T00:00:00.000Z") }, lineTotal: "666.0000" }),
    ];
    const prisma = {
      salesInvoiceLine: { findMany: jest.fn(async (args: any) => invoiceLines.filter((line) => matchesInvoiceLineWhere(line, args.where))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.topProductsServices("org-1", { from: "2026-01-01", to: "2026-01-31", branchId: " branch-1 ", limit: "5" });

    expect(report.rows.map((row) => row.label)).toEqual(["Implementation", "Custom setup"]);
    expect(report.totals).toMatchObject({ lineCount: 2, catalogItemCount: 1, uncatalogedLineGroupCount: 1, grossAmount: "345.0000" });
    expect(prisma.salesInvoiceLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          invoice: {
            is: expect.objectContaining({
              organizationId: "org-1",
              branchId: "branch-1",
              status: SalesInvoiceStatus.FINALIZED,
              issueDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
            }),
          },
        }),
      }),
    );
  });

  it("calculates VAT return from active-organization finalized documents inside the date range", async () => {
    const salesInvoices = [
      salesInvoiceFixture({ id: "invoice-finalized", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "15.0000" }),
      salesInvoiceFixture({ id: "invoice-draft", status: SalesInvoiceStatus.DRAFT, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "99.0000" }),
      salesInvoiceFixture({ id: "invoice-voided", status: SalesInvoiceStatus.VOIDED, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "88.0000" }),
      salesInvoiceFixture({ id: "invoice-other-org", organizationId: "org-2", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-01-10T00:00:00.000Z"), taxTotal: "77.0000" }),
      salesInvoiceFixture({ id: "invoice-outside-range", status: SalesInvoiceStatus.FINALIZED, issueDate: new Date("2026-02-01T00:00:00.000Z"), taxTotal: "66.0000" }),
    ];
    const purchaseBills = [
      purchaseBillFixture({ id: "bill-finalized", status: PurchaseBillStatus.FINALIZED, billDate: new Date("2026-01-15T00:00:00.000Z"), taxTotal: "5.0000" }),
      purchaseBillFixture({ id: "bill-voided", status: PurchaseBillStatus.VOIDED, billDate: new Date("2026-01-15T00:00:00.000Z"), taxTotal: "44.0000" }),
      purchaseBillFixture({ id: "bill-other-org", organizationId: "org-2", status: PurchaseBillStatus.FINALIZED, billDate: new Date("2026-01-15T00:00:00.000Z"), taxTotal: "33.0000" }),
    ];
    const prisma = {
      salesInvoice: { findMany: jest.fn(async (args: any) => salesInvoices.filter((invoice) => matchesVatWhere(invoice, args.where, "issueDate"))) },
      purchaseBill: { findMany: jest.fn(async (args: any) => purchaseBills.filter((bill) => matchesVatWhere(bill, args.where, "billDate"))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.vatReturn("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(report).toMatchObject({
      outputVat: "15.0000",
      inputVat: "5.0000",
      netVatPayable: "10.0000",
      sales: { documentCount: 1 },
      purchases: { documentCount: 1 },
    });
    expect(report.sales.documents.map((document) => document.id)).toEqual(["invoice-finalized"]);
    expect(report.purchases.documents.map((document) => document.id)).toEqual(["bill-finalized"]);
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: SalesInvoiceStatus.FINALIZED,
          issueDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
        }),
      }),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: PurchaseBillStatus.FINALIZED,
          billDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
        }),
      }),
    );
  });

  it("filters VAT return source documents by active organization and optional branch", async () => {
    const salesInvoices = [
      salesInvoiceFixture({ id: "invoice-branch-1", branchId: "branch-1", taxTotal: "15.0000" }),
      salesInvoiceFixture({ id: "invoice-branch-2", branchId: "branch-2", taxTotal: "99.0000" }),
      salesInvoiceFixture({ id: "invoice-other-org", organizationId: "org-2", branchId: "branch-1", taxTotal: "88.0000" }),
    ];
    const purchaseBills = [
      purchaseBillFixture({ id: "bill-branch-1", branchId: "branch-1", taxTotal: "5.0000" }),
      purchaseBillFixture({ id: "bill-branch-2", branchId: "branch-2", taxTotal: "44.0000" }),
    ];
    const prisma = {
      salesInvoice: { findMany: jest.fn(async (args: any) => salesInvoices.filter((invoice) => matchesVatWhere(invoice, args.where, "issueDate"))) },
      purchaseBill: { findMany: jest.fn(async (args: any) => purchaseBills.filter((bill) => matchesVatWhere(bill, args.where, "billDate"))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.vatReturn("org-1", { branchId: " branch-1 " });

    expect(report.sales.documents.map((document) => document.id)).toEqual(["invoice-branch-1"]);
    expect(report.purchases.documents.map((document) => document.id)).toEqual(["bill-branch-1"]);
    expect(report).toMatchObject({ outputVat: "15.0000", inputVat: "5.0000", netVatPayable: "10.0000" });
    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
  });

  it("calculates a financial dashboard summary from open documents and reportable journal activity", async () => {
    const salesInvoices = [
      salesInvoiceFixture({
        id: "invoice-overdue",
        invoiceNumber: "INV-OVERDUE",
        issueDate: new Date("2026-01-10T00:00:00.000Z"),
        dueDate: new Date("2026-01-15T00:00:00.000Z"),
        total: "115.0000",
        balanceDue: "100.0000",
      }),
      salesInvoiceFixture({
        id: "invoice-open",
        invoiceNumber: "INV-OPEN",
        issueDate: new Date("2026-01-20T00:00:00.000Z"),
        dueDate: new Date("2026-02-10T00:00:00.000Z"),
        total: "57.5000",
        balanceDue: "50.0000",
      }),
      salesInvoiceFixture({ id: "invoice-voided", status: SalesInvoiceStatus.VOIDED, balanceDue: "999.0000" }),
    ];
    const purchaseBills = [
      purchaseBillFixture({
        id: "bill-open",
        billNumber: "BILL-OPEN",
        billDate: new Date("2026-01-12T00:00:00.000Z"),
        total: "80.5000",
        balanceDue: "70.0000",
      }),
      purchaseBillFixture({ id: "bill-draft", status: PurchaseBillStatus.DRAFT, balanceDue: "999.0000" }),
    ];
    const journalLines = [
      dashboardLine("cash", "111", AccountType.ASSET, "2026-01-05", JournalEntryStatus.POSTED, "200.0000", "0.0000"),
      dashboardLine("bank", "112", AccountType.ASSET, "2026-01-06", JournalEntryStatus.REVERSED, "0.0000", "40.0000"),
      dashboardLine("bank", "112", AccountType.ASSET, "2026-01-07", JournalEntryStatus.POSTED, "40.0000", "0.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-08", JournalEntryStatus.POSTED, "0.0000", "120.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-09", JournalEntryStatus.REVERSED, "0.0000", "50.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-10", JournalEntryStatus.POSTED, "50.0000", "0.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-11", JournalEntryStatus.VOIDED, "0.0000", "999.0000"),
      dashboardLine("vat-payable", "220", AccountType.LIABILITY, "2026-01-12", JournalEntryStatus.POSTED, "0.0000", "18.0000"),
      dashboardLine("vat-receivable", "230", AccountType.ASSET, "2026-01-13", JournalEntryStatus.POSTED, "3.0000", "0.0000"),
    ];
    const prisma = {
      salesInvoice: { findMany: jest.fn(async (args: any) => salesInvoices.filter((invoice) => matchesDashboardDocumentWhere(invoice, args.where, "issueDate"))) },
      purchaseBill: { findMany: jest.fn(async (args: any) => purchaseBills.filter((bill) => matchesDashboardDocumentWhere(bill, args.where, "billDate"))) },
      bankAccountProfile: {
        findMany: jest.fn().mockResolvedValue([
          { accountId: "cash", displayName: "Cash", account: { id: "cash", code: "111", name: "Cash", type: AccountType.ASSET } },
          { accountId: "bank", displayName: "Bank", account: { id: "bank", code: "112", name: "Bank", type: AccountType.ASSET } },
        ]),
      },
      journalLine: { findMany: jest.fn(async (args: any) => journalLines.filter((line) => matchesDashboardLineWhere(line, args.where))) },
    };
    const service = new ReportsService(prisma as never);

    const summary = await service.dashboardSummary("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(summary).toMatchObject({
      asOf: "2026-01-31",
      period: { from: "2026-01-01", to: "2026-01-31" },
      receivables: {
        total: "150.0000",
        overdue: "100.0000",
        documentCount: 2,
        overdueDocumentCount: 1,
      },
      payables: {
        total: "70.0000",
        documentCount: 1,
      },
      cashAndBank: {
        balance: "200.0000",
        accountCount: 2,
      },
      revenue: {
        currentPeriod: "120.0000",
      },
      vat: {
        outputVat: "18.0000",
        inputVat: "3.0000",
        netVatPayable: "15.0000",
        netVatRefundable: "0.0000",
      },
    });
    expect(summary.receivables.documents.map((document) => document.id)).toEqual(["invoice-overdue", "invoice-open"]);
    expect(summary.payables.documents.map((document) => document.id)).toEqual(["bill-open"]);
    expect(prisma.bankAccountProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1", status: BankAccountStatus.ACTIVE }),
      }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId: { in: ["cash", "bank"] },
          journalEntry: expect.objectContaining({ status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] } }),
        }),
      }),
    );
  });

  it("passes optional branch filters into dashboard source document and journal reads", async () => {
    const prisma = {
      salesInvoice: { findMany: jest.fn().mockResolvedValue([]) },
      purchaseBill: { findMany: jest.fn().mockResolvedValue([]) },
      bankAccountProfile: { findMany: jest.fn().mockResolvedValue([]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ReportsService(prisma as never);

    await service.dashboardSummary("org-1", { branchId: " branch-1 ", to: "2026-01-31" });

    expect(prisma.salesInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
    expect(prisma.purchaseBill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", branchId: "branch-1" }) }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          journalEntry: expect.objectContaining({
            OR: expect.arrayContaining([
              { salesInvoice: { is: { organizationId: "org-1", branchId: "branch-1" } } },
              { purchaseBill: { is: { organizationId: "org-1", branchId: "branch-1" } } },
            ]),
          }),
        }),
      }),
    );
  });

  it("calculates cash flow from active-organization active cash and bank accounts inside the date range", async () => {
    const journalLines = [
      dashboardLine("cash", "111", AccountType.ASSET, "2025-12-31", JournalEntryStatus.POSTED, "200.0000", "0.0000"),
      dashboardLine("bank", "112", AccountType.ASSET, "2025-12-31", JournalEntryStatus.POSTED, "0.0000", "50.0000"),
      dashboardLine("cash", "111", AccountType.ASSET, "2026-01-05", JournalEntryStatus.POSTED, "150.0000", "0.0000"),
      dashboardLine("bank", "112", AccountType.ASSET, "2026-01-06", JournalEntryStatus.REVERSED, "0.0000", "40.0000"),
      dashboardLine("expense", "511", AccountType.EXPENSE, "2026-01-07", JournalEntryStatus.POSTED, "999.0000", "0.0000"),
      dashboardLine("cash", "111", AccountType.ASSET, "2026-01-08", JournalEntryStatus.VOIDED, "888.0000", "0.0000"),
      dashboardLine("cash", "111", AccountType.ASSET, "2026-02-01", JournalEntryStatus.POSTED, "777.0000", "0.0000"),
      { ...dashboardLine("cash", "111", AccountType.ASSET, "2026-01-09", JournalEntryStatus.POSTED, "666.0000", "0.0000"), organizationId: "org-2" },
    ];
    const prisma = {
      bankAccountProfile: {
        findMany: jest.fn().mockResolvedValue([
          { accountId: "cash", displayName: "Cash", account: { id: "cash", code: "111", name: "Cash", type: AccountType.ASSET } },
          { accountId: "bank", displayName: "Bank", account: { id: "bank", code: "112", name: "Bank", type: AccountType.ASSET } },
        ]),
      },
      journalLine: { findMany: jest.fn(async (args: any) => journalLines.filter((line) => matchesDashboardLineWhere(line, args.where))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.cashFlow("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(report).toMatchObject({
      totals: {
        openingCash: "150.0000",
        inflows: "150.0000",
        outflows: "40.0000",
        netCashFlow: "110.0000",
        closingCash: "260.0000",
        accountCount: 2,
        lineCount: 2,
      },
      rows: [{ period: "2026-01", inflows: "150.0000", outflows: "40.0000", netCashFlow: "110.0000", lineCount: 2 }],
    });
    expect(prisma.bankAccountProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          status: BankAccountStatus.ACTIVE,
          account: { is: { allowPosting: true, isActive: true, type: AccountType.ASSET } },
        }),
      }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          accountId: { in: ["cash", "bank"] },
          journalEntry: expect.objectContaining({
            status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
            entryDate: { lt: new Date("2026-01-01T00:00:00.000Z") },
          }),
        }),
      }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          accountId: { in: ["cash", "bank"] },
          journalEntry: expect.objectContaining({
            status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
            entryDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
          }),
        }),
      }),
    );
  });

  it("calculates revenue trend from active-organization posted revenue lines inside the date range", async () => {
    const journalLines = [
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-08", JournalEntryStatus.POSTED, "0.0000", "120.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-09", JournalEntryStatus.REVERSED, "25.0000", "0.0000"),
      dashboardLine("expense", "511", AccountType.EXPENSE, "2026-01-10", JournalEntryStatus.POSTED, "0.0000", "999.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-11", JournalEntryStatus.VOIDED, "0.0000", "888.0000"),
      dashboardLine("revenue", "411", AccountType.REVENUE, "2026-02-01", JournalEntryStatus.POSTED, "0.0000", "777.0000"),
      { ...dashboardLine("revenue", "411", AccountType.REVENUE, "2026-01-12", JournalEntryStatus.POSTED, "0.0000", "666.0000"), organizationId: "org-2" },
    ];
    const prisma = {
      journalLine: { findMany: jest.fn(async (args: any) => journalLines.filter((line) => matchesDashboardLineWhere(line, args.where))) },
    };
    const service = new ReportsService(prisma as never);

    const report = await service.revenueTrend("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(report).toMatchObject({
      totals: { revenue: "95.0000", lineCount: 2 },
      rows: [{ period: "2026-01", revenue: "95.0000", lineCount: 2 }],
    });
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          account: { is: { type: AccountType.REVENUE } },
          journalEntry: expect.objectContaining({
            status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
            entryDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
          }),
        }),
      }),
    );
  });

  it("passes optional branch filters into cash flow journal reads", async () => {
    const prisma = {
      bankAccountProfile: {
        findMany: jest.fn().mockResolvedValue([{ accountId: "cash", displayName: "Cash", account: { id: "cash", code: "111", name: "Cash", type: AccountType.ASSET } }]),
      },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ReportsService(prisma as never);

    await service.cashFlow("org-1", { branchId: " branch-1 ", from: "2026-01-01", to: "2026-01-31" });

    expect(prisma.journalLine.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          accountId: { in: ["cash"] },
          journalEntry: expect.objectContaining({
            OR: expect.arrayContaining([
              { salesInvoice: { is: { organizationId: "org-1", branchId: "branch-1" } } },
              { purchaseBill: { is: { organizationId: "org-1", branchId: "branch-1" } } },
            ]),
          }),
        }),
      }),
    );
  });

  it("passes optional branch filters into revenue trend journal reads", async () => {
    const prisma = {
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ReportsService(prisma as never);

    await service.revenueTrend("org-1", { branchId: " branch-1 ", from: "2026-01-01", to: "2026-01-31" });

    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          account: { is: { type: AccountType.REVENUE } },
          journalEntry: expect.objectContaining({
            OR: expect.arrayContaining([
              { salesInvoice: { is: { organizationId: "org-1", branchId: "branch-1" } } },
              { purchaseBill: { is: { organizationId: "org-1", branchId: "branch-1" } } },
            ]),
          }),
        }),
      }),
    );
  });

  it("buckets aged receivables and payables", () => {
    expect(agingBucket(-1)).toBe("CURRENT");
    expect(agingBucket(30)).toBe("1_30");
    expect(agingBucket(61)).toBe("61_90");
    expect(agingBucket(100)).toBe("90_PLUS");

    const report = buildAgingReport(
      [
        {
          id: "invoice-1",
          number: "INV-1",
          contact: { id: "customer", name: "Customer" },
          issueDate: "2026-01-01T00:00:00.000Z",
          dueDate: "2026-01-31T00:00:00.000Z",
          total: "115.0000",
          balanceDue: "50.0000",
        },
      ],
      { asOf: "2026-03-05", kind: "receivables" },
    );

    expect(report.rows[0]).toMatchObject({ bucket: "31_60", daysOverdue: 33 });
    expect(report.bucketTotals["31_60"]).toBe("50.0000");
    expect(report.grandTotal).toBe("50.0000");
  });

  it("scopes report database reads to the active tenant", async () => {
    const prisma = {
      account: { findMany: jest.fn().mockResolvedValue([]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ReportsService(prisma as never);

    await service.generalLedger("org-1", { from: "2026-01-01", to: "2026-01-31" });

    expect(prisma.account.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }),
    );
  });

  it("resolves active and archived dimensions once and applies both to general ledger opening and period reads", async () => {
    const prisma = dimensionReportPrisma();
    const service = new ReportsService(prisma as never);

    const report = await service.generalLedger("org-1", {
      from: "2026-01-01",
      to: "2026-01-31",
      accountId: "cash",
      branchId: " branch-1 ",
      costCenterId: "cost-center-1",
      projectId: "project-1",
    });

    expect(report.filters).toEqual({
      costCenter: { id: "cost-center-1", code: "CC-OPS", name: "Operations", status: "ACTIVE" },
      project: { id: "project-1", code: "PRJ-ALPHA", name: "Alpha", status: "ARCHIVED" },
    });
    expect(prisma.costCenter.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.costCenter.findFirst).toHaveBeenCalledWith({
      where: { id: "cost-center-1", organizationId: "org-1" },
      select: { id: true, code: true, name: true, status: true },
    });
    expect(prisma.project.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: "project-1", organizationId: "org-1" },
      select: { id: true, code: true, name: true, status: true },
    });
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-1", id: "cash" } }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenCalledTimes(2);
    for (const call of prisma.journalLine.findMany.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org-1",
            accountId: "cash",
            costCenterId: "cost-center-1",
            projectId: "project-1",
            journalEntry: expect.objectContaining({
              OR: expect.arrayContaining([
                { salesInvoice: { is: { organizationId: "org-1", branchId: "branch-1" } } },
                { purchaseBill: { is: { organizationId: "org-1", branchId: "branch-1" } } },
              ]),
            }),
          }),
        }),
      );
    }
    expect(prisma.journalLine.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          journalEntry: expect.objectContaining({ entryDate: { lt: new Date("2026-01-01T00:00:00.000Z") } }),
        }),
      }),
    );
    expect(prisma.journalLine.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          journalEntry: expect.objectContaining({
            entryDate: { gte: new Date("2026-01-01T00:00:00.000Z"), lte: new Date("2026-01-31T23:59:59.999Z") },
          }),
        }),
      }),
    );
  });

  it.each([
    ["trial balance", "costCenterId", "cost-center-1", (service: ReportsService, query: any) => service.trialBalance("org-1", query)],
    ["profit and loss", "projectId", "project-1", (service: ReportsService, query: any) => service.profitAndLoss("org-1", query)],
    ["balance sheet", "costCenterId", "cost-center-1", (service: ReportsService, query: any) => service.balanceSheet("org-1", query)],
    ["VAT summary", "projectId", "project-1", (service: ReportsService, query: any) => service.vatSummary("org-1", query)],
    ["cash flow", "costCenterId", "cost-center-1", (service: ReportsService, query: any) => service.cashFlow("org-1", query)],
  ])("applies an individual dimension and returns exact filter metadata for %s", async (_name, filterKey, filterId, run) => {
    const prisma = dimensionReportPrisma();
    const service = new ReportsService(prisma as never);
    const query = { [filterKey]: filterId };

    const report = await run(service, query);

    const expectedCostCenter = filterKey === "costCenterId" ? prisma.costCenterRecord : null;
    const expectedProject = filterKey === "projectId" ? prisma.projectRecord : null;
    expect(report.filters).toEqual({ costCenter: expectedCostCenter, project: expectedProject });
    expect(prisma.costCenter.findFirst).toHaveBeenCalledTimes(filterKey === "costCenterId" ? 1 : 0);
    expect(prisma.project.findFirst).toHaveBeenCalledTimes(filterKey === "projectId" ? 1 : 0);
    expect(prisma.journalLine.findMany).toHaveBeenCalled();
    for (const call of prisma.journalLine.findMany.mock.calls) {
      expect(call[0].where).toEqual(expect.objectContaining({ [filterKey]: filterId }));
    }
  });

  it("does not query dimension catalogs when filters are absent and returns null filter metadata", async () => {
    const prisma = dimensionReportPrisma();
    const service = new ReportsService(prisma as never);

    const report = await service.trialBalance("org-1", {});

    expect(report.filters).toEqual({ costCenter: null, project: null });
    expect(prisma.costCenter.findFirst).not.toHaveBeenCalled();
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    ["missing cost center", "costCenterId", "missing-cost-center", "Cost center not found in this organization."],
    ["cross-tenant cost center", "costCenterId", "other-tenant-cost-center", "Cost center not found in this organization."],
    ["missing project", "projectId", "missing-project", "Project not found in this organization."],
    ["cross-tenant project", "projectId", "other-tenant-project", "Project not found in this organization."],
  ])("rejects a %s before report aggregation", async (_name, filterKey, filterId, message) => {
    const prisma = dimensionReportPrisma();
    if (filterKey === "costCenterId") {
      prisma.costCenter.findFirst.mockResolvedValue(null);
    } else {
      prisma.project.findFirst.mockResolvedValue(null);
    }
    const service = new ReportsService(prisma as never);

    await expect(service.generalLedger("org-1", { [filterKey]: filterId })).rejects.toEqual(new BadRequestException(message));
    expect(prisma.account.findMany).not.toHaveBeenCalled();
    expect(prisma.journalLine.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ["dashboard summary", (service: ReportsService, query: any) => service.dashboardSummary("org-1", query)],
    ["VAT return", (service: ReportsService, query: any) => service.vatReturn("org-1", query)],
    ["revenue trend", (service: ReportsService, query: any) => service.revenueTrend("org-1", query)],
    ["top customers", (service: ReportsService, query: any) => service.topCustomers("org-1", query)],
    ["top products and services", (service: ReportsService, query: any) => service.topProductsServices("org-1", query)],
    ["aged receivables", (service: ReportsService, query: any) => service.agedReceivables("org-1", query)],
    ["aged payables", (service: ReportsService, query: any) => service.agedPayables("org-1", query)],
  ])("rejects dimension filters for unsupported %s reports", async (_name, run) => {
    const service = new ReportsService({} as never);
    const error = new BadRequestException("Dimension filtering is not available for this report until source documents carry dimensions.");

    await expect(run(service, { costCenterId: "cost-center-1" })).rejects.toEqual(error);
    await expect(run(service, { projectId: "project-1" })).rejects.toEqual(error);
  });

  it("archives generated report PDFs", async () => {
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "LedgerByte Demo",
          legalName: null,
          taxNumber: null,
          countryCode: "SA",
          baseCurrency: "SAR",
        }),
      },
      account: { findMany: jest.fn().mockResolvedValue([]) },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const documentSettings = { statementRenderSettings: jest.fn().mockResolvedValue({}) };
    const generatedDocuments = { archivePdf: jest.fn().mockResolvedValue({ id: "doc-1" }) };
    const service = new ReportsService(prisma as never, documentSettings as never, generatedDocuments as never);

    const result = await service.coreReportPdf("org-1", "user-1", "trial-balance", {});

    expect(result.filename).toMatch(/^trial-balance-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(generatedDocuments.archivePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        documentType: DocumentType.REPORT_TRIAL_BALANCE,
        sourceType: "AccountingReport",
        generatedById: "user-1",
      }),
    );
  });
});

function line(accountId: string, date: string, debit: string, credit: string, description = "Line") {
  return {
    accountId,
    debit,
    credit,
    description,
    lineNumber: 1,
    journalEntry: {
      id: `journal-${accountId}-${date}`,
      entryNumber: `JE-${date}`,
      entryDate: `${date}T00:00:00.000Z`,
      description,
      reference: null,
    },
  };
}

function dimensionReportPrisma() {
  const costCenterRecord = { id: "cost-center-1", code: "CC-OPS", name: "Operations", status: "ACTIVE" };
  const projectRecord = { id: "project-1", code: "PRJ-ALPHA", name: "Alpha", status: "ARCHIVED" };
  return {
    costCenterRecord,
    projectRecord,
    costCenter: { findFirst: jest.fn().mockResolvedValue(costCenterRecord) },
    project: { findFirst: jest.fn().mockResolvedValue(projectRecord) },
    account: { findMany: jest.fn().mockResolvedValue([]) },
    bankAccountProfile: {
      findMany: jest.fn().mockResolvedValue([
        { accountId: "cash", displayName: "Cash", account: { id: "cash", code: "111", name: "Cash", type: AccountType.ASSET } },
      ]),
    },
    journalLine: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function reportPackPrisma() {
  const records: any[] = [];
  return {
    organization: {
      findFirst: jest.fn(async (args: any) =>
        args.where.id === "org-1" ? { id: "org-1", name: "LedgerByte Demo" } : null,
      ),
    },
    reportPack: {
      create: jest.fn(async (args: any) => {
        const record = {
          ...args.data,
          createdAt: new Date("2026-06-21T10:00:00.000Z"),
          updatedAt: new Date("2026-06-21T10:00:00.000Z"),
          requestedBy: { id: args.data.requestedById, name: "Owner" },
          organization: { id: args.data.organizationId, name: "LedgerByte Demo" },
        };
        records.push(record);
        return record;
      }),
      findMany: jest.fn(async (args: any) =>
        records.filter(
          (record) =>
            record.organizationId === args.where.organizationId &&
            (!args.where.status || record.status === args.where.status),
        ),
      ),
      findFirst: jest.fn(async (args: any) =>
        records.find((record) => record.id === args.where.id && record.organizationId === args.where.organizationId) ?? null,
      ),
      update: jest.fn(async (args: any) => {
        const record = records.find((candidate) => candidate.id === args.where.id);
        if (!record) {
          throw new Error("Missing report pack.");
        }
        Object.assign(record, args.data, { updatedAt: new Date("2026-06-21T10:01:00.000Z") });
        return record;
      }),
    },
  };
}

function vatDocument(id: string, number: string, date: string, taxableTotal: string, taxTotal: string, total: string) {
  return {
    id,
    number,
    documentDate: `${date}T00:00:00.000Z`,
    taxableTotal,
    taxTotal,
    total,
  };
}

function topCustomerInvoice(
  id: string,
  number: string,
  customerId: string,
  customerName: string,
  date: string,
  taxableTotal: string,
  taxTotal: string,
  total: string,
) {
  return {
    id,
    number,
    documentDate: `${date}T00:00:00.000Z`,
    taxableTotal,
    taxTotal,
    total,
    customer: { id: customerId, name: customerName, displayName: customerName },
  };
}

interface TopProductServiceLineFixture {
  id: string;
  organizationId: string;
  description: string;
  quantity: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  item: { id: string; name: string; sku: string | null; type: string } | null;
  invoice: {
    organizationId: string;
    branchId: string | null;
    status: SalesInvoiceStatus;
    issueDate: Date;
    invoiceNumber: string;
  };
}

type TopProductServiceLineOverrides = Partial<Omit<TopProductServiceLineFixture, "invoice">> & {
  invoice?: Partial<TopProductServiceLineFixture["invoice"]>;
};

function topProductServiceLine(overrides: TopProductServiceLineOverrides): TopProductServiceLineFixture {
  const baseInvoice = {
    organizationId: "org-1",
    branchId: "branch-1",
    status: SalesInvoiceStatus.FINALIZED,
    issueDate: new Date("2026-01-10T00:00:00.000Z"),
    invoiceNumber: "INV-1",
  };
  return {
    id: "line-1",
    organizationId: "org-1",
    description: "Consulting",
    quantity: "1.0000",
    taxableAmount: "100.0000",
    taxAmount: "15.0000",
    lineTotal: "115.0000",
    item: { id: "item-1", name: "Consulting", sku: "CONSULT", type: "SERVICE" },
    ...overrides,
    invoice: { ...baseInvoice, ...overrides.invoice },
  };
}

interface SalesInvoiceFixture {
  id: string;
  organizationId: string;
  branchId: string | null;
  invoiceNumber: string;
  customerId: string;
  issueDate: Date;
  dueDate: Date | null;
  status: SalesInvoiceStatus;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  balanceDue: string;
}

function salesInvoiceFixture(overrides: Partial<SalesInvoiceFixture>): SalesInvoiceFixture {
  return { ...salesInvoiceFixtureBase(), ...overrides };
}

function salesInvoiceFixtureBase(): SalesInvoiceFixture {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    branchId: "branch-1",
    invoiceNumber: "INV-1",
    customerId: "customer-1",
    issueDate: new Date("2026-01-10T00:00:00.000Z"),
    dueDate: null,
    status: SalesInvoiceStatus.FINALIZED,
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
  };
}

interface PurchaseBillFixture {
  id: string;
  organizationId: string;
  branchId: string | null;
  billNumber: string;
  billDate: Date;
  dueDate: Date | null;
  status: PurchaseBillStatus;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  balanceDue: string;
}

function purchaseBillFixture(overrides: Partial<PurchaseBillFixture>): PurchaseBillFixture {
  return { ...purchaseBillFixtureBase(), ...overrides };
}

function purchaseBillFixtureBase(): PurchaseBillFixture {
  return {
    id: "bill-1",
    organizationId: "org-1",
    branchId: "branch-1",
    billNumber: "BILL-1",
    billDate: new Date("2026-01-15T00:00:00.000Z"),
    dueDate: null,
    status: PurchaseBillStatus.FINALIZED,
    taxableTotal: "50.0000",
    taxTotal: "5.0000",
    total: "55.0000",
    balanceDue: "55.0000",
  };
}

interface DashboardLineFixture {
  organizationId: string;
  accountId: string;
  debit: string;
  credit: string;
  account: { id: string; code: string; name: string; type: AccountType };
  journalEntry: { status: JournalEntryStatus; entryDate: Date };
}

function dashboardLine(
  accountId: string,
  code: string,
  type: AccountType,
  date: string,
  status: JournalEntryStatus,
  debit: string,
  credit: string,
): DashboardLineFixture {
  return {
    organizationId: "org-1",
    accountId,
    debit,
    credit,
    account: { id: accountId, code, name: accountId, type },
    journalEntry: { status, entryDate: new Date(`${date}T00:00:00.000Z`) },
  };
}

function matchesDashboardDocumentWhere<T extends { organizationId: string; branchId: string | null; status: string; balanceDue: string }>(
  document: T,
  where: {
    organizationId: string;
    branchId?: string;
    status: string;
    balanceDue?: { gt?: string | number };
    issueDate?: { lte?: Date };
    billDate?: { lte?: Date };
  },
  dateKey: keyof T,
) {
  const documentDate = new Date(String(document[dateKey]));
  const dateRange = "issueDate" in where ? where.issueDate : where.billDate;
  return (
    document.organizationId === where.organizationId &&
    (!where.branchId || document.branchId === where.branchId) &&
    document.status === where.status &&
    (!where.balanceDue?.gt || Number(document.balanceDue) > Number(where.balanceDue.gt)) &&
    (!dateRange?.lte || documentDate <= dateRange.lte)
  );
}

function matchesDashboardLineWhere(
  line: DashboardLineFixture,
  where: {
    organizationId: string;
    accountId?: { in?: string[] };
    account?: { is?: { type?: AccountType; code?: { in?: string[] } } };
    journalEntry?: { status?: { in?: JournalEntryStatus[] }; entryDate?: { gte?: Date; lte?: Date; lt?: Date } };
  },
) {
  const entryDate = line.journalEntry.entryDate;
  return (
    line.organizationId === where.organizationId &&
    (!where.accountId?.in || where.accountId.in.includes(line.accountId)) &&
    (!where.account?.is?.type || line.account.type === where.account.is.type) &&
    (!where.account?.is?.code?.in || where.account.is.code.in.includes(line.account.code)) &&
    (!where.journalEntry?.status?.in || where.journalEntry.status.in.includes(line.journalEntry.status)) &&
    (!where.journalEntry?.entryDate?.gte || entryDate >= where.journalEntry.entryDate.gte) &&
    (!where.journalEntry?.entryDate?.lte || entryDate <= where.journalEntry.entryDate.lte) &&
    (!where.journalEntry?.entryDate?.lt || entryDate < where.journalEntry.entryDate.lt)
  );
}

function matchesVatWhere<T extends { organizationId: string; branchId: string | null; status: string }>(
  document: T,
  where: {
    organizationId: string;
    branchId?: string;
    status: string;
    issueDate?: { gte?: Date; lte?: Date };
    billDate?: { gte?: Date; lte?: Date };
  },
  dateKey: keyof T,
) {
  const documentDate = new Date(String(document[dateKey]));
  const dateRange = "issueDate" in where ? where.issueDate : where.billDate;
  return (
    document.organizationId === where.organizationId &&
    (!where.branchId || document.branchId === where.branchId) &&
    document.status === where.status &&
    (!dateRange?.gte || documentDate >= dateRange.gte) &&
    (!dateRange?.lte || documentDate <= dateRange.lte)
  );
}

function matchesInvoiceLineWhere(
  line: TopProductServiceLineFixture,
  where: {
    organizationId: string;
    invoice?: {
      is?: {
        organizationId?: string;
        branchId?: string;
        status?: SalesInvoiceStatus;
        issueDate?: { gte?: Date; lte?: Date };
      };
    };
  },
) {
  const invoice = where.invoice?.is;
  const issueDate = line.invoice.issueDate;
  return (
    line.organizationId === where.organizationId &&
    (!invoice?.organizationId || line.invoice.organizationId === invoice.organizationId) &&
    (!invoice?.branchId || line.invoice.branchId === invoice.branchId) &&
    (!invoice?.status || line.invoice.status === invoice.status) &&
    (!invoice?.issueDate?.gte || issueDate >= invoice.issueDate.gte) &&
    (!invoice?.issueDate?.lte || issueDate <= invoice.issueDate.lte)
  );
}
