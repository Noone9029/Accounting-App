"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { formatAppDate, formatAppMoney, type AppLocale } from "@/lib/app-i18n";
import { getSupplierApDashboard } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  SupplierApBillAttentionItem,
  SupplierApDashboardResponse,
  SupplierApMatchingAttentionItem,
  SupplierApReturnAttentionItem,
  SupplierApTopSupplier,
  SupplierApVarianceAttentionItem,
} from "@/lib/types";

const SAFE_HELPER_TEXT =
  "This dashboard is read-only. It summarizes supplier payables, purchase matching, returns, valuation variance previews, and landed cost preview availability. It does not post journals, adjust AP balances, move inventory by itself, send email, or book variances.";

export default function SupplierApDashboardPage() {
  const organizationId = useActiveOrganizationId();
  const { can, canAny } = usePermissions();
  const { locale, tc } = useAppLocale();
  const [dashboard, setDashboard] = useState<SupplierApDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canViewSupplierLinks = can(PERMISSIONS.contacts.view);
  const canViewBillLinks = can(PERMISSIONS.purchaseBills.view);
  const canViewMatchingLinks = canAny(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view);
  const canViewReturnLinks = canViewMatchingLinks;
  const canViewVarianceLinks = can(PERMISSIONS.inventory.view);

  useEffect(() => {
    if (!organizationId) {
      setDashboard(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    getSupplierApDashboard()
      .then((result) => {
        if (!cancelled) {
          setDashboard(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load Supplier/AP Dashboard."));
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
  }, [organizationId, tc]);

  const summaryCards = useMemo(() => {
    const summary = dashboard?.apSummary;
    return [
      { label: "Open payables", value: formatAppMoney(summary?.openPayablesTotal ?? "0.0000", "SAR", locale), detail: tc("{count} open bills", { count: summary?.openBillCount ?? 0 }) },
      { label: "Overdue bills", value: formatAppMoney(summary?.overdueBillsTotal ?? "0.0000", "SAR", locale), detail: tc("{count} bills overdue", { count: summary?.overdueBillCount ?? 0 }) },
      { label: "Open purchase orders", value: String(summary?.purchaseOrdersOpenCount ?? 0), detail: tc("Awaiting receipt or closure") },
      { label: "Receipts pending bill", value: String(summary?.purchaseReceiptsPendingBillCount ?? 0), detail: tc("Purchase receipts awaiting bill") },
      { label: "Bills pending receipt", value: String(summary?.purchaseBillsPendingReceiptCount ?? 0), detail: tc("Purchase bills awaiting receipt") },
      { label: "Matching exceptions", value: String(summary?.matchingExceptionCount ?? 0), detail: tc("{count} critical", { count: summary?.matchingCriticalCount ?? 0 }) },
      { label: "Reviews needing action", value: String(summary?.matchingReviewOpenCount ?? 0), detail: tc("Open or waiting matching reviews") },
      {
        label: "Purchase returns",
        value: String(summary?.returnsOpenCount ?? 0),
        detail: tc("{completed} completed, {awaiting} awaiting movement, {posted} posted", {
          completed: summary?.returnsCompletedCount ?? 0,
          awaiting: summary?.returnsAwaitingInventoryMovementCount ?? 0,
          posted: summary?.returnsInventoryMovementPostedCount ?? 0,
        }),
      },
      { label: "Variance previews", value: String(summary?.variancePreviewCount ?? 0), detail: formatAppMoney(summary?.variancePreviewTotal ?? "0.0000", "SAR", locale) },
    ];
  }, [dashboard?.apSummary, locale, tc]);

  const summary = dashboard?.apSummary;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Supplier/AP Dashboard")}</h1>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-steel">{tc(SAFE_HELPER_TEXT)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewMatchingLinks ? (
            <Link href="/purchases/matching" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Matching exceptions")}
            </Link>
          ) : null}
          {canViewVarianceLinks ? (
            <>
              <Link href="/inventory/landed-cost" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Landed cost preview")}
              </Link>
              <Link href="/inventory/valuation-variances" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Valuation variance preview")}
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load the Supplier/AP Dashboard.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading Supplier/AP Dashboard...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {dashboard ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                <div className="text-xs font-semibold uppercase tracking-wide text-steel">{tc(card.label)}</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{card.value}</div>
                <div className="mt-1 text-sm text-steel">{card.detail}</div>
              </div>
            ))}
            {canViewVarianceLinks ? (
              <Link href="/inventory/landed-cost" className="rounded-md border border-slate-200 bg-white p-4 shadow-panel hover:border-palm">
                <div className="text-xs font-semibold uppercase tracking-wide text-steel">{tc("Landed cost preview")}</div>
                <div className="mt-2 text-2xl font-semibold text-ink">{tc("Available")}</div>
                <div className="mt-1 text-sm text-steel">{tc("Read-only landed cost allocation planning")}</div>
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TopSupplierPanel title="Top suppliers by payable balance" rows={summary?.topSuppliersByPayable ?? []} valueLabel="Open payables" canUseSupplierLinks={canViewSupplierLinks} />
            <TopSupplierPanel title="Top suppliers by matching exception severity" rows={summary?.topSuppliersByExceptionSeverity ?? []} valueLabel="Exceptions" canUseSupplierLinks={canViewSupplierLinks} />
            <TopSupplierPanel title="Suppliers with open returns" rows={summary?.suppliersWithOpenReturns ?? []} valueLabel="Open returns" canUseSupplierLinks={canViewSupplierLinks} />
            <TopSupplierPanel title="Suppliers with variance previews" rows={summary?.suppliersWithVariancePreviews ?? []} valueLabel="Variance previews" canUseSupplierLinks={canViewSupplierLinks} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <BillsAttentionList items={summary?.upcomingDueBills ?? []} canUseSupplierLinks={canViewSupplierLinks} canUseSourceLinks={canViewBillLinks} />
            <MatchingAttentionList items={summary?.matchingExceptionsNeedingReview ?? []} canUseSupplierLinks={canViewSupplierLinks} canUseSourceLinks={canViewMatchingLinks} />
            <ReturnsAttentionList items={summary?.purchaseReturnsAwaitingAction ?? []} canUseSupplierLinks={canViewSupplierLinks} canUseSourceLinks={canViewReturnLinks} />
            <VarianceAttentionList items={summary?.variancePreviewsNeedingReview ?? []} canUseSupplierLinks={canViewSupplierLinks} canUseSourceLinks={canViewVarianceLinks} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Recent supplier activity")}</h2>
                <p className="mt-1 text-sm leading-6 text-steel">
                  {tc("Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.")}
                </p>
              </div>
            </div>
            {summary?.recentSupplierActivity.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[940px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-3 py-2">{tc("Date")}</th>
                      <th className="px-3 py-2">{tc("Supplier")}</th>
                      <th className="px-3 py-2">{tc("Activity")}</th>
                      <th className="px-3 py-2">{tc("Amount")}</th>
                      <th className="px-3 py-2">{tc("Status")}</th>
                      <th className="px-3 py-2">{tc("Effect")}</th>
                      <th className="px-3 py-2">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.recentSupplierActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-3 py-2 text-steel">{formatAppDate(activity.date, locale, "-")}</td>
                        <td className="px-3 py-2">{supplierCell(activity.supplierName, activity.supplierHref, canViewSupplierLinks)}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">{activity.label}</div>
                          <div className="font-mono text-xs text-steel"><bdi dir="ltr">{activity.sourceNumber}</bdi></div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{activity.amount ? formatAppMoney(activity.amount, "SAR", locale) : "-"}</td>
                        <td className="px-3 py-2"><StatusBadge label={activity.status} /></td>
                        <td className="px-3 py-2">{activity.nonPosting ? <NonPostingBadge /> : <span className="text-xs font-medium text-slate-700">{tc("Financial posting")}</span>}</td>
                        <td className="px-3 py-2">{sourceCell(tc("Open"), activity.href, Boolean(activity.href))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-steel">{tc("No recent supplier activity is available for the current permissions.")}</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function TopSupplierPanel({
  title,
  rows,
  valueLabel,
  canUseSupplierLinks,
}: {
  title: string;
  rows: SupplierApTopSupplier[];
  valueLabel: string;
  canUseSupplierLinks: boolean;
}) {
  const { locale, tc } = useAppLocale();
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">{tc(title)}</h2>
      {rows.length === 0 ? <p className="mt-3 text-sm text-steel">{tc("No suppliers found for this attention view.")}</p> : null}
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <div key={`${title}-${row.supplierId}`} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
            <div>
              {supplierCell(row.supplierName, row.href, canUseSupplierLinks)}
              <div className="mt-1 text-xs text-steel">
                {row.highestSeverity ? tc("{status} severity", { status: tc(formatStatusLabel(row.highestSeverity)) }) : tc(valueLabel)}
              </div>
            </div>
            <div className="text-end">
              <div className="font-mono text-sm font-semibold text-ink">{supplierRowValue(row, locale)}</div>
              <div className="text-xs text-steel">{tc(valueLabel)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillsAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApBillAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  const { locale, tc } = useAppLocale();
  return (
    <AttentionPanel title="Bills due soon / overdue" emptyLabel="No bills are overdue or due soon for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.billNumber, item.href, canUseSourceLinks)}
          detail={`${tc(item.attentionCategory)} - ${formatAppDate(item.dueDate, locale, tc("No due date"))}`}
          value={formatAppMoney(item.balanceDue, item.currency, locale)}
          badge={item.dueStatus === "OVERDUE" ? "Overdue" : "Due soon"}
        />
      ))}
    </AttentionPanel>
  );
}

function MatchingAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApMatchingAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  const { tc } = useAppLocale();
  return (
    <AttentionPanel title="Matching exceptions needing review" emptyLabel="No matching exceptions need review for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.sourceNumber, item.sourceHref, canUseSourceLinks)}
          detail={`${tc(item.attentionCategory)} - ${tc(formatStatusLabel(item.exceptionType))}`}
          value={tc(formatStatusLabel(item.severity))}
          badge="Review needed"
        />
      ))}
    </AttentionPanel>
  );
}

function ReturnsAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApReturnAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  const { locale, tc } = useAppLocale();
  return (
    <AttentionPanel title="Purchase returns awaiting action" emptyLabel="No purchase returns are awaiting action for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.purchaseReturnNumber, item.href, canUseSourceLinks)}
          detail={`${tc(item.attentionCategory)} - ${item.reason ?? tc("No reason recorded")} - ${formatAppDate(item.returnDate, locale, "-")}`}
          value={`${tc(formatStatusLabel(item.status))} / ${item.inventoryMovementStatus === "POSTED" ? tc("Movement posted") : tc("Movement not posted")}`}
          badge="Non-posting"
        />
      ))}
    </AttentionPanel>
  );
}

function VarianceAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApVarianceAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  const { locale, tc } = useAppLocale();
  return (
    <AttentionPanel title="Variance previews needing accountant review" emptyLabel="No valuation variance previews need review for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.sourceNumber, item.sourceHref, canUseSourceLinks)}
          detail={`${tc(formatStatusLabel(item.varianceType))} - ${tc(formatStatusLabel(item.severity))}`}
          value={formatAppMoney(item.varianceAmount, "SAR", locale)}
          badge="Valuation variance preview"
        />
      ))}
    </AttentionPanel>
  );
}

function AttentionPanel({ title, emptyLabel, children }: { title: string; emptyLabel: string; children: ReactNode }) {
  const { tc } = useAppLocale();
  const childArray = Array.isArray(children) ? children : [children];
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">{tc(title)}</h2>
      {childArray.length === 0 ? <p className="mt-3 text-sm text-steel">{tc(emptyLabel)}</p> : <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function AttentionRow({
  supplier,
  title,
  detail,
  value,
  badge,
}: {
  supplier: ReactNode;
  title: ReactNode;
  detail: string;
  value: string;
  badge: string;
}) {
  const { tc } = useAppLocale();
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-1 text-xs text-steel">{supplier}</div>
        <div className="mt-1 text-xs text-steel">{detail}</div>
      </div>
      <div className="text-start md:text-end">
        <div className="font-mono text-sm font-semibold text-ink">{value}</div>
        <span className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc(badge)}</span>
      </div>
    </div>
  );
}

function supplierCell(label: string, href: string | null, canUseLink: boolean) {
  if (!href || !canUseLink) {
    return <span className="font-medium text-ink">{label}</span>;
  }
  return (
    <Link href={href} className="font-medium text-palm hover:text-teal-800">
      {label}
    </Link>
  );
}

function sourceCell(label: string, href: string | null, canUseLink: boolean) {
  if (!href || !canUseLink) {
    return <span>{label}</span>;
  }
  return (
    <Link href={href} className="text-palm hover:text-teal-800">
      {label}
    </Link>
  );
}

function supplierRowValue(row: SupplierApTopSupplier, locale: AppLocale): string {
  if (row.amount) return formatAppMoney(row.amount, "SAR", locale);
  if (row.exceptionCount !== undefined) return String(row.exceptionCount);
  if (row.openReturnCount !== undefined) return String(row.openReturnCount);
  if (row.variancePreviewCount !== undefined) return `${row.variancePreviewCount} / ${formatAppMoney(row.variancePreviewTotal ?? "0.0000", "SAR", locale)}`;
  return "-";
}

function NonPostingBadge() {
  const { tc } = useAppLocale();
  return <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">{tc("Non-posting")}</span>;
}

function StatusBadge({ label }: { label: string }) {
  const { tc } = useAppLocale();
  return <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc(formatStatusLabel(label))}</span>;
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
