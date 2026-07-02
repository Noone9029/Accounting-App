"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatCard,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory reports"
        title="Stock valuation"
        description="Derived moving-average stock value estimates from operational stock movements."
        actions={
          <>
            <LedgerButton href={inventoryFifoPreviewUrl({})}>FIFO preview</LedgerButton>
            <LedgerButton href="/inventory/bin-locations">Location setup</LedgerButton>
            <LedgerButton href="/inventory/settings">Settings</LedgerButton>
          </>
        }
      />

      <LedgerPageBody>
      <LedgerAlert tone="warning">Operational estimate only. This report does not post inventory asset, COGS, VAT, or financial statement values.</LedgerAlert>
      <StockValuationReportGuidance />

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load the valuation report.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading stock valuation" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && report && report.rows.length === 0 ? (
          <LedgerEmptyState
            title="No inventory valuation rows found."
            description="Valuation rows appear when tracked items have warehouse balances and enough cost data to estimate value."
            action={
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <LedgerButton href="/items">View items</LedgerButton>
                <LedgerButton href="/inventory/balances">View balances</LedgerButton>
                <LedgerButton href="/inventory/adjustments/new">Create adjustment</LedgerButton>
              </div>
            }
          />
        ) : null}

      {report ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <LedgerStatCard label="Valuation method" value={inventoryValuationMethodLabel(report.valuationMethod)} />
          <LedgerStatCard label="Calculation" value={inventoryValuationMethodLabel(report.calculationMethod)} />
          <LedgerStatCard label="Grand total estimate" value={<LedgerMoney>{formatInventoryQuantity(report.grandTotalEstimatedValue)}</LedgerMoney>} />
        </div>
      ) : null}

      {report && report.rows.length > 0 ? (
        <LedgerDataTable minWidth="1100px">
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
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(row.quantityOnHand)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{inventoryReportValueDisplay(row.averageUnitCost)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{inventoryReportValueDisplay(row.estimatedValue)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-xs text-steel">{inventoryValuationWarningText(row)}</td>
                  <td className="px-4 py-3 text-xs">
                    <Link
                      href={inventoryFifoPreviewUrl({ itemId: row.item.id, warehouseId: row.warehouse.id })}
                      className="font-medium text-palm hover:underline"
                      aria-label={`Open FIFO preview for ${row.item.name} in ${row.warehouse.code} ${row.warehouse.name}`}
                    >
                      FIFO preview
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <Link href={inventoryTraceabilityUrl(row.item.id)} className="font-medium text-palm hover:underline" aria-label={`Open traceability for ${row.item.name}`}>
                      Traceability
                    </Link>
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

export function StockValuationReportGuidance() {
  return (
    <LedgerSummaryBand tone="success">
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
          <LedgerButton href="/inventory/balances" variant="primary">Balances</LedgerButton>
          <LedgerButton href="/inventory/stock-movements">Stock ledger</LedgerButton>
          <LedgerButton href="/inventory/reports/movement-summary">Movement report</LedgerButton>
          <LedgerButton href={inventoryFifoPreviewUrl({})}>FIFO preview</LedgerButton>
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}
