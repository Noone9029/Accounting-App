"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerPanel,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import {
  collectionPriorities,
  collectionPriorityLabel,
  collectionStatusLabel,
  collectionsSafeWording,
} from "@/lib/collections";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { apiRequest } from "@/lib/api";
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load collection case setup data.");
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
  }, [initialCase, organizationId]);

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
          setError(loadError instanceof Error ? loadError.message : "Unable to load open invoices for this customer.");
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
  }, [customerId, initialCase?.salesInvoice, organizationId]);

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
      setMessage(initialCase ? "Collection case updated." : "Collection case created.");
      router.push(returnTo || `/sales/collections/${collectionCase.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save collection case.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialCase && (initialCase.status === "CLOSED" || initialCase.status === "CANCELLED")) {
    return (
      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">Collection case cannot be edited</h2>
        <p className="mt-2 text-sm leading-6 text-steel">Closed or cancelled collection cases are locked from normal edits.</p>
        <LedgerButton href={`/sales/collections/${initialCase.id}`} className="mt-4">
          Back to collection case
        </LedgerButton>
      </LedgerPanel>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <LedgerFormSection title={initialCase ? "Edit collection case" : "New collection case"} description={collectionsSafeWording}>
        <div className="space-y-3 md:col-span-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to manage collection cases.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading collection case setup data...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {message ? <LedgerAlert tone="success">{message}</LedgerAlert> : null}
        </div>

        <LedgerFieldLabel>
          <LedgerFieldText>Case number</LedgerFieldText>
          <LedgerInput value={initialCase?.caseNumber ?? numberPreview?.caseNumber ?? "From sequence"} readOnly aria-label="Collection case number" className="bg-slate-50 text-slate-700" />
          <LedgerFieldHelp>{initialCase ? "Collection case number assigned from the sequence." : numberPreview?.helperText ?? "Assigned from the collection case sequence when saved."}</LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Customer</LedgerFieldText>
          <LedgerSelect value={customerId} onChange={(event) => selectCustomer(event.target.value)} required>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.displayName ?? customer.name}</option>
              ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-3">
          <LedgerFieldText>Outstanding invoice</LedgerFieldText>
          <LedgerSelect value={salesInvoiceId} onChange={(event) => setSalesInvoiceId(event.target.value)}>
              <option value="">Customer-level collection case</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {formatMoneyAmount(invoice.balanceDue, invoice.currency)}
                </option>
              ))}
          </LedgerSelect>
          <LedgerFieldHelp>{invoiceLoading ? "Loading outstanding invoices..." : "Invoice-linked cases use existing invoice balances for display only."}</LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Status</LedgerFieldText>
          <LedgerSelect value={status} onChange={(event) => setStatus(event.target.value as CollectionCaseStatus)}>
              {selectableStatuses.map((option) => (
                <option key={option} value={option}>{collectionStatusLabel(option)}</option>
              ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Priority</LedgerFieldText>
          <LedgerSelect value={priority} onChange={(event) => setPriority(event.target.value as CollectionPriority)}>
              {collectionPriorities.map((option) => (
                <option key={option} value={option}>{collectionPriorityLabel(option)}</option>
              ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Next follow-up</LedgerFieldText>
          <LedgerInput type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Next action date</LedgerFieldText>
          <LedgerInput type="date" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Promised payment date</LedgerFieldText>
          <LedgerInput type="date" value={promisedPaymentDate} onChange={(event) => setPromisedPaymentDate(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Promised amount</LedgerFieldText>
          <LedgerInput inputMode="decimal" value={promisedAmount} onChange={(event) => setPromisedAmount(event.target.value)} placeholder="0.0000" />
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-3">
          <LedgerFieldText>Summary</LedgerFieldText>
          <LedgerInput value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Short internal collection summary" />
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-3">
          <LedgerFieldText>Internal notes</LedgerFieldText>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-palm focus:ring-2 focus:ring-palm/10 disabled:bg-slate-50 disabled:text-slate-400" />
        </LedgerFieldLabel>

        {selectedInvoice ? (
          <div className="md:col-span-3">
            <LedgerSummaryBand tone="info">
              Linked invoice <span className="font-mono text-ink">{selectedInvoice.invoiceNumber}</span> has outstanding balance <span className="font-mono text-ink">{formatMoneyAmount(selectedInvoice.balanceDue, selectedInvoice.currency)}</span>.
              <span className="ml-1">Due date <span className="font-mono text-ink">{formatOptionalDate(selectedInvoice.dueDate, "-")}</span>.</span>
              <span className="ml-1">Aging bucket <span className="font-mono text-ink">{agingBucketLabel(selectedInvoice.dueDate)}</span>.</span>
              <span className="ml-1">Saving this case does not change invoice balance or allocate payment.</span>
            </LedgerSummaryBand>
          </div>
        ) : null}

        <LedgerActionBar className="md:col-span-3">
          <LedgerButton type="submit" disabled={submitting || loading || !customerId} variant="primary">
            {submitting ? "Saving..." : initialCase ? "Save collection case" : "Create collection case"}
          </LedgerButton>
          <LedgerButton href={initialCase ? `/sales/collections/${initialCase.id}` : "/sales/collections"}>
            Cancel
          </LedgerButton>
        </LedgerActionBar>
      </LedgerFormSection>
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
