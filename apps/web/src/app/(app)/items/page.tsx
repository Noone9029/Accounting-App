"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatMoneyAmount } from "@/lib/money";
import type { Account, Item, ItemStatus, ItemType, TaxRate } from "@/lib/types";

const itemTypes: ItemType[] = ["SERVICE", "PRODUCT"];
const itemStatuses: ItemStatus[] = ["ACTIVE", "DISABLED"];

export default function ItemsPage() {
  const organizationId = useActiveOrganizationId();
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const revenueAccounts = accounts.filter((account) => account.isActive && account.allowPosting && account.type === "REVENUE");
  const salesTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "SALES" || taxRate.scope === "BOTH"));

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<Item[]>("/items"), apiRequest<Account[]>("/accounts"), apiRequest<TaxRate[]>("/tax-rates")])
      .then(([itemResult, accountResult, taxRateResult]) => {
        if (!cancelled) {
          setItems(itemResult);
          setAccounts(accountResult);
          setTaxRates(taxRateResult);
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
  }, [organizationId]);

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
          salesTaxRateId: String(formData.get("salesTaxRateId")),
        },
      });
      setItems((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess(`Created item ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create item.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Items</h1>
        <p className="mt-1 text-sm text-steel">Products and services used on sales invoices.</p>
      </div>

      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Create item</h2>
        <form onSubmit={createItem} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <select name="type" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select name="status" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {itemStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
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
          <select name="salesTaxRateId" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="">Sales tax rate</option>
            {salesTaxRates.map((taxRate) => (
              <option key={taxRate.id} value={taxRate.id}>
                {taxRate.name}
              </option>
            ))}
          </select>
          <input name="description" placeholder="Description" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <button type="submit" disabled={!organizationId || revenueAccounts.length === 0 || salesTaxRates.length === 0} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            Add item
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load items.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading items...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && items.length === 0 ? <StatusMessage type="empty">No items found.</StatusMessage> : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Revenue account</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-ink">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{item.sku ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{item.type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(item.sellingPrice)}</td>
                  <td className="px-4 py-3 text-steel">{item.revenueAccount ? `${item.revenueAccount.code} ${item.revenueAccount.name}` : "-"}</td>
                  <td className="px-4 py-3 text-steel">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
