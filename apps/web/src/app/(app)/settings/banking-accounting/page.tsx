"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { getBankingClearingConfig, saveBankingClearingConfig, validateBankingClearingConfig } from "@/lib/banking-accounting";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account, BankingClearingAccountConfigInput, BankingClearingAccountConfigValidation } from "@/lib/types";

const accountFields: Array<{
  key: keyof BankingClearingAccountConfigInput;
  label: string;
  purpose: string;
  allowedTypes: Account["type"][];
}> = [
  {
    key: "undepositedFundsAccountId",
    label: "Undeposited funds",
    purpose: "Credits cash, receipt, and other deposit lines before they move into the selected bank account.",
    allowedTypes: ["ASSET"],
  },
  {
    key: "chequeInHandAccountId",
    label: "Cheque-in-hand",
    purpose: "Reserved for received-cheque recognition after a future accountant-reviewed source policy exists.",
    allowedTypes: ["ASSET"],
  },
  {
    key: "outstandingChequesAccountId",
    label: "Outstanding cheques",
    purpose: "Reserved for issued-cheque recognition after a future accountant-reviewed source policy exists.",
    allowedTypes: ["LIABILITY"],
  },
  {
    key: "cardClearingAccountId",
    label: "Card clearing",
    purpose: "Reserved for card credit/refund offset policies that are not posted automatically.",
    allowedTypes: ["ASSET", "LIABILITY"],
  },
  {
    key: "creditCardLiabilityAccountId",
    label: "Credit-card liability",
    purpose: "Debited when an explicit credit-card paydown journal is posted.",
    allowedTypes: ["LIABILITY"],
  },
  {
    key: "prepaidCardAssetAccountId",
    label: "Prepaid-card asset",
    purpose: "Debited when an explicit prepaid-card top-up journal is posted.",
    allowedTypes: ["ASSET"],
  },
];

export default function BankingAccountingSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.accounts.manage);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<BankingClearingAccountConfigInput>({ enabled: false });
  const [validation, setValidation] = useState<BankingClearingAccountConfigValidation | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
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
    Promise.all([getBankingClearingConfig(), apiRequest<Account[]>("/accounts")])
      .then(([configResult, accountResult]) => {
        if (cancelled) {
          return;
        }
        setAccounts(accountResult);
        setWarnings(configResult.warnings);
        setValidation(configResult.validation);
        setForm({
          enabled: configResult.config?.enabled ?? false,
          undepositedFundsAccountId: configResult.config?.undepositedFundsAccountId ?? null,
          chequeInHandAccountId: configResult.config?.chequeInHandAccountId ?? null,
          outstandingChequesAccountId: configResult.config?.outstandingChequesAccountId ?? null,
          cardClearingAccountId: configResult.config?.cardClearingAccountId ?? null,
          creditCardLiabilityAccountId: configResult.config?.creditCardLiabilityAccountId ?? null,
          prepaidCardAssetAccountId: configResult.config?.prepaidCardAssetAccountId ?? null,
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load banking accounting settings.");
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

  const postingAccounts = useMemo(() => accounts.filter((account) => account.isActive && account.allowPosting), [accounts]);

  function updateField(key: keyof BankingClearingAccountConfigInput, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: typeof value === "string" ? value || null : value }));
    setMessage("");
  }

  async function validateCurrent() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await validateBankingClearingConfig(form);
      setValidation(result);
      setMessage(result.valid ? "Banking clearing-account configuration validates." : "Configuration saved paths need attention before posting.");
    } catch (validateError) {
      setError(validateError instanceof Error ? validateError.message : "Unable to validate banking accounting settings.");
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await saveBankingClearingConfig(form);
      setValidation(result.validation);
      setWarnings(result.warnings ?? warnings);
      setMessage("Banking accounting settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save banking accounting settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Banking accounting settings"
        description="Configure existing chart accounts for manual banking clearing journals."
      />

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to configure banking accounting.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading banking accounting settings...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}

      <LedgerSummaryBand tone="info">
        <h2 className="font-semibold text-ink">Manual banking only</h2>
        <p className="mt-1">
          This configuration does not connect a live bank feed, call a bank API, collect or store bank credentials, send bank payments, or add provider callbacks.
        </p>
        <p className="mt-1">Existing operational deposit, card, and cheque records are not silently converted. Journal posting remains explicit on each supported record.</p>
      </LedgerSummaryBand>

      <LedgerPageBody>
        <form onSubmit={save} className="space-y-4">
          <LedgerPanel>
            <label className="flex items-center gap-3 text-sm font-medium text-ink">
              <input type="checkbox" checked={Boolean(form.enabled)} onChange={(event) => updateField("enabled", event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Enable configured clearing-account journal posting
            </label>
            <p className="mt-2 text-sm leading-6 text-steel">
              Enabling this only unlocks configured manual posting paths. It does not create automatic bank movements or convert existing records.
            </p>
          </LedgerPanel>

          <div className="grid gap-4 lg:grid-cols-2">
            {accountFields.map((field) => (
              <LedgerPanel key={field.key}>
                <LedgerFieldLabel>
                  <LedgerFieldText>{field.label}</LedgerFieldText>
                  <LedgerFieldHelp>{field.purpose}</LedgerFieldHelp>
                  <LedgerSelect value={String(form[field.key] ?? "")} onChange={(event) => updateField(field.key, event.target.value)} disabled={!canManage} className="mt-3">
                    <option value="">Not configured</option>
                    {postingAccounts
                      .filter((account) => field.allowedTypes.includes(account.type))
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} - {account.name} ({account.type})
                        </option>
                      ))}
                  </LedgerSelect>
                </LedgerFieldLabel>
              </LedgerPanel>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <LedgerButton type="button" disabled={saving} onClick={() => void validateCurrent()}>
              Validate config
            </LedgerButton>
            {canManage ? (
              <LedgerButton type="submit" disabled={saving} variant="primary">
                {saving ? "Saving..." : "Save settings"}
              </LedgerButton>
            ) : null}
          </div>
        </form>

        <LedgerPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">Validation</h2>
            {validation ? (
              <LedgerStatusBadge tone={validation.valid ? "success" : "warning"}>
                {validation.valid ? "Valid" : "Needs attention"}
              </LedgerStatusBadge>
            ) : null}
          </div>
          {validation ? (
            <div className="mt-3 space-y-3">
              <p className={validation.valid ? "text-sm font-medium text-palm" : "text-sm font-medium text-amber-800"}>
                {validation.valid ? "Configured accounts validate." : "Posting remains blocked for missing or invalid paths."}
              </p>
              {validation.reasons.length ? (
                <ul className="space-y-1 text-sm text-amber-800">
                  {validation.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-steel">Validation has not run yet.</p>
          )}
          {warnings.length ? (
            <ul className="mt-4 space-y-1 text-sm text-steel">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </LedgerPanel>
      </LedgerPageBody>
    </LedgerPage>
  );
}
