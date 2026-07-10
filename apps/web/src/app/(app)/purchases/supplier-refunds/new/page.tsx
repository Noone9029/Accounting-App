"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppMoney } from "@/lib/app-i18n";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { parseDecimalToUnits } from "@/lib/money";
import {
  supplierRefundableAmountAfterRefund,
  supplierRefundSourceTypeLabel,
  validateSupplierRefundAmount,
} from "@/lib/supplier-refunds";
import type { Account, BankAccountSummary, Contact, SupplierRefund, SupplierRefundSourceType, SupplierRefundableSources } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSupplierRefundPage() {
  const router = useRouter();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
  const { locale, tc } = useAppLocale();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
  const [bankProfilesReady, setBankProfilesReady] = useState(false);
  const [sources, setSources] = useState<SupplierRefundableSources | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [sourceType, setSourceType] = useState<SupplierRefundSourceType>("SUPPLIER_PAYMENT");
  const [sourceId, setSourceId] = useState("");
  const [refundDate, setRefundDate] = useState(todayInputValue());
  const [amountRefunded, setAmountRefunded] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const receivedIntoAccounts = useMemo(
    () => accounts.filter((account) => account.isActive && account.allowPosting && account.type === "ASSET"),
    [accounts],
  );
  const sourceOptions = sourceType === "SUPPLIER_PAYMENT" ? sources?.payments ?? [] : sources?.debitNotes ?? [];
  const selectedSource = sourceOptions.find((source) => source.id === sourceId);
  const sourceCurrencyMismatch = Boolean(selectedSource && baseCurrency && selectedSource.currency !== baseCurrency);
  const displayCurrency = selectedSource?.currency ?? baseCurrency;
  const availableAmount = selectedSource?.unappliedAmount ?? "0.0000";
  const remainingAfterRefund = supplierRefundableAmountAfterRefund(availableAmount, amountRefunded || "0.0000");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setSupplierId(params.get("supplierId") ?? "");
    const requestedSourceType = params.get("sourceType");
    if (requestedSourceType === "PURCHASE_DEBIT_NOTE" || requestedSourceType === "SUPPLIER_PAYMENT") {
      setSourceType(requestedSourceType);
    }
    setSourceId(params.get("sourcePaymentId") ?? params.get("sourceDebitNoteId") ?? "");
  }, []);

  useEffect(() => {
    setBankProfilesReady(false);
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoadingSetup(true);
    setError("");

    Promise.all([apiRequest<Contact[]>("/contacts"), apiRequest<Account[]>("/accounts"), apiRequest<BankAccountSummary[]>("/bank-accounts")])
      .then(([contactResult, accountResult, bankProfileResult]) => {
        if (cancelled) {
          return;
        }
        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
        setAccounts(accountResult);
        setBankProfiles(bankProfileResult);
        setBankProfilesReady(true);
        const defaultAsset =
          accountResult.find((account) => account.code === "112" && account.isActive && account.allowPosting && account.type === "ASSET") ??
          accountResult.find((account) => account.code === "111" && account.isActive && account.allowPosting && account.type === "ASSET");
        if (defaultAsset) {
          setAccountId(defaultAsset.id);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load supplier refund setup data."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSetup(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, tc]);

  useEffect(() => {
    if (!organizationId || !supplierId) {
      setSources(null);
      setSourceId("");
      return;
    }

    let cancelled = false;
    setLoadingSources(true);
    setError("");

    apiRequest<SupplierRefundableSources>(`/supplier-refunds/refundable-sources?supplierId=${encodeURIComponent(supplierId)}`)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSources(result);
        const options = sourceType === "SUPPLIER_PAYMENT" ? result.payments : result.debitNotes;
        setSourceId((current) => (current && options.some((source) => source.id === current) ? current : (options[0]?.id ?? "")));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load refundable supplier sources."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSources(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supplierId, organizationId, sourceType, tc]);

  useEffect(() => {
    if (selectedSource && (!amountRefunded || parseDecimalToUnits(amountRefunded) <= 0)) {
      setAmountRefunded(selectedSource.unappliedAmount);
    }
  }, [amountRefunded, selectedSource]);

  function changeSourceType(nextSourceType: SupplierRefundSourceType) {
    setSourceType(nextSourceType);
    setSourceId("");
    setAmountRefunded("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!baseCurrency || !selectedSource) {
      setError(tc("Select an organization base currency and a refundable source before recording this refund."));
      return;
    }
    if (!bankProfilesReady) {
      setError(tc("Bank-profile currencies could not be verified. Reload them before recording this refund."));
      return;
    }
    if (loadingSetup || loadingSources || !organizationId) {
      setError(tc("Wait for refund setup data from the active organization before recording this refund."));
      return;
    }
    const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
    if (
      !selectedSupplier ||
      (selectedSupplier.organizationId && selectedSupplier.organizationId !== organizationId) ||
      sources?.supplier.id !== supplierId
    ) {
      setError(tc("The selected supplier or refundable source does not belong to the active organization."));
      return;
    }
    const selectedAccount = receivedIntoAccounts.find((account) => account.id === accountId);
    if (!selectedAccount || selectedAccount.organizationId !== organizationId) {
      setError(tc("The received-into account does not belong to the active organization."));
      return;
    }
    if (sourceCurrencyMismatch) {
      setError(tc("The selected source uses {currency}. Refunds can post only in the organization base currency {baseCurrency} during this phase.", { currency: selectedSource.currency, baseCurrency }));
      return;
    }
    const selectedBankProfile = bankProfiles.find((profile) => profile.accountId === accountId);
    if (selectedBankProfile && (selectedBankProfile.organizationId !== organizationId || selectedBankProfile.currency !== baseCurrency)) {
      setError(tc("The received-into account uses {currency}. Refunds can post only in the organization base currency {baseCurrency} during this phase.", { currency: selectedBankProfile.currency, baseCurrency }));
      return;
    }

    const validationError = getValidationError(supplierId, accountId, sourceId, amountRefunded, availableAmount, tc);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        supplierId,
        sourceType,
        refundDate: `${refundDate}T00:00:00.000Z`,
        currency: selectedSource.currency,
        amountRefunded,
        accountId,
        description: description || undefined,
      };
      if (sourceType === "SUPPLIER_PAYMENT") {
        body.sourcePaymentId = sourceId;
      } else {
        body.sourceDebitNoteId = sourceId;
      }

      const refund = await apiRequest<SupplierRefund>("/supplier-refunds", { method: "POST", body });
      router.push(`/purchases/supplier-refunds/${refund.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to record supplier refund."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Record supplier refund")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Record money received back from a supplier against unapplied AP credit. No bank integration is called.")}</p>
        </div>
        <Link href="/purchases/supplier-refunds" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to record supplier refunds.")}</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">{tc("Loading supplier refund setup data...")}</StatusMessage> : null}
        {loadingSources ? <StatusMessage type="loading">{tc("Loading refundable supplier sources...")}</StatusMessage> : null}
        {sourceCurrencyMismatch ? <StatusMessage type="error">{tc("The selected refundable source currency does not match the organization base currency. Foreign-currency refunds remain disabled in this phase.")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Supplier")}</span>
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select supplier")}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.displayName ?? supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Refund date")}</span>
              <input type="date" value={refundDate} onChange={(event) => setRefundDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Amount refunded")}</span>
              <input inputMode="decimal" value={amountRefunded} onChange={(event) => setAmountRefunded(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Source type")}</span>
              <select value={sourceType} onChange={(event) => changeSourceType(event.target.value as SupplierRefundSourceType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="SUPPLIER_PAYMENT">{tc("Supplier payment")}</option>
                <option value="PURCHASE_DEBIT_NOTE">{tc("Purchase debit note")}</option>
              </select>
            </label>
            <label className="block md:col-span-3">
              <span className="text-sm font-medium text-slate-700">{tc("Refund source")}</span>
              <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select {source}", { source: tc(supplierRefundSourceTypeLabel(sourceType)).toLowerCase() })}</option>
                {sourceOptions.map((source) => (
                  <option key={source.id} value={source.id}>
                    {supplierRefundableSourceOptionLabel(sourceType, source, locale, tc)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Received-into account")}</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select cash or bank account")}</option>
                {receivedIntoAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {bankAccountOptionLabel(account, bankProfiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Description")}</span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
        </div>

        <div className="ms-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
          <span className="text-steel">{tc("Available source credit")}</span>
          <span className="text-end font-mono">{displayCurrency ? formatAppMoney(availableAmount, displayCurrency, locale) : "-"}</span>
          <span className="text-steel">{tc("Amount refunded")}</span>
          <span className="text-end font-mono">{displayCurrency ? formatAppMoney(amountRefunded || "0.0000", displayCurrency, locale) : "-"}</span>
          <span className="font-semibold text-ink">{tc("Remaining unapplied")}</span>
          <span className="text-end font-mono font-semibold text-ink">{displayCurrency ? formatAppMoney(remainingAfterRefund, displayCurrency, locale) : "-"}</span>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {tc("This records only the accounting refund journal. It does not call bank transfers, payment gateways, bank reconciliation, or ZATCA services.")}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={!organizationId || !baseCurrency || !bankProfilesReady || loadingSetup || loadingSources || submitting || !selectedSource || sourceCurrencyMismatch} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? tc("Recording...") : tc("Record refund")}
          </button>
          <Link href="/purchases/supplier-refunds" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Cancel")}
          </Link>
        </div>
      </form>
    </section>
  );
}

function getValidationError(supplierId: string, accountId: string, sourceId: string, amountRefunded: string, availableAmount: string, tc: (value: string, params?: Record<string, string | number>) => string): string {
  if (!supplierId) {
    return tc("Choose a supplier.");
  }
  if (!accountId) {
    return tc("Choose a received-into account.");
  }
  if (!sourceId) {
    return tc("Choose a refundable source.");
  }
  const amountError = validateSupplierRefundAmount(amountRefunded, availableAmount);
  return amountError ? tc(amountError) : "";
}

function supplierRefundableSourceOptionLabel(
  sourceType: SupplierRefundSourceType,
  source: SupplierRefundableSources["payments"][number] | SupplierRefundableSources["debitNotes"][number],
  locale: "en" | "ar",
  tc: (value: string, params?: Record<string, string | number>) => string,
): string {
  if (sourceType === "SUPPLIER_PAYMENT" && "paymentNumber" in source) {
    return `${source.paymentNumber} - ${tc("unapplied")} ${formatAppMoney(source.unappliedAmount, source.currency, locale)}`;
  }
  if (sourceType === "PURCHASE_DEBIT_NOTE" && "debitNoteNumber" in source) {
    return `${source.debitNoteNumber} - ${tc("unapplied")} ${formatAppMoney(source.unappliedAmount, source.currency, locale)}`;
  }
  return tc("Refund source");
}
