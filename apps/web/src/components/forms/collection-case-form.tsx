"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import {
  collectionPriorities,
  collectionPriorityLabel,
  collectionStatusLabel,
  collectionsSafeWording,
} from "@/lib/collections";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import type { CollectionCase, CollectionCaseStatus, CollectionPriority, Contact, SalesInvoice } from "@/lib/types";

interface CollectionCaseFormProps {
  initialCase?: CollectionCase;
}

interface CollectionNumberPreview {
  caseNumber: string;
  helperText: string;
}

const createStatuses: readonly CollectionCaseStatus[] = ["OPEN", "IN_PROGRESS", "PROMISED_TO_PAY", "ON_HOLD", "DISPUTED"];
const updateStatuses: readonly CollectionCaseStatus[] = ["OPEN", "IN_PROGRESS", "PROMISED_TO_PAY", "PAID", "ON_HOLD", "DISPUTED"];

export function CollectionCaseForm({ initialCase }: CollectionCaseFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { locale, tc } = useAppLocale();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [numberPreview, setNumberPreview] = useState<CollectionNumberPreview | null>(null);
  const [customerId, setCustomerId] = useState(initialCase?.customerId ?? searchParams.get("customerId") ?? "");
  const [salesInvoiceId, setSalesInvoiceId] = useState(initialCase?.salesInvoiceId ?? searchParams.get("invoiceId") ?? "");
  const [status, setStatus] = useState<CollectionCaseStatus>(initialCase?.status ?? "OPEN");
  const [priority, setPriority] = useState<CollectionPriority>(initialCase?.priority ?? "NORMAL");
  const [followUpDate, setFollowUpDate] = useState(dateInputValue(initialCase?.followUpDate));
  const [nextActionAt, setNextActionAt] = useState(dateInputValue(initialCase?.nextActionAt));
  const [promisedPaymentDate, setPromisedPaymentDate] = useState(dateInputValue(initialCase?.promisedPaymentDate));
  const [promisedAmount, setPromisedAmount] = useState(initialCase?.promisedAmount ?? "");
  const [summary, setSummary] = useState(initialCase?.summary ?? "");
  const [notes, setNotes] = useState(initialCase?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const returnTo = searchParams.get("returnTo");
  const selectableStatuses = initialCase ? updateStatuses : createStatuses;
  const selectedInvoice = useMemo(() => invoices.find((invoice) => invoice.id === salesInvoiceId) ?? initialCase?.salesInvoice ?? null, [initialCase?.salesInvoice, invoices, salesInvoiceId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      initialCase ? Promise.resolve(null) : apiRequest<CollectionNumberPreview>("/collections/next-number"),
    ])
      .then(([contactResult, previewResult]) => {
        if (!cancelled) {
          setCustomers(contactResult.filter((contact) => contact.type === "CUSTOMER" || contact.type === "BOTH"));
          setNumberPreview(previewResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load collection case setup data."));
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
  }, [initialCase, organizationId, tc]);

  useEffect(() => {
    if (!organizationId || !customerId) {
      setInvoices(initialCase?.salesInvoice ? [initialCase.salesInvoice as SalesInvoice] : []);
      return;
    }

    let cancelled = false;
    setInvoiceLoading(true);
    setError("");

    apiRequest<SalesInvoice[]>(`/sales-invoices/open?customerId=${encodeURIComponent(customerId)}`)
      .then((result) => {
        if (cancelled) {
          return;
        }
        const invoiceRows = initialCase?.salesInvoice && !result.some((invoice) => invoice.id === initialCase.salesInvoice?.id)
          ? [initialCase.salesInvoice as SalesInvoice, ...result]
          : result;
        setInvoices(invoiceRows);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load open invoices for this customer."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInvoiceLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, initialCase?.salesInvoice, organizationId, tc]);

  function selectCustomer(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    if (nextCustomerId !== customerId) {
      setSalesInvoiceId("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const body = {
      customerId,
      salesInvoiceId: salesInvoiceId || null,
      status,
      priority,
      followUpDate: followUpDate || null,
      nextActionAt: nextActionAt || null,
      promisedPaymentDate: promisedPaymentDate || null,
      promisedAmount: promisedAmount || null,
      summary: summary || null,
      notes: notes || null,
    };

    try {
      const collectionCase = initialCase
        ? await apiRequest<CollectionCase>(`/collections/${initialCase.id}`, { method: "PATCH", body })
        : await apiRequest<CollectionCase>("/collections", { method: "POST", body });
      setMessage(initialCase ? tc("Collection case updated.") : tc("Collection case created."));
      router.push(returnTo || `/sales/collections/${collectionCase.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to save collection case."));
    } finally {
      setSubmitting(false);
    }
  }

  if (initialCase && (initialCase.status === "CLOSED" || initialCase.status === "CANCELLED")) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Collection case cannot be edited")}</h2>
        <p className="mt-2 text-sm leading-6 text-steel">{tc("Closed or cancelled collection cases are locked from normal edits.")}</p>
        <Link href={`/sales/collections/${initialCase.id}`} className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to collection case")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{initialCase ? tc("Edit collection case") : tc("New collection case")}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc(collectionsSafeWording)}</p>
        <div className="mt-4 space-y-3">
          {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to manage collection cases.")}</StatusMessage> : null}
          {loading ? <StatusMessage type="loading">{tc("Loading collection case setup data...")}</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
          {message ? <StatusMessage type="success">{message}</StatusMessage> : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Case number")}</span>
            <input value={initialCase?.caseNumber ?? numberPreview?.caseNumber ?? tc("From sequence")} readOnly aria-label={tc("Collection case number")} className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none" />
            <span className="mt-1 block text-xs text-steel">{initialCase ? tc("Collection case number assigned from the sequence.") : numberPreview?.helperText ? tc(numberPreview.helperText) : tc("Assigned from the collection case sequence when saved.")}</span>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Customer")}</span>
            <select value={customerId} onChange={(event) => selectCustomer(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("Select customer")}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.displayName ?? customer.name}</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Outstanding invoice")}</span>
            <select value={salesInvoiceId} onChange={(event) => setSalesInvoiceId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("Customer-level collection case")}</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {formatAppMoney(invoice.balanceDue, invoice.currency, locale)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-steel">{invoiceLoading ? tc("Loading outstanding invoices...") : tc("Invoice-linked cases use existing invoice balances for display only.")}</span>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Status")}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as CollectionCaseStatus)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {selectableStatuses.map((option) => (
                <option key={option} value={option}>{tc(collectionStatusLabel(option))}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Priority")}</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as CollectionPriority)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {collectionPriorities.map((option) => (
                <option key={option} value={option}>{tc(collectionPriorityLabel(option))}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Next follow-up")}</span>
            <input type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Next action date")}</span>
            <input type="date" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Promised payment date")}</span>
            <input type="date" value={promisedPaymentDate} onChange={(event) => setPromisedPaymentDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Promised amount")}</span>
            <input inputMode="decimal" value={promisedAmount} onChange={(event) => setPromisedAmount(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Summary")}</span>
            <input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={tc("Short internal collection summary")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Internal notes")}</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>

        {selectedInvoice ? (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-steel">
            {tc("Linked invoice {number} has outstanding balance {amount}. Due date {dueDate}. Aging bucket {bucket}. Saving this case does not change invoice balance or allocate payment.", {
              number: selectedInvoice.invoiceNumber,
              amount: formatAppMoney(selectedInvoice.balanceDue, selectedInvoice.currency, locale),
              dueDate: formatAppDate(selectedInvoice.dueDate, locale, "-"),
              bucket: tc(agingBucketLabel(selectedInvoice.dueDate)),
            })}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={submitting || loading || !customerId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            {submitting ? tc("Saving...") : initialCase ? tc("Save collection case") : tc("Create collection case")}
          </button>
          <Link href={initialCase ? `/sales/collections/${initialCase.id}` : "/sales/collections"} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Cancel")}
          </Link>
        </div>
      </div>
    </form>
  );
}

function dateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

function agingBucketLabel(dueDate: string | null | undefined): string {
  if (!dueDate) {
    return "No due date";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  if (days <= 0) {
    return "Current";
  }
  if (days <= 30) {
    return "1-30 days";
  }
  if (days <= 60) {
    return "31-60 days";
  }
  if (days <= 90) {
    return "61-90 days";
  }
  return "90+ days";
}
