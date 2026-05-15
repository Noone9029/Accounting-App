"use client";

import { AlertTriangle, ArrowRight, Banknote, BarChart3, Box, FileText, ReceiptText, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  agingBucketLabel,
  attentionSeverityClass,
  attentionSeverityLabel,
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
import { formatOptionalDate } from "@/lib/invoice-display";
import type {
  DashboardAgingBucket,
  DashboardAttentionItem,
  DashboardCashTrendPoint,
  DashboardLowStockItem,
  DashboardSummary,
  DashboardTrendPoint,
} from "@/lib/types";

type DashboardLinks = Partial<Record<string, DashboardDrilldownLink | null>>;

export default function DashboardPage() {
  const organizationId = useActiveOrganizationId();
  const { activeMembership } = usePermissions();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const quickActions = useMemo(() => visibleDashboardQuickActions(activeMembership), [activeMembership]);
  const drilldownLinks = useMemo(
    () => ({
      unpaidInvoices: dashboardDrilldownLink("unpaidInvoices", activeMembership),
      overdueInvoices: dashboardDrilldownLink("overdueInvoices", activeMembership),
      unpaidBills: dashboardDrilldownLink("unpaidBills", activeMembership),
      overdueBills: dashboardDrilldownLink("overdueBills", activeMembership),
      customerPayments: dashboardDrilldownLink("customerPayments", activeMembership),
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
  const attentionGroups = useMemo(() => (summary ? groupAttentionBySeverity(summary.attentionItems) : null), [summary]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

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

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-steel">
            Business overview as of {summary ? formatOptionalDate(summary.asOf, "today") : "today"}.
          </p>
          {summary ? <p className="mt-1 text-xs text-steel">Last updated {new Date(summary.asOf).toLocaleString()}.</p> : null}
        </div>
        {quickActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 3).map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {action.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load the dashboard.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading dashboard...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {summary ? (
        <>
          {dashboardIsEmpty(summary) ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-steel shadow-panel">
              No operational data yet. Use the quick actions below to start creating accounting records.
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Kpi
              icon={<Banknote className="h-5 w-5" />}
              label="Cash / bank"
              value={formatDashboardMoney(summary.banking.totalBankBalance, summary.currency)}
              detail={`${summary.banking.bankAccountCount} active accounts`}
              href={drilldownLinks.bankBalance?.href}
            />
            <Kpi
              icon={<FileText className="h-5 w-5" />}
              label="Unpaid invoices"
              value={formatDashboardMoney(summary.sales.unpaidInvoiceBalance, summary.currency)}
              detail={`${summary.sales.unpaidInvoiceCount} open, ${summary.sales.overdueInvoiceCount} overdue`}
              href={drilldownLinks.unpaidInvoices?.href}
            />
            <Kpi
              icon={<ReceiptText className="h-5 w-5" />}
              label="Unpaid bills"
              value={formatDashboardMoney(summary.purchases.unpaidBillBalance, summary.currency)}
              detail={`${summary.purchases.unpaidBillCount} open, ${summary.purchases.overdueBillCount} overdue`}
              href={drilldownLinks.unpaidBills?.href}
            />
            <Kpi
              icon={<TrendingUp className="h-5 w-5" />}
              label="Net profit MTD"
              value={formatDashboardMoney(summary.reports.profitAndLossNetProfit, summary.currency)}
              detail={dashboardHealthLabel(summary.reports.trialBalanceBalanced)}
              href={drilldownLinks.profitAndLoss?.href}
            />
            <Kpi
              icon={<Box className="h-5 w-5" />}
              label="Inventory value"
              value={formatDashboardMoney(summary.inventory.inventoryEstimatedValue, summary.currency)}
              detail={`${summary.inventory.trackedItemCount} tracked items`}
              href={drilldownLinks.lowStock?.href}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-5">
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

              <Section title="Receivables and payables aging">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <AgingBars title="AR aging" buckets={summary.aging.receivablesBuckets} currency={summary.currency} />
                  <AgingBars title="AP aging" buckets={summary.aging.payablesBuckets} currency={summary.currency} />
                </div>
              </Section>

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
                    { label: "ZATCA production ready", value: summary.compliance.zatcaProductionReady ? "Yes" : "No", href: drilldownLinks.zatcaReadiness?.href },
                    { label: "ZATCA blockers", value: String(summary.compliance.zatcaBlockingReasonCount), href: drilldownLinks.zatcaReadiness?.href },
                    { label: "Locked fiscal periods", value: String(summary.compliance.fiscalPeriodsLockedCount), href: drilldownLinks.fiscalPeriods?.href },
                    { label: "Audit logs this month", value: String(summary.compliance.auditLogCountThisMonth), href: drilldownLinks.auditLogs?.href },
                    { label: "Balance sheet", value: dashboardHealthLabel(summary.reports.balanceSheetBalanced), href: drilldownLinks.balanceSheet?.href },
                  ]}
                />
              </Section>
            </div>

            <div className="space-y-5">
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
  const content = (
    <>
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-steel">
        <span className="text-palm">{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-xl font-semibold text-ink">{value}</div>
      <div className="mt-2 text-xs text-steel">{detail}</div>
    </>
  );

  const className = "block rounded-md border border-slate-200 bg-white p-4 shadow-panel";
  return href ? (
    <Link href={href} className={`${className} transition hover:border-palm/40 hover:shadow-sm`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function Section({ title, action, children }: Readonly<{ title: string; action?: ReactNode; children: ReactNode }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
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
      return links.zatcaReadiness?.href ?? null;
    case "DATABASE_STORAGE_ACTIVE":
      return links.storage?.href ?? null;
    default:
      return item.href;
  }
}
