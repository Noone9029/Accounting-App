"use client";

import { AlertTriangle, ArrowRight, Banknote, Box, FileText, ReceiptText, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  attentionSeverityClass,
  attentionSeverityLabel,
  dashboardHealthLabel,
  dashboardIsEmpty,
  formatDashboardMoney,
  visibleDashboardQuickActions,
} from "@/lib/dashboard";
import { formatOptionalDate } from "@/lib/invoice-display";
import type { DashboardSummary } from "@/lib/types";

export default function DashboardPage() {
  const organizationId = useActiveOrganizationId();
  const { activeMembership } = usePermissions();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const quickActions = useMemo(() => visibleDashboardQuickActions(activeMembership), [activeMembership]);

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
            <Kpi icon={<Banknote className="h-5 w-5" />} label="Cash / bank" value={formatDashboardMoney(summary.banking.totalBankBalance, summary.currency)} detail={`${summary.banking.bankAccountCount} active accounts`} />
            <Kpi icon={<FileText className="h-5 w-5" />} label="Unpaid invoices" value={formatDashboardMoney(summary.sales.unpaidInvoiceBalance, summary.currency)} detail={`${summary.sales.unpaidInvoiceCount} open, ${summary.sales.overdueInvoiceCount} overdue`} />
            <Kpi icon={<ReceiptText className="h-5 w-5" />} label="Unpaid bills" value={formatDashboardMoney(summary.purchases.unpaidBillBalance, summary.currency)} detail={`${summary.purchases.unpaidBillCount} open, ${summary.purchases.overdueBillCount} overdue`} />
            <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Net profit MTD" value={formatDashboardMoney(summary.reports.profitAndLossNetProfit, summary.currency)} detail={dashboardHealthLabel(summary.reports.trialBalanceBalanced)} />
            <Kpi icon={<Box className="h-5 w-5" />} label="Inventory value" value={formatDashboardMoney(summary.inventory.inventoryEstimatedValue, summary.currency)} detail={`${summary.inventory.trackedItemCount} tracked items`} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-5">
              <Section title="Sales & purchases">
                <MetricGrid
                  items={[
                    ["Sales this month", formatDashboardMoney(summary.sales.salesThisMonth, summary.currency)],
                    ["Customer payments", formatDashboardMoney(summary.sales.customerPaymentThisMonth, summary.currency)],
                    ["Purchases this month", formatDashboardMoney(summary.purchases.purchasesThisMonth, summary.currency)],
                    ["Supplier payments", formatDashboardMoney(summary.purchases.supplierPaymentThisMonth, summary.currency)],
                  ]}
                />
              </Section>

              <Section title="Banking and inventory">
                <MetricGrid
                  items={[
                    ["Unreconciled bank rows", String(summary.banking.unreconciledTransactionCount)],
                    ["Latest reconciliation", summary.banking.latestReconciliationDate ? formatOptionalDate(summary.banking.latestReconciliationDate, "-") : "-"],
                    ["Low-stock items", String(summary.inventory.lowStockCount)],
                    ["Clearing variances", String(summary.inventory.clearingVarianceCount)],
                    ["Negative-stock items", String(summary.inventory.negativeStockCount)],
                  ]}
                />
              </Section>

              <Section title="Compliance and controls">
                <MetricGrid
                  items={[
                    ["ZATCA production ready", summary.compliance.zatcaProductionReady ? "Yes" : "No"],
                    ["ZATCA blockers", String(summary.compliance.zatcaBlockingReasonCount)],
                    ["Locked fiscal periods", String(summary.compliance.fiscalPeriodsLockedCount)],
                    ["Audit logs this month", String(summary.compliance.auditLogCountThisMonth)],
                    ["Balance sheet", dashboardHealthLabel(summary.reports.balanceSheetBalanced)],
                  ]}
                />
              </Section>
            </div>

            <div className="space-y-5">
              <Section title="Attention">
                {summary.attentionItems.length > 0 ? (
                  <div className="space-y-3">
                    {summary.attentionItems.map((item) => (
                      <Link
                        key={`${item.type}-${item.href}`}
                        href={item.href}
                        className={`block rounded-md border px-3 py-3 text-sm transition hover:shadow-sm ${attentionSeverityClass(item.severity)}`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                          <div>
                            <div className="text-xs font-semibold uppercase">{attentionSeverityLabel(item.severity)}</div>
                            <div className="mt-1 font-semibold">{item.title}</div>
                            <div className="mt-1 text-xs leading-5">{item.description}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
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

function Kpi({ icon, label, value, detail }: Readonly<{ icon: ReactNode; label: string; value: string; detail: string }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-steel">
        <span className="text-palm">{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-xl font-semibold text-ink">{value}</div>
      <div className="mt-2 text-xs text-steel">{detail}</div>
    </div>
  );
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function MetricGrid({ items }: Readonly<{ items: Array<[string, string]> }>) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md bg-mist px-3 py-2">
          <div className="text-xs text-steel">{label}</div>
          <div className="mt-1 font-mono text-sm font-semibold text-ink">{value}</div>
        </div>
      ))}
    </div>
  );
}
