"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { customerPaymentAllocationStateBadgeClass, customerPaymentAllocationStateLabel, type CustomerPaymentAllocationState } from "@/lib/customer-payments";
import { calculatePaymentAllocationPreview, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import type { Account, BankAccountSummary, Contact, CustomerPayment, OpenSalesInvoice } from "@/lib/types";

interface AllocationState {
  invoiceId: string;
  amountApplied: string;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewCustomerPaymentPage() {
  const router = useRouter();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
  const { locale, tc } = useAppLocale();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
  const [bankProfilesReady, setBankProfilesReady] = useState(false);
  const [openInvoices, setOpenInvoices] = useState<OpenSalesInvoice[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [prefilledInvoiceId, setPrefilledInvoiceId] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [accountId, setAccountId] = useState("");
  const [amountReceived, setAmountReceived] = useState("0.0000");
  const [description, setDescription] = useState("");
  const [allocations, setAllocations] = useState<AllocationState[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const paidThroughAccounts = useMemo(
    () => accounts.filter((account) => account.isActive && account.allowPosting && account.type === "ASSET"),
    [accounts],
  );
  const preview = useMemo(
    () =>
      calculatePaymentAllocationPreview(
        amountReceived,
        allocations.map((allocation) => ({
          amountApplied: allocation.amountApplied,
          balanceDue: openInvoices.find((invoice) => invoice.id === allocation.invoiceId)?.balanceDue ?? "0.0000",
        })),
      ),
    [allocations, amountReceived, openInvoices],
  );
  const previewAllocationState = useMemo(
    () => paymentAllocationPreviewState(preview.totalAllocated, preview.unappliedAmount),
    [preview.totalAllocated, preview.unappliedAmount],
  );
  const customerContextReturnTo = customerId ? returnTo || partyDetailHref("customer", customerId) : returnTo;
  const createInvoiceHref = customerId
    ? `/sales/invoices/new?customerId=${encodeURIComponent(customerId)}&returnTo=${encodeURIComponent(customerContextReturnTo)}`
    : "/sales/invoices/new";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const customer = params.get("customerId") ?? "";
    const invoice = params.get("invoiceId") ?? "";
    setCustomerId(customer);
    setPrefilledInvoiceId(invoice);
    setReturnTo(safeReturnToFromSearch(window.location.search));
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

        setCustomers(contactResult.filter((contact) => contact.isActive && (contact.type === "CUSTOMER" || contact.type === "BOTH")));
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load payment setup data."));
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
    if (!organizationId || !customerId) {
      setOpenInvoices([]);
      setAllocations([]);
      return;
    }

    let cancelled = false;
    setLoadingInvoices(true);
    setError("");

    apiRequest<OpenSalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(customerId)}`)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setOpenInvoices(result);
        setAllocations(
          result.map((invoice) => ({
            invoiceId: invoice.id,
            amountApplied: invoice.id === prefilledInvoiceId ? invoice.balanceDue : "0.0000",
          })),
        );
        if (prefilledInvoiceId) {
          const invoice = result.find((candidate) => candidate.id === prefilledInvoiceId);
          if (invoice) {
            setAmountReceived(invoice.balanceDue);
          }
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load open invoices."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInvoices(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, organizationId, prefilledInvoiceId, tc]);

  function updateAllocation(invoiceId: string, amountApplied: string) {
    setAllocations((current) => current.map((allocation) => (allocation.invoiceId === invoiceId ? { ...allocation, amountApplied } : allocation)));
  }

  function applyFullBalance(invoice: OpenSalesInvoice) {
    updateAllocation(invoice.id, invoice.balanceDue);
    if (parseDecimalToUnits(amountReceived) <= 0) {
      setAmountReceived(invoice.balanceDue);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const allocationsToSubmit = allocations.filter((allocation) => parseDecimalToUnits(allocation.amountApplied) > 0);
    if (!baseCurrency) {
      setError(tc("Select an organization with a base currency before recording this payment."));
      return;
    }
    if (!bankProfilesReady) {
      setError(tc("Bank-profile currencies could not be verified. Reload them before recording this payment."));
      return;
    }
    if (loadingSetup || loadingInvoices || !organizationId) {
      setError(tc("Wait for payment setup data from the active organization before recording this payment."));
      return;
    }
    const selectedCustomer = customers.find((customer) => customer.id === customerId);
    if (!selectedCustomer || (selectedCustomer.organizationId && selectedCustomer.organizationId !== organizationId)) {
      setError(tc("The selected customer does not belong to the active organization."));
      return;
    }
    const selectedAccount = paidThroughAccounts.find((account) => account.id === accountId);
    if (!selectedAccount || selectedAccount.organizationId !== organizationId) {
      setError(tc("The paid-through account does not belong to the active organization."));
      return;
    }
    const allocationSourceMismatch = allocationsToSubmit.some((allocation) => {
      const invoice = openInvoices.find((candidate) => candidate.id === allocation.invoiceId);
      return !invoice || invoice.customerId !== customerId;
    });
    if (allocationSourceMismatch) {
      setError(tc("One or more payment allocations do not belong to the selected customer in the active organization."));
      return;
    }
    const mismatchedInvoice = allocationsToSubmit
      .map((allocation) => openInvoices.find((invoice) => invoice.id === allocation.invoiceId))
      .find((invoice) => invoice && invoice.currency !== baseCurrency);
    if (mismatchedInvoice) {
      setError(tc("Invoice {number} uses {currency}. Payments can be allocated only in the organization base currency {baseCurrency} during this phase.", { number: mismatchedInvoice.invoiceNumber, currency: mismatchedInvoice.currency, baseCurrency }));
      return;
    }
    const selectedBankProfile = bankProfiles.find((profile) => profile.accountId === accountId);
    if (selectedBankProfile && (selectedBankProfile.organizationId !== organizationId || selectedBankProfile.currency !== baseCurrency)) {
      setError(tc("The received-into account uses {currency}. Payments can post only in the organization base currency {baseCurrency} during this phase.", { currency: selectedBankProfile.currency, baseCurrency }));
      return;
    }
    const validationError = getValidationError(customerId, accountId, amountReceived, allocationsToSubmit, openInvoices, tc);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payment = await apiRequest<CustomerPayment>("/customer-payments", {
        method: "POST",
        body: {
          customerId,
          paymentDate: `${paymentDate}T00:00:00.000Z`,
          currency: baseCurrency,
          amountReceived,
          accountId,
          description: description || undefined,
          allocations: allocationsToSubmit,
        },
      });
      router.push(returnTo || `/sales/customer-payments/${payment.id}?recorded=1`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to record customer payment."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Record customer payment")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            {tc("Allocate received money to finalized open invoices. If this is your first workflow, finalize an invoice first, then come back here to close the receivables loop.")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/setup" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Guided setup")}
          </Link>
          <Link href={returnTo || "/sales/customer-payments"} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to record payments.")}</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">{tc("Loading payment setup data...")}</StatusMessage> : null}
        {loadingInvoices ? <StatusMessage type="loading">{tc("Loading open invoices...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loadingSetup && organizationId && customers.length === 0 ? (
          <StatusMessage type="empty">
            {tc("Add a customer and create a finalized invoice before recording the first payment.")}{" "}
            <Link href="/customers" className="font-semibold text-palm hover:underline">
              {tc("Open customers")}
            </Link>
            .
          </StatusMessage>
        ) : null}
        {!loadingSetup && organizationId && paidThroughAccounts.length === 0 ? (
          <StatusMessage type="empty">
            {tc("Add an active cash or bank posting account before recording payment.")}{" "}
            <Link href="/bank-accounts" className="font-semibold text-palm hover:underline">
              {tc("Open bank accounts")}
            </Link>
            .
          </StatusMessage>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Customer")}</span>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select customer")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName ?? customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Payment date")}</span>
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">{tc("Amount received")}</span>
              <input inputMode="decimal" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">{tc("Paid-through account")}</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">{tc("Select cash or bank account")}</option>
                {paidThroughAccounts.map((account) => (
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

        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[880px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Invoice")}</th>
                <th className="px-4 py-3">{tc("Issue date")}</th>
                <th className="px-4 py-3">{tc("Due date")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Balance due")}</th>
                <th className="px-4 py-3">{tc("Amount to apply")}</th>
                <th className="px-4 py-3">{tc("Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openInvoices.map((invoice) => {
                const allocation = allocations.find((candidate) => candidate.invoiceId === invoice.id);
                return (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{invoice.invoiceNumber}</bdi></td>
                    <td className="px-4 py-3 text-steel">{formatAppDate(invoice.issueDate, locale, "-")}</td>
                    <td className="px-4 py-3 text-steel">{formatAppDate(invoice.dueDate, locale, "-")}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(invoice.total, invoice.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(invoice.balanceDue, invoice.currency, locale)}</td>
                    <td className="px-4 py-3">
                      <input
                        inputMode="decimal"
                        value={allocation?.amountApplied ?? "0.0000"}
                        onChange={(event) => updateAllocation(invoice.id, event.target.value)}
                        className="w-36 rounded-md border border-slate-300 px-2 py-2 font-mono text-xs outline-none focus:border-palm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => applyFullBalance(invoice)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("Apply balance")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loadingInvoices && customerId && openInvoices.length === 0 ? (
            <div className="px-4 py-5">
              <StatusMessage type="empty">
                {tc("No finalized open invoices found for this customer.")}{" "}
                <Link href={createInvoiceHref} className="font-semibold text-palm hover:underline">
                  {tc("Create and finalize an invoice")}
                </Link>
                {" "}{tc("before recording payment.")}
              </StatusMessage>
            </div>
          ) : null}
        </div>

        <div className="grid w-full max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel sm:ms-auto">
          <span className="text-steel">{tc("Amount received")}</span>
          <span className="text-end font-mono">{baseCurrency ? formatAppMoney(preview.amountReceived, baseCurrency, locale) : "-"}</span>
          <span className="text-steel">{tc("Allocated")}</span>
          <span className="text-end font-mono">{baseCurrency ? formatAppMoney(preview.totalAllocated, baseCurrency, locale) : "-"}</span>
          <span className="font-semibold text-ink">{tc("Unapplied")}</span>
          <span className="text-end font-mono font-semibold text-ink">{baseCurrency ? formatAppMoney(preview.unappliedAmount, baseCurrency, locale) : "-"}</span>
          <span className="text-steel">{tc("Allocation state")}</span>
          <span className="text-end">
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerPaymentAllocationStateBadgeClass(previewAllocationState)}`}>
              {tc(customerPaymentAllocationStateLabel(previewAllocationState))}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={!organizationId || !baseCurrency || !bankProfilesReady || loadingSetup || loadingInvoices || submitting || !preview.valid} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? tc("Recording...") : tc("Record payment")}
          </button>
          <Link href={returnTo || "/sales/customer-payments"} className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Cancel")}
          </Link>
        </div>
      </form>
    </section>
  );
}

function paymentAllocationPreviewState(totalAllocated: string, unappliedAmount: string): CustomerPaymentAllocationState {
  if (parseDecimalToUnits(totalAllocated) <= 0) {
    return "NO_ALLOCATIONS";
  }
  return parseDecimalToUnits(unappliedAmount) > 0 ? "PARTIALLY_UNAPPLIED" : "FULLY_APPLIED";
}

function getValidationError(
  customerId: string,
  accountId: string,
  amountReceived: string,
  allocations: AllocationState[],
  openInvoices: OpenSalesInvoice[],
  tc: (value: string, params?: Record<string, string | number>) => string,
): string {
  if (!customerId) {
    return tc("Choose a customer.");
  }

  if (!accountId) {
    return tc("Choose a paid-through account.");
  }

  if (parseDecimalToUnits(amountReceived) <= 0) {
    return tc("Amount received must be greater than zero.");
  }

  if (allocations.length === 0) {
    return tc("Apply the payment to at least one open invoice.");
  }

  const totalAllocated = allocations.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  if (totalAllocated > parseDecimalToUnits(amountReceived)) {
    return tc("Total allocated cannot exceed amount received.");
  }

  for (const allocation of allocations) {
    const invoice = openInvoices.find((candidate) => candidate.id === allocation.invoiceId);
    const amountApplied = parseDecimalToUnits(allocation.amountApplied);
    if (amountApplied <= 0) {
      return tc("Allocation amounts must be greater than zero.");
    }
    if (!invoice || amountApplied > parseDecimalToUnits(invoice.balanceDue)) {
      return tc("Allocation amount cannot exceed invoice balance due.");
    }
  }

  return "";
}
