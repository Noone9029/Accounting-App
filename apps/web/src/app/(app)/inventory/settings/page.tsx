"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Inventory settings"
        description="Operational valuation policy and preview-only inventory accounting controls."
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to manage inventory settings.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading inventory settings" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {message ? <LedgerAlert tone="success">{message}</LedgerAlert> : null}

        <LedgerAlert tone="warning">
          Inventory accounting is guarded. Enabling it only allows manual COGS posting and compatible manual receipt asset posting; it does not auto-post
          inventory journals.
        </LedgerAlert>

        <form onSubmit={saveSettings} className="space-y-5">
          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Operational inventory policy</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <LedgerFieldLabel>
                <LedgerFieldText>Valuation method</LedgerFieldText>
                <LedgerSelect
                value={form.valuationMethod}
                onChange={(event) => setForm((current) => ({ ...current, valuationMethod: event.target.value as InventoryValuationMethod }))}
                disabled={!canManage}
              >
                {valuationMethods.map((method) => (
                  <option key={method} value={method}>
                    {inventoryValuationMethodLabel(method)}
                  </option>
                ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              <CheckControl
                label="Allow negative stock"
                checked={form.allowNegativeStock}
                disabled={!canManage}
                onChange={(checked) => setForm((current) => ({ ...current, allowNegativeStock: checked }))}
              />
              <CheckControl
                label="Track inventory value estimates"
                checked={form.trackInventoryValue}
                disabled={!canManage}
                onChange={(checked) => setForm((current) => ({ ...current, trackInventoryValue: checked }))}
              />
            </div>

            <div className="mt-5">
              <LedgerSummaryBand tone="neutral">
                <p className="font-medium text-ink">{inventorySettingsLabel(form)}</p>
                <ul className="mt-2 space-y-1">
                  {operationalWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </LedgerSummaryBand>
            </div>
          </LedgerPanel>

          <LedgerPanel>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Inventory accounting settings</h2>
                <p className="mt-1 text-sm text-steel">Mappings for manual COGS posting and compatible receipt asset posting readiness.</p>
              </div>
              <CheckControl
                label="Enable inventory accounting"
                checked={form.enableInventoryAccounting}
                disabled={!canManage}
                onChange={(checked) => setForm((current) => ({ ...current, enableInventoryAccounting: checked }))}
              />
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
              <LedgerFieldLabel>
                <LedgerFieldText>Purchase receipt posting mode</LedgerFieldText>
                <LedgerSelect
                  value={form.purchaseReceiptPostingMode}
                  onChange={(event) => setForm((current) => ({ ...current, purchaseReceiptPostingMode: event.target.value as InventoryPurchasePostingMode }))}
                  disabled={!canManage}
                >
                  {purchaseReceiptPostingModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {purchaseReceiptPostingModeLabel(mode)}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
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
              <LedgerSummaryBand tone="warning">
                <p className="font-medium">Posting guardrails</p>
                <ul className="mt-2 space-y-1">
                  {accountingWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </LedgerSummaryBand>
              <LedgerSummaryBand tone="neutral">
                <p className="font-medium text-ink">Mapping readiness</p>
                <ul className="mt-2 space-y-1">
                  {[...(accountingSettings?.blockingReasons ?? []), ...mappingWarnings].length > 0 ? (
                    [...new Set([...(accountingSettings?.blockingReasons ?? []), ...mappingWarnings])].map((warning) => <li key={warning}>{warning}</li>)
                  ) : (
                    <li>Required preview mappings are present.</li>
                  )}
                </ul>
              </LedgerSummaryBand>
            </div>

            <div className="mt-5 rounded-md bg-mist p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Purchase Receipt Posting Readiness</h3>
                  <p className="mt-1 text-sm text-steel">Read-only audit status for future receipt inventory asset posting.</p>
                </div>
                {receiptReadiness ? (
                  <span className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${purchaseReceiptPostingReadinessBadgeClass(receiptReadiness)}`}>
                    {purchaseReceiptPostingReadinessLabel(receiptReadiness)}
                  </span>
                ) : (
                  <span className="inline-flex w-fit rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Not checked</span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ReadinessTile
                  label="Inventory asset account"
                  value={
                    receiptReadiness?.requiredAccounts.inventoryAssetAccount
                      ? `${receiptReadiness.requiredAccounts.inventoryAssetAccount.code} ${receiptReadiness.requiredAccounts.inventoryAssetAccount.name}`
                      : "Not mapped"
                  }
                />
                <ReadinessTile
                  label="Inventory clearing account"
                  value={
                    receiptReadiness?.requiredAccounts.inventoryClearingAccount
                      ? `${receiptReadiness.requiredAccounts.inventoryClearingAccount.code} ${receiptReadiness.requiredAccounts.inventoryClearingAccount.name}`
                      : "Not mapped"
                  }
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <ReadinessTile
                  label="Bill mode compatibility"
                  value={receiptReadiness?.compatibleBillPostingModeExists ? "Clearing finalization supported" : "Clearing finalization unavailable"}
                />
                <ReadinessTile label="Direct-mode bills" value={receiptReadiness ? receiptReadiness.existingBillsInDirectModeCount : "-"} />
                <ReadinessTile label="Clearing-mode bills" value={receiptReadiness ? receiptReadiness.billsUsingInventoryClearingCount : "-"} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <ListTile
                  title="Blocking reasons"
                  items={
                    receiptReadiness && receiptReadiness.blockingReasons.length > 0 ? receiptReadiness.blockingReasons : ["No readiness blockers."]
                  }
                />
                <ListTile
                  title="Warnings"
                  tone="warning"
                  items={
                    receiptReadiness && receiptReadiness.warnings.length > 0
                      ? receiptReadiness.warnings
                      : ["Purchase receipt GL posting requires an explicit manual post action after review."]
                  }
                />
              </div>

              <div className="mt-4 rounded-md bg-white p-3 text-sm text-steel">
                <p className="font-medium text-ink">Recommended next step</p>
                <p className="mt-1">{receiptReadiness?.recommendedNextStep ?? "Run readiness after inventory accounting settings load."}</p>
              </div>
            </div>
          </LedgerPanel>

          <div className="flex justify-end">
            <LedgerButton type="submit" variant="primary" disabled={!canManage || saving}>
              {saving ? "Saving..." : "Save settings"}
            </LedgerButton>
          </div>
        </form>
      </LedgerPageBody>
    </LedgerPage>
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
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Not mapped</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.code} {account.name}
          </option>
        ))}
      </LedgerSelect>
    </LedgerFieldLabel>
  );
}

function CheckControl({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[68px] items-center gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-palm focus:ring-palm/20 disabled:cursor-not-allowed"
      />
      <span>{label}</span>
    </label>
  );
}

function ReadinessTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function ListTile({ title, items, tone = "neutral" }: { title: string; items: string[]; tone?: "neutral" | "warning" }) {
  return (
    <div className={`rounded-md bg-white p-3 text-sm ${tone === "warning" ? "text-amber-900" : "text-steel"}`}>
      <p className="font-medium text-ink">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
