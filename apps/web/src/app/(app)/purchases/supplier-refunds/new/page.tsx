"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { formatMoneyAmount, parseDecimalToUnits } from "@/lib/money";
import {
  supplierRefundableAmountAfterRefund,
  supplierRefundableSourceLabel,
  supplierRefundSourceTypeLabel,
  validateSupplierRefundAmount,
} from "@/lib/supplier-refunds";
import type { Account, BankAccountSummary, Contact, SupplierRefund, SupplierRefundSourceType, SupplierRefundableSources } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSupplierRefundPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
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
        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier refund setup data.");
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load refundable supplier sources.");
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
  }, [supplierId, organizationId, sourceType]);

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

    const validationError = getValidationError(supplierId, accountId, sourceId, amountRefunded, availableAmount);
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
        currency: selectedSource?.currency ?? "SAR",
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
      setError(submitError instanceof Error ? submitError.message : "Unable to record supplier refund.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Record supplier refund</h1>
          <p className="mt-1 text-sm text-steel">Record money received back from a supplier against unapplied AP credit. No bank integration is called.</p>
        </div>
        <Link href="/purchases/supplier-refunds" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to record supplier refunds.</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">Loading supplier refund setup data...</StatusMessage> : null}
        {loadingSources ? <StatusMessage type="loading">Loading refundable supplier sources...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Supplier</span>
              <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.displayName ?? supplier.name}
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
              <select value={sourceType} onChange={(event) => changeSourceType(event.target.value as SupplierRefundSourceType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="SUPPLIER_PAYMENT">Supplier payment</option>
                <option value="PURCHASE_DEBIT_NOTE">Purchase debit note</option>
              </select>
            </label>
            <label className="block md:col-span-3">
              <span className="text-sm font-medium text-slate-700">Refund source</span>
              <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select {supplierRefundSourceTypeLabel(sourceType).toLowerCase()}</option>
                {sourceOptions.map((source) => (
                  <option key={source.id} value={source.id}>
                    {supplierRefundableSourceLabel(sourceType, source)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Received-into account</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select cash or bank account</option>
                {receivedIntoAccounts.map((account) => (
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
          This records only the accounting refund journal. It does not call bank transfers, payment gateways, bank reconciliation, or ZATCA services.
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={!organizationId || loadingSetup || loadingSources || submitting || !selectedSource} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Recording..." : "Record refund"}
          </button>
          <Link href="/purchases/supplier-refunds" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

function getValidationError(supplierId: string, accountId: string, sourceId: string, amountRefunded: string, availableAmount: string): string {
  if (!supplierId) {
    return "Choose a supplier.";
  }
  if (!accountId) {
    return "Choose a received-into account.";
  }
  if (!sourceId) {
    return "Choose a refundable source.";
  }
  return validateSupplierRefundAmount(amountRefunded, availableAmount) ?? "";
}
