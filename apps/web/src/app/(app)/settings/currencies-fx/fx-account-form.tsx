"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerSelect,
} from "@/components/ui/ledger-system";
import type { Account } from "@/lib/types";
import type { FxAccountConfiguration, FxAccountConfigurationInput } from "@/lib/foreign-exchange";

const fields: Array<{
  key: keyof FxAccountConfigurationInput;
  label: string;
  type: Account["type"];
  help: string;
}> = [
  { key: "realizedGainAccountId", label: "Realized gain account", type: "REVENUE", help: "Revenue account for settlement gains." },
  { key: "realizedLossAccountId", label: "Realized loss account", type: "EXPENSE", help: "Expense account for settlement losses." },
  { key: "unrealizedGainAccountId", label: "Unrealized gain account", type: "REVENUE", help: "Revenue account reserved for controlled revaluation gains." },
  { key: "unrealizedLossAccountId", label: "Unrealized loss account", type: "EXPENSE", help: "Expense account reserved for controlled revaluation losses." },
];

const emptyConfiguration: FxAccountConfigurationInput = {
  realizedGainAccountId: null,
  realizedLossAccountId: null,
  unrealizedGainAccountId: null,
  unrealizedLossAccountId: null,
};

export function FxAccountForm({
  configuration,
  accounts,
  canManage,
  disabledReason,
  saving,
  onSave,
}: Readonly<{
  configuration: FxAccountConfiguration | null;
  accounts: Account[];
  canManage: boolean;
  disabledReason: string;
  saving: boolean;
  onSave: (input: FxAccountConfigurationInput) => Promise<void>;
}>) {
  const [form, setForm] = useState<FxAccountConfigurationInput>(emptyConfiguration);

  useEffect(() => {
    setForm({
      realizedGainAccountId: configuration?.realizedGainAccountId ?? null,
      realizedLossAccountId: configuration?.realizedLossAccountId ?? null,
      unrealizedGainAccountId: configuration?.unrealizedGainAccountId ?? null,
      unrealizedLossAccountId: configuration?.unrealizedLossAccountId ?? null,
    });
  }, [configuration]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canManage) void onSave(form);
  }

  return (
    <form onSubmit={submit}>
      <LedgerFormSection
        title="FX posting accounts"
        description="Select active posting revenue accounts for gains and active posting expense accounts for losses. Saving configuration does not enable posting."
      >
        {fields.map((field) => (
          <LedgerFieldLabel key={field.key}>
            <LedgerFieldText>{field.label}</LedgerFieldText>
            <LedgerSelect
              aria-label={field.label}
              value={form[field.key] ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value || null }))}
              disabled={!canManage || saving}
            >
              <option value="">Not configured</option>
              {accounts
                .filter((account) => account.type === field.type && account.isActive && account.allowPosting)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
            </LedgerSelect>
            <LedgerFieldHelp>{field.help}</LedgerFieldHelp>
          </LedgerFieldLabel>
        ))}
        {canManage ? (
          <div className="md:col-span-2">
            <LedgerButton type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving..." : "Save FX accounts"}
            </LedgerButton>
          </div>
        ) : (
          <p className="text-sm leading-6 text-steel md:col-span-2">{disabledReason}</p>
        )}
      </LedgerFormSection>
    </form>
  );
}
