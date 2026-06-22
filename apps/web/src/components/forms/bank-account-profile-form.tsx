"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFormSection,
  LedgerInput,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel, bankAccountTypeLabel, hasPostedOpeningBalance } from "@/lib/bank-accounts";
import { DEFAULT_BASE_CURRENCY, SUPPORTED_CURRENCIES, isSupportedCurrencyCode } from "@/lib/currencies";
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
  const [currency, setCurrency] = useState(profile?.currency ?? DEFAULT_BASE_CURRENCY);
  const [openingBalance, setOpeningBalance] = useState(profile?.openingBalance ?? "0.0000");
  const [openingBalanceDate, setOpeningBalanceDate] = useState(profile?.openingBalanceDate?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(profile?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const openingBalanceLocked = profile ? hasPostedOpeningBalance(profile) : false;
  const currencyLocked = profile ? openingBalanceLocked || profile.transactionCount > 0 : false;
  const unsupportedProfileCurrency = Boolean(profile?.currency && !isSupportedCurrencyCode(profile.currency));

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
    if (!currency) {
      setError("Please select a currency.");
      return;
    }
    if (!isSupportedCurrencyCode(currency)) {
      setError("Currency must be one of the supported system currencies.");
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
      <LedgerFormSection title="Bank profile" description="Link an existing posting asset account and record manual banking metadata. Linking a profile does not connect a live bank feed.">
          <LedgerFieldLabel className="md:col-span-2">
            Linked chart account
            <LedgerSelect
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              required
              disabled={Boolean(profile)}
            >
              <option value="">Select asset posting account</option>
              {linkableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {bankAccountOptionLabel(account, profiles)}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Type
            <LedgerSelect value={type} onChange={(event) => setType(event.target.value as BankAccountType)}>
              {BANK_ACCOUNT_TYPES.map((accountType) => (
                <option key={accountType} value={accountType}>
                  {bankAccountTypeLabel(accountType)}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Currency
            <LedgerSelect
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              aria-required="true"
              disabled={currencyLocked}
            >
              <option value="">Select currency</option>
              {unsupportedProfileCurrency ? (
                <option value={profile?.currency}>{profile?.currency} - Unsupported currency requires correction</option>
              ) : null}
              {SUPPORTED_CURRENCIES.map((currencyOption) => (
                <option key={currencyOption.code} value={currencyOption.code}>
                  {currencyOption.code} - {currencyOption.name}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel className="md:col-span-2">
            Display name
            <LedgerInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </LedgerFieldLabel>
          <LedgerFieldLabel className="md:col-span-2">
            Bank name
            <LedgerInput value={bankName} onChange={(event) => setBankName(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Masked account number
            <LedgerInput value={accountNumberMasked} onChange={(event) => setAccountNumberMasked(event.target.value)} placeholder="****1234" />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Masked IBAN
            <LedgerInput value={ibanMasked} onChange={(event) => setIbanMasked(event.target.value)} placeholder="SA****1234" />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Opening balance
            <LedgerInput inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} disabled={openingBalanceLocked} />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            Opening balance date
            <LedgerInput type="date" value={openingBalanceDate} onChange={(event) => setOpeningBalanceDate(event.target.value)} disabled={openingBalanceLocked} />
          </LedgerFieldLabel>
          <LedgerFieldLabel className="md:col-span-2">
            Notes
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1" />
          </LedgerFieldLabel>
        <p className="mt-3 text-xs text-steel">
          Opening balance stays as setup metadata until it is posted from the bank account detail page. Once posted, the amount and date are locked.
        </p>
        {openingBalanceLocked ? (
          <LedgerSummaryBand tone="warning">
            Opening balance has already been posted and cannot be changed without a future reversal workflow.
          </LedgerSummaryBand>
        ) : null}
        {currencyLocked ? (
          <LedgerSummaryBand tone="warning">
            Currency is locked after opening balance or transactions have been posted.
          </LedgerSummaryBand>
        ) : null}
        {unsupportedProfileCurrency ? (
          <LedgerSummaryBand tone="warning">
            This bank account has an unsupported currency value. Select a supported currency before saving.
          </LedgerSummaryBand>
        ) : null}
      </LedgerFormSection>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage bank accounts.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank account setup data...</StatusMessage> : null}
        {!profile && !loading && organizationId && linkableAccounts.length === 0 ? <StatusMessage type="empty">No active posting asset accounts are available to link.</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <LedgerActionBar className="justify-end">
        <LedgerButton href={profile ? `/bank-accounts/${profile.id}` : "/bank-accounts"}>Cancel</LedgerButton>
        <LedgerButton type="submit" disabled={submitting || !organizationId || (!profile && !linkableAccounts.length)} variant="primary">
          {submitting ? "Saving..." : "Save profile"}
        </LedgerButton>
      </LedgerActionBar>
    </form>
  );
}
