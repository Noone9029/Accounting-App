import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  DocumentType,
  JournalEntryStatus,
  PurchaseBillStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import {
  DocumentRenderSettings,
  renderAgingReportPdf,
  renderBalanceSheetReportPdf,
  renderGeneralLedgerReportPdf,
  renderProfitAndLossReportPdf,
  renderTrialBalanceReportPdf,
  renderVatSummaryReportPdf,
} from "@ledgerbyte/pdf-core";
import { Decimal } from "decimal.js";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { coreReportCsv, CoreReportKind, vatReturnCsv } from "./report-csv";

const POSTED_REPORT_STATUSES = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];
const ZERO = new Decimal(0);

export interface ReportDateQuery {
  from?: string;
  to?: string;
  asOf?: string;
  accountId?: string;
  branchId?: string;
  includeZero?: string | boolean;
  limit?: string | number;
  format?: "json" | "csv" | string;
}

export interface ReportAccountInput {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

export interface ReportJournalLineInput {
  id?: string;
  accountId: string;
  debit: unknown;
  credit: unknown;
  description?: string | null;
  lineNumber?: number;
  journalEntry: {
    id: string;
    entryNumber: string;
    entryDate: string | Date;
    description: string;
    reference?: string | null;
  };
}

interface AgingDocumentInput {
  id: string;
  number: string;
  contact: { id: string; name: string; displayName?: string | null };
  issueDate: string | Date;
  dueDate?: string | Date | null;
  total: unknown;
  balanceDue: unknown;
}

interface VatReturnDocumentInput {
  id: string;
  number: string;
  documentDate: string | Date;
  taxableTotal: unknown;
  taxTotal: unknown;
  total: unknown;
}

interface TopCustomerInvoiceInput extends VatReturnDocumentInput {
  customer: { id: string; name: string; displayName?: string | null };
}

interface TopProductsServicesLineInput {
  id: string;
  description: string;
  quantity: unknown;
  taxableAmount: unknown;
  taxAmount: unknown;
  lineTotal: unknown;
  item: { id: string; name: string; sku?: string | null; type: string } | null;
  invoice: { issueDate: string | Date; invoiceNumber: string };
}

interface DashboardOpenDocumentInput {
  id: string;
  number: string;
  documentDate: string | Date;
  dueDate?: string | Date | null;
  total: unknown;
  balanceDue: unknown;
}

interface DashboardLedgerLineInput {
  debit: unknown;
  credit: unknown;
  account: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
  };
  journalEntry?: {
    entryDate: string | Date;
  };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  async generalLedger(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, ...(query.accountId ? { id: query.accountId } : {}) },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const openingLines = range.from
      ? await this.findJournalLines(organizationId, { before: range.from, accountId: query.accountId, branchId })
      : [];
    const periodLines = await this.findJournalLines(organizationId, { from: range.from, to: range.to, accountId: query.accountId, branchId });

    return buildGeneralLedgerReport(accounts, openingLines, periodLines, {
      from: range.fromLabel,
      to: range.toLabel,
      includeZero: boolQuery(query.includeZero),
    });
  }

  async trialBalance(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const openingLines = range.from ? await this.findJournalLines(organizationId, { before: range.from, branchId }) : [];
    const periodLines = await this.findJournalLines(organizationId, { from: range.from, to: range.to, branchId });

    return buildTrialBalanceReport(accounts, openingLines, periodLines, {
      from: range.fromLabel,
      to: range.toLabel,
      includeZero: boolQuery(query.includeZero),
    });
  }

  async profitAndLoss(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, type: { in: [AccountType.REVENUE, AccountType.COST_OF_SALES, AccountType.EXPENSE] } },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, { from: range.from, to: range.to, branchId });
    return buildProfitAndLossReport(accounts, lines, { from: range.fromLabel, to: range.toLabel });
  }

  async balanceSheet(organizationId: string, query: ReportDateQuery) {
    const asOf = parseEndDate(query.asOf);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, { to: asOf, branchId });
    return buildBalanceSheetReport(accounts, lines, { asOf: dateLabel(query.asOf, asOf) });
  }

  async vatSummary(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const vatAccounts = await this.prisma.account.findMany({
      where: { organizationId, code: { in: ["220", "230"] } },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, { from: range.from, to: range.to, branchId });
    return buildVatSummaryReport(vatAccounts, lines, { from: range.fromLabel, to: range.toLabel });
  }

  async vatReturn(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const documentDateFilter = dateRangeFilter(range.from, range.to);
    const branchId = cleanOptionalFilterId(query.branchId);
    const [salesInvoices, purchaseBills] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          status: SalesInvoiceStatus.FINALIZED,
          ...(branchId ? { branchId } : {}),
          ...(documentDateFilter ? { issueDate: documentDateFilter } : {}),
        },
        orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          taxableTotal: true,
          taxTotal: true,
          total: true,
        },
      }),
      this.prisma.purchaseBill.findMany({
        where: {
          organizationId,
          status: PurchaseBillStatus.FINALIZED,
          ...(branchId ? { branchId } : {}),
          ...(documentDateFilter ? { billDate: documentDateFilter } : {}),
        },
        orderBy: [{ billDate: "asc" }, { billNumber: "asc" }],
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          taxableTotal: true,
          taxTotal: true,
          total: true,
        },
      }),
    ]);

    return buildVatReturnReport(
      salesInvoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.invoiceNumber,
        documentDate: invoice.issueDate,
        taxableTotal: invoice.taxableTotal,
        taxTotal: invoice.taxTotal,
        total: invoice.total,
      })),
      purchaseBills.map((bill) => ({
        id: bill.id,
        number: bill.billNumber,
        documentDate: bill.billDate,
        taxableTotal: bill.taxableTotal,
        taxTotal: bill.taxTotal,
        total: bill.total,
      })),
      { from: range.fromLabel, to: range.toLabel },
    );
  }

  async topCustomers(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const documentDateFilter = dateRangeFilter(range.from, range.to);
    const branchId = cleanOptionalFilterId(query.branchId);
    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: SalesInvoiceStatus.FINALIZED,
        ...(branchId ? { branchId } : {}),
        ...(documentDateFilter ? { issueDate: documentDateFilter } : {}),
      },
      orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        taxableTotal: true,
        taxTotal: true,
        total: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
    });

    return buildTopCustomersReport(
      invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.invoiceNumber,
        documentDate: invoice.issueDate,
        taxableTotal: invoice.taxableTotal,
        taxTotal: invoice.taxTotal,
        total: invoice.total,
        customer: invoice.customer,
      })),
      { from: range.fromLabel, to: range.toLabel, limit: parseReportLimit(query.limit) },
    );
  }

  async topProductsServices(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const documentDateFilter = dateRangeFilter(range.from, range.to);
    const branchId = cleanOptionalFilterId(query.branchId);
    const lines = await this.prisma.salesInvoiceLine.findMany({
      where: {
        organizationId,
        invoice: {
          is: {
            organizationId,
            status: SalesInvoiceStatus.FINALIZED,
            ...(branchId ? { branchId } : {}),
            ...(documentDateFilter ? { issueDate: documentDateFilter } : {}),
          },
        },
      },
      orderBy: [{ invoice: { issueDate: "asc" } }, { sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        description: true,
        quantity: true,
        taxableAmount: true,
        taxAmount: true,
        lineTotal: true,
        item: { select: { id: true, name: true, sku: true, type: true } },
        invoice: { select: { issueDate: true, invoiceNumber: true } },
      },
    });

    return buildTopProductsServicesReport(lines, {
      from: range.fromLabel,
      to: range.toLabel,
      limit: parseReportLimit(query.limit),
    });
  }

  async dashboardSummary(organizationId: string, query: ReportDateQuery) {
    const asOf = parseEndDate(query.asOf ?? query.to) ?? endOfToday();
    const periodFrom = parseStartDate(query.from) ?? startOfMonth(asOf);
    const periodTo = parseEndDate(query.to) ?? asOf;
    const branchId = cleanOptionalFilterId(query.branchId);
    const [receivables, payables, cashAccounts, revenueLines, vatLines] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          status: SalesInvoiceStatus.FINALIZED,
          ...(branchId ? { branchId } : {}),
          balanceDue: { gt: "0.0000" },
          issueDate: { lte: asOf },
        },
        orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
        select: { id: true, invoiceNumber: true, issueDate: true, dueDate: true, total: true, balanceDue: true },
      }),
      this.prisma.purchaseBill.findMany({
        where: {
          organizationId,
          status: PurchaseBillStatus.FINALIZED,
          ...(branchId ? { branchId } : {}),
          balanceDue: { gt: "0.0000" },
          billDate: { lte: asOf },
        },
        orderBy: [{ dueDate: "asc" }, { billDate: "asc" }],
        select: { id: true, billNumber: true, billDate: true, dueDate: true, total: true, balanceDue: true },
      }),
      this.prisma.bankAccountProfile.findMany({
        where: {
          organizationId,
          status: BankAccountStatus.ACTIVE,
          account: { is: { allowPosting: true, isActive: true, type: AccountType.ASSET } },
        },
        orderBy: { displayName: "asc" },
        select: {
          accountId: true,
          displayName: true,
          account: { select: { id: true, code: true, name: true, type: true } },
        },
      }),
      this.findDashboardJournalLines(organizationId, {
        from: periodFrom,
        to: periodTo,
        accountType: AccountType.REVENUE,
        branchId,
      }),
      this.findDashboardJournalLines(organizationId, {
        from: periodFrom,
        to: periodTo,
        accountCodes: ["220", "230"],
        branchId,
      }),
    ]);
    const cashAccountIds = cashAccounts.map((account) => account.accountId);
    const cashLines = cashAccountIds.length
      ? await this.findDashboardJournalLines(organizationId, { to: asOf, accountIds: cashAccountIds, branchId })
      : [];

    return buildFinancialDashboardSummary(
      {
        receivables: receivables.map((invoice) => ({
          id: invoice.id,
          number: invoice.invoiceNumber,
          documentDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          total: invoice.total,
          balanceDue: invoice.balanceDue,
        })),
        payables: payables.map((bill) => ({
          id: bill.id,
          number: bill.billNumber,
          documentDate: bill.billDate,
          dueDate: bill.dueDate,
          total: bill.total,
          balanceDue: bill.balanceDue,
        })),
        cashAccounts: cashAccounts.map((profile) => ({
          id: profile.account.id,
          code: profile.account.code,
          name: profile.displayName || profile.account.name,
          type: profile.account.type,
        })),
        cashLines,
        revenueLines,
        vatLines,
      },
      {
        asOf,
        asOfLabel: dateLabel(query.asOf ?? query.to, asOf),
        periodFrom,
        periodTo,
        periodFromLabel: dateLabel(query.from, periodFrom),
        periodToLabel: dateLabel(query.to ?? query.asOf, periodTo),
      },
    );
  }

  async agedReceivables(organizationId: string, query: ReportDateQuery) {
    const asOf = parseEndDate(query.asOf) ?? endOfToday();
    const branchId = cleanOptionalFilterId(query.branchId);
    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: SalesInvoiceStatus.FINALIZED,
        ...(branchId ? { branchId } : {}),
        balanceDue: { gt: "0.0000" },
        issueDate: { lte: asOf },
      },
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
      include: { customer: { select: { id: true, name: true, displayName: true } } },
    });

    return buildAgingReport(
      invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.invoiceNumber,
        contact: invoice.customer,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        total: invoice.total,
        balanceDue: invoice.balanceDue,
      })),
      { asOf: dateLabel(query.asOf, asOf), kind: "receivables" },
    );
  }

  async agedPayables(organizationId: string, query: ReportDateQuery) {
    const asOf = parseEndDate(query.asOf) ?? endOfToday();
    const branchId = cleanOptionalFilterId(query.branchId);
    const bills = await this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        status: PurchaseBillStatus.FINALIZED,
        ...(branchId ? { branchId } : {}),
        balanceDue: { gt: "0.0000" },
        billDate: { lte: asOf },
      },
      orderBy: [{ dueDate: "asc" }, { billDate: "asc" }],
      include: { supplier: { select: { id: true, name: true, displayName: true } } },
    });

    return buildAgingReport(
      bills.map((bill) => ({
        id: bill.id,
        number: bill.billNumber,
        contact: bill.supplier,
        issueDate: bill.billDate,
        dueDate: bill.dueDate,
        total: bill.total,
        balanceDue: bill.balanceDue,
      })),
      { asOf: dateLabel(query.asOf, asOf), kind: "payables" },
    );
  }

  async coreReport(organizationId: string, kind: CoreReportKind, query: ReportDateQuery) {
    switch (kind) {
      case "general-ledger":
        return this.generalLedger(organizationId, query);
      case "trial-balance":
        return this.trialBalance(organizationId, query);
      case "profit-and-loss":
        return this.profitAndLoss(organizationId, query);
      case "balance-sheet":
        return this.balanceSheet(organizationId, query);
      case "vat-summary":
        return this.vatSummary(organizationId, query);
      case "aged-receivables":
        return this.agedReceivables(organizationId, query);
      case "aged-payables":
        return this.agedPayables(organizationId, query);
    }
  }

  async coreReportCsvFile(organizationId: string, kind: CoreReportKind, query: ReportDateQuery) {
    const generatedAt = new Date();
    const report = await this.coreReport(organizationId, kind, query);
    return coreReportCsv(kind, report, generatedAt);
  }

  async vatReturnCsvFile(organizationId: string, query: ReportDateQuery) {
    const generatedAt = new Date();
    const report = await this.vatReturn(organizationId, query);
    return vatReturnCsv(report, generatedAt);
  }

  async coreReportPdf(
    organizationId: string,
    actorUserId: string,
    kind: CoreReportKind,
    query: ReportDateQuery,
  ): Promise<{ buffer: Buffer; filename: string; document: unknown | null }> {
    const generatedAt = new Date();
    const [organization, report, settings] = await Promise.all([
      this.organizationForPdf(organizationId),
      this.coreReport(organizationId, kind, query),
      this.documentSettingsService?.statementRenderSettings(organizationId),
    ]);
    const currency = organization.baseCurrency;
    const data = { organization, currency, ...(report as Record<string, unknown>), generatedAt };
    const buffer = await this.renderCoreReportPdf(kind, data as never, { ...settings, title: reportTitle(kind) });
    const filename = sanitizeFilename(`${kind}-${generatedAt.toISOString().slice(0, 10)}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: reportDocumentType(kind),
      sourceType: "AccountingReport",
      sourceId: reportSourceId(kind, query),
      documentNumber: filename.replace(/\.pdf$/i, ""),
      filename,
      buffer,
      generatedById: actorUserId,
    });
    return { buffer, filename, document: document ?? null };
  }

  private async findJournalLines(
    organizationId: string,
    filters: { from?: Date | null; to?: Date | null; before?: Date | null; accountId?: string; branchId?: string },
  ) {
    const entryDate: { gte?: Date; lte?: Date; lt?: Date } = {};
    if (filters.before) {
      entryDate.lt = filters.before;
    }
    if (filters.from) {
      entryDate.gte = filters.from;
    }
    if (filters.to) {
      entryDate.lte = filters.to;
    }

    return this.prisma.journalLine.findMany({
      where: {
        organizationId,
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        journalEntry: {
          status: { in: POSTED_REPORT_STATUSES },
          ...(Object.keys(entryDate).length ? { entryDate } : {}),
          ...journalEntryBranchFilter(organizationId, filters.branchId),
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            description: true,
            reference: true,
          },
        },
      },
      orderBy: [{ journalEntry: { entryDate: "asc" } }, { lineNumber: "asc" }],
    });
  }

  private async findDashboardJournalLines(
    organizationId: string,
    filters: {
      from?: Date | null;
      to?: Date | null;
      accountIds?: string[];
      accountType?: AccountType;
      accountCodes?: string[];
      branchId?: string;
    },
  ): Promise<DashboardLedgerLineInput[]> {
    const entryDate: { gte?: Date; lte?: Date } = {};
    if (filters.from) {
      entryDate.gte = filters.from;
    }
    if (filters.to) {
      entryDate.lte = filters.to;
    }
    const accountFilter =
      filters.accountType || filters.accountCodes?.length
        ? {
            is: {
              ...(filters.accountType ? { type: filters.accountType } : {}),
              ...(filters.accountCodes?.length ? { code: { in: filters.accountCodes } } : {}),
            },
          }
        : undefined;

    return this.prisma.journalLine.findMany({
      where: {
        organizationId,
        ...(filters.accountIds?.length ? { accountId: { in: filters.accountIds } } : {}),
        ...(accountFilter ? { account: accountFilter } : {}),
        journalEntry: {
          status: { in: POSTED_REPORT_STATUSES },
          ...(Object.keys(entryDate).length ? { entryDate } : {}),
          ...journalEntryBranchFilter(organizationId, filters.branchId),
        },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { id: true, code: true, name: true, type: true } },
        journalEntry: { select: { entryDate: true } },
      },
      orderBy: [{ journalEntry: { entryDate: "asc" } }, { lineNumber: "asc" }],
    });
  }

  private async organizationForPdf(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true, baseCurrency: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }
    return organization;
  }

  private renderCoreReportPdf(kind: CoreReportKind, data: never, settings: DocumentRenderSettings | undefined): Promise<Buffer> {
    switch (kind) {
      case "general-ledger":
        return renderGeneralLedgerReportPdf(data, settings);
      case "trial-balance":
        return renderTrialBalanceReportPdf(data, settings);
      case "profit-and-loss":
        return renderProfitAndLossReportPdf(data, settings);
      case "balance-sheet":
        return renderBalanceSheetReportPdf(data, settings);
      case "vat-summary":
        return renderVatSummaryReportPdf(data, settings);
      case "aged-receivables":
        return renderAgingReportPdf({ ...(data as Record<string, unknown>), title: "Aged Receivables" } as never, settings);
      case "aged-payables":
        return renderAgingReportPdf({ ...(data as Record<string, unknown>), title: "Aged Payables" } as never, settings);
    }
  }
}

function reportTitle(kind: CoreReportKind): string {
  switch (kind) {
    case "general-ledger":
      return "General Ledger";
    case "trial-balance":
      return "Trial Balance";
    case "profit-and-loss":
      return "Profit & Loss";
    case "balance-sheet":
      return "Balance Sheet";
    case "vat-summary":
      return "VAT Summary";
    case "aged-receivables":
      return "Aged Receivables";
    case "aged-payables":
      return "Aged Payables";
  }
}

function reportDocumentType(kind: CoreReportKind): DocumentType {
  switch (kind) {
    case "general-ledger":
      return DocumentType.REPORT_GENERAL_LEDGER;
    case "trial-balance":
      return DocumentType.REPORT_TRIAL_BALANCE;
    case "profit-and-loss":
      return DocumentType.REPORT_PROFIT_AND_LOSS;
    case "balance-sheet":
      return DocumentType.REPORT_BALANCE_SHEET;
    case "vat-summary":
      return DocumentType.REPORT_VAT_SUMMARY;
    case "aged-receivables":
      return DocumentType.REPORT_AGED_RECEIVABLES;
    case "aged-payables":
      return DocumentType.REPORT_AGED_PAYABLES;
  }
}

function reportSourceId(kind: CoreReportKind, query: ReportDateQuery): string {
  const params = new URLSearchParams();
  for (const key of ["from", "to", "asOf", "accountId", "branchId", "includeZero"] as const) {
    const value = query[key];
    if (value !== undefined && value !== null && value !== "") {
      const normalizedValue = String(value).trim();
      if (normalizedValue) {
        params.set(key, normalizedValue);
      }
    }
  }
  const suffix = params.toString();
  return suffix ? `${kind}?${suffix}` : kind;
}

function cleanOptionalFilterId(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function journalEntryBranchFilter(organizationId: string, branchId?: string) {
  if (!branchId) {
    return {};
  }
  return {
    OR: [
      { salesInvoice: { is: { organizationId, branchId } } },
      { voidedSalesInvoice: { is: { organizationId, branchId } } },
      { creditNote: { is: { organizationId, branchId } } },
      { voidedCreditNote: { is: { organizationId, branchId } } },
      { purchaseBill: { is: { organizationId, branchId } } },
      { voidedPurchaseBill: { is: { organizationId, branchId } } },
      { purchaseDebitNote: { is: { organizationId, branchId } } },
      { voidedPurchaseDebitNote: { is: { organizationId, branchId } } },
      { cashExpense: { is: { organizationId, branchId } } },
      { voidedCashExpense: { is: { organizationId, branchId } } },
    ],
  };
}

export function buildGeneralLedgerReport(
  accounts: ReportAccountInput[],
  openingLines: ReportJournalLineInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null; includeZero?: boolean },
) {
  const openingByAccount = aggregateLines(openingLines);
  const periodByAccount = aggregateLines(periodLines);
  const periodLinesByAccount = groupLines(periodLines);

  return {
    from: options.from,
    to: options.to,
    accounts: accounts
      .map((account) => {
        const opening = openingByAccount.get(account.id) ?? emptyAggregate();
        const period = periodByAccount.get(account.id) ?? emptyAggregate();
        const closingNet = opening.net.plus(period.net);
        const openingPair = debitCreditPair(opening.net);
        const closingPair = debitCreditPair(closingNet);
        let runningNet = opening.net;
        const lines = (periodLinesByAccount.get(account.id) ?? [])
          .sort(compareJournalLines)
          .map((line) => {
            runningNet = runningNet.plus(money(line.debit)).minus(money(line.credit));
            return {
              date: toIso(line.journalEntry.entryDate),
              journalEntryId: line.journalEntry.id,
              entryNumber: line.journalEntry.entryNumber,
              description: line.description ?? line.journalEntry.description,
              reference: line.journalEntry.reference ?? null,
              debit: fixed(line.debit),
              credit: fixed(line.credit),
              runningBalance: fixed(naturalBalance(account.type, runningNet)),
            };
          });

        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          openingDebit: openingPair.debit,
          openingCredit: openingPair.credit,
          periodDebit: fixed(period.debit),
          periodCredit: fixed(period.credit),
          closingDebit: closingPair.debit,
          closingCredit: closingPair.credit,
          lines,
          isZero: opening.net.eq(0) && period.debit.eq(0) && period.credit.eq(0),
        };
      })
      .filter((account) => options.includeZero || !account.isZero)
      .map(({ isZero: _isZero, ...account }) => account),
  };
}

export function buildTrialBalanceReport(
  accounts: ReportAccountInput[],
  openingLines: ReportJournalLineInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null; includeZero?: boolean },
) {
  const openingByAccount = aggregateLines(openingLines);
  const periodByAccount = aggregateLines(periodLines);
  const rows = accounts
    .map((account) => {
      const opening = openingByAccount.get(account.id) ?? emptyAggregate();
      const period = periodByAccount.get(account.id) ?? emptyAggregate();
      const closingNet = opening.net.plus(period.net);
      const openingPair = debitCreditPair(opening.net);
      const closingPair = debitCreditPair(closingNet);
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        openingDebit: openingPair.debit,
        openingCredit: openingPair.credit,
        periodDebit: fixed(period.debit),
        periodCredit: fixed(period.credit),
        closingDebit: closingPair.debit,
        closingCredit: closingPair.credit,
        isZero: opening.net.eq(0) && period.debit.eq(0) && period.credit.eq(0),
      };
    })
    .filter((account) => options.includeZero || !account.isZero)
    .map(({ isZero: _isZero, ...account }) => account);

  const totals = rows.reduce(
    (sum, row) => ({
      openingDebit: sum.openingDebit.plus(row.openingDebit),
      openingCredit: sum.openingCredit.plus(row.openingCredit),
      periodDebit: sum.periodDebit.plus(row.periodDebit),
      periodCredit: sum.periodCredit.plus(row.periodCredit),
      closingDebit: sum.closingDebit.plus(row.closingDebit),
      closingCredit: sum.closingCredit.plus(row.closingCredit),
    }),
    {
      openingDebit: ZERO,
      openingCredit: ZERO,
      periodDebit: ZERO,
      periodCredit: ZERO,
      closingDebit: ZERO,
      closingCredit: ZERO,
    },
  );

  return {
    from: options.from,
    to: options.to,
    accounts: rows,
    totals: {
      openingDebit: fixed(totals.openingDebit),
      openingCredit: fixed(totals.openingCredit),
      periodDebit: fixed(totals.periodDebit),
      periodCredit: fixed(totals.periodCredit),
      closingDebit: fixed(totals.closingDebit),
      closingCredit: fixed(totals.closingCredit),
      balanced: totals.closingDebit.eq(totals.closingCredit),
    },
  };
}

export function buildProfitAndLossReport(
  accounts: ReportAccountInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null },
) {
  const periodByAccount = aggregateLines(periodLines);
  const sectionTypes = [AccountType.REVENUE, AccountType.COST_OF_SALES, AccountType.EXPENSE] as const;
  const sections = sectionTypes.map((type) => {
    const rows = accounts
      .filter((account) => account.type === type)
      .map((account) => {
        const period = periodByAccount.get(account.id) ?? emptyAggregate();
        const amount = type === AccountType.REVENUE ? period.credit.minus(period.debit) : period.debit.minus(period.credit);
        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          amount: fixed(amount),
          isZero: amount.eq(0),
        };
      })
      .filter((account) => !account.isZero)
      .map(({ isZero: _isZero, ...account }) => account);
    const total = rows.reduce((sum, row) => sum.plus(row.amount), ZERO);
    return { type, total: fixed(total), accounts: rows };
  });
  const revenue = decimalSection(sections, AccountType.REVENUE);
  const costOfSales = decimalSection(sections, AccountType.COST_OF_SALES);
  const expenses = decimalSection(sections, AccountType.EXPENSE);
  const grossProfit = revenue.minus(costOfSales);
  const netProfit = grossProfit.minus(expenses);

  return {
    from: options.from,
    to: options.to,
    revenue: fixed(revenue),
    costOfSales: fixed(costOfSales),
    grossProfit: fixed(grossProfit),
    expenses: fixed(expenses),
    netProfit: fixed(netProfit),
    sections,
  };
}

export function buildBalanceSheetReport(
  accounts: ReportAccountInput[],
  lines: ReportJournalLineInput[],
  options: { asOf: string | null },
) {
  const byAccount = aggregateLines(lines);
  const section = (type: AccountType) => {
    const rows = accounts
      .filter((account) => account.type === type)
      .map((account) => {
        const aggregate = byAccount.get(account.id) ?? emptyAggregate();
        const amount = type === AccountType.ASSET ? aggregate.debit.minus(aggregate.credit) : aggregate.credit.minus(aggregate.debit);
        return { accountId: account.id, code: account.code, name: account.name, type, amount: fixed(amount), isZero: amount.eq(0) };
      })
      .filter((row) => !row.isZero)
      .map(({ isZero: _isZero, ...row }) => row);
    return { total: fixed(rows.reduce((sum, row) => sum.plus(row.amount), ZERO)), accounts: rows };
  };
  const assets = section(AccountType.ASSET);
  const liabilities = section(AccountType.LIABILITY);
  const equity = section(AccountType.EQUITY);
  const profitAndLoss = buildProfitAndLossReport(
    accounts.filter((account) => isProfitAndLossAccountType(account.type)),
    lines,
    { from: null, to: options.asOf },
  );
  const retainedEarnings = money(profitAndLoss.netProfit);
  const totalAssets = money(assets.total);
  const totalLiabilitiesAndEquity = money(liabilities.total).plus(equity.total).plus(retainedEarnings);
  const difference = totalAssets.minus(totalLiabilitiesAndEquity);

  return {
    asOf: options.asOf,
    assets,
    liabilities,
    equity,
    retainedEarnings: fixed(retainedEarnings),
    totalAssets: fixed(totalAssets),
    totalLiabilitiesAndEquity: fixed(totalLiabilitiesAndEquity),
    difference: fixed(difference),
    balanced: difference.eq(0),
  };
}

export function buildVatSummaryReport(
  vatAccounts: ReportAccountInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null },
) {
  const byAccount = aggregateLines(periodLines);
  const vatPayable = vatAccounts.find((account) => account.code === "220");
  const vatReceivable = vatAccounts.find((account) => account.code === "230");
  const payable = vatPayable ? byAccount.get(vatPayable.id) ?? emptyAggregate() : emptyAggregate();
  const receivable = vatReceivable ? byAccount.get(vatReceivable.id) ?? emptyAggregate() : emptyAggregate();
  const salesVat = payable.credit.minus(payable.debit);
  const purchaseVat = receivable.debit.minus(receivable.credit);
  const netVatPayable = salesVat.minus(purchaseVat);

  return {
    from: options.from,
    to: options.to,
    salesVat: fixed(salesVat),
    purchaseVat: fixed(purchaseVat),
    netVatPayable: fixed(netVatPayable),
    sections: [
      { category: "SALES_VAT_PAYABLE", accountCode: "220", amount: "0.0000", taxAmount: fixed(salesVat) },
      { category: "PURCHASE_VAT_RECEIVABLE", accountCode: "230", amount: "0.0000", taxAmount: fixed(purchaseVat) },
    ],
    notes: [
      "This is not an official VAT return filing report yet.",
      "VAT summary is derived from posted journal activity in VAT Payable 220 and VAT Receivable 230.",
    ],
  };
}

export function buildVatReturnReport(
  salesDocuments: VatReturnDocumentInput[],
  purchaseDocuments: VatReturnDocumentInput[],
  options: { from: string | null; to: string | null },
) {
  const sales = summarizeVatReturnDocuments(salesDocuments);
  const purchases = summarizeVatReturnDocuments(purchaseDocuments);
  const outputVat = money(sales.taxAmount);
  const inputVat = money(purchases.taxAmount);
  const netVat = outputVat.minus(inputVat);

  return {
    from: options.from,
    to: options.to,
    basis: "FINALIZED_SOURCE_DOCUMENTS",
    outputVat: fixed(outputVat),
    inputVat: fixed(inputVat),
    netVat: fixed(netVat),
    netVatPayable: fixed(Decimal.max(netVat, ZERO)),
    netVatRefundable: fixed(Decimal.max(netVat.negated(), ZERO)),
    sales,
    purchases,
    notes: [
      "VAT return foundation is calculated from finalized sales invoices and finalized purchase bills in the selected date range.",
      "Draft and voided documents are excluded; this internal review report does not submit a tax return or create a filing record.",
      "Internal CSV export is a draft review aid only. Government-format filing, ZATCA exchange, and compliance approval are not implemented.",
    ],
  };
}

export function buildTopCustomersReport(
  invoices: TopCustomerInvoiceInput[],
  options: { from: string | null; to: string | null; limit?: number },
) {
  const limit = options.limit ?? 10;
  const byCustomer = new Map<
    string,
    {
      customer: TopCustomerInvoiceInput["customer"];
      invoiceCount: number;
      taxableAmount: Decimal;
      taxAmount: Decimal;
      grossAmount: Decimal;
      latestInvoiceDate: Date | null;
    }
  >();
  const totals = invoices.reduce(
    (sum, invoice) => ({
      taxableAmount: sum.taxableAmount.plus(money(invoice.taxableTotal)),
      taxAmount: sum.taxAmount.plus(money(invoice.taxTotal)),
      grossAmount: sum.grossAmount.plus(money(invoice.total)),
    }),
    { taxableAmount: ZERO, taxAmount: ZERO, grossAmount: ZERO },
  );

  for (const invoice of invoices) {
    const current =
      byCustomer.get(invoice.customer.id) ??
      {
        customer: invoice.customer,
        invoiceCount: 0,
        taxableAmount: ZERO,
        taxAmount: ZERO,
        grossAmount: ZERO,
        latestInvoiceDate: null,
      };
    const invoiceDate = new Date(invoice.documentDate);
    current.invoiceCount += 1;
    current.taxableAmount = current.taxableAmount.plus(money(invoice.taxableTotal));
    current.taxAmount = current.taxAmount.plus(money(invoice.taxTotal));
    current.grossAmount = current.grossAmount.plus(money(invoice.total));
    current.latestInvoiceDate =
      current.latestInvoiceDate && current.latestInvoiceDate.getTime() > invoiceDate.getTime() ? current.latestInvoiceDate : invoiceDate;
    byCustomer.set(invoice.customer.id, current);
  }

  const rows = Array.from(byCustomer.values())
    .sort((a, b) => {
      const amountDelta = b.grossAmount.comparedTo(a.grossAmount);
      if (amountDelta !== 0) {
        return amountDelta;
      }
      return displayContactName(a.customer).localeCompare(displayContactName(b.customer));
    })
    .slice(0, limit)
    .map((row) => ({
      customer: row.customer,
      invoiceCount: row.invoiceCount,
      taxableAmount: fixed(row.taxableAmount),
      taxAmount: fixed(row.taxAmount),
      grossAmount: fixed(row.grossAmount),
      latestInvoiceDate: row.latestInvoiceDate ? row.latestInvoiceDate.toISOString() : null,
    }));

  return {
    from: options.from,
    to: options.to,
    basis: "FINALIZED_SALES_INVOICES",
    limit,
    rows,
    totals: {
      customerCount: byCustomer.size,
      invoiceCount: invoices.length,
      taxableAmount: fixed(totals.taxableAmount),
      taxAmount: fixed(totals.taxAmount),
      grossAmount: fixed(totals.grossAmount),
    },
    notes: [
      "Top customers are ranked by finalized sales invoices in the selected period.",
      "This report does not net credit notes, refunds, delivery notes, quotes, recurring templates, or payment timing.",
    ],
  };
}

export function buildTopProductsServicesReport(
  lines: TopProductsServicesLineInput[],
  options: { from: string | null; to: string | null; limit?: number },
) {
  const limit = options.limit ?? 10;
  const byProductService = new Map<
    string,
    {
      kind: "CATALOG_ITEM" | "UNCATALOGED_LINE";
      label: string;
      item: TopProductsServicesLineInput["item"];
      lineCount: number;
      quantity: Decimal;
      taxableAmount: Decimal;
      taxAmount: Decimal;
      grossAmount: Decimal;
      latestInvoiceDate: Date | null;
    }
  >();
  const totals = lines.reduce(
    (sum, line) => ({
      quantity: sum.quantity.plus(money(line.quantity)),
      taxableAmount: sum.taxableAmount.plus(money(line.taxableAmount)),
      taxAmount: sum.taxAmount.plus(money(line.taxAmount)),
      grossAmount: sum.grossAmount.plus(money(line.lineTotal)),
    }),
    { quantity: ZERO, taxableAmount: ZERO, taxAmount: ZERO, grossAmount: ZERO },
  );

  for (const line of lines) {
    const key = productServiceKey(line);
    const current =
      byProductService.get(key) ??
      {
        kind: line.item ? ("CATALOG_ITEM" as const) : ("UNCATALOGED_LINE" as const),
        label: productServiceLabel(line),
        item: line.item,
        lineCount: 0,
        quantity: ZERO,
        taxableAmount: ZERO,
        taxAmount: ZERO,
        grossAmount: ZERO,
        latestInvoiceDate: null,
      };
    const invoiceDate = new Date(line.invoice.issueDate);
    current.lineCount += 1;
    current.quantity = current.quantity.plus(money(line.quantity));
    current.taxableAmount = current.taxableAmount.plus(money(line.taxableAmount));
    current.taxAmount = current.taxAmount.plus(money(line.taxAmount));
    current.grossAmount = current.grossAmount.plus(money(line.lineTotal));
    current.latestInvoiceDate =
      current.latestInvoiceDate && current.latestInvoiceDate.getTime() > invoiceDate.getTime() ? current.latestInvoiceDate : invoiceDate;
    byProductService.set(key, current);
  }

  const rows = Array.from(byProductService.values())
    .sort((a, b) => {
      const amountDelta = b.grossAmount.comparedTo(a.grossAmount);
      if (amountDelta !== 0) {
        return amountDelta;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, limit)
    .map((row) => ({
      kind: row.kind,
      label: row.label,
      item: row.item,
      lineCount: row.lineCount,
      quantity: fixed(row.quantity),
      taxableAmount: fixed(row.taxableAmount),
      taxAmount: fixed(row.taxAmount),
      grossAmount: fixed(row.grossAmount),
      latestInvoiceDate: row.latestInvoiceDate ? row.latestInvoiceDate.toISOString() : null,
    }));

  return {
    from: options.from,
    to: options.to,
    basis: "FINALIZED_SALES_INVOICE_LINES",
    limit,
    rows,
    totals: {
      lineCount: lines.length,
      catalogItemCount: Array.from(byProductService.values()).filter((row) => row.kind === "CATALOG_ITEM").length,
      uncatalogedLineGroupCount: Array.from(byProductService.values()).filter((row) => row.kind === "UNCATALOGED_LINE").length,
      quantity: fixed(totals.quantity),
      taxableAmount: fixed(totals.taxableAmount),
      taxAmount: fixed(totals.taxAmount),
      grossAmount: fixed(totals.grossAmount),
    },
    notes: [
      "Top products and services are ranked by finalized sales invoice lines in the selected period.",
      "Uncataloged lines are grouped by line description.",
      "This report does not net credit notes, refunds, returns, delivery notes, quotes, recurring templates, cost of goods sold, or profitability.",
    ],
  };
}

export function buildFinancialDashboardSummary(
  input: {
    receivables: DashboardOpenDocumentInput[];
    payables: DashboardOpenDocumentInput[];
    cashAccounts: ReportAccountInput[];
    cashLines: DashboardLedgerLineInput[];
    revenueLines: DashboardLedgerLineInput[];
    vatLines: DashboardLedgerLineInput[];
  },
  options: {
    asOf: Date;
    asOfLabel: string | null;
    periodFrom: Date;
    periodTo: Date;
    periodFromLabel: string | null;
    periodToLabel: string | null;
  },
) {
  const receivables = summarizeOpenDocuments(input.receivables, options.asOf);
  const payables = summarizeOpenDocuments(input.payables, options.asOf);
  const cashBalanceByAccount = aggregateNaturalAssetLines(input.cashLines);
  const cashBalance = Array.from(cashBalanceByAccount.values()).reduce((sum, balance) => sum.plus(balance), ZERO);
  const revenue = input.revenueLines.reduce((sum, line) => sum.plus(money(line.credit)).minus(money(line.debit)), ZERO);
  const vatTotals = input.vatLines.reduce(
    (sum, line) => {
      if (line.account.code === "220") {
        sum.outputVat = sum.outputVat.plus(money(line.credit)).minus(money(line.debit));
      }
      if (line.account.code === "230") {
        sum.inputVat = sum.inputVat.plus(money(line.debit)).minus(money(line.credit));
      }
      return sum;
    },
    { outputVat: ZERO, inputVat: ZERO },
  );
  const netVat = vatTotals.outputVat.minus(vatTotals.inputVat);

  return {
    asOf: options.asOfLabel,
    period: {
      from: options.periodFromLabel,
      to: options.periodToLabel,
    },
    receivables,
    payables,
    cashAndBank: {
      balance: fixed(cashBalance),
      accountCount: input.cashAccounts.length,
      accounts: input.cashAccounts.map((account) => ({
        accountId: account.id,
        code: account.code,
        name: account.name,
        balance: fixed(cashBalanceByAccount.get(account.id) ?? ZERO),
      })),
    },
    revenue: {
      currentPeriod: fixed(revenue),
    },
    vat: {
      outputVat: fixed(vatTotals.outputVat),
      inputVat: fixed(vatTotals.inputVat),
      netVat: fixed(netVat),
      netVatPayable: fixed(Decimal.max(netVat, ZERO)),
      netVatRefundable: fixed(Decimal.max(netVat.negated(), ZERO)),
    },
    ledgerBasis: "POSTED_AND_REVERSED_JOURNALS",
  };
}

export function buildAgingReport(documents: AgingDocumentInput[], options: { asOf: string | null; kind: "receivables" | "payables" }) {
  const asOf = parseEndDate(options.asOf) ?? endOfToday();
  const rows = documents.map((document) => {
    const dueDate = document.dueDate ?? document.issueDate;
    const daysOverdue = daysBetween(endOfDay(dueDate), asOf);
    const bucket = agingBucket(daysOverdue);
    return {
      id: document.id,
      contact: document.contact,
      number: document.number,
      issueDate: toIso(document.issueDate),
      dueDate: document.dueDate ? toIso(document.dueDate) : null,
      total: fixed(document.total),
      balanceDue: fixed(document.balanceDue),
      daysOverdue,
      bucket,
    };
  });
  const bucketTotals = emptyBucketTotals();
  for (const row of rows) {
    bucketTotals[row.bucket] = fixed(money(bucketTotals[row.bucket]).plus(row.balanceDue));
  }
  const grandTotal = rows.reduce((sum, row) => sum.plus(row.balanceDue), ZERO);
  return { asOf: dateLabel(options.asOf, asOf), kind: options.kind, rows, bucketTotals, grandTotal: fixed(grandTotal) };
}

export function agingBucket(daysOverdue: number): "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS" {
  if (daysOverdue <= 0) {
    return "CURRENT";
  }
  if (daysOverdue <= 30) {
    return "1_30";
  }
  if (daysOverdue <= 60) {
    return "31_60";
  }
  if (daysOverdue <= 90) {
    return "61_90";
  }
  return "90_PLUS";
}

function aggregateLines(lines: ReportJournalLineInput[]) {
  const map = new Map<string, ReturnType<typeof emptyAggregate>>();
  for (const line of lines) {
    const aggregate = map.get(line.accountId) ?? emptyAggregate();
    aggregate.debit = aggregate.debit.plus(money(line.debit));
    aggregate.credit = aggregate.credit.plus(money(line.credit));
    aggregate.net = aggregate.debit.minus(aggregate.credit);
    map.set(line.accountId, aggregate);
  }
  return map;
}

function groupLines(lines: ReportJournalLineInput[]) {
  const map = new Map<string, ReportJournalLineInput[]>();
  for (const line of lines) {
    map.set(line.accountId, [...(map.get(line.accountId) ?? []), line]);
  }
  return map;
}

function emptyAggregate() {
  return { debit: ZERO, credit: ZERO, net: ZERO };
}

function summarizeVatReturnDocuments(documents: VatReturnDocumentInput[]) {
  const totals = documents.reduce(
    (sum, document) => ({
      taxableAmount: sum.taxableAmount.plus(money(document.taxableTotal)),
      taxAmount: sum.taxAmount.plus(money(document.taxTotal)),
      grossAmount: sum.grossAmount.plus(money(document.total)),
    }),
    { taxableAmount: ZERO, taxAmount: ZERO, grossAmount: ZERO },
  );

  return {
    documentCount: documents.length,
    taxableAmount: fixed(totals.taxableAmount),
    taxAmount: fixed(totals.taxAmount),
    grossAmount: fixed(totals.grossAmount),
    documents: documents.map((document) => ({
      id: document.id,
      number: document.number,
      documentDate: toIso(document.documentDate),
      taxableAmount: fixed(document.taxableTotal),
      taxAmount: fixed(document.taxTotal),
      grossAmount: fixed(document.total),
    })),
  };
}

function summarizeOpenDocuments(documents: DashboardOpenDocumentInput[], asOf: Date) {
  const rows = documents.map((document) => {
    const overdue = document.dueDate ? endOfDay(document.dueDate).getTime() < asOf.getTime() : false;
    return {
      id: document.id,
      number: document.number,
      documentDate: toIso(document.documentDate),
      dueDate: document.dueDate ? toIso(document.dueDate) : null,
      total: fixed(document.total),
      balanceDue: fixed(document.balanceDue),
      overdue,
    };
  });
  const totals = rows.reduce(
    (sum, row) => {
      const balanceDue = money(row.balanceDue);
      sum.total = sum.total.plus(balanceDue);
      if (row.overdue) {
        sum.overdue = sum.overdue.plus(balanceDue);
        sum.overdueDocumentCount += 1;
      }
      return sum;
    },
    { total: ZERO, overdue: ZERO, overdueDocumentCount: 0 },
  );

  return {
    total: fixed(totals.total),
    overdue: fixed(totals.overdue),
    documentCount: rows.length,
    overdueDocumentCount: totals.overdueDocumentCount,
    documents: rows,
  };
}

function aggregateNaturalAssetLines(lines: DashboardLedgerLineInput[]) {
  const balances = new Map<string, Decimal>();
  for (const line of lines) {
    balances.set(line.account.id, (balances.get(line.account.id) ?? ZERO).plus(money(line.debit)).minus(money(line.credit)));
  }
  return balances;
}

function debitCreditPair(net: Decimal) {
  return net.greaterThanOrEqualTo(0) ? { debit: fixed(net), credit: "0.0000" } : { debit: "0.0000", credit: fixed(net.abs()) };
}

function naturalBalance(type: AccountType, net: Decimal) {
  return isDebitPositiveType(type) ? net : net.negated();
}

function isDebitPositiveType(type: AccountType): boolean {
  return type === AccountType.ASSET || type === AccountType.EXPENSE || type === AccountType.COST_OF_SALES;
}

function isProfitAndLossAccountType(type: AccountType): boolean {
  return type === AccountType.REVENUE || type === AccountType.COST_OF_SALES || type === AccountType.EXPENSE;
}

function compareJournalLines(a: ReportJournalLineInput, b: ReportJournalLineInput) {
  const dateDelta = new Date(a.journalEntry.entryDate).getTime() - new Date(b.journalEntry.entryDate).getTime();
  if (dateDelta !== 0) {
    return dateDelta;
  }
  const entryDelta = a.journalEntry.entryNumber.localeCompare(b.journalEntry.entryNumber);
  if (entryDelta !== 0) {
    return entryDelta;
  }
  return (a.lineNumber ?? 0) - (b.lineNumber ?? 0);
}

function decimalSection(sections: Array<{ type: AccountType; total: string }>, type: AccountType): Decimal {
  return money(sections.find((section) => section.type === type)?.total ?? "0");
}

function parseRange(query: ReportDateQuery) {
  const from = parseStartDate(query.from);
  const to = parseEndDate(query.to);
  return {
    from,
    to,
    fromLabel: dateLabel(query.from, from),
    toLabel: dateLabel(query.to, to),
  };
}

function dateRangeFilter(from: Date | null, to: Date | null): { gte?: Date; lte?: Date } | null {
  if (!from && !to) {
    return null;
  }
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
}

function parseStartDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  return dateOnly(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
}

function parseEndDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  return dateOnly(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}

function dateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateLabel(input: string | undefined | null, date: Date | null): string | null {
  if (input && dateOnly(input)) {
    return input;
  }
  return date ? date.toISOString().slice(0, 10) : null;
}

function startOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
}

function endOfDay(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function emptyBucketTotals(): Record<ReturnType<typeof agingBucket>, string> {
  return {
    CURRENT: "0.0000",
    "1_30": "0.0000",
    "31_60": "0.0000",
    "61_90": "0.0000",
    "90_PLUS": "0.0000",
  };
}

function boolQuery(value: string | boolean | undefined): boolean {
  return value === true || value === "true" || value === "1";
}

function parseReportLimit(value: string | number | undefined, fallback = 10, max = 50): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.trunc(parsed), max);
}

function displayContactName(contact: { name: string; displayName?: string | null }): string {
  return contact.displayName || contact.name;
}

function productServiceKey(line: TopProductsServicesLineInput): string {
  if (line.item) {
    return `item:${line.item.id}`;
  }
  return `description:${productServiceLabel(line).toLowerCase()}`;
}

function productServiceLabel(line: TopProductsServicesLineInput): string {
  return line.item?.name || line.description.trim() || "Uncataloged sales line";
}

function fixed(value: unknown): string {
  return money(value).toFixed(4);
}

function money(value: unknown): Decimal {
  return new Decimal(value === undefined || value === null || value === "" ? 0 : String(value));
}

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}
