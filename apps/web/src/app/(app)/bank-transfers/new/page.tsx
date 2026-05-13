"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel, validateBankTransferInput } from "@/lib/bank-accounts";
import type { BankAccountSummary, BankTransfer } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewBankTransferPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [profiles, setProfiles] = useState<BankAccountSummary[]>([]);
  const [fromBankAccountProfileId, setFromBankAccountProfileId] = useState("");
  const [toBankAccountProfileId, setToBankAccountProfileId] = useState("");
  const [transferDate, setTransferDate] = useState(todayInputValue());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeProfiles = useMemo(() => profiles.filter((profile) => profile.status === "ACTIVE"), [profiles]);
  const sourceProfile = activeProfiles.find((profile) => profile.id === fromBankAccountProfileId);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankAccountSummary[]>("/bank-accounts")
      .then((result) => {
        if (cancelled) {
          return;
        }
        const active = result.filter((profile) => profile.status === "ACTIVE");
        setProfiles(result);
        setFromBankAccountProfileId((current) => current || active[0]?.id || "");
        setToBankAccountProfileId((current) => current || active.find((profile) => profile.id !== active[0]?.id)?.id || "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank accounts.");
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateBankTransferInput({ fromBankAccountProfileId, toBankAccountProfileId, amount });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const transfer = await apiRequest<BankTransfer>("/bank-transfers", {
        method: "POST",
        body: {
          fromBankAccountProfileId,
          toBankAccountProfileId,
          transferDate: `${transferDate}T00:00:00.000Z`,
          amount,
          currency: sourceProfile?.currency,
          description: description || undefined,
        },
      });
      router.push(`/bank-transfers/${transfer.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create bank transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New bank transfer</h1>
          <p className="mt-1 text-sm text-steel">Post a balanced journal between two active cash or bank profiles.</p>
        </div>
        <Link href="/bank-transfers" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create bank transfers.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank accounts...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && activeProfiles.length < 2 ? <StatusMessage type="empty">At least two active bank account profiles are required.</StatusMessage> : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">From</span>
              <select value={fromBankAccountProfileId} onChange={(event) => setFromBankAccountProfileId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select source</option>
                {activeProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {bankAccountOptionLabel(profile.account, profiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">To</span>
              <select value={toBankAccountProfileId} onChange={(event) => setToBankAccountProfileId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select destination</option>
                {activeProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {bankAccountOptionLabel(profile.account, profiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Transfer date</span>
              <input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Amount</span>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/bank-transfers" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || !organizationId || activeProfiles.length < 2} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Posting..." : "Post transfer"}
          </button>
        </div>
      </form>
    </section>
  );
}
