"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryFifoPreviewSafeHelperText,
  inventoryFifoPreviewUrl,
  inventoryFifoPreviewWarningBadgeClass,
  inventoryFifoPreviewWarningLabel,
  inventoryReportValueDisplay,
  inventoryValuationMethodLabel,
  stockMovementTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type {
  InventoryFifoPreviewConsumedMovement,
  InventoryFifoPreviewLayer,
  InventoryFifoPreviewResponse,
  InventoryFifoPreviewRow,
  InventoryFifoPreviewSourceDocument,
  InventoryFifoPreviewWarning,
} from "@/lib/types";

interface FifoPreviewFilters {
  itemId: string;
  warehouseId: string;
  asOfDate: string;
}

interface SourcePermissionContext {
  can: (permission: Permission) => boolean;
  canAny: (...permissions: Permission[]) => boolean;
}

export default function InventoryFifoPreviewPage() {
  const organizationId = useActiveOrganizationId();
  const searchParams = useSearchParams();
  const { can, canAny } = usePermissions();
  const initialFilters = useMemo<FifoPreviewFilters>(
    () => ({
      itemId: searchParams.get("itemId") ?? "",
      warehouseId: searchParams.get("warehouseId") ?? "",
      asOfDate: searchParams.get("asOfDate") ?? "",
    }),
    [searchParams],
  );
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [preview, setPreview] = useState<InventoryFifoPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canViewPage = can(PERMISSIONS.inventory.view);
  const path = useMemo(() => inventoryFifoPreviewUrl(filters), [filters]);
  const layerRows = useMemo(() => flattenLayers(preview?.rows ?? []), [preview]);
  const consumptionRows = useMemo(() => flattenConsumptions(preview?.rows ?? []), [preview]);
  const sourcePermissions = useMemo<SourcePermissionContext>(() => ({ can, canAny }), [can, canAny]);

  useEffect(() => {
    if (!organizationId || !canViewPage) {
      setPreview(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    apiRequest<InventoryFifoPreviewResponse>(path)
      .then((result) => {
        if (active) setPreview(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load FIFO cost-layer preview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canViewPage, organizationId, path]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters(draftFilters);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">FIFO Cost-Layer Preview</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-steel">{inventoryFifoPreviewSafeHelperText()}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
          <Link href="/inventory/reports/stock-valuation" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Stock valuation
          </Link>
          <Link href="/inventory/landed-cost" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Landed cost preview
          </Link>
          <Link href="/inventory/valuation-variances" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Valuation variances
          </Link>
        </div>
      </header>

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to load FIFO cost-layer preview.</StatusMessage> : null}
      {organizationId && !canViewPage ? <StatusMessage type="info">FIFO cost-layer preview requires inventory view permission.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading FIFO cost-layer preview...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
        <label className="text-sm font-medium text-ink">
          Item
          <input
            value={draftFilters.itemId}
            onChange={(event) => setDraftFilters((current) => ({ ...current, itemId: event.target.value }))}
            placeholder="Item ID"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Warehouse
          <input
            value={draftFilters.warehouseId}
            onChange={(event) => setDraftFilters((current) => ({ ...current, warehouseId: event.target.value }))}
            placeholder="Warehouse ID"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          As-of date
          <input
            type="date"
            value={draftFilters.asOfDate}
            onChange={(event) => setDraftFilters((current) => ({ ...current, asOfDate: event.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!organizationId || !canViewPage}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Apply filters
        </button>
      </form>

      {preview ? (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="On-hand quantity" value={formatInventoryQuantity(preview.totals.totalOnHandQuantity)} />
            <Metric label="FIFO preview value" value={inventoryReportValueDisplay(preview.totals.fifoPreviewValue)} />
            <Metric label="Current operational value" value={inventoryReportValueDisplay(preview.totals.currentOperationalValuationValue)} />
            <Metric label="Difference" value={inventoryReportValueDisplay(preview.totals.differenceFromCurrentOperationalValuation)} />
            <Metric label="Warnings" value={String(preview.totals.warningCount)} tone={preview.totals.warningCount > 0 ? "warning" : "neutral"} />
            <Metric label="Blockers" value={String(preview.totals.blockerCount)} tone={preview.totals.blockerCount > 0 ? "blocker" : "neutral"} />
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-steel">As of</p>
                <p className="mt-1 font-medium text-ink">{formatOptionalDate(preview.asOfDate, "-")}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-steel">Active valuation method</p>
                <p className="mt-1 font-medium text-ink">{inventoryValuationMethodLabel(preview.activeValuationMethod.method)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-steel">Preview valuation method</p>
                <p className="mt-1 font-medium text-ink">{preview.previewValuationMethod.replace("_", " ")}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-steel">{preview.activeValuationMethod.note}</p>
          </section>

          <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-base font-semibold text-ink">Layer table</h2>
              <p className="text-sm text-steel">{layerRows.length} layers</p>
            </div>
            {layerRows.length === 0 ? <StatusMessage type="empty">No FIFO layers are available for the selected scope.</StatusMessage> : null}
            {layerRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-3 py-2">Layer date</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2">Source movement</th>
                      <th className="px-3 py-2">Source document</th>
                      <th className="px-3 py-2 text-right">Original quantity</th>
                      <th className="px-3 py-2 text-right">Remaining quantity</th>
                      <th className="px-3 py-2 text-right">Unit cost</th>
                      <th className="px-3 py-2 text-right">Layer value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {layerRows.map(({ row, layer }) => (
                      <tr key={layer.layerId}>
                        <td className="px-3 py-3 text-steel">{formatOptionalDate(layer.layerDate, "-")}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-ink">{row.item.name}</div>
                          <div className="text-xs text-steel">{row.item.sku ?? row.item.id}</div>
                        </td>
                        <td className="px-3 py-3 text-steel">{row.warehouse.code} {row.warehouse.name}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-ink">{stockMovementTypeLabel(layer.sourceMovement.type)}</div>
                          <div className="text-xs text-steel">{layer.sourceMovementId}</div>
                        </td>
                        <td className="px-3 py-3">
                          <SourceDocumentLink document={layer.sourceDocument} permissions={sourcePermissions} />
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs">{formatInventoryQuantity(layer.originalQuantity)}</td>
                        <td className="px-3 py-3 text-right font-mono text-xs">{formatInventoryQuantity(layer.remainingQuantity)}</td>
                        <td className="px-3 py-3 text-right font-mono text-xs">{inventoryReportValueDisplay(layer.unitCost)}</td>
                        <td className="px-3 py-3 text-right font-mono text-xs">{inventoryReportValueDisplay(layer.layerValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-base font-semibold text-ink">Consumption preview</h2>
              <p className="text-sm text-steel">{consumptionRows.length} outbound movements</p>
            </div>
            {consumptionRows.length === 0 ? <StatusMessage type="empty">No outbound movements consume FIFO layers in the selected scope.</StatusMessage> : null}
            {consumptionRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-3 py-2">Outbound movement</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2">Source document</th>
                      <th className="px-3 py-2 text-right">Consumed quantity</th>
                      <th className="px-3 py-2">Consumed layers</th>
                      <th className="px-3 py-2 text-right">Estimated cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consumptionRows.map(({ row, movement }) => (
                      <tr key={movement.movementId}>
                        <td className="px-3 py-3">
                          <div className="font-medium text-ink">{stockMovementTypeLabel(movement.type)}</div>
                          <div className="text-xs text-steel">{formatOptionalDate(movement.movementDate, "-")}</div>
                          <div className="text-xs text-steel">{movement.movementId}</div>
                        </td>
                        <td className="px-3 py-3 text-ink">{row.item.name}</td>
                        <td className="px-3 py-3 text-steel">{row.warehouse.code} {row.warehouse.name}</td>
                        <td className="px-3 py-3">
                          <SourceDocumentLink document={movement.sourceDocument} permissions={sourcePermissions} />
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs">{formatInventoryQuantity(movement.consumedQuantity)}</td>
                        <td className="px-3 py-3 text-xs text-steel">
                          {movement.consumedLayers.length === 0
                            ? "No layer consumption available"
                            : movement.consumedLayers.map((layer) => `${layer.sourceMovementId}: ${formatInventoryQuantity(layer.consumedQuantity)}`).join("; ")}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs">{inventoryReportValueDisplay(movement.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <WarningsPanel title="Blockers" warnings={preview.blockers} />
          <WarningsPanel title="Warnings" warnings={preview.warnings} />
        </>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-ink">Safe limitations</h2>
        <p className="mt-2 text-sm leading-6 text-steel">
          FIFO preview is an informational reconstruction only. It does not persist active cost layers, switch the valuation method, update moving average, change stock valuation, create COGS entries, post journals, affect AP or AR, change VAT or ZATCA outputs, update financial statements, or mutate purchase, sales, landed-cost, valuation-variance, return, transfer, adjustment, or stock movement records.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" | "blocker" }) {
  const toneClass = tone === "blocker" ? "text-rose-700" : tone === "warning" ? "text-amber-700" : "text-ink";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function SourceDocumentLink({ document, permissions }: { document: InventoryFifoPreviewSourceDocument | null; permissions: SourcePermissionContext }) {
  if (!document) {
    return <span className="text-xs text-steel">No source document</span>;
  }
  const label = `${sourceDocumentTypeLabel(document.type)} ${document.id}`;
  if (!document.href || !canViewSourceDocument(document, permissions)) {
    return <span className="text-xs text-steel">{label}</span>;
  }
  return (
    <Link href={document.href} className="text-xs font-medium text-palm hover:underline">
      {label}
    </Link>
  );
}

function WarningsPanel({ title, warnings }: { title: string; warnings: InventoryFifoPreviewWarning[] }) {
  if (warnings.length === 0) {
    return null;
  }
  const borderClass = title === "Blockers" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <section className={`rounded-md border px-4 py-3 text-sm ${borderClass}`}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <ul className="mt-3 space-y-2">
        {warnings.map((warning, index) => (
          <li key={`${warning.type}:${warning.movementId ?? "response"}:${index}`} className="flex flex-col gap-1 md:flex-row md:items-start">
            <span className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium ${inventoryFifoPreviewWarningBadgeClass(warning.type)}`}>
              {inventoryFifoPreviewWarningLabel(warning.type)}
            </span>
            <span className="text-sm leading-6">{warning.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function flattenLayers(rows: InventoryFifoPreviewRow[]): Array<{ row: InventoryFifoPreviewRow; layer: InventoryFifoPreviewLayer }> {
  return rows.flatMap((row) => row.layers.map((layer) => ({ row, layer })));
}

function flattenConsumptions(rows: InventoryFifoPreviewRow[]): Array<{ row: InventoryFifoPreviewRow; movement: InventoryFifoPreviewConsumedMovement }> {
  return rows.flatMap((row) => row.consumedMovements.map((movement) => ({ row, movement })));
}

function canViewSourceDocument(document: InventoryFifoPreviewSourceDocument, permissions: SourcePermissionContext): boolean {
  if (document.type === "PurchaseReceipt" || document.type === "PurchaseReceiptVoid") return permissions.can(PERMISSIONS.purchaseReceiving.view);
  if (document.type === "SalesStockIssue" || document.type === "SalesStockIssueVoid") return permissions.can(PERMISSIONS.salesStockIssue.view);
  if (document.type === "PurchaseReturn") {
    return permissions.canAny(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view);
  }
  if (document.type === "SalesInventoryReturn") return permissions.can(PERMISSIONS.salesInvoices.view);
  if (document.type === "InventoryAdjustment" || document.type === "InventoryAdjustmentVoid") return permissions.can(PERMISSIONS.inventoryAdjustments.view);
  if (document.type === "WarehouseTransfer" || document.type === "WarehouseTransferVoid") return permissions.can(PERMISSIONS.warehouseTransfers.view);
  return false;
}

function sourceDocumentTypeLabel(type: string): string {
  if (type === "PurchaseReceipt" || type === "PurchaseReceiptVoid") return "Purchase receipt";
  if (type === "SalesStockIssue" || type === "SalesStockIssueVoid") return "Sales stock issue";
  if (type === "PurchaseReturn") return "Purchase return";
  if (type === "SalesInventoryReturn") return "Sales inventory return";
  if (type === "InventoryAdjustment" || type === "InventoryAdjustmentVoid") return "Inventory adjustment";
  if (type === "WarehouseTransfer" || type === "WarehouseTransferVoid") return "Warehouse transfer";
  return type;
}
