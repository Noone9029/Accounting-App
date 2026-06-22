"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, SaveIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerButton,
  LedgerDataTable,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerMoney,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import type { Account, AccountType, Branch, Contact, Item, SalesInvoiceTaxMode, SalesQuote, TaxRate } from "@/lib/types";

interface QuoteLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface SalesQuoteFormProps {
  initialQuote?: SalesQuote;
  initialCustomerId?: string;
}

interface QuoteNumberPreview {
  quoteNumber: string;
  editable: boolean;
  overrideAllowed: boolean;
  helperText: string;
}

function makeLine(): QuoteLineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `quote-line-${Date.now()}-${Math.random()}`,
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
  return value ? new Date(value).toISOString().slice(0, 10) : fallback;
}

function optionalDateInputValue(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function SalesQuoteForm({ initialQuote, initialCustomerId = "" }: SalesQuoteFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerId, setCustomerId] = useState(initialQuote?.customerId ?? initialCustomerId);
  const [branchId, setBranchId] = useState(initialQuote?.branchId ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initialQuote?.issueDate));
  const [expiryDate, setExpiryDate] = useState(optionalDateInputValue(initialQuote?.expiryDate));
  const [reference, setReference] = useState(initialQuote?.reference ?? "");
  const [taxMode, setTaxMode] = useState<SalesInvoiceTaxMode>(initialQuote?.taxMode ?? "TAX_EXCLUSIVE");
  const [notes, setNotes] = useState(initialQuote?.notes ?? "");
  const [terms, setTerms] = useState(initialQuote?.terms ?? "");
  const [lines, setLines] = useState<QuoteLineState[]>(
    initialQuote?.lines?.map((line) => ({
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
  const [quoteNumberPreview, setQuoteNumberPreview] = useState<QuoteNumberPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");

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
    if (initialQuote || initialCustomerId || typeof window === "undefined") {
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const queryCustomerId = query.get("customerId") ?? "";
    if (queryCustomerId) {
      setCustomerId(queryCustomerId);
    }
    setReturnTo(safeReturnToFromSearch(window.location.search));
  }, [initialCustomerId, initialQuote]);

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
      initialQuote ? Promise.resolve(null) : apiRequest<QuoteNumberPreview>("/sales-quotes/next-number"),
    ])
      .then(([contactResult, itemResult, accountResult, taxRateResult, branchResult, quoteNumberResult]) => {
        if (cancelled) {
          return;
        }
        setCustomers(contactResult.filter((contact) => contact.isActive && (contact.type === "CUSTOMER" || contact.type === "BOTH")));
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
        setQuoteNumberPreview(quoteNumberResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load quote setup data.");
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
  }, [initialQuote, organizationId]);

  function updateLine(lineId: string, patch: Partial<QuoteLineState>) {
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
        expiryDate: expiryDate ? `${expiryDate}T00:00:00.000Z` : null,
        reference: reference || undefined,
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

      const quote = initialQuote
        ? await apiRequest<SalesQuote>(`/sales-quotes/${initialQuote.id}`, { method: "PATCH", body })
        : await apiRequest<SalesQuote>("/sales-quotes", { method: "POST", body });

      router.push(returnTo || `/sales/quotes/${quote.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save sales quote.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialQuote && initialQuote.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">Only draft sales quotes can be edited.</StatusMessage>
        <LedgerButton href={`/sales/quotes/${initialQuote.id}`}>
          Back to quote
        </LedgerButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <LedgerSummaryBand tone="info">Sales quotes are non-posting. They do not create journals, AR balances, VAT filing, email delivery, ZATCA submission, payment, inventory movement, or customer statement balances until converted and finalized as a sales invoice.</LedgerSummaryBand>

      <LedgerSection title="Quote details" description="Draft quote fields stay non-posting until an accepted quote is converted into a draft invoice.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <LedgerFieldText>Quote number</LedgerFieldText>
            <LedgerInput
              value={initialQuote?.quoteNumber ?? quoteNumberPreview?.quoteNumber ?? "From sequence"}
              readOnly
              aria-label="Quote number"
              className="bg-slate-50 text-steel"
            />
            <span className="mt-1 block text-xs leading-5 text-steel">
              {initialQuote ? "Quote number assigned from the sequence." : (quoteNumberPreview?.helperText ?? "Assigned from the sales quote sequence when saved.")}
            </span>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Tax mode</LedgerFieldText>
            <LedgerSelect value={taxMode} onChange={(event) => updateTaxMode(event.target.value as SalesInvoiceTaxMode)}>
              <option value="TAX_EXCLUSIVE">Tax exclusive</option>
              <option value="TAX_INCLUSIVE">Tax inclusive</option>
              <option value="NO_TAX">No tax</option>
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Issue date</LedgerFieldText>
            <LedgerInput type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Expiry date</LedgerFieldText>
            <LedgerInput type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Reference</LedgerFieldText>
            <LedgerInput value={reference} onChange={(event) => setReference(event.target.value)} />
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
          <LedgerFieldLabel className="md:col-span-2">
            <LedgerFieldText>Notes</LedgerFieldText>
            <LedgerInput value={notes} onChange={(event) => setNotes(event.target.value)} />
          </LedgerFieldLabel>
          <LedgerFieldLabel className="md:col-span-2">
            <LedgerFieldText>Terms</LedgerFieldText>
            <LedgerInput value={terms} onChange={(event) => setTerms(event.target.value)} />
          </LedgerFieldLabel>
        </div>
      </LedgerSection>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating sales quotes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading quote setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && postingRevenueAccounts.length === 0 ? (
          <StatusMessage type="empty">
            Add or activate a posting revenue account before saving quote lines.{" "}
            <Link href="/accounts" className="font-semibold text-palm hover:underline">
              Open accounts
            </Link>
            .
          </StatusMessage>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LedgerSection title="Quote line items" description="Quote lines use the same account coding and tax preview behavior as invoice drafts, without posting." className="min-w-0">
          <LedgerDataTable minWidth="1240px">
            <thead className="bg-mist text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Revenue account</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Discount %</th>
                <th className="px-3 py-2">Tax</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => {
                const previewLine = preview.lines[index];
                return (
                  <tr key={line.id}>
                    <td className="px-3 py-2">
                      <LedgerSelect aria-label={`Item for quote line ${index + 1}`} value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)}>
                        <option value="">No item</option>
                        {activeItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.sku ? `${item.sku} - ${item.name}` : item.name}
                          </option>
                        ))}
                      </LedgerSelect>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput aria-label={`Description for quote line ${index + 1}`} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required />
                    </td>
                    <td className="px-3 py-2">
                      <AccountPicker accounts={postingRevenueAccounts} value={line.accountId} onChange={(accountId) => updateLine(line.id, { accountId })} lineNumber={index + 1} />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput aria-label={`Quantity for quote line ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput aria-label={`Price for quote line ${index + 1}`} inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput aria-label={`Discount rate for quote line ${index + 1}`} inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerSelect aria-label={`Tax rate for quote line ${index + 1}`} value={taxMode === "NO_TAX" ? "" : line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} disabled={taxMode === "NO_TAX"}>
                        <option value="">{taxMode === "NO_TAX" ? "No tax mode" : "No tax"}</option>
                        {taxMode === "NO_TAX"
                          ? null
                          : activeSalesTaxRates.map((taxRate) => (
                              <option key={taxRate.id} value={taxRate.id}>
                                {taxRate.name}
                              </option>
                            ))}
                      </LedgerSelect>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerMoney>{previewLine ? formatMoneyAmount(previewLine.lineTotalUnits) : "SAR 0.00"}</LedgerMoney>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerButton type="button" size="sm" onClick={() => removeLine(line.id)} disabled={lines.length <= 1}>
                        Remove
                      </LedgerButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </LedgerDataTable>
          <div className="mt-3">
            <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])} icon={PlusIcon}>
              Add line
            </LedgerButton>
          </div>
        </LedgerSection>

        <LedgerPanel>
          <h2 className="text-base font-semibold text-ink">Quote totals</h2>
          <div className="mt-3 space-y-3">
            <BalanceLine label="Subtotal" value={formatMoneyAmount(preview.subtotal)} />
            <BalanceLine label="Discount" value={formatMoneyAmount(preview.discountTotal)} />
            <BalanceLine label="Taxable" value={formatMoneyAmount(preview.taxableTotal)} />
            <BalanceLine label="VAT" value={formatMoneyAmount(preview.taxTotal)} />
            <BalanceLine label="Total" value={formatMoneyAmount(preview.total)} emphasized />
          </div>
        </LedgerPanel>
      </div>

      <LedgerActionBar>
        <LedgerButton type="submit" disabled={!organizationId || loading || submitting || !preview.valid} variant="primary" icon={SaveIcon}>
          {submitting ? "Saving..." : initialQuote ? "Save draft quote" : "Create draft quote"}
        </LedgerButton>
        <LedgerButton href={returnTo || "/sales/quotes"}>
          Cancel
        </LedgerButton>
      </LedgerActionBar>
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
      <LedgerInput
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={`Search posting account for quote line ${lineNumber}`}
        placeholder="Search accounts"
        className="h-7 text-xs"
      />
      <LedgerSelect
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-label={`Posting account for quote line ${lineNumber}`}
        className="h-8 px-2 py-1"
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
      </LedgerSelect>
    </div>
  );
}

function BalanceLine({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-steel">{label}</span>
      <span className={emphasized ? "text-lg font-semibold text-ink" : "text-sm font-medium text-ink"}>
        <LedgerMoney>{value}</LedgerMoney>
      </span>
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

function getValidationError(customerId: string, lines: QuoteLineState[], previewValid: boolean): string {
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

  return previewValid ? "" : "Quote lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%.";
}
