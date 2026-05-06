"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { Account, AccountType } from "@/lib/types";

const accountTypes: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "COST_OF_SALES"];

export default function AccountsPage() {
  const organizationId = useActiveOrganizationId();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          code: String(formData.get("code")),
          name: String(formData.get("name")),
          type: String(formData.get("type")) as AccountType,
          parentId: String(formData.get("parentId") || "") || undefined,
          allowPosting: formData.get("allowPosting") === "on",
        },
      });
      setAccounts((current) => [...current, created].sort((a, b) => a.code.localeCompare(b.code)));
      setSuccess(`Created account ${created.code} ${created.name}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create account.");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Chart of accounts</h1>
        <p className="mt-1 text-sm text-steel">Live tenant-scoped accounts from the API.</p>
      </div>

      <div className="mb-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Create account</h2>
        <form onSubmit={createAccount} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[0.6fr_1fr_0.8fr_1fr_auto]">
          <input name="code" required placeholder="Code" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <input name="name" required placeholder="Name" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          <select name="type" required className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {accountTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select name="parentId" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="">No parent</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="allowPosting" type="checkbox" defaultChecked />
            Posting
          </label>
          <div className="md:col-span-5">
            <button type="submit" disabled={!organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              Add account
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load accounts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading accounts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && accounts.length === 0 ? <StatusMessage type="empty">No accounts found.</StatusMessage> : null}
      </div>

      {accounts.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
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
                  <td className="px-4 py-3 text-steel">{account.isActive ? "Active" : "Inactive"} · {account.allowPosting ? "Posting" : "Control"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
