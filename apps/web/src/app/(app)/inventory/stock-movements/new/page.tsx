"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryOperationalWarning, stockMovementTypeLabel } from "@/lib/inventory";
import type { Item, StockMovement, StockMovementType, Warehouse } from "@/lib/types";

const movementTypes: StockMovementType[] = ["OPENING_BALANCE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewStockMovementPage() {
  const organizationId = useActiveOrganizationId();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const trackedItems = items.filter((item) => item.inventoryTracking && item.status === "ACTIVE");
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "ACTIVE");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<Item[]>("/items"), apiRequest<Warehouse[]>("/warehouses")])
      .then(([itemResult, warehouseResult]) => {
        if (!cancelled) {
          setItems(itemResult);
          setWarehouses(warehouseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load movement form data.");
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

  async function createMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<StockMovement>("/stock-movements", {
        method: "POST",
        body: {
          itemId: String(formData.get("itemId")),
          warehouseId: String(formData.get("warehouseId")),
          movementDate: String(formData.get("movementDate")),
          type: String(formData.get("type")) as StockMovementType,
          quantity: String(formData.get("quantity")),
          unitCost: String(formData.get("unitCost") || "") || undefined,
          description: String(formData.get("description") || "") || undefined,
        },
      });
      setSuccess(`Created stock movement ${stockMovementTypeLabel(created.type)}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create stock movement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New stock movement</h1>
          <p className="mt-1 text-sm text-steel">Create a manual opening balance or adjustment for a tracked item.</p>
        </div>
        <Link href="/inventory/stock-movements" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create stock movements.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading form data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && trackedItems.length === 0 ? <StatusMessage type="empty">No active inventory-tracked items are available.</StatusMessage> : null}
        {!loading && organizationId && activeWarehouses.length === 0 ? <StatusMessage type="empty">No active warehouses are available.</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <form onSubmit={createMovement} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Item</span>
            <select name="itemId" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select item</option>
              {trackedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.sku ? ` (${item.sku})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Warehouse</span>
            <select name="warehouseId" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select warehouse</option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Type</span>
            <select name="type" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {movementTypes.map((type) => (
                <option key={type} value={type}>
                  {stockMovementTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Date</span>
            <input name="movementDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Quantity</span>
            <input name="quantity" required defaultValue="1.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Unit cost</span>
            <input name="unitCost" placeholder="Optional" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Description</span>
            <input name="description" placeholder="Reason or memo" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={submitting || trackedItems.length === 0 || activeWarehouses.length === 0} className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {submitting ? "Creating..." : "Create movement"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
