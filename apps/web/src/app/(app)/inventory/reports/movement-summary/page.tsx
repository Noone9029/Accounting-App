"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerStatCard,
  LedgerSummaryBand,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory reports"
        title="Movement summary"
        description="Opening, inbound, outbound, and closing quantity by tracked item and warehouse."
      />

      <LedgerPageBody>
      <LedgerAlert tone="warning">Operational movement reporting only. This does not create inventory journals, COGS, purchase receipts, purchase returns, or sales issues.</LedgerAlert>
      <InventoryMovementReportGuidance />

      <LedgerToolbar title="Report filters" description="Filter movement quantities by date, item, and warehouse.">
      <form onSubmit={refreshReport}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <InputField label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
          <InputField label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
          <LedgerFieldLabel>
            <LedgerFieldText>Item</LedgerFieldText>
            <LedgerSelect
              value={filters.itemId}
              onChange={(event) => setFilters((current) => ({ ...current, itemId: event.target.value }))}
            >
              <option value="">All tracked items</option>
              {trackedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.sku ? ` (${item.sku})` : ""}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Warehouse</LedgerFieldText>
            <LedgerSelect
              value={filters.warehouseId}
              onChange={(event) => setFilters((current) => ({ ...current, warehouseId: event.target.value }))}
            >
              <option value="">All warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} {warehouse.name}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <div className="flex items-end">
            <LedgerButton type="submit" variant="primary" disabled={loading} className="w-full">
              Apply
            </LedgerButton>
          </div>
        </div>
      </form>
      </LedgerToolbar>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load movement summaries.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading movement summary" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && report && report.rows.length === 0 ? (
          <LedgerEmptyState
            title="No movement summary rows found."
            description="Try widening the date range or review the stock ledger after posting receipts, issues, adjustments, or transfers."
            action={
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <LedgerButton href="/inventory/stock-movements">Stock movements</LedgerButton>
                <LedgerButton href="/inventory/adjustments/new">Create adjustment</LedgerButton>
                <LedgerButton href="/dashboard">Dashboard</LedgerButton>
              </div>
            }
          />
        ) : null}

      {report ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <SummaryStat label="Opening" value={report.totals.openingQuantity} />
          <SummaryStat label="Inbound" value={report.totals.inboundQuantity} />
          <SummaryStat label="Outbound" value={report.totals.outboundQuantity} />
          <SummaryStat label="Closing" value={report.totals.closingQuantity} />
          <SummaryStat label="Movements" value={String(report.totals.movementCount)} raw />
        </div>
      ) : null}

      {report && report.rows.length > 0 ? (
        <LedgerDataTable minWidth="1120px">
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
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(row.openingQuantity)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(row.inboundQuantity)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(row.outboundQuantity)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{movementSummaryNetChange(row)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(row.closingQuantity)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-xs text-steel">
                    {row.movementBreakdown.length > 0
                      ? row.movementBreakdown.map((breakdown) => `${stockMovementTypeLabel(breakdown.type)} ${breakdown.netQuantity}`).join("; ")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function InventoryMovementReportGuidance() {
  return (
    <LedgerSummaryBand tone="success">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How to read this report</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <p className="font-semibold text-ink">Opening and closing</p>
              <p className="mt-1">Opening is the quantity before the selected period. Closing is opening plus inbound minus outbound.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Inbound and outbound</p>
              <p className="mt-1">Inbound includes receipts, sales returns, increases, and transfer-ins. Outbound includes issues, purchase returns, decreases, and transfer-outs.</p>
            </div>
            <div>
              <p className="font-semibold text-ink">Breakdown</p>
              <p className="mt-1">The breakdown column shows which movement types caused the net change for each item and warehouse.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          <LedgerButton href="/inventory/stock-movements" variant="primary">Stock ledger</LedgerButton>
          <LedgerButton href="/inventory/balances">Balances</LedgerButton>
          <LedgerButton href="/inventory/reports/stock-valuation">Valuation report</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
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
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </LedgerFieldLabel>
  );
}

function SummaryStat({ label, value, raw = false }: { label: string; value: string; raw?: boolean }) {
  return (
    <LedgerStatCard label={label} value={<LedgerMoney>{raw ? value : formatInventoryQuantity(value)}</LedgerMoney>} />
  );
}
