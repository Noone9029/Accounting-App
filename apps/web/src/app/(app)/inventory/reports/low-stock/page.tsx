"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatInventoryQuantity, lowStockStatusBadgeClass, lowStockStatusLabel } from "@/lib/inventory";
import type { InventoryLowStockReport } from "@/lib/types";

export default function InventoryLowStockReportPage() {
  const organizationId = useActiveOrganizationId();
  const [report, setReport] = useState<InventoryLowStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryLowStockReport>("/inventory/reports/low-stock")
      .then((result) => {
        if (!cancelled) {
          setReport(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load low-stock report.");
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
          <h1 className="text-2xl font-semibold text-ink">Low stock</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Tracked items at or below their reorder point.</p>
        </div>
        <Link href="/items" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Items
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Reorder points are operational planning fields only. This report does not post inventory accounting entries.
      </div>
      <LowStockReportGuidance />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load low-stock reporting.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading low-stock report...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && report && report.rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
            <h2 className="font-semibold text-ink">No tracked items are at or below reorder point.</h2>
            <p className="mt-2 max-w-3xl leading-6 text-steel">
              Review item reorder settings if this looks wrong, or use balances to inspect current on-hand quantities by warehouse.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/items" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                View items
              </Link>
              <Link href="/inventory/balances" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                View balances
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {report ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Low-stock items</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink">{report.totalItems}</p>
        </div>
      ) : null}

      {report && report.rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Quantity on hand</th>
                <th className="px-4 py-3 text-right">Reorder point</th>
                <th className="px-4 py-3 text-right">Reorder quantity</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => (
                <tr key={row.item.id}>
                  <td className="px-4 py-3 font-medium text-ink">{row.item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{row.item.sku ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(row.quantityOnHand)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(row.reorderPoint)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{row.reorderQuantity ? formatInventoryQuantity(row.reorderQuantity) : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${lowStockStatusBadgeClass(row.status)}`}>
                      {lowStockStatusLabel(row.status)}
                    </span>
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

export function LowStockReportGuidance() {
  return (
    <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How to read low stock</h2>
          <p className="mt-1 max-w-3xl">
            This report compares each tracked item quantity on hand against its reorder point. It is a planning alert, not an automatic purchase order or valuation posting.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          <Link href="/items" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
            Item settings
          </Link>
          <Link href="/inventory/balances" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Balances
          </Link>
          <Link href="/inventory/reports/movement-summary" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Movement report
          </Link>
        </div>
      </div>
    </div>
  );
}
