"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryAdjustmentTypeLabel, inventoryOperationalWarning } from "@/lib/inventory";
import type { InventoryAdjustment, InventoryAdjustmentType, Item, Warehouse } from "@/lib/types";

const adjustmentTypes: InventoryAdjustmentType[] = ["INCREASE", "DECREASE"];

function dateInputValue(value: string): string {
  return value.slice(0, 10);
}

export default function EditInventoryAdjustmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [adjustment, setAdjustment] = useState<InventoryAdjustment | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const trackedItems = items.filter((item) => item.inventoryTracking && item.status === "ACTIVE");
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "ACTIVE");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<InventoryAdjustment>(`/inventory-adjustments/${params.id}`),
      apiRequest<Item[]>("/items"),
      apiRequest<Warehouse[]>("/warehouses"),
    ])
      .then(([adjustmentResult, itemResult, warehouseResult]) => {
        if (!cancelled) {
          setAdjustment(adjustmentResult);
          setItems(itemResult);
          setWarehouses(warehouseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory adjustment.");
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
  }, [organizationId, params.id]);

  async function updateAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adjustment) {
      return;
    }
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const updated = await apiRequest<InventoryAdjustment>(`/inventory-adjustments/${adjustment.id}`, {
        method: "PATCH",
        body: {
          itemId: String(formData.get("itemId")),
          warehouseId: String(formData.get("warehouseId")),
          type: String(formData.get("type")) as InventoryAdjustmentType,
          adjustmentDate: String(formData.get("adjustmentDate")),
          quantity: String(formData.get("quantity")),
          unitCost: String(formData.get("unitCost") || "") || null,
          reason: String(formData.get("reason") || "") || null,
        },
      });
      router.push(`/inventory/adjustments/${updated.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update inventory adjustment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit inventory adjustment</h1>
          <p className="mt-1 text-sm text-steel">Draft adjustments can be edited before approval.</p>
        </div>
        <Link href={adjustment ? `/inventory/adjustments/${adjustment.id}` : "/inventory/adjustments"} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit inventory adjustments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory adjustment...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {adjustment && adjustment.status !== "DRAFT" ? <StatusMessage type="error">Only draft inventory adjustments can be edited.</StatusMessage> : null}
      </div>

      {adjustment && adjustment.status === "DRAFT" ? (
        <form onSubmit={updateAdjustment} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SelectField name="itemId" label="Item" defaultValue={adjustment.itemId}>
              {trackedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.sku ? ` (${item.sku})` : ""}
                </option>
              ))}
            </SelectField>
            <SelectField name="warehouseId" label="Warehouse" defaultValue={adjustment.warehouseId}>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} {warehouse.name}
                </option>
              ))}
            </SelectField>
            <SelectField name="type" label="Type" defaultValue={adjustment.type}>
              {adjustmentTypes.map((type) => (
                <option key={type} value={type}>
                  {inventoryAdjustmentTypeLabel(type)}
                </option>
              ))}
            </SelectField>
            <InputField name="adjustmentDate" label="Date" type="date" defaultValue={dateInputValue(adjustment.adjustmentDate)} />
            <InputField name="quantity" label="Quantity" defaultValue={adjustment.quantity} />
            <InputField name="unitCost" label="Unit cost" defaultValue={adjustment.unitCost ?? ""} required={false} />
            <label className="block md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Reason</span>
              <input name="reason" defaultValue={adjustment.reason ?? ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <Link href={`/inventory/adjustments/${adjustment.id}`} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </Link>
            <button type="submit" disabled={submitting} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <select name={name} required defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
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
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
    </label>
  );
}
