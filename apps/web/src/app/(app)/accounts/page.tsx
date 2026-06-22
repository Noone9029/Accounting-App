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
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account, AccountCodeSuggestion, AccountType } from "@/lib/types";

const accountTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "COST_OF_SALES"];

export default function AccountsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newAccountType, setNewAccountType] = useState<AccountType>("ASSET");
  const [accountCode, setAccountCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [codeSuggestion, setCodeSuggestion] = useState<AccountCodeSuggestion | null>(null);
  const canManageAccounts = can(PERMISSIONS.accounts.manage);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<Account[]>("/accounts")
      .then((result) => {
        if (!cancelled) {
          setAccounts(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load accounts.");
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

  useEffect(() => {
    if (!organizationId || !canManageAccounts) {
      return;
    }

    let cancelled = false;
    apiRequest<AccountCodeSuggestion>(`/accounts/next-code?type=${encodeURIComponent(newAccountType)}`)
      .then((suggestion) => {
        if (cancelled) {
          return;
        }
        setCodeSuggestion(suggestion);
        if (!codeTouched) {
          setAccountCode(suggestion.code);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setCodeSuggestion(null);
          setError(loadError instanceof Error ? loadError.message : "Unable to load the next account code.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accounts.length, canManageAccounts, codeTouched, newAccountType, organizationId]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<Account>("/accounts", {
        method: "POST",
        body: {
          code: accountCode,
          name: String(formData.get("name")),
          type: newAccountType,
          parentId: String(formData.get("parentId") || "") || undefined,
          allowPosting: formData.get("allowPosting") === "on",
        },
      });
      setAccounts((current) => [...current, created].sort((a, b) => a.code.localeCompare(b.code)));
      setSuccess(`Created account ${created.code} ${created.name}.`);
      form.reset();
      setCodeTouched(false);
      setAccountCode("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create account.");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Accounting" title="Chart of accounts" description="Live tenant-scoped accounts from the API." />

      <LedgerPageBody>
        {canManageAccounts ? (
          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Create account</h2>
            <form onSubmit={createAccount} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[0.7fr_1fr_0.8fr_1fr_auto]">
              <Field label="Code">
                <LedgerInput
                  name="code"
                  value={accountCode}
                  onChange={(event) => {
                    setCodeTouched(true);
                    setAccountCode(event.target.value);
                  }}
                  placeholder={codeSuggestion?.code ?? "Auto"}
                />
              </Field>
              <Field label="Name">
                <LedgerInput name="name" required placeholder="Name" />
              </Field>
              <Field label="Type">
                <LedgerSelect
                  name="type"
                  value={newAccountType}
                  onChange={(event) => {
                    setNewAccountType(event.target.value as AccountType);
                    setCodeTouched(false);
                  }}
                  required
                >
                  {accountTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </LedgerSelect>
              </Field>
              <Field label="Parent">
                <LedgerSelect name="parentId">
                  <option value="">No parent</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} {account.name}
                    </option>
                  ))}
                </LedgerSelect>
              </Field>
              <label className="flex min-h-[68px] items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">
                <input name="allowPosting" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-palm focus:ring-palm/20" />
                Posting
              </label>
              <div className="md:col-span-2 xl:col-span-5">
                <p className="mb-3 text-xs leading-5 text-steel">
                  {codeSuggestion?.helperText ?? "LedgerByte can suggest a code from the selected account type range. Manual changes are audit logged."}
                </p>
                <LedgerButton type="submit" variant="primary" disabled={!organizationId}>
                  Add account
                </LedgerButton>
              </div>
            </form>
          </LedgerPanel>
        ) : null}

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load accounts.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading accounts" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && accounts.length === 0 ? <LedgerEmptyState title="No accounts found." /> : null}

        {accounts.length > 0 ? (
          <LedgerDataTable minWidth="860px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3 font-mono text-xs">{account.code}</td>
                  <td className="px-4 py-3 font-medium text-ink">{account.name}</td>
                  <td className="px-4 py-3 text-steel">{account.type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-steel">{account.parent ? `${account.parent.code} ${account.parent.name}` : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <LedgerStatusBadge tone={account.isActive ? "success" : "neutral"}>{account.isActive ? "Active" : "Inactive"}</LedgerStatusBadge>
                      <LedgerStatusBadge tone={account.allowPosting ? "info" : "draft"}>{account.allowPosting ? "Posting" : "Control"}</LedgerStatusBadge>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      {children}
    </LedgerFieldLabel>
  );
}
