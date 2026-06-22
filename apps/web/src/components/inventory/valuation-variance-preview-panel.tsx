"use client";

import { LedgerButton, LedgerEmptyState, LedgerMetricGrid, LedgerPanel, LedgerStatCard, LedgerStatusBadge, type LedgerStatusTone } from "@/components/ui/ledger-system";
import {
  inventoryValuationVarianceAmountDisplay,
  inventoryValuationVarianceSeverityLabel,
  inventoryValuationVarianceTypeLabel,
} from "@/lib/inventory";
import type { InventoryValuationVariancePreviewResponse } from "@/lib/types";

export function ValuationVariancePreviewPanel({
  preview,
  href,
  title = "Valuation variance preview",
}: {
  preview: InventoryValuationVariancePreviewResponse | null;
  href: string;
  title?: string;
}) {
  const firstItem = preview?.items[0] ?? null;
  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            Read-only valuation variance preview. This does not post journals, update inventory valuation, change AP balances, or book variances.
          </p>
        </div>
        <LedgerButton href={href}>
          Open valuation variance preview
        </LedgerButton>
      </div>

      {preview ? (
        <LedgerMetricGrid className="mt-4 md:grid-cols-4">
          <LedgerStatCard label="Preview rows" value={String(preview.summary.totalVarianceCount)} />
          <LedgerStatCard label="Total absolute variance" value={inventoryValuationVarianceAmountDisplay(preview.summary.totalAbsoluteVarianceAmount)} />
          <LedgerStatCard label="Critical/high" value={String(preview.summary.criticalCount + preview.summary.highCount)} />
          <LedgerStatCard label="Suppliers affected" value={String(preview.summary.suppliersAffected)} />
        </LedgerMetricGrid>
      ) : null}

      {firstItem ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-xs font-semibold text-ink">{inventoryValuationVarianceAmountDisplay(firstItem.varianceAmount)}</span>
          <LedgerStatusBadge tone="neutral">{inventoryValuationVarianceTypeLabel(firstItem.varianceType)}</LedgerStatusBadge>
          <LedgerStatusBadge tone={varianceSeverityTone(firstItem.severity)}>{inventoryValuationVarianceSeverityLabel(firstItem.severity)}</LedgerStatusBadge>
          <span className="text-xs text-steel">{firstItem.suggestedReviewAction}</span>
        </div>
      ) : preview ? (
        <div className="mt-4">
          <LedgerEmptyState title="No valuation variance preview rows" description="No valuation variance preview rows are currently linked to this source." />
        </div>
      ) : null}
    </LedgerPanel>
  );
}

function varianceSeverityTone(severity: string): LedgerStatusTone {
  if (severity === "CRITICAL") {
    return "danger";
  }
  if (severity === "HIGH") {
    return "warning";
  }
  if (severity === "MEDIUM") {
    return "info";
  }
  return "neutral";
}
