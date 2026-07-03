"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
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
  const { tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load delivery note setup data."));
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
  }, [initialDeliveryNote, organizationId, tc]);

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
      setError(copyError instanceof Error ? copyError.message : tc("Unable to copy invoice lines into the delivery note."));
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
      setError(copyError instanceof Error ? copyError.message : tc("Unable to copy quote lines into the delivery note."));
    }
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError({ customerId, issueDate, deliveryDate, lines, tc });
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
      setError(submitError instanceof Error ? submitError.message : tc("Unable to save delivery note."));
    } finally {
      setSubmitting(false);
    }
  }

  if (initialDeliveryNote && initialDeliveryNote.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">{tc("Only draft delivery notes can be edited.")}</StatusMessage>
        <Link href={`/sales/delivery-notes/${initialDeliveryNote.id}`} className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to delivery note")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <StatusMessage type="info">{tc("Delivery notes are operational, non-posting fulfillment documents. They do not create journals, AR balances, VAT filing, ZATCA submission, payment, email, or inventory movement by themselves.")}</StatusMessage>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Customer")}</span>
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("Select customer")}</option>
              {activeCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName ?? customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Delivery note number")}</span>
            <input value={initialDeliveryNote?.deliveryNoteNumber ?? numberPreview?.deliveryNoteNumber ?? tc("From sequence")} readOnly aria-label={tc("Delivery note number")} className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none" />
            <span className="mt-1 block text-xs leading-5 text-steel">
              {initialDeliveryNote ? tc("Delivery note number assigned from the sequence.") : tc(numberPreview?.helperText ?? "Assigned from the delivery note sequence when saved.")}
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Branch")}</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("No branch")}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.displayName ?? branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Issue date")}</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Delivery date")}</span>
            <input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Reference")}</span>
            <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Source invoice")}</span>
            <select value={relatedSalesInvoiceId} onChange={(event) => void copyFromInvoice(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("No invoice source")}</option>
              {filteredInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.customer?.displayName ?? invoice.customer?.name ?? tc("Customer")} - {tc(invoice.status)}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Accepted quote source")}</span>
            <select value={relatedSalesQuoteId} onChange={(event) => void copyFromQuote(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("No quote source")}</option>
              {filteredAcceptedQuotes.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  {quote.quoteNumber} - {quote.customer?.displayName ?? quote.customer?.name ?? tc("Customer")}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-4">
            <span className="text-sm font-medium text-slate-700">{tc("Delivery address")}</span>
            <textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Notes")}</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Instructions")}</span>
            <input value={instructions} onChange={(event) => setInstructions(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization before creating delivery notes.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading delivery note setup data...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="grid min-w-[880px] grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
          <div>{tc("Item")}</div>
          <div>{tc("Description")}</div>
          <div>{tc("Quantity")}</div>
          <div>{tc("Unit")}</div>
          <div></div>
        </div>
        {lines.map((line, index) => (
          <div key={line.id} className="grid min-w-[880px] grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
            <select aria-label={tc("Item for delivery note line {number}", { number: index + 1 })} value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value="">{tc("No item")}</option>
              {activeItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku ? `${item.sku} - ${item.name}` : item.name}
                </option>
              ))}
            </select>
            <input aria-label={tc("Description for delivery note line {number}", { number: index + 1 })} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
            <input aria-label={tc("Quantity for delivery note line {number}", { number: index + 1 })} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
            <input aria-label={tc("Unit for delivery note line {number}", { number: index + 1 })} value={line.unitOfMeasure} onChange={(event) => updateLine(line.id, { unitOfMeasure: event.target.value })} placeholder={tc("each")} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
            <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
              {tc("Remove")}
            </button>
          </div>
        ))}
        <div className="flex min-w-[880px] items-center justify-between px-4 py-3 text-sm">
          <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            {tc("Add line")}
          </button>
          <span className="text-steel">{tc(lines.length === 1 ? "{count} delivery line" : "{count} delivery lines", { count: lines.length })}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={!organizationId || loading || submitting} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? tc("Saving...") : initialDeliveryNote ? tc("Save draft delivery note") : tc("Create draft delivery note")}
        </button>
        <Link href={returnTo || "/sales/delivery-notes"} className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Cancel")}
        </Link>
      </div>
    </form>
  );
}

function getValidationError({
  customerId,
  issueDate,
  deliveryDate,
  lines,
  tc,
}: {
  customerId: string;
  issueDate: string;
  deliveryDate: string;
  lines: DeliveryNoteLineState[];
  tc: (value: string, params?: Record<string, string | number>) => string;
}): string {
  if (!customerId) {
    return tc("Choose a customer.");
  }
  if (deliveryDate && deliveryDate < issueDate) {
    return tc("Delivery date cannot be before issue date.");
  }
  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return tc("Line {number} needs a description.", { number: index + 1 });
    }
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return tc("Line {number} needs a positive quantity.", { number: index + 1 });
    }
  }
  return "";
}
