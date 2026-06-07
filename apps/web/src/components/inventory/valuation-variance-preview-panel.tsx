"use client";

import Link from "next/link";
import {
  inventoryValuationVarianceAmountDisplay,
  inventoryValuationVarianceSeverityBadgeClass,
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
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">
            Read-only valuation variance preview. This does not post journals, update inventory valuation, change AP balances, or book variances.
          </p>
        </div>
        <Link href={href} className="text-sm font-medium text-palm hover:underline">
          Open valuation variance preview
        </Link>
      </div>

      {preview ? (
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
          <Summary label="Preview rows" value={String(preview.summary.totalVarianceCount)} />
          <Summary label="Total absolute variance" value={inventoryValuationVarianceAmountDisplay(preview.summary.totalAbsoluteVarianceAmount)} />
          <Summary label="Critical/high" value={String(preview.summary.criticalCount + preview.summary.highCount)} />
          <Summary label="Suppliers affected" value={String(preview.summary.suppliersAffected)} />
        </div>
      ) : null}

      {firstItem ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-xs font-semibold text-ink">{inventoryValuationVarianceAmountDisplay(firstItem.varianceAmount)}</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{inventoryValuationVarianceTypeLabel(firstItem.varianceType)}</span>
          <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryValuationVarianceSeverityBadgeClass(firstItem.severity)}`}>
            {inventoryValuationVarianceSeverityLabel(firstItem.severity)}
          </span>
          <span className="text-xs text-steel">{firstItem.suggestedReviewAction}</span>
        </div>
      ) : preview ? (
        <p className="mt-4 text-sm text-steel">No valuation variance preview rows are currently linked to this source.</p>
      ) : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 font-mono text-xs font-semibold text-ink">{value}</p>
    </div>
  );
}
