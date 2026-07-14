import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  DocumentType,
  DimensionStatus,
  JournalEntryStatus,
  Prisma,
  PurchaseBillStatus,
  ReportPackStatus,
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
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { countFxSourceActivityAfter } from "../foreign-exchange/fx-historical-activity";
import { advancedReportCsv, AdvancedReportKind, coreReportCsv, CoreReportKind, vatReturnCsv } from "./report-csv";
import {
  REPORT_PACK_SUPPORTED_REPORTS,
  buildReportPackManifest,
  type ReportPackManifest,
  type ReportPackReportKind,
} from "./report-pack-manifest";

const POSTED_REPORT_STATUSES = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];
const ZERO = new Decimal(0);

export interface ReportDateQuery {
  from?: string;
  to?: string;
  asOf?: string;
  accountId?: string;
  branchId?: string;
  costCenterId?: string;
  projectId?: string;
  transactionCurrency?: string;
  includeZero?: string | boolean;
  limit?: string | number;
  format?: "json" | "csv" | string;
}

export interface ReportDimensionFilterMetadata {
  id: string;
  code: string;
  name: string;
  status: DimensionStatus;
}

export interface ReportDimensionFilters {
  costCenter: ReportDimensionFilterMetadata | null;
  project: ReportDimensionFilterMetadata | null;
}

export interface ReportAccountingContext {
  baseCurrency: string;
  amountBasis: "BASE_CURRENCY";
}

interface ResolvedReportDimensions {
  filters: ReportDimensionFilters;
  lineFilters: { costCenterId?: string; projectId?: string };
}

export interface ReportPackManifestPreviewQuery {
  reportKinds?: string | string[];
}

export interface ReportPackCreateInput extends ReportPackManifestPreviewQuery {
  title?: string;
  from?: string;
  to?: string;
  asOf?: string;
  branchId?: string;
  costCenterId?: string;
  projectId?: string;
  transactionCurrency?: string;
}

export interface ReportPackListQuery {
  status?: string;
  limit?: string | number;
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
  transactionDebit?: unknown | null;
  transactionCredit?: unknown | null;
  currency?: string;
  exchangeRate?: unknown;
  rateSnapshotId?: string | null;
  rateSnapshot?: {
    id: string;
    rateDate: string | Date;
    source: string;
    sourceReference?: string | null;
  } | null;
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
  currency?: string | null;
  baseCurrency?: string | null;
  exchangeRate?: unknown | null;
  transactionTotal?: unknown | null;
  transactionBalanceDue?: unknown | null;
  fxMonetaryBalance?: {
    openTransactionAmount: unknown;
    sourceBaseOpenAmount: unknown;
    carryingBaseAmount: unknown;
    carryingRate: unknown;
    rateSnapshot: {
      id: string;
      rateDate: string | Date;
      source: string;
      sourceReference?: string | null;
    };
    lastRevaluationLine: { id: string; revaluationRunId: string; revaluationRun?: { status: string } };
  } | null;
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

export interface DashboardLedgerLineInput {
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
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  reportPackManifestPreview(
    organizationId: string,
    requestedByUserId: string,
    query: ReportPackManifestPreviewQuery = {},
  ): ReportPackManifest {
    const reportKinds = parseReportPackManifestPreviewKinds(query.reportKinds);
    return buildReportPackManifest({
      id: "report-pack-manifest-preview",
      organizationId,
      title: "Report pack manifest preview",
      createdAt: new Date().toISOString(),
      requestedByUserId,
      items: reportKinds.map((reportKind) => ({
        id: `preview-${reportKind}`,
        reportKind,
        query: {},
        reviewStatus: "NEEDS_REVIEW",
      })),
    });
  }

  async createReportPack(
    organizationId: string,
    requestedByUserId: string,
    input: ReportPackCreateInput = {},
    request?: { requestId?: string },
  ): Promise<ReportPackManifest> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, name: true, baseCurrency: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const id = randomUUID();
    const now = new Date();
    const query = reportPackReportQuery(input);
    const reportKinds = parseReportPackManifestPreviewKinds(input.reportKinds);
    const manifest = buildReportPackManifest({
      id,
      organizationId,
      title: cleanReportPackTitle(input.title) ?? "Local accountant review pack",
      createdAt: now.toISOString(),
      generatedAt: now.toISOString(),
      requestedByUserId,
      requestedBy: { id: requestedByUserId },
      organization,
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
        asOf: query.asOf ?? null,
      },
      requestId: request?.requestId ?? null,
      status: "READY_LOCAL",
      items: reportKinds.map((reportKind) => ({
        id: `${id}-${reportKind}`,
        reportKind,
        query,
        reviewStatus: "READY_FOR_REVIEW",
      })),
    });

    await this.logReportPackAudit({
      organizationId,
      actorUserId: requestedByUserId,
      action: AUDIT_EVENTS.REPORT_PACK_GENERATION_REQUESTED,
      entityId: id,
      request,
      after: reportPackAuditSummary(manifest),
    });

    const record = await this.prisma.reportPack.create({
      data: {
        id,
        organizationId,
        title: manifest.title,
        status: ReportPackStatus.READY_LOCAL,
        periodFrom: manifest.period.from,
        periodTo: manifest.period.to,
        periodAsOf: manifest.period.asOf,
        manifestJson: manifest as unknown as Prisma.InputJsonObject,
        requestId: manifest.requestId,
        requestedById: requestedByUserId,
        generatedAt: now,
      },
      include: { requestedBy: { select: { id: true, name: true } }, organization: { select: { id: true, name: true, baseCurrency: true } } },
    });

    await this.logReportPackAudit({
      organizationId,
      actorUserId: requestedByUserId,
      action: AUDIT_EVENTS.REPORT_PACK_GENERATED,
      entityId: id,
      request,
      after: reportPackAuditSummary(manifest),
    });

    return this.toReportPackManifest(record);
  }

  async listReportPacks(organizationId: string, query: ReportPackListQuery = {}) {
    const status = parseReportPackStatusFilter(query.status);
    const limit = parseReportPackLimit(query.limit);
    const packs = await this.prisma.reportPack.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { requestedBy: { select: { id: true, name: true } }, organization: { select: { id: true, name: true, baseCurrency: true } } },
    });

    return {
      data: packs.map((pack) => this.toReportPackManifest(pack)),
      pagination: {
        limit,
        total: packs.length,
        hasMore: packs.length === limit,
      },
    };
  }

  async getReportPack(organizationId: string, id: string): Promise<ReportPackManifest> {
    const pack = await this.prisma.reportPack.findFirst({
      where: { id, organizationId },
      include: { requestedBy: { select: { id: true, name: true } }, organization: { select: { id: true, name: true, baseCurrency: true } } },
    });
    if (!pack) {
      throw new NotFoundException("Report pack not found.");
    }
    return this.toReportPackManifest(pack);
  }

  async reportPackDownloadReadiness(
    organizationId: string,
    actorUserId: string,
    id: string,
    request?: { requestId?: string },
  ) {
    const before = await this.getReportPack(organizationId, id);

    await this.logReportPackAudit({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.REPORT_PACK_DOWNLOAD_ATTEMPTED,
      entityId: id,
      request,
      after: {
        packDownloadEnabled: false,
        storageProvider: "disabled",
        signedUrlEnabled: false,
      },
    });

    const updated = await this.prisma.reportPack.update({
      where: { id },
      data: { status: ReportPackStatus.DOWNLOAD_BLOCKED },
      include: { requestedBy: { select: { id: true, name: true } }, organization: { select: { id: true, name: true } } },
    });
    if (updated.organizationId !== organizationId) {
      throw new NotFoundException("Report pack not found.");
    }

    const manifest = this.toReportPackManifest(updated);
    await this.logReportPackAudit({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.REPORT_PACK_DOWNLOAD_BLOCKED,
      entityId: id,
      request,
      before: reportPackAuditSummary(before),
      after: reportPackAuditSummary(manifest),
    });

    return {
      id,
      status: "DOWNLOAD_BLOCKED" as const,
      downloadEnabled: false,
      storageProvider: "disabled" as const,
      signedUrlEnabled: false,
      reason: manifest.downloadReadiness.reason,
      manifest,
    };
  }

  private toReportPackManifest(record: {
    id: string;
    organizationId: string;
    title: string;
    status: ReportPackStatus;
    periodFrom: string | null;
    periodTo: string | null;
    periodAsOf: string | null;
    manifestJson: Prisma.JsonValue;
    requestId: string | null;
    requestedById: string | null;
    generatedAt: Date | null;
    createdAt: Date;
    requestedBy?: { id: string; name: string | null } | null;
    organization?: { id: string; name: string | null; baseCurrency?: string | null } | null;
  }): ReportPackManifest {
    const manifest = isReportPackManifest(record.manifestJson)
      ? (record.manifestJson as unknown as ReportPackManifest)
      : buildReportPackManifest({
          id: record.id,
          organizationId: record.organizationId,
          title: record.title,
          createdAt: record.createdAt.toISOString(),
          generatedAt: record.generatedAt?.toISOString() ?? null,
          requestedByUserId: record.requestedById ?? "",
          requestedBy: record.requestedBy ?? undefined,
          organization: record.organization ?? undefined,
          period: { from: record.periodFrom, to: record.periodTo, asOf: record.periodAsOf },
          requestId: record.requestId,
          status: record.status,
          items: REPORT_PACK_SUPPORTED_REPORTS.map((report) => ({
            id: `${record.id}-${report.kind}`,
            reportKind: report.kind,
            query: reportPackReportQuery({ from: record.periodFrom ?? undefined, to: record.periodTo ?? undefined, asOf: record.periodAsOf ?? undefined }),
            reviewStatus: "READY_FOR_REVIEW",
          })),
        });

    return {
      ...manifest,
      id: record.id,
      organizationId: record.organizationId,
      title: record.title,
      status: record.status,
      generatedAt: record.generatedAt?.toISOString() ?? manifest.generatedAt,
      requestId: record.requestId ?? manifest.requestId,
      requestedByUserId: record.requestedById ?? manifest.requestedByUserId,
      requestedBy: record.requestedBy
        ? { id: record.requestedBy.id, name: record.requestedBy.name ?? null }
        : manifest.requestedBy,
      organization: record.organization
        ? { id: record.organization.id, name: record.organization.name ?? null, baseCurrency: record.organization.baseCurrency ?? manifest.accountingContext?.baseCurrency ?? null }
        : manifest.organization,
      accountingContext: manifest.accountingContext ?? {
        baseCurrency: record.organization?.baseCurrency ?? null,
        amountBasis: "BASE_CURRENCY",
      },
      period: {
        from: record.periodFrom ?? manifest.period.from,
        to: record.periodTo ?? manifest.period.to,
        asOf: record.periodAsOf ?? manifest.period.asOf,
      },
    };
  }

  private async logReportPackAudit(input: {
    organizationId: string;
    actorUserId: string;
    action: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    request?: { requestId?: string };
  }): Promise<void> {
    await this.auditLogService?.log({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: AUDIT_ENTITY_TYPES.REPORT_PACK,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      request: input.request as never,
    });
  }

  async generalLedger(organizationId: string, query: ReportDateQuery) {
    const dimensions = await this.resolveReportDimensions(organizationId, query);
    const transactionCurrency = normalizeTransactionCurrencyFilter(query.transactionCurrency);
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, ...(query.accountId ? { id: query.accountId } : {}) },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const openingLines = range.from
      ? await this.findJournalLines(organizationId, {
          before: range.from,
          accountId: query.accountId,
          branchId,
          transactionCurrency,
          ...dimensions.lineFilters,
        })
      : [];
    const periodLines = await this.findJournalLines(organizationId, {
      from: range.from,
      to: range.to,
      accountId: query.accountId,
      branchId,
      transactionCurrency,
      ...dimensions.lineFilters,
    });

    return {
      ...buildGeneralLedgerReport(accounts, openingLines, periodLines, {
        from: range.fromLabel,
        to: range.toLabel,
        includeZero: boolQuery(query.includeZero),
      }),
      filters: dimensions.filters,
      fxFilters: { transactionCurrency },
    };
  }

  async trialBalance(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    const dimensions = await this.resolveReportDimensions(organizationId, query);
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const openingLines = range.from
      ? await this.findJournalLines(organizationId, { before: range.from, branchId, ...dimensions.lineFilters })
      : [];
    const periodLines = await this.findJournalLines(organizationId, {
      from: range.from,
      to: range.to,
      branchId,
      ...dimensions.lineFilters,
    });

    return {
      ...buildTrialBalanceReport(accounts, openingLines, periodLines, {
        from: range.fromLabel,
        to: range.toLabel,
        includeZero: boolQuery(query.includeZero),
      }),
      filters: dimensions.filters,
    };
  }

  async profitAndLoss(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    const dimensions = await this.resolveReportDimensions(organizationId, query);
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, type: { in: [AccountType.REVENUE, AccountType.COST_OF_SALES, AccountType.EXPENSE] } },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, {
      from: range.from,
      to: range.to,
      branchId,
      ...dimensions.lineFilters,
    });
    return {
      ...buildProfitAndLossReport(accounts, lines, { from: range.fromLabel, to: range.toLabel }),
      filters: dimensions.filters,
    };
  }

  async balanceSheet(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    const dimensions = await this.resolveReportDimensions(organizationId, query);
    const asOf = parseEndDate(query.asOf);
    const branchId = cleanOptionalFilterId(query.branchId);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, { to: asOf, branchId, ...dimensions.lineFilters });
    return {
      ...buildBalanceSheetReport(accounts, lines, { asOf: dateLabel(query.asOf, asOf) }),
      filters: dimensions.filters,
    };
  }

  async financialStatementIntegrity(organizationId: string, query: { asOf: string }, executor?: Prisma.TransactionClient) {
    const client = executor ?? this.prisma;
    const asOf = parseEndDate(query.asOf);
    if (!asOf) throw new BadRequestException("asOf is required.");
    const where: Prisma.JournalLineWhereInput = {
      organizationId,
      journalEntry: {
        status: { in: POSTED_REPORT_STATUSES },
        entryDate: { lte: asOf },
      },
    };
    const totalsFor = (types?: AccountType[]) => client.journalLine.aggregate({
      where: { ...where, ...(types ? { account: { type: { in: types } } } : {}) },
      _sum: { debit: true, credit: true },
    });
    const [all, assets, liabilities, equity, profitAndLoss] = await Promise.all([
      totalsFor(),
      totalsFor([AccountType.ASSET]),
      totalsFor([AccountType.LIABILITY]),
      totalsFor([AccountType.EQUITY]),
      totalsFor([AccountType.REVENUE, AccountType.COST_OF_SALES, AccountType.EXPENSE]),
    ]);
    const net = (totals: { _sum?: { debit?: unknown; credit?: unknown } }) => money(totals._sum?.debit).minus(money(totals._sum?.credit));
    return {
      trialBalanceBalanced: money(all._sum?.debit).eq(money(all._sum?.credit)),
      balanceSheetBalanced: net(assets).eq(net(liabilities).plus(net(equity)).plus(net(profitAndLoss)).negated()),
    };
  }

  async vatSummary(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    const dimensions = await this.resolveReportDimensions(organizationId, query);
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const vatAccounts = await this.prisma.account.findMany({
      where: { organizationId, code: { in: ["220", "230"] } },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, {
      from: range.from,
      to: range.to,
      branchId,
      ...dimensions.lineFilters,
    });
    return {
      ...buildVatSummaryReport(vatAccounts, lines, { from: range.fromLabel, to: range.toLabel }),
      filters: dimensions.filters,
    };
  }

  async vatReturn(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    rejectUnsupportedDimensionFilters(query);
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

    const report = buildVatReturnReport(
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
    return { ...report, accountingContext: await this.reportAccountingContext(organizationId) };
  }

  async topCustomers(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    rejectUnsupportedDimensionFilters(query);
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
    rejectUnsupportedTransactionCurrencyFilter(query);
    rejectUnsupportedDimensionFilters(query);
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
    rejectUnsupportedTransactionCurrencyFilter(query);
    rejectUnsupportedDimensionFilters(query);
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

  async cashFlow(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    const dimensions = await this.resolveReportDimensions(organizationId, query);
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const cashAccounts = await this.prisma.bankAccountProfile.findMany({
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
    });
    const cashAccountIds = cashAccounts.map((account) => account.accountId);
    const [openingLines, periodLines] = cashAccountIds.length
      ? await Promise.all([
          range.from
            ? this.findDashboardJournalLines(organizationId, {
                before: range.from,
                accountIds: cashAccountIds,
                branchId,
                ...dimensions.lineFilters,
              })
            : Promise.resolve([]),
          this.findDashboardJournalLines(organizationId, {
            from: range.from,
            to: range.to,
            accountIds: cashAccountIds,
            branchId,
            ...dimensions.lineFilters,
          }),
        ])
      : [[], []];

    return {
      ...buildCashFlowReport(openingLines, periodLines, {
        from: range.fromLabel,
        to: range.toLabel,
        accountCount: cashAccountIds.length,
      }),
      filters: dimensions.filters,
    };
  }

  async revenueTrend(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedTransactionCurrencyFilter(query);
    rejectUnsupportedDimensionFilters(query);
    const range = parseRange(query);
    const branchId = cleanOptionalFilterId(query.branchId);
    const lines = await this.findDashboardJournalLines(organizationId, {
      from: range.from,
      to: range.to,
      accountType: AccountType.REVENUE,
      branchId,
    });

    return buildRevenueTrendReport(lines, { from: range.fromLabel, to: range.toLabel });
  }

  async agedReceivables(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedDimensionFilters(query);
    const transactionCurrency = normalizeTransactionCurrencyFilter(query.transactionCurrency);
    const asOf = parseEndDate(query.asOf) ?? endOfToday();
    const branchId = cleanOptionalFilterId(query.branchId);
    await this.assertHistoricalAgingTruth(organizationId, asOf, "receivables", transactionCurrency, branchId);
    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: SalesInvoiceStatus.FINALIZED,
        ...(branchId ? { branchId } : {}),
        ...(transactionCurrency ? { currency: transactionCurrency } : {}),
        balanceDue: { gt: "0.0000" },
        issueDate: { lte: asOf },
        finalizedAt: { lt: startOfNextDay(asOf) },
      },
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        fxMonetaryBalance: {
          include: {
            rateSnapshot: { select: { id: true, rateDate: true, source: true, sourceReference: true } },
            lastRevaluationLine: { select: { id: true, revaluationRunId: true, revaluationRun: { select: { status: true } } } },
          },
        },
      },
    });

    const report = buildAgingReport(
      invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.invoiceNumber,
        contact: invoice.customer,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        total: invoice.total,
        balanceDue: invoice.balanceDue,
        currency: invoice.currency,
        baseCurrency: invoice.baseCurrency,
        exchangeRate: invoice.exchangeRate,
        transactionTotal: invoice.transactionTotal,
        transactionBalanceDue: invoice.transactionBalanceDue,
        fxMonetaryBalance: invoice.fxMonetaryBalance,
      })),
      { asOf: dateLabel(query.asOf, asOf), kind: "receivables" },
    );
    return { ...report, fxFilters: { transactionCurrency } };
  }

  async agedPayables(organizationId: string, query: ReportDateQuery) {
    rejectUnsupportedDimensionFilters(query);
    const transactionCurrency = normalizeTransactionCurrencyFilter(query.transactionCurrency);
    const asOf = parseEndDate(query.asOf) ?? endOfToday();
    const branchId = cleanOptionalFilterId(query.branchId);
    await this.assertHistoricalAgingTruth(organizationId, asOf, "payables", transactionCurrency, branchId);
    const bills = await this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        status: PurchaseBillStatus.FINALIZED,
        ...(branchId ? { branchId } : {}),
        ...(transactionCurrency ? { currency: transactionCurrency } : {}),
        balanceDue: { gt: "0.0000" },
        billDate: { lte: asOf },
        finalizedAt: { lt: startOfNextDay(asOf) },
      },
      orderBy: [{ dueDate: "asc" }, { billDate: "asc" }],
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        fxMonetaryBalance: {
          include: {
            rateSnapshot: { select: { id: true, rateDate: true, source: true, sourceReference: true } },
            lastRevaluationLine: { select: { id: true, revaluationRunId: true, revaluationRun: { select: { status: true } } } },
          },
        },
      },
    });

    const report = buildAgingReport(
      bills.map((bill) => ({
        id: bill.id,
        number: bill.billNumber,
        contact: bill.supplier,
        issueDate: bill.billDate,
        dueDate: bill.dueDate,
        total: bill.total,
        balanceDue: bill.balanceDue,
        currency: bill.currency,
        baseCurrency: bill.baseCurrency,
        exchangeRate: bill.exchangeRate,
        transactionTotal: bill.transactionTotal,
        transactionBalanceDue: bill.transactionBalanceDue,
        fxMonetaryBalance: bill.fxMonetaryBalance,
      })),
      { asOf: dateLabel(query.asOf, asOf), kind: "payables" },
    );
    return { ...report, fxFilters: { transactionCurrency } };
  }

  async coreReport(organizationId: string, kind: CoreReportKind, query: ReportDateQuery) {
    const accountingContext = await this.reportAccountingContext(organizationId);
    switch (kind) {
      case "general-ledger":
        return { ...(await this.generalLedger(organizationId, query)), accountingContext };
      case "trial-balance":
        return { ...(await this.trialBalance(organizationId, query)), accountingContext };
      case "profit-and-loss":
        return { ...(await this.profitAndLoss(organizationId, query)), accountingContext };
      case "balance-sheet":
        return { ...(await this.balanceSheet(organizationId, query)), accountingContext };
      case "vat-summary":
        return { ...(await this.vatSummary(organizationId, query)), accountingContext };
      case "aged-receivables":
        return { ...(await this.agedReceivables(organizationId, query)), accountingContext };
      case "aged-payables":
        return { ...(await this.agedPayables(organizationId, query)), accountingContext };
    }
  }

  async advancedReport(organizationId: string, kind: AdvancedReportKind, query: ReportDateQuery) {
    const accountingContext = await this.reportAccountingContext(organizationId);
    switch (kind) {
      case "cash-flow":
        return { ...(await this.cashFlow(organizationId, query)), accountingContext };
      case "revenue-trend":
        return { ...(await this.revenueTrend(organizationId, query)), accountingContext };
      case "top-customers":
        return { ...(await this.topCustomers(organizationId, query)), accountingContext };
      case "top-products-services":
        return { ...(await this.topProductsServices(organizationId, query)), accountingContext };
    }
  }

  async coreReportCsvFile(organizationId: string, kind: CoreReportKind, query: ReportDateQuery) {
    const generatedAt = new Date();
    const report = await this.coreReport(organizationId, kind, query);
    return coreReportCsv(kind, report, generatedAt);
  }

  async advancedReportCsvFile(organizationId: string, kind: AdvancedReportKind, query: ReportDateQuery) {
    const generatedAt = new Date();
    const report = await this.advancedReport(organizationId, kind, query);
    return advancedReportCsv(kind, report, generatedAt);
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
    const archiveContext = reportArchiveAccountingContext(kind, query, report as Record<string, any>);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: reportDocumentType(kind),
      sourceType: "AccountingReport",
      sourceId: reportSourceId(kind, query, archiveContext),
      documentNumber: filename.replace(/\.pdf$/i, ""),
      filename,
      buffer,
      generatedById: actorUserId,
      accountingContext: archiveContext as unknown as Prisma.InputJsonObject,
    });
    return { buffer, filename, document: document ?? null };
  }

  private async findJournalLines(
    organizationId: string,
    filters: {
      from?: Date | null;
      to?: Date | null;
      before?: Date | null;
      accountId?: string;
      branchId?: string;
      costCenterId?: string;
      projectId?: string;
      transactionCurrency?: string;
    },
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
        ...(filters.costCenterId ? { costCenterId: filters.costCenterId } : {}),
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        ...(filters.transactionCurrency ? { currency: filters.transactionCurrency } : {}),
        journalEntry: {
          status: { in: POSTED_REPORT_STATUSES },
          ...(Object.keys(entryDate).length ? { entryDate } : {}),
          ...journalEntryBranchFilter(organizationId, filters.branchId),
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
        rateSnapshot: { select: { id: true, rateDate: true, source: true, sourceReference: true } },
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
      before?: Date | null;
      accountIds?: string[];
      accountType?: AccountType;
      accountCodes?: string[];
      branchId?: string;
      costCenterId?: string;
      projectId?: string;
    },
  ): Promise<DashboardLedgerLineInput[]> {
    const entryDate: { gte?: Date; lte?: Date; lt?: Date } = {};
    if (filters.from) {
      entryDate.gte = filters.from;
    }
    if (filters.to) {
      entryDate.lte = filters.to;
    }
    if (filters.before) {
      entryDate.lt = filters.before;
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
        ...(filters.costCenterId ? { costCenterId: filters.costCenterId } : {}),
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
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

  private async resolveReportDimensions(organizationId: string, query: ReportDateQuery): Promise<ResolvedReportDimensions> {
    const costCenterId = cleanOptionalFilterId(query.costCenterId);
    const projectId = cleanOptionalFilterId(query.projectId);
    const [costCenter, project] = await Promise.all([
      costCenterId
        ? this.prisma.costCenter.findFirst({
            where: { id: costCenterId, organizationId },
            select: { id: true, code: true, name: true, status: true },
          })
        : Promise.resolve(null),
      projectId
        ? this.prisma.project.findFirst({
            where: { id: projectId, organizationId },
            select: { id: true, code: true, name: true, status: true },
          })
        : Promise.resolve(null),
    ]);

    if (costCenterId && !costCenter) {
      throw new BadRequestException("Cost center not found in this organization.");
    }
    if (projectId && !project) {
      throw new BadRequestException("Project not found in this organization.");
    }

    return {
      filters: { costCenter, project },
      lineFilters: {
        ...(costCenterId ? { costCenterId } : {}),
        ...(projectId ? { projectId } : {}),
      },
    };
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

  private async reportAccountingContext(organizationId: string): Promise<ReportAccountingContext> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }
    return { baseCurrency: organization.baseCurrency, amountBasis: "BASE_CURRENCY" };
  }

  private async assertHistoricalAgingTruth(
    organizationId: string,
    asOf: Date,
    kind: "receivables" | "payables",
    transactionCurrency?: string,
    branchId?: string,
  ) {
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId }, select: { baseCurrency: true } });
    if (!organization) throw new NotFoundException("Organization not found.");
    const activity = await countFxSourceActivityAfter(this.prisma, organizationId, organization.baseCurrency.trim().toUpperCase(), asOf, {
      transactionCurrency,
      branchId,
      includeReceivables: kind === "receivables",
      includePayables: kind === "payables",
      foreignOnly: false,
    });
    const count = kind === "receivables" ? activity.receivables : activity.payables;
    if (count) {
      throw new BadRequestException(
        `Historical aged ${kind} cannot be represented honestly because ${count} foreign source change${count === 1 ? "" : "s"} occurred after the selected as-of date. Use a current as-of date or review the source activity.`,
      );
    }
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

export function reportSourceId(kind: CoreReportKind, query: ReportDateQuery, context?: ReturnType<typeof reportArchiveAccountingContext>): string {
  const params = new URLSearchParams();
  if (context?.baseCurrency) params.set("baseCurrency", context.baseCurrency);
  for (const key of ["from", "to", "asOf", "accountId", "branchId", "costCenterId", "projectId", "includeZero"] as const) {
    const value = query[key];
    if (value !== undefined && value !== null && value !== "") {
      const normalizedValue = String(value).trim();
      if (normalizedValue) {
        params.set(key, normalizedValue);
      }
    }
  }
  const transactionCurrency = normalizeTransactionCurrencyFilter(query.transactionCurrency);
  if (transactionCurrency) params.set("transactionCurrency", transactionCurrency);
  if (context?.rateScope.snapshotIds.length) params.set("rateSnapshotIds", context.rateScope.snapshotIds.join(","));
  if (context?.revaluationScope.runIds.length) params.set("revaluationRunIds", context.revaluationScope.runIds.join(","));
  if (context?.revaluationScope.statuses.length) params.set("revaluationStatuses", context.revaluationScope.statuses.join(","));
  const suffix = params.toString();
  return suffix ? `${kind}?${suffix}` : kind;
}

export function reportArchiveAccountingContext(kind: CoreReportKind, query: ReportDateQuery, report: Record<string, any>) {
  const snapshotIds = new Set<string>();
  const rateSources = new Set<string>();
  const revaluationRunIds = new Set<string>();
  const revaluationLineIds = new Set<string>();
  const revaluationStatuses = new Set<string>();
  for (const account of report.accounts ?? []) {
    for (const line of account.lines ?? []) {
      if (line.rateSnapshot?.id) snapshotIds.add(line.rateSnapshot.id);
      if (line.rateSnapshot?.source) rateSources.add(line.rateSnapshot.source);
    }
  }
  for (const row of report.rows ?? []) {
    if (row.revaluation?.rateSnapshotId) snapshotIds.add(row.revaluation.rateSnapshotId);
    if (row.revaluation?.rateSource) rateSources.add(row.revaluation.rateSource);
    if (row.revaluation?.revaluationRunId) revaluationRunIds.add(row.revaluation.revaluationRunId);
    if (row.revaluation?.revaluationLineId) revaluationLineIds.add(row.revaluation.revaluationLineId);
    if (row.revaluation?.status) revaluationStatuses.add(row.revaluation.status);
  }
  return {
    identityVersion: 1,
    reportKind: kind,
    baseCurrency: report.accountingContext?.baseCurrency ?? null,
    amountBasis: report.accountingContext?.amountBasis ?? "BASE_CURRENCY",
    transactionCurrency: normalizeTransactionCurrencyFilter(query.transactionCurrency) ?? null,
    dates: { from: query.from?.trim() || null, to: query.to?.trim() || null, asOf: query.asOf?.trim() || null },
    dimensions: {
      costCenter: report.filters?.costCenter ?? null,
      project: report.filters?.project ?? null,
    },
    rateScope: { snapshotIds: [...snapshotIds].sort(), sources: [...rateSources].sort() },
    revaluationScope: {
      runIds: [...revaluationRunIds].sort(),
      lineIds: [...revaluationLineIds].sort(),
      statuses: [...revaluationStatuses].sort(),
    },
  };
}

function cleanReportPackTitle(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, 160);
}

function reportPackReportQuery(input: {
  from?: string | null;
  to?: string | null;
  asOf?: string | null;
  branchId?: string | null;
  costCenterId?: string | null;
  projectId?: string | null;
  transactionCurrency?: string | null;
}): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  for (const key of ["from", "to", "asOf", "branchId", "costCenterId", "projectId", "transactionCurrency"] as const) {
    const value = cleanOptionalFilterId(input[key] ?? undefined);
    if (value) {
      query[key] = key === "transactionCurrency" ? normalizeTransactionCurrencyFilter(value) : value;
    }
  }
  return query;
}

function cleanOptionalFilterId(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeTransactionCurrencyFilter(value?: string): string | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new BadRequestException("transactionCurrency must be a three-letter ISO currency code.");
  }
  return normalized;
}

function rejectUnsupportedTransactionCurrencyFilter(query: ReportDateQuery): void {
  if (normalizeTransactionCurrencyFilter(query.transactionCurrency)) {
    throw new BadRequestException(
      "Transaction-currency filtering is not available for this aggregate report. Official totals remain in base currency.",
    );
  }
}

function rejectUnsupportedDimensionFilters(query: ReportDateQuery): void {
  if (cleanOptionalFilterId(query.costCenterId) || cleanOptionalFilterId(query.projectId)) {
    throw new BadRequestException("Dimension filtering is not available for this report until source documents carry dimensions.");
  }
}

const supportedReportPackKindValues = new Set<string>(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.kind));

function parseReportPackStatusFilter(status?: string): ReportPackStatus | undefined {
  const normalized = status?.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  if (!Object.values(ReportPackStatus).includes(normalized as ReportPackStatus)) {
    throw new BadRequestException(`Unsupported report pack status: ${status}.`);
  }
  return normalized as ReportPackStatus;
}

function parseReportPackLimit(limit?: string | number): number {
  const parsed = limit === undefined ? 50 : Number(limit);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new BadRequestException("limit must be an integer between 1 and 100.");
  }
  return parsed;
}

function parseReportPackManifestPreviewKinds(input: string | string[] | undefined): ReportPackReportKind[] {
  const requested = (Array.isArray(input) ? input : input ? [input] : [])
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    return REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.kind);
  }

  const reportKinds: ReportPackReportKind[] = [];
  const seen = new Set<string>();
  for (const value of requested) {
    if (!supportedReportPackKindValues.has(value)) {
      throw new BadRequestException(`Unsupported report pack report kind: ${value}.`);
    }
    if (!seen.has(value)) {
      seen.add(value);
      reportKinds.push(value as ReportPackReportKind);
    }
  }
  return reportKinds;
}

function isReportPackManifest(value: Prisma.JsonValue): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.organizationId === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.items)
  );
}

function reportPackAuditSummary(manifest: ReportPackManifest) {
  return {
    status: manifest.status,
    itemCount: manifest.items.length,
    reportKinds: manifest.items.map((item) => item.reportKind),
    requestId: manifest.requestId,
    packDownloadEnabled: false,
    storageProvider: "disabled",
    signedUrlEnabled: false,
    generatedDocumentMutationEnabled: false,
    providerCallEnabled: false,
    complianceSubmissionEnabled: false,
  };
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
              currency: line.currency ?? null,
              transactionDebit: line.transactionDebit === null || line.transactionDebit === undefined ? null : fixed(line.transactionDebit),
              transactionCredit: line.transactionCredit === null || line.transactionCredit === undefined ? null : fixed(line.transactionCredit),
              exchangeRate: line.exchangeRate === null || line.exchangeRate === undefined ? null : rateString(line.exchangeRate),
              rateSnapshot: line.rateSnapshot
                ? {
                    id: line.rateSnapshot.id,
                    rateDate: toIso(line.rateSnapshot.rateDate),
                    source: line.rateSnapshot.source,
                    sourceReference: line.rateSnapshot.sourceReference ?? null,
                  }
                : null,
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

export function buildCashFlowReport(
  openingLines: DashboardLedgerLineInput[],
  periodLines: DashboardLedgerLineInput[],
  options: { from: string | null; to: string | null; accountCount: number },
) {
  const openingCash = Array.from(aggregateNaturalAssetLines(openingLines).values()).reduce((sum, balance) => sum.plus(balance), ZERO);
  const byPeriod = new Map<string, { inflows: Decimal; outflows: Decimal; lineCount: number }>();
  for (const line of periodLines) {
    const period = monthPeriodKey(line.journalEntry?.entryDate);
    const aggregate = byPeriod.get(period) ?? { inflows: ZERO, outflows: ZERO, lineCount: 0 };
    aggregate.inflows = aggregate.inflows.plus(money(line.debit));
    aggregate.outflows = aggregate.outflows.plus(money(line.credit));
    aggregate.lineCount += 1;
    byPeriod.set(period, aggregate);
  }

  const rows = Array.from(byPeriod.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, aggregate]) => ({
      period,
      inflows: fixed(aggregate.inflows),
      outflows: fixed(aggregate.outflows),
      netCashFlow: fixed(aggregate.inflows.minus(aggregate.outflows)),
      lineCount: aggregate.lineCount,
    }));
  const totals = rows.reduce(
    (sum, row) => ({
      inflows: sum.inflows.plus(row.inflows),
      outflows: sum.outflows.plus(row.outflows),
      netCashFlow: sum.netCashFlow.plus(row.netCashFlow),
      lineCount: sum.lineCount + row.lineCount,
    }),
    { inflows: ZERO, outflows: ZERO, netCashFlow: ZERO, lineCount: 0 },
  );
  const closingCash = openingCash.plus(totals.netCashFlow);

  return {
    from: options.from,
    to: options.to,
    basis: "POSTED_AND_REVERSED_CASH_AND_BANK_JOURNAL_LINES",
    granularity: "month",
    rows,
    totals: {
      openingCash: fixed(openingCash),
      inflows: fixed(totals.inflows),
      outflows: fixed(totals.outflows),
      netCashFlow: fixed(totals.netCashFlow),
      closingCash: fixed(closingCash),
      accountCount: options.accountCount,
      lineCount: totals.lineCount,
    },
    notes: [
      "Cash flow is derived from posted and reversed journal lines for active LedgerByte cash and bank accounts.",
      "Draft, voided, inactive-account, and source-document-only activity is excluded.",
      "This internal management report does not connect bank feeds, does not initiate payments, and does not create provider submissions.",
    ],
  };
}

export function buildRevenueTrendReport(lines: DashboardLedgerLineInput[], options: { from: string | null; to: string | null }) {
  const byPeriod = new Map<string, { revenue: Decimal; lineCount: number }>();
  for (const line of lines) {
    const period = monthPeriodKey(line.journalEntry?.entryDate);
    const aggregate = byPeriod.get(period) ?? { revenue: ZERO, lineCount: 0 };
    aggregate.revenue = aggregate.revenue.plus(money(line.credit)).minus(money(line.debit));
    aggregate.lineCount += 1;
    byPeriod.set(period, aggregate);
  }

  const rows = Array.from(byPeriod.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, aggregate]) => ({ period, revenue: fixed(aggregate.revenue), lineCount: aggregate.lineCount }));
  const revenue = rows.reduce((sum, row) => sum.plus(row.revenue), ZERO);

  return {
    from: options.from,
    to: options.to,
    basis: "POSTED_AND_REVERSED_REVENUE_JOURNAL_LINES",
    granularity: "month",
    rows,
    totals: {
      revenue: fixed(revenue),
      lineCount: rows.reduce((sum, row) => sum + row.lineCount, 0),
    },
    notes: [
      "Revenue trend is derived from posted and reversed revenue-account journal lines.",
      "Draft, voided, and source-document-only activity is excluded.",
      "This internal management report does not create filings or provider submissions.",
    ],
  };
}

export function buildAgingReport(documents: AgingDocumentInput[], options: { asOf: string | null; kind: "receivables" | "payables" }) {
  const asOf = parseEndDate(options.asOf) ?? endOfToday();
  const rows = documents.map((document) => {
    const dueDate = document.dueDate ?? document.issueDate;
    const daysOverdue = daysBetween(endOfDay(dueDate), asOf);
    const bucket = agingBucket(daysOverdue);
    const currency = document.currency?.trim().toUpperCase() || null;
    const sourceBaseOpenAmount = fixed(document.fxMonetaryBalance?.sourceBaseOpenAmount ?? document.balanceDue);
    const carryingBaseAmount = fixed(document.fxMonetaryBalance?.carryingBaseAmount ?? document.balanceDue);
    const openTransactionAmount = fixed(
      document.fxMonetaryBalance?.openTransactionAmount ?? document.transactionBalanceDue ?? document.balanceDue,
    );
    return {
      id: document.id,
      contact: document.contact,
      number: document.number,
      issueDate: toIso(document.issueDate),
      dueDate: document.dueDate ? toIso(document.dueDate) : null,
      total: fixed(document.total),
      balanceDue: carryingBaseAmount,
      currency,
      baseCurrency: document.baseCurrency?.trim().toUpperCase() || null,
      transactionTotal: fixed(document.transactionTotal ?? document.total),
      openTransactionAmount,
      sourceBaseOpenAmount,
      carryingBaseAmount,
      carryingRate: rateString(document.fxMonetaryBalance?.carryingRate ?? document.exchangeRate ?? "1"),
      revaluation: document.fxMonetaryBalance
        ? {
            rateSnapshotId: document.fxMonetaryBalance.rateSnapshot.id,
            rateDate: dateLabel(null, new Date(document.fxMonetaryBalance.rateSnapshot.rateDate)),
            rateSource: document.fxMonetaryBalance.rateSnapshot.source,
            rateSourceReference: document.fxMonetaryBalance.rateSnapshot.sourceReference ?? null,
            revaluationRunId: document.fxMonetaryBalance.lastRevaluationLine.revaluationRunId,
            revaluationLineId: document.fxMonetaryBalance.lastRevaluationLine.id,
            status: document.fxMonetaryBalance.lastRevaluationLine.revaluationRun?.status ?? "POSTED",
          }
        : null,
      daysOverdue,
      bucket,
    };
  });
  const bucketTotals = emptyBucketTotals();
  for (const row of rows) {
    bucketTotals[row.bucket] = fixed(money(bucketTotals[row.bucket]).plus(row.balanceDue));
  }
  const grandTotal = rows.reduce((sum, row) => sum.plus(row.balanceDue), ZERO);
  const transactionTotalsByCurrency: Record<string, string> = {};
  for (const row of rows) {
    if (!row.currency) continue;
    transactionTotalsByCurrency[row.currency] = fixed(
      money(transactionTotalsByCurrency[row.currency] ?? "0").plus(row.openTransactionAmount),
    );
  }
  return { asOf: dateLabel(options.asOf, asOf), kind: options.kind, rows, bucketTotals, grandTotal: fixed(grandTotal), transactionTotalsByCurrency };
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

function monthPeriodKey(value?: string | Date): string {
  const date = value ? new Date(value) : new Date(0);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
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

function startOfNextDay(value: Date): Date {
  const next = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function rateString(value: unknown): string {
  return money(value).toFixed(8);
}

function money(value: unknown): Decimal {
  return new Decimal(value === undefined || value === null || value === "" ? 0 : String(value));
}

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}
