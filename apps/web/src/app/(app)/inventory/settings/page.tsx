"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventorySettingsLabel, inventorySettingsWarnings, inventoryValuationMethodLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventorySettings, InventoryValuationMethod } from "@/lib/types";

const valuationMethods: InventoryValuationMethod[] = ["MOVING_AVERAGE", "FIFO_PLACEHOLDER"];

export default function InventorySettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.inventory.manage);
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [form, setForm] = useState({
    valuationMethod: "MOVING_AVERAGE" as InventoryValuationMethod,
    allowNegativeStock: false,
    trackInventoryValue: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventorySettings>("/inventory/settings")
      .then((result) => {
        if (!cancelled) {
          setSettings(result);
          setForm({
            valuationMethod: result.valuationMethod,
            allowNegativeStock: result.allowNegativeStock,
            trackInventoryValue: result.trackInventoryValue,
          });
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory settings.");
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

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const result = await apiRequest<InventorySettings>("/inventory/settings", {
        method: "PATCH",
        body: form,
      });
      setSettings(result);
      setMessage("Inventory settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save inventory settings.");
    } finally {
      setSaving(false);
    }
  }

  const warnings = settings ? settings.warnings : inventorySettingsWarnings(form);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Inventory settings</h1>
        <p className="mt-1 text-sm text-steel">Operational valuation policy settings for inventory reports.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage inventory settings.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory settings...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        These settings are reporting groundwork only. Inventory asset posting, COGS, invoice stock issue, and bill receiving are not enabled.
      </div>

      <form onSubmit={saveSettings} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Valuation method</span>
            <select
              value={form.valuationMethod}
              onChange={(event) => setForm((current) => ({ ...current, valuationMethod: event.target.value as InventoryValuationMethod }))}
              disabled={!canManage}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100"
            >
              {valuationMethods.map((method) => (
                <option key={method} value={method}>
                  {inventoryValuationMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[68px] items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.allowNegativeStock}
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, allowNegativeStock: event.target.checked }))}
            />
            <span>Allow negative stock</span>
          </label>
          <label className="flex min-h-[68px] items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={form.trackInventoryValue}
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, trackInventoryValue: event.target.checked }))}
            />
            <span>Track inventory value estimates</span>
          </label>
        </div>

        <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-steel">
          <p className="font-medium text-ink">{inventorySettingsLabel(form)}</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={!canManage || saving}
            className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
