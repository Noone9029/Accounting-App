"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { formatOptionalDate } from "@/lib/invoice-display";
import { calculatePaymentAllocationPreview, formatMoneyAmount, parseDecimalToUnits } from "@/lib/money";
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
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const customer = params.get("customerId") ?? "";
    const invoice = params.get("invoiceId") ?? "";
    setCustomerId(customer);
    setPrefilledInvoiceId(invoice);
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load payment setup data.");
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load open invoices.");
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
  }, [customerId, organizationId, prefilledInvoiceId]);

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
    const validationError = getValidationError(customerId, accountId, amountReceived, allocationsToSubmit, openInvoices);
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
          currency: "SAR",
          amountReceived,
          accountId,
          description: description || undefined,
          allocations: allocationsToSubmit,
        },
      });
      router.push(`/sales/customer-payments/${payment.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record customer payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Record customer payment</h1>
          <p className="mt-1 text-sm text-steel">Allocate received money to finalized open invoices.</p>
        </div>
        <Link href="/sales/customer-payments" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to record payments.</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">Loading payment setup data...</StatusMessage> : null}
        {loadingInvoices ? <StatusMessage type="loading">Loading open invoices...</StatusMessage> : null}
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
              <span className="text-sm font-medium text-slate-700">Payment date</span>
              <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Amount received</span>
              <input inputMode="decimal" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Paid-through account</span>
              <select value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select cash or bank account</option>
                {paidThroughAccounts.map((account) => (
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

        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Issue date</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Balance due</th>
                <th className="px-4 py-3">Amount to apply</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openInvoices.map((invoice) => {
                const allocation = allocations.find((candidate) => candidate.invoiceId === invoice.id);
                return (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-mono text-xs">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-steel">{new Date(invoice.issueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-steel">{formatOptionalDate(invoice.dueDate)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(invoice.total, invoice.currency)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(invoice.balanceDue, invoice.currency)}</td>
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
                        Apply balance
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loadingInvoices && customerId && openInvoices.length === 0 ? (
            <div className="px-4 py-5">
              <StatusMessage type="empty">No finalized open invoices found for this customer.</StatusMessage>
            </div>
          ) : null}
        </div>

        <div className="ml-auto grid max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel">
          <span className="text-steel">Amount received</span>
          <span className="text-right font-mono">{formatMoneyAmount(preview.amountReceived)}</span>
          <span className="text-steel">Allocated</span>
          <span className="text-right font-mono">{formatMoneyAmount(preview.totalAllocated)}</span>
          <span className="font-semibold text-ink">Unapplied</span>
          <span className="text-right font-mono font-semibold text-ink">{formatMoneyAmount(preview.unappliedAmount)}</span>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={!organizationId || loadingSetup || loadingInvoices || submitting || !preview.valid} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Recording..." : "Record payment"}
          </button>
          <Link href="/sales/customer-payments" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

function getValidationError(customerId: string, accountId: string, amountReceived: string, allocations: AllocationState[], openInvoices: OpenSalesInvoice[]): string {
  if (!customerId) {
    return "Choose a customer.";
  }

  if (!accountId) {
    return "Choose a paid-through account.";
  }

  if (parseDecimalToUnits(amountReceived) <= 0) {
    return "Amount received must be greater than zero.";
  }

  if (allocations.length === 0) {
    return "Apply the payment to at least one open invoice.";
  }

  const totalAllocated = allocations.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0);
  if (totalAllocated > parseDecimalToUnits(amountReceived)) {
    return "Total allocated cannot exceed amount received.";
  }

  for (const allocation of allocations) {
    const invoice = openInvoices.find((candidate) => candidate.id === allocation.invoiceId);
    const amountApplied = parseDecimalToUnits(allocation.amountApplied);
    if (amountApplied <= 0) {
      return "Allocation amounts must be greater than zero.";
    }
    if (!invoice || amountApplied > parseDecimalToUnits(invoice.balanceDue)) {
      return "Allocation amount cannot exceed invoice balance due.";
    }
  }

  return "";
}
