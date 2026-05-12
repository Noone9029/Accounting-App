"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { Branch } from "@/lib/types";

export default function BranchesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canUpdateOrganization = can(PERMISSIONS.organization.update);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<Branch[]>("/branches")
      .then((result) => {
        if (!cancelled) {
          setBranches(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load branches.");
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

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<Branch>("/branches", {
        method: "POST",
        body: {
          name: String(formData.get("name")),
          displayName: String(formData.get("displayName") || "") || undefined,
          phone: String(formData.get("phone") || "") || undefined,
          taxNumber: String(formData.get("taxNumber") || "") || undefined,
          city: String(formData.get("city") || "") || undefined,
          countryCode: String(formData.get("countryCode") || "SA"),
          isDefault: formData.get("isDefault") === "on",
        },
      });
      setBranches((current) => [...current, created].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)));
      setSuccess(`Created branch ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create branch.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Branches</h1>
        <p className="mt-1 text-sm text-steel">Tenant branch records used later for documents, taxes, and ZATCA EGS units.</p>
      </div>

      {canUpdateOrganization ? (
      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Create branch</h2>
        <form onSubmit={createBranch} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input name="name" required placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="displayName" placeholder="Display name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="phone" placeholder="Phone" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="taxNumber" placeholder="VAT number" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="city" placeholder="City" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="countryCode" defaultValue="SA" placeholder="Country" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="isDefault" type="checkbox" />
            Default branch
          </label>
          <button type="submit" disabled={!organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            Add branch
          </button>
        </form>
      </div>
      ) : null}

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load branches.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading branches...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && branches.length === 0 ? <StatusMessage type="empty">No branches found.</StatusMessage> : null}
      </div>

      {branches.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Display</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">VAT number</th>
                <th className="px-4 py-3">Default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td className="px-4 py-3 font-medium text-ink">{branch.name}</td>
                  <td className="px-4 py-3 text-steel">{branch.displayName ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{branch.city ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{branch.taxNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{branch.isDefault ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
