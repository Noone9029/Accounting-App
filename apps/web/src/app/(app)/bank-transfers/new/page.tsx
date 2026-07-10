"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useAppLocale } from "@/components/app-locale-provider";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel, validateBankTransferInput } from "@/lib/bank-accounts";
import type { BankAccountSummary, BankTransfer } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewBankTransferPage() {
  const router = useRouter();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
  const { tc } = useAppLocale();
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
  const destinationProfile = activeProfiles.find((profile) => profile.id === toBankAccountProfileId);
  const profileOrganizationMismatch = Boolean(
    organizationId &&
      ((sourceProfile && sourceProfile.organizationId !== organizationId) ||
        (destinationProfile && destinationProfile.organizationId !== organizationId)),
  );
  const currencyMismatch = Boolean(
    baseCurrency &&
      ((sourceProfile && sourceProfile.currency !== baseCurrency) || (destinationProfile && destinationProfile.currency !== baseCurrency)),
  );

  useEffect(() => {
    setProfiles([]);
    setFromBankAccountProfileId("");
    setToBankAccountProfileId("");
    if (!organizationId) {
      setLoading(false);
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
          setError(tc(loadError instanceof Error ? loadError.message : "Unable to load bank accounts."));
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
    if (loading || !organizationId || !baseCurrency || !sourceProfile || !destinationProfile) {
      setError(tc("Wait for bank accounts from the active organization and select both accounts before posting this transfer."));
      return;
    }
    if (profileOrganizationMismatch) {
      setError(tc("The selected bank accounts do not belong to the active organization. Reload the accounts before posting."));
      return;
    }

    const validationError = validateBankTransferInput({ fromBankAccountProfileId, toBankAccountProfileId, amount });
    if (validationError) {
      setError(tc(validationError));
      return;
    }
    if (currencyMismatch) {
      setError(tc("Direct bank transfers can post only between accounts in the organization base currency {baseCurrency} during this phase.", { baseCurrency }));
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
          currency: baseCurrency,
          description: description || undefined,
        },
      });
      router.push(`/bank-transfers/${transfer.id}?created=1`);
    } catch (submitError) {
      setError(tc(submitError instanceof Error ? submitError.message : "Unable to create bank transfer."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("New bank transfer")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Post a balanced journal between two active cash or bank profiles.")}</p>
        </div>
        <Link href="/bank-transfers" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to create bank transfers.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading bank accounts...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {profileOrganizationMismatch ? <StatusMessage type="error">{tc("One or both selected bank accounts do not belong to the active organization. Reload before posting.")}</StatusMessage> : null}
        {currencyMismatch ? <StatusMessage type="error">{tc("One or both selected bank accounts do not use the organization base currency. This transfer cannot be posted in this phase.")}</StatusMessage> : null}
        {!loading && organizationId && activeProfiles.length < 2 ? <StatusMessage type="empty">{tc("At least two active bank account profiles are required.")}</StatusMessage> : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("From")}</span>
              <select value={fromBankAccountProfileId} onChange={(event) => setFromBankAccountProfileId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select source")}</option>
                {activeProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {bankAccountOptionLabel(profile.account, profiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("To")}</span>
              <select value={toBankAccountProfileId} onChange={(event) => setToBankAccountProfileId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select destination")}</option>
                {activeProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {bankAccountOptionLabel(profile.account, profiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Transfer date")}</span>
              <input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Amount")}</span>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Description")}</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-steel">
          {tc("Transfers post a balanced accounting journal immediately: the source bank or cash account decreases and the destination account increases. Use statement matching later to reconcile imported bank rows against the posted movement.")}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/bank-transfers" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Cancel")}
          </Link>
          <button type="submit" disabled={loading || submitting || !organizationId || !baseCurrency || profileOrganizationMismatch || currencyMismatch || activeProfiles.length < 2} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? tc("Posting...") : tc("Post transfer")}
          </button>
        </div>
      </form>
    </section>
  );
}
