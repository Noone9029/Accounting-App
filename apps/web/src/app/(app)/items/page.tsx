"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerFormSection,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  formatInventoryQuantity,
  inventoryOperationalWarning,
  inventoryTraceabilityUrl,
  inventoryTrackingSafeHelperText,
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

function itemStatusTone(status: ItemStatus): LedgerStatusTone {
  return status === "ACTIVE" ? "success" : "draft";
}

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Items"
        description="Products and services used on sales invoices. Turn on inventory tracking only for stocked products that need warehouse quantity movement."
      />

      <ItemsInventoryGuide canViewInventory={canViewInventory} />

      <LedgerPageBody>
        {canManageItems ? (
          <ItemForm
            title="Create item"
            mode="create"
            onSubmit={createItem}
            revenueAccounts={revenueAccounts}
            salesTaxRates={salesTaxRates}
            organizationId={organizationId}
          />
        ) : null}

        {editingItem && canManageItems ? (
          <ItemForm
            title="Edit item"
            mode="edit"
            item={editingItem}
            onSubmit={updateItem}
            onCancel={() => setEditingItem(null)}
            revenueAccounts={revenueAccounts}
            salesTaxRates={salesTaxRates}
            organizationId={organizationId}
          />
        ) : null}

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load items.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading items" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {!loading && organizationId && items.length === 0 ? (
          <LedgerEmptyState
            title="No items yet."
            description="Add a service for invoicing, or add a tracked product before posting purchase receipts, stock issues, adjustments, and warehouse transfers."
          />
        ) : null}

        {items.length > 0 ? (
          <LedgerPanel>
            <LedgerFilterBar>
              <LedgerFieldLabel className="flex-1">
                <LedgerFieldText>Search products and services</LedgerFieldText>
                <LedgerInput
                  type="search"
                  aria-label="Search products and services"
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Name, SKU, description, type, or status"
                />
              </LedgerFieldLabel>
              <div className="flex items-center gap-3 text-sm text-steel">
                <span>
                  Showing {filteredItems.length} of {items.length}
                </span>
                {hasItemSearch ? <LedgerButton type="button" onClick={() => setItemSearch("")}>Clear</LedgerButton> : null}
              </div>
            </LedgerFilterBar>
          </LedgerPanel>
        ) : null}

        {items.length > 0 && filteredItems.length === 0 ? (
          <LedgerEmptyState
            title="No matching products or services."
            description="Clear the search or try a name, SKU, description, type, or status."
          />
        ) : null}

        {filteredItems.length > 0 ? (
          <LedgerDataTable minWidth="1360px">
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
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(item.sellingPrice)}</LedgerMoney></td>
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
                  <td className="px-4 py-3"><LedgerStatusBadge tone={itemStatusTone(item.status)}>{itemStatusLabel(item.status)}</LedgerStatusBadge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {canManageItems ? <LedgerButton type="button" onClick={() => setEditingItem(item)} size="sm">Edit</LedgerButton> : null}
                      {canViewInventory ? <LedgerButton href={inventoryTraceabilityUrl(item.id)} size="sm">Traceability</LedgerButton> : null}
                      {item.status === "ACTIVE" && canManageItems ? (
                        <LedgerButton type="button" onClick={() => void disableItem(item)} disabled={actionId === item.id} size="sm">
                          Disable
                        </LedgerButton>
                      ) : null}
                      {canManageItems ? <LedgerButton type="button" onClick={() => void deleteItem(item)} disabled={actionId === item.id} variant="danger" size="sm">Delete</LedgerButton> : null}
                    </div>
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

function ItemForm({
  title,
  mode,
  item,
  onSubmit,
  onCancel,
  revenueAccounts,
  salesTaxRates,
  organizationId,
}: {
  title: string;
  mode: "create" | "edit";
  item?: Item;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  revenueAccounts: Account[];
  salesTaxRates: TaxRate[];
  organizationId: string | null;
}) {
  return (
    <form key={item?.id ?? "create"} onSubmit={onSubmit}>
      <LedgerFormSection title={title}>
        <LedgerFieldLabel>
          <LedgerFieldText>Type</LedgerFieldText>
          <LedgerSelect name="type" required defaultValue={item?.type}>
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {itemTypeLabel(type)}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Status</LedgerFieldText>
          <LedgerSelect name="status" required defaultValue={item?.status}>
            {itemStatuses.map((status) => (
              <option key={status} value={status}>
                {itemStatusLabel(status)}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Name</LedgerFieldText>
          <LedgerInput name="name" required defaultValue={item?.name} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>SKU/code</LedgerFieldText>
          <LedgerInput name="sku" defaultValue={item?.sku ?? ""} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Selling price</LedgerFieldText>
          <LedgerInput name="sellingPrice" required defaultValue={item?.sellingPrice ?? "0.0000"} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Revenue account</LedgerFieldText>
          <LedgerSelect name="revenueAccountId" required defaultValue={item?.revenueAccountId}>
            <option value="">Revenue account</option>
            {revenueAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Sales tax rate</LedgerFieldText>
          <LedgerSelect name="salesTaxRateId" defaultValue={item?.salesTaxRateId ?? ""}>
            <option value="">No default tax</option>
            {salesTaxRates.map((taxRate) => (
              <option key={taxRate.id} value={taxRate.id}>
                {taxRate.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Description</LedgerFieldText>
          <LedgerInput name="description" defaultValue={item?.description ?? ""} />
        </LedgerFieldLabel>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input name="inventoryTracking" type="checkbox" defaultChecked={item?.inventoryTracking ?? false} />
          Track inventory
        </label>
        <LedgerFieldLabel>
          <LedgerFieldText>Tracking mode</LedgerFieldText>
          <LedgerSelect name="trackingMode" defaultValue={item?.trackingMode ?? "NONE"}>
            {itemTrackingModes.map((mode) => (
              <option key={mode} value={mode}>
                Tracking: {itemTrackingModeLabel(mode)}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input name="expiryTrackingEnabled" type="checkbox" defaultChecked={item?.expiryTrackingEnabled ?? false} />
          Expiry tracking
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input name="binTrackingEnabled" type="checkbox" defaultChecked={item?.binTrackingEnabled ?? false} />
          Bin tracking
        </label>
        <LedgerFieldLabel>
          <LedgerFieldText>Reorder point</LedgerFieldText>
          <LedgerInput name="reorderPoint" defaultValue={item?.reorderPoint ?? ""} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Reorder quantity</LedgerFieldText>
          <LedgerInput name="reorderQuantity" defaultValue={item?.reorderQuantity ?? ""} />
        </LedgerFieldLabel>
        <p className="text-xs leading-5 text-steel md:col-span-2">{inventoryTrackingSafeHelperText()}</p>
        <div className="flex gap-2">
          <LedgerButton type="submit" disabled={mode === "create" && (!organizationId || revenueAccounts.length === 0)} variant="primary">
            {mode === "create" ? "Add item" : "Save"}
          </LedgerButton>
          {onCancel ? <LedgerButton type="button" onClick={onCancel}>Cancel</LedgerButton> : null}
        </div>
      </LedgerFormSection>
    </form>
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
    <LedgerSummaryBand tone="warning">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">How inventory items work</h2>
          <p className="mt-1 max-w-3xl">
            Services can be invoiced without stock. Tracked products appear in warehouse balances and stock movements after receipts, issues, adjustments, or transfers.
          </p>
          <p className="mt-2 text-xs leading-5">{inventoryOperationalWarning()}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canViewInventory ? (
            <>
              <LedgerButton href="/inventory/balances" variant="primary">View balances</LedgerButton>
              <LedgerButton href="/inventory/stock-movements">Stock movements</LedgerButton>
            </>
          ) : null}
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}
