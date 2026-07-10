"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useAppLocale } from "@/components/app-locale-provider";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel, bankAccountTypeLabel, hasPostedOpeningBalance } from "@/lib/bank-accounts";
import { SUPPORTED_CURRENCIES, isSupportedCurrencyCode } from "@/lib/currencies";
import type { Account, BankAccountSummary, BankAccountType } from "@/lib/types";

const BANK_ACCOUNT_TYPES: BankAccountType[] = ["BANK", "CASH", "WALLET", "CARD", "OTHER"];

interface BankAccountProfileFormProps {
  profile?: BankAccountSummary;
}

export function BankAccountProfileForm({ profile }: BankAccountProfileFormProps) {
  const router = useRouter();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
  const { tc } = useAppLocale();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profiles, setProfiles] = useState<BankAccountSummary[]>(profile ? [profile] : []);
  const [accountId, setAccountId] = useState(profile?.accountId ?? "");
  const [type, setType] = useState<BankAccountType>(profile?.type ?? "BANK");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bankName, setBankName] = useState(profile?.bankName ?? "");
  const [accountNumberMasked, setAccountNumberMasked] = useState(profile?.accountNumberMasked ?? "");
  const [ibanMasked, setIbanMasked] = useState(profile?.ibanMasked ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "");
  const [openingBalance, setOpeningBalance] = useState(profile?.openingBalance ?? "0.0000");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(profile?.openingBalanceDate?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const currencyOrganizationId = useRef<string | null>(profile?.organizationId ?? null);
  const openingBalanceLocked = profile ? hasPostedOpeningBalance(profile) : false;
  const currencyLocked = profile ? openingBalanceLocked || profile.transactionCount > 0 : false;
  const unsupportedProfileCurrency = Boolean(profile?.currency && !isSupportedCurrencyCode(profile.currency));
  const profileOrganizationMismatch = Boolean(profile && organizationId && profile.organizationId !== organizationId);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedAccountOrganizationMismatch = Boolean(
    !profile && selectedAccount && organizationId && selectedAccount.organizationId !== organizationId,
  );

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
    if (!profile && currencyOrganizationId.current !== organizationId) {
      currencyOrganizationId.current = organizationId;
      setCurrency(baseCurrency ?? "");
    }
  }, [baseCurrency, organizationId, profile]);

  useEffect(() => {
    setAccounts([]);
    setProfiles(profile ? [profile] : []);
    if (!profile) {
      setAccountId("");
    }
    if (!organizationId) {
      setLoading(false);
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
          setAccountId(defaultAccount?.id || "");
          setDisplayName((current) => current || defaultAccount?.name || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(tc(loadError instanceof Error ? loadError.message : "Unable to load bank account setup data."));
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
  }, [organizationId, profile]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (loading || !organizationId || profileOrganizationMismatch || selectedAccountOrganizationMismatch) {
      setError(tc("Wait for bank-account setup data from the active organization before saving this profile."));
      return;
    }
    if (!profile && !accountId) {
      setError(tc("Select a chart of accounts asset account to link."));
      return;
    }
    if (!displayName.trim()) {
      setError(tc("Display name is required."));
      return;
    }
    if (!currency) {
      setError(tc("Please select a currency."));
      return;
    }
    if (!isSupportedCurrencyCode(currency)) {
      setError(tc("Currency must be one of the supported system currencies."));
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
      setError(tc(submitError instanceof Error ? submitError.message : "Unable to save bank account profile."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Linked chart account")}</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              required
              disabled={Boolean(profile)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100"
            >
              <option value="">{tc("Select asset posting account")}</option>
              {linkableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {bankAccountOptionLabel(account, profiles)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Type")}</span>
            <select value={type} onChange={(event) => setType(event.target.value as BankAccountType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {BANK_ACCOUNT_TYPES.map((accountType) => (
                <option key={accountType} value={accountType}>
                  {tc(bankAccountTypeLabel(accountType))}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Currency")}</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              aria-required="true"
              disabled={currencyLocked}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100"
            >
              <option value="">{tc("Select currency")}</option>
              {unsupportedProfileCurrency ? (
                <option value={profile?.currency}>{profile?.currency} - {tc("Unsupported currency requires correction")}</option>
              ) : null}
              {SUPPORTED_CURRENCIES.map((currencyOption) => (
                <option key={currencyOption.code} value={currencyOption.code}>
                  {currencyOption.code} - {currencyOption.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Display name")}</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Bank name")}</span>
            <input value={bankName} onChange={(event) => setBankName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Masked account number")}</span>
            <input value={accountNumberMasked} onChange={(event) => setAccountNumberMasked(event.target.value)} placeholder="****1234" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Masked IBAN")}</span>
            <input value={ibanMasked} onChange={(event) => setIbanMasked(event.target.value)} placeholder="SA****1234" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Opening balance")}</span>
            <input inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} disabled={openingBalanceLocked} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Opening balance date")}</span>
            <input type="date" value={openingBalanceDate} onChange={(event) => setOpeningBalanceDate(event.target.value)} disabled={openingBalanceLocked} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-100" />
          </label>
          <label className="block md:col-span-4">
            <span className="text-sm font-medium text-slate-700">{tc("Notes")}</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        <p className="mt-3 text-xs text-steel">
          {tc("Opening balance stays as setup metadata until it is posted from the bank account detail page. Once posted, the amount and date are locked.")}
        </p>
        {openingBalanceLocked ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {tc("Opening balance has already been posted and cannot be changed without a future reversal workflow.")}
          </p>
        ) : null}
        {currencyLocked ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {tc("Currency is locked after opening balance or transactions have been posted.")}
          </p>
        ) : null}
        {unsupportedProfileCurrency ? (
          <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rosewood">
            {tc("This bank account has an unsupported currency value. Select a supported currency before saving.")}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to manage bank accounts.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading bank account setup data...")}</StatusMessage> : null}
        {!profile && !loading && organizationId && linkableAccounts.length === 0 ? <StatusMessage type="empty">{tc("No active posting asset accounts are available to link.")}</StatusMessage> : null}
        {profileOrganizationMismatch || selectedAccountOrganizationMismatch ? <StatusMessage type="error">{tc("This bank-account setup data does not belong to the active organization. Reload before saving.")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="flex justify-end gap-3">
        <Link href={profile ? `/bank-accounts/${profile.id}` : "/bank-accounts"} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Cancel")}
        </Link>
        <button type="submit" disabled={loading || submitting || !organizationId || profileOrganizationMismatch || selectedAccountOrganizationMismatch || (!profile && !linkableAccounts.length)} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? tc("Saving...") : tc("Save profile")}
        </button>
      </div>
    </form>
  );
}
