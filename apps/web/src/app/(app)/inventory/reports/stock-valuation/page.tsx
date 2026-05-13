"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  formatInventoryQuantity,
  inventoryReportValueDisplay,
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Stock valuation</h1>
          <p className="mt-1 text-sm text-steel">Derived moving-average stock value estimates from operational stock movements.</p>
        </div>
        <Link href="/inventory/settings" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Settings
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Operational estimate only. This report does not post inventory asset, COGS, VAT, or financial statement values.
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load the valuation report.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading stock valuation...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && report && report.rows.length === 0 ? <StatusMessage type="empty">No inventory valuation rows found.</StatusMessage> : null}
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
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Average unit cost</th>
                <th className="px-4 py-3 text-right">Estimated value</th>
                <th className="px-4 py-3">Warnings</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
