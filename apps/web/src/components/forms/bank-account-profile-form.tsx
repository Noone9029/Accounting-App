"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel, bankAccountTypeLabel } from "@/lib/bank-accounts";
import type { Account, BankAccountSummary, BankAccountType } from "@/lib/types";

const BANK_ACCOUNT_TYPES: BankAccountType[] = ["BANK", "CASH", "WALLET", "CARD", "OTHER"];

interface BankAccountProfileFormProps {
  profile?: BankAccountSummary;
}

export function BankAccountProfileForm({ profile }: BankAccountProfileFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profiles, setProfiles] = useState<BankAccountSummary[]>(profile ? [profile] : []);
  const [accountId, setAccountId] = useState(profile?.accountId ?? "");
  const [type, setType] = useState<BankAccountType>(profile?.type ?? "BANK");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bankName, setBankName] = useState(profile?.bankName ?? "");
  const [accountNumberMasked, setAccountNumberMasked] = useState(profile?.accountNumberMasked ?? "");
  const [ibanMasked, setIbanMasked] = useState(profile?.ibanMasked ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "SAR");
  const [openingBalance, setOpeningBalance] = useState(profile?.openingBalance ?? "0.0000");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(profile?.openingBalanceDate?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const usedAccountIds = new Set(profiles.filter((candidate) => candidate.id !== profile?.id).map((candidate) => candidate.accountId));
  const linkableAccounts = useMemo(
    () =>
      accounts.filter((account) => {
        if (profile && account.id === profile.accountId) {
          return true;
        }
        return account.type === "ASSET" && account.allowPosting && account.isActive && !usedAccountIds.has(account.id);
      }),
    [accounts, profile, usedAccountIds],
  );

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<Account[]>("/accounts"), apiRequest<BankAccountSummary[]>("/bank-accounts")])
      .then(([accountResult, profileResult]) => {
        if (cancelled) {
          return;
        }
        setAccounts(accountResult);
        setProfiles(profileResult);
        if (!profile) {
          const defaultAccount = accountResult.find(
            (account) =>
              account.type === "ASSET" &&
              account.allowPosting &&
              account.isActive &&
              !profileResult.some((candidate) => candidate.accountId === account.id),
          );
          setAccountId((current) => current || defaultAccount?.id || "");
          if (defaultAccount && !displayName) {
            setDisplayName(defaultAccount.name);
          }
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank account setup data.");
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
  }, [displayName, organizationId, profile]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!profile && !accountId) {
      setError("Select a chart of accounts asset account to link.");
      return;
    }
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        accountId,
        type,
        displayName,
        bankName: bankName || null,
        accountNumberMasked: accountNumberMasked || null,
        ibanMasked: ibanMasked || null,
        currency,
        openingBalance,
        openingBalanceDate: openingBalanceDate ? `${openingBalanceDate}T00:00:00.000Z` : null,
        notes: notes || null,
      };
      const saved = profile
        ? await apiRequest<BankAccountSummary>(`/bank-accounts/${profile.id}`, { method: "PATCH", body })
        : await apiRequest<BankAccountSummary>("/bank-accounts", { method: "POST", body });
      router.push(`/bank-accounts/${saved.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save bank account profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Linked chart account</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              required
              disabled={Boolean(profile)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100"
            >
              <option value="">Select asset posting account</option>
              {linkableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {bankAccountOptionLabel(account, profiles)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Type</span>
            <select value={type} onChange={(event) => setType(event.target.value as BankAccountType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {BANK_ACCOUNT_TYPES.map((accountType) => (
                <option key={accountType} value={accountType}>
                  {bankAccountTypeLabel(accountType)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Currency</span>
            <input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Display name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Bank name</span>
            <input value={bankName} onChange={(event) => setBankName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Masked account number</span>
            <input value={accountNumberMasked} onChange={(event) => setAccountNumberMasked(event.target.value)} placeholder="****1234" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Masked IBAN</span>
            <input value={ibanMasked} onChange={(event) => setIbanMasked(event.target.value)} placeholder="SA****1234" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Opening balance</span>
            <input inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Opening balance date</span>
            <input type="date" value={openingBalanceDate} onChange={(event) => setOpeningBalanceDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-4">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        <p className="mt-3 text-xs text-steel">Opening balance is metadata only in this MVP. The ledger balance is calculated from posted journal lines on the linked account.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage bank accounts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank account setup data...</StatusMessage> : null}
        {!profile && !loading && organizationId && linkableAccounts.length === 0 ? <StatusMessage type="empty">No active posting asset accounts are available to link.</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="flex justify-end gap-3">
        <Link href={profile ? `/bank-accounts/${profile.id}` : "/bank-accounts"} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
        <button type="submit" disabled={submitting || !organizationId || (!profile && !linkableAccounts.length)} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
