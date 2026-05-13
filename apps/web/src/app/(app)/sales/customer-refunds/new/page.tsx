"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import {
  customerRefundSourceTypeLabel,
  refundableAmountAfterRefund,
  refundableSourceLabel,
  validateCustomerRefundAmount,
} from "@/lib/customer-refunds";
import { formatMoneyAmount, parseDecimalToUnits } from "@/lib/money";
import type { Account, BankAccountSummary, Contact, CustomerRefund, CustomerRefundSourceType, CustomerRefundableSources } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewCustomerRefundPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
  const [sources, setSources] = useState<CustomerRefundableSources | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [sourceType, setSourceType] = useState<CustomerRefundSourceType>("CUSTOMER_PAYMENT");
  const [sourceId, setSourceId] = useState("");
  const [refundDate, setRefundDate] = useState(todayInputValue());
  const [amountRefunded, setAmountRefunded] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const paidFromAccounts = useMemo(
    () => accounts.filter((account) => account.isActive && account.allowPosting && account.type === "ASSET"),
    [accounts],
  );
  const sourceOptions = sourceType === "CUSTOMER_PAYMENT" ? sources?.payments ?? [] : sources?.creditNotes ?? [];
  const selectedSource = sourceOptions.find((source) => source.id === sourceId);
  const availableAmount = selectedSource?.unappliedAmount ?? "0.0000";
  const remainingAfterRefund = refundableAmountAfterRefund(availableAmount, amountRefunded || "0.0000");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setCustomerId(params.get("customerId") ?? "");
    const requestedSourceType = params.get("sourceType");
    if (requestedSourceType === "CREDIT_NOTE" || requestedSourceType === "CUSTOMER_PAYMENT") {
      setSourceType(requestedSourceType);
    }
    setSourceId(params.get("sourcePaymentId") ?? params.get("sourceCreditNoteId") ?? "");
  }, []);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoadingSetup(true);
    setError("");

    Promise.all([apiRequest<Contact[]>("/contacts"), apiRequest<Account[]>("/accounts"), apiRequest<BankAccountSummary[]>("/bank-accounts").catch(() => [])])
      .then(([contactResult, accountResult, bankProfileResult]) => {
        if (cancelled) {
          return;
        }
        setCustomers(contactResult.filter((contact) => contact.isActive && (contact.type === "CUSTOMER" || contact.type === "BOTH")));
        setAccounts(accountResult);
        setBankProfiles(bankProfileResult);
        const defaultAsset =
          accountResult.find((account) => account.code === "112" && account.isActive && account.allowPosting && account.type === "ASSET") ??
          accountResult.find((account) => account.code === "111" && account.isActive && account.allowPosting && account.type === "ASSET");
        if (defaultAsset) {
          setAccountId(defaultAsset.id);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load refund setup data.");
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
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !customerId) {
      setSources(null);
      setSourceId("");
      return;
    }

    let cancelled = false;
    setLoadingSources(true);
    setError("");

    apiRequest<CustomerRefundableSources>(`/customer-refunds/refundable-sources?customerId=${encodeURIComponent(customerId)}`)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSources(result);
        const options = sourceType === "CUSTOMER_PAYMENT" ? result.payments : result.creditNotes;
        setSourceId((current) => (current && options.some((source) => source.id === current) ? current : (options[0]?.id ?? "")));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load refundable sources.");
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
  }, [customerId, organizationId, sourceType]);

  useEffect(() => {
    if (selectedSource && (!amountRefunded || parseDecimalToUnits(amountRefunded) <= 0)) {
      setAmountRefunded(selectedSource.unappliedAmount);
    }
  }, [amountRefunded, selectedSource]);

  function changeSourceType(nextSourceType: CustomerRefundSourceType) {
    setSourceType(nextSourceType);
    setSourceId("");
    setAmountRefunded("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError(customerId, accountId, sourceId, amountRefunded, availableAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        customerId,
        sourceType,
        refundDate: `${refundDate}T00:00:00.000Z`,
        currency: selectedSource?.currency ?? "SAR",
        amountRefunded,
        accountId,
        description: description || undefined,
      };
      if (sourceType === "CUSTOMER_PAYMENT") {
        body.sourcePaymentId = sourceId;
      } else {
        body.sourceCreditNoteId = sourceId;
      }

      const refund = await apiRequest<CustomerRefund>("/customer-refunds", { method: "POST", body });
      router.push(`/sales/customer-refunds/${refund.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record customer refund.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Record customer refund</h1>
          <p className="mt-1 text-sm text-steel">Refund unapplied customer credit manually. No payment gateway refund is created.</p>
        </div>
        <Link href="/sales/customer-refunds" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to record refunds.</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">Loading refund setup data...</StatusMessage> : null}
        {loadingSources ? <StatusMessage type="loading">Loading refundable sources...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Customer</span>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName ?? customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Refund date</span>
              <input type="date" value={refundDate} onChange={(event) => setRefundDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Amount refunded</span>
              <input inputMode="decimal" value={amountRefunded} onChange={(event) => setAmountRefunded(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Source type</span>
              <select value={sourceType} onChange={(event) => changeSourceType(event.target.value as CustomerRefundSourceType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="CUSTOMER_PAYMENT">Customer payment</option>
                <option value="CREDIT_NOTE">Credit note</option>
              </select>
            </label>
            <label className="block md:col-span-3">
              <span className="text-sm font-medium text-slate-700">Refund source</span>
              <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select {customerRefundSourceTypeLabel(sourceType).toLowerCase()}</option>
                {sourceOptions.map((source) => (
                  <option key={source.id} value={source.id}>
                    {refundableSourceLabel(sourceType, source)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Paid-from account</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select cash or bank account</option>
                {paidFromAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {bankAccountOptionLabel(account, bankProfiles)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
          </div>
        </div>

        <div className="ml-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
          <span className="text-steel">Available source credit</span>
          <span className="text-right font-mono">{formatMoneyAmount(availableAmount, selectedSource?.currency ?? "SAR")}</span>
          <span className="text-steel">Amount refunded</span>
          <span className="text-right font-mono">{formatMoneyAmount(amountRefunded || "0.0000", selectedSource?.currency ?? "SAR")}</span>
          <span className="font-semibold text-ink">Remaining unapplied</span>
          <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(remainingAfterRefund, selectedSource?.currency ?? "SAR")}</span>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This records only the accounting refund journal. It does not call a payment gateway, bank feed, or ZATCA service.
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={!organizationId || loadingSetup || loadingSources || submitting || !selectedSource} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Recording..." : "Record refund"}
          </button>
          <Link href="/sales/customer-refunds" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

function getValidationError(customerId: string, accountId: string, sourceId: string, amountRefunded: string, availableAmount: string): string {
  if (!customerId) {
    return "Choose a customer.";
  }
  if (!accountId) {
    return "Choose a paid-from account.";
  }
  if (!sourceId) {
    return "Choose a refundable source.";
  }
  return validateCustomerRefundAmount(amountRefunded, availableAmount) ?? "";
}
