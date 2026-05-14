"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  inventoryAccountingWarnings,
  inventorySettingsLabel,
  inventorySettingsWarnings,
  inventoryValuationMethodLabel,
  missingInventoryAccountMappingWarnings,
  purchaseReceiptPostingReadinessBadgeClass,
  purchaseReceiptPostingReadinessLabel,
  purchaseReceiptPostingModeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  Account,
  InventoryAccountingSettings,
  InventoryPurchasePostingMode,
  InventorySettings,
  InventoryValuationMethod,
  PurchaseReceiptPostingReadiness,
} from "@/lib/types";

const valuationMethods: InventoryValuationMethod[] = ["MOVING_AVERAGE", "FIFO_PLACEHOLDER"];
const purchaseReceiptPostingModes: InventoryPurchasePostingMode[] = ["DISABLED", "PREVIEW_ONLY"];

export default function InventorySettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.inventory.manage);
  const canViewAccounts = can(PERMISSIONS.accounts.view);
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [accountingSettings, setAccountingSettings] = useState<InventoryAccountingSettings | null>(null);
  const [purchaseReceiptReadiness, setPurchaseReceiptReadiness] = useState<PurchaseReceiptPostingReadiness | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    valuationMethod: "MOVING_AVERAGE" as InventoryValuationMethod,
    allowNegativeStock: false,
    trackInventoryValue: true,
    enableInventoryAccounting: false,
    inventoryAssetAccountId: "",
    cogsAccountId: "",
    inventoryClearingAccountId: "",
    inventoryAdjustmentGainAccountId: "",
    inventoryAdjustmentLossAccountId: "",
    purchaseReceiptPostingMode: "DISABLED" as InventoryPurchasePostingMode,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const accountOptions = useMemo(
    () => ({
      inventoryAsset: accounts.filter((account) => account.type === "ASSET" && account.isActive && account.allowPosting),
      cogs: accounts.filter((account) => (account.type === "COST_OF_SALES" || account.type === "EXPENSE") && account.isActive && account.allowPosting),
      inventoryClearing: accounts.filter((account) => (account.type === "LIABILITY" || account.type === "ASSET") && account.isActive && account.allowPosting && account.code !== "210"),
      adjustmentGain: accounts.filter((account) => account.type === "REVENUE" && account.isActive && account.allowPosting),
      adjustmentLoss: accounts.filter((account) => (account.type === "EXPENSE" || account.type === "COST_OF_SALES") && account.isActive && account.allowPosting),
    }),
    [accounts],
  );

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<InventorySettings>("/inventory/settings"),
      apiRequest<InventoryAccountingSettings>("/inventory/accounting-settings"),
      apiRequest<PurchaseReceiptPostingReadiness>("/inventory/purchase-receipt-posting-readiness"),
      canViewAccounts ? apiRequest<Account[]>("/accounts") : Promise.resolve([]),
    ])
      .then(([inventoryResult, accountingResult, readinessResult, accountResult]) => {
        if (cancelled) {
          return;
        }
        setSettings(inventoryResult);
        setAccountingSettings(accountingResult);
        setPurchaseReceiptReadiness(readinessResult);
        setAccounts(accountResult);
        setForm({
          valuationMethod: accountingResult.valuationMethod,
          allowNegativeStock: inventoryResult.allowNegativeStock,
          trackInventoryValue: inventoryResult.trackInventoryValue,
          enableInventoryAccounting: accountingResult.enableInventoryAccounting,
          inventoryAssetAccountId: accountingResult.inventoryAssetAccountId ?? "",
          cogsAccountId: accountingResult.cogsAccountId ?? "",
          inventoryClearingAccountId: accountingResult.inventoryClearingAccountId ?? "",
          inventoryAdjustmentGainAccountId: accountingResult.inventoryAdjustmentGainAccountId ?? "",
          inventoryAdjustmentLossAccountId: accountingResult.inventoryAdjustmentLossAccountId ?? "",
          purchaseReceiptPostingMode: accountingResult.purchaseReceiptPostingMode,
        });
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
  }, [canViewAccounts, organizationId]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const inventoryResult = await apiRequest<InventorySettings>("/inventory/settings", {
        method: "PATCH",
        body: {
          valuationMethod: form.valuationMethod,
          allowNegativeStock: form.allowNegativeStock,
          trackInventoryValue: form.trackInventoryValue,
        },
      });
      const accountingResult = await apiRequest<InventoryAccountingSettings>("/inventory/accounting-settings", {
        method: "PATCH",
        body: {
          valuationMethod: form.valuationMethod,
          enableInventoryAccounting: form.enableInventoryAccounting,
          inventoryAssetAccountId: form.inventoryAssetAccountId || null,
          cogsAccountId: form.cogsAccountId || null,
          inventoryClearingAccountId: form.inventoryClearingAccountId || null,
          inventoryAdjustmentGainAccountId: form.inventoryAdjustmentGainAccountId || null,
          inventoryAdjustmentLossAccountId: form.inventoryAdjustmentLossAccountId || null,
          purchaseReceiptPostingMode: form.purchaseReceiptPostingMode,
        },
      });
      const readinessResult = await apiRequest<PurchaseReceiptPostingReadiness>("/inventory/purchase-receipt-posting-readiness");
      setSettings(inventoryResult);
      setAccountingSettings(accountingResult);
      setPurchaseReceiptReadiness(readinessResult);
      setMessage("Inventory settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save inventory settings.");
    } finally {
      setSaving(false);
    }
  }

  const operationalWarnings = settings ? settings.warnings : inventorySettingsWarnings(form);
  const accountingWarnings = accountingSettings ? accountingSettings.warnings : inventoryAccountingWarnings();
  const mappingWarnings = accountingSettings ? missingInventoryAccountMappingWarnings(accountingSettings) : [];
  const receiptReadiness = purchaseReceiptReadiness;

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Inventory settings</h1>
        <p className="mt-1 text-sm text-steel">Operational valuation policy and preview-only inventory accounting controls.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage inventory settings.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading inventory settings...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
      </div>

      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Inventory accounting is guarded. Enabling it only allows manual COGS posting and compatible manual receipt asset posting; it does not auto-post inventory journals.
      </div>

      <form onSubmit={saveSettings} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Operational inventory policy</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
              {operationalWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Inventory accounting settings</h2>
              <p className="mt-1 text-sm text-steel">Mappings for manual COGS posting and compatible receipt asset posting readiness.</p>
            </div>
            <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.enableInventoryAccounting}
                disabled={!canManage}
                onChange={(event) => setForm((current) => ({ ...current, enableInventoryAccounting: event.target.checked }))}
              />
              <span>Enable inventory accounting</span>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <AccountSelect
              label="Inventory asset account"
              value={form.inventoryAssetAccountId}
              accounts={accountOptions.inventoryAsset}
              disabled={!canManage || !canViewAccounts}
              onChange={(value) => setForm((current) => ({ ...current, inventoryAssetAccountId: value }))}
            />
            <AccountSelect
              label="COGS account"
              value={form.cogsAccountId}
              accounts={accountOptions.cogs}
              disabled={!canManage || !canViewAccounts}
              onChange={(value) => setForm((current) => ({ ...current, cogsAccountId: value }))}
            />
            <AccountSelect
              label="Inventory clearing account"
              value={form.inventoryClearingAccountId}
              accounts={accountOptions.inventoryClearing}
              disabled={!canManage || !canViewAccounts}
              onChange={(value) => setForm((current) => ({ ...current, inventoryClearingAccountId: value }))}
            />
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Purchase receipt posting mode</span>
              <select
                value={form.purchaseReceiptPostingMode}
                onChange={(event) => setForm((current) => ({ ...current, purchaseReceiptPostingMode: event.target.value as InventoryPurchasePostingMode }))}
                disabled={!canManage}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100"
              >
                {purchaseReceiptPostingModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {purchaseReceiptPostingModeLabel(mode)}
                  </option>
                ))}
              </select>
            </label>
            <AccountSelect
              label="Adjustment gain account"
              value={form.inventoryAdjustmentGainAccountId}
              accounts={accountOptions.adjustmentGain}
              disabled={!canManage || !canViewAccounts}
              onChange={(value) => setForm((current) => ({ ...current, inventoryAdjustmentGainAccountId: value }))}
            />
            <AccountSelect
              label="Adjustment loss account"
              value={form.inventoryAdjustmentLossAccountId}
              accounts={accountOptions.adjustmentLoss}
              disabled={!canManage || !canViewAccounts}
              onChange={(value) => setForm((current) => ({ ...current, inventoryAdjustmentLossAccountId: value }))}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Posting guardrails</p>
              <ul className="mt-2 space-y-1">
                {accountingWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md bg-slate-50 p-4 text-sm text-steel">
              <p className="font-medium text-ink">Mapping readiness</p>
              <ul className="mt-2 space-y-1">
                {[...(accountingSettings?.blockingReasons ?? []), ...mappingWarnings].length > 0 ? (
                  [...new Set([...(accountingSettings?.blockingReasons ?? []), ...mappingWarnings])].map((warning) => <li key={warning}>{warning}</li>)
                ) : (
                  <li>Required preview mappings are present.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink">Purchase Receipt Posting Readiness</h3>
                <p className="mt-1 text-sm text-steel">Read-only audit status for future receipt inventory asset posting.</p>
              </div>
              {receiptReadiness ? (
                <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${purchaseReceiptPostingReadinessBadgeClass(receiptReadiness)}`}>
                  {purchaseReceiptPostingReadinessLabel(receiptReadiness)}
                </span>
              ) : (
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Not checked</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md bg-white p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Inventory asset account</p>
                <p className="mt-1 font-medium text-ink">
                  {receiptReadiness?.requiredAccounts.inventoryAssetAccount
                    ? `${receiptReadiness.requiredAccounts.inventoryAssetAccount.code} ${receiptReadiness.requiredAccounts.inventoryAssetAccount.name}`
                    : "Not mapped"}
                </p>
              </div>
              <div className="rounded-md bg-white p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Inventory clearing account</p>
                <p className="mt-1 font-medium text-ink">
                  {receiptReadiness?.requiredAccounts.inventoryClearingAccount
                    ? `${receiptReadiness.requiredAccounts.inventoryClearingAccount.code} ${receiptReadiness.requiredAccounts.inventoryClearingAccount.name}`
                  : "Not mapped"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-md bg-white p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Bill mode compatibility</p>
                <p className="mt-1 font-medium text-ink">
                  {receiptReadiness?.compatibleBillPostingModeExists ? "Clearing finalization supported" : "Clearing finalization unavailable"}
                </p>
              </div>
              <div className="rounded-md bg-white p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Direct-mode bills</p>
                <p className="mt-1 font-medium text-ink">{receiptReadiness ? receiptReadiness.existingBillsInDirectModeCount : "-"}</p>
              </div>
              <div className="rounded-md bg-white p-3 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Clearing-mode bills</p>
                <p className="mt-1 font-medium text-ink">{receiptReadiness ? receiptReadiness.billsUsingInventoryClearingCount : "-"}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md bg-white p-3 text-sm text-steel">
                <p className="font-medium text-ink">Blocking reasons</p>
                <ul className="mt-2 space-y-1">
                  {receiptReadiness && receiptReadiness.blockingReasons.length > 0 ? (
                    receiptReadiness.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)
                  ) : (
                    <li>No readiness blockers.</li>
                  )}
                </ul>
              </div>
              <div className="rounded-md bg-white p-3 text-sm text-amber-900">
                <p className="font-medium text-ink">Warnings</p>
                <ul className="mt-2 space-y-1">
                  {receiptReadiness && receiptReadiness.warnings.length > 0 ? (
                    receiptReadiness.warnings.map((warning) => <li key={warning}>{warning}</li>)
                  ) : (
                    <li>Purchase receipt GL posting requires an explicit manual post action after review.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-md bg-white p-3 text-sm text-steel">
              <p className="font-medium text-ink">Recommended next step</p>
              <p className="mt-1">{receiptReadiness?.recommendedNextStep ?? "Run readiness after inventory accounting settings load."}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
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

function AccountSelect({
  label,
  value,
  accounts,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  accounts: Account[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100"
      >
        <option value="">Not mapped</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.code} {account.name}
          </option>
        ))}
      </select>
    </label>
  );
}
