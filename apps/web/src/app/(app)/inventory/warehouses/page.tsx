"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryOperationalWarning, warehouseStatusLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { Warehouse } from "@/lib/types";

function warehouseStatusTone(status: Warehouse["status"]): LedgerStatusTone {
  return status === "ACTIVE" ? "success" : "draft";
}

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Warehouses"
        description="Warehouse master data for operational stock movements. Use warehouses to separate on-hand quantities by location."
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>
      <WarehousesOverviewGuide canManage={canManage} />

      <LedgerPageBody>
        {canManage ? (
          <form id="create-warehouse" onSubmit={createWarehouse}>
            <LedgerFormSection title="Create warehouse">
              <LedgerFieldLabel>
                <LedgerFieldText>Code</LedgerFieldText>
                <LedgerInput name="code" required />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Name</LedgerFieldText>
                <LedgerInput name="name" required />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Address</LedgerFieldText>
                <LedgerInput name="addressLine1" />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>City</LedgerFieldText>
                <LedgerInput name="city" />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Country</LedgerFieldText>
                <LedgerInput name="countryCode" defaultValue="SA" />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Phone</LedgerFieldText>
                <LedgerInput name="phone" />
              </LedgerFieldLabel>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input name="isDefault" type="checkbox" />
                Default warehouse
              </label>
              <div>
                <LedgerButton type="submit" disabled={!organizationId} variant="primary">Add warehouse</LedgerButton>
              </div>
            </LedgerFormSection>
          </form>
        ) : null}

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load warehouses.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading warehouses" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {!loading && organizationId && warehouses.length === 0 ? (
          <LedgerEmptyState
            title="No warehouses found."
            description="Create a warehouse before posting receipts, stock issues, adjustments, or transfers."
          />
        ) : null}

        {warehouses.length > 0 ? (
          <LedgerDataTable minWidth="940px">
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
                    <LedgerStatusBadge tone={warehouseStatusTone(warehouse.status)}>{warehouseStatusLabel(warehouse.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3 text-steel">{warehouse.isDefault ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-steel">{warehouse.city ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{warehouse.countryCode}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <LedgerButton href={`/inventory/warehouses/${warehouse.id}`} size="sm" aria-label={`View warehouse ${warehouse.code} ${warehouse.name}`}>
                        View
                      </LedgerButton>
                      {canManage && warehouse.status === "ACTIVE" ? (
                        <LedgerButton
                          type="button"
                          disabled={actionId === warehouse.id}
                          onClick={() => void changeStatus(warehouse, "archive")}
                          size="sm"
                          aria-label={`Archive warehouse ${warehouse.code} ${warehouse.name}`}
                        >
                          Archive
                        </LedgerButton>
                      ) : null}
                      {canManage && warehouse.status === "ARCHIVED" ? (
                        <LedgerButton
                          type="button"
                          disabled={actionId === warehouse.id}
                          onClick={() => void changeStatus(warehouse, "reactivate")}
                          size="sm"
                          aria-label={`Reactivate warehouse ${warehouse.code} ${warehouse.name}`}
                        >
                          Reactivate
                        </LedgerButton>
                      ) : null}
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

export function WarehousesOverviewGuide({ canManage }: { canManage: boolean }) {
  return (
    <LedgerSummaryBand tone="info">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Warehouse workflow</h2>
          <p className="mt-1 max-w-3xl">
            Receipts and adjustments put stock into a warehouse, stock issues remove stock, and transfers move the same quantity from one warehouse to another.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
          {canManage ? <LedgerButton href="#create-warehouse" variant="primary">Create warehouse</LedgerButton> : null}
          <LedgerButton href="/inventory/balances">Balances</LedgerButton>
          <LedgerButton href="/inventory/stock-movements">Stock movements</LedgerButton>
          <LedgerButton href="/dashboard">Dashboard</LedgerButton>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}
