"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryOperationalWarning, warehouseStatusBadgeClass, warehouseStatusLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { Warehouse } from "@/lib/types";

export default function WarehousesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = can(PERMISSIONS.warehouses.manage);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<Warehouse[]>("/warehouses")
      .then((result) => {
        if (!cancelled) {
          setWarehouses(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load warehouses.");
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
  }, [organizationId, reloadToken]);

  async function createWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<Warehouse>("/warehouses", {
        method: "POST",
        body: {
          code: String(formData.get("code")),
          name: String(formData.get("name")),
          addressLine1: String(formData.get("addressLine1") || "") || undefined,
          city: String(formData.get("city") || "") || undefined,
          countryCode: String(formData.get("countryCode") || "SA"),
          phone: String(formData.get("phone") || "") || undefined,
          isDefault: formData.get("isDefault") === "on",
        },
      });
      setSuccess(`Created warehouse ${created.code}.`);
      form.reset();
      setReloadToken((current) => current + 1);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create warehouse.");
    }
  }

  async function changeStatus(warehouse: Warehouse, action: "archive" | "reactivate") {
    setActionId(warehouse.id);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<Warehouse>(`/warehouses/${warehouse.id}/${action}`, { method: "POST" });
      setSuccess(`${updated.code} is now ${warehouseStatusLabel(updated.status).toLowerCase()}.`);
      setReloadToken((current) => current + 1);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update warehouse status.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Warehouses</h1>
        <p className="mt-1 text-sm text-steel">Warehouse master data for operational stock movements.</p>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      {canManage ? (
        <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Create warehouse</h2>
          <form onSubmit={createWarehouse} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input name="code" required placeholder="Code" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="name" required placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="addressLine1" placeholder="Address" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="city" placeholder="City" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="countryCode" defaultValue="SA" placeholder="Country" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <input name="phone" placeholder="Phone" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="isDefault" type="checkbox" />
              Default warehouse
            </label>
            <button type="submit" disabled={!organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Add warehouse
            </button>
          </form>
        </div>
      ) : null}

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load warehouses.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading warehouses...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && warehouses.length === 0 ? <StatusMessage type="empty">No warehouses found.</StatusMessage> : null}
      </div>

      {warehouses.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Default</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{warehouse.code}</td>
                  <td className="px-4 py-3 font-medium text-ink">{warehouse.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${warehouseStatusBadgeClass(warehouse.status)}`}>
                      {warehouseStatusLabel(warehouse.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-steel">{warehouse.isDefault ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-steel">{warehouse.city ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{warehouse.countryCode}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/inventory/warehouses/${warehouse.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {canManage && warehouse.status === "ACTIVE" ? (
                        <button type="button" disabled={actionId === warehouse.id} onClick={() => void changeStatus(warehouse, "archive")} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Archive
                        </button>
                      ) : null}
                      {canManage && warehouse.status === "ARCHIVED" ? (
                        <button type="button" disabled={actionId === warehouse.id} onClick={() => void changeStatus(warehouse, "reactivate")} className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          Reactivate
                        </button>
                      ) : null}
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
