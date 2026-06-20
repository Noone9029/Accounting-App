"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  formatInventoryQuantity,
  inventoryOperationalWarning,
  inventoryTraceabilityUrl,
  inventoryTrackingSafeHelperText,
  itemStatusBadgeClass,
  itemStatusLabel,
  itemTrackingModeLabel,
  itemTypeLabel,
} from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account, InventoryBalance, Item, ItemStatus, ItemTrackingMode, ItemType, TaxRate } from "@/lib/types";

const itemTypes: ItemType[] = ["SERVICE", "PRODUCT"];
const itemStatuses: ItemStatus[] = ["ACTIVE", "DISABLED"];
const itemTrackingModes: ItemTrackingMode[] = ["NONE", "SERIAL", "BATCH", "SERIAL_AND_BATCH"];

export default function ItemsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [items, setItems] = useState<Item[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [actionId, setActionId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManageItems = can(PERMISSIONS.items.manage);
  const canViewInventory = can(PERMISSIONS.inventory.view);

  const revenueAccounts = accounts.filter((account) => account.isActive && account.allowPosting && account.type === "REVENUE");
  const salesTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "SALES" || taxRate.scope === "BOTH"));
  const filteredItems = useMemo(() => filterItems(items, itemSearch), [itemSearch, items]);
  const hasItemSearch = itemSearch.trim().length > 0;

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Item[]>("/items"),
      canManageItems ? apiRequest<Account[]>("/accounts") : Promise.resolve([]),
      canManageItems ? apiRequest<TaxRate[]>("/tax-rates") : Promise.resolve([]),
      canViewInventory ? apiRequest<InventoryBalance[]>("/inventory/balances") : Promise.resolve([]),
    ])
      .then(([itemResult, accountResult, taxRateResult, balanceResult]) => {
        if (!cancelled) {
          setItems(itemResult);
          setAccounts(accountResult);
          setTaxRates(taxRateResult);
          setBalances(balanceResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load items.");
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
  }, [canManageItems, canViewInventory, organizationId]);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<Item>("/items", {
        method: "POST",
        body: {
          type: String(formData.get("type")) as ItemType,
          status: String(formData.get("status")) as ItemStatus,
          name: String(formData.get("name")),
          sku: String(formData.get("sku") || "") || undefined,
          description: String(formData.get("description") || "") || undefined,
          sellingPrice: String(formData.get("sellingPrice")),
          revenueAccountId: String(formData.get("revenueAccountId")),
          salesTaxRateId: String(formData.get("salesTaxRateId") || "") || null,
          inventoryTracking: formData.get("inventoryTracking") === "on",
          trackingMode: String(formData.get("trackingMode") || "NONE") as ItemTrackingMode,
          expiryTrackingEnabled: formData.get("expiryTrackingEnabled") === "on",
          binTrackingEnabled: formData.get("binTrackingEnabled") === "on",
          reorderPoint: String(formData.get("reorderPoint") || "") || null,
          reorderQuantity: String(formData.get("reorderQuantity") || "") || null,
        },
      });
      setItems((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess(`Created item ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create item.");
    }
  }

  async function updateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) {
      return;
    }

    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const updated = await apiRequest<Item>(`/items/${editingItem.id}`, {
        method: "PATCH",
        body: {
          type: String(formData.get("type")) as ItemType,
          status: String(formData.get("status")) as ItemStatus,
          name: String(formData.get("name")),
          sku: String(formData.get("sku") || "") || null,
          description: String(formData.get("description") || "") || null,
          sellingPrice: String(formData.get("sellingPrice")),
          revenueAccountId: String(formData.get("revenueAccountId")),
          salesTaxRateId: String(formData.get("salesTaxRateId") || "") || null,
          inventoryTracking: formData.get("inventoryTracking") === "on",
          trackingMode: String(formData.get("trackingMode") || "NONE") as ItemTrackingMode,
          expiryTrackingEnabled: formData.get("expiryTrackingEnabled") === "on",
          binTrackingEnabled: formData.get("binTrackingEnabled") === "on",
          reorderPoint: String(formData.get("reorderPoint") || "") || null,
          reorderQuantity: String(formData.get("reorderQuantity") || "") || null,
        },
      });
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingItem(null);
      setSuccess(`Updated item ${updated.name}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update item.");
    }
  }

  function totalQuantityForItem(itemId: string): string {
    const total = balances
      .filter((balance) => balance.item.id === itemId)
      .reduce((sum, balance) => sum + Number.parseFloat(balance.quantityOnHand), 0);
    return formatInventoryQuantity(total);
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Delete item ${item.name}?`)) {
      return;
    }

    setActionId(item.id);
    setError("");
    setSuccess("");
    try {
      await apiRequest<{ deleted: boolean }>(`/items/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setSuccess(`Deleted item ${item.name}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete item. Disable it if it is already used.");
    } finally {
      setActionId("");
    }
  }

  async function disableItem(item: Item) {
    setActionId(item.id);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<Item>(`/items/${item.id}`, { method: "PATCH", body: { status: "DISABLED" } });
      setItems((current) => current.map((candidate) => (candidate.id === updated.id ? updated : candidate)));
      setSuccess(`Disabled item ${updated.name}.`);
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : "Unable to disable item.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Items</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
          Products and services used on sales invoices. Turn on inventory tracking only for stocked products that need warehouse quantity movement.
        </p>
      </div>

      <ItemsInventoryGuide canViewInventory={canViewInventory} />

      {canManageItems ? (
      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Create item</h2>
        <form onSubmit={createItem} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select name="type" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {itemTypeLabel(type)}
              </option>
            ))}
          </select>
          <select name="status" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {itemStatuses.map((status) => (
              <option key={status} value={status}>
                {itemStatusLabel(status)}
              </option>
            ))}
          </select>
          <input name="name" required placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="sku" placeholder="SKU/code" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="sellingPrice" required defaultValue="0.0000" placeholder="Selling price" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <select name="revenueAccountId" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="">Revenue account</option>
            {revenueAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </select>
          <select name="salesTaxRateId" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="">No default tax</option>
            {salesTaxRates.map((taxRate) => (
              <option key={taxRate.id} value={taxRate.id}>
                {taxRate.name}
              </option>
            ))}
          </select>
          <input name="description" placeholder="Description" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="inventoryTracking" type="checkbox" />
            Track inventory
          </label>
          <select name="trackingMode" defaultValue="NONE" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {itemTrackingModes.map((mode) => (
              <option key={mode} value={mode}>
                Tracking: {itemTrackingModeLabel(mode)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="expiryTrackingEnabled" type="checkbox" />
            Expiry tracking
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="binTrackingEnabled" type="checkbox" />
            Bin tracking
          </label>
          <input name="reorderPoint" placeholder="Reorder point" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="reorderQuantity" placeholder="Reorder quantity" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <p className="text-xs leading-5 text-steel md:col-span-3">{inventoryTrackingSafeHelperText()}</p>
          <button type="submit" disabled={!organizationId || revenueAccounts.length === 0} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            Add item
          </button>
        </form>
      </div>
      ) : null}

      {editingItem && canManageItems ? (
        <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Edit item</h2>
          <form key={editingItem.id} onSubmit={updateItem} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select name="type" required defaultValue={editingItem.type} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {itemTypes.map((type) => (
                <option key={type} value={type}>{itemTypeLabel(type)}</option>
              ))}
            </select>
            <select name="status" required defaultValue={editingItem.status} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {itemStatuses.map((status) => (
                <option key={status} value={status}>{itemStatusLabel(status)}</option>
              ))}
            </select>
            <input name="name" required defaultValue={editingItem.name} placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="sku" defaultValue={editingItem.sku ?? ""} placeholder="SKU/code" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="sellingPrice" required defaultValue={editingItem.sellingPrice} placeholder="Selling price" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <select name="revenueAccountId" required defaultValue={editingItem.revenueAccountId} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {revenueAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.code} {account.name}</option>
              ))}
            </select>
            <select name="salesTaxRateId" defaultValue={editingItem.salesTaxRateId ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">No default tax</option>
              {salesTaxRates.map((taxRate) => (
                <option key={taxRate.id} value={taxRate.id}>{taxRate.name}</option>
              ))}
            </select>
            <input name="description" defaultValue={editingItem.description ?? ""} placeholder="Description" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="inventoryTracking" type="checkbox" defaultChecked={editingItem.inventoryTracking} />
              Track inventory
            </label>
            <select name="trackingMode" defaultValue={editingItem.trackingMode ?? "NONE"} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {itemTrackingModes.map((mode) => (
                <option key={mode} value={mode}>
                  Tracking: {itemTrackingModeLabel(mode)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="expiryTrackingEnabled" type="checkbox" defaultChecked={editingItem.expiryTrackingEnabled ?? false} />
              Expiry tracking
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="binTrackingEnabled" type="checkbox" defaultChecked={editingItem.binTrackingEnabled ?? false} />
              Bin tracking
            </label>
            <input name="reorderPoint" defaultValue={editingItem.reorderPoint ?? ""} placeholder="Reorder point" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="reorderQuantity" defaultValue={editingItem.reorderQuantity ?? ""} placeholder="Reorder quantity" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <p className="text-xs leading-5 text-steel md:col-span-3">{inventoryTrackingSafeHelperText()}</p>
            <div className="flex gap-2">
              <button type="submit" className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Save</button>
              <button type="button" onClick={() => setEditingItem(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load items.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading items...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && items.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
            <h2 className="font-semibold text-ink">No items yet.</h2>
            <p className="mt-2 max-w-3xl leading-6 text-steel">
              Add a service for invoicing, or add a tracked product before posting purchase receipts, stock issues, adjustments, and warehouse transfers.
            </p>
          </div>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-ink">
              Search products and services
              <input
                type="search"
                aria-label="Search products and services"
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
                placeholder="Name, SKU, description, type, or status"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-palm"
              />
            </label>
            <div className="flex items-center gap-3 text-sm text-steel">
              <span>
                Showing {filteredItems.length} of {items.length}
              </span>
              {hasItemSearch ? (
                <button type="button" onClick={() => setItemSearch("")} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {items.length > 0 && filteredItems.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-white p-5 text-sm shadow-panel">
          <h2 className="font-semibold text-ink">No matching products or services.</h2>
          <p className="mt-2 text-steel">Clear the search or try a name, SKU, description, type, or status.</p>
        </div>
      ) : null}

      {filteredItems.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1360px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Revenue account</th>
                <th className="px-4 py-3">Tax rate</th>
                <th className="px-4 py-3">Inventory</th>
                <th className="px-4 py-3">Tracking</th>
                <th className="px-4 py-3">Qty on hand</th>
                <th className="px-4 py-3">Reorder point</th>
                <th className="px-4 py-3">Reorder qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-ink">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{item.sku ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{itemTypeLabel(item.type)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(item.sellingPrice)}</td>
                  <td className="px-4 py-3 text-steel">{item.revenueAccount ? `${item.revenueAccount.code} ${item.revenueAccount.name}` : "-"}</td>
                  <td className="px-4 py-3 text-steel">{item.salesTaxRate?.name ?? "No default tax"}</td>
                  <td className="px-4 py-3 text-steel">{item.inventoryTracking ? "Tracked" : "Not tracked"}</td>
                  <td className="px-4 py-3 text-steel">
                    <div>{itemTrackingModeLabel(item.trackingMode)}</div>
                    <div className="text-xs text-slate-500">{[item.expiryTrackingEnabled ? "Expiry" : null, item.binTrackingEnabled ? "Bin" : null].filter(Boolean).join(", ") || "No extras"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{item.inventoryTracking && canViewInventory ? totalQuantityForItem(item.id) : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.reorderPoint ? formatInventoryQuantity(item.reorderPoint) : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.reorderQuantity ? formatInventoryQuantity(item.reorderQuantity) : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${itemStatusBadgeClass(item.status)}`}>{itemStatusLabel(item.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canManageItems ? <button type="button" onClick={() => setEditingItem(item)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button> : null}
                      {canViewInventory ? <Link href={inventoryTraceabilityUrl(item.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Traceability</Link> : null}
                      {item.status === "ACTIVE" && canManageItems ? (
                        <button type="button" onClick={() => void disableItem(item)} disabled={actionId === item.id} className="rounded-md border border-amber px-2 py-1 text-xs font-medium text-amber hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-slate-400">Disable</button>
                      ) : null}
                      {canManageItems ? <button type="button" onClick={() => void deleteItem(item)} disabled={actionId === item.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">Delete</button> : null}
                    </div>
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

function filterItems(items: readonly Item[], query: string): Item[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...items];
  }

  return items.filter((item) =>
    [
      item.name,
      item.sku ?? "",
      item.description ?? "",
      item.type,
      itemTypeLabel(item.type),
      item.status,
      itemStatusLabel(item.status),
      item.inventoryTracking ? "tracked" : "not tracked",
      itemTrackingModeLabel(item.trackingMode),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function ItemsInventoryGuide({ canViewInventory }: { canViewInventory: boolean }) {
  return (
    <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900 shadow-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How inventory items work</h2>
          <p className="mt-1 max-w-3xl">
            Services can be invoiced without stock. Tracked products appear in warehouse balances and stock movements after receipts, issues, adjustments, or transfers.
          </p>
          <p className="mt-2 text-xs leading-5 text-emerald-900">{inventoryOperationalWarning()}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canViewInventory ? (
            <>
              <Link href="/inventory/balances" className="rounded-md bg-palm px-3 py-2 text-center text-sm font-medium text-white hover:bg-palm-dark">
                View balances
              </Link>
              <Link href="/inventory/stock-movements" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
                Stock movements
              </Link>
            </>
          ) : null}
          <Link href="/dashboard" className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-center text-sm font-medium text-emerald-900 hover:bg-emerald-100">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
