"use client";

import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  FileText,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { FinancialFlowScene } from "@/components/dashboard/financial-flow-scene";
import { StatusMessage } from "@/components/common/status-message";
import { DashboardFirstWorkflowPrompt, DashboardOnboardingCard } from "@/components/onboarding/setup-wizard";
import { usePermissions } from "@/components/permissions/permission-provider";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/ui-ledger/kpi-card";
import { PanelSection } from "@/components/ui-ledger/panel-section";
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
  type DashboardDrilldownLink,
} from "@/lib/dashboard";
import { getLedgerByteEdition } from "@/lib/edition";
import { formatOptionalDate } from "@/lib/invoice-display";
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

export default function DashboardPage() {
  const edition = getLedgerByteEdition();
  const organizationId = useActiveOrganizationId();
  const { activeMembership } = usePermissions();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [onboardingChecklist, setOnboardingChecklist] = useState<DashboardOnboardingChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [error, setError] = useState("");
  const [onboardingError, setOnboardingError] = useState("");
  const quickActions = useMemo(() => visibleDashboardQuickActions(activeMembership), [activeMembership]);
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
      countryReadiness: dashboardDrilldownLink("zatcaReadiness", activeMembership, edition.market),
      auditLogs: dashboardDrilldownLink("auditLogs", activeMembership),
      storage: dashboardDrilldownLink("storage", activeMembership),
    }),
    [activeMembership, edition.market],
  );
  const canSeeSalesAttention = useMemo(() => canViewSalesAttention(activeMembership), [activeMembership]);
  const attentionGroups = useMemo(() => (summary ? groupAttentionBySeverity(summary.attentionItems) : null), [summary]);

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
      <div className="relative overflow-hidden rounded-xl border border-slate-900 bg-sidebar p-5 text-white shadow-panel">
        <FinancialFlowScene />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">LedgerByte overview</div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
              <span className="rounded-md border border-blue-300/30 bg-blue-400/10 px-2 py-1 text-xs font-semibold text-blue-100">Controlled beta</span>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-200">
              Business overview as of {summary ? formatOptionalDate(summary.asOf, "today") : "today"}. Accounting workspace surfaces remain controlled-beta review only.
            </p>
            {summary ? <p className="mt-1 text-xs text-slate-300">Last updated {new Date(summary.asOf).toLocaleString()}.</p> : null}
          </div>
          {quickActions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {quickActions.slice(0, 3).map((action) => (
                <Link key={action.href} href={action.href} className={buttonVariants({ variant: "outline", className: "border-white/20 bg-white/10 text-white hover:bg-white/15" })}>
                  {action.label}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative mt-4 grid grid-cols-1 gap-3 text-xs text-slate-300 md:grid-cols-3">
          <span>Manual/imported bank transactions only</span>
          <span>{edition.showCountryCompliance ? edition.complianceReadinessLabel : "Neutral compliance review"}</span>
          <span>{edition.complianceDashboardNote}</span>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load the dashboard.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading dashboard...</StatusMessage> : null}
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
              label="Revenue"
              value={formatDashboardMoney(summary.sales.salesThisMonth, summary.currency)}
              detail="Sales this month"
              href={drilldownLinks.profitAndLoss?.href}
            />
            <Kpi
              icon={<ReceiptText className="h-5 w-5" />}
              label="Expenses"
              value={formatDashboardMoney(summary.purchases.purchasesThisMonth, summary.currency)}
              detail="Purchases this month"
              href={drilldownLinks.unpaidBills?.href}
            />
            <Kpi
              icon={<BarChart3 className="h-5 w-5" />}
              label="Net profit"
              value={formatDashboardMoney(summary.reports.profitAndLossNetProfit, summary.currency)}
              detail={dashboardHealthLabel(summary.reports.trialBalanceBalanced)}
              href={drilldownLinks.profitAndLoss?.href}
            />
            <Kpi
              icon={<Banknote className="h-5 w-5" />}
              label="Cash balance"
              value={formatDashboardMoney(summary.banking.totalBankBalance, summary.currency)}
              detail={`${summary.banking.bankAccountCount} active accounts`}
              href={drilldownLinks.bankBalance?.href}
            />
            <Kpi
              icon={<FileText className="h-5 w-5" />}
              label="Receivables"
              value={formatDashboardMoney(summary.sales.unpaidInvoiceBalance, summary.currency)}
              detail={`${summary.sales.unpaidInvoiceCount} open, ${summary.sales.overdueInvoiceCount} overdue`}
              href={drilldownLinks.unpaidInvoices?.href}
            />
            <Kpi
              icon={<ReceiptText className="h-5 w-5" />}
              label="Payables"
              value={formatDashboardMoney(summary.purchases.unpaidBillBalance, summary.currency)}
              detail={`${summary.purchases.unpaidBillCount} open, ${summary.purchases.overdueBillCount} overdue`}
              href={drilldownLinks.unpaidBills?.href}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="min-w-0 space-y-5">
              <Tabs defaultValue="profit-loss">
                <TabsList className="mb-3" variant="line" aria-label="Dashboard views">
                  <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
                  <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
                </TabsList>
                <TabsContent value="profit-loss" className="space-y-5">
                  <Section title="Sales & purchases" action={drilldownLinks.profitAndLoss ? <SectionLink link={drilldownLinks.profitAndLoss} /> : null}>
                    <MetricGrid
                      items={[
                        { label: "Sales this month", value: formatDashboardMoney(summary.sales.salesThisMonth, summary.currency), href: drilldownLinks.unpaidInvoices?.href },
                        {
                          label: "Customer payments",
                          value: formatDashboardMoney(summary.sales.customerPaymentThisMonth, summary.currency),
                          href: drilldownLinks.customerPayments?.href,
                        },
                        { label: "Purchases this month", value: formatDashboardMoney(summary.purchases.purchasesThisMonth, summary.currency), href: drilldownLinks.unpaidBills?.href },
                        {
                          label: "Supplier payments",
                          value: formatDashboardMoney(summary.purchases.supplierPaymentThisMonth, summary.currency),
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
                </TabsContent>
                <TabsContent value="cash-flow" className="space-y-5">
                  <Section title="Banking and inventory" action={drilldownLinks.bankBalance ? <SectionLink link={drilldownLinks.bankBalance} /> : null}>
                    <MetricGrid
                      items={[
                        {
                          label: "Unreconciled bank rows",
                          value: String(summary.banking.unreconciledTransactionCount),
                          href: drilldownLinks.unreconciledTransactions?.href,
                        },
                        {
                          label: "Latest reconciliation",
                          value: summary.banking.latestReconciliationDate ? formatOptionalDate(summary.banking.latestReconciliationDate, "-") : "-",
                          href: drilldownLinks.bankReconciliations?.href,
                        },
                        { label: "Low-stock items", value: String(summary.inventory.lowStockCount), href: drilldownLinks.lowStock?.href },
                        { label: "Clearing variances", value: String(summary.inventory.clearingVarianceCount), href: drilldownLinks.clearingVariances?.href },
                        { label: "Negative-stock items", value: String(summary.inventory.negativeStockCount), href: drilldownLinks.negativeStock?.href },
                      ]}
                    />
                    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <CashBalanceTrend points={summary.trends.cashBalanceTrend} currency={summary.currency} />
                      <LowStockMiniList items={summary.inventory.lowStockItems} />
                    </div>
                  </Section>

                  <Section title="Compliance and controls" action={drilldownLinks.trialBalance ? <SectionLink link={drilldownLinks.trialBalance} /> : null}>
                    <MetricGrid
                      items={[
                        ...(edition.showCountryCompliance
                          ? [
                              {
                                label: edition.complianceReadinessLabel,
                                value: summary.compliance.zatcaProductionReady ? "Local checks ready" : "Controlled beta",
                                href: drilldownLinks.countryReadiness?.href,
                              },
                              { label: "Local readiness blockers", value: String(summary.compliance.zatcaBlockingReasonCount), href: drilldownLinks.countryReadiness?.href },
                            ]
                          : [
                              {
                                label: "Compliance review",
                                value: "Controlled beta",
                                href: undefined,
                              },
                              { label: "Review blockers", value: String(summary.compliance.zatcaBlockingReasonCount), href: undefined },
                            ]),
                        { label: "Locked fiscal periods", value: String(summary.compliance.fiscalPeriodsLockedCount), href: drilldownLinks.fiscalPeriods?.href },
                        { label: "Audit logs this month", value: String(summary.compliance.auditLogCountThisMonth), href: drilldownLinks.auditLogs?.href },
                        { label: "Balance sheet", value: dashboardHealthLabel(summary.reports.balanceSheetBalanced), href: drilldownLinks.balanceSheet?.href },
                      ]}
                    />
                  </Section>
                </TabsContent>
              </Tabs>

              {canSeeSalesAttention ? (
                <SalesArAttentionSection
                  attention={summary.salesAttention}
                  currency={summary.currency}
                  canLinkCustomers={Boolean(drilldownLinks.customers)}
                />
              ) : null}

              <Section title="Receivables and payables aging">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <AgingBars title="AR aging" buckets={summary.aging.receivablesBuckets} currency={summary.currency} />
                  <AgingBars title="AP aging" buckets={summary.aging.payablesBuckets} currency={summary.currency} />
                </div>
              </Section>
            </div>

            <div className="space-y-5">
              {onboardingChecklist ? (
                <DashboardOnboardingCard checklist={onboardingChecklist} />
              ) : onboardingLoading ? (
                <Section title="Onboarding checklist">
                  <StatusMessage type="loading">Loading onboarding checklist...</StatusMessage>
                </Section>
              ) : onboardingError ? (
                <Section title="Onboarding checklist">
                  <StatusMessage type="error">{onboardingError}</StatusMessage>
                </Section>
              ) : null}

              <Section title="Attention">
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
                      No attention items
                    </div>
                    <p className="mt-1 text-xs">No dashboard alerts were generated from current data.</p>
                  </div>
                )}
              </Section>

              {quickActions.length > 0 ? (
                <Section title="Quick actions">
                  <div className="grid grid-cols-1 gap-2">
                    {quickActions.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {action.label}
                        <ArrowRight className="h-4 w-4 text-steel" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </Section>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Kpi({ icon, label, value, detail, href }: Readonly<{ icon: ReactNode; label: string; value: string; detail: string; href?: string }>) {
  return <KpiCard icon={icon} label={label} value={value} detail={detail} href={href} />;
}

function Section({ title, action, children }: Readonly<{ title: string; action?: ReactNode; children: ReactNode }>) {
  return <PanelSection title={title} action={action}>{children}</PanelSection>;
}

function SectionLink({ link }: Readonly<{ link: DashboardDrilldownLink }>) {
  return (
    <Link href={link.href} className="inline-flex items-center gap-1 text-xs font-semibold text-palm hover:underline">
      {link.label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
  return (
    <Section title="Sales/AR attention">
      <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
        {attention.helperText}
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SalesAttentionPanel
          title="Overdue invoices"
          summary={`${attention.overdueInvoices.count} overdue · ${formatDashboardMoney(attention.overdueInvoices.total, currency)} balance due`}
        >
          <SalesAttentionRows
            items={attention.overdueInvoices.topItems}
            currency={currency}
            emptyLabel="No overdue invoices requiring attention."
            detailForItem={(item) => [
              `Balance due ${formatDashboardMoney(item.amount ?? "0.0000", currency)}`,
              `Due ${formatOptionalDate(item.dueDate ?? item.issueDate ?? null, "-")}`,
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title="Collection follow-ups"
          summary={`${attention.collections.openCount} open · ${attention.collections.dueTodayCount} due today · ${attention.collections.overdueFollowUpCount} overdue`}
          footer={`${formatDashboardMoney(attention.collections.promisedToPayTotal, currency)} promised to pay · ${attention.collections.disputedCount} disputed`}
        >
          <SalesAttentionRows
            items={attention.collections.topItems}
            currency={currency}
            emptyLabel="No collection follow-ups due."
            detailForItem={(item) => [
              `Follow-up ${formatOptionalDate(item.followUpDate ?? item.dueDate ?? null, "-")}`,
              item.promisedAmount ? `Promise to pay ${formatDashboardMoney(item.promisedAmount, currency)}` : null,
              item.promisedPaymentDate ? `Promised date ${formatOptionalDate(item.promisedPaymentDate, "-")}` : null,
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title="Quotes awaiting action"
          summary={`${attention.quotes.awaitingAcceptanceCount} awaiting acceptance · ${attention.quotes.expiringSoonCount} expiring soon`}
          footer={`${attention.quotes.acceptedNotConvertedCount} accepted quotes not converted`}
        >
          <SalesAttentionRows
            items={attention.quotes.topItems}
            currency={currency}
            emptyLabel="No quotes needing action."
            detailForItem={(item) => [
              `Quote amount ${formatDashboardMoney(item.amount ?? "0.0000", currency)}`,
              item.expiryDate ? `Expires ${formatOptionalDate(item.expiryDate, "-")}` : null,
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title="Recurring templates due for manual generation"
          summary={`${attention.recurringInvoices.dueSoonCount} due soon · ${attention.recurringInvoices.overdueForGenerationCount} overdue`}
          footer={`${attention.recurringInvoices.activeCount} active templates`}
        >
          <SalesAttentionRows
            items={attention.recurringInvoices.topItems}
            currency={currency}
            emptyLabel="No recurring templates due for manual generation."
            detailForItem={(item) => [
              item.templateName ? `Template ${item.templateName}` : null,
              `Next run ${formatOptionalDate(item.nextRunDate ?? null, "-")}`,
              "Manual generation only",
            ]}
          />
          {attention.recurringInvoices.recentDraftInvoices.length > 0 ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <h4 className="text-xs font-semibold text-ink">Draft invoices generated from recurring templates</h4>
              <div className="mt-2">
                <SalesAttentionRows
                  items={attention.recurringInvoices.recentDraftInvoices}
                  currency={currency}
                  emptyLabel="No recently generated recurring draft invoices."
                  detailForItem={(item) => [
                    item.templateNumber ? `From ${item.templateNumber}` : null,
                    "Draft invoice",
                    `Issue ${formatOptionalDate(item.issueDate ?? null, "-")}`,
                  ]}
                />
              </div>
            </div>
          ) : null}
        </SalesAttentionPanel>

        <SalesAttentionPanel
          title="Delivery notes awaiting delivery"
          summary={`${attention.deliveryNotes.draftCount} drafts · ${attention.deliveryNotes.issuedNotDeliveredCount} issued not delivered`}
          footer={`${attention.deliveryNotes.overdueDeliveryCount} overdue delivery dates`}
        >
          <SalesAttentionRows
            items={attention.deliveryNotes.topItems}
            currency={currency}
            emptyLabel="No delivery notes awaiting action."
            detailForItem={(item) => [
              `Delivery ${formatOptionalDate(item.deliveryDate ?? null, "-")}`,
              "Fulfillment document only",
            ]}
          />
        </SalesAttentionPanel>

        <SalesAttentionPanel title="Top customers by outstanding balance" summary="Outstanding AR from finalized sales invoices only">
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
  const detailText = details.filter(Boolean).join(" · ");
  return (
    <Link
      href={item.href}
      aria-label={item.number}
      className="block rounded-md border border-slate-100 bg-mist px-3 py-2 text-sm transition hover:border-palm/40 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{item.number}</div>
          <div className="mt-0.5 truncate text-xs text-steel">{item.customerName}</div>
        </div>
        <div className="shrink-0 rounded-md bg-white px-2 py-1 text-[11px] font-semibold uppercase text-steel">
          {statusLabel(item.status)}
        </div>
      </div>
      {item.amount ? <div className="mt-1 font-mono text-xs text-ink">{formatDashboardMoney(item.amount, currency)}</div> : null}
      {detailText ? <div className="mt-1 text-xs leading-5 text-steel">{detailText}</div> : null}
    </Link>
  );
}

function CustomerAttentionRows({
  items,
  currency,
  canLinkCustomers,
}: Readonly<{ items: DashboardSalesAttentionCustomerItem[]; currency: string; canLinkCustomers: boolean }>) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 px-3 py-3 text-xs text-steel">
        No outstanding customer balances to show.
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
              <div className="font-mono text-xs text-ink">{formatDashboardMoney(item.outstandingBalance, currency)}</div>
            </div>
            <div className="mt-1 text-xs leading-5 text-steel">
              {formatDashboardMoney(item.overdueAmount, currency)} overdue · {item.openCollectionCaseCount} open collection cases
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
  const max = chartMaxAmount([...sales.map((point) => point.amount), ...purchases.map((point) => point.amount)]);
  const hasData = chartHasData(sales) || chartHasData(purchases);

  return (
    <ChartShell title="Sales vs purchases" empty={!hasData}>
      {sales.map((point, index) => {
        const purchasePoint = purchases[index] ?? { month: point.month, amount: "0.0000" };
        return (
          <div key={point.month} className="grid grid-cols-[4.5rem_1fr] gap-3 text-xs">
            <div className="font-medium text-steel">{point.month}</div>
            <div className="space-y-1.5">
              <BarRow label="Sales" value={point.amount} max={max} currency={currency} barClassName="bg-palm" />
              <BarRow label="Purch." value={purchasePoint.amount} max={max} currency={currency} barClassName="bg-sky-500" />
            </div>
          </div>
        );
      })}
    </ChartShell>
  );
}

function NetProfitTrend({ points, currency }: Readonly<{ points: DashboardTrendPoint[]; currency: string }>) {
  const max = chartMaxAmount(points.map((point) => point.amount));
  return (
    <ChartShell title="Net profit trend" empty={!chartHasData(points)}>
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
  const max = chartMaxAmount(buckets.map((bucket) => bucket.amount));
  return (
    <ChartShell title={title} empty={!chartHasData(buckets)}>
      {buckets.map((bucket) => (
        <BarRow key={bucket.bucket} label={agingBucketLabel(bucket.bucket)} value={bucket.amount} max={max} currency={currency} barClassName="bg-amber-500" />
      ))}
    </ChartShell>
  );
}

function CashBalanceTrend({ points, currency }: Readonly<{ points: DashboardCashTrendPoint[]; currency: string }>) {
  const max = chartMaxAmount(points.map((point) => point.balance));
  return (
    <ChartShell title="Cash balance trend" empty={!chartHasData(points, "balance")}>
      {points.map((point) => (
        <BarRow key={point.date} label={point.date.slice(0, 7)} value={point.balance} max={max} currency={currency} barClassName="bg-indigo-500" />
      ))}
    </ChartShell>
  );
}

function LowStockMiniList({ items }: Readonly<{ items: DashboardLowStockItem[] }>) {
  return (
    <ChartShell title="Low-stock watchlist" empty={items.length === 0} emptyLabel="No tracked items are below reorder point.">
      {items.map((item) => (
        <div key={item.itemId} className="rounded-md border border-slate-100 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-sm font-medium text-ink">{item.name}</div>
            <div className="font-mono text-xs text-steel">{item.quantityOnHand}</div>
          </div>
          <div className="mt-1 text-xs text-steel">Reorder point {item.reorderPoint}</div>
        </div>
      ))}
    </ChartShell>
  );
}

function AttentionSeverityBars({
  groups,
}: Readonly<{ groups: Record<"critical" | "warning" | "info", DashboardAttentionItem[]> }>) {
  const rows = [
    { label: "Critical", count: groups.critical.length, className: "bg-red-500" },
    { label: "Warning", count: groups.warning.length, className: "bg-amber-500" },
    { label: "Info", count: groups.info.length, className: "bg-blue-500" },
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
          <div className="text-right font-mono text-steel">{row.count}</div>
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
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <BarChart3 className="h-4 w-4 text-palm" aria-hidden="true" />
        {title}
      </div>
      {empty ? <div className="rounded-md border border-dashed border-slate-200 px-3 py-5 text-sm text-steel">{emptyLabel}</div> : <div className="space-y-3">{children}</div>}
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
  return (
    <div className="grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-2 text-xs">
      <div className="truncate font-medium text-steel">{label}</div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${barClassName}`} style={{ width: chartBarPercent(value, max) }} />
      </div>
      <div className="truncate text-right font-mono text-steel">{formatDashboardMoney(value, currency)}</div>
    </div>
  );
}

function AttentionItemRow({ item, href }: Readonly<{ item: DashboardAttentionItem; href: string | null }>) {
  const content = (
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <div>
        <div className="text-xs font-semibold uppercase">{attentionSeverityLabel(item.severity)}</div>
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
      return links.uaeReadiness?.href ?? null;
    case "DATABASE_STORAGE_ACTIVE":
      return links.storage?.href ?? null;
    default:
      return item.href;
  }
}
