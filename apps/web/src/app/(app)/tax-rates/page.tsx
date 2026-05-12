"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { TaxRate, TaxRateCategory, TaxRateScope } from "@/lib/types";

const scopes: TaxRateScope[] = ["SALES", "PURCHASES", "BOTH"];
const categories: TaxRateCategory[] = ["STANDARD", "ZERO_RATED", "EXEMPT", "OUT_OF_SCOPE", "REVERSE_CHARGE"];

export default function TaxRatesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManageTaxRates = can(PERMISSIONS.taxRates.manage);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<TaxRate[]>("/tax-rates")
      .then((result) => {
        if (!cancelled) {
          setTaxRates(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load tax rates.");
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

  async function createTaxRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<TaxRate>("/tax-rates", {
        method: "POST",
        body: {
          name: String(formData.get("name")),
          scope: String(formData.get("scope")) as TaxRateScope,
          category: String(formData.get("category")) as TaxRateCategory,
          rate: String(formData.get("rate")),
          description: String(formData.get("description") || "") || undefined,
        },
      });
      setTaxRates((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSuccess(`Created tax rate ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create tax rate.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Tax rates</h1>
        <p className="mt-1 text-sm text-steel">Live VAT rate setup for the active organization.</p>
      </div>

      {canManageTaxRates ? (
      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Create tax rate</h2>
        <form onSubmit={createTaxRate} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_0.8fr_0.9fr_0.5fr]">
          <input name="name" required placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <select name="scope" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {scopes.map((scope) => (
              <option key={scope} value={scope}>{scope}</option>
            ))}
          </select>
          <select name="category" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {categories.map((category) => (
              <option key={category} value={category}>{category.replaceAll("_", " ")}</option>
            ))}
          </select>
          <input name="rate" required defaultValue="15.0000" placeholder="15.0000" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="description" placeholder="Description" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm md:col-span-3" />
          <button type="submit" disabled={!organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            Add tax rate
          </button>
        </form>
      </div>
      ) : null}

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load tax rates.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading tax rates...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && taxRates.length === 0 ? <StatusMessage type="empty">No tax rates found.</StatusMessage> : null}
      </div>

      {taxRates.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxRates.map((taxRate) => (
                <tr key={taxRate.id}>
                  <td className="px-4 py-3 font-medium text-ink">{taxRate.name}</td>
                  <td className="px-4 py-3 text-steel">{taxRate.scope}</td>
                  <td className="px-4 py-3 text-steel">{taxRate.category.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{taxRate.rate}%</td>
                  <td className="px-4 py-3 text-steel">{taxRate.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
