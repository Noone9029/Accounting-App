"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatInventoryQuantity, movementSummaryNetChange, stockMovementTypeLabel } from "@/lib/inventory";
import type { InventoryMovementSummaryReport, Item, Warehouse } from "@/lib/types";

type Filters = {
  from: string;
  to: string;
  itemId: string;
  warehouseId: string;
};

export default function InventoryMovementSummaryReportPage() {
  const organizationId = useActiveOrganizationId();
  const [report, setReport] = useState<InventoryMovementSummaryReport | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filters, setFilters] = useState<Filters>({ from: "", to: "", itemId: "", warehouseId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<Item[]>("/items"), apiRequest<Warehouse[]>("/warehouses"), loadReport(filters)])
      .then(([itemResult, warehouseResult, reportResult]) => {
        if (!cancelled) {
          setItems(itemResult);
          setWarehouses(warehouseResult);
          setReport(reportResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load movement summary.");
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
    // Load initial data once per active organization; form submit refreshes filtered report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function refreshReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setReport(await loadReport(filters));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load movement summary.");
    } finally {
      setLoading(false);
    }
  }

  const trackedItems = items.filter((item) => item.inventoryTracking);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Movement summary</h1>
        <p className="mt-1 text-sm text-steel">Opening, inbound, outbound, and closing quantity by tracked item and warehouse.</p>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Operational movement reporting only. This does not create inventory journals, COGS, purchase receipts, or sales issues.
      </div>

      <form onSubmit={refreshReport} className="mb-5 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <InputField label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
          <InputField label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Item</span>
            <select
              value={filters.itemId}
              onChange={(event) => setFilters((current) => ({ ...current, itemId: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            >
              <option value="">All tracked items</option>
              {trackedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.sku ? ` (${item.sku})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Warehouse</span>
            <select
              value={filters.warehouseId}
              onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            >
              <option value="">All warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={loading} className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400">
              Apply
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load movement summaries.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading movement summary...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && report && report.rows.length === 0 ? <StatusMessage type="empty">No movement summary rows found.</StatusMessage> : null}
      </div>

      {report ? (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-5">
          <SummaryStat label="Opening" value={report.totals.openingQuantity} />
          <SummaryStat label="Inbound" value={report.totals.inboundQuantity} />
          <SummaryStat label="Outbound" value={report.totals.outboundQuantity} />
          <SummaryStat label="Closing" value={report.totals.closingQuantity} />
          <SummaryStat label="Movements" value={String(report.totals.movementCount)} raw />
        </div>
      ) : null}

      {report && report.rows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Opening</th>
                <th className="px-4 py-3 text-right">Inbound</th>
                <th className="px-4 py-3 text-right">Outbound</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Closing</th>
                <th className="px-4 py-3">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => (
                <tr key={`${row.item.id}:${row.warehouse.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{row.item.name}</p>
                    <p className="font-mono text-xs text-steel">{row.item.sku ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-steel">
                    {row.warehouse.code} {row.warehouse.name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(row.openingQuantity)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(row.inboundQuantity)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(row.outboundQuantity)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{movementSummaryNetChange(row)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(row.closingQuantity)}</td>
                  <td className="px-4 py-3 text-xs text-steel">
                    {row.movementBreakdown.length > 0
                      ? row.movementBreakdown.map((breakdown) => `${stockMovementTypeLabel(breakdown.type)} ${breakdown.netQuantity}`).join("; ")
                      : "-"}
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

function loadReport(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.itemId) params.set("itemId", filters.itemId);
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  const query = params.toString();
  return apiRequest<InventoryMovementSummaryReport>(`/inventory/reports/movement-summary${query ? `?${query}` : ""}`);
}

function InputField({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
      />
    </label>
  );
}

function SummaryStat({ label, value, raw = false }: { label: string; value: string; raw?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 font-mono font-semibold text-ink">{raw ? value : formatInventoryQuantity(value)}</p>
    </div>
  );
}
