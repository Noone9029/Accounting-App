import { Injectable, Logger } from "@nestjs/common";
import {
  AccountType,
  BankAccountStatus,
  BankReconciliationStatus,
  BankStatementTransactionStatus,
  ContactType,
  CustomerPaymentStatus,
  FiscalPeriodStatus,
  ItemStatus,
  JournalEntryStatus,
  Prisma,
  PurchaseBillStatus,
  CollectionCaseStatus,
  DeliveryNoteStatus,
  RecurringInvoiceTemplateStatus,
  SalesInvoiceStatus,
  SalesQuoteStatus,
  StockMovementType,
  SupplierPaymentStatus,
  ZatcaRegistrationStatus,
} from "@prisma/client";
import { InventoryClearingReportService } from "../inventory/inventory-clearing-report.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { StorageService } from "../storage/storage.service";
import { getZatcaProfileReadiness } from "../zatca/zatca.service";

const REPORT_LEDGER_STATUSES = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];
const AGING_BUCKET_LABELS = {
  CURRENT: "Current",
  "1_30": "1-30",
  "31_60": "31-60",
  "61_90": "61-90",
  "90_PLUS": "90+",
} as const;
const OPEN_COLLECTION_CASE_STATUSES: CollectionCaseStatus[] = [
  CollectionCaseStatus.OPEN,
  CollectionCaseStatus.IN_PROGRESS,
  CollectionCaseStatus.PROMISED_TO_PAY,
  CollectionCaseStatus.ON_HOLD,
  CollectionCaseStatus.DISPUTED,
];
const DASHBOARD_SALES_ATTENTION_TOP_LIMIT = 5;
const DASHBOARD_QUOTE_EXPIRING_SOON_DAYS = 7;
const DASHBOARD_RECURRING_DUE_SOON_DAYS = 7;
const DASHBOARD_DELIVERY_OVERDUE_WINDOW_DAYS = 0;
const DASHBOARD_COLLECTION_DUE_TODAY_WINDOW_DAYS = 0;
const COLLECTION_PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

type AttentionSeverity = "info" | "warning" | "critical";
type DashboardSectionName =
  | "sales"
  | "salesAttention"
  | "purchases"
  | "banking"
  | "inventory"
  | "reports"
  | "trends"
  | "aging"
  | "compliance"
  | "storage";
type DashboardSectionStatus =
  | { status: "READY" }
  | {
      status: "UNAVAILABLE";
      code: string;
      message: string;
    };

interface DashboardSectionWarning {
  section: DashboardSectionName;
  code: string;
  message: string;
}

interface AttentionItem {
  type: string;
  severity: AttentionSeverity;
  title: string;
  description: string;
  href: string;
}

interface DashboardMonth {
  key: string;
  start: Date;
  end: Date;
}

interface DashboardReportLine {
  debit: Prisma.Decimal.Value;
  credit: Prisma.Decimal.Value;
  account: { type: AccountType };
  journalEntry: { entryDate: Date };
}

interface SalesAttentionTopItem {
  id: string;
  number: string;
  customerName: string;
  status: string;
  href: string;
  amount?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  expiryDate?: string | null;
  nextRunDate?: string | null;
  followUpDate?: string | null;
  deliveryDate?: string | null;
  promisedPaymentDate?: string | null;
  promisedAmount?: string | null;
  templateNumber?: string | null;
  templateName?: string | null;
  sourceHref?: string | null;
}

interface SalesAttentionCustomerItem {
  id: string;
  customerName: string;
  outstandingBalance: string;
  overdueAmount: string;
  openCollectionCaseCount: number;
  href: string;
}

interface SalesAttentionSummary {
  readOnly: true;
  noMutation: true;
  helperText: string;
  overdueInvoices: { count: number; total: string; topItems: SalesAttentionTopItem[] };
  collections: {
    openCount: number;
    dueTodayCount: number;
    overdueFollowUpCount: number;
    promisedToPayTotal: string;
    disputedCount: number;
    topItems: SalesAttentionTopItem[];
  };
  quotes: {
    awaitingAcceptanceCount: number;
    expiringSoonCount: number;
    acceptedNotConvertedCount: number;
    topItems: SalesAttentionTopItem[];
  };
  recurringInvoices: {
    activeCount: number;
    dueSoonCount: number;
    overdueForGenerationCount: number;
    recentlyGeneratedDraftInvoiceCount: number;
    topItems: SalesAttentionTopItem[];
    recentDraftInvoices: SalesAttentionTopItem[];
  };
  deliveryNotes: {
    draftCount: number;
    issuedNotDeliveredCount: number;
    overdueDeliveryCount: number;
    topItems: SalesAttentionTopItem[];
  };
  customers: { topOutstanding: SalesAttentionCustomerItem[] };
}

interface CollectionAttentionRow {
  id: string;
  caseNumber: string;
  status: CollectionCaseStatus;
  priority: string;
  followUpDate: Date | null;
  nextActionAt: Date | null;
  promisedPaymentDate: Date | null;
  promisedAmount: Prisma.Decimal.Value | null;
  customer: { id: string; name: string; displayName: string | null };
  salesInvoice: { id: string; invoiceNumber: string; balanceDue: Prisma.Decimal.Value; dueDate: Date | null } | null;
}

type OnboardingChecklistItemStatus = "COMPLETE" | "INCOMPLETE" | "WARNING";
type OnboardingChecklistStatus = "BLOCKED" | "IN_PROGRESS" | "READY_FOR_SELLABLE_V1_REVIEW";

interface OnboardingChecklistItem {
  id: string;
  label: string;
  status: OnboardingChecklistItemStatus;
  description: string;
  href: string;
  evidence: string[];
  blockers: string[];
  warnings: string[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly inventoryClearingReportService: InventoryClearingReportService,
    private readonly storageService: StorageService,
  ) {}

  async summary(organizationId: string, options: { canViewSalesAttention?: boolean } = {}) {
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const todayEnd = endOfUtcDay(now);
    const quoteExpiringSoonEnd = endOfUtcDay(addUtcDays(now, DASHBOARD_QUOTE_EXPIRING_SOON_DAYS));
    const recurringDueSoonEnd = endOfUtcDay(addUtcDays(now, DASHBOARD_RECURRING_DUE_SOON_DAYS));
    const monthStart = startOfUtcMonth(now);
    const monthStartLabel = dateOnly(monthStart);
    const asOf = endOfUtcDay(now);
    const asOfLabel = dateOnly(now);
    const trendMonths = lastSixUtcMonths(now);
    const canViewSalesAttention = options.canViewSalesAttention ?? true;
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, baseCurrency: true },
    });
    const currency = organization?.baseCurrency ?? "SAR";

    const sectionStatus = {} as Record<DashboardSectionName, DashboardSectionStatus>;
    const warnings: DashboardSectionWarning[] = [];
    const runSection = async <T>(section: DashboardSectionName, load: () => Promise<T> | T, fallback: () => T): Promise<T> => {
      try {
        const value = await load();
        sectionStatus[section] = { status: "READY" };
        return value;
      } catch (error) {
        const warning = this.sanitizeDashboardSectionError(section, error);
        sectionStatus[section] = {
          status: "UNAVAILABLE",
          code: warning.code,
          message: warning.message,
        };
        warnings.push(warning);
        this.logger.warn(`Dashboard section ${section} unavailable for organization ${organizationId}: ${warning.code}`);
        return fallback();
      }
    };

    const sales = await runSection("sales", () => this.salesSummary(organizationId, monthStart, todayStart), () => this.emptySalesSummary());
    const salesAttention = canViewSalesAttention
      ? await runSection(
          "salesAttention",
          () => this.salesAttentionSummary(organizationId, todayStart, todayEnd, quoteExpiringSoonEnd, recurringDueSoonEnd),
          () => this.emptySalesAttentionSummary(),
        )
      : this.emptySalesAttentionSummary();
    if (!canViewSalesAttention) {
      sectionStatus.salesAttention = { status: "READY" };
    }
    const purchases = await runSection("purchases", () => this.purchaseSummary(organizationId, monthStart, todayStart), () => this.emptyPurchaseSummary());
    const banking = await runSection("banking", () => this.bankingSummary(organizationId), () => this.emptyBankingSummary());
    const inventory = await runSection("inventory", () => this.inventorySummary(organizationId), () => this.emptyInventorySummary());
    const reports = await runSection("reports", () => this.reportSummary(organizationId, monthStart, asOf), () => this.emptyReportSummary());
    const trends = await runSection("trends", () => this.trendSummary(organizationId, trendMonths), () => this.emptyTrendSummary(trendMonths));
    const aging = await runSection("aging", () => this.agingSummary(organizationId, asOfLabel), () => this.emptyAgingSummary());
    const compliance = await runSection("compliance", () => this.complianceSummary(organizationId, monthStart, now), () => this.emptyComplianceSummary());
    const storageReadiness = await runSection("storage", () => this.storageService.readiness(), () => this.emptyStorageReadiness());

    return {
      asOf: now.toISOString(),
      currency,
      sales,
      salesAttention,
      purchases,
      banking,
      inventory,
      reports,
      trends,
      aging,
      compliance: {
        zatcaProductionReady: compliance.zatcaProductionReady,
        zatcaBlockingReasonCount: compliance.zatcaBlockingReasonCount,
        fiscalPeriodsLockedCount: compliance.fiscalPeriodsLockedCount,
        auditLogCountThisMonth: compliance.auditLogCountThisMonth,
      },
      attentionItems: this.attentionItems({
        sales,
        purchases,
        banking,
        inventory,
        compliance,
        salesAttention,
        storageDatabaseActive:
          storageReadiness.attachmentStorage.activeProvider === "database" ||
          storageReadiness.generatedDocumentStorage.activeProvider === "database",
        warnings,
      }),
      sectionStatus,
      warnings,
    };
  }

  async onboardingChecklist(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        legalName: true,
        taxNumber: true,
        countryCode: true,
        baseCurrency: true,
        timezone: true,
      },
    });
    const chartAccountCount = await this.prisma.account.count({
      where: { organizationId, isActive: true, allowPosting: true },
    });
    const activeTaxRateCount = await this.prisma.taxRate.count({
      where: { organizationId, isActive: true },
    });
    const customerCount = await this.prisma.contact.count({
      where: { organizationId, type: { in: [ContactType.CUSTOMER, ContactType.BOTH] } },
    });
    const identifiedCustomerCount = await this.prisma.contact.count({
      where: {
        organizationId,
        type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
        OR: [
          { taxNumber: { not: null } },
          { identificationType: { not: null }, identificationNumber: { not: null } },
        ],
      },
    });
    const salesInvoiceCount = await this.prisma.salesInvoice.count({ where: { organizationId } });
    const finalizedSalesInvoiceCount = await this.prisma.salesInvoice.count({
      where: { organizationId, status: SalesInvoiceStatus.FINALIZED },
    });
    const activeBankAccountCount = await this.prisma.bankAccountProfile.count({
      where: { organizationId, status: BankAccountStatus.ACTIVE },
    });
    const postedCustomerPaymentCount = await this.prisma.customerPayment.count({
      where: { organizationId, status: CustomerPaymentStatus.POSTED },
    });
    const postedJournalEntryCount = await this.prisma.journalEntry.count({
      where: { organizationId, status: JournalEntryStatus.POSTED },
    });
    const zatcaProfile = await this.prisma.zatcaOrganizationProfile.findUnique({
      where: { organizationId },
      select: { sellerName: true, vatNumber: true, city: true, countryCode: true },
    });
    const activeEgs = await this.prisma.zatcaEgsUnit.findFirst({
      where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
      select: { id: true, csrPem: true, complianceCsidPem: true, productionCsidPem: true },
    });
    const localXmlCount = await this.prisma.zatcaInvoiceMetadata.count({ where: { organizationId, xmlBase64: { not: null } } });
    const storageReadiness = await this.safeStorageReadiness();

    const hasOrganizationProfile = Boolean(
      organization?.name &&
        organization.legalName &&
        organization.countryCode &&
        organization.baseCurrency &&
        organization.timezone,
    );
    const hasValidVat = hasFifteenDigitVat(organization?.taxNumber) || hasFifteenDigitVat(zatcaProfile?.vatNumber);
    const zatcaProfileReadiness = getZatcaProfileReadiness(zatcaProfile ?? {});
    const storageProviders = storageReadiness
      ? [storageReadiness.attachmentStorage.activeProvider, storageReadiness.generatedDocumentStorage.activeProvider]
      : ["unavailable"];
    const databaseStorageActive = storageProviders.includes("database");
    const storageChecked = storageProviders.every((provider) => provider !== "unavailable");

    const items: OnboardingChecklistItem[] = [
      {
        id: "organization_profile",
        label: "Organization profile complete",
        status: hasOrganizationProfile && hasValidVat ? "COMPLETE" : "INCOMPLETE",
        description: "Legal name, country, currency, timezone, and a 15-digit VAT/tax number are needed for a sellable accounting workspace.",
        href: "/settings/organization",
        evidence: [
          `Organization found: ${organization ? "yes" : "no"}`,
          `Legal profile fields complete: ${hasOrganizationProfile ? "yes" : "no"}`,
          `15-digit VAT/tax number present: ${hasValidVat ? "yes" : "no"}`,
        ],
        blockers: [
          ...(organization ? [] : ["Organization record is missing."]),
          ...(hasOrganizationProfile ? [] : ["Complete legal name, country, currency, and timezone."]),
          ...(hasValidVat ? [] : ["Add a 15-digit VAT/tax number before customer-facing Saudi VAT workflows."]),
        ],
        warnings: [],
      },
      {
        id: "chart_of_accounts",
        label: "Chart of accounts available",
        status: chartAccountCount > 0 ? "COMPLETE" : "INCOMPLETE",
        description: "Posting workflows need active posting accounts before invoices, bills, payments, and journals can be used safely.",
        href: "/accounts",
        evidence: [`Active posting accounts: ${chartAccountCount}`],
        blockers: chartAccountCount > 0 ? [] : ["Create or seed an active chart of accounts."],
        warnings: [],
      },
      {
        id: "tax_profile",
        label: "VAT/tax profile complete",
        status: hasValidVat && activeTaxRateCount > 0 ? "COMPLETE" : "INCOMPLETE",
        description: "A valid organization VAT number and active tax rates reduce first-invoice setup failures.",
        href: "/settings/tax-rates",
        evidence: [`15-digit VAT/tax number present: ${hasValidVat ? "yes" : "no"}`, `Active tax rates: ${activeTaxRateCount}`],
        blockers: [
          ...(hasValidVat ? [] : ["Add a 15-digit VAT/tax number."]),
          ...(activeTaxRateCount > 0 ? [] : ["Create at least one active tax rate."]),
        ],
        warnings: [],
      },
      {
        id: "customer_created",
        label: "At least one customer",
        status: customerCount > 0 ? "COMPLETE" : "INCOMPLETE",
        description: "The first invoice flow needs at least one customer contact.",
        href: "/contacts",
        evidence: [`Customer contacts: ${customerCount}`],
        blockers: customerCount > 0 ? [] : ["Create a customer contact."],
        warnings: [],
      },
      {
        id: "first_invoice",
        label: "At least one sales invoice",
        status: salesInvoiceCount > 0 ? "COMPLETE" : "INCOMPLETE",
        description: "Creating a draft or finalized invoice proves the first-sale workflow is reachable.",
        href: "/sales/invoices",
        evidence: [`Sales invoices: ${salesInvoiceCount}`, `Finalized sales invoices: ${finalizedSalesInvoiceCount}`],
        blockers: [],
        warnings: [
          ...(salesInvoiceCount > 0 ? [] : ["Create a first invoice before go-live rehearsals."]),
          ...(salesInvoiceCount > 0 && finalizedSalesInvoiceCount === 0 ? ["Finalize an invoice before recording the first payment."] : []),
        ],
      },
      {
        id: "bank_payment_method",
        label: "Payment method or bank account configured",
        status: activeBankAccountCount > 0 ? "COMPLETE" : "INCOMPLETE",
        description: "Cash and bank workflows need at least one active bank/cash profile.",
        href: "/bank-accounts",
        evidence: [`Active bank/cash profiles: ${activeBankAccountCount}`],
        blockers: activeBankAccountCount > 0 ? [] : ["Create an active bank, cash, wallet, card, or other payment profile."],
        warnings: [],
      },
      {
        id: "first_payment",
        label: "At least one customer payment",
        status: postedCustomerPaymentCount > 0 ? "COMPLETE" : "INCOMPLETE",
        description: "Recording the first customer payment closes the first receivables loop and updates dashboard/reporting totals.",
        href: "/sales/customer-payments",
        evidence: [`Posted customer payments: ${postedCustomerPaymentCount}`],
        blockers: [
          ...(activeBankAccountCount > 0 ? [] : ["Create an active bank or cash profile before recording payment."]),
          ...(finalizedSalesInvoiceCount > 0 ? [] : ["Finalize a sales invoice before recording payment."]),
          ...(postedCustomerPaymentCount > 0 ? [] : ["Record a customer payment against an open invoice."]),
        ],
        warnings: [],
      },
      {
        id: "first_report",
        label: "First reportable activity",
        status: postedJournalEntryCount > 0 ? "COMPLETE" : "INCOMPLETE",
        description: "Posted accounting activity gives the dashboard and reports something real to show after the first invoice/payment workflow.",
        href: "/reports/profit-and-loss",
        evidence: [`Posted journal entries: ${postedJournalEntryCount}`],
        blockers: postedJournalEntryCount > 0 ? [] : ["Finalize or post at least one accounting transaction before reviewing reports."],
        warnings: [],
      },
      {
        id: "zatca_local_readiness_visible",
        label: "ZATCA local readiness visible",
        status: zatcaProfileReadiness.ready && activeEgs && localXmlCount > 0 ? "COMPLETE" : "WARNING",
        description: "ZATCA remains local-only until official OTP/sandbox access, CSID custody, and later clearance/reporting phases are approved.",
        href: "/settings/zatca",
        evidence: [
          `ZATCA profile ready: ${zatcaProfileReadiness.ready ? "yes" : "no"}`,
          `Active development EGS: ${activeEgs ? "yes" : "no"}`,
          `Local XML records: ${localXmlCount}`,
          "Production compliance: false",
          "Real ZATCA network enabled: false",
        ],
        blockers: [],
        warnings: [
          ...(zatcaProfileReadiness.ready ? [] : [`ZATCA profile missing: ${zatcaProfileReadiness.missingFields.join(", ") || "required fields"}.`]),
          ...(activeEgs ? [] : ["No active development EGS unit is configured."]),
          ...(localXmlCount > 0 ? [] : ["No local ZATCA XML has been generated yet."]),
          "Do not request CSIDs, call ZATCA, or claim production compliance until official sandbox credentials and approvals are available.",
        ],
      },
      {
        id: "contact_vat_id_validation",
        label: "Contact VAT and ID validation ready",
        status: "COMPLETE",
        description: "Contacts support exactly 15-digit VAT numbers plus validated buyer identification type/number pairs.",
        href: "/contacts",
        evidence: [`Customer contacts with VAT or ID metadata: ${identifiedCustomerCount}`, "Backend/frontend validation is enabled."],
        blockers: [],
        warnings: customerCount > 0 && identifiedCustomerCount === 0 ? ["Add VAT or ID metadata to key customers before ZATCA rehearsals."] : [],
      },
      {
        id: "storage_readiness_checked",
        label: "Backup and storage readiness checked",
        status: storageChecked && !databaseStorageActive ? "COMPLETE" : "WARNING",
        description: "Generated document and attachment storage are checked without exposing raw storage credentials.",
        href: "/settings/storage",
        evidence: [`Storage providers: ${storageProviders.join(", ")}`],
        blockers: [],
        warnings: [
          ...(storageChecked ? [] : ["Storage readiness could not be loaded."]),
          ...(databaseStorageActive ? ["Database/base64 storage is acceptable for testing but should be reviewed before production scale."] : []),
          "Signed XML and QR body persistence remain blocked.",
        ],
      },
    ];

    const completedCount = items.filter((item) => item.status === "COMPLETE").length;
    const totalCount = items.length;
    const blockers = items.flatMap((item) => item.blockers.map((blocker) => `${item.label}: ${blocker}`));
    const warnings = items.flatMap((item) => item.warnings.map((warning) => `${item.label}: ${warning}`));
    const readinessScore = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    const status: OnboardingChecklistStatus =
      blockers.length > 0 ? "BLOCKED" : completedCount === totalCount ? "READY_FOR_SELLABLE_V1_REVIEW" : "IN_PROGRESS";

    return {
      readOnly: true,
      noMutation: true,
      tenantScoped: true,
      organizationId,
      generatedAt: new Date().toISOString(),
      status,
      readinessScore,
      completedCount,
      totalCount,
      items,
      blockers,
      warnings,
      recommendedNextSteps: this.onboardingRecommendedNextSteps(status, items),
      zatcaProductionCompliance: false,
      realZatcaNetworkEnabled: false,
      signedXmlBodyPersistenceAllowed: false,
      qrPayloadBodyPersistenceAllowed: false,
      productionCompliance: false,
    };
  }

  private async salesSummary(organizationId: string, monthStart: Date, todayStart: Date) {
    const invoices = await this.prisma.salesInvoice.findMany({
      where: { organizationId, status: SalesInvoiceStatus.FINALIZED },
      select: { issueDate: true, dueDate: true, total: true, balanceDue: true },
    });
    const unpaid = invoices.filter((invoice) => this.decimal(invoice.balanceDue).gt(0));
    const overdue = unpaid.filter((invoice) => (invoice.dueDate ?? invoice.issueDate) < todayStart);
    const payments = await this.prisma.customerPayment.findMany({
      where: { organizationId, status: CustomerPaymentStatus.POSTED, paymentDate: { gte: monthStart } },
      select: { amountReceived: true },
    });

    return {
      unpaidInvoiceCount: unpaid.length,
      unpaidInvoiceBalance: this.decimalString(sum(unpaid.map((invoice) => invoice.balanceDue))),
      overdueInvoiceCount: overdue.length,
      overdueInvoiceBalance: this.decimalString(sum(overdue.map((invoice) => invoice.balanceDue))),
      salesThisMonth: this.decimalString(sum(invoices.filter((invoice) => invoice.issueDate >= monthStart).map((invoice) => invoice.total))),
      customerPaymentThisMonth: this.decimalString(sum(payments.map((payment) => payment.amountReceived))),
    };
  }

  private async salesAttentionSummary(
    organizationId: string,
    todayStart: Date,
    todayEnd: Date,
    quoteExpiringSoonEnd: Date,
    recurringDueSoonEnd: Date,
  ): Promise<SalesAttentionSummary> {
    const outstandingInvoices = await this.prisma.salesInvoice.findMany({
      where: { organizationId, status: SalesInvoiceStatus.FINALIZED, balanceDue: { gt: 0 } },
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        balanceDue: true,
        status: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
    });
    const openCollectionCases = (await this.prisma.collectionCase.findMany({
      where: { organizationId, status: { in: OPEN_COLLECTION_CASE_STATUSES } },
      orderBy: [{ nextActionAt: "asc" }, { followUpDate: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        caseNumber: true,
        status: true,
        priority: true,
        followUpDate: true,
        nextActionAt: true,
        promisedPaymentDate: true,
        promisedAmount: true,
        customer: { select: { id: true, name: true, displayName: true } },
        salesInvoice: { select: { id: true, invoiceNumber: true, balanceDue: true, dueDate: true } },
      },
    })) as CollectionAttentionRow[];
    const salesQuotes = await this.prisma.salesQuote.findMany({
      where: { organizationId, status: { in: [SalesQuoteStatus.SENT, SalesQuoteStatus.ACCEPTED] } },
      orderBy: [{ expiryDate: "asc" }, { issueDate: "desc" }],
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        issueDate: true,
        expiryDate: true,
        total: true,
        convertedSalesInvoiceId: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
    });
    const activeRecurringTemplateCount = await this.prisma.recurringInvoiceTemplate.count({
      where: { organizationId, status: RecurringInvoiceTemplateStatus.ACTIVE },
    });
    const recurringTemplatesDue = await this.prisma.recurringInvoiceTemplate.findMany({
      where: {
        organizationId,
        status: RecurringInvoiceTemplateStatus.ACTIVE,
        nextRunDate: { lte: recurringDueSoonEnd },
      },
      orderBy: [{ nextRunDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        templateNumber: true,
        name: true,
        status: true,
        nextRunDate: true,
        total: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
    });
    const recentlyGeneratedDraftInvoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: SalesInvoiceStatus.DRAFT,
        recurringInvoiceTemplateId: { not: null },
      },
      orderBy: [{ createdAt: "desc" }],
      take: DASHBOARD_SALES_ATTENTION_TOP_LIMIT,
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        total: true,
        status: true,
        customer: { select: { id: true, name: true, displayName: true } },
        recurringInvoiceTemplate: { select: { id: true, templateNumber: true, name: true } },
      },
    });
    const deliveryNotes = await this.prisma.deliveryNote.findMany({
      where: { organizationId, status: { in: [DeliveryNoteStatus.DRAFT, DeliveryNoteStatus.ISSUED] } },
      orderBy: [{ deliveryDate: "asc" }, { issueDate: "desc" }],
      select: {
        id: true,
        deliveryNoteNumber: true,
        status: true,
        issueDate: true,
        deliveryDate: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
    });

    const collectionDueTodayStart = addUtcDays(todayStart, -DASHBOARD_COLLECTION_DUE_TODAY_WINDOW_DAYS);
    const collectionDueTodayEnd = endOfUtcDay(addUtcDays(todayEnd, DASHBOARD_COLLECTION_DUE_TODAY_WINDOW_DAYS));
    const deliveryOverdueCutoff = addUtcDays(todayStart, -DASHBOARD_DELIVERY_OVERDUE_WINDOW_DAYS);
    const overdueInvoices = outstandingInvoices
      .filter((invoice) => dueDateFor(invoice) < todayStart)
      .sort(
        (a, b) =>
          compareNullableDates(dueDateFor(a), dueDateFor(b)) ||
          this.decimal(b.balanceDue).cmp(a.balanceDue) ||
          a.invoiceNumber.localeCompare(b.invoiceNumber),
      );
    const dueTodayCollectionCases = openCollectionCases.filter((collectionCase) =>
      isWithinDay(collectionCase.nextActionAt ?? collectionCase.followUpDate, collectionDueTodayStart, collectionDueTodayEnd),
    );
    const overdueCollectionCases = openCollectionCases.filter((collectionCase) => {
      const nextDate = collectionCase.nextActionAt ?? collectionCase.followUpDate;
      return Boolean(nextDate && nextDate < collectionDueTodayStart);
    });
    const collectionTopCases = [...openCollectionCases].sort((a, b) =>
      compareCollectionAttentionCases(a, b, collectionDueTodayStart, collectionDueTodayEnd),
    );
    const promisedToPayTotal = openCollectionCases
      .filter((collectionCase) => collectionCase.status === CollectionCaseStatus.PROMISED_TO_PAY)
      .reduce((total, collectionCase) => total.plus(this.decimal(collectionCase.promisedAmount ?? 0)), new Prisma.Decimal(0));
    const sentQuotes = salesQuotes.filter((quote) => quote.status === SalesQuoteStatus.SENT);
    const activeSentQuotes = sentQuotes.filter((quote) => !quote.expiryDate || quote.expiryDate >= todayStart);
    const expiringSoonQuotes = activeSentQuotes.filter(
      (quote) => quote.expiryDate && quote.expiryDate >= todayStart && quote.expiryDate <= quoteExpiringSoonEnd,
    );
    const acceptedNotConvertedQuotes = salesQuotes.filter(
      (quote) => quote.status === SalesQuoteStatus.ACCEPTED && !quote.convertedSalesInvoiceId,
    );
    const recurringTemplatesDueSoon = recurringTemplatesDue.filter((template) => template.nextRunDate >= todayStart);
    const recurringTemplatesOverdue = recurringTemplatesDue.filter((template) => template.nextRunDate < todayStart);
    const draftDeliveryNotes = deliveryNotes.filter((deliveryNote) => deliveryNote.status === DeliveryNoteStatus.DRAFT);
    const issuedDeliveryNotes = deliveryNotes.filter((deliveryNote) => deliveryNote.status === DeliveryNoteStatus.ISSUED);
    const overdueDeliveryNotes = deliveryNotes.filter(
      (deliveryNote) =>
        deliveryNote.deliveryDate && deliveryNote.deliveryDate < deliveryOverdueCutoff && deliveryNote.status !== DeliveryNoteStatus.DELIVERED,
    );

    const openCollectionCasesByCustomer = countBy(openCollectionCases.map((collectionCase) => collectionCase.customer.id));
    const topOutstandingCustomers = this.topOutstandingCustomers(outstandingInvoices, overdueInvoices, openCollectionCasesByCustomer);

    return {
      readOnly: true,
      noMutation: true,
      helperText:
        "Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.",
      overdueInvoices: {
        count: overdueInvoices.length,
        total: this.decimalString(sum(overdueInvoices.map((invoice) => invoice.balanceDue))),
        topItems: overdueInvoices.slice(0, DASHBOARD_SALES_ATTENTION_TOP_LIMIT).map((invoice) => ({
          id: invoice.id,
          number: invoice.invoiceNumber,
          customerName: displayName(invoice.customer),
          amount: this.decimalString(invoice.balanceDue),
          issueDate: invoice.issueDate.toISOString(),
          dueDate: nullableIsoString(invoice.dueDate ?? invoice.issueDate),
          status: invoice.status,
          href: `/sales/invoices/${invoice.id}`,
        })),
      },
      collections: {
        openCount: openCollectionCases.length,
        dueTodayCount: dueTodayCollectionCases.length,
        overdueFollowUpCount: overdueCollectionCases.length,
        promisedToPayTotal: this.decimalString(promisedToPayTotal),
        disputedCount: openCollectionCases.filter((collectionCase) => collectionCase.status === CollectionCaseStatus.DISPUTED).length,
        topItems: collectionTopCases.slice(0, DASHBOARD_SALES_ATTENTION_TOP_LIMIT).map((collectionCase) => ({
          id: collectionCase.id,
          number: collectionCase.caseNumber,
          customerName: displayName(collectionCase.customer),
          amount: collectionCase.salesInvoice ? this.decimalString(collectionCase.salesInvoice.balanceDue) : null,
          status: collectionCase.status,
          followUpDate: nullableIsoString(collectionCase.nextActionAt ?? collectionCase.followUpDate),
          dueDate: nullableIsoString(collectionCase.salesInvoice?.dueDate ?? null),
          promisedPaymentDate: nullableIsoString(collectionCase.promisedPaymentDate),
          promisedAmount: collectionCase.promisedAmount ? this.decimalString(collectionCase.promisedAmount) : null,
          href: `/sales/collections/${collectionCase.id}`,
          sourceHref: collectionCase.salesInvoice ? `/sales/invoices/${collectionCase.salesInvoice.id}` : null,
        })),
      },
      quotes: {
        awaitingAcceptanceCount: activeSentQuotes.length,
        expiringSoonCount: expiringSoonQuotes.length,
        acceptedNotConvertedCount: acceptedNotConvertedQuotes.length,
        topItems: [...expiringSoonQuotes, ...acceptedNotConvertedQuotes, ...activeSentQuotes]
          .filter(uniqueById())
          .slice(0, DASHBOARD_SALES_ATTENTION_TOP_LIMIT)
          .map((quote) => ({
            id: quote.id,
            number: quote.quoteNumber,
            customerName: displayName(quote.customer),
            amount: this.decimalString(quote.total),
            status: quote.status,
            issueDate: quote.issueDate.toISOString(),
            expiryDate: nullableIsoString(quote.expiryDate),
            href: `/sales/quotes/${quote.id}`,
          })),
      },
      recurringInvoices: {
        activeCount: activeRecurringTemplateCount,
        dueSoonCount: recurringTemplatesDueSoon.length,
        overdueForGenerationCount: recurringTemplatesOverdue.length,
        recentlyGeneratedDraftInvoiceCount: recentlyGeneratedDraftInvoices.length,
        topItems: [...recurringTemplatesOverdue, ...recurringTemplatesDueSoon].slice(0, DASHBOARD_SALES_ATTENTION_TOP_LIMIT).map((template) => ({
          id: template.id,
          number: template.templateNumber,
          customerName: displayName(template.customer),
          amount: this.decimalString(template.total),
          status: template.status,
          nextRunDate: template.nextRunDate.toISOString(),
          templateName: template.name,
          href: `/sales/recurring-invoices/${template.id}`,
        })),
        recentDraftInvoices: recentlyGeneratedDraftInvoices.map((invoice) => ({
          id: invoice.id,
          number: invoice.invoiceNumber,
          customerName: displayName(invoice.customer),
          amount: this.decimalString(invoice.total),
          status: invoice.status,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: nullableIsoString(invoice.dueDate),
          templateNumber: invoice.recurringInvoiceTemplate?.templateNumber ?? null,
          templateName: invoice.recurringInvoiceTemplate?.name ?? null,
          href: `/sales/invoices/${invoice.id}`,
          sourceHref: invoice.recurringInvoiceTemplate ? `/sales/recurring-invoices/${invoice.recurringInvoiceTemplate.id}` : null,
        })),
      },
      deliveryNotes: {
        draftCount: draftDeliveryNotes.length,
        issuedNotDeliveredCount: issuedDeliveryNotes.length,
        overdueDeliveryCount: overdueDeliveryNotes.length,
        topItems: [...overdueDeliveryNotes, ...issuedDeliveryNotes, ...draftDeliveryNotes]
          .filter(uniqueById())
          .slice(0, DASHBOARD_SALES_ATTENTION_TOP_LIMIT)
          .map((deliveryNote) => ({
            id: deliveryNote.id,
            number: deliveryNote.deliveryNoteNumber,
            customerName: displayName(deliveryNote.customer),
            status: deliveryNote.status,
            issueDate: deliveryNote.issueDate.toISOString(),
            deliveryDate: nullableIsoString(deliveryNote.deliveryDate),
            href: `/sales/delivery-notes/${deliveryNote.id}`,
          })),
      },
      customers: {
        topOutstanding: topOutstandingCustomers,
      },
    };
  }

  private topOutstandingCustomers(
    outstandingInvoices: Array<{
      customer: { id: string; name: string; displayName: string | null };
      balanceDue: Prisma.Decimal.Value;
    }>,
    overdueInvoices: Array<{
      customer: { id: string; name: string; displayName: string | null };
      balanceDue: Prisma.Decimal.Value;
    }>,
    openCollectionCasesByCustomer: Map<string, number>,
  ): SalesAttentionCustomerItem[] {
    const customers = new Map<string, SalesAttentionCustomerItem>();

    for (const invoice of outstandingInvoices) {
      const id = invoice.customer.id;
      const existing = customers.get(id) ?? {
        id,
        customerName: displayName(invoice.customer),
        outstandingBalance: "0.0000",
        overdueAmount: "0.0000",
        openCollectionCaseCount: openCollectionCasesByCustomer.get(id) ?? 0,
        href: `/customers/${id}`,
      };
      existing.outstandingBalance = this.decimalString(this.decimal(existing.outstandingBalance).plus(invoice.balanceDue));
      customers.set(id, existing);
    }

    for (const invoice of overdueInvoices) {
      const existing = customers.get(invoice.customer.id);
      if (existing) {
        existing.overdueAmount = this.decimalString(this.decimal(existing.overdueAmount).plus(invoice.balanceDue));
      }
    }

    return [...customers.values()]
      .sort((a, b) => this.decimal(b.outstandingBalance).cmp(a.outstandingBalance))
      .slice(0, DASHBOARD_SALES_ATTENTION_TOP_LIMIT);
  }

  private async purchaseSummary(organizationId: string, monthStart: Date, todayStart: Date) {
    const bills = await this.prisma.purchaseBill.findMany({
      where: { organizationId, status: PurchaseBillStatus.FINALIZED },
      select: { billDate: true, dueDate: true, total: true, balanceDue: true },
    });
    const unpaid = bills.filter((bill) => this.decimal(bill.balanceDue).gt(0));
    const overdue = unpaid.filter((bill) => (bill.dueDate ?? bill.billDate) < todayStart);
    const payments = await this.prisma.supplierPayment.findMany({
      where: { organizationId, status: SupplierPaymentStatus.POSTED, paymentDate: { gte: monthStart } },
      select: { amountPaid: true },
    });

    return {
      unpaidBillCount: unpaid.length,
      unpaidBillBalance: this.decimalString(sum(unpaid.map((bill) => bill.balanceDue))),
      overdueBillCount: overdue.length,
      overdueBillBalance: this.decimalString(sum(overdue.map((bill) => bill.balanceDue))),
      purchasesThisMonth: this.decimalString(sum(bills.filter((bill) => bill.billDate >= monthStart).map((bill) => bill.total))),
      supplierPaymentThisMonth: this.decimalString(sum(payments.map((payment) => payment.amountPaid))),
    };
  }

  private async bankingSummary(organizationId: string) {
    const profiles = await this.prisma.bankAccountProfile.findMany({
      where: { organizationId, status: BankAccountStatus.ACTIVE },
      select: { accountId: true },
    });
    const unreconciledTransactionCount = await this.prisma.bankStatementTransaction.count({
      where: { organizationId, status: BankStatementTransactionStatus.UNMATCHED },
    });
    const latestReconciliation = await this.prisma.bankReconciliation.findFirst({
      where: { organizationId, status: BankReconciliationStatus.CLOSED },
      orderBy: [{ closedAt: "desc" }, { periodEnd: "desc" }],
      select: { closedAt: true, periodEnd: true },
    });
    const accountIds = profiles.map((profile) => profile.accountId);
    const lines =
      accountIds.length === 0
        ? []
        : await this.prisma.journalLine.findMany({
            where: {
              organizationId,
              accountId: { in: accountIds },
              journalEntry: { status: { in: REPORT_LEDGER_STATUSES } },
            },
            select: { debit: true, credit: true },
          });
    const totalBankBalance = lines.reduce(
      (balance, line) => balance.plus(this.decimal(line.debit)).minus(this.decimal(line.credit)),
      new Prisma.Decimal(0),
    );

    return {
      bankAccountCount: profiles.length,
      totalBankBalance: this.decimalString(totalBankBalance),
      unreconciledTransactionCount,
      latestReconciliationDate: latestReconciliation ? (latestReconciliation.closedAt ?? latestReconciliation.periodEnd).toISOString() : null,
    };
  }

  private async trendSummary(organizationId: string, months: DashboardMonth[]) {
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    if (!firstMonth || !lastMonth) {
      return { monthlySales: [], monthlyPurchases: [], monthlyNetProfit: [], cashBalanceTrend: [] };
    }

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: SalesInvoiceStatus.FINALIZED,
        issueDate: { gte: firstMonth.start, lte: lastMonth.end },
      },
      select: { issueDate: true, total: true },
    });
    const bills = await this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        status: PurchaseBillStatus.FINALIZED,
        billDate: { gte: firstMonth.start, lte: lastMonth.end },
      },
      select: { billDate: true, total: true },
    });
    const profitLines = await this.dashboardJournalLines(organizationId, {
      from: firstMonth.start,
      to: lastMonth.end,
      accountTypes: [AccountType.REVENUE, AccountType.COST_OF_SALES, AccountType.EXPENSE],
    });
    const cashBalanceTrend = await this.cashBalanceTrend(organizationId, months);

    const salesByMonth = monthlyTotals(
      months,
      invoices,
      (invoice) => invoice.issueDate,
      (invoice) => invoice.total,
    );
    const purchasesByMonth = monthlyTotals(
      months,
      bills,
      (bill) => bill.billDate,
      (bill) => bill.total,
    );

    return {
      monthlySales: months.map((month) => ({ month: month.key, amount: this.decimalString(salesByMonth.get(month.key) ?? 0) })),
      monthlyPurchases: months.map((month) => ({ month: month.key, amount: this.decimalString(purchasesByMonth.get(month.key) ?? 0) })),
      monthlyNetProfit: monthlyProfitTotals(months, profitLines).map((point) => ({ month: point.month, amount: this.decimalString(point.amount) })),
      cashBalanceTrend,
    };
  }

  private async cashBalanceTrend(organizationId: string, months: DashboardMonth[]) {
    const accountIds = (
      await this.prisma.bankAccountProfile.findMany({
        where: { organizationId, status: BankAccountStatus.ACTIVE },
        select: { accountId: true },
      })
    ).map((profile) => profile.accountId);

    if (accountIds.length === 0) {
      return months.map((month) => ({ date: dateOnly(month.start), balance: "0.0000" }));
    }

    const latestEnd = months[months.length - 1]?.end;
    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId,
        accountId: { in: accountIds },
        journalEntry: {
          status: { in: REPORT_LEDGER_STATUSES },
          ...(latestEnd ? { entryDate: { lte: latestEnd } } : {}),
        },
      },
      select: {
        debit: true,
        credit: true,
        journalEntry: { select: { entryDate: true } },
      },
    });

    return months.map((month) => {
      const balance = lines.reduce((total, line) => {
        const entryDate = line.journalEntry?.entryDate ? new Date(line.journalEntry.entryDate) : null;
        if (entryDate && entryDate > month.end) {
          return total;
        }
        return total.plus(this.decimal(line.debit)).minus(this.decimal(line.credit));
      }, new Prisma.Decimal(0));
      return { date: dateOnly(month.start), balance: this.decimalString(balance) };
    });
  }

  private async inventorySummary(organizationId: string) {
    const items = await this.prisma.item.findMany({
      where: { organizationId, inventoryTracking: true, status: ItemStatus.ACTIVE },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, reorderPoint: true },
    });
    const movements = await this.prisma.stockMovement.findMany({
      where: { organizationId },
      select: { itemId: true, type: true, quantity: true, unitCost: true, totalCost: true },
    });
    const varianceReport = await this.inventoryClearingReportService.clearingVarianceReport(organizationId);
    const movementsByItem = new Map<string, typeof movements>();
    for (const movement of movements) {
      movementsByItem.set(movement.itemId, [...(movementsByItem.get(movement.itemId) ?? []), movement]);
    }

    let lowStockCount = 0;
    let negativeStockCount = 0;
    let inventoryEstimatedValue = new Prisma.Decimal(0);
    const lowStockItems: Array<{ itemId: string; name: string; quantityOnHand: string; reorderPoint: string }> = [];
    for (const item of items) {
      const summary = this.stockSummary(movementsByItem.get(item.id) ?? []);
      if (summary.quantityOnHand.lt(0)) {
        negativeStockCount += 1;
      }
      if (item.reorderPoint && summary.quantityOnHand.lte(item.reorderPoint)) {
        lowStockCount += 1;
        lowStockItems.push({
          itemId: item.id,
          name: item.name,
          quantityOnHand: this.decimalString(summary.quantityOnHand),
          reorderPoint: this.decimalString(item.reorderPoint),
        });
      }
      if (summary.inventoryValue) {
        inventoryEstimatedValue = inventoryEstimatedValue.plus(summary.inventoryValue);
      }
    }

    return {
      trackedItemCount: items.length,
      lowStockCount,
      negativeStockCount,
      inventoryEstimatedValue: this.decimalString(inventoryEstimatedValue),
      clearingVarianceCount: varianceReport.summary.rowCount,
      lowStockItems: lowStockItems
        .sort((a, b) => new Prisma.Decimal(a.quantityOnHand).cmp(new Prisma.Decimal(b.quantityOnHand)))
        .slice(0, 5),
    };
  }

  private async agingSummary(organizationId: string, asOf: string) {
    const receivables = await this.reportsService.agedReceivables(organizationId, { asOf });
    const payables = await this.reportsService.agedPayables(organizationId, { asOf });

    return {
      receivablesBuckets: agingBuckets(receivables.bucketTotals),
      payablesBuckets: agingBuckets(payables.bucketTotals),
    };
  }

  private async reportSummary(organizationId: string, monthStart: Date, asOf: Date) {
    const lines = await this.dashboardJournalLines(organizationId, { to: asOf });
    const monthLines = lines.filter((line) => {
      const entryDate = new Date(line.journalEntry.entryDate);
      return entryDate >= monthStart && entryDate <= asOf;
    });
    const profitAndLossNetProfit = this.profitAndLossNetProfit(monthLines);
    const balanceSheetDifference = this.balanceSheetDifference(lines);

    return {
      trialBalanceBalanced: this.trialBalanceBalanced(lines),
      profitAndLossNetProfit: this.decimalString(profitAndLossNetProfit),
      balanceSheetBalanced: balanceSheetDifference.eq(0),
    };
  }

  private async dashboardJournalLines(
    organizationId: string,
    filters: { from?: Date; to?: Date; accountTypes?: AccountType[] },
  ): Promise<DashboardReportLine[]> {
    const entryDate: { gte?: Date; lte?: Date } = {};
    if (filters.from) {
      entryDate.gte = filters.from;
    }
    if (filters.to) {
      entryDate.lte = filters.to;
    }

    return this.prisma.journalLine.findMany({
      where: {
        organizationId,
        ...(filters.accountTypes ? { account: { is: { type: { in: filters.accountTypes } } } } : {}),
        journalEntry: {
          status: { in: REPORT_LEDGER_STATUSES },
          ...(Object.keys(entryDate).length ? { entryDate } : {}),
        },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { type: true } },
        journalEntry: { select: { entryDate: true } },
      },
    });
  }

  private trialBalanceBalanced(lines: DashboardReportLine[]): boolean {
    const totals = lines.reduce(
      (sum, line) => ({
        debit: sum.debit.plus(this.decimal(line.debit)),
        credit: sum.credit.plus(this.decimal(line.credit)),
      }),
      { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0) },
    );
    return totals.debit.eq(totals.credit);
  }

  private balanceSheetDifference(lines: DashboardReportLine[]): Prisma.Decimal {
    const totals = lines.reduce(
      (sum, line) => {
        const debit = this.decimal(line.debit);
        const credit = this.decimal(line.credit);
        switch (line.account.type) {
          case AccountType.ASSET:
            sum.assets = sum.assets.plus(debit).minus(credit);
            break;
          case AccountType.LIABILITY:
            sum.liabilities = sum.liabilities.plus(credit).minus(debit);
            break;
          case AccountType.EQUITY:
            sum.equity = sum.equity.plus(credit).minus(debit);
            break;
          default:
            break;
        }
        return sum;
      },
      {
        assets: new Prisma.Decimal(0),
        liabilities: new Prisma.Decimal(0),
        equity: new Prisma.Decimal(0),
      },
    );
    const retainedEarnings = this.profitAndLossNetProfit(lines);
    return totals.assets.minus(totals.liabilities.plus(totals.equity).plus(retainedEarnings));
  }

  private profitAndLossNetProfit(lines: DashboardReportLine[]): Prisma.Decimal {
    const totals = lines.reduce(
      (sum, line) => {
        const debit = this.decimal(line.debit);
        const credit = this.decimal(line.credit);
        switch (line.account.type) {
          case AccountType.REVENUE:
            sum.revenue = sum.revenue.plus(credit).minus(debit);
            break;
          case AccountType.COST_OF_SALES:
            sum.costOfSales = sum.costOfSales.plus(debit).minus(credit);
            break;
          case AccountType.EXPENSE:
            sum.expenses = sum.expenses.plus(debit).minus(credit);
            break;
          default:
            break;
        }
        return sum;
      },
      {
        revenue: new Prisma.Decimal(0),
        costOfSales: new Prisma.Decimal(0),
        expenses: new Prisma.Decimal(0),
      },
    );
    return totals.revenue.minus(totals.costOfSales).minus(totals.expenses);
  }

  private async complianceSummary(organizationId: string, monthStart: Date, now: Date) {
    const zatca = await this.zatcaSummary(organizationId);
    const fiscalPeriodsLockedCount = await this.prisma.fiscalPeriod.count({ where: { organizationId, status: FiscalPeriodStatus.LOCKED } });
    const auditLogCountThisMonth = await this.prisma.auditLog.count({ where: { organizationId, createdAt: { gte: monthStart } } });
    const currentPeriod = await this.prisma.fiscalPeriod.findFirst({
      where: { organizationId, startsOn: { lte: now }, endsOn: { gte: now } },
      select: { status: true },
    });

    return {
      ...zatca,
      fiscalPeriodsLockedCount,
      auditLogCountThisMonth,
      currentFiscalPeriodStatus: currentPeriod?.status ?? null,
    };
  }

  private async zatcaSummary(organizationId: string) {
    const profile = await this.prisma.zatcaOrganizationProfile.findUnique({
      where: { organizationId },
      select: { sellerName: true, vatNumber: true, city: true, countryCode: true },
    });
    const activeEgs = await this.prisma.zatcaEgsUnit.findFirst({
      where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
      select: { id: true, csrPem: true, complianceCsidPem: true },
    });
    const localXmlCount = await this.prisma.zatcaInvoiceMetadata.count({ where: { organizationId, xmlBase64: { not: null } } });
    const profileReadiness = getZatcaProfileReadiness(profile ?? {});
    const blockingReasons: string[] = [];
    if (!profileReadiness.ready) {
      blockingReasons.push(`ZATCA profile is missing: ${profileReadiness.missingFields.join(", ")}.`);
    }
    if (!activeEgs) {
      blockingReasons.push("No active development EGS unit is configured.");
    }
    if (activeEgs && !activeEgs.csrPem) {
      blockingReasons.push("Active EGS unit does not have a CSR yet.");
    }
    if (!activeEgs?.complianceCsidPem) {
      blockingReasons.push("No active EGS unit has a local mock compliance CSID.");
    }
    if (localXmlCount === 0) {
      blockingReasons.push("No local ZATCA XML has been generated for an invoice yet.");
    }
    blockingReasons.push("Production readiness is intentionally false until official validation, signing, API integration, and PDF/A-3 are complete.");

    return {
      zatcaProductionReady: false,
      zatcaBlockingReasonCount: blockingReasons.length,
    };
  }

  private async safeStorageReadiness(): Promise<Awaited<ReturnType<StorageService["readiness"]>> | null> {
    try {
      return await this.storageService.readiness();
    } catch {
      this.logger.warn("Onboarding checklist storage readiness unavailable.");
      return null;
    }
  }

  private onboardingRecommendedNextSteps(status: OnboardingChecklistStatus, items: OnboardingChecklistItem[]): string[] {
    const incomplete = items.filter((item) => item.status === "INCOMPLETE");
    if (status === "READY_FOR_SELLABLE_V1_REVIEW") {
      return [
        "Run a go-live rehearsal with demo invoices, payments, reports, storage checks, and dashboard smoke.",
        "Keep ZATCA production compliance blocked until official sandbox OTP/CSID and later clearance/reporting phases are implemented.",
      ];
    }

    return [
      ...incomplete.slice(0, 3).map((item) => `Complete: ${item.label}.`),
      "Review warnings before using LedgerByte with real customer data.",
      "Do not enable real ZATCA network calls or production compliance claims in this phase.",
    ];
  }

  private attentionItems(input: {
    sales: Awaited<ReturnType<DashboardService["salesSummary"]>>;
    salesAttention: Awaited<ReturnType<DashboardService["salesAttentionSummary"]>>;
    purchases: Awaited<ReturnType<DashboardService["purchaseSummary"]>>;
    banking: Awaited<ReturnType<DashboardService["bankingSummary"]>>;
    inventory: Awaited<ReturnType<DashboardService["inventorySummary"]>>;
    compliance: Awaited<ReturnType<DashboardService["complianceSummary"]>>;
    storageDatabaseActive: boolean;
    warnings: DashboardSectionWarning[];
  }): AttentionItem[] {
    const items: AttentionItem[] = [];
    for (const warning of input.warnings) {
      items.push({
        type: `DASHBOARD_SECTION_UNAVAILABLE_${warning.section.toUpperCase()}`,
        severity: "warning",
        title: "Dashboard section temporarily unavailable",
        description: `${warning.section} data could not be loaded. Other dashboard sections are still shown.`,
        href: "/dashboard",
      });
    }
    if (input.sales.overdueInvoiceCount > 0) {
      items.push({
        type: "OVERDUE_INVOICES",
        severity: "warning",
        title: "Overdue invoices need follow-up",
        description: `${input.sales.overdueInvoiceCount} invoices are overdue with ${input.sales.overdueInvoiceBalance} still outstanding.`,
        href: "/reports/aged-receivables",
      });
    }
    if (input.salesAttention.collections.overdueFollowUpCount > 0 || input.salesAttention.collections.dueTodayCount > 0) {
      items.push({
        type: "COLLECTION_FOLLOWUPS",
        severity: input.salesAttention.collections.overdueFollowUpCount > 0 ? "warning" : "info",
        title: "Collection follow-ups need review",
        description: `${input.salesAttention.collections.dueTodayCount} due today and ${input.salesAttention.collections.overdueFollowUpCount} overdue follow-ups are tracked without sending reminders.`,
        href: "/sales/collections",
      });
    }
    if (input.salesAttention.quotes.awaitingAcceptanceCount > 0 || input.salesAttention.quotes.expiringSoonCount > 0) {
      items.push({
        type: "QUOTES_AWAITING_ACTION",
        severity: "info",
        title: "Quotes awaiting action",
        description: `${input.salesAttention.quotes.awaitingAcceptanceCount} sent quotes await acceptance and ${input.salesAttention.quotes.expiringSoonCount} expire soon.`,
        href: "/sales/quotes",
      });
    }
    if (input.salesAttention.recurringInvoices.overdueForGenerationCount > 0 || input.salesAttention.recurringInvoices.dueSoonCount > 0) {
      items.push({
        type: "RECURRING_TEMPLATES_DUE",
        severity: input.salesAttention.recurringInvoices.overdueForGenerationCount > 0 ? "warning" : "info",
        title: "Recurring templates due for manual generation",
        description: `${input.salesAttention.recurringInvoices.dueSoonCount} due soon and ${input.salesAttention.recurringInvoices.overdueForGenerationCount} overdue templates require manual generation.`,
        href: "/sales/recurring-invoices",
      });
    }
    if (input.salesAttention.deliveryNotes.draftCount > 0 || input.salesAttention.deliveryNotes.issuedNotDeliveredCount > 0) {
      items.push({
        type: "DELIVERY_NOTES_AWAITING_ACTION",
        severity: input.salesAttention.deliveryNotes.overdueDeliveryCount > 0 ? "warning" : "info",
        title: "Delivery notes awaiting fulfillment action",
        description: `${input.salesAttention.deliveryNotes.draftCount} drafts and ${input.salesAttention.deliveryNotes.issuedNotDeliveredCount} issued delivery notes remain non-posting fulfillment records.`,
        href: "/sales/delivery-notes",
      });
    }
    if (input.purchases.overdueBillCount > 0) {
      items.push({
        type: "OVERDUE_BILLS",
        severity: "warning",
        title: "Overdue supplier bills",
        description: `${input.purchases.overdueBillCount} bills are overdue with ${input.purchases.overdueBillBalance} still unpaid.`,
        href: "/reports/aged-payables",
      });
    }
    if (input.banking.unreconciledTransactionCount > 0) {
      items.push({
        type: "UNRECONCILED_BANK_TRANSACTIONS",
        severity: "warning",
        title: "Bank transactions are unreconciled",
        description: `${input.banking.unreconciledTransactionCount} imported bank transactions are still unmatched.`,
        href: "/bank-accounts",
      });
    }
    if (input.inventory.lowStockCount > 0) {
      items.push({
        type: "LOW_STOCK",
        severity: "warning",
        title: "Inventory below reorder point",
        description: `${input.inventory.lowStockCount} tracked items are at or below their reorder point.`,
        href: "/inventory/reports/low-stock",
      });
    }
    if (input.inventory.clearingVarianceCount > 0) {
      items.push({
        type: "INVENTORY_CLEARING_VARIANCE",
        severity: "critical",
        title: "Inventory clearing variance exists",
        description: `${input.inventory.clearingVarianceCount} clearing variance rows need accountant review.`,
        href: "/inventory/reports/clearing-variance",
      });
    }
    if (!input.compliance.zatcaProductionReady) {
      items.push({
        type: "ZATCA_NOT_READY",
        severity: "info",
        title: "ZATCA production readiness is incomplete",
        description: `${input.compliance.zatcaBlockingReasonCount} readiness blockers remain in the local ZATCA checklist.`,
        href: "/settings/zatca",
      });
    }
    if (!input.compliance.currentFiscalPeriodStatus) {
      items.push({
        type: "FISCAL_PERIOD_MISSING",
        severity: "warning",
        title: "No current fiscal period found",
        description: "Create or review fiscal periods so posting-date controls have current-period coverage.",
        href: "/fiscal-periods",
      });
    } else if (input.compliance.currentFiscalPeriodStatus !== FiscalPeriodStatus.OPEN) {
      items.push({
        type: "FISCAL_PERIOD_NOT_OPEN",
        severity: "critical",
        title: "Current fiscal period is not open",
        description: `The current fiscal period is ${input.compliance.currentFiscalPeriodStatus.toLowerCase()}. Posting workflows may be blocked.`,
        href: "/fiscal-periods",
      });
    }
    if (input.storageDatabaseActive) {
      items.push({
        type: "DATABASE_STORAGE_ACTIVE",
        severity: "info",
        title: "Document storage is database-backed",
        description: "Database/base64 storage is acceptable for testing but should be reviewed before production scale.",
        href: "/settings/storage",
      });
    }
    return items;
  }

  private stockSummary(
    movements: Array<{
      type: StockMovementType;
      quantity: Prisma.Decimal.Value;
      unitCost: Prisma.Decimal.Value | null;
      totalCost: Prisma.Decimal.Value | null;
    }>,
  ) {
    let quantityOnHand = new Prisma.Decimal(0);
    let costedInQuantity = new Prisma.Decimal(0);
    let costedInValue = new Prisma.Decimal(0);

    for (const movement of movements) {
      const quantity = this.decimal(movement.quantity);
      if (stockMovementDirection(movement.type) === "IN") {
        quantityOnHand = quantityOnHand.plus(quantity);
        const movementValue = movement.totalCost
          ? this.decimal(movement.totalCost)
          : movement.unitCost
            ? quantity.mul(movement.unitCost)
            : null;
        if (movementValue && quantity.gt(0)) {
          costedInQuantity = costedInQuantity.plus(quantity);
          costedInValue = costedInValue.plus(movementValue);
        }
      } else {
        quantityOnHand = quantityOnHand.minus(quantity);
      }
    }

    const averageUnitCost = costedInQuantity.gt(0) ? costedInValue.div(costedInQuantity) : null;
    return {
      quantityOnHand,
      inventoryValue: averageUnitCost ? averageUnitCost.mul(quantityOnHand) : null,
    };
  }

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }

  private decimalString(value: Prisma.Decimal.Value): string {
    return this.decimal(value).toFixed(4);
  }

  private sanitizeDashboardSectionError(section: DashboardSectionName, error: unknown): DashboardSectionWarning {
    const code = isErrorWithCode(error) ? error.code : error instanceof Error ? error.name : "UNKNOWN";
    return {
      section,
      code,
      message: "Dashboard section is temporarily unavailable.",
    };
  }

  private emptySalesSummary() {
    return {
      unpaidInvoiceCount: 0,
      unpaidInvoiceBalance: "0.0000",
      overdueInvoiceCount: 0,
      overdueInvoiceBalance: "0.0000",
      salesThisMonth: "0.0000",
      customerPaymentThisMonth: "0.0000",
    };
  }

  private emptySalesAttentionSummary(): SalesAttentionSummary {
    return {
      readOnly: true,
      noMutation: true,
      helperText:
        "Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.",
      overdueInvoices: { count: 0, total: "0.0000", topItems: [] as SalesAttentionTopItem[] },
      collections: {
        openCount: 0,
        dueTodayCount: 0,
        overdueFollowUpCount: 0,
        promisedToPayTotal: "0.0000",
        disputedCount: 0,
        topItems: [] as SalesAttentionTopItem[],
      },
      quotes: {
        awaitingAcceptanceCount: 0,
        expiringSoonCount: 0,
        acceptedNotConvertedCount: 0,
        topItems: [] as SalesAttentionTopItem[],
      },
      recurringInvoices: {
        activeCount: 0,
        dueSoonCount: 0,
        overdueForGenerationCount: 0,
        recentlyGeneratedDraftInvoiceCount: 0,
        topItems: [] as SalesAttentionTopItem[],
        recentDraftInvoices: [] as SalesAttentionTopItem[],
      },
      deliveryNotes: {
        draftCount: 0,
        issuedNotDeliveredCount: 0,
        overdueDeliveryCount: 0,
        topItems: [] as SalesAttentionTopItem[],
      },
      customers: {
        topOutstanding: [] as SalesAttentionCustomerItem[],
      },
    };
  }

  private emptyPurchaseSummary() {
    return {
      unpaidBillCount: 0,
      unpaidBillBalance: "0.0000",
      overdueBillCount: 0,
      overdueBillBalance: "0.0000",
      purchasesThisMonth: "0.0000",
      supplierPaymentThisMonth: "0.0000",
    };
  }

  private emptyBankingSummary() {
    return {
      bankAccountCount: 0,
      totalBankBalance: "0.0000",
      unreconciledTransactionCount: 0,
      latestReconciliationDate: null,
    };
  }

  private emptyInventorySummary() {
    return {
      trackedItemCount: 0,
      lowStockCount: 0,
      negativeStockCount: 0,
      inventoryEstimatedValue: "0.0000",
      clearingVarianceCount: 0,
      lowStockItems: [],
    };
  }

  private emptyReportSummary() {
    return {
      trialBalanceBalanced: false,
      profitAndLossNetProfit: "0.0000",
      balanceSheetBalanced: false,
    };
  }

  private emptyTrendSummary(months: DashboardMonth[]) {
    return {
      monthlySales: months.map((month) => ({ month: month.key, amount: "0.0000" })),
      monthlyPurchases: months.map((month) => ({ month: month.key, amount: "0.0000" })),
      monthlyNetProfit: months.map((month) => ({ month: month.key, amount: "0.0000" })),
      cashBalanceTrend: months.map((month) => ({ date: dateOnly(month.start), balance: "0.0000" })),
    };
  }

  private emptyAgingSummary() {
    const emptyBuckets = Object.values(AGING_BUCKET_LABELS).map((bucket) => ({ bucket, amount: "0.0000" }));
    return {
      receivablesBuckets: emptyBuckets,
      payablesBuckets: emptyBuckets,
    };
  }

  private emptyComplianceSummary() {
    return {
      zatcaProductionReady: false,
      zatcaBlockingReasonCount: 1,
      fiscalPeriodsLockedCount: 0,
      auditLogCountThisMonth: 0,
      currentFiscalPeriodStatus: null,
    };
  }

  private emptyStorageReadiness() {
    return {
      attachmentStorage: { activeProvider: "unavailable" },
      generatedDocumentStorage: { activeProvider: "unavailable" },
    };
  }
}

function isErrorWithCode(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && typeof (error as { code?: unknown }).code === "string";
}

function sum(values: Prisma.Decimal.Value[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((total, value) => total.plus(value), new Prisma.Decimal(0));
}

function monthlyTotals<T>(
  months: DashboardMonth[],
  records: T[],
  getDate: (record: T) => Date,
  getAmount: (record: T) => Prisma.Decimal.Value,
): Map<string, Prisma.Decimal> {
  const totals = new Map(months.map((month) => [month.key, new Prisma.Decimal(0)]));
  for (const record of records) {
    const key = monthKey(getDate(record));
    const current = totals.get(key);
    if (current) {
      totals.set(key, current.plus(getAmount(record)));
    }
  }
  return totals;
}

function monthlyProfitTotals(months: DashboardMonth[], lines: DashboardReportLine[]): Array<{ month: string; amount: Prisma.Decimal }> {
  const totals = new Map(months.map((month) => [month.key, new Prisma.Decimal(0)]));
  for (const line of lines) {
    const key = monthKey(new Date(line.journalEntry.entryDate));
    const current = totals.get(key);
    if (!current) {
      continue;
    }
    const debit = new Prisma.Decimal(line.debit);
    const credit = new Prisma.Decimal(line.credit);
    const amount =
      line.account.type === AccountType.REVENUE
        ? credit.minus(debit)
        : line.account.type === AccountType.COST_OF_SALES || line.account.type === AccountType.EXPENSE
          ? debit.minus(credit).negated()
          : new Prisma.Decimal(0);
    totals.set(key, current.plus(amount));
  }
  return months.map((month) => ({ month: month.key, amount: totals.get(month.key) ?? new Prisma.Decimal(0) }));
}

function agingBuckets(bucketTotals: Record<string, Prisma.Decimal.Value>) {
  return Object.entries(AGING_BUCKET_LABELS).map(([key, label]) => ({
    bucket: label,
    amount: new Prisma.Decimal(bucketTotals[key] ?? 0).toFixed(4),
  }));
}

function lastSixUtcMonths(now: Date): DashboardMonth[] {
  const currentMonth = startOfUtcMonth(now);
  return Array.from({ length: 6 }, (_, index) => {
    const start = addUtcMonths(currentMonth, index - 5);
    return {
      key: monthKey(start),
      start,
      end: endOfUtcMonth(start),
    };
  });
}

function dueDateFor(record: { dueDate: Date | null; issueDate: Date }): Date {
  return record.dueDate ?? record.issueDate;
}

function isWithinDay(date: Date | null | undefined, todayStart: Date, todayEnd: Date): boolean {
  return Boolean(date && date >= todayStart && date <= todayEnd);
}

function compareCollectionAttentionCases(a: CollectionAttentionRow, b: CollectionAttentionRow, todayStart: Date, todayEnd: Date): number {
  return (
    collectionFollowUpRank(a, todayStart, todayEnd) - collectionFollowUpRank(b, todayStart, todayEnd) ||
    collectionPriorityRank(a.priority) - collectionPriorityRank(b.priority) ||
    compareNullableDates(collectionFollowUpDate(a), collectionFollowUpDate(b)) ||
    a.caseNumber.localeCompare(b.caseNumber)
  );
}

function collectionFollowUpRank(collectionCase: CollectionAttentionRow, todayStart: Date, todayEnd: Date): number {
  const followUpDate = collectionFollowUpDate(collectionCase);
  if (followUpDate && followUpDate < todayStart) {
    return 0;
  }
  if (isWithinDay(followUpDate, todayStart, todayEnd)) {
    return 1;
  }
  return 2;
}

function collectionFollowUpDate(collectionCase: CollectionAttentionRow): Date | null {
  return collectionCase.nextActionAt ?? collectionCase.followUpDate;
}

function collectionPriorityRank(priority: string): number {
  return COLLECTION_PRIORITY_RANK[priority] ?? 99;
}

function compareNullableDates(a: Date | null | undefined, b: Date | null | undefined): number {
  if (a && b) {
    return a.getTime() - b.getTime();
  }
  if (a) {
    return -1;
  }
  if (b) {
    return 1;
  }
  return 0;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function addUtcDays(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + delta));
}

function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nullableIsoString(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

function displayName(contact: { name: string; displayName: string | null }): string {
  return contact.displayName ?? contact.name;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function uniqueById<T extends { id: string }>(): (value: T, index: number, values: T[]) => boolean {
  return (value, index, values) => values.findIndex((candidate) => candidate.id === value.id) === index;
}

function hasFifteenDigitVat(value: string | null | undefined): boolean {
  return /^\d{15}$/.test(value ?? "");
}
