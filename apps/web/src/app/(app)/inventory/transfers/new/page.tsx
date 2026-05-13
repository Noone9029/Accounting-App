"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryOperationalWarning, validateWarehouseTransferInput } from "@/lib/inventory";
import type { Item, Warehouse, WarehouseTransfer } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewWarehouseTransferPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [itemId, setItemId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1.0000");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        if (cancelled) {
          return;
        }
        const activeTracked = itemResult.filter((item) => item.inventoryTracking && item.status === "ACTIVE");
        const active = warehouseResult.filter((warehouse) => warehouse.status === "ACTIVE");
        setItems(itemResult);
        setWarehouses(warehouseResult);
        setItemId((current) => current || activeTracked[0]?.id || "");
        setFromWarehouseId((current) => current || active[0]?.id || "");
        setToWarehouseId((current) => current || active.find((warehouse) => warehouse.id !== active[0]?.id)?.id || "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load transfer form data.");
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

  async function createTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateWarehouseTransferInput({ itemId, fromWarehouseId, toWarehouseId, quantity });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const transfer = await apiRequest<WarehouseTransfer>("/warehouse-transfers", {
        method: "POST",
        body: {
          itemId,
          fromWarehouseId,
          toWarehouseId,
          transferDate: String(formData.get("transferDate")),
          quantity,
          unitCost: String(formData.get("unitCost") || "") || undefined,
          description: String(formData.get("description") || "") || undefined,
        },
      });
      router.push(`/inventory/transfers/${transfer.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create warehouse transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New warehouse transfer</h1>
          <p className="mt-1 text-sm text-steel">Post a stock transfer between active warehouses.</p>
        </div>
        <Link href="/inventory/transfers" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create warehouse transfers.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading form data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && trackedItems.length === 0 ? <StatusMessage type="empty">No active inventory-tracked items are available.</StatusMessage> : null}
        {!loading && organizationId && activeWarehouses.length < 2 ? <StatusMessage type="empty">At least two active warehouses are required.</StatusMessage> : null}
      </div>

      <form onSubmit={createTransfer} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Item</span>
            <select value={itemId} onChange={(event) => setItemId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select item</option>
              {trackedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.sku ? ` (${item.sku})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">From warehouse</span>
            <select value={fromWarehouseId} onChange={(event) => setFromWarehouseId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select source</option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">To warehouse</span>
            <select value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select destination</option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} {warehouse.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Transfer date</span>
            <input name="transferDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Quantity</span>
            <input value={quantity} onChange={(event) => setQuantity(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Unit cost</span>
            <input name="unitCost" placeholder="Optional" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Description</span>
            <input name="description" placeholder="Memo" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Link href="/inventory/transfers" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || trackedItems.length === 0 || activeWarehouses.length < 2} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Posting..." : "Post transfer"}
          </button>
        </div>
      </form>
    </section>
  );
}
