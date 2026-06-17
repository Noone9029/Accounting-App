"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, SaveIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComplianceReadinessPanel } from "@/components/ui-ledger/compliance-readiness-panel";
import { LineItemsTable } from "@/components/ui-ledger/line-items-table";
import { PanelSection } from "@/components/ui-ledger/panel-section";
import { TransactionSummaryCard } from "@/components/ui-ledger/transaction-summary-card";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { getLedgerByteEdition } from "@/lib/edition";
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
  const edition = getLedgerByteEdition();
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
        currency: edition.defaultCurrency,
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
      <div className="flex flex-col gap-4">
        <StatusMessage type="error">Only draft invoices can be edited.</StatusMessage>
        <Link href={`/sales/invoices/${initialInvoice.id}`} className={buttonVariants({ variant: "outline", className: "self-start" })}>
          Back to invoice
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <PanelSection
        title="Invoice details"
        description="Draft header fields are saved before finalization; invoice numbering and posting behavior stay unchanged."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-foreground">Customer</span>
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName ?? customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Invoice number</span>
            <Input
              value={initialInvoice?.invoiceNumber ?? invoiceNumberPreview?.invoiceNumber ?? "From sequence"}
              readOnly
              aria-label="Invoice number"
              className="mt-1 bg-muted text-muted-foreground"
            />
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {initialInvoice ? "Draft invoice number assigned from the sequence." : (invoiceNumberPreview?.helperText ?? "Assigned from the invoice sequence when saved.")}
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Tax mode</span>
            <select value={taxMode} onChange={(event) => updateTaxMode(event.target.value as SalesInvoiceTaxMode)} className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="TAX_EXCLUSIVE">Tax exclusive</option>
              <option value="TAX_INCLUSIVE">Tax inclusive</option>
              <option value="NO_TAX">No tax</option>
            </select>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {taxMode === "TAX_INCLUSIVE" ? "Entered line prices include VAT; LedgerByte extracts the tax portion." : taxMode === "NO_TAX" ? "Line tax rates are ignored and invoice tax is zero." : "Line prices exclude VAT; tax is added to the total."}
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Currency</span>
            <Input value={edition.defaultCurrency} readOnly aria-label="Currency" className="mt-1 bg-muted text-muted-foreground" />
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">Default {edition.marketLabel} workspace currency.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Issue date</span>
            <Input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required className="mt-1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Due date</span>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-foreground">Branch</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="">No branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.displayName ?? branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Notes</span>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Terms</span>
            <Input value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-1" />
          </label>
        </div>
      </PanelSection>

      <ComplianceReadinessPanel
        title={edition.invoiceComplianceTitle}
        description={edition.invoiceComplianceDescription}
        checks={[
          {
            label: "Invoice fields",
            status: customerId && lines.length > 0 ? "pass" : "pending",
            detail: "Customer, issue date, due date, VAT mode, and line-item fields stay in the normal draft invoice workflow.",
          },
          {
            label: edition.invoiceComplianceChecks.disconnectedLabel,
            status: "warning",
            detail: edition.invoiceComplianceChecks.disconnectedDetail,
          },
          {
            label: "Attachments and finalization",
            status: "pending",
            detail: "Draft/finalize, attachment, posting, and audit behavior remain handled by the existing invoice screens.",
          },
        ]}
      />

      <div className="flex flex-col gap-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading invoice setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && customers.length === 0 ? (
          <StatusMessage type="empty">
            Add a customer before creating the first invoice.{" "}
            <Link href="/customers" className="font-semibold text-palm hover:underline">
              Open customers
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LineItemsTable
          title="Invoice line items"
          description="Line entries keep the existing item, account, discount, tax, and total preview behavior."
        >
          <div className="overflow-x-auto">
            <Table className="min-w-[1240px]">
              <TableHeader className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Revenue account</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => {
                  const previewLine = preview.lines[index];
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <select value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm">
                          <option value="">No item</option>
                          {activeItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sku ? `${item.sku} - ${item.name}` : item.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required />
                      </TableCell>
                      <TableCell>
                        <AccountPicker accounts={postingRevenueAccounts} value={line.accountId} onChange={(accountId) => updateLine(line.id, { accountId })} lineNumber={index + 1} />
                      </TableCell>
                      <TableCell>
                        <Input inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="w-24" />
                      </TableCell>
                      <TableCell>
                        <Input inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="w-28" />
                      </TableCell>
                      <TableCell>
                        <Input inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="w-24" />
                      </TableCell>
                      <TableCell>
                        <select value={taxMode === "NO_TAX" ? "" : line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} disabled={taxMode === "NO_TAX"} className="h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm disabled:bg-muted disabled:text-muted-foreground">
                          <option value="">{taxMode === "NO_TAX" ? "No tax mode" : "No tax"}</option>
                          {taxMode === "NO_TAX"
                            ? null
                            : activeSalesTaxRates.map((taxRate) => (
                                <option key={taxRate.id} value={taxRate.id}>
                                  {taxRate.name}
                                </option>
                              ))}
                        </select>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">{previewLine ? formatMoneyAmount(previewLine.lineTotalUnits, edition.defaultCurrency) : `${edition.defaultCurrency} 0.00`}</TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" size="xs" onClick={() => removeLine(line.id)} disabled={lines.length <= 1}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-3">
            <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, makeLine()])}>
              <PlusIcon data-icon="inline-start" />
              Add line
            </Button>
          </div>
        </LineItemsTable>

        <TransactionSummaryCard
          rows={[
            { label: "Subtotal", value: formatMoneyAmount(preview.subtotal, edition.defaultCurrency) },
            { label: "Discount", value: formatMoneyAmount(preview.discountTotal, edition.defaultCurrency) },
            { label: "Taxable", value: formatMoneyAmount(preview.taxableTotal, edition.defaultCurrency) },
            { label: "VAT", value: formatMoneyAmount(preview.taxTotal, edition.defaultCurrency) },
            { label: "Total", value: formatMoneyAmount(preview.total, edition.defaultCurrency), emphasized: true },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={!organizationId || loading || submitting || !preview.valid}>
          <SaveIcon data-icon="inline-start" />
          {submitting ? "Saving..." : initialInvoice ? "Save changes" : "Create draft invoice"}
        </Button>
        <Link href={returnTo || "/sales/invoices"} className={buttonVariants({ variant: "outline" })}>
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
    <div className="flex flex-col gap-1">
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={`Search posting account for line ${lineNumber}`}
        placeholder="Search accounts"
        className="h-7 text-xs"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        aria-label={`Posting account for line ${lineNumber}`}
        className="h-8 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm"
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
