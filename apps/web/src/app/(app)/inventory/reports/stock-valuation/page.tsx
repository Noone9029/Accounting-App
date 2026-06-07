"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  formatInventoryQuantity,
  inventoryFifoPreviewUrl,
  inventoryReportValueDisplay,
  inventoryTraceabilityUrl,
  inventoryValuationMethodLabel,
  inventoryValuationWarningText,
} from "@/lib/inventory";
import type { InventoryStockValuationReport } from "@/lib/types";

export default function InventoryStockValuationReportPage() {
  const organizationId = useActiveOrganizationId();
  const [report, setReport] = useState<InventoryStockValuationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryStockValuationReport>("/inventory/reports/stock-valuation")
      .then((result) => {
        if (!cancelled) {
          setReport(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load stock valuation report.");
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
          <h1 className="text-2xl font-semibold text-ink">Stock valuation</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Derived moving-average stock value estimates from operational stock movements.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
          <Link href={inventoryFifoPreviewUrl({})} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            FIFO preview
          </Link>
          <Link href="/inventory/bin-locations" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Location setup
          </Link>
          <Link href="/inventory/settings" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Settings
          </Link>
        </div>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Operational estimate only. This report does not post inventory asset, COGS, VAT, or financial statement values.
      </div>
      <StockValuationReportGuidance />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load the valuation report.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading stock valuation...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && report && report.rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
            <h2 className="font-semibold text-ink">No inventory valuation rows found.</h2>
            <p className="mt-2 max-w-3xl leading-6 text-steel">
              Valuation rows appear when tracked items have warehouse balances and enough cost data to estimate value.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/items" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                View items
              </Link>
              <Link href="/inventory/balances" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                View balances
              </Link>
              <Link href="/inventory/adjustments/new" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                Create adjustment
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {report ? (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Valuation method</p>
            <p className="mt-1 font-semibold text-ink">{inventoryValuationMethodLabel(report.valuationMethod)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Calculation</p>
            <p className="mt-1 font-semibold text-ink">{inventoryValuationMethodLabel(report.calculationMethod)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-xs font-medium uppercase tracking-wide text-steel">Grand total estimate</p>
            <p className="mt-1 font-mono font-semibold text-ink">{formatInventoryQuantity(report.grandTotalEstimatedValue)}</p>
          </div>
        </div>
      ) : null}

      {report && report.rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Average unit cost</th>
                <th className="px-4 py-3 text-right">Estimated value</th>
                <th className="px-4 py-3">Warnings</th>
                <th className="px-4 py-3">FIFO</th>
                <th className="px-4 py-3">Traceability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => (
                <tr key={`${row.item.id}:${row.warehouse.id}`}>
                  <td className="px-4 py-3 font-medium text-ink">{row.item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{row.item.sku ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">
                    {row.warehouse.code} {row.warehouse.name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(row.quantityOnHand)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{inventoryReportValueDisplay(row.averageUnitCost)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{inventoryReportValueDisplay(row.estimatedValue)}</td>
                  <td className="px-4 py-3 text-xs text-steel">{inventoryValuationWarningText(row)}</td>
                  <td className="px-4 py-3 text-xs">
                    <Link href={inventoryFifoPreviewUrl({ itemId: row.item.id, warehouseId: row.warehouse.id })} className="font-medium text-palm hover:underline">
                      FIFO preview
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <Link href={inventoryTraceabilityUrl(row.item.id)} className="font-medium text-palm hover:underline">
                      Traceability
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function StockValuationReportGuidance() {
  return (
    <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How to read valuation</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Quantity</p>
              <p className="mt-1">On-hand quantity comes from the operational stock ledger for each item and warehouse.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Average cost</p>
              <p className="mt-1">Moving-average cost is estimated from available movement cost data and may show as pending.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Estimated value</p>
              <p className="mt-1">Use this for stock review only. It is not a VAT, COGS, or financial statement posting.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          <Link href="/inventory/balances" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
            Balances
          </Link>
          <Link href="/inventory/stock-movements" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Stock ledger
          </Link>
          <Link href="/inventory/reports/movement-summary" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Movement report
          </Link>
          <Link href={inventoryFifoPreviewUrl({})} className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            FIFO preview
          </Link>
          <Link href="/dashboard" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
