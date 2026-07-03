"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  ClipboardList,
  FileText,
  FileUp,
  Landmark,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useAppLocale } from "@/components/app-locale-provider";
import { DashboardFirstWorkflowPrompt, DashboardOnboardingCard } from "@/components/onboarding/setup-wizard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { ActionGrid, ActionTile, KpiCard, PageHeader, StatusBadge } from "@/components/ui-ledger";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  agingBucketLabel,
  attentionSeverityClass,
  attentionSeverityLabel,
  canViewSalesAttention,
  chartBarPercent,
  chartHasData,
  chartMaxAmount,
  dashboardDrilldownLink,
  dashboardHealthLabel,
  dashboardIsEmpty,
  formatDashboardMoney,
  groupAttentionBySeverity,
  visibleDashboardQuickActions,
  visibleDashboardWorkspaceLinks,
  type DashboardDrilldownLink,
} from "@/lib/dashboard";
import { getLedgerByteEdition } from "@/lib/edition";
import { formatAppDate, formatAppDateTime } from "@/lib/app-i18n";
import type {
  DashboardAgingBucket,
  DashboardAttentionItem,
  DashboardCashTrendPoint,
  DashboardLowStockItem,
  DashboardOnboardingChecklist,
  DashboardSalesAttentionCustomerItem,
  DashboardSalesAttentionSummary,
  DashboardSalesAttentionTopItem,
  DashboardSummary,
  DashboardTrendPoint,
} from "@/lib/types";

type DashboardLinks = Partial<Record<string, DashboardDrilldownLink | null>>;

const EMPTY_SALES_ATTENTION: DashboardSalesAttentionSummary = {
  readOnly: true,
  noMutation: true,
  helperText:
    "Dashboard attention items are read-only workflow signals. They do not send emails, collect payments, post journals, file VAT, call ZATCA, or move inventory.",
  overdueInvoices: {
    count: 0,
    total: "0.0000",
    topItems: [],
  },
  collections: {
    openCount: 0,
    dueTodayCount: 0,
    overdueFollowUpCount: 0,
    promisedToPayTotal: "0.0000",
    disputedCount: 0,
    topItems: [],
  },
  quotes: {
    awaitingAcceptanceCount: 0,
    expiringSoonCount: 0,
    acceptedNotConvertedCount: 0,
    topItems: [],
  },
  recurringInvoices: {
    activeCount: 0,
    dueSoonCount: 0,
    overdueForGenerationCount: 0,
    recentlyGeneratedDraftInvoiceCount: 0,
    topItems: [],
    recentDraftInvoices: [],
  },
  deliveryNotes: {
    draftCount: 0,
    issuedNotDeliveredCount: 0,
    topItems: [],
    overdueDeliveryCount: 0,
  },
  customers: {
    topOutstanding: [],
  },
};

export default function DashboardPage() {
  const organizationId = useActiveOrganizationId();
  const { activeMembership } = usePermissions();
  const { dir, locale, t, tc } = useAppLocale();
  const edition = getLedgerByteEdition();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [onboardingChecklist, setOnboardingChecklist] = useState<DashboardOnboardingChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [error, setError] = useState("");
  const [onboardingError, setOnboardingError] = useState("");
  const quickActions = useMemo(() => visibleDashboardQuickActions(activeMembership), [activeMembership]);
  const workspaceLinks = useMemo(() => visibleDashboardWorkspaceLinks(activeMembership), [activeMembership]);
  const drilldownLinks = useMemo(
    () => ({
      unpaidInvoices: dashboardDrilldownLink("unpaidInvoices", activeMembership),
      overdueInvoices: dashboardDrilldownLink("overdueInvoices", activeMembership),
      salesQuotes: dashboardDrilldownLink("salesQuotes", activeMembership),
      recurringInvoices: dashboardDrilldownLink("recurringInvoices", activeMembership),
      deliveryNotes: dashboardDrilldownLink("deliveryNotes", activeMembership),
      collections: dashboardDrilldownLink("collections", activeMembership),
      unpaidBills: dashboardDrilldownLink("unpaidBills", activeMembership),
      overdueBills: dashboardDrilldownLink("overdueBills", activeMembership),
      customerPayments: dashboardDrilldownLink("customerPayments", activeMembership),
      customers: dashboardDrilldownLink("customers", activeMembership),
      supplierPayments: dashboardDrilldownLink("supplierPayments", activeMembership),
      bankBalance: dashboardDrilldownLink("bankBalance", activeMembership),
      bankReconciliations: dashboardDrilldownLink("bankReconciliations", activeMembership),
      unreconciledTransactions: dashboardDrilldownLink("unreconciledTransactions", activeMembership),
      lowStock: dashboardDrilldownLink("lowStock", activeMembership),
      negativeStock: dashboardDrilldownLink("negativeStock", activeMembership),
      clearingVariances: dashboardDrilldownLink("clearingVariances", activeMembership),
      trialBalance: dashboardDrilldownLink("trialBalance", activeMembership),
      profitAndLoss: dashboardDrilldownLink("profitAndLoss", activeMembership),
      balanceSheet: dashboardDrilldownLink("balanceSheet", activeMembership),
      fiscalPeriods: dashboardDrilldownLink("fiscalPeriods", activeMembership),
      zatcaReadiness: dashboardDrilldownLink("zatcaReadiness", activeMembership),
      auditLogs: dashboardDrilldownLink("auditLogs", activeMembership),
      storage: dashboardDrilldownLink("storage", activeMembership),
    }),
    [activeMembership],
  );
  const canSeeSalesAttention = useMemo(() => canViewSalesAttention(activeMembership), [activeMembership]);
  const attentionGroups = useMemo(() => (summary ? groupAttentionBySeverity(summary.attentionItems) : null), [summary]);
  const dashboardSignals = [
    t("dashboard.signalManualBank"),
    ...(edition.showsUaeEinvoicing ? [t("dashboard.signalAsp"), t("dashboard.signalFta")] : []),
    ...(edition.showsKsaZatca ? [t("dashboard.signalZatcaNetwork"), t("dashboard.signalZatcaClearance")] : []),
    ...(!edition.showsKsaZatca && !edition.showsUaeEinvoicing ? [t("dashboard.signalCountryComplianceDisabled")] : []),
  ];

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setOnboardingLoading(true);
    setError("");
    setOnboardingError("");

    apiRequest<DashboardSummary>("/dashboard/summary")
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard summary.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    apiRequest<DashboardOnboardingChecklist>("/dashboard/onboarding-checklist")
      .then((result) => {
        if (!cancelled) {
          setOnboardingChecklist(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setOnboardingError(loadError instanceof Error ? loadError.message : "Unable to load onboarding checklist.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOnboardingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-lg border border-line bg-sidebar p-5 text-white shadow-panel">
        <FinancialFlowBackdrop />
        <div className="relative z-10">
          <PageHeader
            eyebrow={t("dashboard.headerEyebrow")}
            title={tc("Dashboard")}
            inverse
            badge={<StatusBadge tone="info">{t("common.controlledBeta")}</StatusBadge>}
            description={
              <>
                {t("dashboard.asOf", { date: summary ? formatAppDate(summary.asOf, locale, tc("today")) : tc("today"), note: tc(edition.complianceDashboardNote) })}
                {summary ? <span className="block text-xs text-slate-300">{t("dashboard.lastUpdated", { value: formatAppDateTime(summary.asOf, locale) })}</span> : null}
              </>
            }
            actions={
              quickActions.length > 0 ? (
                <>
                  {quickActions.slice(0, 3).map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="ledger-focus inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      {tc(action.label)}
                      <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} aria-hidden="true" />
                    </Link>
                  ))}
                </>
              ) : null
            }
          />
          <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 md:grid-cols-3">
            {dashboardSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{t("dashboard.loadNoOrg")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{t("dashboard.loading")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {summary ? (
        <>
          {dashboardIsEmpty(summary) ? (
            <DashboardFirstWorkflowPrompt checklist={onboardingChecklist} />
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Kpi
              icon={<TrendingUp className="h-5 w-5" />}
              label={tc("Revenue")}
              value={formatDashboardMoney(summary.sales.salesThisMonth, summary.currency, locale)}
              detail={tc("Sales this month")}
              href={drilldownLinks.profitAndLoss?.href}
              tone="info"
            />
            <Kpi
              icon={<ReceiptText className="h-5 w-5" />}
              label={tc("Expenses")}
              value={formatDashboardMoney(summary.purchases.purchasesThisMonth, summary.currency, locale)}
              detail={tc("Purchases this month")}
              href={drilldownLinks.unpaidBills?.href}
              tone="warning"
            />
            <Kpi
              icon={<BarChart3 className="h-5 w-5" />}
              label={tc("Net profit")}
              value={formatDashboardMoney(summary.reports.profitAndLossNetProfit, summary.currency, locale)}
              detail={dashboardHealthLabel(summary.reports.trialBalanceBalanced, locale)}
              href={drilldownLinks.profitAndLoss?.href}
              tone={summary.reports.trialBalanceBalanced ? "success" : "warning"}
            />
            <Kpi
              icon={<Banknote className="h-5 w-5" />}
              label={tc("Cash balance")}
              value={formatDashboardMoney(summary.banking.totalBankBalance, summary.currency, locale)}
              detail={t("dashboard.activeAccounts", { count: summary.banking.bankAccountCount })}
              href={drilldownLinks.bankBalance?.href}
              tone="success"
            />
            <Kpi
              icon={<FileText className="h-5 w-5" />}
              label={tc("Receivables")}
              value={formatDashboardMoney(summary.sales.unpaidInvoiceBalance, summary.currency, locale)}
              detail={`${summary.sales.unpaidInvoiceCount} ${tc("open")}, ${summary.sales.overdueInvoiceCount} ${tc("overdue")}`}
              href={drilldownLinks.unpaidInvoices?.href}
              tone={summary.sales.overdueInvoiceCount > 0 ? "danger" : "neutral"}
            />
            <Kpi
              icon={<ReceiptText className="h-5 w-5" />}
              label={tc("Payables")}
              value={formatDashboardMoney(summary.purchases.unpaidBillBalance, summary.currency, locale)}
              detail={`${summary.purchases.unpaidBillCount} ${tc("open")}, ${summary.purchases.overdueBillCount} ${tc("overdue")}`}
              href={drilldownLinks.unpaidBills?.href}
              tone={summary.purchases.overdueBillCount > 0 ? "warning" : "neutral"}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-5">
              <Section title={tc("Sales & purchases")} action={drilldownLinks.profitAndLoss ? <SectionLink link={drilldownLinks.profitAndLoss} /> : null}>
                <MetricGrid
                  items={[
                    { label: tc("Sales this month"), value: formatDashboardMoney(summary.sales.salesThisMonth, summary.currency, locale), href: drilldownLinks.unpaidInvoices?.href },
                    {
                      label: tc("Customer payments"),
                      value: formatDashboardMoney(summary.sales.customerPaymentThisMonth, summary.currency, locale),
                      href: drilldownLinks.customerPayments?.href,
                    },
                    { label: tc("Purchases this month"), value: formatDashboardMoney(summary.purchases.purchasesThisMonth, summary.currency, locale), href: drilldownLinks.unpaidBills?.href },
                    {
                      label: tc("Supplier payments"),
                      value: formatDashboardMoney(summary.purchases.supplierPaymentThisMonth, summary.currency, locale),
                      href: drilldownLinks.supplierPayments?.href,
                    },
                  ]}
                />
                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <SalesPurchasesTrend
                    sales={summary.trends.monthlySales}
                    purchases={summary.trends.monthlyPurchases}
                    currency={summary.currency}
                  />
                  <NetProfitTrend points={summary.trends.monthlyNetProfit} currency={summary.currency} />
                </div>
              </Section>

              {canSeeSalesAttention ? (
                <SalesArAttentionSection
                  attention={summary.salesAttention ?? EMPTY_SALES_ATTENTION}
                  currency={summary.currency}
                  canLinkCustomers={Boolean(drilldownLinks.customers)}
                />
              ) : null}

              <Section title={tc("Receivables and payables aging")}>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <AgingBars title={tc("AR aging")} buckets={summary.aging.receivablesBuckets} currency={summary.currency} />
                  <AgingBars title={tc("AP aging")} buckets={summary.aging.payablesBuckets} currency={summary.currency} />
                </div>
              </Section>

              <Section title={tc("Banking and inventory")} action={drilldownLinks.bankBalance ? <SectionLink link={drilldownLinks.bankBalance} /> : null}>
                <MetricGrid
                  items={[
                    {
                      label: tc("Unreconciled bank rows"),
                      value: String(summary.banking.unreconciledTransactionCount),
                      href: drilldownLinks.unreconciledTransactions?.href,
                    },
                    {
                      label: tc("Latest reconciliation"),
                      value: summary.banking.latestReconciliationDate ? formatAppDate(summary.banking.latestReconciliationDate, locale, "-") : "-",
                      href: drilldownLinks.bankReconciliations?.href,
                    },
                    { label: tc("Low-stock items"), value: String(summary.inventory.lowStockCount), href: drilldownLinks.lowStock?.href },
                    { label: tc("Clearing variances"), value: String(summary.inventory.clearingVarianceCount), href: drilldownLinks.clearingVariances?.href },
                    { label: tc("Negative-stock items"), value: String(summary.inventory.negativeStockCount), href: drilldownLinks.negativeStock?.href },
                  ]}
                />
                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <CashBalanceTrend points={summary.trends.cashBalanceTrend} currency={summary.currency} />
                  <LowStockMiniList items={summary.inventory.lowStockItems} />
                </div>
              </Section>

              <Section title={tc("Compliance and controls")} action={drilldownLinks.trialBalance ? <SectionLink link={drilldownLinks.trialBalance} /> : null}>
                <MetricGrid
                  items={[
                    {
                      label: tc(edition.complianceReadinessLabel),
                      value: summary.compliance.zatcaProductionReady ? tc("Local ready") : t("common.controlledBeta"),
                      href: drilldownLinks.zatcaReadiness?.href,
                    },
                    { label: tc("Local readiness blockers"), value: String(summary.compliance.zatcaBlockingReasonCount), href: drilldownLinks.zatcaReadiness?.href },
                    { label: tc("Locked fiscal periods"), value: String(summary.compliance.fiscalPeriodsLockedCount), href: drilldownLinks.fiscalPeriods?.href },
                    { label: tc("Audit logs this month"), value: String(summary.compliance.auditLogCountThisMonth), href: drilldownLinks.auditLogs?.href },
                    { label: tc("Balance sheet"), value: dashboardHealthLabel(summary.reports.balanceSheetBalanced, locale), href: drilldownLinks.balanceSheet?.href },
                  ]}
                />
                <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-900">
                  {tc(edition.complianceDashboardNote)}
                </div>
              </Section>
            </div>

            <div className="space-y-5">
              {onboardingChecklist ? (
                <DashboardOnboardingCard checklist={onboardingChecklist} />
              ) : onboardingLoading ? (
                <Section title={tc("Onboarding checklist")}>
                  <StatusMessage type="loading">{tc("Loading onboarding checklist...")}</StatusMessage>
                </Section>
              ) : onboardingError ? (
                <Section title={tc("Onboarding checklist")}>
                  <StatusMessage type="error">{onboardingError}</StatusMessage>
                </Section>
              ) : null}

              <Section title={t("dashboard.sectionAttention")}>
                {summary.attentionItems.length > 0 && attentionGroups ? (
                  <div className="space-y-4">
                    <AttentionSeverityBars groups={attentionGroups} />
                    <div className="space-y-3">
                      {summary.attentionItems.map((item) => (
                        <AttentionItemRow
                          key={`${item.type}-${item.href}`}
                          item={item}
                          href={attentionHref(item, drilldownLinks)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      {t("dashboard.emptyAttentionTitle")}
                    </div>
                    <p className="mt-1 text-xs">{t("dashboard.emptyAttentionBody")}</p>
                  </div>
                )}
              </Section>

              {quickActions.length > 0 ? (
                <Section title={t("dashboard.quickActions")}>
                  <ActionGrid>
                    {quickActions.slice(0, 6).map((action) => (
                      <ActionTile key={action.href} href={action.href} icon={quickActionIcon(action.label)} label={tc(action.label)} description={quickActionDescription(action.label, tc)} />
                    ))}
                  </ActionGrid>
                </Section>
              ) : null}
              {workspaceLinks.length > 0 ? (
                <Section title={tc("Common workspaces")}>
                  <ActionGrid>
                    {workspaceLinks.map((link) => (
                      <ActionTile key={link.href} href={link.href} icon={FileText} label={tc(link.label)} description={tc(link.description)} />
                    ))}
                  </ActionGrid>
                </Section>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function FinancialFlowBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:56px_56px]" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 220" preserveAspectRatio="none">
        <path d="M0 150 C150 60 260 200 410 110 C540 34 680 82 900 28" fill="none" stroke="rgba(147,197,253,0.26)" strokeWidth="2" />
        <path d="M0 104 C160 146 250 40 390 90 C520 136 665 150 900 74" fill="none" stroke="rgba(45,212,191,0.18)" strokeWidth="2" />
        <path d="M0 184 C180 160 290 178 430 142 C590 100 740 146 900 118" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      </svg>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: Readonly<{ icon: ReactNode; label: string; value: string; detail: string; href?: string; tone?: "neutral" | "success" | "warning" | "danger" | "info" }>) {
  return <KpiCard iconNode={icon} label={label} value={value} detail={detail} href={href} tone={tone} />;
}

function quickActionIcon(label: string) {
  if (/invoice/i.test(label)) return ReceiptText;
  if (/bill|expense|supplier/i.test(label)) return ShoppingCart;
  if (/payment/i.test(label)) return Banknote;
  if (/bank|statement/i.test(label)) return Landmark;
  if (/report/i.test(label)) return BarChart3;
  if (/inventory/i.test(label)) return ClipboardList;
  if (/upload|document/i.test(label)) return FileUp;
  return FileText;
}

function quickActionDescription(label: string, translateLabel: (label: string) => string): string {
  if (/invoice/i.test(label)) return translateLabel("Create a customer invoice with VAT-aware line items.");
  if (/bill/i.test(label)) return translateLabel("Enter supplier costs, VAT, and account coding.");
  if (/payment/i.test(label)) return translateLabel("Record a payment against open AR/AP balances.");
  if (/bank|statement/i.test(label)) return translateLabel("Import or review manual bank transactions.");
  if (/report/i.test(label)) return translateLabel("Open accountant-ready financial reports.");
  if (/inventory/i.test(label)) return translateLabel("Review operational stock controls.");
  return translateLabel("Start the next bookkeeping task safely.");
}

function Section({ title, action, children }: Readonly<{ title: string; action?: ReactNode; children: ReactNode }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SectionLink({ link }: Readonly<{ link: DashboardDrilldownLink }>) {
  const { dir, tc } = useAppLocale();
  return (
    <Link href={link.href} className="inline-flex items-center gap-1 text-xs font-semibold text-palm hover:underline">
      {tc(link.label)}
      <ArrowRight className={`h-3.5 w-3.5 ${dir === "rtl" ? "rotate-180" : ""}`} aria-hidden="true" />
    </Link>
  );
}

function MetricGrid({ items }: Readonly<{ items: Array<{ label: string; value: string; href?: string }> }>) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item) => {
        const content = (
          <>
            <div className="text-xs text-steel">{item.label}</div>
            <div className="mt-1 font-mono text-sm font-semibold text-ink">{item.value}</div>
          </>
        );
        const className = "rounded-md bg-mist px-3 py-2";
        return item.href ? (
          <Link key={item.label} href={item.href} className={`${className} block hover:bg-slate-100`}>
            {content}
          </Link>
        ) : (
          <div key={item.label} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function SalesArAttentionSection({
  attention,
  currency,
  canLinkCustomers,
}: Readonly<{ attention: DashboardSalesAttentionSummary; currency: string; canLinkCustomers: boolean }>) {
  const { locale, t, tc } = useAppLocale();
  return (
    <Section title={tc("Sales/AR attention")}>
      <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
        {t("dashboard.salesAttention.helper")}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SalesAttentionPanel
          title={tc("Overdue invoices")}
          summary={`${attention.overdueInvoices.count} ${tc("overdue")} · ${formatDashboardMoney(attention.overdueInvoices.total, currency, locale)} ${tc("balance due")}`}
        >
          <SalesAttentionRows
            items={attention.overdueInvoices.topItems}
            currency={currency}
            emptyLabel={tc("No overdue invoices requiring attention.")}
            detailForItem={(item) => [
              `${tc("Balance due")} ${formatDashboardMoney(item.amount ?? "0.0000", currency, locale)}`,
              `${tc("Due")} ${formatAppDate(item.dueDate ?? item.issueDate ?? null, locale, "-")}`,
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title={tc("Collection follow-ups")}
          summary={`${attention.collections.openCount} ${tc("open")} · ${attention.collections.dueTodayCount} ${tc("due today")} · ${attention.collections.overdueFollowUpCount} ${tc("overdue")}`}
          footer={`${formatDashboardMoney(attention.collections.promisedToPayTotal, currency, locale)} ${tc("promised to pay")} · ${attention.collections.disputedCount} ${tc("disputed")}`}
        >
          <SalesAttentionRows
            items={attention.collections.topItems}
            currency={currency}
            emptyLabel={tc("No collection follow-ups due.")}
            detailForItem={(item) => [
              `${tc("Follow-up")} ${formatAppDate(item.followUpDate ?? item.dueDate ?? null, locale, "-")}`,
              item.promisedAmount ? `${tc("Promise to pay")} ${formatDashboardMoney(item.promisedAmount, currency, locale)}` : null,
              item.promisedPaymentDate ? `${tc("Promised date")} ${formatAppDate(item.promisedPaymentDate, locale, "-")}` : null,
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title={tc("Quotes awaiting action")}
          summary={`${attention.quotes.awaitingAcceptanceCount} ${tc("awaiting acceptance")} · ${attention.quotes.expiringSoonCount} ${tc("expiring soon")}`}
          footer={`${attention.quotes.acceptedNotConvertedCount} ${tc("accepted quotes not converted")}`}
        >
          <SalesAttentionRows
            items={attention.quotes.topItems}
            currency={currency}
            emptyLabel={tc("No quotes needing action.")}
            detailForItem={(item) => [
              `${tc("Quote amount")} ${formatDashboardMoney(item.amount ?? "0.0000", currency, locale)}`,
              item.expiryDate ? `${tc("Expires")} ${formatAppDate(item.expiryDate, locale, "-")}` : null,
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title={tc("Recurring templates due for manual generation")}
          summary={`${attention.recurringInvoices.dueSoonCount} ${tc("due soon")} · ${attention.recurringInvoices.overdueForGenerationCount} ${tc("overdue")}`}
          footer={`${attention.recurringInvoices.activeCount} ${tc("active templates")}`}
        >
          <SalesAttentionRows
            items={attention.recurringInvoices.topItems}
            currency={currency}
            emptyLabel={tc("No recurring templates due for manual generation.")}
            detailForItem={(item) => [
              item.templateName ? `${tc("Template")} ${item.templateName}` : null,
              `${tc("Next run")} ${formatAppDate(item.nextRunDate ?? null, locale, "-")}`,
              tc("Manual generation only"),
            ]}
          />
          {attention.recurringInvoices.recentDraftInvoices.length > 0 ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <h4 className="text-xs font-semibold text-ink">{tc("Draft invoices generated from recurring templates")}</h4>
              <div className="mt-2">
                <SalesAttentionRows
                  items={attention.recurringInvoices.recentDraftInvoices}
                  currency={currency}
                  emptyLabel={tc("No recently generated recurring draft invoices.")}
                  detailForItem={(item) => [
                    item.templateNumber ? `${tc("From")} ${item.templateNumber}` : null,
                    tc("Draft invoice"),
                    `${tc("Issue")} ${formatAppDate(item.issueDate ?? null, locale, "-")}`,
                  ]}
                />
              </div>
            </div>
          ) : null}
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title={tc("Delivery notes awaiting delivery")}
          summary={`${attention.deliveryNotes.draftCount} ${tc("drafts")} · ${attention.deliveryNotes.issuedNotDeliveredCount} ${tc("issued not delivered")}`}
          footer={`${attention.deliveryNotes.overdueDeliveryCount} ${tc("overdue delivery dates")}`}
        >
          <SalesAttentionRows
            items={attention.deliveryNotes.topItems}
            currency={currency}
            emptyLabel={tc("No delivery notes awaiting action.")}
            detailForItem={(item) => [
              `${tc("Delivery")} ${formatAppDate(item.deliveryDate ?? null, locale, "-")}`,
              tc("Fulfillment document only"),
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel title={tc("Top customers by outstanding balance")} summary={tc("Outstanding AR from finalized sales invoices only")}>
          <CustomerAttentionRows items={attention.customers.topOutstanding} currency={currency} canLinkCustomers={canLinkCustomers} />
        </SalesAttentionPanel>
      </div>
    </Section>
  );
}

function SalesAttentionPanel({
  title,
  summary,
  footer,
  children,
}: Readonly<{ title: string; summary: string; footer?: string; children: ReactNode }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-steel">{summary}</p>
      </div>
      <div className="mt-3">{children}</div>
      {footer ? <p className="mt-3 text-xs leading-5 text-steel">{footer}</p> : null}
    </div>
  );
}

function SalesAttentionRows({
  items,
  currency,
  emptyLabel,
  detailForItem,
}: Readonly<{
  items: DashboardSalesAttentionTopItem[];
  currency: string;
  emptyLabel: string;
  detailForItem: (item: DashboardSalesAttentionTopItem) => Array<string | null>;
}>) {
  if (items.length === 0) {
    return <div className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-xs text-steel">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <SalesAttentionRow key={item.id} item={item} currency={currency} details={detailForItem(item)} />
      ))}
    </div>
  );
}

function SalesAttentionRow({
  item,
  currency,
  details,
}: Readonly<{ item: DashboardSalesAttentionTopItem; currency: string; details: Array<string | null> }>) {
  const { locale } = useAppLocale();
  const detailText = details.filter(Boolean).join(" · ");
  return (
    <Link
      href={item.href}
      aria-label={item.number}
      className="block rounded-md border border-slate-100 bg-mist px-3 py-2 text-sm transition hover:border-palm/40 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div dir="ltr" style={{ unicodeBidi: "isolate" }} className="truncate font-semibold text-ink">{item.number}</div>
          <div className="mt-0.5 truncate text-xs text-steel">{item.customerName}</div>
        </div>
        <div className="shrink-0 rounded-md bg-white px-2 py-1 text-[11px] font-semibold uppercase text-steel">
          {statusLabel(item.status)}
        </div>
      </div>
      {item.amount ? <div className="mt-1 font-mono text-xs text-ink">{formatDashboardMoney(item.amount, currency, locale)}</div> : null}
      {detailText ? <div className="mt-1 text-xs leading-5 text-steel">{detailText}</div> : null}
    </Link>
  );
}

function CustomerAttentionRows({
  items,
  currency,
  canLinkCustomers,
}: Readonly<{ items: DashboardSalesAttentionCustomerItem[]; currency: string; canLinkCustomers: boolean }>) {
  const { locale, tc } = useAppLocale();
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-xs text-steel">
        {tc("No outstanding customer balances to show.")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="truncate font-semibold text-ink">{item.customerName}</div>
              <div className="font-mono text-xs text-ink">{formatDashboardMoney(item.outstandingBalance, currency, locale)}</div>
            </div>
            <div className="mt-1 text-xs leading-5 text-steel">
              {formatDashboardMoney(item.overdueAmount, currency, locale)} {tc("overdue")} · {item.openCollectionCaseCount} {tc("open collection cases")}
            </div>
          </>
        );
        const className = "block rounded-md border border-slate-100 bg-mist px-3 py-2 text-sm";
        return canLinkCustomers ? (
          <Link key={item.id} href={item.href} className={`${className} transition hover:border-palm/40 hover:bg-slate-50`}>
            {content}
          </Link>
        ) : (
          <div key={item.id} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ").toLowerCase();
}

function SalesPurchasesTrend({
  sales,
  purchases,
  currency,
}: Readonly<{ sales: DashboardTrendPoint[]; purchases: DashboardTrendPoint[]; currency: string }>) {
  const { tc } = useAppLocale();
  const max = chartMaxAmount([...sales.map((point) => point.amount), ...purchases.map((point) => point.amount)]);
  const hasData = chartHasData(sales) || chartHasData(purchases);

  return (
    <ChartShell title={tc("Sales vs purchases")} empty={!hasData}>
      {sales.map((point, index) => {
        const purchasePoint = purchases[index] ?? { month: point.month, amount: "0.0000" };
        return (
          <div key={point.month} className="grid grid-cols-[4.5rem_1fr] gap-3 text-xs">
            <div className="font-medium text-steel">{point.month}</div>
            <div className="space-y-1.5">
              <BarRow label={tc("Sales")} value={point.amount} max={max} currency={currency} barClassName="bg-palm" />
              <BarRow label={tc("Purch.")} value={purchasePoint.amount} max={max} currency={currency} barClassName="bg-sky-500" />
            </div>
          </div>
        );
      })}
    </ChartShell>
  );
}

function NetProfitTrend({ points, currency }: Readonly<{ points: DashboardTrendPoint[]; currency: string }>) {
  const { tc } = useAppLocale();
  const max = chartMaxAmount(points.map((point) => point.amount));
  return (
    <ChartShell title={tc("Net profit trend")} empty={!chartHasData(points)}>
      {points.map((point) => (
        <BarRow
          key={point.month}
          label={point.month}
          value={point.amount}
          max={max}
          currency={currency}
          barClassName={Number(point.amount) < 0 ? "bg-red-400" : "bg-emerald-500"}
        />
      ))}
    </ChartShell>
  );
}

function AgingBars({ title, buckets, currency }: Readonly<{ title: string; buckets: DashboardAgingBucket[]; currency: string }>) {
  const { locale } = useAppLocale();
  const max = chartMaxAmount(buckets.map((bucket) => bucket.amount));
  return (
    <ChartShell title={title} empty={!chartHasData(buckets)}>
      {buckets.map((bucket) => (
        <BarRow key={bucket.bucket} label={agingBucketLabel(bucket.bucket, locale)} value={bucket.amount} max={max} currency={currency} barClassName="bg-amber-500" />
      ))}
    </ChartShell>
  );
}

function CashBalanceTrend({ points, currency }: Readonly<{ points: DashboardCashTrendPoint[]; currency: string }>) {
  const { tc } = useAppLocale();
  const max = chartMaxAmount(points.map((point) => point.balance));
  return (
    <ChartShell title={tc("Cash balance trend")} empty={!chartHasData(points, "balance")}>
      {points.map((point) => (
        <BarRow key={point.date} label={point.date.slice(0, 7)} value={point.balance} max={max} currency={currency} barClassName="bg-indigo-500" />
      ))}
    </ChartShell>
  );
}

function LowStockMiniList({ items }: Readonly<{ items: DashboardLowStockItem[] }>) {
  const { tc } = useAppLocale();
  return (
    <ChartShell title={tc("Low-stock watchlist")} empty={items.length === 0} emptyLabel={tc("No tracked items are below reorder point.")}>
      {items.map((item) => (
        <div key={item.itemId} className="rounded-md border border-slate-100 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-sm font-medium text-ink">{item.name}</div>
            <div className="font-mono text-xs text-steel">{item.quantityOnHand}</div>
          </div>
          <div className="mt-1 text-xs text-steel">{tc("Reorder point")} {item.reorderPoint}</div>
        </div>
      ))}
    </ChartShell>
  );
}

function AttentionSeverityBars({
  groups,
}: Readonly<{ groups: Record<"critical" | "warning" | "info", DashboardAttentionItem[]> }>) {
  const { locale } = useAppLocale();
  const rows = [
    { label: attentionSeverityLabel("critical", locale), count: groups.critical.length, className: "bg-red-500" },
    { label: attentionSeverityLabel("warning", locale), count: groups.warning.length, className: "bg-amber-500" },
    { label: attentionSeverityLabel("info", locale), count: groups.info.length, className: "bg-blue-500" },
  ];
  const max = Math.max(...rows.map((row) => row.count), 0);

  return (
    <div className="space-y-2 rounded-md border border-slate-100 px-3 py-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-xs">
          <div className="font-medium text-steel">{row.label}</div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${row.className}`} style={{ width: chartBarPercent(row.count, max) }} />
          </div>
          <div className="text-end font-mono text-steel">{row.count}</div>
        </div>
      ))}
    </div>
  );
}

function ChartShell({
  title,
  empty,
  emptyLabel = "No chart data for this period.",
  children,
}: Readonly<{ title: string; empty: boolean; emptyLabel?: string; children: ReactNode }>) {
  const { tc } = useAppLocale();
  const resolvedEmptyLabel = emptyLabel === "No chart data for this period." ? tc(emptyLabel) : emptyLabel;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <BarChart3 className="h-4 w-4 text-palm" aria-hidden="true" />
        {title}
      </div>
      {empty ? <div className="rounded-md border border-dashed border-slate-200 px-3 py-5 text-sm text-steel">{resolvedEmptyLabel}</div> : <div className="space-y-3">{children}</div>}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  currency,
  barClassName,
}: Readonly<{ label: string; value: string | number; max: number; currency: string; barClassName: string }>) {
  const { locale } = useAppLocale();
  return (
    <div className="grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-2 text-xs">
      <div className="truncate font-medium text-steel">{label}</div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${barClassName}`} style={{ width: chartBarPercent(value, max) }} />
      </div>
      <div className="truncate text-end font-mono text-steel">{formatDashboardMoney(value, currency, locale)}</div>
    </div>
  );
}

function AttentionItemRow({ item, href }: Readonly<{ item: DashboardAttentionItem; href: string | null }>) {
  const { locale } = useAppLocale();
  const content = (
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <div>
        <div className="text-xs font-semibold uppercase">{attentionSeverityLabel(item.severity, locale)}</div>
        <div className="mt-1 font-semibold">{item.title}</div>
        <div className="mt-1 text-xs leading-5">{item.description}</div>
      </div>
    </div>
  );
  const className = `block rounded-md border px-3 py-3 text-sm transition hover:shadow-sm ${attentionSeverityClass(item.severity)}`;
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function attentionHref(item: DashboardAttentionItem, links: DashboardLinks): string | null {
  switch (item.type) {
    case "OVERDUE_INVOICES":
      return links.overdueInvoices?.href ?? null;
    case "OVERDUE_BILLS":
      return links.overdueBills?.href ?? null;
    case "UNRECONCILED_BANK_TRANSACTIONS":
      return links.unreconciledTransactions?.href ?? null;
    case "LOW_STOCK":
      return links.lowStock?.href ?? null;
    case "INVENTORY_CLEARING_VARIANCE":
      return links.clearingVariances?.href ?? null;
    case "ZATCA_NOT_READY":
      return links.zatcaReadiness?.href ?? null;
    case "DATABASE_STORAGE_ACTIVE":
      return links.storage?.href ?? null;
    default:
      return item.href;
  }
}
