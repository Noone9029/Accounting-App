"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
  LedgerTableShell,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { safeReturnToFromSearch } from "@/lib/parties";
import type { Branch, Contact, DeliveryNote, Item, SalesInvoice, SalesQuote } from "@/lib/types";

interface DeliveryNoteLineState {
  id: string;
  itemId: string;
  description: string;
  quantity: string;
  unitOfMeasure: string;
  sourceSalesInvoiceLineId: string;
  sourceSalesQuoteLineId: string;
  sourceSalesStockIssueLineId: string;
}

interface DeliveryNoteFormProps {
  initialDeliveryNote?: DeliveryNote;
  initialCustomerId?: string;
}

interface DeliveryNoteNumberPreview {
  deliveryNoteNumber: string;
  editable: boolean;
  overrideAllowed: boolean;
  helperText: string;
}

function makeLine(): DeliveryNoteLineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `delivery-note-line-${Date.now()}-${Math.random()}`,
    itemId: "",
    description: "",
    quantity: "1.0000",
    unitOfMeasure: "",
    sourceSalesInvoiceLineId: "",
    sourceSalesQuoteLineId: "",
    sourceSalesStockIssueLineId: "",
  };
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value?: string | null, fallback = todayInputValue()): string {
  return value ? new Date(value).toISOString().slice(0, 10) : fallback;
}

function optionalDateInputValue(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function DeliveryNoteForm({ initialDeliveryNote, initialCustomerId = "" }: DeliveryNoteFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [salesQuotes, setSalesQuotes] = useState<SalesQuote[]>([]);
  const [customerId, setCustomerId] = useState(initialDeliveryNote?.customerId ?? initialCustomerId);
  const [branchId, setBranchId] = useState(initialDeliveryNote?.branchId ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initialDeliveryNote?.issueDate));
  const [deliveryDate, setDeliveryDate] = useState(optionalDateInputValue(initialDeliveryNote?.deliveryDate));
  const [reference, setReference] = useState(initialDeliveryNote?.reference ?? "");
  const [relatedSalesInvoiceId, setRelatedSalesInvoiceId] = useState(initialDeliveryNote?.relatedSalesInvoiceId ?? "");
  const [relatedSalesQuoteId, setRelatedSalesQuoteId] = useState(initialDeliveryNote?.relatedSalesQuoteId ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryNote?.deliveryAddress ?? "");
  const [notes, setNotes] = useState(initialDeliveryNote?.notes ?? "");
  const [instructions, setInstructions] = useState(initialDeliveryNote?.instructions ?? "");
  const [lines, setLines] = useState<DeliveryNoteLineState[]>(
    initialDeliveryNote?.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId ?? "",
      description: line.description,
      quantity: line.quantity,
      unitOfMeasure: line.unitOfMeasure ?? "",
      sourceSalesInvoiceLineId: line.sourceSalesInvoiceLineId ?? "",
      sourceSalesQuoteLineId: line.sourceSalesQuoteLineId ?? "",
      sourceSalesStockIssueLineId: line.sourceSalesStockIssueLineId ?? "",
    })) ?? [makeLine()],
  );
  const [numberPreview, setNumberPreview] = useState<DeliveryNoteNumberPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const activeCustomers = useMemo(
    () => customers.filter((customer) => customer.isActive && (customer.type === "CUSTOMER" || customer.type === "BOTH")),
    [customers],
  );
  const activeItems = useMemo(() => items.filter((item) => item.status === "ACTIVE"), [items]);
  const filteredInvoices = useMemo(
    () => salesInvoices.filter((invoice) => invoice.status !== "VOIDED" && (!customerId || invoice.customerId === customerId)),
    [customerId, salesInvoices],
  );
  const filteredAcceptedQuotes = useMemo(
    () => salesQuotes.filter((quote) => quote.status === "ACCEPTED" && (!customerId || quote.customerId === customerId)),
    [customerId, salesQuotes],
  );

  useEffect(() => {
    if (initialDeliveryNote || initialCustomerId || typeof window === "undefined") {
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const queryCustomerId = query.get("customerId") ?? "";
    if (queryCustomerId) {
      setCustomerId(queryCustomerId);
    }
    setReturnTo(safeReturnToFromSearch(window.location.search));
  }, [initialCustomerId, initialDeliveryNote]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      apiRequest<Item[]>("/items"),
      apiRequest<Branch[]>("/branches"),
      apiRequest<SalesInvoice[]>("/sales-invoices"),
      apiRequest<SalesQuote[]>("/sales-quotes"),
      initialDeliveryNote ? Promise.resolve(null) : apiRequest<DeliveryNoteNumberPreview>("/delivery-notes/next-number"),
    ])
      .then(([contactResult, itemResult, branchResult, invoiceResult, quoteResult, numberResult]) => {
        if (cancelled) {
          return;
        }
        setCustomers(contactResult);
        setItems(itemResult);
        setBranches(branchResult);
        setSalesInvoices(invoiceResult);
        setSalesQuotes(quoteResult);
        setNumberPreview(numberResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load delivery note setup data.");
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
  }, [initialDeliveryNote, organizationId]);

  function updateLine(lineId: string, patch: Partial<DeliveryNoteLineState>) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function selectItem(lineId: string, itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    updateLine(lineId, {
      itemId,
      description: item ? item.description ?? item.name : "",
    });
  }

  async function copyFromInvoice(invoiceId: string) {
    setRelatedSalesInvoiceId(invoiceId);
    setRelatedSalesQuoteId("");
    if (!invoiceId) {
      return;
    }
    try {
      const invoice = await apiRequest<SalesInvoice>(`/sales-invoices/${invoiceId}`);
      setCustomerId(invoice.customerId);
      setBranchId(invoice.branchId ?? "");
      setReference(invoice.invoiceNumber);
      setLines(
        (invoice.lines ?? []).map((line) => ({
          id: globalThis.crypto?.randomUUID?.() ?? `delivery-note-invoice-line-${line.id}`,
          itemId: line.itemId ?? "",
          description: line.description,
          quantity: line.quantity,
          unitOfMeasure: "",
          sourceSalesInvoiceLineId: line.id,
          sourceSalesQuoteLineId: "",
          sourceSalesStockIssueLineId: "",
        })),
      );
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy invoice lines into the delivery note.");
    }
  }

  async function copyFromQuote(quoteId: string) {
    setRelatedSalesQuoteId(quoteId);
    setRelatedSalesInvoiceId("");
    if (!quoteId) {
      return;
    }
    try {
      const quote = await apiRequest<SalesQuote>(`/sales-quotes/${quoteId}`);
      setCustomerId(quote.customerId);
      setBranchId(quote.branchId ?? "");
      setReference(quote.quoteNumber);
      setLines(
        (quote.lines ?? []).map((line) => ({
          id: globalThis.crypto?.randomUUID?.() ?? `delivery-note-quote-line-${line.id}`,
          itemId: line.itemId ?? "",
          description: line.description,
          quantity: line.quantity,
          unitOfMeasure: "",
          sourceSalesInvoiceLineId: "",
          sourceSalesQuoteLineId: line.id,
          sourceSalesStockIssueLineId: "",
        })),
      );
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy quote lines into the delivery note.");
    }
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError({ customerId, issueDate, deliveryDate, lines });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId,
        branchId: branchId || null,
        issueDate: `${issueDate}T00:00:00.000Z`,
        deliveryDate: deliveryDate ? `${deliveryDate}T00:00:00.000Z` : null,
        reference: reference || undefined,
        relatedSalesInvoiceId: relatedSalesInvoiceId || null,
        relatedSalesQuoteId: relatedSalesQuoteId || null,
        deliveryAddress: deliveryAddress || undefined,
        notes: notes || undefined,
        instructions: instructions || undefined,
        lines: lines.map((line, index) => ({
          itemId: line.itemId || undefined,
          description: line.description,
          quantity: line.quantity,
          unitOfMeasure: line.unitOfMeasure || undefined,
          sourceSalesInvoiceLineId: line.sourceSalesInvoiceLineId || undefined,
          sourceSalesQuoteLineId: line.sourceSalesQuoteLineId || undefined,
          sourceSalesStockIssueLineId: line.sourceSalesStockIssueLineId || undefined,
          sortOrder: index,
        })),
      };

      const deliveryNote = initialDeliveryNote
        ? await apiRequest<DeliveryNote>(`/delivery-notes/${initialDeliveryNote.id}`, { method: "PATCH", body })
        : await apiRequest<DeliveryNote>("/delivery-notes", { method: "POST", body });

      router.push(returnTo || `/sales/delivery-notes/${deliveryNote.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save delivery note.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialDeliveryNote && initialDeliveryNote.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <LedgerAlert tone="danger">Only draft delivery notes can be edited.</LedgerAlert>
        <LedgerButton href={`/sales/delivery-notes/${initialDeliveryNote.id}`} icon={ArrowLeft}>
          Back to delivery note
        </LedgerButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <LedgerAlert tone="info">Delivery notes are operational, non-posting fulfillment documents. They do not create journals, AR balances, VAT filing, ZATCA submission, payment, email, or inventory movement by themselves.</LedgerAlert>

      <LedgerFormSection title="Delivery details" description="Set the customer, dates, source reference, and delivery instructions for this non-posting fulfillment document.">
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Customer</LedgerFieldText>
          <LedgerSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
            <option value="">Select customer</option>
            {activeCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName ?? customer.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Delivery note number</LedgerFieldText>
          <LedgerInput value={initialDeliveryNote?.deliveryNoteNumber ?? numberPreview?.deliveryNoteNumber ?? "From sequence"} readOnly aria-label="Delivery note number" className="bg-slate-50 text-slate-700" />
          <LedgerFieldHelp>
            {initialDeliveryNote ? "Delivery note number assigned from the sequence." : (numberPreview?.helperText ?? "Assigned from the delivery note sequence when saved.")}
          </LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Branch</LedgerFieldText>
          <LedgerSelect value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">No branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.displayName ?? branch.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Issue date</LedgerFieldText>
          <LedgerInput type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Delivery date</LedgerFieldText>
          <LedgerInput type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Reference</LedgerFieldText>
          <LedgerInput value={reference} onChange={(event) => setReference(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Source invoice</LedgerFieldText>
          <LedgerSelect value={relatedSalesInvoiceId} onChange={(event) => void copyFromInvoice(event.target.value)}>
            <option value="">No invoice source</option>
            {filteredInvoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber} - {invoice.customer?.displayName ?? invoice.customer?.name ?? "Customer"} - {invoice.status}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Accepted quote source</LedgerFieldText>
          <LedgerSelect value={relatedSalesQuoteId} onChange={(event) => void copyFromQuote(event.target.value)}>
            <option value="">No quote source</option>
            {filteredAcceptedQuotes.map((quote) => (
              <option key={quote.id} value={quote.id}>
                {quote.quoteNumber} - {quote.customer?.displayName ?? quote.customer?.name ?? "Customer"}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Delivery address</LedgerFieldText>
          <textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} rows={3} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-palm focus:ring-2 focus:ring-palm/10" />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Notes</LedgerFieldText>
          <LedgerInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Instructions</LedgerFieldText>
          <LedgerInput value={instructions} onChange={(event) => setInstructions(event.target.value)} />
        </LedgerFieldLabel>
      </LedgerFormSection>

      <div className="space-y-3">
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization before creating delivery notes.</LedgerAlert> : null}
        {loading ? <StatusMessage type="loading">Loading delivery note setup data...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      </div>

      <LedgerPanel>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Delivery lines</h2>
            <p className="mt-1 text-sm leading-6 text-steel">Lines describe what should be delivered. They do not carry price, VAT, posting, payment, or inventory movement data.</p>
          </div>
          <span className="text-sm text-steel">{lines.length} delivery line{lines.length === 1 ? "" : "s"}</span>
        </div>
        <LedgerTableShell minWidth="880px">
          <div className="grid min-w-[880px] grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
            <div>Item</div>
            <div>Description</div>
            <div>Quantity</div>
            <div>Unit</div>
            <div></div>
          </div>
          {lines.map((line, index) => (
            <div key={line.id} className="grid min-w-[880px] grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
              <LedgerSelect aria-label={`Item for delivery note line ${index + 1}`} value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)}>
                <option value="">No item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </option>
                ))}
              </LedgerSelect>
              <LedgerInput aria-label={`Description for delivery note line ${index + 1}`} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required />
              <LedgerInput aria-label={`Quantity for delivery note line ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
              <LedgerInput aria-label={`Unit for delivery note line ${index + 1}`} value={line.unitOfMeasure} onChange={(event) => updateLine(line.id, { unitOfMeasure: event.target.value })} placeholder="each" />
              <LedgerButton type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} size="sm" icon={Trash2}>
                Remove
              </LedgerButton>
            </div>
          ))}
          <div className="flex min-w-[880px] items-center justify-between px-4 py-3 text-sm">
            <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])} icon={Plus}>
              Add line
            </LedgerButton>
          </div>
        </LedgerTableShell>
      </LedgerPanel>

      <LedgerActionBar>
        <LedgerButton type="submit" variant="primary" disabled={!organizationId || loading || submitting}>
          {submitting ? "Saving..." : initialDeliveryNote ? "Save draft delivery note" : "Create draft delivery note"}
        </LedgerButton>
        <LedgerButton href={returnTo || "/sales/delivery-notes"}>
          Cancel
        </LedgerButton>
      </LedgerActionBar>
    </form>
  );
}

function getValidationError({
  customerId,
  issueDate,
  deliveryDate,
  lines,
}: {
  customerId: string;
  issueDate: string;
  deliveryDate: string;
  lines: DeliveryNoteLineState[];
}): string {
  if (!customerId) {
    return "Choose a customer.";
  }
  if (deliveryDate && deliveryDate < issueDate) {
    return "Delivery date cannot be before issue date.";
  }
  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return `Line ${index + 1} needs a description.`;
    }
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return `Line ${index + 1} needs a positive quantity.`;
    }
  }
  return "";
}
