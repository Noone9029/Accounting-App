"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSection,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { customerPaymentAllocationStateLabel, type CustomerPaymentAllocationState } from "@/lib/customer-payments";
import { formatOptionalDate } from "@/lib/invoice-display";
import { calculatePaymentAllocationPreview, formatMoneyAmount, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import type { Account, BankAccountSummary, Contact, CustomerPayment, OpenSalesInvoice } from "@/lib/types";

interface AllocationState {
  invoiceId: string;
  amountApplied: string;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function allocationStateTone(state: CustomerPaymentAllocationState): LedgerStatusTone {
  switch (state) {
    case "FULLY_APPLIED":
      return "success";
    case "PARTIALLY_UNAPPLIED":
      return "warning";
    case "NO_ALLOCATIONS":
      return "neutral";
    default:
      return "neutral";
  }
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
      router.push(returnTo || `/sales/customer-payments/${payment.id}?recorded=1`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record customer payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Record customer payment"
        description="Allocate received money to finalized open invoices. If this is your first workflow, finalize an invoice first, then come back here to close the receivables loop."
        actions={
          <>
          <LedgerButton href="/setup">
            Guided setup
          </LedgerButton>
          <LedgerButton href={returnTo || "/sales/customer-payments"} icon={ArrowLeft}>
            Back
          </LedgerButton>
          </>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to record payments.</StatusMessage> : null}
        {loadingSetup ? <StatusMessage type="loading">Loading payment setup data...</StatusMessage> : null}
        {loadingInvoices ? <StatusMessage type="loading">Loading open invoices...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loadingSetup && organizationId && customers.length === 0 ? (
          <StatusMessage type="empty">
            Add a customer and create a finalized invoice before recording the first payment.{" "}
            <Link href="/customers" className="font-semibold text-palm hover:underline">
              Open customers
            </Link>
            .
          </StatusMessage>
        ) : null}
        {!loadingSetup && organizationId && paidThroughAccounts.length === 0 ? (
          <StatusMessage type="empty">
            Add an active cash or bank posting account before recording payment.{" "}
            <Link href="/bank-accounts" className="font-semibold text-palm hover:underline">
              Open bank accounts
            </Link>
            .
          </StatusMessage>
        ) : null}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <LedgerFormSection title="Payment details" description="Choose the customer, payment date, amount, and paid-through account.">
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Customer</LedgerFieldText>
              <LedgerSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName ?? customer.name}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Payment date</LedgerFieldText>
              <LedgerInput type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Amount received</LedgerFieldText>
              <LedgerInput inputMode="decimal" value={amountReceived} onChange={(event) => setAmountReceived(event.target.value)} required className="font-mono tabular-nums" />
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Paid-through account</LedgerFieldText>
              <LedgerSelect value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
                <option value="">Select cash or bank account</option>
                {paidThroughAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {bankAccountOptionLabel(account, bankProfiles)}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Description</LedgerFieldText>
              <LedgerInput value={description} onChange={(event) => setDescription(event.target.value)} />
            </LedgerFieldLabel>
          </LedgerFormSection>

          <LedgerSection title="Invoice allocation" description="Apply this payment only to finalized open invoices for the selected customer.">
            <LedgerDataTable minWidth="880px" className="shadow-none">
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
                      <td className="px-4 py-3"><LedgerDate>{new Date(invoice.issueDate).toLocaleDateString()}</LedgerDate></td>
                      <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(invoice.dueDate)}</LedgerDate></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(invoice.total, invoice.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(invoice.balanceDue, invoice.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3">
                        <LedgerInput
                          inputMode="decimal"
                          value={allocation?.amountApplied ?? "0.0000"}
                          onChange={(event) => updateAllocation(invoice.id, event.target.value)}
                          className="w-36 font-mono text-xs tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <LedgerButton type="button" size="sm" onClick={() => applyFullBalance(invoice)}>
                          Apply balance
                        </LedgerButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </LedgerDataTable>
          {!loadingInvoices && customerId && openInvoices.length === 0 ? (
            <div className="px-4 py-5">
              <StatusMessage type="empty">
                No finalized open invoices found for this customer.{" "}
                <Link href={createInvoiceHref} className="font-semibold text-primary hover:underline">
                  Create and finalize an invoice
                </Link>
                {" "}before recording payment.
              </StatusMessage>
            </div>
          ) : null}
          </LedgerSection>

          <LedgerSummaryBand>
            <dl className="ml-auto grid max-w-sm grid-cols-2 gap-2 text-sm">
              <dt>Amount received</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(preview.amountReceived)}</LedgerMoney></dd>
              <dt>Allocated</dt>
              <dd className="text-right"><LedgerMoney>{formatMoneyAmount(preview.totalAllocated)}</LedgerMoney></dd>
              <dt className="font-semibold text-ink">Unapplied</dt>
              <dd className="text-right font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(preview.unappliedAmount)}</LedgerMoney></dd>
              <dt>Allocation state</dt>
              <dd className="text-right">
                <LedgerStatusBadge tone={allocationStateTone(previewAllocationState)}>
                  {customerPaymentAllocationStateLabel(previewAllocationState)}
                </LedgerStatusBadge>
              </dd>
            </dl>
          </LedgerSummaryBand>

          <LedgerAlert tone="info">
            Customer payments post only through this explicit record action. No payment provider, bank feed, or automatic reconciliation is called from this form.
          </LedgerAlert>

        <LedgerActionBar>
          <LedgerButton type="submit" disabled={!organizationId || loadingSetup || loadingInvoices || submitting || !preview.valid} variant="primary" icon={Save}>
            {submitting ? "Recording..." : "Record payment"}
          </LedgerButton>
          <LedgerButton href={returnTo || "/sales/customer-payments"}>
            Cancel
          </LedgerButton>
        </LedgerActionBar>
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}

function paymentAllocationPreviewState(totalAllocated: string, unappliedAmount: string): CustomerPaymentAllocationState {
  if (parseDecimalToUnits(totalAllocated) <= 0) {
    return "NO_ALLOCATIONS";
  }
  return parseDecimalToUnits(unappliedAmount) > 0 ? "PARTIALLY_UNAPPLIED" : "FULLY_APPLIED";
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
