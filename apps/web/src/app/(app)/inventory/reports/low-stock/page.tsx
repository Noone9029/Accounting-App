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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory reports"
        title="Low stock"
        description="Tracked items at or below their reorder point."
        actions={<LedgerButton href="/items">Items</LedgerButton>}
      />

      <LedgerPageBody>
      <LedgerAlert tone="warning">Reorder points are operational planning fields only. This report does not post inventory accounting entries.</LedgerAlert>
      <LowStockReportGuidance />

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load low-stock reporting.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading low-stock report" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && report && report.rows.length === 0 ? (
          <LedgerEmptyState
            title="No tracked items are at or below reorder point."
            description="Review item reorder settings if this looks wrong, or use balances to inspect current on-hand quantities by warehouse."
            action={
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <LedgerButton href="/items">View items</LedgerButton>
                <LedgerButton href="/inventory/balances">View balances</LedgerButton>
              </div>
            }
          />
        ) : null}

      {report ? (
        <LedgerStatCard label="Low-stock items" value={<LedgerMoney>{report.totalItems}</LedgerMoney>} />
      ) : null}

      {report && report.rows.length > 0 ? (
        <LedgerDataTable minWidth="900px">
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
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(row.quantityOnHand)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(row.reorderPoint)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{row.reorderQuantity ? formatInventoryQuantity(row.reorderQuantity) : "-"}</LedgerMoney></td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${lowStockStatusBadgeClass(row.status)}`}>
                      {lowStockStatusLabel(row.status)}
                    </span>
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

export function LowStockReportGuidance() {
  return (
    <LedgerSummaryBand tone="success">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How to read low stock</h2>
          <p className="mt-1 max-w-3xl">
            This report compares each tracked item quantity on hand against its reorder point. It is a planning alert, not an automatic purchase order or valuation posting.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          <LedgerButton href="/items" variant="primary">Item settings</LedgerButton>
          <LedgerButton href="/inventory/balances">Balances</LedgerButton>
          <LedgerButton href="/inventory/reports/movement-summary">Movement report</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}
