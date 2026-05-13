"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryAdjustmentTypeLabel, inventoryOperationalWarning } from "@/lib/inventory";
import type { InventoryAdjustment, InventoryAdjustmentType, Item, Warehouse } from "@/lib/types";

const adjustmentTypes: InventoryAdjustmentType[] = ["INCREASE", "DECREASE"];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewInventoryAdjustmentPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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
        if (!cancelled) {
          setItems(itemResult);
          setWarehouses(warehouseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load adjustment form data.");
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

  async function createAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const adjustment = await apiRequest<InventoryAdjustment>("/inventory-adjustments", {
        method: "POST",
        body: {
          itemId: String(formData.get("itemId")),
          warehouseId: String(formData.get("warehouseId")),
          type: String(formData.get("type")) as InventoryAdjustmentType,
          adjustmentDate: String(formData.get("adjustmentDate")),
          quantity: String(formData.get("quantity")),
          unitCost: String(formData.get("unitCost") || "") || undefined,
          reason: String(formData.get("reason") || "") || undefined,
        },
      });
      router.push(`/inventory/adjustments/${adjustment.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create inventory adjustment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New inventory adjustment</h1>
          <p className="mt-1 text-sm text-steel">Create a draft adjustment for reviewer approval.</p>
        </div>
        <Link href="/inventory/adjustments" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create inventory adjustments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading form data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && trackedItems.length === 0 ? <StatusMessage type="empty">No active inventory-tracked items are available.</StatusMessage> : null}
        {!loading && organizationId && activeWarehouses.length === 0 ? <StatusMessage type="empty">No active warehouses are available.</StatusMessage> : null}
      </div>

      <form onSubmit={createAdjustment} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SelectField name="itemId" label="Item">
            <option value="">Select item</option>
            {trackedItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{item.sku ? ` (${item.sku})` : ""}
              </option>
            ))}
          </SelectField>
          <SelectField name="warehouseId" label="Warehouse">
            <option value="">Select warehouse</option>
            {activeWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} {warehouse.name}
              </option>
            ))}
          </SelectField>
          <SelectField name="type" label="Type">
            {adjustmentTypes.map((type) => (
              <option key={type} value={type}>
                {inventoryAdjustmentTypeLabel(type)}
              </option>
            ))}
          </SelectField>
          <InputField name="adjustmentDate" label="Date" type="date" defaultValue={todayInputValue()} />
          <InputField name="quantity" label="Quantity" defaultValue="1.0000" />
          <InputField name="unitCost" label="Unit cost" placeholder="Optional" required={false} />
          <label className="block md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Reason</span>
            <input name="reason" placeholder="Reason or memo" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Link href="/inventory/adjustments" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || trackedItems.length === 0 || activeWarehouses.length === 0} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Saving..." : "Save draft"}
          </button>
        </div>
      </form>
    </section>
  );
}

function SelectField({ name, label, children }: { name: string; label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <select name={name} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
        {children}
      </select>
    </label>
  );
}

function InputField({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
    </label>
  );
}
