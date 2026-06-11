"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import type { Account, AccountType, Branch, Contact, Item, SalesInvoice, SalesInvoiceTaxMode, TaxRate } from "@/lib/types";

interface InvoiceLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface SalesInvoiceFormProps {
  initialInvoice?: SalesInvoice;
  initialCustomerId?: string;
}

interface InvoiceNumberPreview {
  invoiceNumber: string;
  editable: boolean;
  overrideAllowed: boolean;
  helperText: string;
}

function makeLine(): InvoiceLineState {
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

function optionalDateInputValue(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function SalesInvoiceForm({ initialInvoice, initialCustomerId = "" }: SalesInvoiceFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerId, setCustomerId] = useState(initialInvoice?.customerId ?? initialCustomerId);
  const [branchId, setBranchId] = useState(initialInvoice?.branchId ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initialInvoice?.issueDate));
  const [dueDate, setDueDate] = useState(optionalDateInputValue(initialInvoice?.dueDate));
  const [taxMode, setTaxMode] = useState<SalesInvoiceTaxMode>(initialInvoice?.taxMode ?? "TAX_EXCLUSIVE");
  const [notes, setNotes] = useState(initialInvoice?.notes ?? "");
  const [terms, setTerms] = useState(initialInvoice?.terms ?? "");
  const [lines, setLines] = useState<InvoiceLineState[]>(
    initialInvoice?.lines?.map((line) => ({
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
  const [returnTo, setReturnTo] = useState("");
  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState<InvoiceNumberPreview | null>(null);

  const postingRevenueAccounts = accounts.filter((account) => account.isActive && account.allowPosting && account.type === "REVENUE");
  const activeSalesTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "SALES" || taxRate.scope === "BOTH"));
  const activeItems = items.filter((item) => item.status === "ACTIVE");
  const preview = useMemo(
    () =>
      calculateInvoicePreview(
        lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          taxRate: taxMode === "NO_TAX" ? "0.0000" : (activeSalesTaxRates.find((taxRate) => taxRate.id === line.taxRateId)?.rate ?? "0.0000"),
        })),
        taxMode,
      ),
    [activeSalesTaxRates, lines, taxMode],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    setReturnTo(safeReturnToFromSearch(window.location.search));

    if (!initialInvoice && !initialCustomerId) {
      const queryCustomerId = query.get("customerId") ?? "";
      if (queryCustomerId) {
        setCustomerId(queryCustomerId);
      }
    }
  }, [initialInvoice, initialCustomerId]);

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
      apiRequest<Account[]>("/accounts"),
      apiRequest<TaxRate[]>("/tax-rates"),
      apiRequest<Branch[]>("/branches"),
      initialInvoice ? Promise.resolve(null) : apiRequest<InvoiceNumberPreview>("/sales-invoices/next-number"),
    ])
      .then(([contactResult, itemResult, accountResult, taxRateResult, branchResult, invoiceNumberResult]) => {
        if (cancelled) {
          return;
        }

        setCustomers(contactResult.filter((contact) => contact.isActive && (contact.type === "CUSTOMER" || contact.type === "BOTH")));
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
        setInvoiceNumberPreview(invoiceNumberResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load invoice setup data.");
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
  }, [initialInvoice, organizationId]);

  function updateLine(lineId: string, patch: Partial<InvoiceLineState>) {
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
      taxRateId: taxMode === "NO_TAX" ? "" : (item.salesTaxRateId ?? ""),
    });
  }

  function updateTaxMode(nextTaxMode: SalesInvoiceTaxMode) {
    setTaxMode(nextTaxMode);
    if (nextTaxMode === "NO_TAX") {
      setLines((current) => current.map((line) => ({ ...line, taxRateId: "" })));
    }
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
        branchId: branchId || null,
        issueDate: `${issueDate}T00:00:00.000Z`,
        dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
        currency: "SAR",
        taxMode,
        notes: notes || undefined,
        terms: terms || undefined,
        lines: lines.map((line, index) => ({
          itemId: line.itemId || undefined,
          description: line.description,
          accountId: line.accountId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate || "0.0000",
          taxRateId: taxMode === "NO_TAX" ? null : line.taxRateId || null,
          sortOrder: index,
        })),
      };

      const invoice = initialInvoice
        ? await apiRequest<SalesInvoice>(`/sales-invoices/${initialInvoice.id}`, { method: "PATCH", body })
        : await apiRequest<SalesInvoice>("/sales-invoices", { method: "POST", body });

      router.push(returnTo || `/sales/invoices/${invoice.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialInvoice && initialInvoice.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">Only draft invoices can be edited.</StatusMessage>
        <Link href={`/sales/invoices/${initialInvoice.id}`} className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to invoice
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
            <span className="text-sm font-medium text-slate-700">Invoice number</span>
            <input
              value={initialInvoice?.invoiceNumber ?? invoiceNumberPreview?.invoiceNumber ?? "From sequence"}
              readOnly
              aria-label="Invoice number"
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
            />
            <span className="mt-1 block text-xs leading-5 text-steel">
              {initialInvoice ? "Draft invoice number assigned from the sequence." : (invoiceNumberPreview?.helperText ?? "Assigned from the invoice sequence when saved.")}
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tax mode</span>
            <select value={taxMode} onChange={(event) => updateTaxMode(event.target.value as SalesInvoiceTaxMode)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="TAX_EXCLUSIVE">Tax exclusive</option>
              <option value="TAX_INCLUSIVE">Tax inclusive</option>
              <option value="NO_TAX">No tax</option>
            </select>
            <span className="mt-1 block text-xs leading-5 text-steel">
              {taxMode === "TAX_INCLUSIVE" ? "Entered line prices include VAT; LedgerByte extracts the tax portion." : taxMode === "NO_TAX" ? "Line tax rates are ignored and invoice tax is zero." : "Line prices exclude VAT; tax is added to the total."}
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Issue date</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Due date</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
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
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Terms</span>
            <input value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading invoice setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && customers.length === 0 ? (
          <StatusMessage type="empty">
            Add a customer before creating the first invoice.{" "}
            <Link href="/contacts" className="font-semibold text-palm hover:underline">
              Open contacts
            </Link>
            .
          </StatusMessage>
        ) : null}
        {!loading && organizationId && postingRevenueAccounts.length === 0 ? (
          <StatusMessage type="empty">
            Add or activate a posting revenue account before saving invoice lines.{" "}
            <Link href="/accounts" className="font-semibold text-palm hover:underline">
              Open accounts
            </Link>
            .
          </StatusMessage>
        ) : null}
        {!loading && organizationId && taxMode !== "NO_TAX" && activeSalesTaxRates.length === 0 ? (
          <StatusMessage type="info">
            No active sales tax rate is available. You can save non-taxed draft lines, or review{" "}
            <Link href="/tax-rates" className="font-semibold text-palm hover:underline">
              VAT/tax rates
            </Link>
            {" "}before customer-facing invoices.
          </StatusMessage>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="grid min-w-[1240px] grid-cols-[1fr_1.2fr_1.25fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
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
            <div key={line.id} className="grid min-w-[1240px] grid-cols-[1fr_1.2fr_1.25fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
              <select value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">No item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </option>
                ))}
              </select>
              <input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <AccountPicker accounts={postingRevenueAccounts} value={line.accountId} onChange={(accountId) => updateLine(line.id, { accountId })} lineNumber={index + 1} />
              <input inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <select value={taxMode === "NO_TAX" ? "" : line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} disabled={taxMode === "NO_TAX"} className="rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">{taxMode === "NO_TAX" ? "No tax mode" : "No tax"}</option>
                {taxMode === "NO_TAX"
                  ? null
                  : activeSalesTaxRates.map((taxRate) => (
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
        <div className="flex min-w-[1240px] items-center justify-between px-4 py-3 text-sm">
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
            <span className="font-semibold text-ink">Total</span>
            <span className="font-mono font-semibold text-ink">{formatMoneyAmount(preview.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={!organizationId || loading || submitting || !preview.valid} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Saving..." : initialInvoice ? "Save changes" : "Create draft invoice"}
        </button>
        <Link href={returnTo || "/sales/invoices"} className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function AccountPicker({
  accounts,
  value,
  onChange,
  lineNumber,
}: {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
  lineNumber: number;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredAccounts = accounts.filter((account) => {
    if (!normalizedQuery) {
      return true;
    }
    return `${account.code} ${account.name} ${account.type}`.toLowerCase().includes(normalizedQuery);
  });
  const grouped = groupAccountsByType(filteredAccounts);

  return (
    <div className="space-y-1">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={`Search posting account for line ${lineNumber}`}
        placeholder="Search accounts"
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-palm"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-label={`Posting account for line ${lineNumber}`}
        className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
      >
        <option value="">Select account</option>
        {Object.entries(grouped).map(([type, group]) => (
          <optgroup key={type} label={formatAccountType(type as AccountType)}>
            {group.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function groupAccountsByType(accounts: Account[]): Partial<Record<AccountType, Account[]>> {
  return accounts.reduce<Partial<Record<AccountType, Account[]>>>((groups, account) => {
    const current = groups[account.type] ?? [];
    groups[account.type] = [...current, account];
    return groups;
  }, {});
}

function formatAccountType(type: AccountType): string {
  return type
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function getValidationError(customerId: string, lines: InvoiceLineState[], previewValid: boolean): string {
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

  return previewValid ? "" : "Invoice lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%.";
}
