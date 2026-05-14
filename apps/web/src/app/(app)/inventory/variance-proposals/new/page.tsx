"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryVarianceReasonLabel } from "@/lib/inventory";
import type { Account, InventoryVarianceProposal, InventoryVarianceReason } from "@/lib/types";

const reasons: InventoryVarianceReason[] = [
  "PRICE_DIFFERENCE",
  "QUANTITY_DIFFERENCE",
  "RECEIPT_WITHOUT_CLEARING_BILL",
  "CLEARING_BILL_WITHOUT_RECEIPT",
  "REVERSED_RECEIPT_POSTING",
  "MANUAL_ADJUSTMENT",
];

export default function NewInventoryVarianceProposalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const purchaseBillId = searchParams.get("purchaseBillId") ?? "";
  const purchaseReceiptId = searchParams.get("purchaseReceiptId") ?? "";
  const initialReason = (searchParams.get("reason") as InventoryVarianceReason | null) ?? "PRICE_DIFFERENCE";
  const hasClearingSource = Boolean(purchaseBillId || purchaseReceiptId);
  const postingAccounts = useMemo(() => accounts.filter((account) => account.isActive && account.allowPosting), [accounts]);

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

  async function createProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const body = hasClearingSource
        ? {
            purchaseBillId: purchaseBillId || undefined,
            purchaseReceiptId: purchaseReceiptId || undefined,
            reason: String(formData.get("reason")) as InventoryVarianceReason,
            description: String(formData.get("description") || "") || undefined,
          }
        : {
            reason: String(formData.get("reason")) as InventoryVarianceReason,
            proposalDate: String(formData.get("proposalDate")),
            amount: String(formData.get("amount")),
            debitAccountId: String(formData.get("debitAccountId")),
            creditAccountId: String(formData.get("creditAccountId")),
            description: String(formData.get("description") || "") || undefined,
          };
      const created = await apiRequest<InventoryVarianceProposal>(
        hasClearingSource ? "/inventory/variance-proposals/from-clearing-variance" : "/inventory/variance-proposals",
        { method: "POST", body },
      );
      router.push(`/inventory/variance-proposals/${created.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create inventory variance proposal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New inventory variance proposal</h1>
          <p className="mt-1 text-sm text-steel">Draft a proposal for accountant review. No journal is created from this form.</p>
        </div>
        <Link href="/inventory/variance-proposals" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create proposals.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading accounts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={createProposal} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        {hasClearingSource ? (
          <div className="mb-5 rounded-md bg-slate-50 p-4 text-sm text-steel">
            <p className="font-medium text-ink">Clearing variance source</p>
            <p className="mt-1">The API recomputes the variance amount and accounts from the current clearing report and inventory settings.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Summary label="Purchase bill ID" value={purchaseBillId || "-"} />
              <Summary label="Purchase receipt ID" value={purchaseReceiptId || "-"} />
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
            Manual proposals require explicit debit and credit accounts. Use this only after accountant review.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Reason">
            <select name="reason" required defaultValue={initialReason} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {reasons.map((reason) => (
                <option key={reason} value={reason}>
                  {inventoryVarianceReasonLabel(reason)}
                </option>
              ))}
            </select>
          </Field>

          {!hasClearingSource ? (
            <>
              <Field label="Proposal date">
                <input name="proposalDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              </Field>
              <Field label="Amount">
                <input name="amount" required inputMode="decimal" placeholder="0.0000" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
              </Field>
              <Field label="Debit account">
                <AccountSelect name="debitAccountId" accounts={postingAccounts} />
              </Field>
              <Field label="Credit account">
                <AccountSelect name="creditAccountId" accounts={postingAccounts} />
              </Field>
            </>
          ) : null}

          <Field label="Description">
            <textarea name="description" rows={3} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={!organizationId || saving} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {saving ? "Creating..." : "Create draft proposal"}
          </button>
          <Link href="/inventory/variance-proposals" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

function AccountSelect({ name, accounts }: { name: string; accounts: Account[] }) {
  return (
    <select name={name} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
      <option value="">Select account</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.code} {account.name}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-all font-mono text-xs text-ink">{value}</div>
    </div>
  );
}
