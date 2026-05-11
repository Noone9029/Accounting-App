"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import type { Account, Branch, Contact, CreditNote, Item, SalesInvoice, TaxRate } from "@/lib/types";

interface CreditNoteLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface CreditNoteFormProps {
  initialCreditNote?: CreditNote;
  initialCustomerId?: string;
  initialInvoiceId?: string;
}

function makeLine(): CreditNoteLineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`,
    itemId: "",
    description: "",
    accountId: "",
    quantity: "1.0000",
    unitPrice: "0.0000",
    discountRate: "0.0000",
    taxRateId: "",
  };
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value?: string | null, fallback = todayInputValue()): string {
  if (!value) {
    return fallback;
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function CreditNoteForm({ initialCreditNote, initialCustomerId = "", initialInvoiceId = "" }: CreditNoteFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerId, setCustomerId] = useState(initialCreditNote?.customerId ?? initialCustomerId);
  const [originalInvoiceId, setOriginalInvoiceId] = useState(initialCreditNote?.originalInvoiceId ?? initialInvoiceId);
  const [branchId, setBranchId] = useState(initialCreditNote?.branchId ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initialCreditNote?.issueDate));
  const [notes, setNotes] = useState(initialCreditNote?.notes ?? "");
  const [reason, setReason] = useState(initialCreditNote?.reason ?? "");
  const [lines, setLines] = useState<CreditNoteLineState[]>(
    initialCreditNote?.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId ?? "",
      description: line.description,
      accountId: line.accountId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      taxRateId: line.taxRateId ?? "",
    })) ?? [makeLine()],
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const postingRevenueAccounts = accounts.filter((account) => account.isActive && account.allowPosting && account.type === "REVENUE");
  const activeSalesTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "SALES" || taxRate.scope === "BOTH"));
  const activeItems = items.filter((item) => item.status === "ACTIVE");
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customerId && invoice.status === "FINALIZED");
  const selectedOriginalInvoice = customerInvoices.find((invoice) => invoice.id === originalInvoiceId);
  const preview = useMemo(
    () =>
      calculateInvoicePreview(
        lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          taxRate: activeSalesTaxRates.find((taxRate) => taxRate.id === line.taxRateId)?.rate ?? "0.0000",
        })),
      ),
    [activeSalesTaxRates, lines],
  );

  useEffect(() => {
    if (initialCreditNote || initialCustomerId || initialInvoiceId || typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const queryCustomerId = query.get("customerId") ?? "";
    const queryInvoiceId = query.get("invoiceId") ?? "";
    if (queryCustomerId) {
      setCustomerId(queryCustomerId);
    }
    if (queryInvoiceId) {
      setOriginalInvoiceId(queryInvoiceId);
    }
  }, [initialCreditNote, initialCustomerId, initialInvoiceId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      apiRequest<SalesInvoice[]>("/sales-invoices"),
      apiRequest<Item[]>("/items"),
      apiRequest<Account[]>("/accounts"),
      apiRequest<TaxRate[]>("/tax-rates"),
      apiRequest<Branch[]>("/branches"),
    ])
      .then(([contactResult, invoiceResult, itemResult, accountResult, taxRateResult, branchResult]) => {
        if (cancelled) {
          return;
        }

        setCustomers(contactResult.filter((contact) => contact.isActive && (contact.type === "CUSTOMER" || contact.type === "BOTH")));
        setInvoices(invoiceResult);
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load credit note setup data.");
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
  }, [organizationId]);

  useEffect(() => {
    if (invoices.length > 0 && originalInvoiceId && customerId && !customerInvoices.some((invoice) => invoice.id === originalInvoiceId)) {
      setOriginalInvoiceId("");
    }
  }, [customerId, customerInvoices, invoices.length, originalInvoiceId]);

  function updateLine(lineId: string, patch: Partial<CreditNoteLineState>) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function selectItem(lineId: string, itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) {
      updateLine(lineId, { itemId: "", description: "", unitPrice: "0.0000" });
      return;
    }

    updateLine(lineId, {
      itemId,
      description: item.description ?? item.name,
      accountId: item.revenueAccountId,
      unitPrice: item.sellingPrice,
      taxRateId: item.salesTaxRateId ?? "",
    });
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError(customerId, lines, preview.valid);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId,
        originalInvoiceId: originalInvoiceId || null,
        branchId: branchId || null,
        issueDate: `${issueDate}T00:00:00.000Z`,
        currency: "SAR",
        notes: notes || undefined,
        reason: reason || undefined,
        lines: lines.map((line, index) => ({
          itemId: line.itemId || undefined,
          description: line.description,
          accountId: line.accountId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate || "0.0000",
          taxRateId: line.taxRateId || null,
          sortOrder: index,
        })),
      };

      const creditNote = initialCreditNote
        ? await apiRequest<CreditNote>(`/credit-notes/${initialCreditNote.id}`, { method: "PATCH", body })
        : await apiRequest<CreditNote>("/credit-notes", { method: "POST", body });

      router.push(`/sales/credit-notes/${creditNote.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save credit note.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialCreditNote && initialCreditNote.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">Only draft credit notes can be edited.</StatusMessage>
        <Link href={`/sales/credit-notes/${initialCreditNote.id}`} className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to credit note
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
            <span className="text-sm font-medium text-slate-700">Issue date</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Branch</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">No branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.displayName ?? branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Original invoice</span>
            <select value={originalInvoiceId} onChange={(event) => setOriginalInvoiceId(event.target.value)} disabled={!customerId} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-50">
              <option value="">Standalone credit note</option>
              {customerInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {formatMoneyAmount(invoice.total, invoice.currency)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Reason</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Return, adjustment, discount" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        {selectedOriginalInvoice ? (
          <p className="mt-3 text-xs text-steel">
            Linked to invoice {selectedOriginalInvoice.invoiceNumber}. Credit note total is validated against the original invoice total.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating credit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading credit note setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="grid min-w-[1120px] grid-cols-[1fr_1.2fr_1fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
          <div>Item</div>
          <div>Description</div>
          <div>Revenue account</div>
          <div>Qty</div>
          <div>Price</div>
          <div>Discount %</div>
          <div>Tax</div>
          <div>Total</div>
          <div></div>
        </div>
        {lines.map((line, index) => {
          const previewLine = preview.lines[index];
          return (
            <div key={line.id} className="grid min-w-[1120px] grid-cols-[1fr_1.2fr_1fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
              <select value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">No item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </option>
                ))}
              </select>
              <input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <select value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">Select account</option>
                {postingRevenueAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
              <input inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <select value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">No tax</option>
                {activeSalesTaxRates.map((taxRate) => (
                  <option key={taxRate.id} value={taxRate.id}>
                    {taxRate.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center font-mono text-xs text-ink">{previewLine ? formatMoneyAmount(previewLine.lineTotalUnits) : "SAR 0.00"}</div>
              <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
                Remove
              </button>
            </div>
          );
        })}
        <div className="flex min-w-[1120px] items-center justify-between px-4 py-3 text-sm">
          <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            Add line
          </button>
          <div className="grid min-w-72 grid-cols-2 gap-2 text-right">
            <span className="text-steel">Subtotal</span>
            <span className="font-mono">{formatMoneyAmount(preview.subtotal)}</span>
            <span className="text-steel">Discount</span>
            <span className="font-mono">{formatMoneyAmount(preview.discountTotal)}</span>
            <span className="text-steel">Taxable</span>
            <span className="font-mono">{formatMoneyAmount(preview.taxableTotal)}</span>
            <span className="text-steel">VAT</span>
            <span className="font-mono">{formatMoneyAmount(preview.taxTotal)}</span>
            <span className="font-semibold text-ink">Total credit</span>
            <span className="font-mono font-semibold text-ink">{formatMoneyAmount(preview.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={!organizationId || loading || submitting || !preview.valid} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Saving..." : initialCreditNote ? "Save draft credit note" : "Create draft credit note"}
        </button>
        <Link href="/sales/credit-notes" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function getValidationError(customerId: string, lines: CreditNoteLineState[], previewValid: boolean): string {
  if (!customerId) {
    return "Choose a customer.";
  }

  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return `Line ${index + 1} needs a description.`;
    }

    if (!line.accountId) {
      return `Line ${index + 1} needs a revenue account.`;
    }
  }

  return previewValid ? "" : "Credit note lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%.";
}
