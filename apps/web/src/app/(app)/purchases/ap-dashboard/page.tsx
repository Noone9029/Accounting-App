"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerLoadingState,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load Supplier/AP Dashboard.");
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

  const summaryCards = useMemo(() => {
    const summary = dashboard?.apSummary;
    return [
      { label: "Open payables", value: formatMoneyAmount(summary?.openPayablesTotal ?? "0.0000", "SAR"), detail: `${summary?.openBillCount ?? 0} open bills` },
      { label: "Overdue bills", value: formatMoneyAmount(summary?.overdueBillsTotal ?? "0.0000", "SAR"), detail: `${summary?.overdueBillCount ?? 0} bills overdue` },
      { label: "Open purchase orders", value: String(summary?.purchaseOrdersOpenCount ?? 0), detail: "Awaiting receipt or closure" },
      { label: "Receipts pending bill", value: String(summary?.purchaseReceiptsPendingBillCount ?? 0), detail: "Purchase receipts awaiting bill" },
      { label: "Bills pending receipt", value: String(summary?.purchaseBillsPendingReceiptCount ?? 0), detail: "Purchase bills awaiting receipt" },
      { label: "Matching exceptions", value: String(summary?.matchingExceptionCount ?? 0), detail: `${summary?.matchingCriticalCount ?? 0} critical` },
      { label: "Reviews needing action", value: String(summary?.matchingReviewOpenCount ?? 0), detail: "Open or waiting matching reviews" },
      {
        label: "Purchase returns",
        value: String(summary?.returnsOpenCount ?? 0),
        detail: `${summary?.returnsCompletedCount ?? 0} completed, ${summary?.returnsAwaitingInventoryMovementCount ?? 0} awaiting movement, ${summary?.returnsInventoryMovementPostedCount ?? 0} posted`,
      },
      { label: "Variance previews", value: String(summary?.variancePreviewCount ?? 0), detail: formatMoneyAmount(summary?.variancePreviewTotal ?? "0.0000", "SAR") },
    ];
  }, [dashboard?.apSummary]);

  const summary = dashboard?.apSummary;

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Supplier/AP Dashboard"
        description="Supplier payables, matching exceptions, returns, variance previews, and operational follow-up in one read-only workspace."
        actions={
          <LedgerActionBar className="sm:justify-end">
            {canViewMatchingLinks ? <LedgerButton href="/purchases/matching">Matching exceptions</LedgerButton> : null}
            {canViewVarianceLinks ? (
              <>
                <LedgerButton href="/inventory/landed-cost">
                  Landed cost preview
                </LedgerButton>
                <LedgerButton href="/inventory/valuation-variances">
                  Valuation variance preview
                </LedgerButton>
              </>
            ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{SAFE_HELPER_TEXT}</LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load the Supplier/AP Dashboard.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading Supplier/AP Dashboard" description="Fetching supplier payable totals, exceptions, returns, and variance previews." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        {dashboard ? (
          <>
            <LedgerMetricGrid className="sm:grid-cols-2 xl:grid-cols-3">
              {summaryCards.map((card) => (
                <LedgerStatCard key={card.label} label={card.label} value={card.value} detail={card.detail} />
              ))}
              {canViewVarianceLinks ? (
                <LedgerStatCard label="Landed cost preview" value="Available" detail="Read-only landed cost allocation planning" href="/inventory/landed-cost" />
              ) : null}
            </LedgerMetricGrid>

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

            <LedgerSection
              title="Recent supplier activity"
              description="Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately."
              className={summary?.recentSupplierActivity.length ? "p-0" : undefined}
            >
              {summary?.recentSupplierActivity.length ? (
                <LedgerDataTable minWidth="940px" className="rounded-t-none border-0 shadow-none">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Activity</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Effect</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.recentSupplierActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-3 py-2"><LedgerDate>{formatOptionalDate(activity.date, "-")}</LedgerDate></td>
                        <td className="px-3 py-2">{supplierCell(activity.supplierName, activity.supplierHref, canViewSupplierLinks)}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-ink">{activity.label}</div>
                          <div className="font-mono text-xs text-steel">{activity.sourceNumber}</div>
                        </td>
                        <td className="px-3 py-2">{activity.amount ? <LedgerMoney>{formatMoneyAmount(activity.amount, "SAR")}</LedgerMoney> : "-"}</td>
                        <td className="px-3 py-2"><StatusBadge label={activity.status} /></td>
                        <td className="px-3 py-2">{activity.nonPosting ? <NonPostingBadge /> : <LedgerStatusBadge tone="success">Financial posting</LedgerStatusBadge>}</td>
                        <td className="px-3 py-2">{sourceCell("Open", activity.href, Boolean(activity.href))}</td>
                      </tr>
                    ))}
                  </tbody>
                </LedgerDataTable>
              ) : (
                <LedgerEmptyState title="No recent supplier activity" description="No recent supplier activity is available for the current permissions." />
              )}
            </LedgerSection>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {rows.length === 0 ? <LedgerEmptyState title="No suppliers found" description="No suppliers found for this attention view." /> : null}
      {rows.length > 0 ? (
        <div className="mt-3 space-y-3">
          {rows.map((row) => (
            <div key={`${title}-${row.supplierId}`} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
              <div>
                {supplierCell(row.supplierName, row.href, canUseSupplierLinks)}
                <div className="mt-1 text-xs text-steel">
                  {row.highestSeverity ? `${formatStatusLabel(row.highestSeverity)} severity` : valueLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold text-ink">{supplierRowValue(row)}</div>
                <div className="text-xs text-steel">{valueLabel}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </LedgerPanel>
  );
}

function BillsAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApBillAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  return (
    <AttentionPanel title="Bills due soon / overdue" emptyLabel="No bills are overdue or due soon for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.billNumber, item.href, canUseSourceLinks)}
          detail={`${item.attentionCategory} - ${formatOptionalDate(item.dueDate, "No due date")}`}
          value={formatMoneyAmount(item.balanceDue, item.currency)}
          badge={item.dueStatus === "OVERDUE" ? "Overdue" : "Due soon"}
        />
      ))}
    </AttentionPanel>
  );
}

function MatchingAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApMatchingAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  return (
    <AttentionPanel title="Matching exceptions needing review" emptyLabel="No matching exceptions need review for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.sourceNumber, item.sourceHref, canUseSourceLinks)}
          detail={`${item.attentionCategory} - ${formatStatusLabel(item.exceptionType)}`}
          value={formatStatusLabel(item.severity)}
          badge="Review needed"
        />
      ))}
    </AttentionPanel>
  );
}

function ReturnsAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApReturnAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  return (
    <AttentionPanel title="Purchase returns awaiting action" emptyLabel="No purchase returns are awaiting action for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.purchaseReturnNumber, item.href, canUseSourceLinks)}
          detail={`${item.attentionCategory} - ${item.reason ?? "No reason recorded"} - ${formatOptionalDate(item.returnDate, "-")}`}
          value={`${formatStatusLabel(item.status)} / ${item.inventoryMovementStatus === "POSTED" ? "Movement posted" : "Movement not posted"}`}
          badge="Non-posting"
        />
      ))}
    </AttentionPanel>
  );
}

function VarianceAttentionList({ items, canUseSupplierLinks, canUseSourceLinks }: { items: SupplierApVarianceAttentionItem[]; canUseSupplierLinks: boolean; canUseSourceLinks: boolean }) {
  return (
    <AttentionPanel title="Variance previews needing accountant review" emptyLabel="No valuation variance previews need review for the current permissions.">
      {items.map((item) => (
        <AttentionRow
          key={item.id}
          supplier={supplierCell(item.supplierName, item.supplierHref, canUseSupplierLinks)}
          title={sourceCell(item.sourceNumber, item.sourceHref, canUseSourceLinks)}
          detail={`${formatStatusLabel(item.varianceType)} - ${formatStatusLabel(item.severity)}`}
          value={formatMoneyAmount(item.varianceAmount, "SAR")}
          badge="Valuation variance preview"
        />
      ))}
    </AttentionPanel>
  );
}

function AttentionPanel({ title, emptyLabel, children }: { title: string; emptyLabel: string; children: ReactNode }) {
  const childArray = Array.isArray(children) ? children : [children];
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {childArray.length === 0 ? <LedgerEmptyState title={emptyLabel} /> : <div className="mt-3 space-y-3">{children}</div>}
    </LedgerPanel>
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
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-1 text-xs text-steel">{supplier}</div>
        <div className="mt-1 text-xs text-steel">{detail}</div>
      </div>
      <div className="text-left md:text-right">
        <div className="font-mono text-sm font-semibold text-ink">{value}</div>
        <div className="mt-1"><LedgerStatusBadge tone={attentionBadgeTone(badge)}>{badge}</LedgerStatusBadge></div>
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

function supplierRowValue(row: SupplierApTopSupplier): string {
  if (row.amount) return formatMoneyAmount(row.amount, "SAR");
  if (row.exceptionCount !== undefined) return String(row.exceptionCount);
  if (row.openReturnCount !== undefined) return String(row.openReturnCount);
  if (row.variancePreviewCount !== undefined) return `${row.variancePreviewCount} / ${formatMoneyAmount(row.variancePreviewTotal ?? "0.0000", "SAR")}`;
  return "-";
}

function NonPostingBadge() {
  return <LedgerStatusBadge tone="info">Non-posting</LedgerStatusBadge>;
}

function StatusBadge({ label }: { label: string }) {
  return <LedgerStatusBadge tone={statusTone(label)}>{formatStatusLabel(label)}</LedgerStatusBadge>;
}

function statusTone(label: string): LedgerStatusTone {
  if (label === "POSTED" || label === "PAID" || label === "COMPLETED") return "success";
  if (label === "OVERDUE" || label === "CRITICAL") return "danger";
  if (label === "SUBMITTED" || label === "HIGH" || label.includes("WAITING")) return "warning";
  return "neutral";
}

function attentionBadgeTone(label: string): LedgerStatusTone {
  if (label === "Overdue") return "danger";
  if (label === "Due soon" || label === "Review needed" || label === "Valuation variance preview") return "warning";
  if (label === "Non-posting") return "info";
  return "neutral";
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
